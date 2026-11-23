import { Jimp } from 'jimp';

async function trace() {
  const img = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');

  // Let's inspect key regions
  function findTransition(xStart, xEnd, y, condition) {
    let last = null;
    const step = xStart < xEnd ? 1 : -1;
    for (let x = xStart; x !== xEnd; x += step) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (condition(r, g, b, x, y)) {
        return { x, y, r, g, b };
      }
    }
    return null;
  }

  // Check top crown
  console.log('--- Top of crown ---');
  for (let y = 15; y <= 30; y++) {
    const hex = img.getPixelColor(555, y).toString(16).padStart(8, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    console.log(`y=${y}: rgb(${r},${g},${b})`);
  }

  // Check head width at y=100 (forehead/face)
  console.log('--- Head at y=100 ---');
  for (let x = 490; x <= 640; x += 10) {
    const hex = img.getPixelColor(x, 100).toString(16).padStart(8, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    console.log(`x=${x}: rgb(${r},${g},${b})`);
  }
}

trace().catch(console.error);
