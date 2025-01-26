#!/bin/bash

# Initialize the run counter
counter=0

DELAY_MINUTES=10
DELAY_SECONDS=$((DELAY_MINUTES * 60)) # Convert minutes to seconds

# Infinite loop to run the script every 10 minutes
while true; do
    # Increment the counter
    counter=$((counter + 1))

    # Display a message with the current count and timestamp
    echo "Run #$counter at $(date)"

    # Run the Node.js script
    npm run start

    echo "Waiting for $DELAY_MINUTES minutes..."
    sleep $DELAY_SECONDS
done
