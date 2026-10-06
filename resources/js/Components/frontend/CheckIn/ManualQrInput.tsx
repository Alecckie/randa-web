import React, { useState } from 'react';
import { Modal, TextInput, Button, Text } from '@mantine/core';

interface ManualQrInputProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (qrCode: string) => void;
    title?: string;
}

export default function ManualQrInput({ opened, onClose, onSubmit, title = 'Enter Helmet Code' }: ManualQrInputProps) {
    const [qrCode, setQrCode] = useState('');

    const handleSubmit = () => {
        if (qrCode.trim()) {
            onSubmit(qrCode.trim());
            setQrCode('');
            onClose();
        }
    };

    const handleClose = () => {
        setQrCode('');
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={title}
            size="md"
            centered
        >
            <div className="space-y-4">
                <Text size="sm" c="dimmed">
                    Can't scan? Type in the helmet code printed on the helmet instead.
                </Text>

                <TextInput
                    label="Helmet Code"
                    placeholder="e.g. HMT-ABC123"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSubmit();
                        }
                    }}
                    required
                    autoFocus
                />

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!qrCode.trim()}
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </Modal>
    );
}