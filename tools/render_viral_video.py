#!/usr/bin/env python3
"""
Render Viral Short Video 9:16 with High-Retention Visuals & Subtitles
Uses FFmpeg + macOS native voice synthesis
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

def generate_voiceover() -> str:
    print("[*] 1. Synthesizing Vietnamese voice-over with macOS Linh engine...")
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
    
    cmd_say = ["say", "-v", "Linh", "-o", aiff_path, voice_text]
    subprocess.run(cmd_say, check=True)
    
    cmd_conv = [
        "ffmpeg", "-y", "-i", aiff_path,
        "-ar", "44100", "-ac", "2",
        wav_path
    ]
    subprocess.run(cmd_conv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print(f"[*] Voiceover ready: {wav_path}")
    return wav_path

def get_audio_duration(audio_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

def render_video():
    voice_wav = generate_voiceover()
    duration = get_audio_duration(voice_wav)
    print(f"[*] Audio duration: {duration:.2f}s")
    
    # Generate background ambient synth tone
    bgm_wav = "/tmp/bgm_pulse.wav"
    print("[*] 2. Generating background audio rhythm...")
    cmd_bgm = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"sine=frequency=110:duration={duration+1}",
        "-af", "volume=0.08, lowpass=f=250",
        bgm_wav
    ]
    subprocess.run(cmd_bgm, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    print("[*] 3. Building high-retention 9:16 render pipeline...")
    font_file = "/System/Library/Fonts/Helvetica.ttc"
    
    # Complex filtergraph:
    # 1. Takes source video, loops or trims to duration
    # 2. Creates blurred 9:16 background
    # 3. Overlays crisp scaled video in middle
    # 4. Overlays dynamic header hook and timed caption cards
    
    filter_complex = (
        # Split source into background and foreground
        f"[0:v]trim=start=10:duration={duration},setpts=PTS-STARTPTS,split=2[bg_raw][fg_raw];"
        # Background: fill 1080x1920, heavily blurred with dark vignette
        "[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        "boxblur=25:5,colorchannelmixer=aa=0.6[bg];"
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
        
        # Audio mix: Voice 0dB + BGM -14dB
        "[1:a]volume=1.0[v_voice];"
        "[2:a]volume=0.2[v_bgm];"
        "[v_voice][v_bgm]amix=inputs=2:duration=first[aout]"
    )
    
    render_cmd = [
        "ffmpeg", "-y",
        "-i", str(SOURCE_VIDEO),
        "-i", voice_wav,
        "-i", bgm_wav,
        "-filter_complex", filter_complex,
        "-map", "[vfinal]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(duration),
        str(OUTPUT_VIDEO)
    ]
    
    print("[*] 4. Executing FFmpeg render...")
    res = subprocess.run(render_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[!] Error rendering: {res.stderr}")
        sys.exit(1)
        
    file_size_mb = round(os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024), 2)
    print(f"[✓] Render completed successfully!")
    print(f"    Output Video: {OUTPUT_VIDEO}")
    print(f"    File Size: {file_size_mb} MB")
    print(f"    Duration: {duration:.1f}s (Aspect 9:16, 1080x1920)")
    
    # Save accompanying Script Markdown
    script_content = f"""# KỊCH BẢN VIDEO VIRAL TIKTOK / REELS 9:16 (HIGH-RETENTION REMIX)
**Chủ đề**: Kỷ Luật Thép — Biến Mất 6 Tháng Để Hủy Diệt Mọi Giới Hạn
**Thời lượng thực tế**: {duration:.1f} giây (Chuẩn 100% tỷ lệ giữ chân TikTok)
**Định dạng video**: MP4 Dọc 9:16 (1080 x 1920)
**Tệp video đã render**: \`{OUTPUT_VIDEO.name}\` ({file_size_mb} MB)

---

## 🎯 CÔNG THỨC GIỮ CHÂN 100% (RETENTION ENGINEERING)

### 1. Phân cảnh 1 (0:00 - 0:06.5) — Cú sốc nhận thức (Curiosity Gap)
- **Top Overlay Hook**: \`NẾU BẠN BIẾN MẤT 6 THÁNG...\` (Chữ vàng nổi bật trên nền đen mờ)
- **Lời bình voice-over (Linh vi_VN)**: *"Nếu bạn biến mất trong sáu tháng và kỷ luật một trăm phần trăm, bạn sẽ vượt lên trên chín mươi chín phần trăm những người lười biếng ngoài kia!"*
- **Tâm lý học giữ chân**: Người xem bị khựng lại vì tò mò "Biến mất 6 tháng thì làm được gì?".

### 2. Phân cảnh 2 (0:06.5 - 0:13.5) — Cú tát thức tỉnh (Pattern Interrupt)
- **Top Overlay Hook**: \`SỰ THẬT TÀN NHẪN VỀ CUỘC ĐỜI\` (Đỏ cảnh báo)
- **Lời bình**: *"Sự thật tàn nhẫn là: Không ai quan tâm bạn mệt mỏi thế nào, cuộc đời chỉ nhìn vào kết quả."*
- **Tâm lý học giữ chân**: Chấm dứt thói quen viện cớ, tạo sự đồng cảm sâu sắc.

### 3. Phân cảnh 3 (0:13.5 - 0:22.5) — 3 Quy tắc Kỷ luật Thép
- **Top Overlay Hook**: \`3 QUY TẮC KỶ LUẬT THÉP\` (Xanh Cyan)
- **Lời bình**: *"Ba nguyên tắc kỷ luật thép: Một, ngừng lướt mạng vô bổ. Hai, ngừng than vãn viện cớ. Ba, tập trung cao độ biến im lặng thành kỳ tích!"*
- **Hành vi**: Người xem thường lưu lại video (Save to Favorites) để ghi nhớ 3 nguyên tắc này.

### 4. Phân cảnh 4 (0:22.5 - 0:30) — Kêu gọi hành động dứt khoát
- **Top Overlay Hook**: \`KỶ LUẬT CHÍNH LÀ TỰ DO\` (Emerald Xanh lục)
- **Lời bình**: *"Kỷ luật chính là tự do đích thực. Bạn chọn đau đớn vì kỷ luật hay hối hận suốt đời? Bắt đầu ngay hôm nay!"*
- **Kêu gọi**: Tạo động lực chia sẻ và bình luận cam kết kỷ luật.

---
*Video được biên tập và xuất bản tự động bởi Studio Concat MCP & FFmpeg Engine.*
"""
    with open(SCRIPT_MD, "w", encoding="utf-8") as f:
        f.write(script_content)
    print(f"[✓] Script saved to: {SCRIPT_MD}")

if __name__ == "__main__":
    render_video()
