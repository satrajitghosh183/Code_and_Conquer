# Quick Start - Test Case Generation (Windows PowerShell)

## ✅ Correct PowerShell Syntax

### Simple Run (No HF API)
```powershell
node scripts/generatePerfectTestCasesAllLanguages.js
```

### With HF API Enabled
```powershell
$env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js
```

### Custom Number of Problems
```powershell
$env:MAX_PROBLEMS="500"; node scripts/generatePerfectTestCasesAllLanguages.js
```

### All Options Combined
```powershell
$env:MAX_PROBLEMS="500"; $env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js
```

## Common Mistakes

❌ **Wrong (Bash/Linux syntax - doesn't work in PowerShell):**
```powershell
USE_HF_API=true node scripts/generatePerfectTestCasesAllLanguages.js
```

✅ **Correct (PowerShell syntax):**
```powershell
$env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js
```

## Quick Reference

| What You Want | PowerShell Command |
|---------------|-------------------|
| Basic run | `node scripts/generatePerfectTestCasesAllLanguages.js` |
| Enable HF API | `$env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js` |
| Process 500 problems | `$env:MAX_PROBLEMS="500"; node scripts/generatePerfectTestCasesAllLanguages.js` |
| Everything | `$env:MAX_PROBLEMS="500"; $env:USE_HF_API="true"; node scripts/generatePerfectTestCasesAllLanguages.js` |

## Current Status

- ✅ Script is working correctly
- ✅ 291 out of 300 problems already have test cases
- ✅ All test cases are in perfect format
- ✅ Run button should work for all problems with test cases

## Need Help?

Check `RUN_TEST_CASES.md` for more detailed examples and options.

