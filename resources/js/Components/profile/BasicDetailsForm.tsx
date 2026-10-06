import { FormEventHandler } from 'react';
import { useForm } from '@inertiajs/react';
import { User, Mail, Phone, Save, Check } from 'lucide-react';
import { Field, inputCls } from './FormField';

interface BasicDetailsFormProps {
    user: { name: string; email: string; phone: string };
}

export default function BasicDetailsForm({ user }: BasicDetailsFormProps) {
    const {
        data,
        setData,
        patch,
        errors,
        processing,
        recentlySuccessful,
    } = useForm({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                    <User size={16} className="text-[#f79122]" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Basic Account Details</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Update your name, email and phone number</p>
                </div>
            </div>

            <form onSubmit={submit} className="px-6 py-5 space-y-5">
                <Field label="Full Name" icon={<User size={15} />} error={errors.name}>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className={inputCls}
                        placeholder="Your full name"
                        required
                    />
                </Field>

                <Field label="Email Address" icon={<Mail size={15} />} error={errors.email}>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className={inputCls}
                        placeholder="your@email.com"
                        required
                    />
                </Field>

                <Field label="Phone Number" icon={<Phone size={15} />} error={errors.phone}>
                    <input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        className={inputCls}
                        placeholder="+254 7XX XXX XXX"
                    />
                </Field>

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
            </form>
        </div>
    );
}
