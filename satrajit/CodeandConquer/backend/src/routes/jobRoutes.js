/**
 * Job Routes
 * 
 * REST API routes for job recommendations and job management
 * REST URI: /jobs/{jobId}
 */

import express from 'express';
import {
  getJobRecommendations,
  getJobById,
  getUserRecommendations,
  markJobViewed,
  markJobApplied,
  getJobMatchScore,
  getAllJobs,
  scrapeJobs,
  getJobStatistics,
  getTrendingJobs,
  getUserSkillProfile,
  saveJob,
  unsaveJob,
  seedJobs
} from '../controllers/jobController.js';

const router = express.Router();

/**
 * Get all jobs with filtering and pagination
 * GET /api/jobs
 * 
 * Query parameters:
 * - limit: Number of jobs to return (default: 20)
 * - offset: Pagination offset (default: 0)
 * - experienceLevel: Filter by experience level (entry, mid, senior, lead)
 * - location: Filter by location
 * - remoteOnly: Only show remote jobs (true/false)
 * - search: Search query for title/description
 * - sortBy: Sort field (default: posted_at)
 * - sortOrder: Sort order (asc/desc, default: desc)
 */
router.get('/', getAllJobs);

/**
 * Get job statistics
 * GET /api/jobs/statistics
 */
router.get('/statistics', getJobStatistics);

/**
 * Get trending jobs
 * GET /api/jobs/trending
 * 
 * Query parameters:
 * - limit: Number of jobs to return (default: 10)
 */
router.get('/trending', getTrendingJobs);

/**
 * Get job recommendations for a user
 * GET /api/jobs/recommendations/:userId
 * 
 * Query parameters:
 * - limit: Number of recommendations to return (default: 10)
 * - minMatchScore: Minimum match score (default: 30)
 * - experienceLevel: Filter by experience level (entry, mid, senior, lead)
 * - location: Filter by location
 * - remoteOnly: Only show remote jobs (true/false)
 */
router.get('/recommendations/:userId', getJobRecommendations);

/**
 * Get user's saved recommendations
 * GET /api/jobs/user/:userId/recommendations
 * 
 * Query parameters:
 * - limit: Number of recommendations to return (default: 20)
 * - minScore: Minimum match score (default: 0)
 */
router.get('/user/:userId/recommendations', getUserRecommendations);

/**
 * Get user's skill profile
 * GET /api/jobs/profile/:userId
 */
router.get('/profile/:userId', getUserSkillProfile);

/**
 * Trigger job scraping from external sources
 * POST /api/jobs/scrape
 * 
 * Body:
 * - queries: Array of search queries (default: ['software engineer'])
 * - locations: Array of locations (default: ['United States', 'Remote'])
 * - useMockData: Boolean to use mock data instead of real API (default: true)
 */
router.post('/scrape', scrapeJobs);

/**
 * Seed the job database with initial data
 * POST /api/jobs/seed
 */
router.post('/seed', seedJobs);

/**
 * Get a specific job by ID
 * GET /api/jobs/:jobId
 */
router.get('/:jobId', getJobById);

/**
 * Get match score for a specific job
 * GET /api/jobs/:jobId/match/:userId
 */
router.get('/:jobId/match/:userId', getJobMatchScore);

/**
 * Mark a job recommendation as viewed
 * POST /api/jobs/:jobId/view
 * 
 * Body:
 * - userId: User ID
 */
router.post('/:jobId/view', markJobViewed);

/**
 * Mark a job recommendation as applied
 * POST /api/jobs/:jobId/apply
 * 
 * Body:
 * - userId: User ID
 */
router.post('/:jobId/apply', markJobApplied);

/**
 * Save a job for a user
 * POST /api/jobs/:jobId/save
 * 
 * Body:
 * - userId: User ID
 */
router.post('/:jobId/save', saveJob);

/**
 * Remove a saved job
 * DELETE /api/jobs/:jobId/save
 * 
 * Query parameters:
 * - userId: User ID
 */
router.delete('/:jobId/save', unsaveJob);

export default router;

