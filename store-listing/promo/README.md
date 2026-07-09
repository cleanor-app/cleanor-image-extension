# Promo video

- `cleanor-promo.mp4` — 1920x1080, ~32s, h264/aac. Brand intro + 5 feature scenes + CTA outro,
  Ken Burns zoom + crossfades, ElevenLabs (George) voiceover.
- `voiceover.mp3` — the narration (ElevenLabs voice JBFqnCBsd6RMkjVDRZzb "George").
- `script.txt` — the narration script.

## Rebuild
1. Voiceover: ElevenLabs TTS with the George voice (key in Job/meta-ua-copilot/.env `ELEVENLABS_API_KEY`).
2. `node build-scenes.mjs` — renders scene-*.png (intro/outro via Playwright; store screenshots padded to 1920x1080).
   Run from a dir where `sharp`/`playwright` resolve (e.g. cleanor-web).
3. `python3 build-video.py` — assembles scenes + voiceover into cleanor-promo.mp4 via ffmpeg.
