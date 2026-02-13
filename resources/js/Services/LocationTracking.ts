import axios from 'axios';

type TrackingStatus = 'stopped' | 'active' | 'paused';

class LocationTrackingService {
  private intervalId: number | null = null;
  private status: TrackingStatus = 'stopped';
  private locationQueue: any[] = []; // For offline storage

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
    try {
      // Get current position from browser
      const position = await this.getCurrentPosition();

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        recorded_at: new Date(position.timestamp).toISOString(),
      };

      // Send to server
      await this.postLocationToServer(locationData);

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
    }
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