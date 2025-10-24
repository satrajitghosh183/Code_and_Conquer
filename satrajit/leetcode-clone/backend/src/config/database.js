import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const PROBLEMS_DIR = path.join(DATA_DIR, 'problems');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');

// Ensure directories exist
await fs.ensureDir(PROBLEMS_DIR);
await fs.ensureDir(SUBMISSIONS_DIR);

class Database {
  constructor() {
    this.type = process.env.DATABASE_TYPE || 'local';
  }

  // Problems CRUD
  async getAllProblems() {
    if (this.type === 'local') {
      const files = await fs.readdir(PROBLEMS_DIR);
      const problems = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async (file) => {
            const data = await fs.readJson(path.join(PROBLEMS_DIR, file));
            return data;
          })
      );
      return problems.sort((a, b) => a.id - b.id);
    }
    // TODO: Add PostgreSQL support
    throw new Error('Database type not supported');
  }

  async getProblemById(id) {
    if (this.type === 'local') {
      const filePath = path.join(PROBLEMS_DIR, `${id}.json`);
      if (await fs.pathExists(filePath)) {
        return await fs.readJson(filePath);
      }
      return null;
    }
    throw new Error('Database type not supported');
  }

  async createProblem(problem) {
    if (this.type === 'local') {
      const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
      await fs.writeJson(filePath, problem, { spaces: 2 });
      return problem;
    }
    throw new Error('Database type not supported');
  }

  async updateProblem(id, problem) {
    if (this.type === 'local') {
      const filePath = path.join(PROBLEMS_DIR, `${id}.json`);
      await fs.writeJson(filePath, problem, { spaces: 2 });
      return problem;
    }
    throw new Error('Database type not supported');
  }

  // Submissions CRUD
  async createSubmission(submission) {
    if (this.type === 'local') {
      const filePath = path.join(SUBMISSIONS_DIR, `${submission.id}.json`);
      await fs.writeJson(filePath, submission, { spaces: 2 });
      return submission;
    }
    throw new Error('Database type not supported');
  }

  async getSubmissionById(id) {
    if (this.type === 'local') {
      const filePath = path.join(SUBMISSIONS_DIR, `${id}.json`);
      if (await fs.pathExists(filePath)) {
        return await fs.readJson(filePath);
      }
      return null;
    }
    throw new Error('Database type not supported');
  }

  async getSubmissionsByProblem(problemId, limit = 10) {
    if (this.type === 'local') {
      const files = await fs.readdir(SUBMISSIONS_DIR);
      const submissions = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async (file) => {
            const data = await fs.readJson(path.join(SUBMISSIONS_DIR, file));
            return data;
          })
      );
      return submissions
        .filter(s => s.problemId === problemId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    }
    throw new Error('Database type not supported');
  }
}

export default new Database();