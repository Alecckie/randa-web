import { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { MailCheck, LogOut, CheckCircle, RefreshCw } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verify Email" />

            <div className="min-h-screen bg-[#1e1d20] flex items-center justify-center px-4 py-12 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 opacity-[0.04]">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#g)" />
                    </svg>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#f79122] opacity-[0.05] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#f79122] opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="RANDA" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-[#f79122] to-[#e07a1a]" />

                        <div className="px-8 py-10 text-center">
                            {/* Icon */}
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                                    <MailCheck size={36} className="text-[#f79122]" />
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-slate-900 mb-3">Verify your email</h1>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                Thanks for signing up! We sent a verification link to your email address.
                                Click the link to activate your account.
                            </p>

                            {/* Success banner */}
                            {status === 'verification-link-sent' && (
                                <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 text-left">
                                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>A new verification link has been sent to your email address.</span>
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#f79122] hover:bg-[#e07a1a] disabled:opacity-60 text-white text-sm font-semibold shadow-lg shadow-orange-400/25 transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={16} />
                                            Resend Verification Email
                                        </>
                                    )}
                                </button>

                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm font-medium transition-colors"
                                >
                                    <LogOut size={15} />
                                    Sign out
                                </Link>
                            </form>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-600">
                        © {new Date().getFullYear()} RANDA Media. All rights reserved.
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
