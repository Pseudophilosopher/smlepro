#!/bin/bash
# Deploy wrapper with retry logic for intermittent Firebase API failures
# Usage: ./scripts/deploy-with-retry.sh [firebase deploy arguments]

set -e

MAX_RETRIES=3
RETRY_DELAY=10
SITE_ID="smlepro"

# Default to hosting deploy if no arguments provided
if [ $# -eq 0 ]; then
    ARGS="--only hosting:$SITE_ID"
else
    ARGS="$@"
fi

echo "🚀 SMLE Pro Deploy Wrapper"
echo "   Max retries: $MAX_RETRIES"
echo "   Retry delay: ${RETRY_DELAY}s"
echo "   Arguments: $ARGS"
echo ""

for i in $(seq 1 $MAX_RETRIES); do
    echo "📦 Attempt $i of $MAX_RETRIES..."
    
    if firebase deploy $ARGS; then
        echo ""
        echo "✅ Deploy successful on attempt $i!"
        exit 0
    fi
    
    EXIT_CODE=$?
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo ""
        echo "⚠️  Attempt $i failed (exit code: $EXIT_CODE)"
        echo "   Retrying in ${RETRY_DELAY} seconds..."
        echo ""
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "❌ All $MAX_RETRIES attempts failed"
echo "   Try running with --debug flag to diagnose:"
echo "   firebase deploy $ARGS --debug"
exit 1