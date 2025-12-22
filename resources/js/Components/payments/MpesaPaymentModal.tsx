import { useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
    Loader,
    Modal,
    Badge,
    ThemeIcon,
    Notification,
    Paper,
    Divider,
    ActionIcon,
    Code,
    List,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    Info,
    CheckCircle,
    AlertCircle,
    Smartphone,
    XCircle,
    Clock,
    RefreshCw,
    Receipt,
    Phone,
    Search,
    HelpCircle,
    Copy,
    CreditCard,
} from 'lucide-react';
import type { PaymentStatus } from '@/types/campaign';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';


declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

interface CostBreakdown {
    helmet_count: number;
    duration_days: number;
    daily_rate: number;
    base_cost: number;
    design_cost: number;
    subtotal: number;
    vat_amount: number;
    total_cost: number;
    currency: string;
}

interface PaymentModalProps {
    opened: boolean;
    onClose: () => void;
    costBreakdown: CostBreakdown;
    advertiserId: number;
    campaignData: {
        name: string;
        helmet_count: number | null;
        duration: number;
    };
    onPaymentSuccess?: (paymentData: {
        payment_id: string;
        reference: string;
        mpesa_receipt: string;
    }) => void;
}

export default function MpesaPaymentModal({
    opened,
    onClose,
    costBreakdown,
    advertiserId,
    campaignData,
    onPaymentSuccess,
}: PaymentModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [paymentError, setPaymentError] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [mpesa_receipt, setMpesaReceipt] = useState('');
    const [payment_id, setPaymentId] = useState('');
    const [showPaymentNotification, setShowPaymentNotification] = useState(false);

    const [manualReceiptNumber, setManualReceiptNumber] = useState('');
    const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);

    const [stkPushAttempts, setStkPushAttempts] = useState(0);
    const [canRetry, setCanRetry] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [lastQueryTime, setLastQueryTime] = useState<number | null>(null);
    const [showFallbackOptions, setShowFallbackOptions] = useState(false);
    const [checkout_request_id, setCheckoutRequestId] = useState('');
    const [requiresAdminApproval, setRequiresAdminApproval] = useState(false);

    // Paybill modal
    const [paybillModalOpened, { open: openPaybillModal, close: closePaybillModal }] = useDisclosure(false);
    const [paybillDetails, setPaybillDetails] = useState<any>(null);

    // Manual receipt modal
    const [manualReceiptModalOpened, { open: openManualReceiptModal, close: closeManualReceiptModal }] = useDisclosure(false);

    const initiatePayment = useCallback(async () => {
        if (!phoneNumber || !costBreakdown) return;

        setPaymentStatus('initiating');
        setPaymentError('');
        setShowPaymentNotification(false);
        setShowFallbackOptions(false);

        router.post(route('payments.mpesa.initiate.stk-push'), {
            advertiser_id: advertiserId,
            phone_number: phoneNumber,
            amount: costBreakdown.total_cost,
            campaign_id: null,
            campaign_data: campaignData,
            description: `Payment for ${campaignData.name}`
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['flash'],
            onSuccess: (page) => {
                const flashData = page.props.flash as any;

                if (flashData?.success === true) {
                    setPaymentReference(flashData.reference || '');
                    setPaymentId(flashData.payment_id || '');
                    setCheckoutRequestId(flashData.checkout_request_id || '');
                    setPaymentStatus('pending');
                    setPaymentError('');
                    setStkPushAttempts(prev => prev + 1);

                    if (flashData.paybill_details) {
                        setPaybillDetails(flashData.paybill_details);
                    }
                } else {
                    setPaymentStatus('failed');
                    setPaymentError(flashData?.message || 'Payment initiation failed');
                    setShowPaymentNotification(true);
                    setShowFallbackOptions(true);

                    if (flashData.paybill_details) {
                        setPaybillDetails(flashData.paybill_details);
                    }
                }
            },
            onError: (errors) => {
                setPaymentStatus('failed');
                const errorMessage = Object.values(errors)[0] as string || 'Failed to initiate payment';
                setPaymentError(errorMessage);
                setShowPaymentNotification(true);
                setShowFallbackOptions(true);
            },
        });
    }, [phoneNumber, costBreakdown, advertiserId, campaignData]);

    const queryPaymentStatus = useCallback(async () => {
        if (!payment_id || !checkout_request_id) return;

        if (lastQueryTime && Date.now() - lastQueryTime < 30000) {
            alert('Please wait 30 seconds between queries');
            return;
        }

        setIsQuerying(true);
        setLastQueryTime(Date.now());

        router.post(route('payments.mpesa.query-status'), {
            payment_id: payment_id,
            checkout_request_id: checkout_request_id
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const data = page.props.flash as any;

                if (data?.success && data?.status === 'completed') {
                    setPaymentStatus('success');
                    setMpesaReceipt(data.mpesa_receipt || '');
                    setShowPaymentNotification(true);
                    setShowFallbackOptions(false);

                    if (onPaymentSuccess) {
                        onPaymentSuccess({
                            payment_id: payment_id,
                            reference: paymentReference,
                            mpesa_receipt: data.mpesa_receipt || ''
                        });
                    }
                } else {
                    alert(data?.message || 'Payment not yet confirmed');
                }
                setIsQuerying(false);
            },
            onError: () => {
                setIsQuerying(false);
                alert('Failed to query payment status');
            }
        });
    }, [payment_id, checkout_request_id, lastQueryTime, paymentReference, onPaymentSuccess]);

    const retryPayment = useCallback(async () => {
        if (stkPushAttempts >= 3) {
            alert('Maximum retry attempts reached. Please use an alternative payment method.');
            return;
        }
        initiatePayment();
    }, [stkPushAttempts, initiatePayment]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    }, []);

    const handleResetPayment = useCallback(() => {
        setPaymentStatus('idle');
        setPaymentError('');
        setPaymentReference('');
        setMpesaReceipt('');
        setPaymentId('');
        setCheckoutRequestId('');
        setShowPaymentNotification(false);
        setShowFallbackOptions(false);
        setRequiresAdminApproval(false);
        setPhoneNumber('');
    }, []);

    const handleRetryPayment = useCallback(() => {
        setPaymentStatus('idle');
        setPaymentError('');
        setPaymentReference('');
        setMpesaReceipt('');
        setPaymentId('');
        setShowPaymentNotification(false);
        setPhoneNumber('');
    }, []);

    const handleVerifyReceipt = useCallback(async () => {
        if (!manualReceiptNumber.trim()) {
            alert('Please enter a valid M-Pesa receipt number');
            return;
        }

        setIsVerifyingReceipt(true);

        router.post(route('payments.mpesa.verify-receipt'), {
            advertiser_id: advertiserId,
            receipt_number: manualReceiptNumber.trim().toUpperCase(),
            amount: costBreakdown?.total_cost,
            phone_number: phoneNumber,
            campaign_data: campaignData
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const data = page.props.flash as any;

                if (data?.success) {
                    setPaymentReference(data.reference);
                    setPaymentId(data.payment_id);
                    setMpesaReceipt(data.receipt_number);

                    if (data.requires_approval) {
                        setRequiresAdminApproval(true);
                        setPaymentStatus('pending_verification');
                        closeManualReceiptModal();
                        setShowPaymentNotification(true);
                    } else {
                        setPaymentStatus('success');
                        closeManualReceiptModal();
                        setShowPaymentNotification(true);

                        if (onPaymentSuccess) {
                            onPaymentSuccess({
                                payment_id: data.payment_id,
                                reference: data.reference,
                                mpesa_receipt: data.receipt_number
                            });
                        }
                    }

                    setPaymentError('');
                    setShowFallbackOptions(false);
                    setManualReceiptNumber('');
                } else {
                    alert(data?.message || 'Receipt verification failed');
                }
                setIsVerifyingReceipt(false);
            },
            onError: (errors) => {
                alert(Object.values(errors)[0] as string || 'Failed to verify receipt');
                setIsVerifyingReceipt(false);
            }
        });
    }, [manualReceiptNumber, costBreakdown, phoneNumber, advertiserId, campaignData, closeManualReceiptModal, onPaymentSuccess]);

    // Echo WebSocket listener
    useEffect(() => {
        if (!advertiserId || !opened) {
            return;
        }

        if (!window.Echo) {
            console.error('❌ Laravel Echo is not initialized');
            return;
        }

        const channelName = `payment.${advertiserId}`;
        const channel = window.Echo.private(channelName);

        channel.subscribed(() => {
            console.log(`✅ Successfully subscribed to ${channelName}`);
        });

        channel.listen('.payment.status.updated', (event: any) => {
            console.log('💰 Payment status update received:', event);

            if (!paymentReference || event.reference !== paymentReference) {
                return;
            }

            if (event.status === 'success') {
                setPaymentStatus('success');
                setShowPaymentNotification(true);
                setMpesaReceipt(event.mpesa_receipt || '');
                setPaymentError('');
                setShowFallbackOptions(false);

                if (onPaymentSuccess) {
                    onPaymentSuccess({
                        payment_id: payment_id,
                        reference: paymentReference,
                        mpesa_receipt: event.mpesa_receipt || ''
                    });
                }
            } else if (event.status === 'failed') {
                setPaymentStatus('failed');
                setPaymentError(event.message || 'Payment failed');
                setShowPaymentNotification(true);
                setShowFallbackOptions(true);
                setCanRetry(event.can_retry_stk !== false);

                if (event.paybill_details) {
                    setPaybillDetails(event.paybill_details);
                }
            }
        });

        channel.error((error: any) => {
            console.error('❌ Echo channel error:', error);
        });

        return () => {
            channel.stopListening('.payment.status.updated');
            window.Echo.leave(channelName);
        };
    }, [advertiserId, paymentReference, opened, payment_id, onPaymentSuccess]);

    // Auto-timeout payment after 40 seconds
    useEffect(() => {
        if (paymentStatus === 'pending') {
            const timeoutId = setTimeout(() => {
                setPaymentStatus('failed');
                setPaymentError('Payment request timed out. Please try again or enter your M-Pesa receipt if you completed the payment.');
                setShowPaymentNotification(true);
                setShowFallbackOptions(true);
            }, 40000);

            return () => clearTimeout(timeoutId);
        }
    }, [paymentStatus]);

    // Reset state when modal closes
    useEffect(() => {
        if (!opened) {
            // Don't reset if payment was successful - preserve the state
            if (paymentStatus !== 'success') {
                handleResetPayment();
            }
        }
    }, [opened, paymentStatus]);

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={
                    <Group gap="sm">
                        <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal', deg: 45 }}>
                            <CreditCard size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="lg">M-Pesa Payment</Text>
                            <Text size="xs" c="dimmed">Complete your payment</Text>
                        </div>
                    </Group>
                }
                size="lg"
                radius="lg"
                centered
            >
                <Stack gap="lg">
                    {/* Payment Success Notification */}
                    {showPaymentNotification && paymentStatus === 'success' && (
                        <Notification
                            icon={<CheckCircle size={20} />}
                            color="green"
                            title="Payment Successful!"
                            onClose={() => setShowPaymentNotification(false)}
                            radius="md"
                            withCloseButton
                        >
                            Your payment of KES {costBreakdown?.total_cost.toLocaleString()} has been received successfully.
                            Code: {mpesa_receipt}
                        </Notification>
                    )}

                    {/* Payment Failed Notification */}
                    {showPaymentNotification && paymentStatus === 'failed' && (
                        <Notification
                            icon={<XCircle size={20} />}
                            color="red"
                            title="Payment Failed"
                            onClose={() => setShowPaymentNotification(false)}
                            radius="md"
                            withCloseButton
                        >
                            {paymentError || 'Your payment could not be processed. Please try again.'}
                        </Notification>
                    )}

                    {/* Payment Amount Summary */}
                    <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-2 border-green-200 dark:border-gray-700">
                        <Stack gap="md">
                            <Group justify="space-between" align="center">
                                <div>
                                    <Text size="sm" c="dimmed" fw={600}>Total Amount Due</Text>
                                    <Text fw={700} size="2.5rem" className="text-green-600 dark:text-green-400">
                                        KES {costBreakdown?.total_cost.toLocaleString()}
                                    </Text>
                                </div>
                                <ThemeIcon size={80} radius="xl" variant="light" color="green">
                                    <Smartphone size={40} />
                                </ThemeIcon>
                            </Group>
                            <Divider />
                            <Grid>
                                <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Campaign Duration</Text>
                                    <Text fw={600}>{costBreakdown?.duration_days} days</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Helmets</Text>
                                    <Text fw={600}>{costBreakdown?.helmet_count}</Text>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>

                    {/* Payment Form - Idle State */}
                    {paymentStatus === 'idle' && (
                        <Card withBorder p="xl" radius="lg">
                            <Stack gap="lg">
                                <Alert icon={<Info size={18} />} color="blue" variant="light" radius="md">
                                    <Text size="sm" fw={500}>
                                        Enter your M-Pesa registered phone number to receive a payment prompt on your phone.
                                    </Text>
                                </Alert>

                                <TextInput
                                    label="M-Pesa Phone Number"
                                    placeholder="e.g., 254712345678"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                                    size="lg"
                                    radius="md"
                                    leftSection={<Smartphone size={20} />}
                                    description="Format: 254XXXXXXXXX"
                                    styles={{
                                        input: { borderWidth: 2, fontSize: '1.1rem', '&:focus': { borderColor: 'var(--mantine-color-green-6)' } }
                                    }}
                                />

                                <Button
                                    onClick={initiatePayment}
                                    disabled={!phoneNumber || phoneNumber.length < 12}
                                    size="xl"
                                    radius="md"
                                    leftSection={<CreditCard size={22} />}
                                    gradient={{ from: 'green', to: 'teal', deg: 45 }}
                                    variant="gradient"
                                    fullWidth
                                >
                                    Pay KES {costBreakdown?.total_cost.toLocaleString()} via M-Pesa
                                </Button>
                            </Stack>
                        </Card>
                    )}

                    {/* Initiating Payment State */}
                    {paymentStatus === 'initiating' && (
                        <Card withBorder p="xl" radius="lg" className="text-center">
                            <Stack gap="md" align="center">
                                <Loader size="xl" type="dots" color="green" />
                                <Text fw={600} size="lg" className="text-gray-800 dark:text-gray-100">
                                    Initiating Payment...
                                </Text>
                                <Text size="sm" c="dimmed">Please wait while we process your request</Text>
                            </Stack>
                        </Card>
                    )}

                    {/* Pending Payment State */}
                    {paymentStatus === 'pending' && (
                        <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-yellow-300 dark:border-gray-700">
                            <Stack gap="md" align="center">
                                <ThemeIcon size={80} radius="xl" color="yellow" variant="light">
                                    <Clock size={40} />
                                </ThemeIcon>
                                <Text fw={700} size="xl" className="text-yellow-700 dark:text-yellow-400">
                                    Payment Prompt Sent!
                                </Text>
                                <Text size="md" ta="center" c="dimmed">
                                    Please check your phone <Text component="span" fw={700}>{phoneNumber}</Text> for the M-Pesa payment prompt.
                                </Text>
                                <Text size="sm" ta="center" c="dimmed">
                                    Reference: <Text component="span" fw={600}>{paymentReference}</Text>
                                </Text>
                                <Alert icon={<Info size={18} />} color="yellow" variant="light" radius="md" style={{ width: '100%' }}>
                                    <Text size="sm">
                                        Enter your M-Pesa PIN to complete the payment.
                                        You will be notified automatically once payment is confirmed.
                                    </Text>
                                </Alert>
                                <Loader size="md" type="dots" color="yellow" />
                                <Text size="xs" c="dimmed">Waiting for payment confirmation...</Text>
                            </Stack>
                        </Card>
                    )}

                    {/* Pending Admin Approval Notification */}
                    {requiresAdminApproval && paymentStatus === 'pending_verification' && (
                        <Alert icon={<Clock size={20} />} color="yellow" variant="filled" radius="md">
                            <Stack gap="xs">
                                <Text fw={700} size="lg">Payment Pending Verification</Text>
                                <Text size="sm">
                                    Your M-Pesa receipt has been submitted and is awaiting admin verification.
                                    You'll be notified once it's approved (usually within 1 business hour).
                                </Text>
                                <Group gap="xs" mt="xs">
                                    <Badge color="yellow" variant="light">Receipt: {mpesa_receipt}</Badge>
                                    <Badge color="yellow" variant="light">Reference: {paymentReference}</Badge>
                                </Group>
                            </Stack>
                        </Alert>
                    )}

                    {/* Fallback Options - Show when payment fails */}
                    {showFallbackOptions && paymentStatus === 'failed' && (
                        <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                            <Stack gap="lg">
                                <div className="text-center">
                                    <ThemeIcon size={64} radius="xl" color="blue" variant="light" mx="auto" mb="md">
                                        <HelpCircle size={32} />
                                    </ThemeIcon>
                                    <Text fw={700} size="lg">Payment Options</Text>
                                    <Text size="sm" c="dimmed">Choose an alternative payment method</Text>
                                </div>

                                <Grid gutter="md">
                                    {canRetry && stkPushAttempts < 3 && (
                                        <Grid.Col span={6}>
                                            <Button
                                                onClick={retryPayment}
                                                variant="light"
                                                size="lg"
                                                fullWidth
                                                leftSection={<RefreshCw size={20} />}
                                            >
                                                Try Again
                                                <Badge size="xs" ml="xs">{stkPushAttempts}/3</Badge>
                                            </Button>
                                        </Grid.Col>
                                    )}

                                    <Grid.Col span={6}>
                                        <Button
                                            onClick={queryPaymentStatus}
                                            loading={isQuerying}
                                            disabled={!payment_id || !checkout_request_id}
                                            variant="light"
                                            size="lg"
                                            fullWidth
                                            leftSection={<Search size={20} />}
                                        >
                                            Check Status
                                        </Button>
                                    </Grid.Col>

                                    <Grid.Col span={6}>
                                        <Button
                                            onClick={openPaybillModal}
                                            variant="light"
                                            size="lg"
                                            fullWidth
                                            leftSection={<Phone size={20} />}
                                        >
                                            Pay via Paybill
                                        </Button>
                                    </Grid.Col>

                                    <Grid.Col span={6}>
                                        <Button
                                            onClick={openManualReceiptModal}
                                            variant="light"
                                            size="lg"
                                            fullWidth
                                            leftSection={<Receipt size={20} />}
                                        >
                                            Enter Receipt
                                        </Button>
                                    </Grid.Col>
                                </Grid>

                                <Button
                                    onClick={handleResetPayment}
                                    variant="subtle"
                                    size="sm"
                                    fullWidth
                                >
                                    Start Over with Different Number
                                </Button>
                            </Stack>
                        </Card>
                    )}

                    {/* Payment Success State */}
                    {paymentStatus === 'success' && (
                        <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-2 border-green-300 dark:border-gray-700">
                            <Stack gap="md" align="center">
                                <ThemeIcon size={100} radius="xl" color="green" variant="light">
                                    <CheckCircle size={50} />
                                </ThemeIcon>
                                <Text fw={700} size="2rem" className="text-green-600 dark:text-green-400">
                                    Payment Successful!
                                </Text>
                                <Text size="lg" ta="center" c="dimmed">
                                    KES {costBreakdown?.total_cost.toLocaleString()} received successfully
                                </Text>
                                <Paper p="md" radius="md" className="bg-white dark:bg-gray-900" style={{ width: '100%' }}>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Transaction Code</Text>
                                        <Badge size="lg" color="green" variant="light">{mpesa_receipt}</Badge>
                                    </Group>
                                </Paper>
                                <Alert icon={<CheckCircle size={18} />} color="green" variant="light" radius="md" style={{ width: '100%' }}>
                                    <Text size="sm" fw={500}>
                                        Your payment has been confirmed. You can now close this window.
                                    </Text>
                                </Alert>
                            </Stack>
                        </Card>
                    )}

                    {/* Payment Failed State */}
                    {paymentStatus === 'failed' && !showFallbackOptions && (
                        <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border-2 border-red-300 dark:border-gray-700">
                            <Stack gap="md" align="center">
                                <ThemeIcon size={80} radius="xl" color="red" variant="light">
                                    <AlertCircle size={40} />
                                </ThemeIcon>
                                <Text fw={700} size="xl" className="text-red-600 dark:text-red-400">
                                    Payment Failed
                                </Text>
                                <Text size="md" ta="center" c="dimmed">
                                    {paymentError || 'We could not process your payment. Please try again.'}
                                </Text>
                                <Group gap="md" style={{ width: '100%' }}>
                                    <Button
                                        onClick={handleRetryPayment}
                                        color="blue"
                                        variant="filled"
                                        size="lg"
                                        radius="md"
                                        leftSection={<RefreshCw size={20} />}
                                        style={{ flex: 1 }}
                                    >
                                        Retry with New Number
                                    </Button>
                                    <Button
                                        onClick={openManualReceiptModal}
                                        variant="light"
                                        size="lg"
                                        radius="md"
                                        leftSection={<Receipt size={20} />}
                                        style={{ flex: 1 }}
                                    >
                                        Enter Receipt Number
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    )}
                </Stack>
            </Modal>

            {/* Manual Receipt Modal */}
            <Modal
                opened={manualReceiptModalOpened}
                onClose={closeManualReceiptModal}
                title={
                    <Group gap="sm">
                        <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                            <Receipt size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="lg">Enter M-Pesa Receipt</Text>
                            <Text size="xs" c="dimmed">Requires admin verification</Text>
                        </div>
                    </Group>
                }
                size="md"
                radius="lg"
                centered
            >
                <Stack gap="lg">
                    <Alert icon={<AlertCircle size={18} />} color="yellow" variant="light" radius="md">
                        <Text size="sm" fw={500} mb="xs">
                            Manual Verification Required
                        </Text>
                        <Text size="sm">
                            Your payment will be verified by our admin team within 1 business hour.
                            You'll receive a notification once approved.
                        </Text>
                    </Alert>

                    <TextInput
                        label="M-Pesa Receipt Number"
                        placeholder="e.g., SH123ABC45"
                        value={manualReceiptNumber}
                        onChange={(e) => setManualReceiptNumber(e.currentTarget.value.toUpperCase())}
                        size="lg"
                        radius="md"
                        leftSection={<Receipt size={20} />}
                        disabled={isVerifyingReceipt}
                        description="Enter the receipt number you received from M-Pesa"
                        styles={{
                            input: { borderWidth: 2, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' }
                        }}
                    />

                    {phoneNumber && costBreakdown && (
                        <Paper p="md" radius="md" className="bg-gray-50 dark:bg-gray-900">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Phone Number</Text>
                                    <Text fw={600}>{phoneNumber}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Amount Paid</Text>
                                    <Text fw={600}>KES {costBreakdown.total_cost.toLocaleString()}</Text>
                                </Group>
                            </Stack>
                        </Paper>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={closeManualReceiptModal}
                            disabled={isVerifyingReceipt}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVerifyReceipt}
                            loading={isVerifyingReceipt}
                            disabled={!manualReceiptNumber.trim() || manualReceiptNumber.length < 6}
                            leftSection={<CheckCircle size={18} />}
                            gradient={{ from: 'blue', to: 'indigo', deg: 45 }}
                            variant="gradient"
                        >
                            Submit for Verification
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Paybill Instructions Modal */}
            <Modal
                opened={paybillModalOpened}
                onClose={closePaybillModal}
                title={
                    <Group gap="sm">
                        <ThemeIcon size="lg" radius="xl" variant="light" color="green">
                            <Phone size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="lg">Pay via Paybill</Text>
                            <Text size="xs" c="dimmed">Manual M-Pesa payment instructions</Text>
                        </div>
                    </Group>
                }
                size="lg"
                radius="lg"
                centered
            >
                <Stack gap="lg">
                    <Alert icon={<Info size={18} />} color="blue" variant="light" radius="md">
                        <Text size="sm">
                            Follow these steps to complete your payment manually using M-Pesa Paybill.
                        </Text>
                    </Alert>

                    <Paper withBorder p="lg" radius="md" className="bg-gradient-to-br from-green-50 to-emerald-50">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text fw={600}>Paybill Number</Text>
                                <Group gap="xs">
                                    <Code className="text-lg font-bold">{paybillDetails?.paybill_number || '174379'}</Code>
                                    <ActionIcon
                                        onClick={() => copyToClipboard(paybillDetails?.paybill_number || '174379')}
                                        variant="light"
                                        color="green"
                                    >
                                        <Copy size={16} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <Group justify="space-between">
                                <Text fw={600}>Account Number</Text>
                                <Group gap="xs">
                                    <Code className="text-lg font-bold">{phoneNumber}</Code>
                                    <ActionIcon
                                        onClick={() => copyToClipboard(phoneNumber)}
                                        variant="light"
                                        color="green"
                                    >
                                        <Copy size={16} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <Group justify="space-between">
                                <Text fw={600}>Amount</Text>
                                <Text fw={700} size="xl" className="text-green-600">
                                    KES {costBreakdown?.total_cost.toLocaleString()}
                                </Text>
                            </Group>
                        </Stack>
                    </Paper>

                    <div>
                        <Text fw={600} mb="sm">Step-by-Step Instructions:</Text>
                        <List spacing="sm" size="sm" center>
                            <List.Item>Go to M-Pesa menu on your phone</List.Item>
                            <List.Item>Select <Text component="span" fw={600}>Lipa na M-Pesa</Text></List.Item>
                            <List.Item>Select <Text component="span" fw={600}>Pay Bill</Text></List.Item>
                            <List.Item>Enter Business Number: <Code>{paybillDetails?.paybill_number || '174379'}</Code></List.Item>
                            <List.Item>Enter Account Number: <Code>{phoneNumber}</Code></List.Item>
                            <List.Item>Enter Amount: <Code>{costBreakdown?.total_cost}</Code></List.Item>
                            <List.Item>Enter your M-Pesa PIN</List.Item>
                            <List.Item>Confirm the transaction</List.Item>
                            <List.Item>You'll receive an M-Pesa receipt (e.g., <Code>SH12ABC34</Code>)</List.Item>
                        </List>
                    </div>

                    <Alert icon={<Receipt size={18} />} color="orange" variant="light" radius="md">
                        <Text size="sm" fw={500} mb="xs">
                            After completing payment:
                        </Text>
                        <Text size="sm">
                            Click "Enter Receipt" button and submit your M-Pesa receipt number for verification.
                        </Text>
                    </Alert>

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={closePaybillModal}
                        >
                            Close
                        </Button>
                        <Button
                            onClick={() => {
                                closePaybillModal();
                                openManualReceiptModal();
                            }}
                            leftSection={<Receipt size={18} />}
                            gradient={{ from: 'blue', to: 'indigo', deg: 45 }}
                            variant="gradient"
                        >
                            Enter Receipt Number
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}