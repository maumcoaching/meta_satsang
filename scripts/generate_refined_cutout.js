import { Jimp } from 'jimp';

async function generateRefinedCutout() {
  const src = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Working RGBA mask
  const mask = new Uint8Array(w * h);

  // Exact polygon bounds guide for the statue
  // Outer boundary polygon points [x, y]
  const contour = [
    [556, 18],   // Top of crown
    [580, 24],
    [605, 33],
    [615, 48],   // Crown right wing
    [620, 65],   // Head top right
    [628, 95],   // Back of head
    [630, 130],  // Right ear / hair
    [627, 165],  // Hair braid / neck
    [635, 195],  // Shoulder
    [655, 215],
    [675, 235],  // Upper left arm
    [695, 260],
    [708, 290],
    [715, 330],  // Left arm
    [716, 365],
    [712, 395],
    [695, 420],  // Left hand on right ankle
    [678, 445],
    [668, 475],  // Lower robe folds (right side)
    [675, 510],
    [680, 545],
    [678, 576],  // Bottom right of lotus stool
    [455, 576],  // Bottom left of lotus stool
    [462, 530],
    [468, 490],  // Flowing drapery (left side)
    [462, 455],
    [448, 435],
    [432, 415],  // Right knee (horizontal crossed leg jutting left)
    [425, 390],
    [428, 365],
    [438, 345],  // Right elbow on knee
    [448, 320],
    [470, 280],  // Right forearm outer edge
    [490, 240],
    [512, 195],
    [518, 160],  // Right wrist
    [510, 130],  // Fingers on cheek
    [516, 105],  // Hand touching cheek
    [525, 85],   // Forehead profile
    [530, 65],   // Forehead top
    [518, 52],   // Crown left wing
    [535, 32],
    [548, 22]
  ];

  // Point in polygon test
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Inner hole / negative space between raised arm, chest, and knee:
  // [x, y] polygon of the arm gap hole
  const armHole = [
    [518, 175],
    [526, 195],
    [534, 215],
    [540, 230],
    [545, 235],
    [542, 220],
    [538, 200],
    [532, 180]
  ];

  let kept = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pointInPoly(x, y, contour) && !pointInPoly(x, y, armHole)) {
        // Also check if pixel happens to be sky or blue pole
        const hex = src.getPixelColor(x, y).toString(16).padStart(8, '0');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        // Sky check inside edge
        const isSky = (r > 200 && g > 200 && b > 200);
        // Blue pole check
        const isBluePole = (b > 150 && b > r + 50);

        if (!isSky && !isBluePole) {
          mask[y * w + x] = 255;
          kept++;
        }
      }
    }
  }

  console.log(`Initial mask kept: ${kept} pixels`);

  // Bounding box of the contour
  let minX = 420, maxX = 720, minY = 16, maxY = 575;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const out = new Jimp({ width: cropW, height: cropH, color: 0x00000000 });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * w + x;
      if (mask[idx] > 0) {
        // Smooth anti-aliased edge check:
        // Check 3x3 neighbors to calculate alpha for soft anti-aliased edges
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              if (mask[ny * w + nx] > 0) sum += 1;
            }
          }
        }
        const alpha = Math.min(255, Math.round((sum / 9) * 255));

        const hex = src.getPixelColor(x, y).toString(16).padStart(8, '0');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        const color = (r << 24) | (g << 16) | (b << 8) | alpha;
        out.setPixelColor(color >>> 0, x - minX, y - minY);
      }
    }
  }

  await out.write('d:/Metaverse/public/statue/statue_cutout.png');
  console.log(`Successfully generated high-precision cutout: ${cropW}x${cropH}`);
}

generateRefinedCutout().catch(console.error);
