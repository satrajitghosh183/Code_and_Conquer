# Test Case Generation Script

This script generates test cases for problems that don't have them by parsing examples from the problem description.

## Usage

```bash
cd backend
node scripts/generateTestCases.js
```

## What it does

1. Fetches the first 300 problems from Supabase database
2. For each problem without test cases:
   - Parses examples from the problem description
   - Generates test cases from the examples
   - Updates both local JSON files and Supabase database
3. Provides a summary of processed, updated, skipped, and errored problems

## Requirements

- Environment variables must be set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Database connection must be working
- Local problems directory must exist at `backend/data/problems`

## Notes

- The script only processes problems that don't already have test cases
- Test cases are generated from the examples in the problem description
- The first 3 examples become visible test cases
- Any additional examples become hidden test cases

