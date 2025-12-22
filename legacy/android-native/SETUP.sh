#!/bin/bash

# Pocket Studio - Development Setup Script
# This script automates the setup process for local development

set -e

echo "======================================"
echo "Pocket Studio - Development Setup"
echo "======================================"
echo ""

# Check for required tools
echo "Checking for required tools..."

if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install JDK 11 or later."
    exit 1
fi
echo "✓ Java found: $(java -version 2>&1 | head -1)"

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git."
    exit 1
fi
echo "✓ Git found: $(git --version)"

# Check for Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo ""
    echo "⚠️  ANDROID_HOME is not set."
    echo "Please set ANDROID_HOME to your Android SDK directory:"
    echo "  export ANDROID_HOME=/path/to/android-sdk"
    echo ""
    read -p "Enter your Android SDK path (or press Enter to skip): " android_path
    if [ ! -z "$android_path" ]; then
        export ANDROID_HOME="$android_path"
    fi
fi

if [ ! -z "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    echo "✓ Android SDK found at: $ANDROID_HOME"
else
    echo "⚠️  Android SDK not found. You can still build with Android Studio."
fi

echo ""
echo "Setting up project..."

# Create local.properties if it doesn't exist
if [ ! -f "local.properties" ]; then
    echo "Creating local.properties..."
    if [ ! -z "$ANDROID_HOME" ]; then
        echo "sdk.dir=$ANDROID_HOME" > local.properties
        echo "✓ local.properties created"
    fi
fi

# Make gradlew executable
echo "Making gradlew executable..."
chmod +x gradlew
echo "✓ gradlew is executable"

# Download Gradle dependencies
echo ""
echo "Downloading Gradle dependencies..."
echo "This may take several minutes on first run..."
./gradlew --version

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Open the project in Android Studio"
echo "2. Wait for Gradle sync to complete"
echo "3. Connect a device or start an emulator"
echo "4. Click the Run button to build and install"
echo ""
echo "Or build from command line:"
echo "  ./gradlew assembleDebug"
echo ""
