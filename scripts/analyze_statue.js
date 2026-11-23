import { Jimp } from 'jimp';

async function main() {
  const img = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  console.log(`Image dimensions: ${w}x${h}`);

  // Print cross sections at different Y levels
  const yLevels = [25, 50, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560];
  
  for (const y of yLevels) {
    let row = '';
    for (let x = 380; x <= 740; x += 10) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Bronze statue typically has low luminance (r,g,b < 140) and neutral/slightly warm or greenish hue
      const isBronze = (r < 130 && g < 135 && b < 135 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
      row += isBronze ? '#' : '.';
    }
    console.log(`Y=${String(y).padStart(3)}: ${row}`);
  }
}

main().catch(console.error);
