import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import {
    TextInput,
    PasswordInput,
    Button,
    Radio,
    Group,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        role: 'advertiser',
    });

    const isMobile = useMediaQuery('(max-width: 768px)');

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="min-h-screen flex bg-slate-50">
                {/* Left Panel - Enhanced Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3b3a3e] via-[#2a2929] to-[#3b3a3e] relative overflow-hidden">
                    {/* Subtle Pattern Overlay */}
                    <div className="absolute inset-0 opacity-5">
                        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center px-8 lg:px-12 xl:px-16">
                        <div className="max-w-lg">
                            {/* Logo/Brand Area */}
                            <div className="mb-12">
                                <img src="/assets/randa_white_logo_landscape-01-01-01-01.png" alt="Randa Logo" className="h-20  w-auto" />

                                <p className="text-slate-300 text-xl font-light leading-relaxed">
                                    Revolutionary motorbike helmet advertising platform connecting brands with riders
                                </p>
                            </div>

                            {/* Enhanced Features */}
                            <div className="space-y-6 mb-12">
                                {[
                                    { icon: "🚀", text: "Launch targeted campaigns in minutes" },
                                    { icon: "🏍️", text: "Connect with verified riders nationwide" },
                                    { icon: "📊", text: "Real-time analytics and performance tracking" },
                                    { icon: "💡", text: "Innovative helmet advertising technology" }
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-4 group">
                                        <div className="text-2xl">{feature.icon}</div>
                                        <span className="text-slate-300 font-medium group-hover:text-white transition-colors duration-300">
                                            {feature.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Stats or Social Proof */}
                            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-700">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">500+</div>
                                    <div className="text-slate-400 text-sm">Active Brands</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">10K+</div>
                                    <div className="text-slate-400 text-sm">Registered Riders</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">98%</div>
                                    <div className="text-slate-400 text-sm">Satisfaction Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Enhanced Registration Form */}
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 bg-white relative">
                    {/* Login Link - Top Right */}
                    <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center px-6 py-2.5 border border-slate-200 rounded-full text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            Sign in
                        </Link>
                    </div>

                    <div className="w-full max-w-lg mx-auto">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-16 h-16 bg-[#f79122] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/25">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Randa</h2>
                        </div>

                        {/* Header */}
                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
                                Join Randa
                            </h2>
                            <p className="text-slate-600 text-lg">
                                Create your account and start your journey with us
                            </p>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={submit} className="space-y-8">
                            {/* User Type Selection */}
                            <div className="space-y-4">
                                <label className="text-slate-800 font-semibold text-lg block">
                                    I want to join as:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className={`
                                        flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                        ${data.role === 'advertiser'
                                            ? 'border-[#f79122] bg-orange-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                        }
                                    `}>
                                        <Radio
                                            value="advertiser"
                                            checked={data.role === 'advertiser'}
                                            onChange={(event) => setData('role', event.currentTarget.value)}
                                            styles={{
                                                radio: {
                                                    '&:checked': {
                                                        backgroundColor: '#f79122',
                                                        borderColor: '#f79122',
                                                    },
                                                },
                                            }}

                                        />
                                        <div className="ml-4">
                                            <div className="font-semibold text-slate-900 text-lg">Advertiser</div>
                                            <div className="text-slate-600 text-sm mt-1">
                                                Promote your brand through helmet campaigns
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`
                                        flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                        ${data.role === 'rider'
                                            ? 'border-[#3b3a3e] bg-slate-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                        }
                                    `}>
                                        <Radio
                                            value="rider"
                                            checked={data.role === 'rider'}
                                            onChange={(event) => setData('role', event.currentTarget.value)}
                                            styles={{
                                                radio: {
                                                    '&:checked': {
                                                        backgroundColor: '#3b3a3e',
                                                        borderColor: '#3b3a3e',
                                                    },
                                                },
                                            }}
                                        />
                                        <div className="ml-4">
                                            <div className="font-semibold text-slate-900 text-lg">Rider</div>
                                            <div className="text-slate-600 text-sm mt-1">
                                                Earn money by displaying ads on your helmet
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="sm:col-span-2">
                                    <label htmlFor="name" className="text-slate-800 font-semibold mb-3 block">
                                        {data.role === 'advertiser' ? 'Company Name' : 'First Name'}
                                    </label>
                                    <TextInput
                                        id="name"
                                        required
                                        value={data.first_name}
                                        onChange={(event) => setData('first_name', event.currentTarget.value)}
                                        error={errors.first_name}
                                        autoComplete="first_name"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="name" className="text-slate-800 font-semibold mb-3 block">
                                        {data.role === 'advertiser' ? 'Contact Person' : 'Last Name'}
                                    </label>
                                    <TextInput
                                        id="name"
                                        required
                                        value={data.last_name}
                                        onChange={(event) => setData('last_name', event.currentTarget.value)}
                                        error={errors.last_name}
                                        autoComplete="last_name"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="email" className="text-slate-800 font-semibold mb-3 block">
                                        Email Address
                                    </label>
                                    <TextInput
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email address"
                                        required
                                        value={data.email}
                                        onChange={(event) => setData('email', event.currentTarget.value)}
                                        error={errors.email}
                                        autoComplete="username"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="email" className="text-slate-800 font-semibold mb-3 block">
                                        Phone Number
                                    </label>
                                    <TextInput
                                        type="text"
                                        placeholder="Enter your phone no"
                                        required
                                        value={data.phone}
                                        onChange={(event) => setData('phone', event.currentTarget.value)}
                                        error={errors.phone}
                                        autoComplete="username"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="text-slate-800 font-semibold mb-3 block">
                                        Password
                                    </label>
                                    <PasswordInput
                                        id="password"
                                        placeholder="Create a strong password"
                                        required
                                        value={data.password}
                                        onChange={(event) => setData('password', event.currentTarget.value)}
                                        error={errors.password}
                                        autoComplete="new-password"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password_confirmation" className="text-slate-800 font-semibold mb-3 block">
                                        Confirm Password
                                    </label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        placeholder="Confirm your password"
                                        required
                                        value={data.password_confirmation}
                                        onChange={(event) => setData('password_confirmation', event.currentTarget.value)}
                                        error={errors.password_confirmation}
                                        autoComplete="new-password"
                                        size="lg"
                                        styles={{
                                            input: {
                                                padding: '16px 20px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: '500',
                                                backgroundColor: '#fafafa',
                                                '&:focus': {
                                                    borderColor: data.role === 'rider' ? '#3b3a3e' : '#f79122',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: `0 0 0 3px ${data.role === 'rider' ? 'rgba(59, 58, 62, 0.1)' : 'rgba(247, 145, 34, 0.1)'}`,
                                                },
                                                '&::placeholder': {
                                                    color: '#94a3b8',
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Terms and Conditions */}
                            <div className="text-center sm:text-left">
                                <p className="text-slate-600 leading-relaxed">
                                    By creating an account, you agree to our{' '}
                                    <a href="#" className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2">
                                        Terms of Service
                                    </a>{' '}
                                    and{' '}
                                    <a href="#" className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2">
                                        Privacy Policy
                                    </a>
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={processing}
                                size="xl"
                                styles={{
                                    root: {
                                        background: data.role === 'rider'
                                            ? '#3b3a3e'
                                            : '#f79122',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '16px 32px',
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        height: '56px',
                                        width: '100%',
                                        boxShadow: data.role === 'rider'
                                            ? '0 10px 25px -5px rgba(59, 58, 62, 0.3)'
                                            : '0 10px 25px -5px rgba(247, 145, 34, 0.3)',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover:not(:disabled)': {
                                            background: data.role === 'rider'
                                                ? '#2a2929'
                                                : '#e07d15',
                                            transform: 'translateY(-2px)',
                                            boxShadow: data.role === 'rider'
                                                ? '0 15px 35px -5px rgba(59, 58, 62, 0.4)'
                                                : '0 15px 35px -5px rgba(247, 145, 34, 0.4)',
                                        },
                                        '&:disabled': {
                                            opacity: 0.6,
                                            cursor: 'not-allowed',
                                            transform: 'none',
                                        },
                                    },
                                }}
                            >
                                {processing ? (
                                    <div className="flex items-center justify-center space-x-3">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating account...</span>
                                    </div>
                                ) : (
                                    `Create ${data.role === 'rider' ? 'Rider' : 'Advertiser'} Account`
                                )}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="mt-10 text-center">
                            <p className="text-slate-500">
                                Already have an account?{' '}
                                <Link
                                    href={route('login')}
                                    className="text-[#f79122] hover:text-[#e07d15] font-semibold underline decoration-2 underline-offset-2 transition-colors duration-200"
                                >
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}