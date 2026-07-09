import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const CWS = '/private/tmp/claude-501/-Users-igorshenshin-Developer-Web-cleanor-web/46b00aa4-b71c-4eef-8700-31cf9efbc58d/scratchpad/cws';
const OUT = '/private/tmp/claude-501/-Users-igorshenshin-Developer-Web-cleanor-web/46b00aa4-b71c-4eef-8700-31cf9efbc58d/scratchpad/promo';
const BLUE = '#4576FD';
const icon = 'data:image/png;base64,' + readFileSync('/Users/igorshenshin/Developer/Web/cleanor-image-extension/icons/icon-128.png').toString('base64');

const FONTLINK = `<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,600;6..72,700&display=swap" rel="stylesheet">`;
const SANS = `-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const SERIF = `'Newsreader',Georgia,'Times New Roman',serif`;
const sp = (x, y, s, o) => `<div style="position:absolute;top:${y}px;left:${x}px;opacity:${o}"><svg width="${s}" height="${s}" viewBox="0 0 14 14"><path d="M7 0c.4 4.6 2.4 6.6 7 7c-4.6.4-6.6 2.4-7 7c-.4-4.6-2.4-6.6-7-7c4.6-.4 6.6-2.4 7-7z" fill="#fff"/></svg></div>`;
const SPARK = [sp(230, 150, 30, .18), sp(1500, 130, 20, .18), sp(1680, 520, 34, .14), sp(180, 760, 24, .15), sp(980, 90, 16, .18), sp(1620, 900, 22, .15)].join('');
const GRAD = `radial-gradient(1500px 900px at 50% 30%, #5A83FF 0%, ${BLUE} 64%)`;
const stage = (inner) => `<!doctype html><html><head><meta charset="utf-8">${FONTLINK}</head><body style="margin:0;"><div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${GRAD};">${SPARK}${inner}</div></body></html>`;

const intro = stage(`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
  <img src="${icon}" style="width:220px;height:220px;border-radius:50px;box-shadow:0 34px 90px rgba(10,20,60,.5);margin-bottom:46px;"/>
  <div style="color:#fff;font-family:${SERIF};font-weight:700;font-size:150px;line-height:1;letter-spacing:-1px;">Cleanor</div>
  <div style="color:#D3DEFF;font-family:${SANS};font-weight:500;font-size:44px;margin-top:32px;letter-spacing:.5px;">Compress · Convert · Screenshot · on your device</div>
</div>`);

const outro = stage(`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
  <img src="${icon}" style="width:170px;height:170px;border-radius:40px;box-shadow:0 30px 80px rgba(10,20,60,.5);margin-bottom:44px;"/>
  <div style="color:#fff;font-family:${SERIF};font-weight:700;font-size:108px;line-height:1.04;letter-spacing:-1px;text-align:center;">Get it free on the<br/>Chrome Web Store</div>
  <div style="margin-top:56px;display:inline-flex;align-items:center;gap:16px;background:#fff;color:#2f55d4;font-family:${SANS};font-weight:700;font-size:44px;padding:26px 54px;border-radius:22px;box-shadow:0 18px 50px rgba(10,20,60,.4);">
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Add to Chrome
  </div>
  <div style="color:#D3DEFF;font-family:${SANS};font-weight:500;font-size:38px;margin-top:44px;">cleanor.app/tools</div>
</div>`);

const b = await chromium.launch();

// intro / outro at 1920x1080
const ctxV = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const pv = await ctxV.newPage();
for (const [name, html] of [['intro', intro], ['outro', outro]]) {
  await pv.setContent(html, { waitUntil: 'networkidle' });
  await pv.waitForTimeout(500);
  writeFileSync(`${OUT}/cws-scene-${name}.png`, await sharp(await pv.screenshot()).flatten({ background: BLUE }).png().toBuffer());
  console.log('cws-scene-' + name + '.png');
}
await ctxV.close();

// the 5 store screenshots (1280x800) → pad to 1920x1080 on blue
const ctxS = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const ps = await ctxS.newPage();
for (const n of [1, 2, 3, 4, 5]) {
  await ps.goto(`file://${CWS}/cws-screenshot-${n}.html`, { waitUntil: 'networkidle' });
  await ps.waitForTimeout(600);
  const shot = await sharp(await ps.screenshot()).resize(1280, 800, { kernel: 'lanczos3' }).toBuffer();
  const padded = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: BLUE } })
    .composite([{ input: await sharp(shot).resize({ height: 1080 }).toBuffer(), gravity: 'center' }])
    .flatten({ background: BLUE }).png().toBuffer();
  writeFileSync(`${OUT}/cws-scene-ss${n}.png`, padded);
  console.log('cws-scene-ss' + n + '.png');
}
await ctxS.close();
await b.close();
console.log('done');
