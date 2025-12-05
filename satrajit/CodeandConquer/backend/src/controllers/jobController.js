/**
 * Job Controller
 * 
 * Handles HTTP requests for job recommendations, job details, and job scraping
 */

import jobRecommendationService from '../services/jobRecommendationService.js';
import jobScraperService from '../services/jobScraperService.js';
import logger from '../utils/logger.js';

/**
 * Get job recommendations for a user
 * GET /api/jobs/recommendations/:userId
 */
export const getJobRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 10,
      minMatchScore = 30,
      experienceLevel,
      location,
      remoteOnly
    } = req.query;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const options = {
      limit: parseInt(limit, 10),
      minMatchScore: parseFloat(minMatchScore),
      experienceLevel: experienceLevel || null,
      location: location || null,
      remoteOnly: remoteOnly === 'true'
    };

    const recommendations = await jobRecommendationService.getJobRecommendations(
      userId,
      options
    );

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get a specific job by ID
 * GET /api/jobs/:jobId
 */
export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const job = await jobRecommendationService.getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get user's saved recommendations
 * GET /api/jobs/user/:userId/recommendations
 */
export const getUserRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 20,
      minScore = 0
    } = req.query;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const recommendations = await jobRecommendationService.getUserRecommendations(
      userId,
      {
        limit: parseInt(limit, 10),
        minScore: parseFloat(minScore)
      }
    );

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Mark a recommendation as viewed
 * POST /api/jobs/:jobId/view
 */
export const markJobViewed = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required'
      });
    }

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    await jobRecommendationService.markRecommendationViewed(userId, jobId);

    res.json({
      success: true,
      message: 'Job marked as viewed'
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Mark a recommendation as applied
 * POST /api/jobs/:jobId/apply
 */
export const markJobApplied = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required'
      });
    }

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    await jobRecommendationService.markRecommendationApplied(userId, jobId);

    res.json({
      success: true,
      message: 'Job marked as applied'
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get match score for a specific job
 * GET /api/jobs/:jobId/match/:userId
 */
export const getJobMatchScore = async (req, res) => {
  try {
    const { jobId, userId } = req.params;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const matchData = await jobRecommendationService.calculateJobMatchScore(
      userId,
      jobId
    );

    res.json({
      success: true,
      matchData
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all jobs with filtering and pagination
 * GET /api/jobs
 */
export const getAllJobs = async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      experienceLevel,
      location,
      remoteOnly,
      search,
      sortBy = 'posted_at',
      sortOrder = 'desc'
    } = req.query;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const result = await jobRecommendationService.getAllJobs({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      experienceLevel: experienceLevel || null,
      location: location || null,
      remoteOnly: remoteOnly === 'true',
      searchQuery: search || null,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Trigger job scraping/fetching
 * POST /api/jobs/scrape
 */
export const scrapeJobs = async (req, res) => {
  try {
    const { 
      queries = ['software engineer'],
      locations = ['United States', 'Remote'],
      useMockData = true 
    } = req.body;

    if (!jobScraperService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job scraper service is not configured'
      });
    }

    const results = await jobScraperService.fetchAndStoreJobs({
      queries,
      locations,
      useMockData
    });

    res.json({
      success: true,
      message: 'Job scraping completed',
      results
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get job statistics
 * GET /api/jobs/statistics
 */
export const getJobStatistics = async (req, res) => {
  try {
    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const statistics = await jobRecommendationService.getJobStatistics();

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get trending jobs
 * GET /api/jobs/trending
 */
export const getTrendingJobs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const jobs = await jobRecommendationService.getTrendingJobs(parseInt(limit, 10));

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get user's skill profile
 * GET /api/jobs/profile/:userId
 */
export const getUserSkillProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    const profile = await jobRecommendationService.analyzeUserSkillProfile(userId);

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Save a job for a user
 * POST /api/jobs/:jobId/save
 */
export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required'
      });
    }

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    await jobRecommendationService.saveJob(userId, jobId);

    res.json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Remove a saved job
 * DELETE /api/jobs/:jobId/save
 */
export const unsaveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required'
      });
    }

    if (!jobRecommendationService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job recommendation service is not configured'
      });
    }

    await jobRecommendationService.unsaveJob(userId, jobId);

    res.json({
      success: true,
      message: 'Job removed from saved'
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Seed initial job data
 * POST /api/jobs/seed
 */
export const seedJobs = async (req, res) => {
  try {
    if (!jobScraperService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Job scraper service is not configured'
      });
    }

    const results = await jobScraperService.fetchAndStoreJobs({
      queries: [
        'software engineer',
        'frontend developer',
        'backend developer',
        'full stack developer',
        'data engineer',
        'devops engineer'
      ],
      locations: ['United States', 'Remote', 'San Francisco', 'New York'],
      useMockData: true // Use mock data for seeding
    });

    res.json({
      success: true,
      message: 'Job database seeded successfully',
      results
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

