#!/bin/bash

# Usage: ./send.sh <chat_id> [message]
# Example: ./send.sh 123456789
# Example: ./send.sh 123456789 "Custom message here"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

if [ -z "$1" ]; then
  echo "Usage: ./send.sh <chat_id> [message]"
  exit 1
fi

CHAT_ID="$1"

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "Error: TELEGRAM_BOT_TOKEN is not set"
  echo "Either create .env file with TELEGRAM_BOT_TOKEN=your_token"
  echo "Or run: export TELEGRAM_BOT_TOKEN=your_bot_token"
  exit 1
fi

MESSAGE="${2:-Hai! 😊

Terima kasih banyak udah ngobrol sama aku selama ini. Seneng banget bisa kenal dan ngobrol bareng kamu! 💕

Aku pamit dulu ya. Sampai ketemu lagi! ✨

---

Hi! 😊

Thank you so much for chatting with me all this time. I'm really happy to have met and talked with you! 💕

I'm signing off for now. See you again! ✨

— Aisyah}"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg chat_id "$CHAT_ID" --arg text "$MESSAGE" '{chat_id: $chat_id, text: $text}')"
