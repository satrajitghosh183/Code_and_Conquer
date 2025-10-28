import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './ProfileSettings.css'

export default function ProfileSettings({ onClose }) {
  const { user, profile, uploadAvatar, updateProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [username, setUsername] = useState(profile?.username || '')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState(profile?.bio || '')

  const handleFileUpload = async (e) => {
    try {
      setError('')
      setSuccess('')
      setUploading(true)

      const file = e.target.files?.[0]
      if (!file) return

      const { url, error } = await uploadAvatar(file)

      if (error) throw error

      setSuccess('Profile picture updated!')
    } catch (error) {
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const { error } = await updateProfile({
        username,
        full_name: fullName,
        bio
      })

      if (error) throw error
      setSuccess('Profile updated!')
    } catch (error) {
      setError(error.message)
    }
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️Profile Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="profile-settings">
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" />
              ) : (
                <span>{(username || user?.email || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <label className="upload-btn">
              {uploading ? '⏳ Uploading...' : '📷 Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <p className="upload-hint">Max size: 2MB (JPG, PNG, GIF, WebP)</p>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}