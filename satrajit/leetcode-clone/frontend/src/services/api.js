// import axios from 'axios';

// const API_BASE_URL = 'http://localhost:5000/api';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// export const getProblems = async () => {
//   const response = await api.get('/problems');
//   return response.data;
// };

// export const getProblem = async (id) => {
//   const response = await api.get(`/problems/${id}`);
//   return response.data;
// };

// export const submitCode = async (problemId, code, language) => {
//   const response = await api.post('/submissions/submit', {
//     problemId,
//     code,
//     language,
//   });
//   return response.data;
// };

// export const runCode = async (code, language, testCase) => {
//   const response = await api.post('/submissions/run', {
//     code,
//     language,
//     testCase,
//   });
//   return response.data;
// };

// export const getSubmission = async (id) => {
//   const response = await api.get(`/submissions/${id}`);
//   return response.data;
// };

// export default api;


import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getProblems = async () => {
  const response = await api.get('/problems');
  return response.data;
};

export const getProblem = async (id) => {
  const response = await api.get(`/problems/${id}`);
  return response.data;
};

export const submitCode = async (problemId, code, language) => {
  const response = await api.post('/submissions/submit', {
    problemId,
    code,
    language,
  });
  return response.data;
};

export const runCode = async (code, language, problemId) => {
  const response = await api.post('/submissions/run', {
    code,
    language,
    problemId, // Now we send the problem ID
  });
  return response.data;
};

export const getSubmission = async (id) => {
  const response = await api.get(`/submissions/${id}`);
  return response.data;
};

export default api;