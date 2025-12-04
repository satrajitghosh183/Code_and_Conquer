/**
 * Reusable loading spinner component with multiple variants
 */

const LoadingSpinner = ({ 
  size = 'medium', 
  variant = 'primary',
  fullScreen = false,
  message = null 
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 64
  }
  
  const spinnerSize = sizeMap[size] || sizeMap.medium
  
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: spinnerSize,
        height: spinnerSize,
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          border: `${spinnerSize / 10}px solid ${variant === 'primary' ? '#2a2a4a' : 'rgba(255,255,255,0.1)'}`,
          borderTop: `${spinnerSize / 10}px solid ${variant === 'primary' ? '#ff4757' : '#ffffff'}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
      {message && (
        <p style={{
          color: '#8892b0',
          fontSize: size === 'small' ? '12px' : '14px',
          margin: 0,
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
  
  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 15, 26, 0.9)',
        zIndex: 9999
      }}>
        {content}
      </div>
    )
  }
  
  return content
}

/**
 * Page loading component for route transitions
 */
export const PageLoader = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    backgroundColor: '#0f0f1a'
  }}>
    <LoadingSpinner size="large" message={message} />
  </div>
)

/**
 * Button loading state
 */
export const ButtonLoader = () => (
  <LoadingSpinner size="small" variant="light" />
)

/**
 * Skeleton loader for content placeholders
 */
export const Skeleton = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  style = {}
}) => (
  <div style={{
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4a 50%, #1a1a2e 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style
  }}>
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
)

/**
 * Card skeleton for loading states
 */
export const CardSkeleton = () => (
  <div style={{
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2a4a'
  }}>
    <Skeleton width="60%" height="24px" style={{ marginBottom: '12px' }} />
    <Skeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
    <Skeleton width="80%" height="16px" style={{ marginBottom: '16px' }} />
    <div style={{ display: 'flex', gap: '8px' }}>
      <Skeleton width="60px" height="24px" borderRadius="12px" />
      <Skeleton width="80px" height="24px" borderRadius="12px" />
    </div>
  </div>
)

export default LoadingSpinner

