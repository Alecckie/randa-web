// types/index.ts

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'rider' | 'advertiser';
    phone?: string;
    is_active: boolean;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface RandaUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'rider' | 'advertiser';
    phone?: string;
    is_active: boolean;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
}

export interface AuthProps {
    user: User;
}

export interface PageProps {
    auth: AuthProps;
    [key: string]: any;
}

export interface NavigationItem {
    name: string;
    href: string;
    icon: string;
}

export interface StatCard {
    name: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: string;
}

export interface Activity {
    id: number;
    action: string;
    user: string;
    time: string;
    type: 'approval' | 'campaign' | 'payment' | 'system';
}

export interface Campaign {
    id: number;
    name: string;
    status: 'Active' | 'Paused' | 'Completed' | 'Draft';
    impressions: string;
    scans: number;
    budget: string;
}

export interface CurrentCampaign {
    name: string;
    creative: string;
    zone: string;
    duration: string;
}

export interface Transaction {
    id: number;
    desc: string;
    amount: string;
    date: string;
    type: 'earning' | 'withdrawal' | 'bonus' | 'deduction';
}

export interface DashboardData {
    admin: {
        stats: StatCard[];
        recentActivity: Activity[];
    };
    rider: {
        stats: StatCard[];
        currentCampaign: CurrentCampaign;
    };
    advertiser: {
        stats: StatCard[];
        campaigns: Campaign[];
    };
}

// Component Props Interfaces
export interface DropdownProps {
    children: React.ReactNode;
}

export interface DropdownTriggerProps {
    children: React.ReactNode;
}

export interface DropdownContentProps {
    children: React.ReactNode;
}

export interface DropdownLinkProps {
    href: string;
    children: React.ReactNode;
    method?: 'get' | 'post' | 'put' | 'delete';
    as?: 'a' | 'button';
}

export interface ApplicationLogoProps {
    className?: string;
}

export interface AuthenticatedLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
}

// Ziggy route helper types
export interface ZiggyConfig {
    url: string;
    port: number | null;
    defaults: Record<string, any>;
    routes: Record<string, any>;
}

// Inertia Props
export interface InertiaPageProps {
    auth: AuthProps;
    ziggy: ZiggyConfig;
    [key: string]: any;
}