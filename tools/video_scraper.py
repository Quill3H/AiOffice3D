#!/usr/bin/env python3
"""
Multi-Platform Video Scraper & Ingestion Engine
Supports: Facebook, TikTok, Douyin (抖音), X (Twitter), YouTube Shorts, Instagram.
Uses yt-dlp + ffmpeg under ~/.local/bin/
"""

import sys
import os
import json
import subprocess
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = ROOT_DIR / "06_DU_LIEU_VA_MOCKS" / "VIDEOS"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Add ~/.local/bin to PATH for yt-dlp and ffmpeg
os.environ["PATH"] = f"/Users/quill/.local/bin:{os.environ.get('PATH', '')}"

import sys
import os
import json
import subprocess
import re
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = ROOT_DIR / "06_DU_LIEU_VA_MOCKS" / "VIDEOS"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Add ~/.local/bin to PATH for yt-dlp and ffmpeg
os.environ["PATH"] = f"/Users/quill/.local/bin:{os.environ.get('PATH', '')}"

def resolve_short_url(url: str) -> str:
    """Follow HTTP 301/302 redirects to find the canonical platform URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.geturl()
    except Exception as e:
        return url

def detect_platform(url: str) -> str:
    lower_url = url.lower()
    if "tiktok.com" in lower_url or "vt.tiktok" in lower_url:
        return "TikTok"
    elif "douyin.com" in lower_url or "iesdouyin.com" in lower_url:
        return "Douyin (抖音)"
    elif "facebook.com" in lower_url or "fb.watch" in lower_url or "fb.com" in lower_url:
        return "Facebook"
    elif "twitter.com" in lower_url or "x.com" in lower_url:
        return "X (Twitter)"
    elif "youtube.com" in lower_url or "youtu.be" in lower_url:
        return "YouTube"
    elif "instagram.com" in lower_url:
        return "Instagram"
    return "Universal"

def scrape_video(url: str, extract_audio: bool = False):
    resolved_url = resolve_short_url(url.strip())
    platform = detect_platform(resolved_url)
    print(f"[*] Detected Platform: {platform}")
    print(f"[*] Canonical URL: {resolved_url}")
    print(f"[*] Output Directory: {OUTPUT_DIR}")

    # Step 1: Probe metadata with yt-dlp
    probe_cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-warnings",
        "--no-playlist",
        resolved_url
    ]

    title = "video_download"
    duration = 0
    thumbnail = ""
    author = "Unknown"
    webpage_url = resolved_url

    try:
        probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=25)
        if probe_res.returncode == 0 and probe_res.stdout.strip():
            meta = json.loads(probe_res.stdout.strip().split("\n")[0])
            title = meta.get("title", title)
            author = meta.get("uploader") or meta.get("channel") or meta.get("creator") or meta.get("uploader_id") or "Unknown"
            duration = meta.get("duration", 0)
            thumbnail = meta.get("thumbnail", "")
            webpage_url = meta.get("webpage_url", resolved_url)
    except Exception as e:
        print(f"[!] Metadata probe notice: {e}")

    # Clean title for filename
    clean_title = re.sub(r'[\\/*?:"<>|#\n\r\t]', "", title)[:50].strip() or "clip"
    platform_slug = re.sub(r'[^a-zA-Z0-9]', '', platform).lower()
    filename_template = str(OUTPUT_DIR / f"{platform_slug}_%(id)s_{clean_title}.%(ext)s")

    # Step 2: Download command
    download_cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-playlist",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--write-thumbnail",
        "--convert-thumbnails", "jpg",
        "-o", filename_template,
        resolved_url
    ]

    print("[*] Starting video stream download...")
    download_res = subprocess.run(download_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
    
    if download_res.returncode != 0:
        print("[!] Standard format muxing failed, retrying with raw single stream...")
        fallback_cmd = [
            "yt-dlp",
            "--no-warnings",
            "--no-playlist",
            "-f", "best",
            "-o", filename_template,
            resolved_url
        ]
        download_res = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
        if download_res.returncode != 0:
            print(f"[ERROR] Download failed: {download_res.stderr}")
            return {
                "success": False,
                "error": download_res.stderr or "Không thể tải video từ link này.",
                "platform": platform,
                "url": url
            }

    # Locate downloaded file
    matching_files = list(OUTPUT_DIR.glob(f"*{clean_title}*"))
    video_file = None
    thumb_file = None

    for f in matching_files:
        if f.suffix.lower() in [".mp4", ".mkv", ".webm", ".mov"]:
            video_file = str(f)
        elif f.suffix.lower() in [".jpg", ".png", ".webp"]:
            thumb_file = str(f)

    # Fallback to latest file in OUTPUT_DIR if clean_title matched nothing
    if not video_file:
        all_videos = sorted(OUTPUT_DIR.glob("*.mp4"), key=os.path.getmtime, reverse=True)
        if all_videos:
            video_file = str(all_videos[0])

    file_size_mb = 0
    if video_file and os.path.exists(video_file):
        file_size_mb = round(os.path.getsize(video_file) / (1024 * 1024), 2)

    result = {
        "success": True,
        "platform": platform,
        "url": webpage_url,
        "title": title,
        "author": author,
        "duration_sec": duration,
        "video_path": video_file,
        "relative_path": os.path.relpath(video_file, ROOT_DIR) if video_file else "",
        "thumbnail_path": thumb_file,
        "file_size_mb": file_size_mb
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 video_scraper.py <URL>")
        sys.exit(1)
    
    target_url = sys.argv[1]
    res = scrape_video(target_url)
