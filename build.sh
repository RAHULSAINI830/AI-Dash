#!/bin/bash

echo "Installing backend dependencies..."
npm install

echo "Installing frontend dependencies and building React app..."
cd my-app
npm install
npm run build
cd ..

echo "Build complete."
