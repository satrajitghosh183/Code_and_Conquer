import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PaymentProvider } from './contexts/PaymentContext'
import { GameProvider } from './contexts/GameContext'
import { NotificationProvider } from './contexts/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import { PageLoader } from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { supabase } from './config/supabaseClient'
import './App.css'

// Lazy load pages for better performance
const AuthForm = lazy(() => import('./components/AuthForm'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'))
const ProblemDetailPage = lazy(() => import('./pages/ProblemDetailPage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const GameModeSelection = lazy(() => import('./pages/GameModeSelection'))
const MatchPage = lazy(() => import('./pages/MatchPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))

// Component to handle OAuth callback - must be inside AuthProvider
function OAuthCallbackHandler() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('OAuthCallbackHandler: Processing callback...')
      
      // Check for tokens in URL hash (Supabase puts them there)
      const hashParams = new URLSearchParams(location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const errorParam = hashParams.get('error')
      const errorDescription = hashParams.get('error_description')
      
      // Also check query params for errors
      const queryParams = new URLSearchParams(location.search)
      const queryError = queryParams.get('error')
      const queryErrorDescription = queryParams.get('error_description')
      
      if (errorParam || queryError) {
        console.error('OAuth error:', errorParam || queryError, errorDescription || queryErrorDescription)
        setError(errorDescription || queryErrorDescription || errorParam || queryError)
        setProcessing(false)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
        return
      }
      
      if (accessToken && refreshToken) {
        console.log('Found tokens in URL, setting session...')
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (sessionError) {
            console.error('Error setting session:', sessionError)
            setError(sessionError.message)
            setProcessing(false)
            setTimeout(() => navigate('/login', { replace: true }), 3000)
            return
          }
          
          console.log('Session set successfully:', data.user?.email)
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          navigate('/dashboard', { replace: true })
        } catch (e) {
          console.error('Exception setting session:', e)
          setError(e.message)
          setProcessing(false)
          setTimeout(() => navigate('/login', { replace: true }), 3000)
        }
      } else {
        // No tokens in URL, check if user is already logged in
        console.log('No tokens in URL, checking existing session...')
        setProcessing(false)
      }
    }
    
    handleOAuthCallback()
  }, [location, navigate])

  // After processing, check user state
  useEffect(() => {
    if (!processing && !loading && !error) {
      if (user) {
        console.log('User authenticated, redirecting to dashboard')
        navigate('/dashboard', { replace: true })
      } else {
        console.log('No user found, redirecting to login')
        navigate('/login', { replace: true })
      }
    }
  }, [user, loading, processing, error, navigate])

  if (error) {
    return (
      <div className="oauth-callback-container error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <p className="redirect-message">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="oauth-callback-container">
      <div className="processing-text">Processing login...</div>
      <div className="spinner" />
    </div>
  )
}

// Component to handle root route - checks for OAuth tokens before redirecting
function RootHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    // Check if there are OAuth tokens in the hash
    const hashParams = new URLSearchParams(location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    
    if (accessToken) {
      // Redirect to callback handler to process tokens
      navigate('/auth/callback' + location.hash, { replace: true })
    } else {
      // No tokens, go to dashboard (ProtectedRoute will redirect to login if needed)
      navigate('/dashboard', { replace: true })
    }
  }, [location, navigate])
  
  return <PageLoader message="Loading..." />
}

// Wrap lazy-loaded components with Suspense
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
)

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <SuspenseWrapper>
          <AuthForm />
        </SuspenseWrapper>
      } />
      <Route path="/auth/callback" element={<OAuthCallbackHandler />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <SuspenseWrapper>
                <Dashboard />
              </SuspenseWrapper>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/problems"
        element={
          <Layout>
            <SuspenseWrapper>
              <ProblemsPage />
            </SuspenseWrapper>
          </Layout>
        }
      />
      <Route
        path="/problems/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <SuspenseWrapper>
                <ProblemDetailPage />
              </SuspenseWrapper>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/play"
        element={
          <ProtectedRoute>
            <SuspenseWrapper>
              <GameModeSelection />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <SuspenseWrapper>
              <GamePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/match"
        element={
          <ProtectedRoute>
            <SuspenseWrapper>
              <MatchPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Layout>
              <SuspenseWrapper>
                <LeaderboardPage />
              </SuspenseWrapper>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootHandler />} />
      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <PaymentProvider>
            <GameProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </GameProvider>
          </PaymentProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
