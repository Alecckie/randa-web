import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Button,
    Text,
    Title,
    Divider,
    Stack,
    Modal,
    ScrollArea
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

// ── Terms of Service ──────────────────────────────────────────────────────────

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
            { title: "1. About RANDA", content: "RANDA is a digital advertising and monetization platform that connects advertisers with motorbike riders. Riders earn income by displaying advertisement branding on helmets. Advertisers gain high-impact real-world visibility." },
            { title: "2. User Eligibility", content: "You must be at least 18 years old and legally able to enter into binding contracts in Kenya. You agree to provide accurate information and maintain updated profile details." },
            { title: "3. Account Registration", content: "Users must create an account to use RANDA Services. You are responsible for securing your account credentials and all activities under your account. RANDA may suspend or terminate accounts that violate these Terms or applicable laws." },
            { title: "4. Platform Roles", list: ["Riders earn income for participating in campaigns.", "Advertisers create and pay for advertising campaigns.", "RANDA is a neutral platform that facilitates these interactions."] },
            { title: "5. Fees, Payments & Earnings", list: ["Riders will receive daily earnings based on approved participation and compliance.", "Advertisers shall pay campaign fees as invoiced or as specified within the platform.", "RANDA may deduct commissions, taxes, VAT, or fees prior to payout.", "All financial transactions may be processed through third-party payment providers.", "RANDA reserves the right to modify pricing or payout models."] },
            { title: "6. Compliance & Conduct", content: "Users agree not to: misuse or interfere with platform operations, engage in fraud or misrepresentation, violate advertising, road safety, or intellectual property laws. Riders acknowledge full responsibility for safe riding practices and helmet usage." },
            { title: "7. Campaign Content", content: "Advertisers are responsible for the legality and accuracy of any promotional material submitted. RANDA may reject or remove content that is: unlawful, defamatory, hateful, sexually explicit, violent or extremist, politically sensitive or manipulative." },
            { title: "8. Intellectual Property", content: "All platform content, branding, and code belong to RANDA unless otherwise stated. Users retain ownership of content they upload but grant RANDA a license to display, use and distribute such content for campaign execution." },
            { title: "9. Data Usage", content: "Use of personal data is governed by the RANDA Privacy Policy." },
            { title: "10. Termination", content: "RANDA may suspend access or terminate accounts at any time for breach of these Terms or misuse of the platform. Users may delete their account at any time. Termination does not affect earned obligations, unpaid invoices, or legal rights." },
            { title: "11. Disclaimer", content: "RANDA provides its Services on an \"as is\" and \"as available\" basis. RANDA is not liable for losses resulting from downtime, rider incidents, campaign outcomes, or third-party service failures." },
            { title: "12. Limitation of Liability", content: "To the maximum extent permitted by law, RANDA shall not be liable for indirect, special, consequential, punitive, or incidental damages." },
            { title: "13. Modification of Terms", content: "RANDA may update these Terms occasionally. Updated versions will be posted on the website. Continued use after updates constitutes acceptance." },
            { title: "14. Governing Law", content: "These Terms shall be governed by the laws of Kenya." },
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

// ── Privacy Policy ────────────────────────────────────────────────────────────

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
            { title: "1. Data We Collect", intro: "We may collect:", list: ["account information (name, phone number, email, rider/advertiser details)", "payment details required for payouts or billing", "advertising campaign materials supplied by advertisers", "usage data and device information", "location signals from riders for verification and campaign reporting"] },
            { title: "2. How We Use Your Data", intro: "We may use collected information to:", list: ["verify rider participation in campaigns", "calculate earnings and payout amounts", "operate campaign reporting and performance dashboards for advertisers", "maintain secure platform access", "process payments", "communicate with users and provide support", "improve platform features and performance"] },
            { title: "3. Location Data Use (Riders)", intro: "RANDA may collect limited location signals during active campaign periods to:", list: ["confirm that branded helmets are being used during normal routes", "generate aggregated campaign exposure reporting for advertisers"], footer: "We do not store precise real-time tracking for public identification. Location data is retained for a short limited period and then securely deleted." },
            { title: "4. Sharing of Data", intro: "We may share data with:", list: ["payment processors", "identity verification providers", "advertisers (aggregated campaign performance only)", "government authorities if required by law"], footer: "We do not sell personal data to third parties." },
            { title: "5. Security Measures", content: "We implement reasonable physical, technical, and administrative safeguards to protect personal information from unauthorized access or misuse." },
            { title: "6. Data Retention", content: "Personal data is retained only as necessary for platform operation, legal compliance, and campaign settlement. Campaign location signals are retained for a limited short period." },
            { title: "7. User Rights", intro: "Depending on applicable law, you may request to:", list: ["access personal data", "correct inaccurate information", "delete your account", "object to specific processing"] },
            { title: "8. Minors", content: "RANDA does not knowingly allow minors under 18 to register or participate in Services." },
            { title: "9. Changes to This Policy", content: "RANDA may update this Privacy Policy periodically. Updated versions will be posted on the website. Continued use of the Services after updates indicates acceptance of the revised version." },
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

// ── Icon components ───────────────────────────────────────────────────────────

function IconTarget() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
function IconChart() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}
function IconShield() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}
function IconWallet() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Homepage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [termsOpened, setTermsOpened] = useState(false);
    const [privacyOpened, setPrivacyOpened] = useState(false);

    const modalStyles = {
        content: { borderRadius: '16px' },
        header: { padding: '24px 24px 16px 24px', borderBottom: '1px solid #e2e8f0' },
        body: { padding: 0 },
    };

    const modalFooter = (onClose: () => void) => (
        <div style={{ padding: '16px 24px 24px 24px', borderTop: '1px solid #e2e8f0' }}>
            <Button fullWidth size="md" onClick={onClose} style={{ background: '#f79122', borderRadius: '10px', fontWeight: 600 }}>
                Close
            </Button>
        </div>
    );

    const howItWorks = [
        {
            role: 'For Advertisers',
            steps: [
                { n: '01', title: 'Create a Campaign', desc: 'Set your brand message, budget, duration, and target coverage areas.' },
                { n: '02', title: 'Campaign Approval', desc: 'Our team reviews your campaign to ensure compliance and quality.' },
                { n: '03', title: 'Track Performance', desc: 'Access real-time analytics and route data through your dashboard.' },
            ],
        },
        {
            role: 'For Riders',
            steps: [
                { n: '01', title: 'Register & Verify', desc: 'Complete your rider profile with ID and license documentation.' },
                { n: '02', title: 'Receive Branded Helmet', desc: 'Pick up your campaign-branded helmet from the designated point.' },
                { n: '03', title: 'Earn Every Day', desc: 'Scan in daily with your QR code and earn for every verified riding day.' },
            ],
        },
    ];

    const features = [
        {
            icon: <IconTarget />,
            title: 'Verified Impressions',
            desc: 'GPS-tracked routes confirm real-world ad exposure across key areas.',
        },
        {
            icon: <IconChart />,
            title: 'Campaign Analytics',
            desc: 'Live dashboards give advertisers full visibility into route coverage and rider activity.',
        },
        {
            icon: <IconShield />,
            title: 'Helmet Safety',
            desc: 'Branded helmets provided by RANDA protect riders and set safety standards on the road.',
        },
        {
            icon: <IconWallet />,
            title: 'M-Pesa Payouts',
            desc: 'Riders receive daily earnings directly to their M-Pesa account — transparent and timely.',
        },
    ];

    return (
        <div className="min-h-screen bg-white">

            {/* ── Modals ── */}
            <Modal
                opened={termsOpened}
                onClose={() => setTermsOpened(false)}
                title={<Title order={2} size="h3" fw={700} c="slate.9">Terms of Service</Title>}
                size="xl"
                centered
                overlayProps={{ opacity: 0.5, blur: 3 }}
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
                overlayProps={{ opacity: 0.5, blur: 3 }}
                styles={modalStyles}
            >
                <ScrollArea h={isMobile ? 400 : 500} type="auto" offsetScrollbars>
                    <PrivacyContent />
                </ScrollArea>
                {modalFooter(() => setPrivacyOpened(false))}
            </Modal>

            {/* ── Navigation ── */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <img src="/assets/logo.png" alt="RANDA" className="h-9 w-auto" />

                        {/* Desktop nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
                            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
                            <button
                                onClick={() => setTermsOpened(true)}
                                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Terms
                            </button>
                            <div className="flex items-center gap-3 ml-4">
                                <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900 font-medium transition-colors">
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="text-sm bg-[#f79122] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#e07d15] transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-slate-600 hover:text-slate-900 transition-colors p-1"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMenuOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                }
                            </svg>
                        </button>
                    </div>

                    {/* Mobile menu */}
                    {isMenuOpen && (
                        <div className="md:hidden border-t border-slate-100 py-4 space-y-4">
                            <a href="#how-it-works" className="block text-sm text-slate-600 hover:text-slate-900" onClick={() => setIsMenuOpen(false)}>How It Works</a>
                            <a href="#features" className="block text-sm text-slate-600 hover:text-slate-900" onClick={() => setIsMenuOpen(false)}>Features</a>
                            <button onClick={() => { setTermsOpened(true); setIsMenuOpen(false); }} className="block text-sm text-slate-600 hover:text-slate-900">Terms</button>
                            <hr className="border-slate-100" />
                            <Link href="/login" className="block text-sm text-slate-700 font-medium">Sign In</Link>
                            <Link href="/register" className="block text-sm bg-[#f79122] text-white px-4 py-2 rounded-lg font-semibold text-center hover:bg-[#e07d15] transition-colors">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="bg-[#1a1a1a]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#f79122] mb-6 border border-[#f79122]/30 rounded-full px-4 py-1.5">
                            Mobile Advertising Platform · Kenya
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
                            Advertising That Moves<br />
                            <span className="text-[#f79122]">With the City</span>
                        </h1>
                        <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            RANDA connects brands with motorbike riders across Kenya. Verified GPS routes turn every daily commute into a measurable advertising impression.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register?type=advertiser"
                                className="inline-flex items-center justify-center bg-white text-slate-900 px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors"
                            >
                                Advertise with RANDA
                            </Link>
                            <Link
                                href="/register?type=rider"
                                className="inline-flex items-center justify-center bg-[#f79122] text-white px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-[#e07d15] transition-colors"
                            >
                                Become a Rider
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Value bar ── */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Platform</p>
                            <p className="text-base text-slate-800 font-medium">GPS-verified helmet advertising across Kenyan cities</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">For Advertisers</p>
                            <p className="text-base text-slate-800 font-medium">Real-time dashboards, route heatmaps, and daily impression data</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">For Riders</p>
                            <p className="text-base text-slate-800 font-medium">Daily M-Pesa payouts for every verified riding day</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section id="how-it-works" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-xs font-semibold tracking-widest uppercase text-[#f79122] mb-3">How It Works</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Simple. Transparent. Effective.</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                        {howItWorks.map((group) => (
                            <div key={group.role}>
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-8">{group.role}</h3>
                                <div className="space-y-8">
                                    {group.steps.map((step) => (
                                        <div key={step.n} className="flex gap-5">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-[#f79122] flex items-center justify-center">
                                                <span className="text-xs font-bold text-[#f79122]">{step.n}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-semibold text-slate-900 mb-1">{step.title}</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-xs font-semibold tracking-widest uppercase text-[#f79122] mb-3">Platform Features</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Built for accountability at every level</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f) => (
                            <div key={f.title} className="border border-slate-100 rounded-xl p-6 hover:border-slate-200 hover:shadow-sm transition-all">
                                <div className="w-10 h-10 bg-[#f79122]/10 rounded-lg flex items-center justify-center text-[#f79122] mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="bg-[#1a1a1a] py-20">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
                    <p className="text-slate-400 mb-8 text-base">
                        Join RANDA as an advertiser or rider and be part of Kenya's growing mobile advertising network.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/register?type=advertiser"
                            className="inline-flex items-center justify-center bg-[#f79122] text-white px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-[#e07d15] transition-colors"
                        >
                            Start Advertising
                        </Link>
                        <Link
                            href="/register?type=rider"
                            className="inline-flex items-center justify-center border border-white/20 text-white px-7 py-3.5 rounded-lg font-semibold text-sm hover:bg-white/5 transition-colors"
                        >
                            Start Earning
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="bg-slate-900 text-white py-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-10 mb-10">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-[#f79122] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-white">R</span>
                                </div>
                                <span className="text-lg font-bold">RANDA</span>
                            </div>
                            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                                GPS-verified helmet advertising connecting brands with motorbike riders across Kenya.
                            </p>
                            <p className="text-sm text-slate-500 mt-4">
                                <a href="mailto:info@randamedia.co.ke" className="hover:text-slate-300 transition-colors">
                                    info@randamedia.co.ke
                                </a>
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Platform</p>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Legal</p>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li>
                                    <button onClick={() => setTermsOpened(true)} className="hover:text-white transition-colors text-left">
                                        Terms & Conditions
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => setPrivacyOpened(true)} className="hover:text-white transition-colors text-left">
                                        Privacy Policy
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} RANDA Media Limited. All rights reserved.</p>
                        <p className="text-xs text-slate-600">Nairobi, Kenya</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
