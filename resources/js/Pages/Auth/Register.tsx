import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import {
    TextInput,
    PasswordInput,
    Button,
    Container,
    Paper,
    Title,
    Text,
    Group,
    Box,
    Image,
    Anchor,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
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
            
            <div className="min-h-screen flex">
                {/* Left Panel - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center px-8 lg:px-12 xl:px-16">
                        <div className="max-w-md">
                            {/* Logo/Brand Area */}
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                    <span className="text-2xl font-bold text-white">R</span>
                                </div>
                                <h1 className="text-4xl font-bold text-white mb-2">
                                    <span className="text-white">Randa</span>
                                </h1>
                                <p className="text-slate-300 text-lg font-medium">
                                    Motorbike Helmet Advertising Platform
                                </p>
                            </div>
                            
                            {/* Features */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <span className="text-slate-300">Launch campaigns instantly</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <span className="text-slate-300">Connect with riders nationwide</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <span className="text-slate-300">Track performance metrics</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <span className="text-slate-300">Maximize brand exposure</span>
                                </div>
                            </div>
                            
                            {/* Call to Action */}
                            <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                <h3 className="text-xl font-semibold text-white mb-2">Ready to get started?</h3>
                                <p className="text-slate-300 text-sm">Join thousands of brands already advertising through helmet campaigns.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Registration Form */}
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 bg-white relative">
                    {/* Login Link - Top Right */}
                    <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200 shadow-sm"
                        >
                            Sign in
                        </Link>
                    </div>

                    <div className="w-full max-w-md mx-auto">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                                <span className="text-lg font-bold text-white">R</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Randa</h2>
                        </div>

                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">
                                Create your account
                            </h2>
                            <p className="text-slate-600">
                                Join the future of motorbike advertising
                            </p>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="text-slate-700 font-medium mb-2 block">
                                    Full Name
                                </label>
                                <TextInput
                                    id="name"
                                    placeholder="Enter your full name"
                                    required
                                    value={data.name}
                                    onChange={(event) => setData('name', event.currentTarget.value)}
                                    error={errors.name}
                                    autoComplete="name"
                                    className="w-full"
                                    styles={{
                                        input: {
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            '&:focus': {
                                                borderColor: '#8b5cf6',
                                                boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
                                            },
                                        },
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="text-slate-700 font-medium mb-2 block">
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
                                    className="w-full"
                                    styles={{
                                        input: {
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            '&:focus': {
                                                borderColor: '#8b5cf6',
                                                boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
                                            },
                                        },
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="text-slate-700 font-medium mb-2 block">
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
                                    className="w-full"
                                    styles={{
                                        input: {
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            '&:focus': {
                                                borderColor: '#8b5cf6',
                                                boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
                                            },
                                        },
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="password_confirmation" className="text-slate-700 font-medium mb-2 block">
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
                                    className="w-full"
                                    styles={{
                                        input: {
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            '&:focus': {
                                                borderColor: '#8b5cf6',
                                                boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
                                            },
                                        },
                                    }}
                                />
                            </div>

                            {/* Terms and Conditions */}
                            <div className="text-sm text-slate-600">
                                By creating an account, you agree to our{' '}
                                <a href="#" className="text-purple-600 hover:text-purple-500 font-medium">
                                    Terms of Service
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-purple-600 hover:text-purple-500 font-medium">
                                    Privacy Policy
                                </a>
                            </div>

                            {/* Submit Button */}
                            <Button 
                                type="submit"
                                disabled={processing}
                                className="w-full"
                                styles={{
                                    root: {
                                        background: 'linear-gradient(to right, #8b5cf6, #2563eb)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '12px 24px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        height: '48px',
                                        '&:hover': {
                                            background: 'linear-gradient(to right, #7c3aed, #1d4ed8)',
                                            transform: 'translateY(-1px)',
                                        },
                                        '&:disabled': {
                                            opacity: 0.5,
                                            cursor: 'not-allowed',
                                            transform: 'none',
                                        },
                                    },
                                }}
                            >
                                {processing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating account...
                                    </div>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-slate-500">
                                Already have an account?{' '}
                                <Link
                                    href={route('login')}
                                    className="text-purple-600 hover:text-purple-500 font-medium transition-colors duration-200"
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