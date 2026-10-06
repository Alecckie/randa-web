import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    Card,
    Text,
    Badge,
    Group,
    Stack,
    Code,
    ActionIcon,
    Tooltip,
    Table,
    Alert,
} from '@mantine/core';
import { Copy, Check, ServerCog, Clock, Terminal, AlertTriangle } from 'lucide-react';

interface RunbookStep {
    label: string;
    command: string;
    note: string;
    risk: 'safe' | 'caution' | 'destructive';
}

interface RunbookSection {
    title: string;
    description: string;
    steps: RunbookStep[];
}

interface ScheduledCommand {
    command: string;
    schedule: string;
    purpose: string;
}

interface CommandReference {
    command: string;
    description: string;
    flags: string[];
}

interface WebCron {
    active: boolean;
    intervalSeconds: number;
    note: string;
    cronEntry: string;
    switchSteps: string[];
}

interface PageProps {
    runbookSections: RunbookSection[];
    scheduledCommands: ScheduledCommand[];
    webCron: WebCron;
    commandsReference: CommandReference[];
}

const RISK_COLOR: Record<RunbookStep['risk'], string> = {
    safe: 'green',
    caution: 'yellow',
    destructive: 'red',
};

const RISK_LABEL: Record<RunbookStep['risk'], string> = {
    safe: 'Safe',
    caution: 'Caution',
    destructive: 'Destructive',
};

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard API unavailable — nothing to fall back to safely
        }
    };

    return (
        <Group gap="xs" wrap="nowrap">
            <Code block className="flex-1" style={{ whiteSpace: 'pre-wrap' }}>{command}</Code>
            <Tooltip label={copied ? 'Copied!' : 'Copy command'} withArrow>
                <ActionIcon variant="light" color={copied ? 'green' : 'gray'} onClick={handleCopy}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}

export default function SystemSetup({ runbookSections, scheduledCommands, webCron, commandsReference }: PageProps) {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ServerCog size={22} /> System Setup
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Deployment runbook and scheduled-job reference for this app's backend team
                    </p>
                </div>
            }
        >
            <Head title="System Setup" />

            <Stack gap="lg">
                {runbookSections.map((section) => (
                    <Card key={section.title} withBorder radius="md" p="lg">
                        <Text fw={700} size="lg" mb={4}>{section.title}</Text>
                        <Text size="sm" c="dimmed" mb="md">{section.description}</Text>

                        <Stack gap="md">
                            {section.steps.map((step, index) => (
                                <div key={step.command} className="border-l-2 pl-4" style={{ borderColor: 'var(--mantine-color-gray-3)' }}>
                                    <Group justify="space-between" mb={6} wrap="nowrap">
                                        <Text size="sm" fw={600}>{index + 1}. {step.label}</Text>
                                        <Badge size="sm" color={RISK_COLOR[step.risk]} variant="light" leftSection={step.risk === 'destructive' ? <AlertTriangle size={12} /> : undefined}>
                                            {RISK_LABEL[step.risk]}
                                        </Badge>
                                    </Group>
                                    <CopyableCommand command={step.command} />
                                    <Text size="xs" c="dimmed" mt={6}>{step.note}</Text>
                                </div>
                            ))}
                        </Stack>
                    </Card>
                ))}

                {/* Scheduled jobs */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <Clock size={18} className="text-gray-500" />
                        <Text fw={700} size="lg">Scheduled Jobs</Text>
                    </Group>

                    <Table.ScrollContainer minWidth={500}>
                        <Table verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Command</Table.Th>
                                    <Table.Th>Schedule</Table.Th>
                                    <Table.Th>Purpose</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {scheduledCommands.map((sc) => (
                                    <Table.Tr key={sc.command}>
                                        <Table.Td><Code>{sc.command}</Code></Table.Td>
                                        <Table.Td><Text size="sm">{sc.schedule}</Text></Table.Td>
                                        <Table.Td><Text size="sm" c="dimmed">{sc.purpose}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    <Alert color={webCron.active ? 'green' : 'orange'} variant="light" mt="md" icon={<AlertTriangle size={16} />}>
                        <Group gap="xs" mb={4}>
                            <Text size="sm" fw={600}>
                                {webCron.active
                                    ? `Web-triggered scheduler active (shared hosting, no crontab needed)`
                                    : `Web-triggered scheduler disabled — a server crontab is required`}
                            </Text>
                            <Badge size="sm" color={webCron.active ? 'green' : 'gray'} variant="light">
                                {webCron.active ? 'Active' : 'Disabled'}
                            </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mb="sm">{webCron.note}</Text>
                    </Alert>
                </Card>

                {/* Switching to a real VPS crontab */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <Clock size={18} className="text-gray-500" />
                        <Text fw={700} size="lg">Switching to a VPS Crontab</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                        Once this app moves off shared hosting to a VPS with real cron access, switch from the web-triggered
                        fallback above to a standard Laravel crontab entry.
                    </Text>

                    <Text size="sm" fw={600} mb={6}>1. Add this crontab entry</Text>
                    <CopyableCommand command={webCron.cronEntry} />

                    <Text size="sm" fw={600} mt="md" mb={6}>2. Then do the following</Text>
                    <Stack gap={6}>
                        {webCron.switchSteps.slice(1).map((step, index) => (
                            <Text key={step} size="sm" c="dimmed">{index + 2}. {step}</Text>
                        ))}
                    </Stack>
                </Card>

                {/* Command reference */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <Terminal size={18} className="text-gray-500" />
                        <Text fw={700} size="lg">Rider-Shift Commands Reference</Text>
                    </Group>

                    <Stack gap="md">
                        {commandsReference.map((cmd) => (
                            <div key={cmd.command} className="border-l-2 pl-4" style={{ borderColor: 'var(--mantine-color-gray-3)' }}>
                                <Code>{cmd.command}</Code>
                                <Text size="sm" c="dimmed" mt={4}>{cmd.description}</Text>
                                {cmd.flags.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {cmd.flags.map((flag) => (
                                            <Text key={flag} size="xs" c="dimmed">• <Code>{flag}</Code></Text>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </Stack>
                </Card>
            </Stack>
        </AuthenticatedLayout>
    );
}
