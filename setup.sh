#!/bin/bash
# Setup and run script

set -e

echo "🚀 UI Observer - Playwright Test Dashboard Setup"
echo "=================================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium

# Build project
echo "🔨 Building project..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start development server:"
echo "   npm run dev"
echo ""
echo "2. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "3. Submit a test URL (e.g., https://github.com)"
echo ""
echo "4. Watch test results in real-time!"
echo ""
echo "Documentation:"
echo "- QUICKSTART.md    - Get started in 5 minutes"
echo "- ARCHITECTURE.md  - System design and implementation"
echo "- API.md          - Complete API reference"
