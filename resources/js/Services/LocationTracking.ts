import axios from 'axios';

type TrackingStatus = 'stopped' | 'active' | 'paused';

// A rider parked/idling shouldn't rack up full-frequency pings — pay is
// based on actual movement (see RiderMovementAnalyzer server-side), and
// there's no point spending battery/data confirming "still here" every
// 15 seconds. Below this distance since the last SENT point, a tick is
// skipped rather than posted.
const STATIONARY_DISTANCE_METERS = 15;

// ...but never go fully silent for long — a heartbeat at this interval
// keeps the rider visible on live tracking views (a real stop shouldn't
// look identical to a dead app) and gives the backend's movement analyzer
// a data point to confirm the stationary period is still ongoing rather
// than inferring it from a large gap.
const HEARTBEAT_INTERVAL_MS = 120_000; // 2 minutes

class LocationTrackingService {
  private intervalId: number | null = null;
  private status: TrackingStatus = 'stopped';
  private locationQueue: any[] = []; // For offline storage
  private sendInProgress = false;
  private lastSent: { latitude: number; longitude: number; at: number } | null = null;

  /**
   * Start tracking - sends location every 15 seconds
   */
  startTracking(): void {
    if (this.status === 'active') {
      console.warn('Tracking is already active');
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Send location immediately
    this.sendLocation();

    // Then send every 15 seconds
    this.intervalId = window.setInterval(() => {
      if (this.status === 'active') {
        this.sendLocation();
      }
    }, 15000); // 15 seconds

    this.status = 'active';
    console.log('📍 Location tracking started - sending every 15 seconds');
  }

  /**
   * Stop tracking completely
   */
  stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.status = 'stopped';
    this.sendInProgress = false;
    this.lastSent = null;
    console.log('🛑 Location tracking stopped');
  }

  /**
   * Pause tracking (keeps interval running but doesn't send locations)
   */
  pauseTracking(): void {
    if (this.status !== 'active') {
      console.warn('Cannot pause - tracking is not active');
      return;
    }
    
    this.status = 'paused';
    console.log('⏸️ Location tracking paused');
  }

  /**
   * Resume tracking after pause
   */
  resumeTracking(): void {
    if (this.status !== 'paused') {
      console.warn('Cannot resume - tracking is not paused');
      return;
    }

    // Send location immediately when resuming
    this.sendLocation();
    
    this.status = 'active';
    console.log('▶️ Location tracking resumed');
  }

  /**
   * Get current tracking status
   */
  getStatus(): TrackingStatus {
    return this.status;
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.status === 'paused';
  }

  /**
   * Get current position and send to server
   */
  private async sendLocation(): Promise<void> {
    // Skip this tick if the previous lookup is still in flight (e.g. weak GPS
    // signal taking close to the 10s timeout) so requests can't pile up.
    if (this.sendInProgress) {
      console.warn('⏭️ Skipping location tick — previous lookup still in progress');
      return;
    }
    this.sendInProgress = true;

    try {
      // Get current position from browser
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      if (this.shouldSkipAsStationary(latitude, longitude)) {
        console.log('🅿️ Stationary — skipping this tick (no meaningful movement since last send)');
        return;
      }

      const locationData = {
        latitude,
        longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        recorded_at: new Date(position.timestamp).toISOString(),
      };

      // Send to server
      await this.postLocationToServer(locationData);
      this.lastSent = { latitude, longitude, at: Date.now() };

      // Dispatch success event
      this.dispatchEvent('location:sent', { location: locationData });

      console.log('✅ Location sent successfully');

    } catch (error) {
      console.error('❌ Failed to send location:', error);
      
      // Dispatch error event
      this.dispatchEvent('location:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't stop tracking on error - just log and continue
    } finally {
      this.sendInProgress = false;
    }
  }

  /**
   * True if the rider hasn't moved meaningfully since the last point we
   * actually sent, and the heartbeat interval hasn't elapsed yet. The
   * heartbeat override matters even while stationary — see
   * HEARTBEAT_INTERVAL_MS above.
   */
  private shouldSkipAsStationary(latitude: number, longitude: number): boolean {
    if (!this.lastSent) {
      return false;
    }

    const distanceMeters = LocationTrackingService.haversineMeters(
      this.lastSent.latitude,
      this.lastSent.longitude,
      latitude,
      longitude
    );

    if (distanceMeters >= STATIONARY_DISTANCE_METERS) {
      return false;
    }

    const elapsedSinceLastSend = Date.now() - this.lastSent.at;
    return elapsedSinceLastSend < HEARTBEAT_INTERVAL_MS;
  }

  private static haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusM = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Get current position from browser
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true, // Use GPS if available
          timeout: 10000, // 10 second timeout
          maximumAge: 0, // Don't use cached position
        }
      );
    });
  }

  /**
   * Post location to Laravel API
   */
  private async postLocationToServer(locationData: any): Promise<void> {
    try {
      const response = await axios.post('/api/rider/location', locationData, {
        timeout: 5000, // 5 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;

    } catch (error) {
      // Handle errors gracefully
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.warn('⏱️ Request timeout - will retry in 15 seconds');
        } else if (!error.response) {
          console.warn('🔌 Network error - user might be offline');
          // Queue for later if offline
          this.queueLocation(locationData);
        } else if (error.response.status === 401) {
          console.error('🔐 Unauthorized - user not logged in');
          this.stopTracking();
          
          window.location.href = '/login';
        } else {
          console.error('⚠️ Server error:', error.response.status);
        }
      }
      throw error;
    }
  }

  /**
   * Queue location for offline sync
   */
  private queueLocation(locationData: any): void {
    this.locationQueue.push(locationData);
    console.log(`📦 Location queued for offline sync. Queue size: ${this.locationQueue.length}`);

    // Store in localStorage for persistence
    try {
      localStorage.setItem('location_queue', JSON.stringify(this.locationQueue));
    } catch (e) {
      console.error('Failed to save queue to localStorage:', e);
    }
  }

  /**
   * Send queued locations (when back online)
   */
  async syncQueuedLocations(): Promise<void> {
    if (this.locationQueue.length === 0) {
      return;
    }

    try {
      console.log(`🔄 Syncing ${this.locationQueue.length} queued locations...`);

      const response = await axios.post('/api/rider/locations/batch', {
        locations: this.locationQueue,
      });

      if (response.data.success) {
        console.log(`✅ Synced ${this.locationQueue.length} locations`);
        this.locationQueue = [];
        localStorage.removeItem('location_queue');
      }

    } catch (error) {
      console.error('❌ Failed to sync queued locations:', error);
    }
  }

  /**
   * Restore queued locations from localStorage
   */
  restoreQueue(): void {
    try {
      const queueJson = localStorage.getItem('location_queue');
      if (queueJson) {
        this.locationQueue = JSON.parse(queueJson);
        console.log(`📦 Restored ${this.locationQueue.length} queued locations`);
        
        // Try to sync them
        this.syncQueuedLocations();
      }
    } catch (e) {
      console.error('Failed to restore queue from localStorage:', e);
    }
  }

  /**
   * Dispatch custom events for React components
   */
  private dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export default new LocationTrackingService();