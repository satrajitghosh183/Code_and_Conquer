import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

/**
 * Protected Route wrapper component
 * Handles authentication checks and redirects
 */
export default function ProtectedRoute({ children }) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  // Wait until auth is fully initialized before making redirect decisions
  if (loading || !initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f1a'
      }}>
        <LoadingSpinner size="large" message="Authenticating..." />
      </div>
    )
  }

  // Check if there are OAuth tokens in the URL - don't redirect to login if so
  const hash = location.hash || window.location.hash
  if (hash && hash.includes('access_token')) {
    // Redirect to callback handler
    return <Navigate to={'/auth/callback' + hash} replace />
  }

  if (!user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
