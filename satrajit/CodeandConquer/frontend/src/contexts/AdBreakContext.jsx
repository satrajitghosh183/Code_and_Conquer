import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const AdBreakContext = createContext(null);

const AD_BREAK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const PROBLEMS_BEFORE_LEARNING_MODULE = 3; // Redirect to learning module after every 3 problems
const PROBLEMS_BEFORE_AD = 4; // Show ad after every 4 problems

export function AdBreakProvider({ children }) {
  const { user } = useAuth();
  const [showAd, setShowAd] = useState(false);
  const [adData, setAdData] = useState(null);
  const [timeUntilAd, setTimeUntilAd] = useState(AD_BREAK_INTERVAL_MS);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionProblemCount, setSessionProblemCount] = useState(0);
  const [shouldRedirectToLearning, setShouldRedirectToLearning] = useState(false);
  const [learningModuleTag, setLearningModuleTag] = useState(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  // Check if user is premium (skip ads for premium users)
  useEffect(() => {
    if (user) {
      // Check premium status from user metadata or subscription
      const checkPremium = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${user.id}/subscription`);
          if (response.ok) {
            const data = await response.json();
            setIsPremium(data.isPremium || data.status === 'active');
          }
        } catch (error) {
          console.log('Could not check premium status:', error);
          setIsPremium(false);
        }
      };
      checkPremium();
    }
  }, [user]);

  // Fetch a random ad video
  const fetchAdVideo = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ads/video`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching ad:', error);
    }
    return null;
  }, []);

  // Trigger ad break
  const triggerAdBreak = useCallback(async () => {
    if (isPremium) {
      // Premium users skip ads
      sessionStartRef.current = Date.now();
      setTimeUntilAd(AD_BREAK_INTERVAL_MS);
      return;
    }

    const ad = await fetchAdVideo();
    if (ad) {
      setAdData(ad);
      setShowAd(true);
    }
  }, [fetchAdVideo, isPremium]);

  // Map of problem tags to learning module categories
  // Many tags will map to the same module since we don't have enough modules
  const TAG_TO_MODULE_MAP = {
    // Arrays
    'array': 'arrays',
    'arrays': 'arrays',
    'two-pointers': 'arrays',
    'sliding-window': 'arrays',
    'prefix-sum': 'arrays',
    // Strings
    'string': 'strings',
    'strings': 'strings',
    'regex': 'strings',
    'parsing': 'strings',
    // Trees/Graphs
    'tree': 'trees',
    'binary-tree': 'trees',
    'bst': 'trees',
    'graph': 'trees',
    'dfs': 'trees',
    'bfs': 'trees',
    'traversal': 'trees',
    // Dynamic Programming
    'dynamic-programming': 'dynamic-programming',
    'dp': 'dynamic-programming',
    'memoization': 'dynamic-programming',
    'recursion': 'dynamic-programming',
    // Sorting/Searching
    'sorting': 'sorting',
    'binary-search': 'sorting',
    'searching': 'sorting',
    // Math
    'math': 'math',
    'number-theory': 'math',
    'geometry': 'math',
    // Hash/Maps
    'hash-table': 'hash-tables',
    'hash': 'hash-tables',
    'map': 'hash-tables',
    'set': 'hash-tables',
    // Linked Lists
    'linked-list': 'linked-lists',
    'linkedlist': 'linked-lists',
    // Default
    'default': 'arrays'
  };

  // Record a problem solved and check if we should show learning module or ad
  const recordProblemSolved = useCallback((problemTags = []) => {
    const newCount = sessionProblemCount + 1;
    setSessionProblemCount(newCount);

    console.log(`[AdBreakContext] Problem solved. Session count: ${newCount}`);

    // Check if we should redirect to learning module (every 3 problems)
    if (newCount > 0 && newCount % PROBLEMS_BEFORE_LEARNING_MODULE === 0) {
      // Get a tag to determine which learning module to show
      const primaryTag = problemTags[0]?.toLowerCase() || 'default';
      const moduleCategory = TAG_TO_MODULE_MAP[primaryTag] || TAG_TO_MODULE_MAP['default'];
      console.log(`[AdBreakContext] Triggering learning module redirect. Tag: ${primaryTag}, Module: ${moduleCategory}`);
      setLearningModuleTag(moduleCategory);
      setShouldRedirectToLearning(true);
      return { shouldShowLearning: true, moduleCategory };
    }

    // Check if we should show ad (every 4 problems, but not if we just showed learning module)
    if (!isPremium && newCount > 0 && newCount % PROBLEMS_BEFORE_AD === 0) {
      console.log(`[AdBreakContext] Triggering ad break after ${newCount} problems`);
      triggerAdBreak();
      return { shouldShowAd: true };
    }

    return {};
  }, [sessionProblemCount, isPremium, triggerAdBreak]);

  // Clear learning module redirect flag (call this after navigating)
  const clearLearningRedirect = useCallback(() => {
    setShouldRedirectToLearning(false);
    setLearningModuleTag(null);
  }, []);

  // Close ad and reset timer
  const closeAd = useCallback(() => {
    setShowAd(false);
    setAdData(null);
    sessionStartRef.current = Date.now();
    setTimeUntilAd(AD_BREAK_INTERVAL_MS);
  }, []);

  // Start the 30-minute timer
  useEffect(() => {
    if (!user || isPremium) return;

    // Main timer for triggering ads
    timerRef.current = setTimeout(() => {
      triggerAdBreak();
    }, AD_BREAK_INTERVAL_MS);

    // Countdown timer for UI
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current;
      const remaining = Math.max(0, AD_BREAK_INTERVAL_MS - elapsed);
      setTimeUntilAd(remaining);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, isPremium, triggerAdBreak]);

  // Reset timer on user activity (optional - keeps timer running continuously)
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sessionStartRef.current = Date.now();
    setTimeUntilAd(AD_BREAK_INTERVAL_MS);
    
    if (!isPremium) {
      timerRef.current = setTimeout(() => {
        triggerAdBreak();
      }, AD_BREAK_INTERVAL_MS);
    }
  }, [triggerAdBreak, isPremium]);

  // Format time remaining for display
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeUntilAd / 60000);
    const seconds = Math.floor((timeUntilAd % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const value = {
    showAd,
    adData,
    closeAd,
    timeUntilAd,
    formatTimeRemaining,
    isPremium,
    resetTimer,
    triggerAdBreak, // For testing purposes
    // Problem-based tracking
    sessionProblemCount,
    recordProblemSolved,
    shouldRedirectToLearning,
    learningModuleTag,
    clearLearningRedirect,
  };

  return (
    <AdBreakContext.Provider value={value}>
      {children}
    </AdBreakContext.Provider>
  );
}

export function useAdBreak() {
  const context = useContext(AdBreakContext);
  if (!context) {
    throw new Error('useAdBreak must be used within an AdBreakProvider');
  }
  return context;
}

