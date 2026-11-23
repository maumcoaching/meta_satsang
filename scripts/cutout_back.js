import { Jimp } from 'jimp';

async function cutoutBack() {
  const src = await Jimp.read('d:/Metaverse/public/geumgangjwa/geumgang_back.jpg');
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Let's sample key boundary points in geumgang_back.jpg
  // In this photo:
  // Top peak: x ~ 520, y ~ 0
  // Left curve: curves down to x ~ 50 at y ~ 500
  // Right curve: curves down to x ~ 980 at y ~ 450
  const contour = [
    [520, 0],
    [580, 20],
    [650, 45],
    [720, 80],
    [790, 130],
    [860, 200],
    [920, 275],
    [965, 360],
    [995, 450],
    [1015, 540],
    [1015, 576],  // Bottom right
    [40, 576],    // Bottom left
    [48, 520],
    [70, 450],
    [110, 370],
    [160, 290],
    [220, 210],
    [290, 140],
    [370, 75],
    [450, 25],
    [520, 0]
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
        mask[y * w + x] = 255;
      }
    }
  }

  const minX = 40;
  const maxX = 1015;
  const minY = 0;
  const maxY = 575;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const out = new Jimp({ width: cropW, height: cropH, color: 0x00000000 });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * w + x;
      if (mask[idx] > 0) {
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

  await out.write('d:/Metaverse/public/geumgangjwa/geumgang_back_cutout.png');
  console.log(`Saved back cutout: ${cropW}x${cropH}`);
}

cutoutBack().catch(console.error);
