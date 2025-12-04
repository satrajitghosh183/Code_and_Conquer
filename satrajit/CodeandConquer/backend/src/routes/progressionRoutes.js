import express from 'express'
import progressionService from '../services/progressionService.js'
import { HEROES, TECH_TREE, UNIT_TYPES, TOWER_TYPES } from '../models/Hero.js'

const router = express.Router()

// Get user progression
router.get('/progression/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const progression = await progressionService.getUserProgression(userId)
    res.json(progression)
  } catch (error) {
    console.error('Error getting progression:', error)
    res.status(500).json({ error: error.message })
  }
})

// Add XP
router.post('/progression/:userId/xp', async (req, res) => {
  try {
    const { userId } = req.params
    const { xp, source } = req.body
    const result = await progressionService.addXP(userId, xp, source)
    res.json(result)
  } catch (error) {
    console.error('Error adding XP:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get heroes
router.get('/heroes', async (req, res) => {
  try {
    res.json(Object.values(HEROES))
  } catch (error) {
    console.error('Error getting heroes:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get heroes with unlock status
router.get('/heroes/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const heroes = await progressionService.getHeroesWithStatus(userId)
    res.json(heroes)
  } catch (error) {
    console.error('Error getting heroes with status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Unlock hero
router.post('/heroes/:userId/unlock', async (req, res) => {
  try {
    const { userId } = req.params
    const { heroId } = req.body
    const result = await progressionService.unlockHero(userId, heroId)
    res.json(result)
  } catch (error) {
    console.error('Error unlocking hero:', error)
    res.status(400).json({ error: error.message })
  }
})

// Select hero
router.post('/heroes/:userId/select', async (req, res) => {
  try {
    const { userId } = req.params
    const { heroId } = req.body
    const result = await progressionService.selectHero(userId, heroId)
    res.json(result)
  } catch (error) {
    console.error('Error selecting hero:', error)
    res.status(400).json({ error: error.message })
  }
})

// Get tech tree
router.get('/tech-tree', async (req, res) => {
  try {
    res.json(Object.values(TECH_TREE))
  } catch (error) {
    console.error('Error getting tech tree:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get tech tree with status
router.get('/tech-tree/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const techTree = await progressionService.getTechTreeWithStatus(userId)
    res.json(techTree)
  } catch (error) {
    console.error('Error getting tech tree with status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Upgrade tech
router.post('/tech-tree/:userId/upgrade', async (req, res) => {
  try {
    const { userId } = req.params
    const { techId } = req.body
    const result = await progressionService.upgradeTech(userId, techId)
    res.json(result)
  } catch (error) {
    console.error('Error upgrading tech:', error)
    res.status(400).json({ error: error.message })
  }
})

// Get match loadout
router.get('/loadout/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const loadout = await progressionService.getMatchLoadout(userId)
    res.json(loadout)
  } catch (error) {
    console.error('Error getting match loadout:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get units
router.get('/units', async (req, res) => {
  try {
    res.json(Object.values(UNIT_TYPES))
  } catch (error) {
    console.error('Error getting units:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get towers
router.get('/towers', async (req, res) => {
  try {
    res.json(Object.values(TOWER_TYPES))
  } catch (error) {
    console.error('Error getting towers:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update streak
router.post('/progression/:userId/streak', async (req, res) => {
  try {
    const { userId } = req.params
    const result = await progressionService.updateStreak(userId)
    res.json(result)
  } catch (error) {
    console.error('Error updating streak:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

