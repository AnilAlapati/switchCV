#!/bin/bash
# Wrapper to ensure Java 21+ is used for commands (like Firebase emulators)

# Try to find Java 21+
if [ -x "/usr/libexec/java_home" ]; then
    # MacOS specific
    JAVA_PATH=$(/usr/libexec/java_home -v 21+ 2>/dev/null)
    if [ -n "$JAVA_PATH" ]; then
        export JAVA_HOME="$JAVA_PATH"
        echo "✅ Using Java from: $JAVA_HOME"
    else
        echo "⚠️  Java 21+ not found via java_home. Using default."
    fi
fi

# Check version
java -version 2>&1 | head -n 1

# Execute the passed command
exec "$@"
