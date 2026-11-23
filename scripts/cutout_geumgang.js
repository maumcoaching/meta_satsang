import { Jimp } from 'jimp';

async function cutoutGeumgang() {
  const src = await Jimp.read('d:/Metaverse/public/geumgangjwa/geumgang_front.jpg');
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Let's define the natural curved contour of the Geumgangjwa boulder based on Image 8:
  const contour = [
    [415, 0],    // Top rounded peak left
    [460, 5],
    [510, 18],   // Top rounded peak right
    [560, 40],
    [620, 75],
    [680, 115],
    [740, 160],  // Upper right slope
    [800, 215],
    [850, 275],
    [890, 340],  // Mid right slope
    [920, 410],
    [940, 480],
    [942, 530],
    [938, 576],  // Bottom right edge
    [15, 576],   // Bottom left edge
    [20, 530],
    [35, 480],
    [65, 420],
    [105, 360],  // Mid left slope
    [150, 300],
    [205, 235],
    [265, 170],  // Upper left slope
    [325, 105],
    [370, 50],
    [415, 0]     // Back to top
  ];

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

  const mask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pointInPoly(x, y, contour)) {
        // Double check sky along outer edges
        const hex = src.getPixelColor(x, y).toString(16).padStart(8, '0');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        // Sky check on upper rim (y < 60)
        const isSkyOnRim = (y < 50 && r > 160 && g > 165 && b > 175);
        if (!isSkyOnRim) {
          mask[y * w + x] = 255;
        }
      }
    }
  }

  // Bounding box: from x: 15 to 942, y: 0 to 575
  const minX = 15;
  const maxX = 942;
  const minY = 0;
  const maxY = 575;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const out = new Jimp({ width: cropW, height: cropH, color: 0x00000000 });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * w + x;
      if (mask[idx] > 0) {
        // 3x3 anti-aliasing
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

  await out.write('d:/Metaverse/public/geumgangjwa/geumgang_cutout.png');
  console.log(`Generated Geumgangjwa cutout: ${cropW}x${cropH}`);
}

cutoutGeumgang().catch(console.error);
