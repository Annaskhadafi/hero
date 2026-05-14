# Face-api.js Model Files

This directory contains the TensorFlow.js model files required for client-side face recognition in the HERO PWA.

## Required Models

| Model            | Purpose                                   | Approx Size |
| ---------------- | ----------------------------------------- | ----------- |
| SSD MobileNet v1 | Face detection                            | ~5.4 MB     |
| Face Landmark 68 | Facial landmark detection (68 points)     | ~350 KB     |
| Face Recognition | 128-dimensional face embedding extraction | ~6.2 MB     |

**Total: ~12 MB** (downloaded once, cached by browser thereafter)

## Model Files

The following files must be present in this directory:

### SSD MobileNet v1 (Face Detection)

- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1` (binary weight file)
- `ssd_mobilenetv1_model-shard2` (binary weight file)

### Face Landmark 68 (Landmark Detection)

- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1` (binary weight file)

### Face Recognition (Embedding Extraction)

- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1` (binary weight file)
- `face_recognition_model-shard2` (binary weight file)

## How to Download

Run the download script from the project root:

### Linux / macOS / Git Bash

```bash
bash scripts/download-face-models.sh
```

### Windows (PowerShell)

```powershell
.\scripts\download-face-models.ps1
```

## Source

All model files are downloaded from the official face-api.js repository:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## Notes

- Binary model files (`*.bin`, shard files) are excluded from git via `.gitignore`
- Each developer must run the download script after cloning the repository
- Models are served as static files from `/models/` path in the browser
- The browser caches these files after first download for subsequent sessions
