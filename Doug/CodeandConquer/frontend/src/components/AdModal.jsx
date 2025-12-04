import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './AdModal.css';

const REQUIRED_WATCH_TIME = 30; // seconds

// Extract video ID from YouTube URL
const getVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

export default function AdModal({ adData, onClose }) {
  const [timeRemaining, setTimeRemaining] = useState(REQUIRED_WATCH_TIME);
  const [canSkip, setCanSkip] = useState(false);
  const [youtubeAPIReady, setYoutubeAPIReady] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setYoutubeAPIReady(true);
      return;
    }

    // Load the script if not already present
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if (window.YT && window.YT.Player) {
        setYoutubeAPIReady(true);
      } else {
        window.onYouTubeIframeAPIReady = () => {
          setYoutubeAPIReady(true);
        };
      }
      return;
    }

    // Create and load the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setYoutubeAPIReady(true);
    };
  }, []);

  // Initialize YouTube player when API is ready and iframe is available
  useEffect(() => {
    if (!youtubeAPIReady || !iframeRef.current || !adData) return;

    const videoId = getVideoId(adData.youtube_url);
    if (!videoId) return;

    // Generate unique ID for this player instance
    const playerId = `youtube-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    iframeRef.current.id = playerId;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        playerRef.current = new window.YT.Player(playerId, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 0, // Try to start unmuted
            controls: 1,
            rel: 0,
            enablejsapi: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              // Unmute and play when ready
              try {
                event.target.unMute();
                event.target.playVideo();
              } catch (e) {
                console.log('Could not unmute immediately, will retry on play');
              }
            },
            onStateChange: (event) => {
              // Ensure unmuted when video starts playing
              if (event.data === window.YT.PlayerState.PLAYING) {
                try {
                  event.target.unMute();
                } catch (e) {
                  // Browser may block unmuting due to autoplay policy
                  console.log('Browser autoplay policy may prevent unmuting');
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
    };
  }, [youtubeAPIReady, adData]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  if (!adData) return null;

  const videoId = getVideoId(adData.youtube_url);

  const handleClose = () => {
    if (canSkip) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
      }
      onClose();
    }
  };

  return (
    <div className="ad-modal-overlay">
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className={`ad-close-btn ${canSkip ? '' : 'disabled'}`} 
          onClick={handleClose}
          disabled={!canSkip}
          title={canSkip ? 'Skip ad' : `Skip in ${timeRemaining}s`}
        >
          <X size={20} />
        </button>
        
        <div className="ad-content">
          <div className="ad-label">Advertisement</div>
          <h3 className="ad-title">{adData.title || 'Check this out!'}</h3>
          
          {videoId && (
            <div className="ad-video-container">
              <div ref={iframeRef} id="youtube-player"></div>
            </div>
          )}
          
          {!canSkip && (
            <div className="ad-skip-timer">
              You can skip this ad in {timeRemaining} seconds
            </div>
          )}
          
          {canSkip && (
            <button className="ad-skip-btn" onClick={handleClose}>
              Skip Ad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

