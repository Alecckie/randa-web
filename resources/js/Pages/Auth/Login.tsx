import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

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

    return (
        <GuestLayout>
            <Head title="Sign In" />
            <div className="min-h-screen flex bg-white">

                {/* ── Left branding panel ── */}
                <div className="hidden lg:flex lg:w-[42%] bg-slate-50 flex-col justify-between p-12 xl:p-16 border-r border-gray-200">
                    <div>
                        <img src="/assets/logo.png" alt="RANDA" className="h-12 w-auto" />
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-slate-800 leading-tight tracking-tight">
                                Helmet Advertising,<br />
                                <span className="text-[#f79122]">Reimagined.</span>
                            </h1>
                            <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-sm">
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
                <div className="flex-1 flex flex-col bg-white">
                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                        <Link href={route('register')}
                            className="text-sm font-medium text-gray-500 hover:text-[#f79122] transition-colors">
                            No account?{' '}
                            <span className="text-[#f79122] font-semibold">Register</span>
                        </Link>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-20">
                        <div className="w-full max-w-md">
                            {/* Mobile logo */}
                            <div className="lg:hidden mb-10">
                                <img src="/assets/logo.png" alt="RANDA" className="h-9 w-auto" />
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
                                <p className="mt-2 text-gray-500 text-sm">Sign in to your account to continue</p>
                            </div>

                            {status && (
                                <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                                    <CheckCircle size={16} className="flex-shrink-0" />
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                                            className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle size={12} /> {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
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
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full pl-10 pr-11 py-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle size={12} /> {errors.password}
                                        </p>
                                    )}
                                </div>

                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 bg-white text-[#f79122] focus:ring-[#f79122] cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-600">Keep me signed in</span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] disabled:opacity-60 text-white text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
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

                            <p className="mt-6 text-center text-sm text-gray-500">
                                Don't have an account?{' '}
                                <Link href={route('register')} className="text-[#f79122] hover:text-[#e07a1a] font-semibold">
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="px-6 pb-6 text-center">
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} RANDA Media. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
