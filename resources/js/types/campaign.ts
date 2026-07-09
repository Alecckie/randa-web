import { Advertiser } from "./advertiser";

// types/campaign.ts

// Pure operational lifecycle — independent of payment. A campaign may only
// move to 'active' once CampaignPaymentStatus is 'paid'.
export type CampaignStatus =
    | 'draft'
    | 'submitted'
    | 'active'
    | 'paused'
    | 'completed'
    | 'cancelled';

// Payment state for a campaign — separate from campaign lifecycle status.
// STK push success and admin-recorded payments go straight to 'paid';
// only advertiser-submitted receipts pass through 'pending_verification'.
export type CampaignPaymentStatus =
    | 'unpaid'
    | 'pending_verification'
    | 'rejected'
    | 'partially_paid'
    | 'paid';

// UI-local state for the M-Pesa payment modal's own flow — NOT the same
// thing as CampaignPaymentStatus (this is transient client-side state).
export type PaymentFlowState = 'idle' | 'initiating' | 'pending' | 'success' | 'failed' | 'timeout' | 'pending_verification';

export interface Campaign {
    id: number;
    campaign_number?: string;
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
    current_cost?: CampaignCost | null;
    duration_days: number;
    payment_status?: CampaignPaymentStatus;
    total_paid_amount?: number;
    coverage_areas?: CoverageArea[] | string; // Fixed: can be array of objects or string
    advertiser?: Advertiser;
}

export interface CoverageArea {
    id: number;
    name: string;
    full_name?: string;
    area_code?: string;
    county_id?: number;
    sub_county_id?: number;
    ward_id?: number;
    location_path?: string; // Added this as it's used in the component
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
        draft_campaigns: number;
        submitted_campaigns?: number;
        active_campaigns: number;
        paused_campaigns?: number;
        completed_campaigns: number;
        cancelled_campaigns?: number;
        awaiting_payment?: number;
        coverage_areas_count?: number;
    };
    filters: {
        search?: string;
        status?: string;
        user_id?: number;
    };
    advertisers: Array<Advertiser>;
}