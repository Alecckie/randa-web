import { useState, FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

function PasswordField({ id, label, value, onChange, error, autoComplete }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; autoComplete?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                </div>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-11 py-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
        </div>
    );
}

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center mb-8">
                        <img src="/assets/logo.png" alt="RANDA" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="h-1 bg-[#f79122]" />

                        <div className="px-8 py-8">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                                    <ShieldCheck size={28} className="text-[#f79122]" />
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Set new password</h1>
                            <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                                Choose a strong password to secure your account.
                            </p>

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Mail size={16} />
                                        </div>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            autoComplete="username"
                                            className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f79122] focus:border-transparent transition"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle size={12} /> {errors.email}
                                        </p>
                                    )}
                                </div>

                                <PasswordField
                                    id="password" label="New password" value={data.password}
                                    onChange={(v) => setData('password', v)}
                                    error={errors.password} autoComplete="new-password"
                                />

                                <PasswordField
                                    id="password_confirmation" label="Confirm new password"
                                    value={data.password_confirmation}
                                    onChange={(v) => setData('password_confirmation', v)}
                                    error={errors.password_confirmation} autoComplete="new-password"
                                />

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] disabled:opacity-60 text-white text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Resetting password…
                                        </>
                                    ) : 'Reset Password'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-xs text-gray-400">
                        © {new Date().getFullYear()} RANDA Media. All rights reserved.
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
