import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import './LearningModule.css';

export default function LearningModule({ moduleId, onComplete, onBack }) {
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  // Fetch module content from Supabase
  useEffect(() => {
    async function fetchModule() {
      try {
        setLoading(true);
        setError(null);

        // Fetch module from content_modules table
        const { data, error: fetchError } = await supabase
          .from('content_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (fetchError) throw fetchError;

        // Map data to handle various column names
        const mappedModule = {
          id: data.id,
          title: data.title || data.name || '',
          description: data.description || data.summary || '',
          content: data.content || data.text || data.body || '',
          text: data.text || data.content || data.body || '',
          category: data.category || data.type || data.topic || null,
          difficulty: data.difficulty || data.level || null,
          audio_file_path: data.audio_file_path || data.audio_path || data.mp3_path || null,
          code_examples: data.code_examples || data.examples || [],
          key_points: data.key_points || data.takeaways || [],
        };

        setModule(mappedModule);
        setAudioError(null);

        // Get signed URL for audio file from text_audio bucket
        const audioPath = mappedModule.audio_file_path;
        console.log('Audio file path from database:', audioPath);
        console.log('Module ID:', mappedModule.id);
        console.log('Module title:', mappedModule.title);
        
        // Try multiple path patterns
        const pathPatterns = [];
        
        if (audioPath) {
          // Use the path from database (with and without leading slash)
          pathPatterns.push(audioPath);
          pathPatterns.push(audioPath.startsWith('/') ? audioPath.slice(1) : audioPath);
        }
        
        // Try common naming patterns
        const mappedModuleId = mappedModule.id;
        const moduleTitle = mappedModule.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Extract topic from title (e.g., "Arrays" -> "arrays", "Dynamic Programming" -> "dynamic")
        // Try to get the first word or main topic from title
        const titleWords = mappedModule.title?.toLowerCase()
          .replace(/[^a-z0-9\s]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(word => word.length > 0);
        
        // Get first word as topic (e.g., "Arrays" -> "arrays", "Dynamic Programming" -> "dynamic")
        const topicFromTitle = titleWords?.[0] || '';
        
        // Also try full title without spaces
        const fullTopicFromTitle = mappedModule.title?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .trim();
        
        if (mappedModuleId) {
          pathPatterns.push(`${mappedModuleId}.mp3`);
          pathPatterns.push(`${mappedModuleId}.MP3`);
        }
        
        if (moduleTitle) {
          pathPatterns.push(`${moduleTitle}.mp3`);
          pathPatterns.push(`${moduleTitle}.MP3`);
        }
        
        // Try {topic}module.mp3 pattern (e.g., arraysmodule.mp3)
        if (topicFromTitle) {
          pathPatterns.push(`${topicFromTitle}module.mp3`);
          pathPatterns.push(`${topicFromTitle}module.MP3`);
        }
        
        // Try full topic without spaces
        if (fullTopicFromTitle) {
          pathPatterns.push(`${fullTopicFromTitle}module.mp3`);
          pathPatterns.push(`${fullTopicFromTitle}module.MP3`);
        }
        
        // Try category-based pattern
        if (mappedModule.category) {
          const categoryTopic = mappedModule.category.toLowerCase()
            .replace(/[^a-z0-9\s]+/g, '')
            .trim()
            .replace(/\s+/g, '');
          if (categoryTopic) {
            pathPatterns.push(`${categoryTopic}module.mp3`);
            pathPatterns.push(`${categoryTopic}module.MP3`);
          }
        }
        
        // Remove duplicates
        const uniquePaths = [...new Set(pathPatterns)];
        console.log('Trying audio paths:', uniquePaths);
        
        // Get Supabase URL for public bucket
        const supabaseUrl = supabase.storage.from('text_audio').getPublicUrl('').data?.publicUrl?.replace('/text_audio', '') || '';
        
        // Try each path pattern - try public URL first since bucket is PUBLIC
        let foundAudio = false;
        for (const path of uniquePaths) {
          try {
            // Try public URL first (bucket is PUBLIC)
            const { data: publicData } = supabase.storage
              .from('text_audio')
              .getPublicUrl(path);
            
            if (publicData?.publicUrl) {
              console.log(`Testing public URL: ${publicData.publicUrl}`);
              // Test if the URL is accessible
              try {
                const testResponse = await fetch(publicData.publicUrl, { method: 'HEAD' });
                if (testResponse.ok) {
                  console.log(`✓ Found audio at path: ${path} (public URL)`);
                  setAudioUrl(publicData.publicUrl);
                  foundAudio = true;
                  break;
                } else {
                  console.log(`✗ Public URL test failed with status: ${testResponse.status}`);
                }
              } catch (fetchErr) {
                console.log(`✗ Public URL fetch failed:`, fetchErr.message);
              }
            }
            
            // Fallback to signed URL if public URL doesn't work
            if (!foundAudio) {
              const { data: signedData, error: signedError } = await supabase
                .storage
                .from('text_audio')
                .createSignedUrl(path, 3600);

              if (!signedError && signedData?.signedUrl) {
                console.log(`✓ Found audio at path: ${path} (signed URL)`);
                setAudioUrl(signedData.signedUrl);
                foundAudio = true;
                break;
              } else if (signedError) {
                console.log(`✗ Signed URL for ${path} failed:`, signedError.message);
              }
            }
          } catch (audioErr) {
            console.log(`✗ Path ${path} exception:`, audioErr.message);
          }
        }
        
        if (!foundAudio) {
          console.warn('No audio file found for module. Tried paths:', uniquePaths);
          setAudioError('Audio file not found. Please ensure the audio file is uploaded to the text_audio bucket.');
        }
      } catch (err) {
        console.error('Error fetching module:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (moduleId) {
      fetchModule();
    }
  }, [moduleId]);

  // Audio controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setAudioProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioDuration;
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleAudioError = (e) => {
    console.error('Audio playback error:', e);
    const audio = e.target;
    if (audio.error) {
      let errorMessage = 'Unknown audio error';
      switch (audio.error.code) {
        case audio.error.MEDIA_ERR_ABORTED:
          errorMessage = 'Audio playback was aborted';
          break;
        case audio.error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading audio';
          break;
        case audio.error.MEDIA_ERR_DECODE:
          errorMessage = 'Audio decoding error';
          break;
        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Audio format not supported';
          break;
      }
      console.error('Audio error details:', errorMessage);
      setAudioError(`Audio playback failed: ${errorMessage}`);
      setAudioUrl(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    
    if (onComplete) {
      await onComplete(moduleId);
    }
    
    // Show success message
    setShowSuccessMessage(true);
    
    // Redirect to problems page after a short delay
    setTimeout(() => {
      // Navigate to problems page, optionally filtered by category
      const category = module?.category?.toLowerCase().replace(/\s+/g, '-');
      navigate('/problems', { 
        state: { 
          fromLearning: true,
          suggestedCategory: category
        }
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="learning-module loading">
        <div className="loading-spinner" />
        <p>Loading module...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learning-module error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Module</h3>
        <p>{error}</p>
        <button onClick={onBack} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="learning-module not-found">
        <h3>Module Not Found</h3>
        <button onClick={onBack} className="back-button">
          Go Back
        </button>
      </div>
    );
  }
  
  return (
      <div className="learning-module">
      <div className="module-header">
        <button onClick={onBack} className="back-button">
          ← Back
        </button>
        <div className="module-meta">
          {module.category && (
            <span className="module-category">{module.category}</span>
          )}
          {module.difficulty && (
            <span className={`module-difficulty ${module.difficulty.toLowerCase()}`}>
              {module.difficulty}
            </span>
          )}
        </div>
      </div>

      <h1 className="module-title">{module.title}</h1>

      {module.description && (
        <p className="module-description">{module.description}</p>
      )}

      {/* Text to Speech Audio Player */}
      {audioUrl ? (
        <div className="audio-player">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            onError={handleAudioError}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          <div className="audio-header">
            <svg className="speaker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span className="audio-label">Text to Speech</span>
          </div>
          
            <button 
            className="play-pause-button"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            </button>

          <div className="audio-info">
            <div 
              className="progress-bar"
              onClick={handleSeek}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={audioDuration}
              aria-valuenow={audioProgress}
            >
              <div 
                className="progress-fill"
                style={{ width: `${(audioProgress / audioDuration) * 100 || 0}%` }}
              />
            </div>
            <div className="time-display">
              <span>{formatTime(audioProgress)}</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>
        </div>
      ) : audioError && (
        <div className="audio-error-message">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Audio Not Available</strong>
            <p>{audioError}</p>
            <p className="audio-help-text">
              Make sure the audio file is uploaded to the <code>text_audio</code> bucket in Supabase.
              The file should be named: <code>{module.audio_file_path || `${module.id}.mp3`}</code>
            </p>
          </div>
                </div>
      )}

      {/* Main Content */}
      <div className="module-content">
        {module.content && (
          <div 
            className="content-text"
            dangerouslySetInnerHTML={{ __html: module.content }}
          />
        )}

        {/* Plain text fallback */}
        {module.text && !module.content && (
          <div className="content-text">
            {module.text.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
                  )}
                </div>

      {/* Code Examples */}
      {module.code_examples && module.code_examples.length > 0 && (
        <div className="code-examples">
          <h3>Code Examples</h3>
          {module.code_examples.map((example, idx) => (
            <div key={idx} className="code-block">
              {example.title && <h4>{example.title}</h4>}
              <pre>
                <code className={`language-${example.language || 'javascript'}`}>
                  {example.code}
                </code>
              </pre>
            </div>
          ))}
            </div>
          )}

      {/* Key Points */}
      {module.key_points && module.key_points.length > 0 && (
        <div className="key-points">
          <h3>Key Takeaways</h3>
          <ul>
            {module.key_points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Button */}
      <div className="module-footer">
        {showSuccessMessage ? (
          <div className="success-message">
            <span className="success-icon">🎉</span>
            <div className="success-text">
              <strong>Module Completed!</strong>
              <p>Redirecting to practice problems...</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleComplete}
            className="complete-button"
            disabled={isCompleting}
          >
            {isCompleting ? (
              <>
                <span className="button-spinner"></span>
                Completing...
              </>
            ) : (
              <>Continue to Practice →</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
