#!/bin/bash
# Code & Conquer - Docker Judge Images Build Script
# Run this script to build all Docker images for code execution

set -e

FORCE=false
NO_PULL=false
ONLY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        --no-pull)
            NO_PULL=true
            shift
            ;;
        --only|-o)
            ONLY="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo ""
echo "========================================"
echo "  Code & Conquer - Building Judge Images"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Navigate to script directory
cd "$(dirname "$0")"

declare -A images
images=(
    ["leetcode-judge-node"]="Dockerfile.node:JavaScript/TypeScript"
    ["leetcode-judge-python"]="Dockerfile.python:Python"
    ["leetcode-judge-java"]="Dockerfile.java:Java"
    ["leetcode-judge-cpp"]="Dockerfile.cpp:C/C++"
    ["leetcode-judge-go"]="Dockerfile.go:Go"
    ["leetcode-judge-rust"]="Dockerfile.rust:Rust"
    ["leetcode-judge-ruby"]="Dockerfile.ruby:Ruby"
    ["leetcode-judge-php"]="Dockerfile.php:PHP"
)

SUCCESS=0
FAILED=0
SKIPPED=0

for name in "${!images[@]}"; do
    IFS=':' read -r dockerfile lang <<< "${images[$name]}"
    
    # Filter if --only specified
    if [[ -n "$ONLY" && ! "$name" =~ $ONLY && ! "$lang" =~ $ONLY ]]; then
        continue
    fi
    
    echo ""
    echo "[$lang] Building $name..."
    
    # Check if image exists
    if [[ "$FORCE" != "true" ]]; then
        existing=$(docker images -q "$name:latest" 2>/dev/null)
        if [[ -n "$existing" ]]; then
            echo "  Image already exists. Use --force to rebuild."
            ((SKIPPED++))
            continue
        fi
    fi
    
    # Build arguments
    BUILD_ARGS="build -t $name:latest -f dockerfiles/$dockerfile"
    if [[ "$NO_PULL" != "true" ]]; then
        BUILD_ARGS="$BUILD_ARGS --pull"
    fi
    BUILD_ARGS="$BUILD_ARGS ."
    
    START_TIME=$(date +%s)
    if docker $BUILD_ARGS; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo "  ✓ Built successfully in ${DURATION}s"
        ((SUCCESS++))
    else
        echo "  ✗ Build failed!"
        ((FAILED++))
    fi
done

# Summary
echo ""
echo "========================================"
echo "  Build Summary"
echo "========================================"
echo "  ✓ Success: $SUCCESS"
if [[ $SKIPPED -gt 0 ]]; then
    echo "  - Skipped: $SKIPPED (already exist)"
fi
if [[ $FAILED -gt 0 ]]; then
    echo "  ✗ Failed:  $FAILED"
fi

# List all judge images
echo ""
echo "📦 Available Judge Images:"
docker images --filter "reference=leetcode-judge-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo "⚠️  Some builds failed. Check the errors above."
    exit 1
else
    echo ""
    echo "✅ All images ready! Restart your backend server."
    exit 0
fi
