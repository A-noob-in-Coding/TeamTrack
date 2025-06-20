#!/bin/bash

echo "🚀 Starting deployment process..."

# Build Frontend
echo "📦 Building Frontend..."
cd Frontend
npm install
npm run build
cd ..

# Build Backend
echo "🔧 Building Backend..."
cd Backend
npm install
cd ..
