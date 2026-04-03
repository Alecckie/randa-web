import axios from 'axios';
import type {
    LiveTrackingData,
    RiderTrackingData,
    TrackingStats,
    RiderListItem,
    TrackingFilters,
} from '@/types/tracking';

/**
 * All admin tracking API calls.
 *
 * Base URL is /admin/tracking — make sure your Laravel routes are
 * registered under that prefix in routes/api.php.
 */
class TrackingService {
    private readonly base = '/admin/tracking';

    // ── Live tracking ─────────────────────────────────────────────────────────

    async getLiveTracking(
        filters: Partial<TrackingFilters> = {}
    ): Promise<LiveTrackingData> {
        const params = new URLSearchParams();

        if (filters.campaign_id) {
            params.append('campaign_id', filters.campaign_id.toString());
        }

        if (filters.rider_ids && filters.rider_ids.length > 0) {
            filters.rider_ids.forEach((id) =>
                params.append('rider_ids[]', id.toString())
            );
        }

        const response = await axios.get(`${this.base}/live`, { params });
        return response.data.data as LiveTrackingData;
    }

    // ── Rider tracking ────────────────────────────────────────────────────────

    async getRiderTracking(
        riderId: number,
        date?: string
    ): Promise<RiderTrackingData> {
        const params = date ? { date } : {};
        const response = await axios.get(`${this.base}/rider/${riderId}`, {
            params,
        });
        return response.data.data as RiderTrackingData;
    }

    // ── Dashboard stats ───────────────────────────────────────────────────────

    async getDashboardStats(
        period: 'today' | 'week' | 'month' = 'today'
    ): Promise<TrackingStats> {
        const response = await axios.get(`${this.base}/dashboard-stats`, {
            params: { period },
        });
        return response.data.data as TrackingStats;
    }

    // ── Riders list ───────────────────────────────────────────────────────────

    async getRidersList(
        filters: {
            status?: 'active' | 'inactive' | 'all';
            campaign_id?: number;
            search?: string;
            per_page?: number;
        } = {}
    ): Promise<{ data: RiderListItem[]; pagination: unknown }> {
        const response = await axios.get(`${this.base}/riders`, {
            params: filters,
        });
        return {
            data: response.data.data as RiderListItem[],
            pagination: response.data.pagination,
        };
    }

    // ── Campaign tracking ─────────────────────────────────────────────────────

    async getCampaignTracking(
        campaignId: number,
        options: { date?: string; live?: boolean } = {}
    ): Promise<unknown> {
        const response = await axios.get(
            `${this.base}/campaign/${campaignId}`,
            { params: options }
        );
        return response.data.data;
    }

    // ── Route details ─────────────────────────────────────────────────────────

    async getRouteDetails(routeId: number): Promise<unknown> {
        const response = await axios.get(`${this.base}/routes/${routeId}`);
        return response.data.data;
    }

    // ── Heatmap ───────────────────────────────────────────────────────────────

    async getHeatmapData(
        filters: {
            campaign_id?: number;
            date_from?: string;
            date_to?: string;
            county_id?: number;
            intensity_threshold?: number;
        } = {}
    ): Promise<unknown> {
        const response = await axios.get(`${this.base}/heatmap`, {
            params: filters,
        });
        return response.data.data;
    }

    // ── Export ────────────────────────────────────────────────────────────────

    async exportTrackingData(filters: {
        format: 'csv' | 'json' | 'excel';
        date_from: string;
        date_to: string;
        campaign_id?: number;
        rider_ids?: number[];
    }): Promise<unknown> {
        const response = await axios.post(`${this.base}/export`, filters);
        return response.data;
    }
}

export default new TrackingService();