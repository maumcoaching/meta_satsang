import { Jimp } from 'jimp';

async function inspectCutout() {
  const img = await Jimp.read('d:/Metaverse/public/statue/statue_cutout.png');
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  console.log(`Cutout size: ${w}x${h}`);

  for (let y = 10; y < h; y += 40) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const a = parseInt(hex.slice(6, 8), 16);
      if (a > 10) {
        if (minX === -1) minX = x;
        maxX = x;
      }
    }
    console.log(`Y=${String(y).padStart(3)}: Width = ${maxX - minX + 1} (from ${minX} to ${maxX})`);
  }
}

inspectCutout().catch(console.error);
