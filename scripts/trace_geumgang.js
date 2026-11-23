import { Jimp } from 'jimp';

async function scan() {
  const img = await Jimp.read('d:/Metaverse/public/geumgangjwa/geumgang_front.jpg');
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // Let's sample rows from top to bottom
  for (let y = 10; y < h; y += 40) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      // Rock is dark grey / granite (typically r < 140, g < 140, b < 140 or gold text where r > g > b)
      // Sky is overcast white: r > 185, g > 185, b > 185
      const isSky = (r > 180 && g > 180 && b > 180);
      const isPineGreen = (g > 80 && g > r + 15 && g > b + 15);

      if (!isSky && !isPineGreen) {
        if (minX === -1) minX = x;
        maxX = x;
      }
    }
    console.log(`Y=${String(y).padStart(3)}: X from ${minX} to ${maxX}`);
  }
}

scan().catch(console.error);
