import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Modal, ScrollArea, Text, Title, Divider, Stack, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Eye, EyeOff, Mail, Phone, User, Lock, AlertCircle } from 'lucide-react';

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
                content: { borderRadius: 16, background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)' },
                header: { background: '#1a1a1f', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                title: { color: 'white' },
                close: { color: '#9ca3af' },
                body: { padding: 0, background: '#1a1a1f' },
            }}
        >
            <ScrollArea h={isMobile ? 360 : 480} type="auto" offsetScrollbars>
                <Stack gap="md" p={24}>
                    <Text size="xs" c="dimmed">Last Updated: November 2025</Text>
                    <Divider color="rgba(255,255,255,0.1)" />
                    {sections.map((s, i) => (
                        <div key={i}>
                            <Title order={5} fw={700} mb={6} c="white">{s.title}</Title>
                            {s.content && <Text size="sm" lh={1.7} c="gray.4">{s.content}</Text>}
                            {s.intro && <Text size="sm" lh={1.7} c="gray.4">{s.intro}</Text>}
                            {s.list && (
                                <Text size="sm" lh={1.7} component="ul" pl="md" c="gray.4">
                                    {s.list.map((item, j) => <li key={j}>{item}</li>)}
                                </Text>
                            )}
                            {s.footer && <Text size="sm" lh={1.7} mt={4} fw={600} c="gray.3">{s.footer}</Text>}
                        </div>
                    ))}
                    <div>
                        <Title order={5} fw={700} mb={6} c="white">Contact</Title>
                        <Text size="sm" c="gray.4">For questions, contact: <Text component="a" href="mailto:info@randamedia.co.ke" c="#f79122" fw={600}>info@randamedia.co.ke</Text></Text>
                    </div>
                </Stack>
            </ScrollArea>
            <div className="border-t border-white/8 p-4">
                <Button fullWidth onClick={onClose} styles={{ root: { background: '#f79122', borderRadius: 10, fontWeight: 600 } }}>
                    Close
                </Button>
            </div>
        </Modal>
    );
}

// ── Dark input class ──────────────────────────────────────────────────────────

const inputCls = 'block w-full pl-10 pr-4 py-3 text-sm border border-white/8 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition';

// ── Password toggle field ────────────────────────────────────────────────────

function PasswordField({ id, label, value, onChange, error, autoComplete, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; autoComplete?: string; placeholder?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock size={15} />
                </div>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? '••••••••'}
                    className="block w-full pl-10 pr-11 py-3 text-sm border border-white/8 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
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

            <div className="min-h-screen flex bg-[#111114]">
                {/* ── Left branding panel ── */}
                <div className="hidden lg:flex lg:w-[40%] bg-[#0d0d10] relative overflow-hidden flex-col justify-between p-12 xl:p-16 border-r border-white/5">
                    <div className="absolute inset-0 opacity-[0.045]">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="g2" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#g2)" />
                        </svg>
                    </div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#f79122] opacity-[0.07] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#f79122] opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                    <div className="relative z-10">
                        <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="RANDA" className="h-12 w-auto" />
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                                Join the<br />
                                <span className="text-[#f79122]">Revolution.</span>
                            </h1>
                            <p className="mt-4 text-gray-400 text-base leading-relaxed max-w-sm">
                                Whether you're a brand or a rider, RANDA puts you at the heart of real-world advertising.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: '🚀', text: 'Launch campaigns in minutes' },
                                { icon: '🏍️', text: 'Connect with verified riders' },
                                { icon: '📊', text: 'Real-time performance tracking' },
                                { icon: '💡', text: 'Innovative helmet technology' },
                            ].map((f) => (
                                <div key={f.text} className="flex items-center gap-4">
                                    <span className="text-xl">{f.icon}</span>
                                    <span className="text-gray-300 text-sm">{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-4 pt-8 border-t border-white/8">
                        {[['500+', 'Brands'], ['10K+', 'Riders'], ['98%', 'Satisfaction']].map(([v, l]) => (
                            <div key={l} className="text-center">
                                <div className="text-2xl font-bold text-white">{v}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{l}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right form panel ── */}
                <div className="flex-1 flex flex-col bg-[#111114] relative overflow-y-auto">
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                        <Link href={route('login')}
                            className="text-sm font-medium text-gray-400 hover:text-[#f79122] transition-colors">
                            Have an account?{' '}
                            <span className="text-[#f79122] font-semibold">Sign in</span>
                        </Link>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-20">
                        <div className="w-full max-w-lg">
                            {/* Mobile logo */}
                            <div className="lg:hidden mb-10 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#f79122] flex items-center justify-center shadow-lg shadow-[#f79122]/30">
                                    <span className="text-white font-bold text-lg">R</span>
                                </div>
                                <span className="text-xl font-bold text-white">RANDA</span>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-white">Create your account</h2>
                                <p className="mt-2 text-gray-400 text-sm">Start your journey with RANDA today</p>
                            </div>

                            <form onSubmit={submit} className="space-y-6">
                                {/* Role selector */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-300 mb-3">I'm joining as a…</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['advertiser', 'rider'] as const).map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setData('role', role)}
                                                className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                                    data.role === role
                                                        ? 'border-[#f79122] bg-[#f79122]/8 shadow-sm shadow-[#f79122]/10'
                                                        : 'border-white/8 hover:border-white/15 bg-white/3'
                                                }`}
                                            >
                                                <span className="text-lg mb-1">{role === 'advertiser' ? '📢' : '🏍️'}</span>
                                                <span className={`font-semibold text-sm capitalize ${data.role === role ? 'text-[#f79122]' : 'text-gray-300'}`}>
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
                                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1.5">
                                            {isRider ? 'First Name' : 'Company Name'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
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
                                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1.5">
                                            {isRider ? 'Last Name' : 'Contact Person'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
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
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
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
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">Phone number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
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
                                        className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-white/5 text-[#f79122] focus:ring-[#f79122] cursor-pointer flex-shrink-0" />
                                    <span className="text-sm text-gray-400 leading-relaxed">
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
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] text-white text-sm font-semibold shadow-lg shadow-[#f79122]/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
                        <p className="text-xs text-gray-600">© {new Date().getFullYear()} RANDA Media. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
