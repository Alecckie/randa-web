import { FormEventHandler, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { Lock, Check, Shield } from 'lucide-react';
import { PasswordField } from './FormField';

export default function ChangePasswordForm() {
    const currentPasswordRef = useRef<HTMLInputElement>(null);
    const newPasswordRef     = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        put,
        errors,
        processing,
        recentlySuccessful,
        reset,
    } = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    newPasswordRef.current?.focus();
                }
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordRef.current?.focus();
                }
            },
        });
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                    <Shield size={16} className="text-[#f79122]" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Use a strong, unique password to keep your account secure</p>
                </div>
            </div>

            <form onSubmit={submit} className="px-6 py-5 space-y-5">
                <PasswordField
                    label="Current Password"
                    icon={<Lock size={15} />}
                    value={data.current_password}
                    onChange={(v) => setData('current_password', v)}
                    error={errors.current_password}
                    autoComplete="current-password"
                    inputRef={currentPasswordRef}
                />

                <PasswordField
                    label="New Password"
                    icon={<Lock size={15} />}
                    value={data.password}
                    onChange={(v) => setData('password', v)}
                    error={errors.password}
                    autoComplete="new-password"
                    inputRef={newPasswordRef}
                />

                <PasswordField
                    label="Confirm New Password"
                    icon={<Lock size={15} />}
                    value={data.password_confirmation}
                    onChange={(v) => setData('password_confirmation', v)}
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                />

                <div className="flex items-center justify-between pt-1">
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                    >
                        <Lock size={15} />
                        {processing ? 'Updating…' : 'Update Password'}
                    </button>

                    {recentlySuccessful && (
                        <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                            <Check size={15} />
                            Password updated!
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
