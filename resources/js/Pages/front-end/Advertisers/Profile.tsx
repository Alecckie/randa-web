import { FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';
import BasicDetailsForm from '@/Components/profile/BasicDetailsForm';
import ChangePasswordForm from '@/Components/profile/ChangePasswordForm';
import { Field, inputCls } from '@/Components/profile/FormField';
import { Building2, FileText, MapPin, Save, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface Props {
    user: { id: number; name: string; email: string; phone: string; role: string };
    advertiser: {
        id: number;
        company_name: string;
        business_registration: string | null;
        address: string;
        status: 'pending' | 'approved' | 'rejected';
    };
    mustVerifyEmail: boolean;
}

const statusMeta: Record<Props['advertiser']['status'], { label: string; className: string }> = {
    pending:  { label: 'Pending Review', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
    approved: { label: 'Approved',       className: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
    rejected: { label: 'Rejected',       className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
};

function CompanyDetailsForm({ advertiser }: { advertiser: Props['advertiser'] }) {
    const isApproved = advertiser.status === 'approved';

    const { data, setData, put, errors, processing, recentlySuccessful } = useForm({
        company_name:           advertiser.company_name ?? '',
        business_registration:  advertiser.business_registration ?? '',
        address:                advertiser.address ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('advert-dash.profile.update'), { preserveScroll: true });
    };

    const status = statusMeta[advertiser.status];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                        <Building2 size={16} className="text-[#f79122]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Company Details</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your advertiser profile, reviewed by RANDA admins</p>
                    </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                    {status.label}
                </span>
            </div>

            {isApproved && (
                <div className="mx-6 mt-5 flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                    <ShieldCheck size={16} className="flex-shrink-0 mt-0.5 text-gray-400" />
                    Your profile is approved and locked. Contact support if these details need to change.
                </div>
            )}
            {advertiser.status === 'rejected' && (
                <div className="mx-6 mt-5 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    Your application was rejected. Update your details below and resubmit for review.
                </div>
            )}

            <form onSubmit={submit} className="px-6 py-5 space-y-5">
                <Field label="Company Name" icon={<Building2 size={15} />} error={errors.company_name}>
                    <input
                        type="text"
                        value={data.company_name}
                        onChange={(e) => setData('company_name', e.target.value)}
                        className={inputCls}
                        placeholder="Your company name"
                        disabled={isApproved}
                        required
                    />
                </Field>

                <Field label="Business Registration" icon={<FileText size={15} />} error={errors.business_registration}>
                    <input
                        type="text"
                        value={data.business_registration}
                        onChange={(e) => setData('business_registration', e.target.value)}
                        className={inputCls}
                        placeholder="Optional"
                        disabled={isApproved}
                    />
                </Field>

                <Field label="Company Address" icon={<MapPin size={15} />} error={errors.address}>
                    <textarea
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        className={`${inputCls} min-h-[88px] pt-2.5`}
                        placeholder="Physical business address"
                        disabled={isApproved}
                        required
                    />
                </Field>

                {!isApproved && (
                    <div className="flex items-center justify-between pt-1">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#f79122] hover:bg-[#e07a1a] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                        >
                            <Save size={15} />
                            {processing ? 'Saving…' : 'Save Changes'}
                        </button>

                        {recentlySuccessful && (
                            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                                <Check size={15} />
                                Saved!
                            </span>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
}

export default function AdvertiserProfile({ user, advertiser }: Props) {
    return (
        <AdvertiserLayout title="My Profile">
            <Head title="My Profile" />

            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your company details, account information and password
                    </p>
                </div>

                <CompanyDetailsForm advertiser={advertiser} />

                <BasicDetailsForm user={{ name: user.name, email: user.email, phone: user.phone }} />

                <div id="password">
                    <ChangePasswordForm />
                </div>
            </div>
        </AdvertiserLayout>
    );
}
