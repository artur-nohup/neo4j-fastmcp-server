#!/bin/bash

# Docker Hub build and push script
# Usage: ./docker-build-push.sh <dockerhub-username>

set -e

# Check if Docker Hub username is provided
if [ -z "$1" ]; then
    echo "Error: Docker Hub username not provided"
    echo "Usage: ./docker-build-push.sh <dockerhub-username>"
    exit 1
fi

DOCKER_USERNAME=$1
IMAGE_NAME="neo4j-fastmcp-server"
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d)

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Tag the image for Docker Hub
echo "🏷️  Tagging images..."
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:latest
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}-${TIMESTAMP}

# Login to Docker Hub
echo "🔐 Please login to Docker Hub..."
docker login

# Push images to Docker Hub
echo "📤 Pushing images to Docker Hub..."
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}-${TIMESTAMP}

echo "✅ Successfully pushed to Docker Hub!"
echo ""
echo "Images available at:"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}-${TIMESTAMP}"
echo ""
echo "To pull and run:"
echo "  docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
echo "  docker run -p 8080:8080 --env-file .env ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"