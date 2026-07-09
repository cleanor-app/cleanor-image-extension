#!/usr/bin/env python3
import subprocess, sys
SC = "/private/tmp/claude-501/-Users-igorshenshin-Developer-Web-cleanor-web/46b00aa4-b71c-4eef-8700-31cf9efbc58d/scratchpad/promo"
FPS = 30
T = 0.6  # crossfade seconds

# (image, seconds) — durations sum to 35.5; after 6 crossfades of T → 35.5 - 6*0.6 = 31.9s ≈ voiceover
scenes = [
    ("scene-intro.png", 5.0),
    ("scene-screenshot-1-hero.png", 5.0),
    ("scene-screenshot-2-formats.png", 3.6),
    ("scene-screenshot-3-rightclick.png", 6.0),
    ("scene-screenshot-5-screenshots.png", 4.5),
    ("scene-screenshot-4-controls.png", 4.0),
    ("scene-outro.png", 7.9),
]

inputs = []
for img, d in scenes:
    inputs += ["-i", f"{SC}/{img}"]
inputs += ["-i", f"{SC}/voice.mp3"]
n = len(scenes)

fc = []
for i, (img, d) in enumerate(scenes):
    frames = int(round(d * FPS))
    zdir = "in" if i % 2 == 0 else "out"
    if zdir == "in":
        z = "min(zoom+0.0007,1.10)"
    else:
        z = "if(eq(on,1),1.10,max(zoom-0.0007,1.0))"
    fc.append(
        f"[{i}:v]scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,"
        f"zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps={FPS},"
        f"setsar=1,format=yuv420p[v{i}]"
    )

# xfade chain
prev = "v0"
run = scenes[0][1]
for i in range(1, n):
    off = run - T
    out = f"x{i}"
    fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={T}:offset={off:.3f}[{out}]")
    prev = out
    run = run + scenes[i][1] - T

# fade in/out on the whole thing + audio
total = run
fc.append(f"[{prev}]fade=t=in:st=0:d=0.4,fade=t=out:st={total-0.5:.3f}:d=0.5[vout]")
fc.append(f"[{n}:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={total-0.6:.3f}:d=0.6[aout]")

cmd = ["ffmpeg", "-y", *inputs,
       "-filter_complex", ";".join(fc),
       "-map", "[vout]", "-map", "[aout]",
       "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
       "-t", f"{total:.3f}",
       f"{SC}/cleanor-promo.mp4"]
print("total video:", round(total, 2), "s")
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    sys.stderr.write(r.stderr[-2500:])
    sys.exit(1)
print("OK →", f"{SC}/cleanor-promo.mp4")
