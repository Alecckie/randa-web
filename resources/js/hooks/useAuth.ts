import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'rider' | 'advertiser';
    first_name?: string;
    last_name?: string;
    phone?: string;
    is_active: boolean;
}



export function useAuth() {
    const { auth } = usePage<PageProps>().props;
    
    const user = auth?.user;
    
    const isAdmin = () => user?.role === 'admin';
    const isRider = () => user?.role === 'rider';
    const isAdvertiser = () => user?.role === 'advertiser';
    const hasRole = (role: 'admin' | 'rider' | 'advertiser') => user?.role === role;
    const hasAnyRole = (roles: ('admin' | 'rider' | 'advertiser')[]) => 
        roles.includes(user?.role);
    
    return {
        user,
        isAdmin,
        isRider,
        isAdvertiser,
        hasRole,
        hasAnyRole
    };
}