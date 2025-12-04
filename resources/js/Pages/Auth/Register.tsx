import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import {
    TextInput,
    PasswordInput,
    Button,
    Radio,
    Modal,
    ScrollArea,
    Text,
    Title,
    Divider,
    Stack,
    Checkbox,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

// Terms of Service Content Component
const TermsContent = () => (
    <Stack gap="lg" p={24}>
        <Text size="sm" c="dimmed" fw={500}>Last Updated: November 2025</Text>
        <Text size="sm" lh={1.7}>
            These Terms of Service ("Terms") govern your access to and use of the RANDA platform,
            mobile applications, website and related services (collectively, the "Services"). By accessing or
            using RANDA, you agree to be bound by these Terms.
        </Text>
        <Text size="sm" fw={600} c="red.7">
            If you do not agree with these Terms, do not use RANDA.
        </Text>
        <Divider my="xs" />
        
        {[
            {
                title: "1. About RANDA",
                content: "RANDA is a digital advertising and monetization platform that connects advertisers with motorbike riders. Riders earn income by displaying advertisement branding on helmets. Advertisers gain high-impact real-world visibility."
            },
            {
                title: "2. User Eligibility",
                content: "You must be at least 18 years old and legally able to enter into binding contracts in Kenya. You agree to provide accurate information and maintain updated profile details."
            },
            {
                title: "3. Account Registration",
                content: "Users must create an account to use RANDA Services. You are responsible for securing your account credentials and all activities under your account. RANDA may suspend or terminate accounts that violate these Terms or applicable laws."
            },
            {
                title: "4. Platform Roles",
                list: ["Riders earn income for participating in campaigns.", "Advertisers create and pay for advertising campaigns.", "RANDA is a neutral platform that facilitates these interactions."]
            },
            {
                title: "5. Fees, Payments & Earnings",
                list: [
                    "Riders will receive daily earnings based on approved participation and compliance.",
                    "Advertisers shall pay campaign fees as invoiced or as specified within the platform.",
                    "RANDA may deduct commissions, taxes, VAT, or fees prior to payout.",
                    "All financial transactions may be processed through third-party payment providers.",
                    "RANDA reserves the right to modify pricing or payout models."
                ]
            },
            {
                title: "6. Compliance & Conduct",
                content: "Users agree not to: misuse or interfere with platform operations, engage in fraud or misrepresentation, violate advertising, road safety, or intellectual property laws. Riders acknowledge full responsibility for safe riding practices and helmet usage."
            },
            {
                title: "7. Campaign Content",
                content: "Advertisers are responsible for the legality and accuracy of any promotional material submitted. RANDA may reject or remove content that is: unlawful, defamatory, hateful, sexually explicit, violent or extremist, politically sensitive or manipulative."
            },
            {
                title: "8. Intellectual Property",
                content: "All platform content, branding, and code belong to RANDA unless otherwise stated. Users retain ownership of content they upload but grant RANDA a license to display, use and distribute such content for campaign execution."
            },
            {
                title: "9. Data Usage",
                content: "Use of personal data is governed by the RANDA Privacy Policy."
            },
            {
                title: "10. Termination",
                content: "RANDA may suspend access or terminate accounts at any time for breach of these Terms or misuse of the platform. Users may delete their account at any time. Termination does not affect earned obligations, unpaid invoices, or legal rights."
            },
            {
                title: "11. Disclaimer",
                content: "RANDA provides its Services on an \"as is\" and \"as available\" basis. RANDA is not liable for losses resulting from downtime, rider incidents, campaign outcomes, or third-party service failures."
            },
            {
                title: "12. Limitation of Liability",
                content: "To the maximum extent permitted by law, RANDA shall not be liable for indirect, special, consequential, punitive, or incidental damages."
            },
            {
                title: "13. Modification of Terms",
                content: "RANDA may update these Terms occasionally. Updated versions will be posted on the website. Continued use after updates constitutes acceptance."
            },
            {
                title: "14. Governing Law",
                content: "These Terms shall be governed by the laws of Kenya."
            }
        ].map((section, idx) => (
            <div key={idx}>
                <Title order={4} size="h5" fw={700} mb="sm">{section.title}</Title>
                {section.content && <Text size="sm" lh={1.7}>{section.content}</Text>}
                {section.list && (
                    <Text size="sm" lh={1.7} component="ul" pl="md">
                        {section.list.map((item, i) => <li key={i}>{item}</li>)}
                    </Text>
                )}
            </div>
        ))}
        
        <div>
            <Title order={4} size="h5" fw={700} mb="sm">15. Contact</Title>
            <Text size="sm" lh={1.7}>
                For questions regarding these Terms, contact:{' '}
                <Text component="a" href="mailto:info@randamedia.co.ke" c="#f79122" fw={600}>
                    info@randamedia.co.ke
                </Text>
            </Text>
        </div>
    </Stack>
);

// Privacy Policy Content Component
const PrivacyContent = () => (
    <Stack gap="lg" p={24}>
        <Text size="sm" c="dimmed" fw={500}>Last Updated: November 2025</Text>
        <Text size="sm" lh={1.7}>
            This Privacy Policy explains how RANDA collects, uses, stores, and protects personal
            information when you access or use our platform, website, applications, or related services ("Services").
        </Text>
        <Text size="sm" fw={600} c="blue.7">
            By using RANDA, you consent to the practices described in this Privacy Policy.
        </Text>
        <Divider my="xs" />
        
        {[
            {
                title: "1. Data We Collect",
                intro: "We may collect:",
                list: [
                    "account information (name, phone number, email, rider/advertiser details)",
                    "payment details required for payouts or billing",
                    "advertising campaign materials supplied by advertisers",
                    "usage data and device information",
                    "location signals from riders for verification and campaign reporting"
                ]
            },
            {
                title: "2. How We Use Your Data",
                intro: "We may use collected information to:",
                list: [
                    "verify rider participation in campaigns",
                    "calculate earnings and payout amounts",
                    "operate campaign reporting and performance dashboards for advertisers",
                    "maintain secure platform access",
                    "process payments",
                    "communicate with users and provide support",
                    "improve platform features and performance"
                ]
            },
            {
                title: "3. Location Data Use (Riders)",
                intro: "RANDA may collect limited location signals during active campaign periods to:",
                list: [
                    "confirm that branded helmets are being used during normal routes",
                    "generate aggregated campaign exposure reporting for advertisers"
                ],
                footer: "We do not store precise real-time tracking for public identification. Location data is retained for a short limited period and then securely deleted."
            },
            {
                title: "4. Sharing of Data",
                intro: "We may share data with:",
                list: [
                    "payment processors",
                    "identity verification providers",
                    "advertisers (aggregated campaign performance only)",
                    "government authorities if required by law"
                ],
                footer: "We do not sell personal data to third parties."
            },
            {
                title: "5. Security Measures",
                content: "We implement reasonable physical, technical, and administrative safeguards to protect personal information from unauthorized access or misuse."
            },
            {
                title: "6. Data Retention",
                content: "Personal data is retained only as necessary for platform operation, legal compliance, and campaign settlement. Campaign location signals are retained for a limited short period."
            },
            {
                title: "7. User Rights",
                intro: "Depending on applicable law, you may request to:",
                list: [
                    "access personal data",
                    "correct inaccurate information",
                    "delete your account",
                    "object to specific processing"
                ]
            },
            {
                title: "8. Minors",
                content: "RANDA does not knowingly allow minors under 18 to register or participate in Services."
            },
            {
                title: "9. Changes to This Policy",
                content: "RANDA may update this Privacy Policy periodically. Updated versions will be posted on the website. Continued use of the Services after updates indicates acceptance of the revised version."
            }
        ].map((section, idx) => (
            <div key={idx}>
                <Title order={4} size="h5" fw={700} mb="sm">{section.title}</Title>
                {section.content && <Text size="sm" lh={1.7}>{section.content}</Text>}
                {section.intro && <Text size="sm" lh={1.7}>{section.intro}</Text>}
                {section.list && (
                    <Text size="sm" lh={1.7} component="ul" pl="md">
                        {section.list.map((item, i) => <li key={i}>{item}</li>)}
                    </Text>
                )}
                {section.footer && <Text size="sm" lh={1.7} mt="xs" fw={600}>{section.footer}</Text>}
            </div>
        ))}
        
        <div>
            <Title order={4} size="h5" fw={700} mb="sm">10. Contact</Title>
            <Text size="sm" lh={1.7}>
                For questions or concerns regarding privacy:{' '}
                <Text component="a" href="mailto:info@randamedia.co.ke" c="#f79122" fw={600}>
                    info@randamedia.co.ke
                </Text>
            </Text>
        </div>
    </Stack>
);

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        role: 'advertiser',
    });

    const isMobile = useMediaQuery('(max-width: 768px)');
    const [termsOpened, setTermsOpened] = useState(false);
    const [privacyOpened, setPrivacyOpened] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const modalStyles = {
        content: { borderRadius: '16px' },
        header: { padding: '24px 24px 16px 24px', borderBottom: '2px solid #e2e8f0' },
        body: { padding: 0 },
    };

    const modalFooter = (onClose: () => void) => (
        <div style={{ padding: '16px 24px 24px 24px', borderTop: '2px solid #e2e8f0', marginTop: '8px' }}>
            <Button
                fullWidth
                size="md"
                onClick={onClose}
                styles={{
                    root: {
                        background: '#f79122',
                        borderRadius: '10px',
                        fontWeight: 600,
                        '&:hover': { background: '#e07d15' },
                    },
                }}
            >
                Close
            </Button>
        </div>
    );

    return (
        <GuestLayout>
            <Head title="Register" />

            <Modal
                opened={termsOpened}
                onClose={() => setTermsOpened(false)}
                title={<Title order={2} size="h3" fw={700} c="slate.9">Terms of Service</Title>}
                size="xl"
                centered
                overlayProps={{ opacity: 0.55, blur: 3 }}
                styles={modalStyles}
            >
                <ScrollArea h={isMobile ? 400 : 500} type="auto" offsetScrollbars>
                    <TermsContent />
                </ScrollArea>
                {modalFooter(() => setTermsOpened(false))}
            </Modal>

            <Modal
                opened={privacyOpened}
                onClose={() => setPrivacyOpened(false)}
                title={<Title order={2} size="h3" fw={700} c="slate.9">Privacy Policy</Title>}
                size="xl"
                centered
                overlayProps={{ opacity: 0.55, blur: 3 }}
                styles={modalStyles}
            >
                <ScrollArea h={isMobile ? 400 : 500} type="auto" offsetScrollbars>
                    <PrivacyContent />
                </ScrollArea>
                {modalFooter(() => setPrivacyOpened(false))}
            </Modal>

            <div className="min-h-screen flex bg-slate-50">
                {/* Left Panel */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3b3a3e] via-[#2a2929] to-[#3b3a3e] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="relative z-10 flex flex-col justify-center px-8 lg:px-12 xl:px-16">
                        <div className="max-w-lg">
                            <div className="mb-12">
                                <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="Randa Logo" className="h-20 w-auto" />
                                <p className="text-slate-300 text-xl font-light leading-relaxed">
                                    Revolutionary motorbike helmet advertising platform connecting brands with riders
                                </p>
                            </div>

                            <div className="space-y-6 mb-12">
                                {[
                                    { icon: "🚀", text: "Launch targeted campaigns in minutes" },
                                    { icon: "🏍️", text: "Connect with verified riders nationwide" },
                                    { icon: "📊", text: "Real-time analytics and performance tracking" },
                                    { icon: "💡", text: "Innovative helmet advertising technology" }
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-4 group">
                                        <div className="text-2xl">{feature.icon}</div>
                                        <span className="text-slate-300 font-medium group-hover:text-white transition-colors duration-300">
                                            {feature.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-700">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">500+</div>
                                    <div className="text-slate-400 text-sm">Active Brands</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">10K+</div>
                                    <div className="text-slate-400 text-sm">Registered Riders</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">98%</div>
                                    <div className="text-slate-400 text-sm">Satisfaction Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Registration Form */}
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 bg-white relative">
                    <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center px-6 py-2.5 border border-slate-200 rounded-full text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            Sign in
                        </Link>
                    </div>

                    <div className="w-full max-w-lg mx-auto">
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-16 h-16 bg-[#f79122] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/25">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Randa</h2>
                        </div>

                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
                                Join Randa
                            </h2>
                            <p className="text-slate-600 text-lg">
                                Create your account and start your journey with us
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-slate-800 font-semibold text-lg block">
                                    I want to join as:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {['advertiser', 'rider'].map((role) => (
                                        <label
                                            key={role}
                                            className={`flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                                ${data.role === role
                                                    ? role === 'advertiser'
                                                        ? 'border-[#f79122] bg-orange-50 shadow-md'
                                                        : 'border-[#3b3a3e] bg-slate-50 shadow-md'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <Radio
                                                value={role}
                                                checked={data.role === role}
                                                onChange={(event) => setData('role', event.currentTarget.value)}
                                                styles={{
                                                    radio: {
                                                        '&:checked': {
                                                            backgroundColor: role === 'rider' ? '#3b3a3e' : '#f79122',
                                                            borderColor: role === 'rider' ? '#3b3a3e' : '#f79122',
                                                        },
                                                    },
                                                }}
                                            />
                                            <div className="ml-4">
                                                <div className="font-semibold text-slate-900 text-lg">
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </div>
                                                <div className="text-slate-600 text-sm mt-1">
                                                    {role === 'advertiser'
                                                        ? 'Promote your brand through helmet campaigns'
                                                        : 'Earn money by displaying ads on your helmet'}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { id: 'first_name', label: data.role === 'advertiser' ? 'Company Name' : 'First Name', type: 'text', span: true },
                                    { id: 'last_name', label: data.role === 'advertiser' ? 'Contact Person' : 'Last Name', type: 'text', span: true },
                                    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email address', span: true },
                                    { id: 'phone', label: 'Phone Number', type: 'text', placeholder: 'Enter your phone no', span: true },
                                    { id: 'password', label: 'Password', type: 'password', placeholder: 'Create a strong password' },
                                    { id: 'password_confirmation', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password' },
                                ].map((field) => (
                                    <div key={field.id} className={field.span ? 'sm:col-span-2' : ''}>
                                        <label htmlFor={field.id} className="text-slate-800 font-semibold mb-3 block">
                                            {field.label}
                                        </label>
                                        {field.type === 'password' ? (
                                            <PasswordInput
                                                id={field.id}
                                                placeholder={field.placeholder}
                                                required
                                                value={data[field.id as keyof typeof data]}
                                                onChange={(event) => setData(field.id as any, event.currentTarget.value)}
                                                error={errors[field.id as keyof typeof errors]}
                                                autoComplete={field.id === 'password' ? 'new-password' : 'new-password'}
                                                size="lg"
                                                styles={{
                                                    input: {
                                                        padding: '16px 20px',
                                                        border: '2px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        fontSize: '16px',
                                                        fontWeight: '500',
                                                        backgroundColor: '#fafafa',
                                                        '&:focus': {
                                                            borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                            backgroundColor: '#ffffff',
                                                            boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                        },
                                                        '&::placeholder': { color: '#94a3b8' },
                                                    },
                                                }}
                                            />
                                        ) : (
                                            <TextInput
                                                id={field.id}
                                                type={field.type}
                                                placeholder={field.placeholder}
                                                required
                                                value={data[field.id as keyof typeof data]}
                                                onChange={(event) => setData(field.id as any, event.currentTarget.value)}
                                                error={errors[field.id as keyof typeof errors]}
                                                autoComplete={field.id}
                                                size="lg"
                                                styles={{
                                                    input: {
                                                        padding: '16px 20px',
                                                        border: '2px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        fontSize: '16px',
                                                        fontWeight: '500',
                                                        backgroundColor: '#fafafa',
                                                        '&:focus': {
                                                            borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                            backgroundColor: '#ffffff',
                                                            boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                        },
                                                        '&::placeholder': { color: '#94a3b8' },
                                                    },
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <Checkbox
                                    checked={termsAccepted}
                                    onChange={(event) => setTermsAccepted(event.currentTarget.checked)}
                                    label={
                                        <Text size="sm" c="slate.7" style={{ lineHeight: 1.6 }}>
                                            I agree to the{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setTermsOpened(true);
                                                }}
                                                className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2 cursor-pointer"
                                            >
                                                Terms of Service
                                            </button>{' '}
                                            and{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPrivacyOpened(true);
                                                }}
                                                className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2 cursor-pointer"
                                            >
                                                Privacy Policy
                                            </button>
                                        </Text>
                                    }
                                    styles={{
                                        input: {
                                            cursor: 'pointer',
                                            '&:checked': {
                                                backgroundColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                            },
                                        },
                                        label: {
                                            cursor: 'pointer',
                                            paddingLeft: '12px',
                                        },
                                    }}
                                />

                                {!termsAccepted && (
                                    <Text size="xs" c="dimmed" pl={32} style={{ marginTop: '8px' }}>
                                        You must accept the terms to create an account
                                    </Text>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || !termsAccepted}
                                size="xl"
                                styles={{
                                    root: {
                                        background: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '16px 32px',
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        height: '56px',
                                        width: '100%',
                                        boxShadow: data.role === 'rider'
                                            ? '0 10px 25px -5px rgba(59, 58, 62, 0.3)'
                                            : '0 10px 25px -5px rgba(247, 145, 34, 0.3)',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover:not(:disabled)': {
                                            background: data.role === 'rider' ? '#2a2929' : '#e07d15',
                                            transform: 'translateY(-2px)',
                                            boxShadow: data.role === 'rider'
                                                ? '0 15px 35px -5px rgba(59, 58, 62, 0.4)'
                                                : '0 15px 35px -5px rgba(247, 145, 34, 0.4)',
                                        },
                                        '&:disabled': {
                                            opacity: 0.6,
                                            cursor: 'not-allowed',
                                            transform: 'none',
                                        },
                                    },
                                }}
                            >
                                {processing ? (
                                    <div className="flex items-center justify-center space-x-3">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating account...</span>
                                    </div>
                                ) : (
                                    `Create ${data.role === 'rider' ? 'Rider' : 'Advertiser'} Account`
                                )}
                            </Button>
                        </form>

                        <div className="mt-10 text-center">
                            <p className="text-slate-500">
                                Already have an account?{' '}
                                <Link
                                    href={route('login')}
                                    className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2 transition-colors duration-200"
                                >
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}