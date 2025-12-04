import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PaymentProvider } from './contexts/PaymentContext'
import AuthForm from './components/AuthForm'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AuthCallback from './components/AuthCallback'

// Loading component for initial auth check
function LoadingScreen() {
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
          width: '40px',
          height: '40px',
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
        <p>Loading...</p>
      </div>
    </div>
  )
}

// App routes wrapper that handles auth state
function AppRoutes() {
  const { loading, initialized, user } = useAuth()

  // Show loading while initializing
  if (!initialized || loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Auth callback route - handles OAuth redirects */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Login route - redirect to dashboard if already logged in */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <AuthForm />} 
      />
      
      {/* Protected dashboard route */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Root route - handles OAuth callback tokens in URL hash */}
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <AuthForm />
        } 
      />

      {/* Catch all - redirect to appropriate page */}
      <Route 
        path="*" 
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PaymentProvider>
          <AppRoutes />
        </PaymentProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
