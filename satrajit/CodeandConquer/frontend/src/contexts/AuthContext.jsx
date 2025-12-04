import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'

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
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        console.log('AuthProvider: Initializing...')
        
        // First check if there are OAuth tokens in the URL hash
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          console.log('AuthProvider: Found tokens in URL hash, will be processed by callback handler')
          // Don't process here - let the callback handler do it
          // Just mark as not loading so routing can happen
          if (mounted) {
            setLoading(false)
            setInitialized(true)
          }
          return
        }
        
        // Check active session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error)
        }
        
        console.log('AuthProvider: Session check complete, user:', session?.user?.email || 'none')
        
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            loadProfile(session.user.id)
          }
          setLoading(false)
          setInitialized(true)
        }
      } catch (e) {
        console.error('AuthProvider: Init error:', e)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }
    
    initAuth()

    // Listen for auth changes (including OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthProvider: Auth state changed:', event, session?.user?.email || 'no user')
      
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
        setInitialized(true)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // If profile doesn't exist (error code PGRST116), try to create it
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, try to create it
        const user = await supabase.auth.getUser()
        const username = user.data?.user?.user_metadata?.username || 
                        user.data?.user?.email?.split('@')[0] || 
                        `user_${userId.slice(0, 8)}`
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          // If we can't create it, just set profile to null and continue
          console.warn('Could not create profile (this is okay if table doesn\'t exist):', createError.message)
          setProfile(null)
          return
        }
        
        setProfile(newProfile)
        return
      }

      if (error) {
        // For other errors, log but don't crash
        console.warn('Error loading profile:', error.message)
        setProfile(null)
        return
      }
      
      setProfile(data)
    } catch (error) {
      // Catch any unexpected errors and continue
      console.warn('Error in loadProfile:', error.message)
      setProfile(null)
    }
  }

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
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithGithub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithDiscord = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const uploadAvatar = async (file) => {
    try {
      if (!user) throw new Error('No user logged in')

      // Validate file
      const fileExt = file.name.split('.').pop()
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
      
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        throw new Error('Invalid file type. Please upload an image (jpg, png, gif, webp)')
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 2MB')
      }

      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage (only if avatars bucket exists)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // If storage bucket doesn't exist, that's okay
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          return { url: null, error: new Error('Avatar storage not configured. Please set up the avatars bucket in Supabase Storage.') }
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL (only if profiles table exists)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) {
        // If profiles table doesn't exist or update fails, that's okay
        console.warn('Could not update profile with avatar URL:', updateError.message)
      }

      // Reload profile
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

      // First check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create profile first
        const username = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: username,
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createError) throw createError
      } else {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', user.id)

        if (error) throw error
      }

      await loadProfile(user.id)
      return { error: null }
    } catch (error) {
      console.error('Error updating profile:', error)
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
    initialized
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

