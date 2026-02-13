// components/campaigns/StatusUpdateModal.tsx

import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Modal, Button, Select, Textarea, Group, Text, Alert } from '@mantine/core';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { Campaign, CampaignStatus } from '@/types/campaign';

interface StatusUpdateModalProps {
    opened: boolean;
    onClose: () => void;
    campaign: Campaign | null;
}

// Define allowed status transitions
const STATUS_TRANSITIONS: Record<CampaignStatus, { value: CampaignStatus; label: string; description?: string }[]> = {
    draft: [
        { value: 'pending_payment', label: 'Pending Payment', description: 'Move to payment pending' },
        { value: 'cancelled', label: 'Cancel', description: 'Cancel this campaign' },
    ],
    pending_payment: [
        { value: 'paid', label: 'Mark as Paid', description: 'Payment received' },
        { value: 'cancelled', label: 'Cancel', description: 'Cancel this campaign' },
    ],
    paid: [
        { value: 'active', label: 'Activate', description: 'Start the campaign' },
        { value: 'cancelled', label: 'Cancel', description: 'Cancel this campaign' },
    ],
    active: [
        { value: 'paused', label: 'Pause', description: 'Temporarily pause campaign' },
        { value: 'completed', label: 'Complete', description: 'Mark as completed' },
    ],
    paused: [
        { value: 'active', label: 'Resume', description: 'Resume the campaign' },
        { value: 'cancelled', label: 'Cancel', description: 'Cancel this campaign' },
    ],
    completed: [],
    cancelled: [],
};

export default function StatusUpdateModal({ opened, onClose, campaign }: StatusUpdateModalProps) {
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClose = () => {
        setSelectedStatus('');
        setNotes('');
        onClose();
    };

    const handleSubmit = () => {
        if (!campaign || !selectedStatus) return;

        setIsSubmitting(true);

        router.put(
            route('campaigns.update-status', campaign.id),
            {
                status: selectedStatus,
                notes: notes,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    handleClose();
                },
                onError: (errors) => {
                    console.error('Failed to update status:', errors);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    if (!campaign) return null;

    const availableStatuses = STATUS_TRANSITIONS[campaign.status] || [];
    const currentStatusLabel = campaign.status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <div>
                    <Text size="lg" fw={600}>Update Campaign Status</Text>
                    <Text size="sm" c="dimmed" mt={4}>
                        {campaign.name}
                    </Text>
                </div>
            }
            size="md"
            radius="md"
        >
            <div className="space-y-4">
                {/* Current Status */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Text size="xs" c="dimmed" mb={4}>Current Status</Text>
                    <Text size="sm" fw={500} className="text-blue-700 dark:text-blue-300">
                        {currentStatusLabel}
                    </Text>
                </div>

                {/* Status Selection */}
                {availableStatuses.length > 0 ? (
                    <>
                        <Select
                            label="New Status"
                            placeholder="Select new status"
                            data={availableStatuses.map(status => ({
                                value: status.value,
                                label: status.label,
                            }))}
                            value={selectedStatus}
                            onChange={(value) => setSelectedStatus(value || '')}
                            required
                            radius="md"
                        />

                        {/* Show description for selected status */}
                        {selectedStatus && (
                            <Alert
                                icon={<CheckCircle size={16} />}
                                color="blue"
                                variant="light"
                                radius="md"
                            >
                                <Text size="sm">
                                    {availableStatuses.find(s => s.value === selectedStatus)?.description}
                                </Text>
                            </Alert>
                        )}

                        {/* Notes */}
                        <Textarea
                            label="Notes (Optional)"
                            placeholder="Add any notes about this status change..."
                            value={notes}
                            onChange={(e) => setNotes(e.currentTarget.value)}
                            minRows={3}
                            radius="md"
                        />

                        {/* Actions */}
                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="light"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                radius="md"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                disabled={!selectedStatus}
                                radius="md"
                            >
                                Update Status
                            </Button>
                        </Group>
                    </>
                ) : (
                    <Alert
                        icon={<AlertCircle size={16} />}
                        color="orange"
                        variant="light"
                        radius="md"
                    >
                        <Text size="sm">
                            No status transitions available for campaigns with status "{currentStatusLabel}".
                        </Text>
                    </Alert>
                )}
            </div>
        </Modal>
    );
}