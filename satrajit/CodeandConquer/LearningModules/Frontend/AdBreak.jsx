import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdBreak } from '../contexts/AdBreakContext';
import './AdBreak.css';

// Load YouTube IFrame API
const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
};

export default function AdBreak() {
  const { showAd, adData, closeAd } = useAdBreak();
  const [skipCountdown, setSkipCountdown] = useState(30);
  const [canSkip, setCanSkip] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const countdownRef = useRef(null);
  const autoCloseRef = useRef(null);

  // Initialize YouTube player
  const initPlayer = useCallback(async () => {
    if (!adData?.youtube_url) return;

    await loadYouTubeAPI();

    // Extract video ID from URL
    const urlParams = new URL(adData.youtube_url).searchParams;
    let videoId = urlParams.get('v');
    if (!videoId) {
      // Try extracting from youtu.be format
      const match = adData.youtube_url.match(/youtu\.be\/([^?]+)/);
      videoId = match ? match[1] : null;
    }

    if (!videoId) {
      console.error('Could not extract video ID from URL');
      return;
    }

    // Clear existing player
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Create new player
    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '405',
      width: '720',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            // Auto-close 10 seconds after video ends
            autoCloseRef.current = setTimeout(() => {
              handleClose();
            }, 10000);
          }
        },
      },
    });
  }, [adData]);

  // Start countdown when ad shows
  useEffect(() => {
    if (!showAd || !adData) return;

    setSkipCountdown(30);
    setCanSkip(false);

    // Initialize player
    initPlayer();

    // Start skip countdown after 0.5s
    const startDelay = setTimeout(() => {
      countdownRef.current = setInterval(() => {
        setSkipCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 500);

    return () => {
      clearTimeout(startDelay);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Player may already be destroyed
        }
        playerRef.current = null;
      }
    };
  }, [showAd, adData, initPlayer]);

  const handleClose = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Player may already be destroyed
      }
      playerRef.current = null;
    }
    closeAd();
  };

  if (!showAd || !adData) return null;

  return (
    <div className="ad-overlay">
      <div className="ad-container">
        <div className="ad-header">
          <span className="ad-label">Advertisement</span>
          {adData.sponsor && (
            <span className="ad-sponsor">Sponsored by {adData.sponsor}</span>
          )}
        </div>
        
        <div ref={containerRef} className="ad-player" />
        
        <button
          className={`skip-button ${canSkip ? 'enabled' : 'disabled'}`}
          onClick={handleClose}
          disabled={!canSkip}
        >
          {canSkip ? 'Skip Ad' : `Skip Ad (${skipCountdown})`}
        </button>

        <p className="ad-tip">
          💡 Tip: Upgrade to Premium to remove ads and support development!
        </p>
      </div>
    </div>
  );
}

