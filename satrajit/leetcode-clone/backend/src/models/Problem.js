export class Problem {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.difficulty = data.difficulty; // easy, medium, hard
    this.description = data.description;
    this.examples = data.examples || [];
    this.constraints = data.constraints || [];
    this.starterCode = data.starterCode || {};
    this.testCases = data.testCases || [];
    this.hiddenTestCases = data.hiddenTestCases || [];
    this.timeComplexity = data.timeComplexity;
    this.spaceComplexity = data.spaceComplexity;
    this.tags = data.tags || [];
    this.hints = data.hints || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      difficulty: this.difficulty,
      description: this.description,
      examples: this.examples,
      constraints: this.constraints,
      starterCode: this.starterCode,
      testCases: this.testCases,
      hiddenTestCases: this.hiddenTestCases,
      timeComplexity: this.timeComplexity,
      spaceComplexity: this.spaceComplexity,
      tags: this.tags,
      hints: this.hints,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class Submission {
  constructor(data) {
    this.id = data.id;
    this.problemId = data.problemId;
    this.language = data.language;
    this.code = data.code;
    this.status = data.status; // pending, accepted, wrong_answer, runtime_error, time_limit_exceeded
    this.testResults = data.testResults || [];
    this.executionTime = data.executionTime;
    this.memory = data.memory;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.error = data.error;
  }

  toJSON() {
    return {
      id: this.id,
      problemId: this.problemId,
      language: this.language,
      code: this.code,
      status: this.status,
      testResults: this.testResults,
      executionTime: this.executionTime,
      memory: this.memory,
      timestamp: this.timestamp,
      error: this.error
    };
  }
}