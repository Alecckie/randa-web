import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
  status,
  canResetPassword,
}: {
  status?: string;
  canResetPassword: boolean;
}) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false as boolean,
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();

    post(route('login'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <GuestLayout>
      <Head title="Log in" />
      
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
                  <span className="text-slate-300">Targeted zone campaigns</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-slate-300">Premium helmet branding</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-slate-300">Real-time analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 bg-white relative">
          {/* Registration Link - Top Right */}
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 lg:hidden">
            <Link
              href={route('register')}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200 shadow-sm"
            >
              Create account
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
                Welcome back
              </h2>
              <p className="text-slate-600">
                Sign in to your account to continue
              </p>
            </div>

            {/* Status Message */}
            {status && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-sm font-medium text-green-800 rounded-lg">
                {status}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={submit} className="space-y-6">
              <div>
                <InputLabel htmlFor="email" value="Email" />
                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                  autoComplete="username"
                  isFocused={true}
                  onChange={(e) => setData('email', e.target.value)}
                />
                <InputError message={errors.email} className="mt-2" />
              </div>

              <div className="mt-4">
                <InputLabel htmlFor="password" value="Password" />
                <TextInput
                  id="password"
                  type="password"
                  name="password"
                  value={data.password}
                  className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                  autoComplete="current-password"
                  onChange={(e) => setData('password', e.target.value)}
                />
                <InputError message={errors.password} className="mt-2" />
              </div>

              <div className="mt-4 block">
                <label className="flex items-center">
                  <Checkbox
                    name="remember"
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                  />
                  <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">
                    Remember me
                  </span>
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end">
                {canResetPassword && (
                  <Link
                    href={route('password.request')}
                    className="rounded-md text-sm text-orange-600 underline hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  >
                    Forgot your password?
                  </Link>
                )}

                <PrimaryButton 
                  className="ms-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                  disabled={processing}
                >
                  {processing ? 'Signing in...' : 'Log in'}
                </PrimaryButton>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <Link
                  href={route('register')}
                  className="text-purple-600 hover:text-purple-500 font-medium transition-colors duration-200"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}