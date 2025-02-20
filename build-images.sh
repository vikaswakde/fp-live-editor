#!/bin/bash

# Build React template
echo "Building React template..."
docker build -t code-server-react:latest -f docker/react/Dockerfile .

# Add more templates here as needed
# For example:
# echo "Building Node.js template..."
# docker build -t code-server-node:latest -f docker/node/Dockerfile .

echo "All images built successfully!" 