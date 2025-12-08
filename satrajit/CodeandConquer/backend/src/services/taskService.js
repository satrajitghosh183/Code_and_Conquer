// Task system service - manages tasks and calculates buffs
// Integrates with Todoist and Google Calendar APIs
// Now uses Supabase for task storage
import todoistService from './todoistService.js'
import calendarService from './calendarService.js'
import publicDatabaseService from './publicDatabaseService.js'
import database from '../config/database.js'
import { PUBLIC_TABLES } from '../config/supabasePublicSchema.js'
import { v4 as uuidv4 } from 'uuid'

class TaskService {
  constructor() {
    // Keep in-memory cache for integrations (tokens shouldn't be stored in DB)
    this.integrations = new Map() // playerId -> { todoistToken, calendarToken }
  }

  getIntegration(userId, type) {
    const integrations = this.integrations.get(userId) || {}
    if (type === 'google_calendar') {
      const tokenObj = integrations.calendarToken
      if (!tokenObj) return null
      // Return the full token object (with refresh_token and expires_at for token refresh)
      if (typeof tokenObj === 'string') {
        return { access_token: tokenObj, expires_at: Date.now() + 3600000 }
      }
      // Return full object including refresh_token
      return {
        access_token: tokenObj.access_token,
        refresh_token: tokenObj.refresh_token || null,
        expires_at: tokenObj.expires_at || Date.now() + 3600000
      }
    }
    if (type === 'todoist') {
      const token = integrations.todoistToken
      if (!token) return null
      return typeof token === 'string' ? { access_token: token } : { access_token: token.access_token }
    }
    return null
  }

  // Set integration tokens for a player (tokens stored in memory only for security)
  setIntegration(playerId, type, token) {
    if (!this.integrations.has(playerId)) {
      this.integrations.set(playerId, {})
    }
    const integrations = this.integrations.get(playerId)
    if (type === 'todoist') {
      integrations.todoistToken = typeof token === 'string' ? token : token.access_token
    } else if (type === 'google_calendar') {
      // Store full token object for Google Calendar (includes refresh_token)
      integrations.calendarToken = typeof token === 'string' 
        ? { access_token: token, expires_at: Date.now() + 3600000 } 
        : token
    }
    this.integrations.set(playerId, integrations)
    
    // Also store integration metadata in database (without tokens)
    if (publicDatabaseService.isAvailable()) {
      try {
        publicDatabaseService.query(PUBLIC_TABLES.TASK_INTEGRATIONS, {
          where: { user_id: playerId, integration_type: type }
        }).then(async (existing) => {
          if (existing && existing.length > 0) {
            await publicDatabaseService.update(PUBLIC_TABLES.TASK_INTEGRATIONS, existing[0].id, {
              is_active: true,
              updated_at: new Date().toISOString()
            })
          } else {
            await publicDatabaseService.insert(PUBLIC_TABLES.TASK_INTEGRATIONS, {
              id: uuidv4(),
              user_id: playerId,
              integration_type: type,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }).catch(error => {
          console.warn('Could not save integration metadata to database:', error.message)
        })
      } catch (error) {
        console.warn('Error saving integration metadata:', error.message)
      }
    }
  }

  // Initialize default tasks for a player in database
  async initializeTasks(playerId) {
    if (!publicDatabaseService.isAvailable()) {
      return
    }

    try {
      // Check if user already has tasks
      const existingTasks = await publicDatabaseService.query(PUBLIC_TABLES.TASKS, {
        where: { user_id: playerId },
        limit: 1
      })

      // If no tasks exist, create default tasks
      if (!existingTasks || existingTasks.length === 0) {
        const defaultTasks = [
          {
            id: uuidv4(),
            user_id: playerId,
            title: 'Complete a coding challenge',
            description: 'Solve at least one problem today',
            category: 'STUDY',
            status: 'TODO',
            source: 'internal',
            created_at: new Date().toISOString(),
            due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: uuidv4(),
            user_id: playerId,
            title: 'Exercise for 30 minutes',
            description: 'Take a break and move your body',
            category: 'HEALTH',
            status: 'TODO',
            source: 'internal',
            created_at: new Date().toISOString()
          }
        ]

        // Insert default tasks
        for (const task of defaultTasks) {
          try {
            const result = await publicDatabaseService.insert(PUBLIC_TABLES.TASKS, task)
            // If insert returns null (table doesn't exist), skip silently
            if (!result) {
              return // Table doesn't exist, stop trying
            }
          } catch (error) {
            // Silently handle missing table errors
            if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204') {
              // Table or column doesn't exist - stop trying silently
              return
            }
            // Only log unexpected errors
            console.warn('Could not create default task:', error.message)
          }
        }
      }
    } catch (error) {
      // Silently handle missing table errors
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204') {
        // Table or column doesn't exist - skip silently
        return
      }
      // Only log unexpected errors
      console.warn('Error initializing tasks:', error.message)
      // Continue even if initialization fails
    }
  }

  // Get all tasks for a player (from all sources)
  async getTasks(playerId) {
    await this.initializeTasks(playerId)
    
    const allTasks = []
    
    // Get tasks from database
    if (publicDatabaseService.isAvailable()) {
      try {
        const dbTasks = await publicDatabaseService.query(PUBLIC_TABLES.TASKS, {
          where: { user_id: playerId },
          orderBy: { field: 'created_at', ascending: false }
        })
        
        // Map database tasks to our format
        allTasks.push(...(dbTasks || []).map(task => ({
          id: task.id,
          playerId: task.user_id,
          title: task.title,
          description: task.description || '',
          category: task.category || 'MISC',
          status: task.status || 'TODO',
          createdAt: task.created_at,
          dueAt: task.due_at || null,
          completedAt: task.completed_at || null,
          source: task.source || 'internal',
          externalId: task.external_id || null
        })))
      } catch (error) {
        // Silently handle missing table errors
        if (error.code === 'PGRST205' || error.code === '42P01') {
          // Table doesn't exist - continue silently
          // Don't log errors for missing tables
        } else {
          // Only log unexpected errors
          console.warn('Error fetching tasks from database:', error.message)
        }
        // Continue even if database fetch fails
      }
    }
    
    // Get tasks from integrations
    const integrations = this.integrations.get(playerId) || {}
    
    // Fetch from Todoist if integrated
    if (integrations.todoistToken) {
      try {
        const todoistTasks = await todoistService.getTasks(integrations.todoistToken)
        allTasks.push(...todoistTasks)
      } catch (error) {
        console.warn('Failed to fetch Todoist tasks:', error.message)
      }
    }

    // Fetch from Google Calendar if integrated - pass userId instead of token
    if (integrations.calendarToken) {
      try {
        // Pass userId instead of raw token — CalendarService will handle refresh
        const calendarTasks = await calendarService.getEvents(playerId);
        allTasks.push(...calendarTasks);
      } catch (error) {
        console.warn('Failed to fetch Google Calendar events:', error.message);
      }
    }
    
    // Sort by due date or creation date
    return allTasks.sort((a, b) => {
      const dateA = a.dueAt ? new Date(a.dueAt) : new Date(a.createdAt)
      const dateB = b.dueAt ? new Date(b.dueAt) : new Date(b.createdAt)
      return dateA - dateB
    })
  }

  // Create a new task in database
  async createTask(playerId, taskData) {
    await this.initializeTasks(playerId)
    
    const task = {
      id: uuidv4(),
      user_id: playerId,
      title: taskData.title,
      description: taskData.description || '',
      category: taskData.category || 'MISC',
      status: 'TODO',
      source: taskData.source || 'internal',
      external_id: taskData.externalId || null,
      created_at: new Date().toISOString(),
      due_at: taskData.dueAt || null,
      completed_at: null
    }

    // Push to Todoist if user has connected it
    const integrations = this.integrations.get(playerId) || {}
    if (integrations.todoistToken) {
      try {
        const todoistTask = await todoistService.createTask(integrations.todoistToken, task)
        if (todoistTask) {
          task.external_id = todoistTask.id       // Save Todoist task ID
          task.source = 'todoist'                 // Mark source
        }
      } catch (err) {
        console.warn('Failed to create task in Todoist:', err.message)
      }
    }
    
    // Push to Google Calendar if user has connected it
    if (this.getIntegration(playerId, 'google_calendar')) { 
      try { 
        const calendarEvent = await calendarService.createEvent(playerId, task); 
        if (calendarEvent?.id) { 
          task.external_id = calendarEvent.id; // make sure to match DB field
          task.source = 'google_calendar'; 
        } 
      } catch (err) { 
        console.warn('Failed to create task in Google Calendar:', err.message); 
      }
    }

    // Save to database if available
    if (publicDatabaseService.isAvailable()) {
      try {
        const createdTask = await publicDatabaseService.insert(PUBLIC_TABLES.TASKS, task)
        if (!createdTask) {
          // Table doesn't exist - fall back to in-memory
          return {
            id: task.id,
            playerId: task.user_id,
            title: task.title,
            description: task.description,
            category: task.category,
            status: task.status,
            createdAt: task.created_at,
            dueAt: task.due_at,
            completedAt: task.completed_at,
            source: task.source,
            externalId: task.external_id
          }
        }
        return {
          id: createdTask.id,
          playerId: createdTask.user_id,
          title: createdTask.title,
          description: createdTask.description || '',
          category: createdTask.category || 'MISC',
          status: createdTask.status || 'TODO',
          createdAt: createdTask.created_at,
          dueAt: createdTask.due_at || null,
          completedAt: createdTask.completed_at || null,
          source: createdTask.source || 'internal',
          externalId: createdTask.external_id || null
        }
      } catch (error) {
        // Silently handle missing table errors
        if (error.code === 'PGRST205' || error.code === '42P01') {
          // Table doesn't exist - fall back to in-memory
          // Don't throw error, just return in-memory task
        } else {
          // Only log unexpected errors
          console.error('Error creating task in database:', error)
          throw error
        }
      }
    }

    // Fallback to in-memory if database is not available
    return {
      id: task.id,
      playerId: task.user_id,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      createdAt: task.created_at,
      dueAt: task.due_at,
      completedAt: task.completed_at,
      source: task.source,
      externalId: task.external_id
    }
  }

  // Complete a task (supports both database tasks and external tasks from Todoist/Calendar)
  async completeTask(playerId, taskId) {
    await this.initializeTasks(playerId)
    const integrations = this.integrations.get(playerId) || {}
    const completedAt = new Date().toISOString()
    
    // Calculate gold reward for task completion
    const calculateGoldReward = (task) => {
      let gold = 50 // Base reward
      
      // Category bonus
      if (task.category === 'STUDY' || task.category === 'PROJECT') {
        gold += 25
      }
      
      // Early completion bonus
      if (task.dueAt && new Date(completedAt) < new Date(task.dueAt)) {
        gold += 15
      }
      
      return gold
    }
    
    // First, try to find the task in database
    if (publicDatabaseService.isAvailable()) {
      try {
        const tasks = await publicDatabaseService.query(PUBLIC_TABLES.TASKS, {
          where: { id: taskId, user_id: playerId }
        })
        
        if (tasks && tasks.length > 0) {
          const task = tasks[0]
          
          if (task.status === 'DONE') {
            // Already completed - don't give rewards again
            return {
              id: task.id,
              playerId: task.user_id,
              title: task.title,
              description: task.description || '',
              category: task.category || 'MISC',
              status: task.status,
              createdAt: task.created_at,
              dueAt: task.due_at || null,
              completedAt: task.completed_at || null,
              source: task.source || 'internal',
              externalId: task.external_id || null
            }
          }
          
          // Calculate gold reward
          const goldReward = calculateGoldReward(task)
          
          // If it's from an external source, complete it there too
          if (task.source === 'todoist' && task.external_id) {
            if (integrations.todoistToken) {
              try {
                await todoistService.completeTask(integrations.todoistToken, task.external_id)
              } catch (error) {
                console.warn('Failed to complete Todoist task:', error.message)
              }
            }
          }
          
          // Update task in database
          try {
            const updatedTask = await publicDatabaseService.update(PUBLIC_TABLES.TASKS, taskId, {
              status: 'DONE',
              completed_at: completedAt,
              updated_at: completedAt
            })
            
            // Save gold reward to user_stats
            if (goldReward > 0) {
              try {
                const supabase = database.getSupabaseClient()
                if (supabase) {
                  // Get current gold
                  const { data: statsData, error: statsError } = await supabase
                    .from('user_stats')
                    .select('coins')
                    .eq('id', playerId)
                    .single()
                  
                  if (!statsError && statsData) {
                    const currentGold = parseInt(statsData.coins) || 0
                    const newGold = currentGold + goldReward
                    
                    // Update gold
                    await supabase
                      .from('user_stats')
                      .update({ coins: newGold })
                      .eq('id', playerId)
                    
                    console.log(`[TaskService] Task completed: +${goldReward} gold for user ${playerId} (new total: ${newGold})`)
                  } else if (statsError && statsError.code === 'PGRST116') {
                    // User stats doesn't exist, create it
                    await supabase
                      .from('user_stats')
                      .insert({
                        id: playerId,
                        coins: goldReward,
                        xp: 0,
                        level: 1,
                        problems_solved: 0,
                        games_played: 0,
                        wins: 0
                      })
                    console.log(`[TaskService] Created user_stats and added ${goldReward} gold for user ${playerId}`)
                  }
                }
              } catch (goldError) {
                console.warn('Could not save gold reward for task completion:', goldError.message)
              }
            }
            
            if (updatedTask) {
              return {
                id: updatedTask.id,
                playerId: updatedTask.user_id,
                title: updatedTask.title,
                description: updatedTask.description || '',
                category: updatedTask.category || 'MISC',
                status: updatedTask.status,
                createdAt: updatedTask.created_at,
                dueAt: updatedTask.due_at || null,
                completedAt: updatedTask.completed_at || null,
                source: updatedTask.source || 'internal',
                externalId: updatedTask.external_id || null,
                goldReward: goldReward
              }
            }
          } catch (updateError) {
            if (!['PGRST205', '42P01', 'PGRST204'].includes(updateError.code)) {
              console.error('Error updating task:', updateError)
              throw updateError
            }
          }
        }
      } catch (error) {
        if (!['PGRST205', '42P01'].includes(error.code)) {
          console.warn('Error checking database for task:', error.message)
        }
      }
    }
    
    // Task not found in database - check if it's a Todoist task by ID
    // Todoist task IDs are numeric strings
    if (integrations.todoistToken && /^\d+$/.test(taskId)) {
      console.log(`[TaskService] Task ${taskId} not in DB, trying Todoist completion`)
      try {
        const success = await todoistService.completeTask(integrations.todoistToken, taskId)
        if (success) {
          // Give base gold reward for Todoist tasks
          const goldReward = 50
          
          // Save gold reward to user_stats
          try {
            const supabase = database.getSupabaseClient()
            if (supabase) {
              const { data: statsData, error: statsError } = await supabase
                .from('user_stats')
                .select('coins')
                .eq('id', playerId)
                .single()
              
              if (!statsError && statsData) {
                const currentGold = parseInt(statsData.coins) || 0
                const newGold = currentGold + goldReward
                
                await supabase
                  .from('user_stats')
                  .update({ coins: newGold })
                  .eq('id', playerId)
                
                console.log(`[TaskService] Todoist task completed: +${goldReward} gold for user ${playerId}`)
              } else if (statsError && statsError.code === 'PGRST116') {
                await supabase
                  .from('user_stats')
                  .insert({
                    id: playerId,
                    coins: goldReward,
                    xp: 0,
                    level: 1,
                    problems_solved: 0,
                    games_played: 0,
                    wins: 0
                  })
              }
            }
          } catch (goldError) {
            console.warn('Could not save gold for Todoist task:', goldError.message)
          }
          
          return {
            id: taskId,
            playerId: playerId,
            title: 'Task',
            description: '',
            category: 'MISC',
            status: 'DONE',
            createdAt: null,
            dueAt: null,
            completedAt: completedAt,
            source: 'todoist',
            externalId: taskId,
            goldReward: goldReward
          }
        }
      } catch (error) {
        console.error('Failed to complete Todoist task directly:', error.message)
      }
    }
    
    // Check if it's a Google Calendar event ID (typically contains @ or is alphanumeric)
    // Calendar events can't be "completed" - they're just events
    // But we can mark them as done locally if the task exists
    
    return null
  }

  // Calculate task buffs for a player (based on completed tasks in last 7 days from database)
  async calculateTaskBuffs(playerId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    let recentTasks = []
    
    // Get completed tasks from database
    if (publicDatabaseService.isAvailable()) {
      try {
        const tasks = await publicDatabaseService.query(PUBLIC_TABLES.TASKS, {
          where: { user_id: playerId, status: 'DONE' },
          orderBy: { field: 'completed_at', ascending: false }
        })
        
        // Filter tasks completed in last 7 days
        recentTasks = (tasks || []).filter(task => {
          if (!task.completed_at) return false
          return new Date(task.completed_at) >= new Date(sevenDaysAgo)
        })
      } catch (error) {
        // Silently handle missing table errors
        if (error.code === 'PGRST205' || error.code === '42P01') {
          // Table doesn't exist - continue silently
          // Don't log errors for missing tables
        } else {
          // Only log unexpected errors
          console.warn('Error fetching tasks for buff calculation:', error.message)
        }
      }
    }
    
    // Also check integrations for completed tasks
    const integrations = this.integrations.get(playerId) || {}
    
    // Fetch from Todoist if integrated
    if (integrations.todoistToken) {
      try {
        const todoistTasks = await todoistService.getTasks(integrations.todoistToken)
        const recentTodoistTasks = todoistTasks.filter(task => {
          if (task.status !== 'DONE' || !task.completedAt) return false
          return new Date(task.completedAt) >= new Date(sevenDaysAgo)
        })
        recentTasks.push(...recentTodoistTasks)
      } catch (error) {
        console.warn('Failed to fetch Todoist tasks for buff calculation:', error.message)
      }
    }
    
    // Fetch from Google Calendar if integrated - pass userId
    if (integrations.calendarToken) {
      try {
        // Pass userId instead of token
        const calendarTasks = await calendarService.getEvents(playerId);
        const recentCalendarTasks = calendarTasks.filter(task => 
          task.status === 'DONE' &&
          task.completedAt &&
          new Date(task.completedAt) >= new Date(sevenDaysAgo)
        );
        recentTasks.push(...recentCalendarTasks);
      } catch (error) {
        console.warn('Failed to fetch Google Calendar events for buff calculation:', error.message);
      }
    }

    let taskPoints = 0

    recentTasks.forEach(task => {
      // Base points
      taskPoints += 10

      // Category bonus
      if (task.category === 'STUDY' || task.category === 'PROJECT') {
        taskPoints += 5
      }

      // Early completion bonus
      if (task.dueAt && task.completedAt && new Date(task.completedAt) < new Date(task.dueAt)) {
        taskPoints += 5
      }
    })

    // Calculate buffs
    const startingEnergyBonus = Math.floor(taskPoints / 20) * 5
    const baseHpBonusPercent = Math.min(Math.floor(taskPoints / 30) * 2, 20)
    const bonusTowerSlots = Math.min(Math.floor(taskPoints / 40), 3)

    return {
      taskPoints,
      startingEnergyBonus,
      baseHpBonusPercent,
      bonusTowerSlots
    }
  }
}

export default new TaskService()
