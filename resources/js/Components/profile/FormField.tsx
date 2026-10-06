import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export const inputCls =
    'block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f79122] focus:border-transparent outline-none transition';

export function Field({
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

export function PasswordField({
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
