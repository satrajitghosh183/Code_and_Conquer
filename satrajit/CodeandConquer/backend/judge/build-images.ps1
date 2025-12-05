# Code & Conquer - Docker Judge Images Build Script
# Run this script to build all Docker images for code execution

param(
    [switch]$Force,      # Force rebuild even if images exist
    [switch]$NoPull,     # Don't pull base images
    [string]$Only        # Build only specific image (e.g., -Only node)
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Code & Conquer - Building Judge Images" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

$images = @(
    @{name="leetcode-judge-node"; file="Dockerfile.node"; lang="JavaScript/TypeScript"},
    @{name="leetcode-judge-python"; file="Dockerfile.python"; lang="Python"},
    @{name="leetcode-judge-java"; file="Dockerfile.java"; lang="Java"},
    @{name="leetcode-judge-cpp"; file="Dockerfile.cpp"; lang="C/C++"},
    @{name="leetcode-judge-go"; file="Dockerfile.go"; lang="Go"},
    @{name="leetcode-judge-rust"; file="Dockerfile.rust"; lang="Rust"},
    @{name="leetcode-judge-ruby"; file="Dockerfile.ruby"; lang="Ruby"},
    @{name="leetcode-judge-php"; file="Dockerfile.php"; lang="PHP"}
)

# Filter if -Only specified
if ($Only) {
    $images = $images | Where-Object { $_.name -like "*$Only*" -or $_.lang -like "*$Only*" }
    if ($images.Count -eq 0) {
        Write-Host "No matching image found for: $Only" -ForegroundColor Red
        exit 1
    }
}

$success = 0
$failed = 0
$skipped = 0

foreach ($img in $images) {
    Write-Host "`n[$($img.lang)] Building $($img.name)..." -ForegroundColor Cyan
    
    # Check if image exists and skip if not forcing
    if (-not $Force) {
        $existing = docker images -q "$($img.name):latest" 2>$null
        if ($existing) {
            Write-Host "  Image already exists. Use -Force to rebuild." -ForegroundColor Yellow
            $skipped++
            continue
        }
    }
    
    # Build the image
    $buildArgs = @("build", "-t", "$($img.name):latest", "-f", "dockerfiles/$($img.file)")
    if (-not $NoPull) {
        $buildArgs += "--pull"
    }
    $buildArgs += "."
    
    $startTime = Get-Date
    docker @buildArgs
    $duration = (Get-Date) - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Built successfully in $([math]::Round($duration.TotalSeconds, 1))s" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ✗ Build failed!" -ForegroundColor Red
        $failed++
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✓ Success: $success" -ForegroundColor Green
if ($skipped -gt 0) {
    Write-Host "  - Skipped: $skipped (already exist)" -ForegroundColor Yellow
}
if ($failed -gt 0) {
    Write-Host "  ✗ Failed:  $failed" -ForegroundColor Red
}

# List all judge images
Write-Host "`n📦 Available Judge Images:" -ForegroundColor Cyan
docker images --filter "reference=leetcode-judge-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

if ($failed -gt 0) {
    Write-Host "`n⚠️  Some builds failed. Check the errors above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n✅ All images ready! Restart your backend server." -ForegroundColor Green
    exit 0
}

