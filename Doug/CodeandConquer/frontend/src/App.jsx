import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PaymentProvider } from './contexts/PaymentContext'
import { GameProvider } from './contexts/GameContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AuthForm from './components/AuthForm'
import Dashboard from './pages/Dashboard'
import ProblemsPage from './pages/ProblemsPage'
import ProblemDetailPage from './pages/ProblemDetailPage'
import GamePage from './pages/GamePage'
import MatchPage from './pages/MatchPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdModal from './components/AdModal'
import { useAdTimer } from './hooks/useAdTimer'
import './App.css'

// Component to handle OAuth callback - must be inside AuthProvider
function OAuthCallbackHandler() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: '#000000'
    }}>
      Loading...
    </div>
  )
}

function AppRoutes() {
  const { showAd, adData, closeAd } = useAdTimer();

  return (
    <>
      <Routes>
      <Route path="/login" element={<AuthForm />} />
      <Route path="/auth/callback" element={<OAuthCallbackHandler />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/problems"
        element={
          <ProtectedRoute>
            <Layout>
              <ProblemsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/problems/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <ProblemDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/match"
        element={
          <ProtectedRoute>
            <MatchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Layout>
              <LeaderboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {showAd && <AdModal adData={adData} onClose={closeAd} />}
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <PaymentProvider>
          <GameProvider>
            <AppRoutes />
          </GameProvider>
        </PaymentProvider>
      </AuthProvider>
    </Router>
  )
}

export default App

