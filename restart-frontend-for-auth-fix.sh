#!/bin/bash

echo "🔄 Restarting Frontend for Authentication Error Handling Fix"
echo "=========================================================="

# Navigate to frontend directory
cd frontend

echo "📦 Installing any missing dependencies..."
npm install

echo "🧹 Clearing React build cache..."
rm -rf build/
rm -rf node_modules/.cache/

echo "🔄 Restarting React development server..."
echo "   (This will start the frontend on http://localhost:3000)"
echo ""
echo "🎯 After restart, try logging in with:"
echo "   📧 Email: jusscott@gmail.com"
echo "   🔐 Password: Password123"
echo ""
echo "✨ The error handling has been improved!"
echo "   - You should now see specific error messages instead of 'Unexpected Error'"
echo "   - Check browser console for additional debugging info"
echo ""

# Start the development server
npm start
