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

// User Stats API
export const getUserStats = (userId) => api.get(`/users/${userId}/stats`);
export const updateUserStats = (userId, updates) => 
  api.post(`/users/${userId}/stats/update`, updates);

// Ads API
export const getRandomAd = () => api.get('/ads/random');

export default api;

