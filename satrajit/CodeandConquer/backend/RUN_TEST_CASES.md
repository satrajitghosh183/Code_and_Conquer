# How to Run Test Case Generation

## Windows PowerShell (Current System)

### Option 1: Simple Run (No HF API)
```powershell
node scripts/generatePerfectTestCasesAllLanguages.js
```

### Option 2: With Environment Variables (Single Line)
```powershell
$env:MAX_PROBLEMS="300"; $env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js
```

### Option 3: Using the PowerShell Script
```powershell
# Basic run
.\scripts\runGenerateTestCases.ps1

# With HF API enabled
.\scripts\runGenerateTestCases.ps1 -UseHFAPI

# Custom number of problems
.\scripts\runGenerateTestCases.ps1 -MaxProblems 500

# Full options
.\scripts\runGenerateTestCases.ps1 -MaxProblems 500 -UseHFAPI -HFAPIUrl "https://your-url.hf.space/api/predict"
```

### Option 4: Step by Step (Multiple Lines)
```powershell
$env:MAX_PROBLEMS = "300"
$env:USE_HF_API = "true"
$env:HF_API_URL = "https://syncbuz120-testcasegenerator.hf.space/api/predict"
node scripts/generatePerfectTestCasesAllLanguages.js
```

## Linux/Mac/Git Bash

```bash
# Simple run
node scripts/generatePerfectTestCasesAllLanguages.js

# With environment variables
MAX_PROBLEMS=300 USE_HF_API=true node scripts/generatePerfectTestCasesAllLanguages.js

# Or export first
export MAX_PROBLEMS=300
export USE_HF_API=true
node scripts/generatePerfectTestCasesAllLanguages.js
```

## Environment Variables

- `MAX_PROBLEMS`: Maximum number of problems to process (default: 300)
- `USE_HF_API`: Enable Hugging Face API (default: false)
- `HF_API_URL`: Hugging Face API URL (default: https://syncbuz120-testcasegenerator.hf.space/api/predict)

## Examples

### Generate for first 500 problems with HF API
**PowerShell:**
```powershell
$env:MAX_PROBLEMS="500"; $env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js
```

**Bash:**
```bash
MAX_PROBLEMS=500 USE_HF_API=true node scripts/generatePerfectTestCasesAllLanguages.js
```

### Generate without HF API (faster, uses examples only)
**PowerShell:**
```powershell
node scripts/generatePerfectTestCasesAllLanguages.js
```

**Bash:**
```bash
node scripts/generatePerfectTestCasesAllLanguages.js
```

