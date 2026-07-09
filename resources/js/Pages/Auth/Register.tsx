import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Modal, ScrollArea, Text, Title, Divider, Stack, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Eye, EyeOff, Mail, Phone, User, Lock, AlertCircle, Megaphone, Bike } from 'lucide-react';

// ── Terms content ────────────────────────────────────────────────────────────

const sections_terms = [
    { title: '1. About RANDA', content: 'RANDA is a digital advertising and monetization platform that connects advertisers with motorbike riders. Riders earn income by displaying advertisement branding on helmets. Advertisers gain high-impact real-world visibility.' },
    { title: '2. User Eligibility', content: 'You must be at least 18 years old and legally able to enter into binding contracts in Kenya. You agree to provide accurate information and maintain updated profile details.' },
    { title: '3. Account Registration', content: 'Users must create an account to use RANDA Services. You are responsible for securing your account credentials and all activities under your account. RANDA may suspend or terminate accounts that violate these Terms or applicable laws.' },
    { title: '4. Platform Roles', list: ['Riders earn income for participating in campaigns.', 'Advertisers create and pay for advertising campaigns.', 'RANDA is a neutral platform that facilitates these interactions.'] },
    { title: '5. Fees, Payments & Earnings', list: ['Riders will receive daily earnings based on approved participation and compliance.', 'Advertisers shall pay campaign fees as invoiced or as specified within the platform.', 'RANDA may deduct commissions, taxes, VAT, or fees prior to payout.', 'All financial transactions may be processed through third-party payment providers.', 'RANDA reserves the right to modify pricing or payout models.'] },
    { title: '6. Compliance & Conduct', content: 'Users agree not to: misuse or interfere with platform operations, engage in fraud or misrepresentation, violate advertising, road safety, or intellectual property laws. Riders acknowledge full responsibility for safe riding practices and helmet usage.' },
    { title: '7. Campaign Content', content: 'Advertisers are responsible for the legality and accuracy of any promotional material submitted. RANDA may reject or remove content that is: unlawful, defamatory, hateful, sexually explicit, violent or extremist, politically sensitive or manipulative.' },
    { title: '8. Intellectual Property', content: 'All platform content, branding, and code belong to RANDA unless otherwise stated. Users retain ownership of content they upload but grant RANDA a license to display, use and distribute such content for campaign execution.' },
    { title: '9. Data Usage', content: 'Use of personal data is governed by the RANDA Privacy Policy.' },
    { title: '10. Termination', content: 'RANDA may suspend access or terminate accounts at any time for breach of these Terms or misuse of the platform. Users may delete their account at any time. Termination does not affect earned obligations, unpaid invoices, or legal rights.' },
    { title: '11. Disclaimer', content: 'RANDA provides its Services on an "as is" and "as available" basis. RANDA is not liable for losses resulting from downtime, rider incidents, campaign outcomes, or third-party service failures.' },
    { title: '12. Limitation of Liability', content: 'To the maximum extent permitted by law, RANDA shall not be liable for indirect, special, consequential, punitive, or incidental damages.' },
    { title: '13. Modification of Terms', content: 'RANDA may update these Terms occasionally. Updated versions will be posted on the website. Continued use after updates constitutes acceptance.' },
    { title: '14. Governing Law', content: 'These Terms shall be governed by the laws of Kenya.' },
];

const sections_privacy = [
    { title: '1. Data We Collect', intro: 'We may collect:', list: ['account information (name, phone number, email, rider/advertiser details)', 'payment details required for payouts or billing', 'advertising campaign materials supplied by advertisers', 'usage data and device information', 'location signals from riders for verification and campaign reporting'] },
    { title: '2. How We Use Your Data', intro: 'We may use collected information to:', list: ['verify rider participation in campaigns', 'calculate earnings and payout amounts', 'operate campaign reporting and performance dashboards for advertisers', 'maintain secure platform access', 'process payments', 'communicate with users and provide support', 'improve platform features and performance'] },
    { title: '3. Location Data Use (Riders)', intro: 'RANDA may collect limited location signals during active campaign periods to:', list: ['confirm that branded helmets are being used during normal routes', 'generate aggregated campaign exposure reporting for advertisers'], footer: 'We do not store precise real-time tracking for public identification. Location data is retained for a short limited period and then securely deleted.' },
    { title: '4. Sharing of Data', intro: 'We may share data with:', list: ['payment processors', 'identity verification providers', 'advertisers (aggregated campaign performance only)', 'government authorities if required by law'], footer: 'We do not sell personal data to third parties.' },
    { title: '5. Security Measures', content: 'We implement reasonable physical, technical, and administrative safeguards to protect personal information from unauthorized access or misuse.' },
    { title: '6. Data Retention', content: 'Personal data is retained only as necessary for platform operation, legal compliance, and campaign settlement. Campaign location signals are retained for a limited short period.' },
    { title: '7. User Rights', intro: 'Depending on applicable law, you may request to:', list: ['access personal data', 'correct inaccurate information', 'delete your account', 'object to specific processing'] },
    { title: '8. Minors', content: 'RANDA does not knowingly allow minors under 18 to register or participate in Services.' },
    { title: '9. Changes to This Policy', content: 'RANDA may update this Privacy Policy periodically. Updated versions will be posted on the website. Continued use of the Services after updates indicates acceptance of the revised version.' },
];

function LegalModal({ opened, onClose, title, sections }: {
    opened: boolean;
    onClose: () => void;
    title: string;
    sections: { title: string; content?: string; intro?: string; list?: string[]; footer?: string }[];
}) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={3} fw={700}>{title}</Title>}
            size="xl"
            centered
            overlayProps={{ opacity: 0.7, blur: 4 }}
            styles={{
                content: { borderRadius: 16 },
                header: { padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6' },
                body: { padding: 0 },
            }}
        >
            <ScrollArea h={isMobile ? 360 : 480} type="auto" offsetScrollbars>
                <Stack gap="md" p={24}>
                    <Text size="xs" c="dimmed">Last Updated: November 2025</Text>
                    <Divider />
                    {sections.map((s, i) => (
                        <div key={i}>
                            <Title order={5} fw={700} mb={6}>{s.title}</Title>
                            {s.content && <Text size="sm" lh={1.7} c="dimmed">{s.content}</Text>}
                            {s.intro && <Text size="sm" lh={1.7} c="dimmed">{s.intro}</Text>}
                            {s.list && (
                                <Text size="sm" lh={1.7} component="ul" pl="md" c="dimmed">
                                    {s.list.map((item, j) => <li key={j}>{item}</li>)}
                                </Text>
                            )}
                            {s.footer && <Text size="sm" lh={1.7} mt={4} fw={600} c="dark">{s.footer}</Text>}
                        </div>
                    ))}
                    <div>
                        <Title order={5} fw={700} mb={6}>Contact</Title>
                        <Text size="sm" c="dimmed">For questions, contact: <Text component="a" href="mailto:info@randamedia.co.ke" c="#f79122" fw={600}>info@randamedia.co.ke</Text></Text>
                    </div>
                </Stack>
            </ScrollArea>
            <div className="border-t border-gray-100 p-4">
                <Button fullWidth onClick={onClose} styles={{ root: { background: '#f79122', borderRadius: 10, fontWeight: 600 } }}>
                    Close
                </Button>
            </div>
        </Modal>
    );
}

// ── Input class ───────────────────────────────────────────────────────────────

const inputCls = 'block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition';

// ── Password toggle field ────────────────────────────────────────────────────

function PasswordField({ id, label, value, onChange, error, autoComplete, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; autoComplete?: string; placeholder?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={15} />
                </div>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? '••••••••'}
                    className="block w-full pl-10 pr-11 py-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {error && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle size={11} /> {error}
                </p>
            )}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

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

    const [termsOpened, setTermsOpened] = useState(false);
    const [privacyOpened, setPrivacyOpened] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    const isRider = data.role === 'rider';

    return (
        <GuestLayout>
            <Head title="Create Account" />

            <LegalModal opened={termsOpened} onClose={() => setTermsOpened(false)} title="Terms of Service" sections={sections_terms} />
            <LegalModal opened={privacyOpened} onClose={() => setPrivacyOpened(false)} title="Privacy Policy" sections={sections_privacy} />

            <div className="min-h-screen flex bg-white">
                {/* ── Left branding panel ── */}
                <div className="hidden lg:flex lg:w-[40%] bg-slate-50 flex-col justify-between p-12 xl:p-16 border-r border-gray-200">
                    <div>
                        <img src="/assets/logo.png" alt="RANDA" className="h-12 w-auto" />
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-slate-800 leading-tight tracking-tight">
                                Join the<br />
                                <span className="text-[#f79122]">RANDA Network.</span>
                            </h1>
                            <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-sm">
                                Whether you're a brand or a rider, RANDA connects you to Kenya's mobile advertising ecosystem.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                'GPS-verified daily campaigns',
                                'Connect with verified riders',
                                'Real-time performance tracking',
                                'M-Pesa payouts for riders',
                            ].map((f) => (
                                <div key={f} className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#f79122] flex-shrink-0" />
                                    <span className="text-gray-600 text-sm">{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-200">
                        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} RANDA Media Limited. Kenya.</p>
                    </div>
                </div>

                {/* ── Right form panel ── */}
                <div className="flex-1 flex flex-col bg-white relative overflow-y-auto">
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                        <Link href={route('login')}
                            className="text-sm font-medium text-gray-500 hover:text-[#f79122] transition-colors">
                            Have an account?{' '}
                            <span className="text-[#f79122] font-semibold">Sign in</span>
                        </Link>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-20">
                        <div className="w-full max-w-lg">
                            {/* Mobile logo */}
                            <div className="lg:hidden mb-10">
                                <img src="/assets/logo.png" alt="RANDA" className="h-9 w-auto" />
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
                                <p className="mt-2 text-gray-500 text-sm">Start your journey with RANDA today</p>
                            </div>

                            <form onSubmit={submit} className="space-y-6">
                                {/* Role selector */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-3">I'm joining as a…</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['advertiser', 'rider'] as const).map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setData('role', role)}
                                                className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                                    data.role === role
                                                        ? 'border-[#f79122] bg-orange-50'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                            >
                                                <span className={`mb-2 ${data.role === role ? 'text-[#f79122]' : 'text-gray-400'}`}>
                                                    {role === 'advertiser' ? <Megaphone size={20} /> : <Bike size={20} />}
                                                </span>
                                                <span className={`font-semibold text-sm capitalize ${data.role === role ? 'text-[#f79122]' : 'text-gray-700'}`}>
                                                    {role}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-0.5">
                                                    {role === 'advertiser' ? 'Promote your brand' : 'Earn with your helmet'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Name row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {isRider ? 'First Name' : 'Company Name'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                                <User size={15} />
                                            </div>
                                            <input id="first_name" type="text" autoComplete="given-name"
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.target.value)}
                                                placeholder={isRider ? 'John' : 'Acme Ltd.'}
                                                className={inputCls} />
                                        </div>
                                        {errors.first_name && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400"><AlertCircle size={11} /> {errors.first_name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {isRider ? 'Last Name' : 'Contact Person'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                                <User size={15} />
                                            </div>
                                            <input id="last_name" type="text" autoComplete="family-name"
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.target.value)}
                                                placeholder={isRider ? 'Doe' : 'Jane Doe'}
                                                className={inputCls} />
                                        </div>
                                        {errors.last_name && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400"><AlertCircle size={11} /> {errors.last_name}</p>}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Mail size={15} />
                                        </div>
                                        <input id="email" type="email" autoComplete="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="you@example.com"
                                            className={inputCls} />
                                    </div>
                                    {errors.email && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400"><AlertCircle size={11} /> {errors.email}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Phone size={15} />
                                        </div>
                                        <input id="phone" type="tel" autoComplete="tel"
                                            inputMode="numeric"
                                            maxLength={12}
                                            value={data.phone}
                                            onChange={(e) => {
                                                let d = e.target.value.replace(/\D/g, '');
                                                if (d.startsWith('0')) d = '254' + d.slice(1);
                                                if (d.length > 0 && !d.startsWith('254')) d = '254' + d;
                                                setData('phone', d.slice(0, 12));
                                            }}
                                            placeholder="254XXXXXXXXX"
                                            className={inputCls} />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600">Format: 254XXXXXXXXX (e.g. 254710000000)</p>
                                    {errors.phone && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400"><AlertCircle size={11} /> {errors.phone}</p>}
                                </div>

                                {/* Password row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <PasswordField id="password" label="Password" value={data.password}
                                        onChange={(v) => setData('password', v)}
                                        error={errors.password} autoComplete="new-password"
                                        placeholder="Min. 8 characters" />
                                    <PasswordField id="password_confirmation" label="Confirm Password"
                                        value={data.password_confirmation}
                                        onChange={(v) => setData('password_confirmation', v)}
                                        error={errors.password_confirmation} autoComplete="new-password" />
                                </div>

                                {/* Terms */}
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 bg-white text-[#f79122] focus:ring-[#f79122] cursor-pointer flex-shrink-0" />
                                    <span className="text-sm text-gray-500 leading-relaxed">
                                        I agree to the{' '}
                                        <button type="button" onClick={(e) => { e.preventDefault(); setTermsOpened(true); }}
                                            className="text-[#f79122] hover:text-[#e07a1a] font-semibold underline underline-offset-2">
                                            Terms of Service
                                        </button>{' '}
                                        and{' '}
                                        <button type="button" onClick={(e) => { e.preventDefault(); setPrivacyOpened(true); }}
                                            className="text-[#f79122] hover:text-[#e07a1a] font-semibold underline underline-offset-2">
                                            Privacy Policy
                                        </button>
                                    </span>
                                </label>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={processing || !termsAccepted}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Creating account…
                                        </>
                                    ) : `Create ${isRider ? 'Rider' : 'Advertiser'} Account`}
                                </button>
                            </form>

                            <p className="mt-8 text-center text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link href={route('login')} className="text-[#f79122] hover:text-[#e07a1a] font-semibold">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="px-6 pb-6 text-center">
                        <p className="text-xs text-gray-400">© {new Date().getFullYear()} RANDA Media. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
