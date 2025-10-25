// import { createContext, useContext, useEffect, useState } from 'react'
// import { supabase } from '../supabaseClient'

// const AuthContext = createContext({})

// export const useAuth = () => {
//   const context = useContext(AuthContext)
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider')
//   }
//   return context
// }

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     // Check active session
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setUser(session?.user ?? null)
//       setLoading(false)
//     })

//     // Listen for auth changes
//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null)
//       setLoading(false)
//     })

//     return () => subscription.unsubscribe()
//   }, [])

//   const signUp = async (email, password, username) => {
//     try {
//       const { data, error } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           data: {
//             username: username
//           }
//         }
//       })
//       if (error) throw error
//       return { data, error: null }
//     } catch (error) {
//       return { data: null, error }
//     }
//   }

//   const signIn = async (email, password) => {
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password
//       })
//       if (error) throw error
//       return { data, error: null }
//     } catch (error) {
//       return { data: null, error }
//     }
//   }

//   const signOut = async () => {
//     try {
//       const { error } = await supabase.auth.signOut()
//       if (error) throw error
//       return { error: null }
//     } catch (error) {
//       return { error }
//     }
//   }

//   const signInWithGoogle = async () => {
//     try {
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo: `${window.location.origin}/dashboard`
//         }
//       })
//       if (error) throw error
//       return { data, error: null }
//     } catch (error) {
//       return { data: null, error }
//     }
//   }

//   const signInWithGithub = async () => {
//     try {
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: 'github',
//         options: {
//           redirectTo: `${window.location.origin}/dashboard`
//         }
//       })
//       if (error) throw error
//       return { data, error: null }
//     } catch (error) {
//       return { data: null, error }
//     }
//   }

//   const signInWithDiscord = async () => {
//     try {
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: 'discord',
//         options: {
//           redirectTo: `${window.location.origin}/dashboard`
//         }
//       })
//       if (error) throw error
//       return { data, error: null }
//     } catch (error) {
//       return { data: null, error }
//     }
//   }

//   const value = {
//     user,
//     signUp,
//     signIn,
//     signOut,
//     signInWithGoogle,
//     signInWithGithub,
//     signInWithDiscord,
//     loading
//   }

//   return (
//     <AuthContext.Provider value={value}>
//       {!loading && children}
//     </AuthContext.Provider>
//   )
// }



import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
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
          redirectTo: `${window.location.origin}/dashboard`
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
          redirectTo: `${window.location.origin}/dashboard`
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
          redirectTo: `${window.location.origin}/dashboard`
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

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

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
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}