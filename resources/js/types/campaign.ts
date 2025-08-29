import { Advertiser } from "./advertiser";

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: number;
  advertiser_id: number;
  name: string;
  description?: string | null;
  start_date: string;      
  end_date: string;        
  coverage_areas: string[]; 
  helmet_count: number;
  status:CampaignStatus;
  budget: string;          
  created_at: string;     
  updated_at: string; 
  advertiser:Advertiser
}

export interface CampaignFormData {
    advertiser_id?: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    coverage_areas: string[];
    helmet_count: number;
    budget: number;
    status?: CampaignStatus;
}

export interface CampaignsIndexProps {
    campaigns: {
        data: Campaign[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
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
        user_id?: string;
    };
    advertisers: Advertiser[];
}

export interface CampaignAssignment {
  id: number;
  campaign_id: number;
  rider_id: number;
  helmet_id: number;
  zone_id: number;
  tracking_tag: string;
  assigned_at: string;  
  completed_at?: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}



