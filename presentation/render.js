// Rendu de video.html en MP4 : node render.js [sortie.mp4] [--preview]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30;
(async () => {
  const out = process.argv[2] || 'out/discipolat.mp4';
  const preview = process.argv.includes('--preview');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, 'video.html') + '?render=1');
  await page.waitForLoadState('networkidle');
  const total = await page.evaluate(() => window.TOTAL);
  if (preview) {
    for (const t of process.argv.slice(3).filter(a => !a.startsWith('--')).map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: `out/preview-${t}.jpg`, type: 'jpeg', quality: 80 });
    }
    await browser.close(); return;
  }
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  // Voix off : node render.js out/discipolat.mp4 --audio voix.m4a
  const ai = process.argv.indexOf('--audio');
  if (ai > 0) {
    const tmp = out.replace(/\.mp4$/, '') + '-muet.mp4';
    require('fs').renameSync(out, tmp);
    await new Promise(r => spawn('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-i', process.argv[ai + 1],
      '-af', 'highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,apad', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', r));
  }
  await browser.close();
  console.log('OK', out, total + 's');
})();
