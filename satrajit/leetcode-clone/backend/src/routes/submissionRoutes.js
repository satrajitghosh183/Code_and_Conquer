import express from 'express';
import { submitCode, getSubmission, runCode } from '../controllers/submissionController.js';

const router = express.Router();

router.post('/submit', submitCode);
router.post('/run', runCode);
router.get('/:id', getSubmission);

export default router;