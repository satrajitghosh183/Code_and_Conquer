import express from 'express'
import singlePlayerService from '../services/singlePlayerService.js'

const router = express.Router()

// Initialize single player session
router.post('/start', async (req, res) => {
  try {
    const { userId, difficulty } = req.body
    const session = await singlePlayerService.initializeSession(userId, difficulty)
    res.json(session)
  } catch (error) {
    console.error('Error starting single player session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get session state
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params
    const session = singlePlayerService.getSession(sessionId)
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json(session)
  } catch (error) {
    console.error('Error getting session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Submit code in single player
router.post('/session/:sessionId/submit', (req, res) => {
  try {
    const { sessionId } = req.params
    const submission = req.body
    const result = singlePlayerService.processCodingSubmission(sessionId, submission)
    
    if (!result) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error processing submission:', error)
    res.status(500).json({ error: error.message })
  }
})

// Deploy unit
router.post('/session/:sessionId/deploy', (req, res) => {
  try {
    const { sessionId } = req.params
    const { unitType } = req.body
    const result = singlePlayerService.deployUnit(sessionId, unitType)
    
    if (!result) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error deploying unit:', error)
    res.status(500).json({ error: error.message })
  }
})

// Place tower
router.post('/session/:sessionId/tower', (req, res) => {
  try {
    const { sessionId } = req.params
    const { position, towerType } = req.body
    const result = singlePlayerService.placeTower(sessionId, position, towerType)
    
    if (!result) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error placing tower:', error)
    res.status(500).json({ error: error.message })
  }
})

// End session
router.post('/session/:sessionId/end', (req, res) => {
  try {
    const { sessionId } = req.params
    const rewards = singlePlayerService.endSession(sessionId)
    
    if (!rewards) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json(rewards)
  } catch (error) {
    console.error('Error ending session:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

