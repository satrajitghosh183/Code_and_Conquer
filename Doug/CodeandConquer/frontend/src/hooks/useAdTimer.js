import { useState, useEffect, useRef } from 'react';
import { getRandomAd } from '../services/api';

const AD_INTERVAL_MS = 1 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Custom hook to track time on site and trigger ads every 30 minutes
 */
export function useAdTimer() {
  const [showAd, setShowAd] = useState(false);
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef(Date.now());
  const lastAdTimeRef = useRef(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    // Check if it's time to show an ad
    const checkAdTime = async () => {
      const now = Date.now();
      const timeSinceLastAd = now - lastAdTimeRef.current;

      if (timeSinceLastAd >= AD_INTERVAL_MS) {
        try {
          setLoading(true);
          const response = await getRandomAd();
          setAdData(response.data);
          setShowAd(true);
          lastAdTimeRef.current = now;
        } catch (error) {
          console.error('Failed to fetch ad:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    // Check immediately on mount
    checkAdTime();

    // Set up interval to check every minute
    intervalRef.current = setInterval(checkAdTime, 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const closeAd = () => {
    setShowAd(false);
    setAdData(null);
  };

  return {
    showAd,
    adData,
    loading,
    closeAd
  };
}

