#!/bin/bash

# Script to help check WhatsApp message status
# Note: WhatsApp doesn't provide a direct API to query status
# Status updates come via webhooks only

MESSAGE_ID="wamid.HBgMOTE5NzIzMzg0OTU3FQIAERgSNjY1OTFGMzNFQTNGNjEzRTUzAA=="
PHONE_NUMBER_ID="816513801553136"
ACCESS_TOKEN="EAAgb8fCnT9oBQDeg7RypN8udxeGATPVZBdFQq7TOQB14wjCDV3Df1FU8Fd2PxPgqXYi18d1ocMVgASSiFIeglsZAN0gcRAA63rdOHQxFtnqALp8HCTbI5dY1zDEmAQOm60mehBmwR0PqCh8WZC8QBLPXbOZBhfkuj10Q0GPngIZBIX2hZCxvttxIUhk3WOqgZDZD"

echo "⚠️  WhatsApp doesn't provide a direct API to query message status"
echo "Status updates are sent via webhooks to your webhook endpoint"
echo ""
echo "To check status:"
echo "1. Check your server logs for: '📊 WhatsApp Message Status Update'"
echo "2. Ensure your webhook is configured in Meta Business Manager"
echo "3. Status updates are sent automatically by WhatsApp"
echo ""
echo "Message ID from your last send:"
echo "$MESSAGE_ID"
echo ""
echo "Check your server logs or webhook endpoint for status updates."










