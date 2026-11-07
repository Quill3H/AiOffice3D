#!/bin/bash
PID=$(lsof -ti :3333 -sTCP:LISTEN)
if [ -n "$PID" ]; then
  kill -9 $PID 2>/dev/null
  echo "🛑 Đã tắt Văn Phòng AI Studio (PID: $PID)"
else
  echo "ℹ️ Văn Phòng AI Studio hiện không chạy."
fi
