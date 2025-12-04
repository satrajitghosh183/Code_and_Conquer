import { useNavigate } from 'react-router-dom'
import { useNotifications, NOTIFICATION_TYPES } from '../contexts/NotificationContext'
import { usePayment } from '../contexts/PaymentContext'
import { 
  X, 
  Bell, 
  Trophy, 
  Crown, 
  Target, 
  CheckCircle,
  ChevronRight,
  Trash2,
  Clock
} from 'lucide-react'
import './NotificationPanel.css'

export default function NotificationPanel({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification,
    clearAllNotifications 
  } = useNotifications()
  const { openPricingModal } = usePayment()

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.DAILY_CHALLENGE:
        return <Target size={20} className="notification-icon challenge" />
      case NOTIFICATION_TYPES.LEADERBOARD:
        return <Trophy size={20} className="notification-icon leaderboard" />
      case NOTIFICATION_TYPES.PRO_PLAN:
        return <Crown size={20} className="notification-icon pro" />
      case NOTIFICATION_TYPES.ACHIEVEMENT:
        return <CheckCircle size={20} className="notification-icon achievement" />
      default:
        return <Bell size={20} className="notification-icon system" />
    }
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    
    if (notification.type === NOTIFICATION_TYPES.PRO_PLAN) {
      openPricingModal?.()
      onClose()
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl)
      onClose()
    }
  }

  const handleDismiss = (e, notificationId) => {
    e.stopPropagation()
    dismissNotification(notificationId)
  }

  if (!isOpen) return null

  return (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <div className="notification-panel-title">
          <Bell size={18} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="notification-panel-actions">
          {notifications.length > 0 && (
            <>
              <button 
                className="panel-action-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCircle size={16} />
              </button>
              <button 
                className="panel-action-btn"
                onClick={clearAllNotifications}
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button className="panel-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notification-panel-content">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <Bell size={48} strokeWidth={1} />
            <p>You're all caught up!</p>
            <span>No new notifications</span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''} priority-${notification.priority}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    <span className="notification-time">
                      <Clock size={12} />
                      {getTimeAgo(notification.timestamp)}
                    </span>
                    {notification.discount && (
                      <span className="notification-discount">{notification.discount} OFF</span>
                    )}
                  </div>
                </div>

                <div className="notification-actions">
                  {notification.actionLabel && (
                    <span className="notification-action-hint">
                      <ChevronRight size={16} />
                    </span>
                  )}
                  <button 
                    className="dismiss-btn"
                    onClick={(e) => handleDismiss(e, notification.id)}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                {!notification.read && <div className="unread-indicator" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-panel-footer">
          <span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}

