#!/bin/bash
#
# This script sets up a cron job to process usage-based billing periodically
# Run with sudo if your user doesn't have permission to create cron jobs
#

# Exit on any error
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PAYMENT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PAYMENT_DIR}/logs"
BILLING_SCRIPT="${SCRIPT_DIR}/process-usage-billing.js"
CRON_SCHEDULE="0 0 * * *"  # Default: Run daily at midnight
CRON_USER="$USER"  # Default: Current user

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --schedule=*)
      CRON_SCHEDULE="${1#*=}"
      shift
      ;;
    --user=*)
      CRON_USER="${1#*=}"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --schedule=SCHEDULE  Cron schedule expression (default: '0 0 * * *', daily at midnight)"
      echo "  --user=USER          User to run the cron job as (default: current user)"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Create log directory if it doesn't exist
if [[ ! -d "$LOG_DIR" ]]; then
  echo "Creating log directory: $LOG_DIR"
  mkdir -p "$LOG_DIR"
fi

# Check if the billing script exists
if [[ ! -f "$BILLING_SCRIPT" ]]; then
  echo "Error: Billing script not found at $BILLING_SCRIPT"
  exit 1
fi

# Make the script executable
chmod +x "$BILLING_SCRIPT"

# Prepare the cron job command
# We'll use Node.js to run the script and redirect output to a log file
CRON_CMD="cd $PAYMENT_DIR && NODE_ENV=production /usr/bin/node $BILLING_SCRIPT >> $LOG_DIR/usage-billing-\$(date +\%Y\%m\%d).log 2>&1"

# Create a temporary file for the cron job
TEMP_CRON=$(mktemp)

# Export the existing crontab
crontab -l -u "$CRON_USER" > "$TEMP_CRON" 2>/dev/null || echo "# New crontab for $CRON_USER" > "$TEMP_CRON"

# Check if the job already exists
if grep -q "$BILLING_SCRIPT" "$TEMP_CRON"; then
  echo "Updating existing cron job..."
  sed -i.bak "/.*$BILLING_SCRIPT.*/d" "$TEMP_CRON"
fi

# Add the new cron job
echo "# Process usage-based billing - Added $(date)" >> "$TEMP_CRON"
echo "$CRON_SCHEDULE $CRON_CMD" >> "$TEMP_CRON"

# Install the new crontab
crontab -u "$CRON_USER" "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "Cron job installed successfully for user $CRON_USER"
echo "Schedule: $CRON_SCHEDULE"
echo "Command: $CRON_CMD"
echo ""
echo "To verify, run: crontab -l -u $CRON_USER"
