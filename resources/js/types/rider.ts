import type { User, PageProps } from ".";
import type { CampaignAssignment } from "./campaign";
import type { Payment } from "./payment";

export interface Rider {
    id: number;
    user_id: number;
    national_id: string;
    national_id_front_photo: string;
    national_id_back_photo: string;
    passport_photo: string;
    good_conduct_certificate: string;
    motorbike_license: string;
    motorbike_registration: string;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    signed_agreement: string;
    status: 'pending' | 'approved' | 'rejected';
    daily_rate: string;
    wallet_balance: string;
    created_at: string;
    updated_at: string;
    
    user?: User;
    current_assignment?: CampaignAssignment;
    campaign_assignments?: CampaignAssignment[];
    check_ins?: RiderCheckIn[];
    payments?: Payment[];
}

export interface RiderFormData {
    user_id?: number; 
    firstname: string; 
    lastname: string; 
    email: string; 
    phone: string; 
    national_id: string;
    national_id_front_photo: File | null;
    national_id_back_photo: File | null;
    passport_photo: File | null;
    good_conduct_certificate: File | null;
    motorbike_license: File | null;
    motorbike_registration: File | null;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    signed_agreement: string;
    daily_rate: number; 
}

export interface RiderStats {
    total_riders: number;
    pending_applications: number;
    approved_riders: number;
    rejected_applications: number;
    active_riders: number;
    total_earnings_paid: string;
    average_daily_rate: string;
}

export interface RiderFilters {
    status?: 'pending' | 'approved' | 'rejected' | '';
    search?: string;
    user_id?: number;
    date_from?: string;
    date_to?: string;
    daily_rate_min?: number;
    daily_rate_max?: number;
}

export interface RidersIndexProps extends PageProps {
    riders: {
        data: Rider[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    stats: RiderStats;
    filters: RiderFilters;
    users: User[];
}

export interface RiderCreateProps extends PageProps {
    users: User[];
}


export interface RiderCheckIn {
    id: number;
    rider_id: number;
    check_in_time: string;
    check_out_time?: string;
    location_lat: number;
    location_lng: number;
    notes?: string;
}

