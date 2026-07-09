import { useState, FormEventHandler, useRef } from 'react';
import { initials as getInitials } from '@/utils/formatting';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import {
    User,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    Save,
    Shield,
} from 'lucide-react';

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
    label,
    icon,
    error,
    children,
}: {
    label: string;
    icon: React.ReactNode;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                {children}
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
}

const inputCls =
    'block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f79122] focus:border-transparent outline-none transition';

// ── Password field with toggle ─────────────────────────────────────────────

function PasswordField({
    label,
    icon,
    value,
    onChange,
    error,
    autoComplete,
    inputRef,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    autoComplete?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                <input
                    ref={inputRef}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    className={`${inputCls} pr-10`}
                />
                <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
    return (
        <div className="w-20 h-20 rounded-2xl bg-[#f79122] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">{getInitials(name)}</span>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfileEdit({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user as any;

    // -- Profile form --
    const {
        data: profile,
        setData: setProfile,
        patch: patchProfile,
        errors: profileErrors,
        processing: profileProcessing,
        recentlySuccessful: profileSaved,
        reset: resetProfile,
    } = useForm<{ name: string; email: string; phone: string }>({
        name:  user?.name  ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
    });

    const submitProfile: FormEventHandler = (e) => {
        e.preventDefault();
        patchProfile(route('profile.update'), { preserveScroll: true });
    };

    // -- Password form --
    const currentPasswordRef = useRef<HTMLInputElement>(null);
    const newPasswordRef     = useRef<HTMLInputElement>(null);

    const {
        data: pwd,
        setData: setPwd,
        put: putPwd,
        errors: pwdErrors,
        processing: pwdProcessing,
        recentlySuccessful: pwdSaved,
        reset: resetPwd,
    } = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        putPwd(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => resetPwd(),
            onError: (errs) => {
                if (errs.password) {
                    resetPwd('password', 'password_confirmation');
                    newPasswordRef.current?.focus();
                }
                if (errs.current_password) {
                    resetPwd('current_password');
                    currentPasswordRef.current?.focus();
                }
            },
        });
    };

    const roleLabel: Record<string, string> = {
        admin: 'Administrator', advertiser: 'Advertiser', rider: 'Rider',
    };

    return (
        <AuthenticatedLayout header="My Profile">
            <Head title="My Profile" />

            <div className="max-w-3xl mx-auto space-y-6">

                {/* ── Profile hero card ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Gradient banner */}
                    <div className="h-24 bg-[#f79122]" />

                    <div className="px-6 pb-6">
                        {/* Avatar overlaps banner */}
                        <div className="flex items-end gap-4 -mt-10 mb-4">
                            <Avatar name={user?.name ?? 'U'} />
                            <div className="pb-1">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {user?.name}
                                </h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
                                    <span className="text-[10px] font-medium bg-[#f79122]/15 text-[#c26d0a] dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full capitalize">
                                        {roleLabel[user?.role] ?? user?.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Success / verification banners */}
                        {status === 'profile-updated' && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 mb-4">
                                <Check size={16} className="flex-shrink-0" />
                                Profile updated successfully.
                            </div>
                        )}
                        {mustVerifyEmail && !user?.email_verified_at && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 mb-4">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                Your email address is unverified.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Profile Information ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                            <User size={16} className="text-[#f79122]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Update your name, email and phone number</p>
                        </div>
                    </div>

                    <form onSubmit={submitProfile} className="px-6 py-5 space-y-5">
                        <Field label="Full Name" icon={<User size={15} />} error={profileErrors.name}>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile('name', e.target.value)}
                                className={inputCls}
                                placeholder="Your full name"
                                required
                            />
                        </Field>

                        <Field label="Email Address" icon={<Mail size={15} />} error={profileErrors.email}>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile('email', e.target.value)}
                                className={inputCls}
                                placeholder="your@email.com"
                                required
                            />
                        </Field>

                        <Field label="Phone Number" icon={<Phone size={15} />} error={profileErrors.phone}>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile('phone', e.target.value)}
                                className={inputCls}
                                placeholder="+254 7XX XXX XXX"
                            />
                        </Field>

                        <div className="flex items-center justify-between pt-1">
                            <button
                                type="submit"
                                disabled={profileProcessing}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#f79122] hover:bg-[#e07a1a] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                            >
                                <Save size={15} />
                                {profileProcessing ? 'Saving…' : 'Save Changes'}
                            </button>

                            {profileSaved && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                                    <Check size={15} />
                                    Saved!
                                </span>
                            )}
                        </div>
                    </form>
                </div>

                {/* ── Change Password ── */}
                <div
                    id="password"
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                            <Shield size={16} className="text-[#f79122]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Use a strong, unique password to keep your account secure</p>
                        </div>
                    </div>

                    <form onSubmit={submitPassword} className="px-6 py-5 space-y-5">
                        <PasswordField
                            label="Current Password"
                            icon={<Lock size={15} />}
                            value={pwd.current_password}
                            onChange={(v) => setPwd('current_password', v)}
                            error={pwdErrors.current_password}
                            autoComplete="current-password"
                            inputRef={currentPasswordRef}
                        />

                        <PasswordField
                            label="New Password"
                            icon={<Lock size={15} />}
                            value={pwd.password}
                            onChange={(v) => setPwd('password', v)}
                            error={pwdErrors.password}
                            autoComplete="new-password"
                            inputRef={newPasswordRef}
                        />

                        <PasswordField
                            label="Confirm New Password"
                            icon={<Lock size={15} />}
                            value={pwd.password_confirmation}
                            onChange={(v) => setPwd('password_confirmation', v)}
                            error={pwdErrors.password_confirmation}
                            autoComplete="new-password"
                        />

                        <div className="flex items-center justify-between pt-1">
                            <button
                                type="submit"
                                disabled={pwdProcessing}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                            >
                                <Lock size={15} />
                                {pwdProcessing ? 'Updating…' : 'Update Password'}
                            </button>

                            {pwdSaved && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                                    <Check size={15} />
                                    Password updated!
                                </span>
                            )}
                        </div>
                    </form>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
