
'use client';

import { useState, useEffect, useCallback } from 'react';

export type Location = {
  latitude: number;
  longitude: number;
};

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let watchId: number;

    if (isTracking) {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setError(null);
        },
        (err) => {
          let errorMessage = "An unknown error occurred while capturing location.";
          if (err.code === 1) { // PERMISSION_DENIED
            errorMessage = "Please allow location access to submit the form.";
          }
          setError(errorMessage);
          setLocation(null);
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  return { location, error, startTracking, stopTracking, isTracking };
}
