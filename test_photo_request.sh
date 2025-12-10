

curl -X POST "https://graph.facebook.com/v22.0/816513801553136/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer EAAgb8fCnT9oBQDeg7RypN8udxeGATPVZBdFQq7TOQB14wjCDV3Df1FU8Fd2PxPgqXYi18d1ocMVgASSiFIeglsZAN0gcRAA63rdOHQxFtnqALp8HCTbI5dY1zDEmAQOm60mehBmwR0PqCh8WZC8QBLPXbOZBhfkuj10Q0GPngIZBIX2hZCxvttxIUhk3WOqgZDZD" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919723384957",
    "type": "template",
    "template": {
      "name": "pic_request_en",
      "language": {
        "code": "en"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "John"
            },
            {
              "type": "text",
              "text": "Grandma"
            },
            {
              "type": "text",
              "text": "Grandma"
            }
          ]
        },
        {
          "type": "button",
          "sub_type": "url",
          "index": "0",
          "parameters": [
            {
              "type": "text",
              "text": "custom-album-cover/3c56c2f4-c951-4621-b9ec-35cab278519e"
            }
          ]
        }
      ]
    }
  }'


