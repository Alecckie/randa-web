import type { User } from ".";

export interface Advertiser {
    id: number;
    user_id: number;
    company_name: string;
    business_registration?: string;
    address: string;
    contact_person: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    user?: User;
}

export interface AdvertiserFormData {
    user_id?: number;
    company_name: string;
    business_registration?: string;
    address: string;
    contact_person: string;
    email?: string;
    phone?: string;
}

export interface AdvertisersIndexProps {
    advertisers: {
        data: Advertiser[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    stats: {
        total_advertisers: number;
        pending_applications: number;
        approved_advertisers: number;
        rejected_applications: number;
    };
    filters: {
        search?: string;
        status?: string;
        user_id?: string;
    };
    users: User[];
}

export interface AdvertiserCreateProps {
    users: User[];
}