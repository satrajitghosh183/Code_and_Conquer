import { usePayment } from '../contexts/PaymentContext'
import { STRIPE_CONFIG } from '../config/stripe'
import './PricingModal.css'

export default function PricingModal({ onClose }) {
  const { createCheckoutSession, loading, isPremium } = usePayment()

  const handleUpgrade = async () => {
    const { error } = await createCheckoutSession()
    if (error) {
      alert('Failed to start checkout. Please try again.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div className="pricing-header">
          <h2>⚔️ Choose Your Path</h2>
          <p>Upgrade to Premium and dominate the leaderboard!</p>
        </div>

        <div className="pricing-tiers">
          {/* Free Tier */}
          <div className="tier-card free">
            <div className="tier-badge">Current Plan</div>
            <h3>🆓 Free Warrior</h3>
            <div className="price">
              <span className="amount">$0</span>
              <span className="period">/month</span>
            </div>
            <ul className="features">
              <li>✅ 50 coding problems</li>
              <li>✅ Standard XP rewards</li>
              <li>✅ Basic towers</li>
              <li>❌ Limited matchmaking</li>
              <li>❌ Contains ads</li>
            </ul>
            <button className="tier-btn current" disabled>
              Current Plan
            </button>
          </div>

          {/* Premium Tier */}
          <div className="tier-card premium">
            <div className="tier-badge popular">⭐ Most Popular</div>
            <h3>👑 Premium Champion</h3>
            <div className="price">
              <span className="amount">${STRIPE_CONFIG.products.premium.price}</span>
              <span className="period">/month</span>
            </div>
            <ul className="features">
              {STRIPE_CONFIG.products.premium.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <button 
              className="tier-btn premium-btn" 
              onClick={handleUpgrade}
              disabled={loading || isPremium}
            >
              {loading ? '⏳ Loading...' : isPremium ? '✅ Subscribed' : '🚀 Upgrade Now'}
            </button>
            <p className="money-back">💰 30-day money-back guarantee</p>
          </div>
        </div>

        <div className="pricing-footer">
          <p>🔒 Secure payment powered by Stripe</p>
          <p>Cancel anytime • No hidden fees</p>
        </div>
      </div>
    </div>
  )
}