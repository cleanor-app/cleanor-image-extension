import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const LIST = '/Users/igorshenshin/Developer/Web/cleanor-image-extension/store-listing';
const SC = '/private/tmp/claude-501/-Users-igorshenshin-Developer-Web-cleanor-web/46b00aa4-b71c-4eef-8700-31cf9efbc58d/scratchpad/promo';
const icon = 'data:image/png;base64,' + readFileSync('/Users/igorshenshin/Developer/Web/cleanor-image-extension/icons/icon-128.png').toString('base64');
const FONT = `-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const BLUE = '#4576FD';
const sp = (x, y, s, o) => `<div style="position:absolute;top:${y}px;left:${x}px;opacity:${o}"><svg width="${s}" height="${s}" viewBox="0 0 14 14"><path d="M7 0c.4 4.6 2.4 6.6 7 7c-4.6.4-6.6 2.4-7 7c-.4-4.6-2.4-6.6-7-7c4.6-.4 6.6-2.4 7-7z" fill="#fff"/></svg></div>`;
const SPARK = [sp(220, 160, 34, .13), sp(1500, 120, 22, .14), sp(1680, 520, 40, .11), sp(180, 720, 28, .11), sp(980, 90, 18, .13), sp(1620, 880, 26, .12), sp(300, 940, 20, .12)].join('');
const stage = (inner, glowX = '50%') => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;"><div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(1500px 900px at ${glowX} -18%, #5f86ff 0%, ${BLUE} 62%);font-family:${FONT};">${SPARK}${inner}</div></body></html>`;

const intro = stage(`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${FONT};">
  <img src="${icon}" style="width:230px;height:230px;border-radius:52px;box-shadow:0 34px 90px rgba(10,20,60,.5);margin-bottom:44px;"/>
  <div style="color:#fff;font-family:${FONT};font-weight:800;font-size:150px;line-height:1;letter-spacing:-3px;">Cleanor</div>
  <div style="color:#C6D5FF;font-family:${FONT};font-weight:500;font-size:44px;margin-top:30px;letter-spacing:.5px;">Compress · Convert · Screenshot · on your device</div>
</div>`);

const outro = stage(`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${FONT};">
  <img src="${icon}" style="width:180px;height:180px;border-radius:42px;box-shadow:0 30px 80px rgba(10,20,60,.5);margin-bottom:44px;"/>
  <div style="color:#fff;font-family:${FONT};font-weight:800;font-size:104px;line-height:1.05;letter-spacing:-2.5px;text-align:center;">Get it free on the<br/>Chrome Web Store</div>
  <div style="margin-top:56px;display:inline-flex;align-items:center;gap:16px;background:#fff;color:#2f55d4;font-family:${FONT};font-weight:700;font-size:44px;padding:26px 54px;border-radius:22px;box-shadow:0 18px 50px rgba(10,20,60,.4);">
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Add to Chrome
  </div>
  <div style="color:#C6D5FF;font-family:${FONT};font-weight:500;font-size:38px;margin-top:44px;">cleanor.app/tools</div>
</div>`);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [name, html] of [['intro', intro], ['outro', outro]]) {
  await p.setContent(html, { waitUntil: 'networkidle' });
  await p.waitForTimeout(150);
  const png = await sharp(await p.screenshot()).flatten({ background: BLUE }).png().toBuffer();
  writeFileSync(`${SC}/scene-${name}.png`, png);
  console.log('scene-' + name + '.png');
}
await b.close();

// pad the 5 store screenshots (1280x800, blue bg) to 1920x1080 on blue → uniform video scenes
const shots = ['screenshot-1-hero', 'screenshot-2-formats', 'screenshot-3-rightclick', 'screenshot-5-screenshots', 'screenshot-4-controls'];
for (const s of shots) {
  const resized = await sharp(`${LIST}/${s}.png`).resize({ height: 1080 }).toBuffer(); // → 1728x1080
  const out = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: BLUE } })
    .composite([{ input: resized, gravity: 'center' }]).flatten({ background: BLUE }).png().toBuffer();
  writeFileSync(`${SC}/scene-${s}.png`, out);
  console.log('scene-' + s + '.png');
}
console.log('done');
