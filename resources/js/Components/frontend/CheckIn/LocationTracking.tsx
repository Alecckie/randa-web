import { useState, useEffect } from 'react';
import LocationTrackingService from '@/Services/LocationTracking';

interface LocationTrackingButtonProps {
  // Callback functions
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onLocationSent?: (count: number) => void;
  onError?: (error: string) => void;
  
  // Customization
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  autoStart?: boolean; // Auto-start on mount
  showStatus?: boolean; // Show status indicator
  disabled?: boolean;
}

type TrackingStatus = 'stopped' | 'active' | 'paused';

export default function LocationTrackingButton({
  onStart,
  onStop,
  onPause,
  onResume,
  onLocationSent,
  onError,
  className = '',
  variant = 'default',
  autoStart = false,
  showStatus = true,
  disabled = false,
}: LocationTrackingButtonProps) {
  const [status, setStatus] = useState<TrackingStatus>('stopped');
  const [locationsSent, setLocationsSent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastLocationTime, setLastLocationTime] = useState<Date | null>(null);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStart && !disabled) {
      handleStart();
    }

    // Cleanup on unmount
    return () => {
      if (status !== 'stopped') {
        LocationTrackingService.stopTracking();
      }
    };
  }, [autoStart, disabled]);

  // Handle location sent events
  useEffect(() => {
    // Custom event listener for location updates
    const handleLocationUpdate = (event: CustomEvent) => {
      setLocationsSent(prev => {
        const newCount = prev + 1;
        onLocationSent?.(newCount);
        return newCount;
      });
      setLastLocationTime(new Date());
      setError(null);
    };

    const handleLocationError = (event: CustomEvent) => {
      const errorMessage = event.detail?.message || 'Failed to send location';
      setError(errorMessage);
      onError?.(errorMessage);
    };

    window.addEventListener('location:sent', handleLocationUpdate as EventListener);
    window.addEventListener('location:error', handleLocationError as EventListener);

    return () => {
      window.removeEventListener('location:sent', handleLocationUpdate as EventListener);
      window.removeEventListener('location:error', handleLocationError as EventListener);
    };
  }, [onLocationSent, onError]);

  const handleStart = () => {
    try {
      LocationTrackingService.startTracking();
      setStatus('active');
      setError(null);
      setLocationsSent(0);
      onStart?.();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start tracking';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleStop = () => {
    LocationTrackingService.stopTracking();
    setStatus('stopped');
    setLocationsSent(0);
    setLastLocationTime(null);
    onStop?.();
  };

  const handlePause = () => {
    LocationTrackingService.pauseTracking();
    setStatus('paused');
    onPause?.();
  };

  const handleResume = () => {
    LocationTrackingService.resumeTracking();
    setStatus('active');
    onResume?.();
  };

  // Render based on variant
  if (variant === 'icon-only') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {status === 'stopped' && (
          <button
            onClick={handleStart}
            disabled={disabled}
            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Start Tracking"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {status === 'active' && (
          <>
            <button
              onClick={handlePause}
              disabled={disabled}
              className="p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Pause Tracking"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Stop Tracking"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={handleResume}
              disabled={disabled}
              className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Resume Tracking"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Stop Tracking"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {status === 'stopped' && (
          <button
            onClick={handleStart}
            disabled={disabled}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
        )}

        {status === 'active' && (
          <>
            <button
              onClick={handlePause}
              disabled={disabled}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Pause
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stop
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={handleResume}
              disabled={disabled}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Resume
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stop
            </button>
          </>
        )}

        {showStatus && status !== 'stopped' && (
          <span className="text-sm text-gray-600">
            {locationsSent} sent
          </span>
        )}
      </div>
    );
  }

  // Default variant (full)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Control Buttons */}
      <div className="flex gap-3">
        {status === 'stopped' && (
          <button
            onClick={handleStart}
            disabled={disabled}
            className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Tracking
            </span>
          </button>
        )}

        {status === 'active' && (
          <>
            <button
              onClick={handlePause}
              disabled={disabled}
              className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </span>
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </span>
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={handleResume}
              disabled={disabled}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </span>
            </button>
            <button
              onClick={handleStop}
              disabled={disabled}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </span>
            </button>
          </>
        )}
      </div>

      {/* Status Display */}
      {showStatus && (
        <div className={`p-4 rounded-lg border-2 ${
          status === 'active' 
            ? 'bg-green-50 border-green-200' 
            : status === 'paused'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                status === 'active' 
                  ? 'bg-green-500 animate-pulse' 
                  : status === 'paused'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}></div>
              <span className={`font-semibold ${
                status === 'active' 
                  ? 'text-green-700' 
                  : status === 'paused'
                  ? 'text-yellow-700'
                  : 'text-gray-700'
              }`}>
                {status === 'active' && 'Tracking Active'}
                {status === 'paused' && 'Tracking Paused'}
                {status === 'stopped' && 'Not Tracking'}
              </span>
            </div>

            {status !== 'stopped' && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{locationsSent}</span> locations sent
              </div>
            )}
          </div>

          {status === 'active' && (
            <p className="text-sm text-green-600 mt-2">
              📍 Sending location every 15 seconds
            </p>
          )}

          {status === 'paused' && (
            <p className="text-sm text-yellow-600 mt-2">
              ⏸️ Location tracking paused - Resume when ready
            </p>
          )}

          {lastLocationTime && status !== 'stopped' && (
            <p className="text-xs text-gray-500 mt-1">
              Last sent: {lastLocationTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}