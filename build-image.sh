#!/usr/bin/env bash
set -euo pipefail

# build-image.sh
# Usage: ./build-image.sh <image-name> <version> [context-dir]
# Example: ./build-image.sh myorg/system-design-reviewer-backend 1.2.3

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <image-name> <version> [context-dir]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKERFILE="$SCRIPT_DIR/Dockerfile"
IMAGE_NAME="$1"
VERSION="$2"
CONTEXT="${3:-$SCRIPT_DIR}"
PUSH_FLAG="${4:-}" 
FULL_TAG="$IMAGE_NAME:$VERSION"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"   # optional, default docker.io

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker CLI not found in PATH" >&2
  exit 1
fi

if [ ! -f "$DOCKERFILE" ]; then
  echo "Error: Dockerfile not found at $DOCKERFILE" >&2
  exit 1
fi

echo "Building Docker image $FULL_TAG using $DOCKERFILE (context: $CONTEXT)..."
docker build -f "$DOCKERFILE" -t "$FULL_TAG" --label org.opencontainers.image.version="$VERSION" "$CONTEXT"

echo "Built image tags:"
echo "  - $FULL_TAG"

# Normalize push flag: accept 'push', '--push'
if [ -n "$PUSH_FLAG" ]; then
  case "$PUSH_FLAG" in
    push|--push)
      DO_PUSH=1
      ;;
    *)
      DO_PUSH=0
      ;;
  esac
else
  DO_PUSH=0
fi

if [ "$DO_PUSH" -eq 1 ]; then
  echo "Pushing image tags to registry..."

  # Determine registry server for docker login (optional)
  # If DOCKER_REGISTRY is set, use it; otherwise try to infer from IMAGE_NAME
  DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
  if [ -z "$DOCKER_REGISTRY" ]; then
    if [[ "$IMAGE_NAME" == *"/"* && ( "$IMAGE_NAME" == *.*/* || "$IMAGE_NAME" == *.*:*/* ) ]]; then
      DOCKER_REGISTRY="$(echo "$IMAGE_NAME" | cut -d/ -f1)"
    else
      DOCKER_REGISTRY=""
    fi
  fi

  # If credentials are provided via env vars, use non-interactive login
  if [ -n "${DOCKER_USERNAME:-}" ] && [ -n "${DOCKER_PASSWORD:-}" ]; then
    echo "Logging into Docker registry ${DOCKER_REGISTRY:-docker.io} using provided credentials..."
    if [ -n "$DOCKER_REGISTRY" ]; then
      echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin "$DOCKER_REGISTRY"
    else
      echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
    fi
  else
    echo "No DOCKER_USERNAME/DOCKER_PASSWORD env vars found. Running interactive 'docker login' (you may be prompted for credentials)."
    if [ -n "$DOCKER_REGISTRY" ]; then
      docker login "$DOCKER_REGISTRY"
    else
      docker login
    fi
  fi

  # Verify login succeeded (docker info may fail if docker daemon isn't accessible)
  if ! docker info >/dev/null 2>&1; then
    echo "Warning: 'docker info' failed; pushing may fail if not authenticated or docker daemon is unavailable." >&2
  fi

  docker push "$FULL_TAG"
  echo "Push complete"
else
  echo "Push skipped (pass 'push' or '--push' as 4th arg to enable)"
fi

