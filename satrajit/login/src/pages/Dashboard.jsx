// import { useState } from 'react'
// import { useAuth } from '../contexts/AuthContext'
// import { useNavigate } from 'react-router-dom'
// import ProfileSettings from '../components/ProfileSettings'
// import './Dashboard.css'

// export default function Dashboard() {
//   const { user, profile, signOut } = useAuth()
//   const navigate = useNavigate()
//   const [showSettings, setShowSettings] = useState(false)

//   const handleSignOut = async () => {
//     const { error } = await signOut()
//     if (!error) {
//       navigate('/login')
//     }
//   }

//   const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
//   const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0]

//   return (
//     <>
//       <div className="dashboard">
//         <nav className="dashboard-nav">
//           <h1>⚔️ Code & Conquer</h1>
//           <div className="user-info">
//             <div className="user-avatar" onClick={() => setShowSettings(true)}>
//               {avatarUrl ? (
//                 <img src={avatarUrl} alt="Avatar" />
//               ) : (
//                 <span>{(displayName || 'U')[0].toUpperCase()}</span>
//               )}
//             </div>
//             <span className="username">{displayName}</span>
//             <button onClick={() => setShowSettings(true)} className="settings-btn">
//               ⚙️ Settings
//             </button>
//             <button onClick={handleSignOut} className="signout-btn">
//               Sign Out
//             </button>
//           </div>
//         </nav>
        
//         <div className="dashboard-content">
//           <div className="welcome-section">
//             <h2>Welcome Back, {displayName}!</h2>
//             <p>Ready to conquer some code challenges?</p>
//           </div>

//           <div className="stats-grid">
//             <div className="stat-card">
//               <div className="stat-icon">🏆</div>
//               <div className="stat-info">
//                 <h3>0</h3>
//                 <p>Challenges Completed</p>
//               </div>
//             </div>
//             <div className="stat-card">
//               <div className="stat-icon">⚡</div>
//               <div className="stat-info">
//                 <h3>0</h3>
//                 <p>Current Streak</p>
//               </div>
//             </div>
//             <div className="stat-card">
//               <div className="stat-icon">🎖️</div>
//               <div className="stat-info">
//                 <h3>Beginner</h3>
//                 <p>Rank</p>
//               </div>
//             </div>
//           </div>

//           <div className="challenges-section">
//             <h3>Start Your Journey</h3>
//             <div className="challenge-list">
//               <div className="challenge-card">
//                 <div className="challenge-header">
//                   <span className="difficulty easy">Easy</span>
//                   <span className="points">+10 XP</span>
//                 </div>
//                 <h4>Two Sum</h4>
//                 <p>Find two numbers that add up to a target value</p>
//                 <button className="start-btn">Start Challenge</button>
//               </div>
//               <div className="challenge-card">
//                 <div className="challenge-header">
//                   <span className="difficulty medium">Medium</span>
//                   <span className="points">+25 XP</span>
//                 </div>
//                 <h4>Reverse Linked List</h4>
//                 <p>Reverse a singly linked list iteratively or recursively</p>
//                 <button className="start-btn">Start Challenge</button>
//               </div>
//               <div className="challenge-card">
//                 <div className="challenge-header">
//                   <span className="difficulty hard">Hard</span>
//                   <span className="points">+50 XP</span>
//                 </div>
//                 <h4>Merge K Sorted Lists</h4>
//                 <p>Merge K sorted linked lists into one sorted list</p>
//                 <button className="start-btn">Start Challenge</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
//     </>
//   )
// }



import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePayment } from '../contexts/PaymentContext'
import { useNavigate } from 'react-router-dom'
import ProfileSettings from '../components/ProfileSettings'
import PricingModal from '../components/PricingModal'
import PremiumBadge from '../components/PremiumBadge'
import './Dashboard.css'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const { isPremium } = usePayment()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [showPricing, setShowPricing] = useState(false)

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
    }
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0]

  return (
    <>
      <div className="dashboard">
        <nav className="dashboard-nav">
          <h1>⚔️ Code & Conquer</h1>
          <div className="user-info">
            <div className="user-avatar" onClick={() => setShowSettings(true)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" />
              ) : (
                <span>{(displayName || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <span className="username">
              {displayName}
              {isPremium && <PremiumBadge />}
            </span>
            {!isPremium && (
              <button onClick={() => setShowPricing(true)} className="upgrade-btn">
                Upgrade
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="settings-btn">
              Settings
            </button>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
        </nav>
        
        <div className="dashboard-content">
          <div className="welcome-section">
            <h2>Welcome Back, {displayName}!</h2>
            <p>Ready to conquer some code challenges?</p>
            {!isPremium && (
              <div className="premium-cta">
                <p>Unlock unlimited challenges and 2x XP with Premium!</p>
                <button onClick={() => setShowPricing(true)} className="cta-btn">
                  See Premium Benefits
                </button>
              </div>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <h3>0</h3>
                <p>Challenges Completed</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <h3>0</h3>
                <p>Current Streak</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <h3>{isPremium ? 'Premium' : 'Beginner'}</h3>
                <p>Rank</p>
              </div>
            </div>
          </div>

          <div className="challenges-section">
            <h3>Start Your Journey</h3>
            <div className="challenge-list">
              <div className="challenge-card">
                <div className="challenge-header">
                  <span className="difficulty easy">Easy</span>
                  <span className="points">+{isPremium ? 20 : 10} XP</span>
                </div>
                <h4>Two Sum</h4>
                <p>Find two numbers that add up to a target value</p>
                <button className="start-btn">Start Challenge</button>
              </div>
              <div className="challenge-card">
                <div className="challenge-header">
                  <span className="difficulty medium">Medium</span>
                  <span className="points">+{isPremium ? 50 : 25} XP</span>
                </div>
                <h4>Reverse Linked List</h4>
                <p>Reverse a singly linked list iteratively or recursively</p>
                <button className="start-btn">Start Challenge</button>
              </div>
              <div className={`challenge-card ${!isPremium ? 'locked' : ''}`}>
                <div className="challenge-header">
                  <span className="difficulty hard">Hard</span>
                  <span className="points">+{isPremium ? 100 : 50} XP</span>
                </div>
                <h4>Merge K Sorted Lists {!isPremium && ''}</h4>
                <p>Merge K sorted linked lists into one sorted list</p>
                {isPremium ? (
                  <button className="start-btn">Start Challenge</button>
                ) : (
                  <button 
                    className="start-btn locked-btn" 
                    onClick={() => setShowPricing(true)}
                  >
                    Unlock with Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  )
}

