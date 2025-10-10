import { Advertiser } from "./advertiser";

// types/campaign.ts - Add this to your existing types file

export type CampaignStatus = 
    | 'draft' 
    | 'pending_payment' 
    | 'paid' 
    | 'active' 
    | 'paused' 
    | 'completed' 
    | 'cancelled';

export interface Campaign {
    id: number;
    advertiser_id: number;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    helmet_count: number;
    need_design: boolean;
    design_file: string | null;
    design_requirements: string | null;
    business_type: string | null;
    require_vat_receipt: boolean;
    agree_to_terms: boolean;
    status: CampaignStatus;
    special_instructions: string | null;
    created_at: string;
    updated_at: string;
    current_cost: CampaignCost;
    duration_days: number;
    payment_status: string;
    total_paid_amount: number;
}

export interface CoverageArea {
    id: number;
    name: string;
    full_name: string;
    area_code: string;
    county_id?: number;
    sub_county_id?: number;
    ward_id?: number;
}

export interface RiderDemographic {
    id: number;
    campaign_id: number;
    age_group: string;
    gender: string;
    rider_type: string;
}

export interface CampaignCost {
    id: number;
    campaign_id: number;
    helmet_count: number;
    duration_days: number;
    helmet_daily_rate: number;
    base_cost: number;
    includes_design: boolean;
    design_cost: number;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total_cost: number;
    status: string;
    version: number;
}

export interface CampaignAssignment {
    id: number;
    campaign_id: number;
    rider_id: number;
    helmet_id: number;
    advertiser_id: number;
    assigned_at: string;
    completed_at: string | null;
    status: 'active' | 'completed' | 'cancelled';
    rider: {
        id: number;
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    helmet: {
        id: number;
        helmet_code: string;
    };
}

export interface Payment {
    id: number;
    campaign_id: number;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
}

export interface CampaignsIndexProps {
    campaigns: {
        data: Campaign[];
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        total: number;
    };
    stats: {
        total_campaigns: number;
        pending_applications: number;
        approved_campaigns: number;
        rejected_applications: number;
    };
    filters: {
        search?: string;
        status?: string;
        user_id?: number;
    };
    advertisers: Array<{
        id: number;
        company_name: string;
        user: {
            id: number;
            name: string;
            email: string;
        };
    }>;
}