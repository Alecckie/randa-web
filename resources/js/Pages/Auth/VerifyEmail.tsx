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

            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <img src="/assets/logo.png" alt="RANDA" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                        <div className="h-1.5 bg-[#f79122]" />

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
