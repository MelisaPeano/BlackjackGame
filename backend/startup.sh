#!/bin/bash
# Script de arranque automático para Azure App Service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
