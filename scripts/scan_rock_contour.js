import { Jimp } from 'jimp';

async function scanRockContour() {
  const img = await Jimp.read('d:/Metaverse/public/geumgangjwa/geumgang_front.jpg');
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  console.log('--- Scanning Rock Left and Right Boundaries from Center (X=480) ---');

  for (let y = 10; y < h; y += 30) {
    // Left search: start from 480 and move left
    let leftX = 480;
    for (let x = 480; x >= 0; x--) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      // Check if we exited the rock:
      // Outside rock on left: sky (overcast blue-grey or light grey) or pine needles (green)
      const isSky = (b > 130 && b > r + 15 && b > g + 10) || (r > 190 && g > 190 && b > 190);
      const isGreen = (g > 90 && g > r + 20 && g > b + 15);
      if (isSky || isGreen) {
        leftX = x + 1;
        break;
      }
      leftX = x;
    }

    // Right search: start from 480 and move right
    let rightX = 480;
    for (let x = 480; x < w; x++) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      // Outside rock on right: sky, yellow wall, or black streetlamp pole
      const isSky = (b > 130 && b > r + 15 && b > g + 10) || (r > 190 && g > 190 && b > 190);
      const isYellowWall = (r > 160 && g > 150 && b < 120);
      const isLamp = (x > 880 && r < 40 && g < 40 && b < 40); // black pole
      if (isSky || isYellowWall || isLamp) {
        rightX = x - 1;
        break;
      }
      rightX = x;
    }

    console.log(`Y=${String(y).padStart(3)}: [${leftX}, ${rightX}] (width = ${rightX - leftX})`);
  }
}

scanRockContour().catch(console.error);
