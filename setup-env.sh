#!/bin/bash

# Setup script for Document Extraction Platform
# This script helps you set up the required environment variables

echo "🔧 Document Extraction Platform - Environment Setup"
echo "=================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "✅ .env file created!"
else
    echo "📝 .env file already exists"
fi

echo ""
echo "🔑 IMPORTANT: You need to set your OpenAI API key!"
echo ""
echo "Please edit the .env file and replace 'your-openai-api-key-here' with your actual OpenAI API key:"
echo ""
echo "   OPENAI_API_KEY=sk-proj-your-actual-key-here"
echo ""
echo "After setting the API key, restart the backend service:"
echo "   docker-compose restart backend"
echo ""
echo "🚀 The AI-powered field generation feature requires a valid OpenAI API key to work."
echo ""
