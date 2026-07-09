# Promo video

- `cleanor-promo.mp4` — 1920x1080, ~32s, H.264/AAC. Intro + 5 feature scenes + CTA outro,
  STATIC scenes with crossfades (no zoom → no text jitter), ElevenLabs (George) voiceover.
- `voiceover.mp3` — narration (ElevenLabs voice JBFqnCBsd6RMkjVDRZzb "George"). `script.txt` — the text.

## Sources
Feature scenes are the Chrome Web Store graphics from the Claude Design project
"Cleanor Chrome Store Graphics" (png-export/cws-screenshot-1..5.html — self-contained HTML with
the screenshot embedded as base64). Intro/outro are generated to match (serif Newsreader headline).

## Rebuild
1. Voiceover: ElevenLabs TTS, George voice (key in Job/meta-ua-copilot/.env `ELEVENLABS_API_KEY`).
2. Download the png-export/*.html from the design project into scratch, then
   `node render-scenes.mjs` → cws-scene-*.png (intro/outro + the 5 screenshots padded to 1920x1080).
   Run where sharp/playwright resolve (e.g. cleanor-web).
3. `python3 build-video.py` → assembles static scenes + voiceover via ffmpeg (no zoompan = no jitter).
