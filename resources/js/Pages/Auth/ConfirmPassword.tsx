import { useState, FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Eye, EyeOff, Lock, AlertCircle, ShieldAlert } from 'lucide-react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="min-h-screen bg-[#111114] flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.045]">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#g)" />
                    </svg>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#f79122] opacity-[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#f79122] opacity-[0.04] rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative z-10 w-full max-w-md">
                    <div className="flex items-center justify-center mb-8">
                        <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="RANDA" className="h-10 w-auto" />
                    </div>

                    <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-[#f79122] to-[#e07a1a]" />

                        <div className="px-8 py-8">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-[#f79122]/10 border border-[#f79122]/20 flex items-center justify-center">
                                    <ShieldAlert size={28} className="text-[#f79122]" />
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-white text-center mb-2">Confirm your password</h1>
                            <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">
                                This is a secure area. Please re-enter your password to continue.
                            </p>

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            autoFocus
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

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] disabled:opacity-60 text-white text-sm font-semibold shadow-lg shadow-[#f79122]/20 transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Confirming…
                                        </>
                                    ) : 'Confirm Password'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-xs text-gray-600">
                        © {new Date().getFullYear()} RANDA Media. All rights reserved.
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
