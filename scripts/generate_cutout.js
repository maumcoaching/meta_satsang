import { Jimp } from 'jimp';

async function generateCutout() {
  const src = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Let's create an RGBA image
  const out = new Jimp({ width: w, height: h, color: 0x00000000 });

  // Bounding box of statue
  const minX = 415;
  const maxX = 720;
  const minY = 18;
  const maxY = 575;

  let keptPixels = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const hex = src.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      // Check if pixel is background:
      // 1. Sky: high brightness (r,g,b all > 195)
      const isSky = (r > 195 && g > 195 && b > 195);
      
      // 2. Yellowish building on the right (x > 620, y < 350):
      // Building is beige/yellowish wall (r > 155, g > 145, b > 135)
      const isBuilding = (x > 630 && y < 350 && r > 150 && g > 145 && b > 135);

      // 3. Dark background rock / sign on right:
      // The rock with inscription is at x > 690, y < 320
      const isRock = (x > 690 && y < 240);

      // 4. White car / fence on left (x < 460, y < 330)
      const isLeftBg = (x < 460 && y < 330);

      // 5. Crown region:
      // Above crown (y < 65): statue is only between x: 510 and 615
      const isAboveCrown = (y < 65 && (x < 515 || x > 615));

      // 6. Head region (y: 65 to 170): statue is between x: 520 and 630
      const isAroundHead = (y >= 65 && y < 170 && (x < 515 || x > 635));

      // 7. Right arm / torso gap (x: 515 to 540, y: 195 to 235)
      const isArmGap = (x >= 518 && x <= 538 && y >= 200 && y <= 235 && (r > 135 || g > 135));

      // 8. Knee contour:
      // Below elbow, knee juts out left between y: 340 and 420
      const isBelowKneeLeft = (y > 425 && x < 460);

      const isBg = isSky || isBuilding || isRock || isLeftBg || isAboveCrown || isAroundHead || isArmGap || isBelowKneeLeft;

      if (!isBg) {
        // Keep pixel with original RGBA
        const color = (r << 24) | (g << 16) | (b << 8) | 255;
        out.setPixelColor(color >>> 0, x, y);
        keptPixels++;
      }
    }
  }

  console.log(`Kept ${keptPixels} statue pixels.`);

  // Crop to tightly fit the statue
  const cropX = minX;
  const cropY = minY;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  out.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
  await out.write('d:/Metaverse/public/statue/statue_cutout.png');
  console.log(`Saved d:/Metaverse/public/statue/statue_cutout.png (${cropW}x${cropH})`);
}

generateCutout().catch(console.error);
