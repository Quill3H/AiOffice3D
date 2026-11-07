#!/usr/bin/env python3
"""
Render Viral Short Video 9:16 with High-Retention Visuals & Subtitles
Uses FFmpeg + High-Quality Audio Mixing (No 110Hz sine wave tone)
"""

import os
import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = ROOT_DIR / "06_DU_LIEU_VA_MOCKS" / "VIDEOS"
PROJECT_DIR = ROOT_DIR / "01_DU_AN_CHUNG"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PROJECT_DIR.mkdir(parents=True, exist_ok=True)

SOURCE_VIDEO = OUTPUT_DIR / "tiktok_7704157938734189842_Nếu bạn kỷ luật hoàn toàn  viral xuhuong kyluatban.mp4"
OUTPUT_VIDEO = OUTPUT_DIR / "video_viral_ky_luat_thep_9_16_remix.mp4"
SCRIPT_MD = PROJECT_DIR / "KICH_BAN_VIDEO_VIRAL_KY_LUAT_THEP_HIGH_RETENTION.md"

os.environ["PATH"] = f"/Users/quill/.local/bin:{os.environ.get('PATH', '')}"

def get_audio_duration(media_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(media_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

def render_video(use_source_audio: bool = True):
    duration = 29.8
    font_file = "/System/Library/Fonts/Helvetica.ttc"
    print(f"[*] 1. Preparing audio pipeline (use_source_audio={use_source_audio})...")
    
    audio_inputs = []
    audio_map = ""
    
    if use_source_audio and SOURCE_VIDEO.exists():
        print("[*] 2. Extracting authentic high-energy motivational voice from source video...")
        audio_inputs = ["-i", str(SOURCE_VIDEO)]
        # Filter for source audio: trim to 29.8s, compress, normalize to -14 LUFS standard
        audio_filter = f"[1:a]atrim=start=0:duration={duration},asetpts=PTS-STARTPTS,loudnorm=I=-14:LRA=7:tp=-1.5[aout]"
    else:
        # Synthesize fallback without sine wave buzzing
        print("[*] 2. Synthesizing voice-over with macOS TTS engine...")
        voice_text = (
            "Nếu bạn biến mất trong sáu tháng và kỷ luật một trăm phần trăm, "
            "bạn sẽ vượt lên trên chín mươi chín phần trăm những người lười biếng ngoài kia. "
            "Sự thật tàn nhẫn là: Không ai quan tâm bạn mệt mỏi thế nào, "
            "cuộc đời chỉ nhìn vào kết quả. "
            "Ba nguyên tắc kỷ luật thép: "
            "Một, ngừng lướt mạng vô bổ. "
            "Hai, ngừng than vãn viện cớ. "
            "Ba, tập trung cao độ biến im lặng thành kỳ tích. "
            "Kỷ luật chính là tự do đích thực. "
            "Bắt đầu ngay hôm nay!"
        )
        aiff_path = "/tmp/viral_voice.aiff"
        wav_path = "/tmp/viral_voice.wav"
        subprocess.run(["say", "-v", "Linh", "-o", aiff_path, voice_text], check=True)
        subprocess.run(["ffmpeg", "-y", "-i", aiff_path, "-ar", "44100", "-ac", "2", wav_path],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        audio_inputs = ["-i", wav_path]
        audio_filter = f"[1:a]atrim=start=0:duration={duration},asetpts=PTS-STARTPTS,loudnorm=I=-14:LRA=7[aout]"

    print("[*] 3. Building high-retention 9:16 vertical render pipeline (1080x1920)...")
    
    filter_complex = (
        # Split source into background and foreground
        f"[0:v]trim=start=0:duration={duration},setpts=PTS-STARTPTS,split=2[bg_raw][fg_raw];"
        # Background: fill 1080x1920, heavily blurred with dark vignette
        "[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        "boxblur=25:5,colorchannelmixer=aa=0.55[bg];"
        # Foreground: crisp fit in 1080 width
        "[fg_raw]scale=1080:-1[fg];"
        # Overlay fg onto bg centered
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
        
        # 1. Top Branding Tag
        f"[base]drawtext=fontfile={font_file}:text='★ KỶ LUẬT BẢN THÂN 100% ★':"
        "fontcolor=0x06B6D4:fontsize=36:x=(w-text_w)/2:y=180:"
        "box=1:boxcolor=0x0F172A@0.85:boxborderw=14[v1];"
        
        # 2. Hook Scene 1 (0 to 6.5s)
        f"[v1]drawtext=fontfile={font_file}:text='NẾU BẠN BIẾN MẤT 6 THÁNG...':"
        "fontcolor=0xFACC15:fontsize=52:x=(w-text_w)/2:y=280:"
        "box=1:boxcolor=0x000000@0.9:boxborderw=18:enable='between(t,0,6.5)',"
        f"drawtext=fontfile={font_file}:text='Bạn sẽ vượt lên 99% những người lười biếng ngoài kia!':"
        "fontcolor=0xFFFFFF:fontsize=40:x=(w-text_w)/2:y=1500:"
        "box=1:boxcolor=0x1E1B4B@0.9:boxborderw=16:enable='between(t,0,6.5)'[v2];"
        
        # 3. Hook Scene 2 (6.5 to 13.5s)
        f"[v2]drawtext=fontfile={font_file}:text='SỰ THẬT TÀN NHẪN VỀ CUỘC ĐỜI':"
        "fontcolor=0xEF4444:fontsize=50:x=(w-text_w)/2:y=280:"
        "box=1:boxcolor=0x000000@0.9:boxborderw=18:enable='between(t,6.5,13.5)',"
        f"drawtext=fontfile={font_file}:text='Không ai quan tâm bạn mệt thế nào - Chỉ nhìn kết quả!':"
        "fontcolor=0xFFFFFF:fontsize=38:x=(w-text_w)/2:y=1500:"
        "box=1:boxcolor=0x450A0A@0.9:boxborderw=16:enable='between(t,6.5,13.5)'[v3];"
        
        # 4. Hook Scene 3 (13.5 to 22.5s)
        f"[v3]drawtext=fontfile={font_file}:text='3 QUY TẮC KỶ LUẬT THÉP':"
        "fontcolor=0x38BDF8:fontsize=52:x=(w-text_w)/2:y=280:"
        "box=1:boxcolor=0x000000@0.9:boxborderw=18:enable='between(t,13.5,22.5)',"
        f"drawtext=fontfile={font_file}:text='1. Ngừng lướt mạng  2. Ngừng viện cớ  3. Tập trung cao độ':"
        "fontcolor=0xFFFFFF:fontsize=36:x=(w-text_w)/2:y=1500:"
        "box=1:boxcolor=0x082F49@0.9:boxborderw=16:enable='between(t,13.5,22.5)'[v4];"
        
        # 5. Hook Scene 4 (22.5 to end)
        f"[v4]drawtext=fontfile={font_file}:text='KỶ LUẬT CHÍNH LÀ TỰ DO':"
        "fontcolor=0x10B981:fontsize=54:x=(w-text_w)/2:y=280:"
        "box=1:boxcolor=0x000000@0.9:boxborderw=18:enable='gte(t,22.5)',"
        f"drawtext=fontfile={font_file}:text='Đau đớn vì kỷ luật hay hối hận suốt đời? BẮT ĐẦU NGAY!':"
        "fontcolor=0xFFFFFF:fontsize=38:x=(w-text_w)/2:y=1500:"
        "box=1:boxcolor=0x064E3B@0.9:boxborderw=16:enable='gte(t,22.5)'[vfinal];"
        
        + audio_filter
    )
    
    render_cmd = [
        "ffmpeg", "-y",
        "-i", str(SOURCE_VIDEO),
        *audio_inputs,
        "-filter_complex", filter_complex,
        "-map", "[vfinal]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(duration),
        str(OUTPUT_VIDEO)
    ]
    
    print("[*] 4. Executing FFmpeg render...")
    subprocess.run(render_cmd, check=True)
    
    # Generate thumbnail at 3.5s
    thumb_path = OUTPUT_VIDEO.with_suffix(".jpg")
    cmd_thumb = [
        "ffmpeg", "-y",
        "-ss", "00:00:03.500",
        "-i", str(OUTPUT_VIDEO),
        "-vframes", "1",
        "-q:v", "2",
        str(thumb_path)
    ]
    subprocess.run(cmd_thumb, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    file_size_mb = OUTPUT_VIDEO.stat().st_size / (1024 * 1024)
    print(f"[+] Render complete: {OUTPUT_VIDEO} ({file_size_mb:.2f} MB)")
    print(f"[+] Thumbnail: {thumb_path}")
    return str(OUTPUT_VIDEO)

if __name__ == "__main__":
    use_src = True
    if len(sys.argv) > 1 and sys.argv[1] == "--tts":
        use_src = False
    render_video(use_source_audio=use_src)
