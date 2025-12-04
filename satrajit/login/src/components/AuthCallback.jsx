import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading, oauthError } = useAuth()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    // If there's an error, redirect to login with error
    if (oauthError) {
      setStatus('Authentication failed. Redirecting...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1000)
      return
    }

    // If user is authenticated, redirect to dashboard
    if (!loading && user) {
      setStatus('Success! Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 500)
      return
    }

    // If not loading and no user, something went wrong
    if (!loading && !user) {
      setStatus('Authentication failed. Redirecting to login...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    }
  }, [user, loading, oauthError, navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a0000 50%, #000000 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 0, 0, 0.3)',
          borderTop: '3px solid #ff0000',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ marginBottom: '10px', fontSize: '24px' }}>
          {oauthError ? 'Authentication Error' : 'Completing Sign In'}
        </h2>
        <p style={{ color: '#999', fontSize: '14px' }}>{status}</p>
        {oauthError && (
          <p style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '10px' }}>
            {oauthError.message}
          </p>
        )}
      </div>
    </div>
  )
}

