import { Card, Grid, NumberInput, Stack, Text, TextInput } from '@mantine/core';

interface RiderPersonalInfoFormProps {
    data: {
        firstname: string;
        lastname: string;
        email: string;
        phone: string;
        daily_rate: number;
    };
    errors: Record<string, string>;
    onChange: (field: string, value: any) => void;
}

export default function RiderPersonalInfoForm({ data, errors, onChange }: RiderPersonalInfoFormProps) {
    return (
        <Card>
            <Stack>
                <div>
                    <Text size="lg" fw={600} mb="sm">Personal Information</Text>
                    <Text size="sm" c="dimmed">
                        Please provide the basic information for the rider application.
                    </Text>
                </div>

                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                            label="First Name"
                            placeholder="Enter first name"
                            value={data.firstname}
                            onChange={(e) => onChange('firstname', e.currentTarget.value)}
                            error={errors.firstname}
                            required
                        />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                            label="Last Name"
                            placeholder="Enter last name"
                            value={data.lastname}
                            onChange={(e) => onChange('lastname', e.currentTarget.value)}
                            error={errors.lastname}
                            required
                        />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                            label="Email Address"
                            placeholder="example@email.com"
                            type="email"
                            value={data.email}
                            onChange={(e) => onChange('email', e.currentTarget.value)}
                            error={errors.email}
                            required
                        />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                            label="Phone Number"
                            placeholder="254712345678"
                            description="Enter phone number in format 254XXXXXXXX"
                            value={data.phone}
                            onChange={(e) => onChange('phone', e.currentTarget.value)}
                            error={errors.phone}
                            required
                        />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                            label="Daily Rate (KSh)"
                            placeholder="70.00"
                            description="Daily earning rate for the rider (default: KSh 70.00)"
                            value={data.daily_rate}
                            onChange={(value) => onChange('daily_rate', Number(value) || 70)}
                            error={errors.daily_rate}
                            min={0}
                            max={10000}
                            decimalScale={2}
                        />
                    </Grid.Col>
                </Grid>
            </Stack>
        </Card>
    );
}