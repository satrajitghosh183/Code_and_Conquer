import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isPremiumUser } from '../utils/stripe'
import './PremiumBanner.css'

export default function PremiumBanner({ onUpgradeClick }) {
  const { profile } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show banner if user is premium or has dismissed it
  if (isPremiumUser(profile) || isDismissed) {
    return null
  }

  return (
    <div className="premium-banner">
      <button 
        className="banner-dismiss" 
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss banner"
      >
        ✕
      </button>
      
      <div className="banner-content">
        <div className="banner-icon">👑</div>
        <div className="banner-text">
          <h3>Unlock Premium Features!</h3>
          <p>Get unlimited problems, 2x XP, and exclusive towers for just $9.99/month</p>
        </div>
        <button className="banner-cta" onClick={onUpgradeClick}>
          ⚡ Upgrade Now
        </button>
      </div>
    </div>
  )
}
