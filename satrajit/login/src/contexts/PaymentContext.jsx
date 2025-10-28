import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './AuthContext'

const PaymentContext = createContext({})

export const usePayment = () => {
  const context = useContext(PaymentContext)
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider')
  }
  return context
}

export const PaymentProvider = ({ children }) => {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check subscription status on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus()
    } else {
      setIsPremium(false)
      setSubscription(null)
    }
  }, [user])

  const checkSubscriptionStatus = async () => {
    try {
      if (!user) return

      // Fetch subscription from your database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSubscription(data)
        // Check if subscription is active
        setIsPremium(data.status === 'active' || data.status === 'trialing')
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const createCheckoutSession = async () => {
    setLoading(true)
    try {
      if (!user) {
        throw new Error('You must be logged in to subscribe')
      }

      // Call your Express backend to create a Stripe Checkout session
      const response = await fetch('http://localhost:3000/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create checkout session')
      }

      const { sessionId, url } = await response.json()
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      }

      return { sessionId, error: null }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      return { sessionId: null, error }
    } finally {
      setLoading(false)
    }
  }

  const cancelSubscription = async () => {
    setLoading(true)
    try {
      if (!subscription) {
        throw new Error('No active subscription found')
      }

      const response = await fetch('http://localhost:3000/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel subscription')
      }

      await checkSubscriptionStatus()
      return { error: null }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const createCustomerPortalSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Customer Portal
      if (url) {
        window.location.href = url
      }

      return { error: null }
    } catch (error) {
      console.error('Error creating portal session:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    isPremium,
    subscription,
    loading,
    createCheckoutSession,
    cancelSubscription,
    createCustomerPortalSession,
    checkSubscriptionStatus,
  }

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  )
}
