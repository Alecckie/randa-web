import axios from 'axios';
import type { 
    LiveTrackingData, 
    RiderTrackingData, 
    TrackingStats,
    RiderListItem,
    TrackingFilters 
} from '@/types/tracking';

class TrackingService {
    /**
     * Get live tracking data for all active riders
     */
    async getLiveTracking(filters: Partial<TrackingFilters> = {}): Promise<LiveTrackingData> {
        const params = new URLSearchParams();
        
        if (filters.campaign_id) {
            params.append('campaign_id', filters.campaign_id.toString());
        }
        
        if (filters.rider_ids && filters.rider_ids.length > 0) {
            filters.rider_ids.forEach(id => params.append('rider_ids[]', id.toString()));
        }
        
        const response = await axios.get('/admin/tracking/live', { params });
        return response.data.data;
    }

    /**
     * Get tracking data for a specific rider
     */
    async getRiderTracking(riderId: number, date?: string): Promise<RiderTrackingData> {
        const params = date ? { date } : {};
        const response = await axios.get(`/admin/tracking/rider/${riderId}`, { params });
        return response.data.data;
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(period: 'today' | 'week' | 'month' = 'today'): Promise<TrackingStats> {
        const response = await axios.get('/admin/tracking/dashboard-stats', {
            params: { period }
        });
        return response.data.data;
    }

    /**
     * Get list of riders with tracking status
     */
    async getRidersList(filters: {
        status?: 'active' | 'inactive' | 'all';
        campaign_id?: number;
        search?: string;
        per_page?: number;
    } = {}): Promise<{ data: RiderListItem[]; pagination: any }> {
        const response = await axios.get('/admin/tracking/riders', { params: filters });
        return {
            data: response.data.data,
            pagination: response.data.pagination
        };
    }

    /**
     * Get campaign tracking data
     */
    async getCampaignTracking(campaignId: number, options: {
        date?: string;
        live?: boolean;
    } = {}): Promise<any> {
        const response = await axios.get(`/admin/tracking/campaign/${campaignId}`, {
            params: options
        });
        return response.data.data;
    }

    /**
     * Get route details by route ID
     */
    async getRouteDetails(routeId: number): Promise<any> {
        const response = await axios.get(`/admin/tracking/routes/${routeId}`);
        return response.data.data;
    }

    /**
     * Get heatmap data for coverage visualization
     */
    async getHeatmapData(filters: {
        campaign_id?: number;
        date_from?: string;
        date_to?: string;
        county_id?: number;
        intensity_threshold?: number;
    } = {}): Promise<any> {
        const response = await axios.get('/admin/tracking/heatmap', { params: filters });
        return response.data.data;
    }

    /**
     * Export tracking data
     */
    async exportTrackingData(filters: {
        format: 'csv' | 'json' | 'excel';
        date_from: string;
        date_to: string;
        campaign_id?: number;
        rider_ids?: number[];
    }): Promise<any> {
        const response = await axios.post('/admin/tracking/export', filters);
        return response.data;
    }
}

export default new TrackingService();