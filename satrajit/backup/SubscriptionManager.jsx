import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  isPremiumUser, 
  getUserSubscription, 
  createPortalSession,
  cancelSubscription,
  reactivateSubscription 
} from '../utils/stripe'
import './SubscriptionManager.css'

export default function SubscriptionManager({ onClose, onUpgrade }) {
  const { user, profile } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isPremium = isPremiumUser(profile)

  useEffect(() => {
    loadSubscription()
  }, [user])

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const { subscription: sub, error: err } = await getUserSubscription(user.id)
      if (err) throw err
      setSubscription(sub)
    } catch (err) {
      console.error('Error loading subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      setActionLoading(true)
      setError('')
      
      if (!profile?.stripe_customer_id) {
        throw new Error('No customer ID found')
      }

      const { url, error: portalError } = await createPortalSession(
        profile.stripe_customer_id
      )

      if (portalError) throw portalError

      // Redirect to Stripe portal
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to open billing portal')
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll keep premium access until the end of your billing period.')) {
      return
    }

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      const { error: cancelError } = await cancelSubscription(subscription.stripe_subscription_id)
      if (cancelError) throw cancelError

      setSuccess('✓ Subscription canceled. You\'ll have access until the end of your billing period.')
      await loadSubscription()
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      const { error: reactivateError } = await reactivateSubscription(subscription.stripe_subscription_id)
      if (reactivateError) throw reactivateError

      setSuccess('✓ Subscription reactivated!')
      await loadSubscription()
    } catch (err) {
      setError(err.message || 'Failed to reactivate subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="subscription-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Subscription Management</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="subscription-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading subscription...</p>
            </div>
          ) : isPremium ? (
            <div className="premium-status">
              <div className="status-badge premium-badge">
                👑 PREMIUM ACTIVE
              </div>

              <div className="subscription-details">
                <h3>Current Plan</h3>
                <div className="plan-info">
                  <div className="plan-name">Premium Membership</div>
                  <div className="plan-price">$9.99 / month</div>
                </div>

                {subscription && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Status:</span>
                      <span className="info-value status-active">
                        {subscription.cancel_at_period_end ? '⚠️ Canceling' : '✓ Active'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Next billing date:</span>
                      <span className="info-value">
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  </>
                )}

                <div className="premium-features-list">
                  <h4>Your Premium Benefits:</h4>
                  <ul>
                    <li>✓ Unlimited coding problems</li>
                    <li>✓ 2x XP rewards</li>
                    <li>✓ All premium towers</li>
                    <li>✓ Ad-free experience</li>
                    <li>✓ Priority matchmaking</li>
                  </ul>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="action-buttons">
                <button 
                  className="btn-primary" 
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                >
                  🔧 Manage Billing
                </button>
                
                {subscription?.cancel_at_period_end ? (
                  <button 
                    className="btn-secondary" 
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                  >
                    ♻️ Reactivate Subscription
                  </button>
                ) : (
                  <button 
                    className="btn-danger" 
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                  >
                    ❌ Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="free-status">
              <div className="status-badge free-badge">
                🆓 FREE PLAN
              </div>

              <div className="upgrade-prompt">
                <h3>You're on the Free Plan</h3>
                <p>Upgrade to Premium to unlock all features!</p>

                <div className="free-limits">
                  <h4>Current Limitations:</h4>
                  <ul>
                    <li>⚠️ 50 problem limit</li>
                    <li>⚠️ Standard XP rates</li>
                    <li>⚠️ Basic towers only</li>
                    <li>⚠️ Contains ads</li>
                  </ul>
                </div>

                <button className="btn-upgrade" onClick={onUpgrade}>
                  ⚡ Upgrade to Premium
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
