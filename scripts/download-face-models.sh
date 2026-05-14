#!/bin/bash
# Download face-api.js model files for the HERO Face Recognition Attendance system
# Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

set -e

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
OUTPUT_DIR="public/models"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "=== Downloading face-api.js models to $OUTPUT_DIR ==="
echo ""

# SSD MobileNet v1 (Face Detection) - ~5.4MB
echo "[1/3] Downloading SSD MobileNet v1 (face detection)..."
curl -# -o "$OUTPUT_DIR/ssd_mobilenetv1_model-weights_manifest.json" \
  "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json"
curl -# -o "$OUTPUT_DIR/ssd_mobilenetv1_model-shard1" \
  "$BASE_URL/ssd_mobilenetv1_model-shard1"
curl -# -o "$OUTPUT_DIR/ssd_mobilenetv1_model-shard2" \
  "$BASE_URL/ssd_mobilenetv1_model-shard2"
echo "  ✓ SSD MobileNet v1 downloaded"
echo ""

# Face Landmark 68 (Landmark Detection) - ~350KB
echo "[2/3] Downloading Face Landmark 68 (landmark detection)..."
curl -# -o "$OUTPUT_DIR/face_landmark_68_model-weights_manifest.json" \
  "$BASE_URL/face_landmark_68_model-weights_manifest.json"
curl -# -o "$OUTPUT_DIR/face_landmark_68_model-shard1" \
  "$BASE_URL/face_landmark_68_model-shard1"
echo "  ✓ Face Landmark 68 downloaded"
echo ""

# Face Recognition (Embedding Extraction) - ~6.2MB
echo "[3/3] Downloading Face Recognition (embedding extraction)..."
curl -# -o "$OUTPUT_DIR/face_recognition_model-weights_manifest.json" \
  "$BASE_URL/face_recognition_model-weights_manifest.json"
curl -# -o "$OUTPUT_DIR/face_recognition_model-shard1" \
  "$BASE_URL/face_recognition_model-shard1"
curl -# -o "$OUTPUT_DIR/face_recognition_model-shard2" \
  "$BASE_URL/face_recognition_model-shard2"
echo "  ✓ Face Recognition downloaded"
echo ""

echo "=== All models downloaded successfully! ==="
echo "Total files: 8 (3 manifests + 5 weight shards)"
echo "Location: $OUTPUT_DIR/"
