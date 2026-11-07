#!/bin/bash
# Script khởi động Văn Phòng AI Studio
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Kiểm tra xem server đã chạy chưa
PID=$(lsof -tiTCP:3333 -sTCP:LISTEN)
if [ -n "$PID" ]; then
  echo "⚠️ Cổng 3333 đang chạy bởi PID: $PID. Đang khởi động lại..."
  kill -9 $PID 2>/dev/null
  sleep 1
fi

echo "🚀 Đang khởi động Văn Phòng AI Studio..."
nohup node server.js > studio.log 2>&1 &
SERVER_PID=$!

sleep 1
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Văn Phòng AI Studio đã chạy thành công tại: http://localhost:3333 (PID: $SERVER_PID)"
  echo "📄 Xem log realtime tại: $DIR/studio.log"
else
  echo "❌ Khởi động thất bại. Kiểm tra log:"
  cat studio.log
fi
