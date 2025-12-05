import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

const NotificationContext = createContext()

// Notification types
export const NOTIFICATION_TYPES = {
  DAILY_CHALLENGE: 'daily_challenge',
  LEADERBOARD: 'leaderboard',
  PRO_PLAN: 'pro_plan',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system'
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Generate notifications based on user state and app events
  const generateNotifications = useCallback(async () => {
    if (!user) return

    const newNotifications = []
    const now = new Date()
    const today = now.toDateString()

    // Check localStorage for dismissed notifications
    const dismissedKey = `dismissed_notifications_${user.id}`
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}')

    // 1. Daily Challenge Notification
    const dailyChallengeKey = `daily_challenge_${today}`
    if (!dismissed[dailyChallengeKey]) {
      try {
        const response = await api.get(`/dashboard/daily-challenge/${user.id}`)
        if (response.data && !response.data.completed) {
          newNotifications.push({
            id: dailyChallengeKey,
            type: NOTIFICATION_TYPES.DAILY_CHALLENGE,
            title: 'Daily Challenge Available',
            message: `Today's challenge: "${response.data.problem?.title || 'New Problem'}". Complete it for bonus XP and coins!`,
            timestamp: now.toISOString(),
            read: false,
            actionUrl: `/problems/${response.data.problem?.id}`,
            actionLabel: 'Start Challenge',
            priority: 'high'
          })
        }
      } catch (error) {
        // Silently fail - daily challenge might not be available
      }
    }

    // 2. Pro Plan Promotion (show once per week)
    const lastPromoDate = localStorage.getItem(`last_pro_promo_${user.id}`)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const proPromoKey = `pro_promo_${now.toISOString().split('T')[0]}`
    
    if (!dismissed[proPromoKey] && (!lastPromoDate || new Date(lastPromoDate) < oneWeekAgo)) {
      newNotifications.push({
        id: proPromoKey,
        type: NOTIFICATION_TYPES.PRO_PLAN,
        title: 'Upgrade to Pro',
        message: 'Get 2x XP, exclusive towers, and priority matchmaking. Limited time: 20% off!',
        timestamp: now.toISOString(),
        read: false,
        actionUrl: null,
        actionLabel: 'View Plans',
        priority: 'medium',
        discount: '20%'
      })
      localStorage.setItem(`last_pro_promo_${user.id}`, now.toISOString())
    }

    // 3. Leaderboard Changes
    try {
      const leaderboardKey = `leaderboard_check_${today}`
      if (!dismissed[leaderboardKey]) {
        const response = await api.get('/leaderboard')
        if (response.data && response.data.length > 0) {
          const userRank = response.data.findIndex(entry => entry.user_id === user.id)
          const lastRank = parseInt(localStorage.getItem(`last_rank_${user.id}`) || '-1')
          
          if (userRank !== -1) {
            const currentRank = userRank + 1
            localStorage.setItem(`last_rank_${user.id}`, currentRank.toString())
            
            if (lastRank !== -1 && currentRank !== lastRank) {
              const improved = currentRank < lastRank
              newNotifications.push({
                id: leaderboardKey,
                type: NOTIFICATION_TYPES.LEADERBOARD,
                title: improved ? 'Rank Up!' : 'Rank Changed',
                message: improved 
                  ? `Congratulations! You moved up to #${currentRank} on the leaderboard!`
                  : `You're now at #${currentRank}. Keep coding to climb back up!`,
                timestamp: now.toISOString(),
                read: false,
                actionUrl: '/leaderboard',
                actionLabel: 'View Leaderboard',
                priority: improved ? 'high' : 'low'
              })
            } else if (currentRank <= 10 && lastRank === -1) {
              newNotifications.push({
                id: `top10_${today}`,
                type: NOTIFICATION_TYPES.LEADERBOARD,
                title: 'Top 10!',
                message: `You're ranked #${currentRank}! Keep up the amazing work!`,
                timestamp: now.toISOString(),
                read: false,
                actionUrl: '/leaderboard',
                actionLabel: 'View Leaderboard',
                priority: 'high'
              })
            }
          }
        }
      }
    } catch (error) {
      // Silently fail
    }

    // 4. Welcome back notification (if last login was > 24 hours ago)
    const lastLogin = localStorage.getItem(`last_login_${user.id}`)
    const welcomeKey = `welcome_${today}`
    if (!dismissed[welcomeKey] && lastLogin) {
      const lastLoginDate = new Date(lastLogin)
      const hoursSinceLogin = (now - lastLoginDate) / (1000 * 60 * 60)
      
      if (hoursSinceLogin > 24) {
        newNotifications.push({
          id: welcomeKey,
          type: NOTIFICATION_TYPES.SYSTEM,
          title: 'Welcome Back!',
          message: 'Ready to conquer some code? Your daily streak awaits!',
          timestamp: now.toISOString(),
          read: false,
          actionUrl: '/problems',
          actionLabel: 'Start Coding',
          priority: 'low'
        })
      }
    }
    localStorage.setItem(`last_login_${user.id}`, now.toISOString())

    // 5. Weekend Challenge Notification (Fri-Sun)
    const dayOfWeek = now.getDay()
    const weekendKey = `weekend_challenge_${now.toISOString().split('T')[0]}`
    if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && !dismissed[weekendKey]) {
      newNotifications.push({
        id: weekendKey,
        type: NOTIFICATION_TYPES.DAILY_CHALLENGE,
        title: 'Weekend Warrior',
        message: 'Complete 3 problems this weekend for double XP rewards!',
        timestamp: now.toISOString(),
        read: false,
        actionUrl: '/problems',
        actionLabel: 'Browse Problems',
        priority: 'medium'
      })
    }

    // Sort by priority and timestamp
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    newNotifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return new Date(b.timestamp) - new Date(a.timestamp)
    })

    setNotifications(newNotifications)
    setUnreadCount(newNotifications.filter(n => !n.read).length)
  }, [user])

  // Load notifications on mount and user change
  useEffect(() => {
    if (user) {
      generateNotifications()
      
      // Refresh notifications every 5 minutes
      const interval = setInterval(generateNotifications, 5 * 60 * 1000)
      return () => clearInterval(interval)
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user, generateNotifications])

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // Dismiss notification
  const dismissNotification = useCallback((notificationId) => {
    if (!user) return
    
    const dismissedKey = `dismissed_notifications_${user.id}`
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}')
    dismissed[notificationId] = true
    localStorage.setItem(dismissedKey, JSON.stringify(dismissed))
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [user])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    if (!user) return
    
    const dismissedKey = `dismissed_notifications_${user.id}`
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}')
    
    notifications.forEach(n => {
      dismissed[n.id] = true
    })
    
    localStorage.setItem(dismissedKey, JSON.stringify(dismissed))
    setNotifications([])
    setUnreadCount(0)
  }, [user, notifications])

  // Add a custom notification (for real-time events)
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: `custom_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'medium',
      ...notification
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
  }, [])

  // Refresh notifications manually
  const refreshNotifications = useCallback(() => {
    generateNotifications()
  }, [generateNotifications])

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    addNotification,
    refreshNotifications,
    NOTIFICATION_TYPES
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext

