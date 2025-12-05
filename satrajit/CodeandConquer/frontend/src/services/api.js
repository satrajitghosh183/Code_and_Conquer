import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Problems API
export const getProblems = () => api.get('/problems');
export const getProblem = (id) => api.get(`/problems/${id}`);
export const createProblem = (problem) => api.post('/problems', problem);
export const updateProblemTags = (id, tags) => api.patch(`/problems/${id}/tags`, { tags });

// Submissions API
export const submitCode = (problemId, code, language, userId) => 
  api.post('/submissions/submit', { problemId, code, language, userId });

export const runCode = (code, language, problemId) =>
  api.post('/submissions/run', { code, language, problemId });

export const getSubmission = (id) => api.get(`/submissions/${id}`);

export const getAvailableLanguages = () => api.get('/submissions/languages');

// User Stats API
export const getUserStats = (userId) => api.get(`/users/${userId}/stats`);
export const updateUserStats = (userId, updates) => 
  api.post(`/users/${userId}/stats/update`, updates);

// Dashboard API
export const getDashboardStats = (userId) => api.get(`/dashboard/stats/${userId}`);
export const getDailyChallenge = () => api.get('/dashboard/daily-challenge');

// Jobs API
export const getAllJobs = (params = {}) => api.get('/jobs', { params });
export const getJobById = (jobId) => api.get(`/jobs/${jobId}`);
export const getJobRecommendations = (userId, params = {}) => 
  api.get(`/jobs/recommendations/${userId}`, { params });
export const getUserRecommendations = (userId, params = {}) => 
  api.get(`/jobs/user/${userId}/recommendations`, { params });
export const getJobStatistics = () => api.get('/jobs/statistics');
export const getTrendingJobs = (limit = 10) => 
  api.get('/jobs/trending', { params: { limit } });
export const getUserSkillProfile = (userId) => api.get(`/jobs/profile/${userId}`);
export const getJobMatchScore = (jobId, userId) => 
  api.get(`/jobs/${jobId}/match/${userId}`);
export const markJobViewed = (jobId, userId) => 
  api.post(`/jobs/${jobId}/view`, { userId });
export const markJobApplied = (jobId, userId) => 
  api.post(`/jobs/${jobId}/apply`, { userId });
export const saveJob = (jobId, userId) => 
  api.post(`/jobs/${jobId}/save`, { userId });
export const unsaveJob = (jobId, userId) => 
  api.delete(`/jobs/${jobId}/save`, { params: { userId } });
export const seedJobs = () => api.post('/jobs/seed');

export default api;

