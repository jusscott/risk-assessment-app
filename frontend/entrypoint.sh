#!/bin/sh
set -e

# Reinstall recharts to ensure it's properly installed
echo "Ensuring recharts is properly installed..."
npm install recharts@2.15.3 --no-save

# Start with HOST=0.0.0.0 to bind to all interfaces
echo "Starting React development server on all interfaces..."
HOST=0.0.0.0 npm start
