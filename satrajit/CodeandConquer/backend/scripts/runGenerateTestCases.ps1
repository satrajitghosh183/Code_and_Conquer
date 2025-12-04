# PowerShell script to run test case generation with options

param(
    [string]$MaxProblems = "300",
    [switch]$UseHFAPI = $false,
    [string]$HFAPIUrl = "https://syncbuz120-testcasegenerator.hf.space/api/predict"
)

Write-Host "=== Running Perfect Test Case Generator ===" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:MAX_PROBLEMS = $MaxProblems
$env:USE_HF_API = if ($UseHFAPI) { "true" } else { "false" }
$env:HF_API_URL = $HFAPIUrl

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Max Problems: $MaxProblems"
Write-Host "  Use HF API: $UseHFAPI"
Write-Host "  HF API URL: $HFAPIUrl"
Write-Host ""

# Run the script
node scripts/generatePerfectTestCasesAllLanguages.js

