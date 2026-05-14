# Download face-api.js model files for the HERO Face Recognition Attendance system
# Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
#
# Usage: .\scripts\download-face-models.ps1

$ErrorActionPreference = "Stop"

$BaseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$OutputDir = "public\models"

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "=== Downloading face-api.js models to $OutputDir ===" -ForegroundColor Cyan
Write-Host ""

# SSD MobileNet v1 (Face Detection) - ~5.4MB
Write-Host "[1/3] Downloading SSD MobileNet v1 (face detection)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "$BaseUrl/ssd_mobilenetv1_model-weights_manifest.json" `
    -OutFile "$OutputDir\ssd_mobilenetv1_model-weights_manifest.json"
Invoke-WebRequest -Uri "$BaseUrl/ssd_mobilenetv1_model-shard1" `
    -OutFile "$OutputDir\ssd_mobilenetv1_model-shard1"
Invoke-WebRequest -Uri "$BaseUrl/ssd_mobilenetv1_model-shard2" `
    -OutFile "$OutputDir\ssd_mobilenetv1_model-shard2"
Write-Host "  OK - SSD MobileNet v1 downloaded" -ForegroundColor Green
Write-Host ""

# Face Landmark 68 (Landmark Detection) - ~350KB
Write-Host "[2/3] Downloading Face Landmark 68 (landmark detection)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "$BaseUrl/face_landmark_68_model-weights_manifest.json" `
    -OutFile "$OutputDir\face_landmark_68_model-weights_manifest.json"
Invoke-WebRequest -Uri "$BaseUrl/face_landmark_68_model-shard1" `
    -OutFile "$OutputDir\face_landmark_68_model-shard1"
Write-Host "  OK - Face Landmark 68 downloaded" -ForegroundColor Green
Write-Host ""

# Face Recognition (Embedding Extraction) - ~6.2MB
Write-Host "[3/3] Downloading Face Recognition (embedding extraction)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "$BaseUrl/face_recognition_model-weights_manifest.json" `
    -OutFile "$OutputDir\face_recognition_model-weights_manifest.json"
Invoke-WebRequest -Uri "$BaseUrl/face_recognition_model-shard1" `
    -OutFile "$OutputDir\face_recognition_model-shard1"
Invoke-WebRequest -Uri "$BaseUrl/face_recognition_model-shard2" `
    -OutFile "$OutputDir\face_recognition_model-shard2"
Write-Host "  OK - Face Recognition downloaded" -ForegroundColor Green
Write-Host ""

Write-Host "=== All models downloaded successfully! ===" -ForegroundColor Cyan
Write-Host "Total files: 8 (3 manifests + 5 weight shards)"
Write-Host "Location: $OutputDir\"
