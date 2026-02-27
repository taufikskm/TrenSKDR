#!/bin/bash

echo "🚀 Auto Push Started..."

while true
do
    changes=$(git status --porcelain)

    if [ -n "$changes" ]; then
        echo "Perubahan terdeteksi..."

        git add .
        git commit -m "Auto update: $(date '+%Y-%m-%d %H:%M:%S')"
        git push origin main

        echo "✅ Berhasil push"
    else
        echo "Tidak ada perubahan"
    fi

    sleep 30
done
