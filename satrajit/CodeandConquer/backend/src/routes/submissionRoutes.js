import express from 'express';
import { submitCode, getSubmission, runCode, getAvailableLanguages } from '../controllers/submissionController.js';

const router = express.Router();

router.get('/languages', getAvailableLanguages);
router.post('/submit', submitCode);
router.post('/run', runCode);
router.get('/:id', getSubmission);

export default router;

