import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [oauthError, setOauthError] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
      }
      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // First, check if there's a hash with access_token (OAuth callback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const errorParam = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Also check query params for errors
        const queryParams = new URLSearchParams(window.location.search)
        const queryError = queryParams.get('error')
        const queryErrorDesc = queryParams.get('error_description')

        // Handle OAuth errors
        if (errorParam || queryError) {
          console.error('OAuth error:', errorParam || queryError, errorDescription || queryErrorDesc)
          if (mounted) {
            setOauthError(parseOAuthError(errorParam || queryError, errorDescription || queryErrorDesc))
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        // If we have tokens in the URL, let Supabase handle them
        if (accessToken && refreshToken) {
          console.log('OAuth tokens detected in URL, setting session...')
          
          // Set the session manually from the URL tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Error setting session from OAuth:', sessionError)
            if (mounted) {
              setOauthError({
                type: 'session_error',
                message: 'Failed to complete sign in. Please try again.',
                provider: null
              })
            }
          } else if (sessionData?.session) {
            console.log('Session set successfully from OAuth')
            if (mounted) {
              setUser(sessionData.session.user)
              await loadProfile(sessionData.session.user.id)
            }
          }

          // Clean the URL
          window.history.replaceState({}, '', window.location.pathname)
        } else {
          // No OAuth tokens, check for existing session
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error getting session:', error)
          }

          if (session?.user && mounted) {
            console.log('Existing session found:', session.user.email)
            setUser(session.user)
            await loadProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
        setOauthError(null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      } else if (event === 'USER_UPDATED' && session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Parse OAuth errors into user-friendly messages
  const parseOAuthError = (error, description) => {
    const desc = description?.toLowerCase() || ''
    const err = error?.toLowerCase() || ''
    
    if (desc.includes('email already registered') || 
        desc.includes('user already registered') ||
        err.includes('user_already_exists')) {
      return {
        type: 'account_exists',
        message: 'An account with this email already exists. Please sign in with your email and password instead.',
        provider: null
      }
    }
    
    if (desc.includes('identity not found') || err.includes('identity_not_found')) {
      return {
        type: 'not_linked',
        message: 'This account is not linked to this provider. Please sign in with your email and password.',
        provider: null
      }
    }
    
    if (err.includes('access_denied') || desc.includes('access_denied')) {
      return {
        type: 'access_denied',
        message: 'Access was denied. Please try again or use a different sign-in method.',
        provider: null
      }
    }

    if (err.includes('server_error') || desc.includes('server_error')) {
      return {
        type: 'server_error',
        message: 'Server error occurred. Please try again later.',
        provider: null
      }
    }
    
    return {
      type: 'unknown',
      message: description || error || 'An error occurred during sign in. Please try again.',
      provider: null
    }
  }

  const clearOAuthError = () => setOauthError(null)

  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setProfile(null)
      setUser(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      setOauthError(null)
      console.log('Starting Google OAuth...')
      console.log('Redirect URL:', window.location.origin)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        console.error('Google OAuth initiation error:', error)
        throw error
      }
      
      console.log('Google OAuth initiated:', data)
      return { data, error: null }
    } catch (error) {
      console.error('Google OAuth error:', error)
      const parsed = parseOAuthError(error.message, error.message)
      parsed.provider = 'Google'
      setOauthError(parsed)
      return { data: null, error: parsed }
    }
  }

  const signInWithGithub = async () => {
    try {
      setOauthError(null)
      console.log('Starting GitHub OAuth...')
      console.log('Redirect URL:', window.location.origin)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
          scopes: 'read:user user:email'
        }
      })
      
      if (error) {
        console.error('GitHub OAuth initiation error:', error)
        throw error
      }
      
      console.log('GitHub OAuth initiated:', data)
      return { data, error: null }
    } catch (error) {
      console.error('GitHub OAuth error:', error)
      const parsed = parseOAuthError(error.message, error.message)
      parsed.provider = 'GitHub'
      setOauthError(parsed)
      return { data: null, error: parsed }
    }
  }

  const signInWithDiscord = async () => {
    try {
      setOauthError(null)
      console.log('Starting Discord OAuth...')
      console.log('Redirect URL:', window.location.origin)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
          scopes: 'identify email'
        }
      })
      
      if (error) {
        console.error('Discord OAuth initiation error:', error)
        throw error
      }
      
      console.log('Discord OAuth initiated:', data)
      return { data, error: null }
    } catch (error) {
      console.error('Discord OAuth error:', error)
      const parsed = parseOAuthError(error.message, error.message)
      parsed.provider = 'Discord'
      setOauthError(parsed)
      return { data: null, error: parsed }
    }
  }

  const uploadAvatar = async (file) => {
    try {
      if (!user) throw new Error('No user logged in')

      const fileExt = file.name.split('.').pop()
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
      
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        throw new Error('Invalid file type. Please upload an image (jpg, png, gif, webp)')
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 2MB')
      }

      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      await loadProfile(user.id)

      return { url: publicUrl, error: null }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      return { url: null, error }
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) throw error

      await loadProfile(user.id)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithGithub,
    signInWithDiscord,
    uploadAvatar,
    updateProfile,
    loading,
    oauthError,
    clearOAuthError,
    initialized
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
