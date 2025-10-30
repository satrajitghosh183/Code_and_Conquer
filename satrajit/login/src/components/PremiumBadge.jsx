import { usePayment } from '../contexts/PaymentContext'
import './PremiumBadge.css'

export default function PremiumBadge() {
  const { isPremium } = usePayment()

  if (!isPremium) return null

  return (
    <div className="premium-badge-container">
      <div className="premium-badge">
        <span className="premium-icon"></span>
        <span className="premium-text">Premium</span>
      </div>
    </div>
  )
}