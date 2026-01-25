import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal, Button, Text, Alert } from '@mantine/core';

interface QrScannerProps {
    opened: boolean;
    onClose: () => void;
    onScan: (qrCode: string) => void;
    title?: string;
}

export default function QrScanner({ opened, onClose, onScan, title = 'Scan QR Code' }: QrScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = 'qr-code-region';

    useEffect(() => {
        if (opened && !scanning) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [opened]);

    const startScanner = async () => {
        try {
            setError(null);
            
            // Initialize scanner
            scannerRef.current = new Html5Qrcode(qrCodeRegionId);

            // Get available cameras
            const cameras = await Html5Qrcode.getCameras();
            
            if (cameras && cameras.length > 0) {
                // Prefer back camera
                const backCamera = cameras.find(camera => 
                    camera.label.toLowerCase().includes('back') || 
                    camera.label.toLowerCase().includes('rear')
                ) || cameras[0];

                // Start scanning
                await scannerRef.current.start(
                    backCamera.id,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // QR code successfully scanned
                        onScan(decodedText);
                        stopScanner();
                        onClose();
                    },
                    (errorMessage) => {
                        // Scanning error (ignore - happens continuously while scanning)
                    }
                );

                setScanning(true);
            } else {
                setError('No camera found on this device.');
            }
        } catch (err: any) {
            console.error('Error starting scanner:', err);
            setError(err.message || 'Failed to access camera. Please check permissions.');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
                setScanning(false);
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
    };

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={title}
            size="lg"
            centered
            styles={{
                body: { padding: 0 }
            }}
        >
            <div className="p-4">
                {error && (
                    <Alert color="red" mb="md" title="Scanner Error">
                        {error}
                    </Alert>
                )}

                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <div id={qrCodeRegionId} className="w-full" />
                </div>

                {scanning && (
                    <div className="mt-4 text-center">
                        <Text size="sm" c="dimmed">
                            Position the QR code within the frame
                        </Text>
                        <div className="mt-2 flex items-center justify-center">
                            <div className="animate-pulse flex space-x-1">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                            <Text size="sm" c="dimmed" ml="xs">
                                Scanning...
                            </Text>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}