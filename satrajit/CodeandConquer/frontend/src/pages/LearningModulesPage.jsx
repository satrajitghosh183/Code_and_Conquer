import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LearningModule from '../components/LearningModule';
import './LearningModulesPage.css';

export default function LearningModulesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestionBanner, setShowSuggestionBanner] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);

  // Handle navigation state from problem page
  useEffect(() => {
    if (location.state?.fromProblem && location.state?.suggestedCategory) {
      setSuggestedCategory(location.state.suggestedCategory);
      setShowSuggestionBanner(true);
      // Auto-search for the suggested category
      setSearchQuery(location.state.suggestedCategory);
    }
  }, [location.state]);

  // Fetch all modules
  useEffect(() => {
    async function fetchModules() {
      try {
        setLoading(true);
        setError(null);

        // Select all columns - let database return what it has
        const { data, error: fetchError } = await supabase
          .from('content_modules')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Map data to handle various column names
        const mappedModules = (data || []).map(item => ({
          id: item.id,
          title: item.title || item.name || '',
          description: item.description || item.summary || '',
          category: item.category || item.type || item.topic || null,
          difficulty: item.difficulty || item.level || null,
          duration_minutes: item.duration_minutes || item.duration || null,
          thumbnail_url: item.thumbnail_url || item.image_url || null,
          audio_file_path: item.audio_file_path || item.audio_path || item.mp3_path || null,
          created_at: item.created_at,
        }));

        setModules(mappedModules);

        // Fetch user's completed modules (table might not exist yet)
        if (user) {
          try {
            const { data: progressData } = await supabase
              .from('user_module_progress')
              .select('module_id')
              .eq('user_id', user.id)
              .eq('completed', true);

            if (progressData) {
              setCompletedModules(new Set(progressData.map(p => p.module_id)));
            }
          } catch (progressErr) {
            // user_module_progress table might not exist yet - that's okay
            console.log('Progress table not available:', progressErr.message);
          }
        }
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchModules();
  }, [user]);

  // Mark module as complete
  const handleModuleComplete = async (moduleId) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_module_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      if (!error) {
        setCompletedModules(prev => new Set([...prev, moduleId]));
        setSelectedModuleId(null);
      }
    } catch (err) {
      console.error('Error marking module complete:', err);
    }
  };

  // Filter modules
  const filteredModules = modules.filter(module => {
    const difficulty = module.difficulty?.toLowerCase();
    const matchesFilter = filter === 'all' || 
      (filter === 'completed' && completedModules.has(module.id)) ||
      (filter === 'incomplete' && !completedModules.has(module.id)) ||
      (filter === 'easy' && difficulty === 'easy') ||
      (filter === 'medium' && difficulty === 'medium') ||
      (filter === 'hard' && difficulty === 'hard');

    const matchesSearch = !searchQuery || 
      module.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.category && module.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Get unique categories
  const categories = [...new Set(modules.map(m => m.category).filter(Boolean))];

  // Show individual module view
  if (selectedModuleId) {
    return (
      <LearningModule
        moduleId={selectedModuleId}
        onComplete={handleModuleComplete}
        onBack={() => setSelectedModuleId(null)}
      />
    );
  }

  return (
    <div className="learning-modules-page">
      {/* Suggestion Banner when redirected from problem solving */}
      {showSuggestionBanner && (
        <div className="suggestion-banner">
          <div className="suggestion-content">
            <span className="suggestion-icon">🎉</span>
            <div className="suggestion-text">
              <strong>Great work solving those problems!</strong>
              <p>Based on your recent work, we recommend learning more about <span className="highlight">{suggestedCategory}</span>.</p>
            </div>
            <button 
              className="dismiss-btn"
              onClick={() => setShowSuggestionBanner(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="page-header">
        <div className="header-content">
          <h1>Learning Modules</h1>
          <p>Master programming concepts with interactive lessons and audio guides</p>
        </div>
        
        <div className="progress-summary">
          <div className="progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                className="progress-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="progress-fill"
                strokeDasharray={`${(completedModules.size / modules.length) * 100 || 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="progress-text">
              {completedModules.size}/{modules.length}
            </span>
          </div>
          <span className="progress-label">Completed</span>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="filters-section">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'incomplete' ? 'active' : ''} 
            onClick={() => setFilter('incomplete')}
          >
            In Progress
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''} 
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading modules...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Modules Grid */}
      {!loading && !error && (
        <div className="modules-grid">
          {filteredModules.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📚</span>
              <h3>No modules found</h3>
              <p>Try adjusting your filters or search query</p>
            </div>
          ) : (
            filteredModules.map(module => (
              <article 
                key={module.id} 
                className={`module-card ${completedModules.has(module.id) ? 'completed' : ''}`}
                onClick={() => setSelectedModuleId(module.id)}
              >
                {module.thumbnail_url ? (
                  <div 
                    className="module-thumbnail"
                    style={{ backgroundImage: `url(${module.thumbnail_url})` }}
                  />
                ) : (
                  <div className="module-thumbnail placeholder">
                    <span>📖</span>
                  </div>
                )}

                <div className="module-info">
                  <h3 className="module-title">{module.title}</h3>
                  
                  {module.description && (
                    <p className="module-description">{module.description}</p>
                  )}

                  <div className="module-footer">
                    {module.duration_minutes && (
                      <span className="duration">
                        ⏱️ {module.duration_minutes} min
                      </span>
                    )}
                    
                    {completedModules.has(module.id) && (
                      <span className="completed-badge">✓ Completed</span>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Categories Section */}
      {categories.length > 0 && !selectedModuleId && (
        <section className="categories-section">
          <h2>Browse by Category</h2>
          <div className="categories-list">
            {categories.map(category => (
              <button
                key={category}
                className="category-pill"
                onClick={() => setSearchQuery(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

