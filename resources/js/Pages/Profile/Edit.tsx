import { initials as getInitials } from '@/utils/formatting';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BasicDetailsForm from '@/Components/profile/BasicDetailsForm';
import ChangePasswordForm from '@/Components/profile/ChangePasswordForm';
import type { PageProps } from '@/types';
import { Check, AlertCircle } from 'lucide-react';

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

                <BasicDetailsForm user={{ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' }} />

                <div id="password">
                    <ChangePasswordForm />
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
