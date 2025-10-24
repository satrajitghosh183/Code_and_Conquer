# Build all Docker images
$images = @(
    @{name="leetcode-judge-node"; file="Dockerfile.node"},
    @{name="leetcode-judge-python"; file="Dockerfile.python"},
    @{name="leetcode-judge-java"; file="Dockerfile.java"},
    @{name="leetcode-judge-cpp"; file="Dockerfile.cpp"},
    @{name="leetcode-judge-go"; file="Dockerfile.go"},
    @{name="leetcode-judge-rust"; file="Dockerfile.rust"}
)

foreach ($img in $images) {
    Write-Host "Building $($img.name)..." -ForegroundColor Cyan
    docker build -t "$($img.name):latest" -f "dockerfiles/$($img.file)" .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $($img.name) built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to build $($img.name)" -ForegroundColor Red
    }
}

Write-Host "`nAll images built!" -ForegroundColor Green
docker images | Select-String 'leetcode-judge'
