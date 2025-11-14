import express from 'express';
import { getAllProblems, getProblemById, createProblem, updateProblemTags, syncProblemTags } from '../controllers/problemController.js';

const router = express.Router();

router.get('/', getAllProblems);
router.get('/:id', getProblemById);
router.post('/', createProblem);
router.patch('/:id/tags', updateProblemTags); // Update tags for a problem
router.post('/sync-tags', syncProblemTags); // Sync tags from local files to database

export default router;

