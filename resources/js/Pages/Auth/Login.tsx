import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';

// ── Sample credentials card ───────────────────────────────────────────────────

const SAMPLE_LOGINS = [
    { role: 'Admin', email: 'admin@randa.test', password: 'password', color: '#f79122' },
    { role: 'Advertiser', email: 'advert@randa.test', password: 'password', color: '#60a5fa' },
    { role: 'Rider', email: 'rider1@randa.test', password: 'password', color: '#34d399' },
];

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handle = () => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button type="button" onClick={handle}
            className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
    );
}

// ── Grid background SVG ───────────────────────────────────────────────────────

const GridBg = ({ id }: { id: string }) => (
    <div className="absolute inset-0 opacity-[0.045]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    </div>
);

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const fill = (email: string, password: string) => {
        setData('email', email);
        setData('password', password);
    };

    return (
        <GuestLayout>
            <Head title="Sign In" />
            <div className="min-h-screen flex bg-[#111114]">

                {/* ── Left branding panel ── */}
                <div className="hidden lg:flex lg:w-[42%] bg-[#0d0d10] relative overflow-hidden flex-col justify-between p-12 xl:p-16 border-r border-white/5">
                    <GridBg id="gl" />
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#f79122] opacity-[0.07] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#f79122] opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                    {/* Logo */}
                    <div className="relative z-10">
                        <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="RANDA" className="h-12 w-auto" />
                    </div>

                    {/* Copy */}
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                                Helmet Advertising,<br />
                                <span className="text-[#f79122]">Reimagined.</span>
                            </h1>
                            <p className="mt-4 text-gray-400 text-base leading-relaxed max-w-sm">
                                Connect brands with riders. Launch targeted campaigns. Track results in real time.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                'GPS-verified rider coverage',
                                'Branded helmet campaigns',
                                'Live analytics dashboard',
                            ].map((f) => (
                                <div key={f} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-[#f79122]/15 border border-[#f79122]/30 flex items-center justify-center flex-shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#f79122]" />
                                    </span>
                                    <span className="text-gray-300 text-sm">{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
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
                <div className="flex-1 flex flex-col bg-[#111114] relative">
                    {/* top-right register link */}
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                        <Link href={route('register')}
                            className="text-sm font-medium text-gray-400 hover:text-[#f79122] transition-colors">
                            No account?{' '}
                            <span className="text-[#f79122] font-semibold">Register</span>
                        </Link>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-20">
                        <div className="w-full max-w-md">
                            {/* Mobile logo */}
                            <div className="lg:hidden mb-10 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#f79122] flex items-center justify-center shadow-lg shadow-[#f79122]/30">
                                    <span className="text-white font-bold text-lg">R</span>
                                </div>
                                <span className="text-xl font-bold text-white">RANDA</span>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-white">Welcome back</h2>
                                <p className="mt-2 text-gray-400 text-sm">Sign in to your account to continue</p>
                            </div>

                            {/* Status banner */}
                            {status && (
                                <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                                    <CheckCircle size={16} className="flex-shrink-0" />
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-5">
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                            <Mail size={16} />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            autoFocus
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="you@example.com"
                                            className="block w-full pl-10 pr-4 py-3 text-sm border border-white/8 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                            <AlertCircle size={12} /> {errors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-300" htmlFor="password">
                                            Password
                                        </label>
                                        {canResetPassword && (
                                            <Link href={route('password.request')}
                                                className="text-xs text-[#f79122] hover:text-[#e07a1a] font-medium">
                                                Forgot password?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full pl-10 pr-11 py-3 text-sm border border-white/8 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                            <AlertCircle size={12} /> {errors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Remember me */}
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-white/5 text-[#f79122] focus:ring-[#f79122] cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                                        Keep me signed in
                                    </span>
                                </label>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] disabled:opacity-60 text-white text-sm font-semibold shadow-lg shadow-[#f79122]/20 hover:shadow-[#f79122]/35 transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Signing in…
                                        </>
                                    ) : 'Sign In'}
                                </button>
                            </form>

                            {/* ── Sample credentials ── */}
                            <div className="mt-8 p-4 rounded-xl bg-white/3 border border-white/8">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Demo credentials
                                </p>
                                <div className="space-y-2">
                                    {SAMPLE_LOGINS.map((s) => (
                                        <div key={s.role}
                                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/4 border border-white/6 hover:border-white/12 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-300">{s.role}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{s.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <CopyButton text={s.email} />
                                                <button
                                                    type="button"
                                                    onClick={() => fill(s.email, s.password)}
                                                    className="text-[11px] px-2 py-0.5 rounded bg-[#f79122]/15 text-[#f79122] hover:bg-[#f79122]/25 font-medium transition-colors border border-[#f79122]/20"
                                                >
                                                    Use
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-600 mt-2.5">Password: <span className="font-mono text-gray-400">password</span></p>
                            </div>

                            <p className="mt-6 text-center text-sm text-gray-500">
                                Don't have an account?{' '}
                                <Link href={route('register')} className="text-[#f79122] hover:text-[#e07a1a] font-semibold">
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 text-center">
                        <p className="text-xs text-gray-600">
                            © {new Date().getFullYear()} RANDA Media. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
