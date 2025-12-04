#!/bin/bash

# Build all Docker images
images=(
    "leetcode-judge-node:Dockerfile.node"
    "leetcode-judge-python:Dockerfile.python"
    "leetcode-judge-java:Dockerfile.java"
    "leetcode-judge-cpp:Dockerfile.cpp"
    "leetcode-judge-go:Dockerfile.go"
    "leetcode-judge-rust:Dockerfile.rust"
)

for img in "${images[@]}"; do
    name=$(echo $img | cut -d: -f1)
    file=$(echo $img | cut -d: -f2)
    echo "Building $name..."
    docker build -t "$name:latest" -f "dockerfiles/$file" .
    if [ $? -eq 0 ]; then
        echo "$name built successfully"
    else
        echo "Failed to build $name"
    fi
done

echo ""
echo "All images built!"
docker images | grep leetcode-judge

