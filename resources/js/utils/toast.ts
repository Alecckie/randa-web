import { notifications } from '@mantine/notifications';
import { createElement } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
    title?: string;
    autoClose?: number;
}

export function showSuccessToast(message: string, options: ToastOptions = {}) {
    notifications.show({
        title: options.title ?? 'Success',
        message,
        color: 'green',
        icon: createElement(CheckCircle2, { size: 18 }),
        autoClose: options.autoClose ?? 5000,
    });
}

export function showErrorToast(message: string, options: ToastOptions = {}) {
    notifications.show({
        title: options.title ?? 'Error',
        message,
        color: 'red',
        icon: createElement(XCircle, { size: 18 }),
        autoClose: options.autoClose ?? 6000,
    });
}

export function showWarningToast(message: string, options: ToastOptions = {}) {
    notifications.show({
        title: options.title ?? 'Warning',
        message,
        color: 'yellow',
        icon: createElement(AlertTriangle, { size: 18 }),
        autoClose: options.autoClose ?? 5000,
    });
}

export function showInfoToast(message: string, options: ToastOptions = {}) {
    notifications.show({
        title: options.title ?? 'Info',
        message,
        color: 'blue',
        icon: createElement(Info, { size: 18 }),
        autoClose: options.autoClose ?? 5000,
    });
}
