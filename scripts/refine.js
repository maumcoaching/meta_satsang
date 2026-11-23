import { Jimp } from 'jimp';

async function refine() {
  const src = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Let's print out the exact RGB of pixels at Y=80 (around forehead and back of head)
  console.log('--- Row Y=80 (X from 500 to 650) ---');
  for (let x = 510; x <= 645; x += 5) {
    const hex = src.getPixelColor(x, 80).toString(16).padStart(8, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    console.log(`x=${x}: rgb(${r},${g},${b})`);
  }

  // Row Y=220 (Torso, necklace, right arm)
  console.log('--- Row Y=220 (X from 470 to 720) ---');
  for (let x = 470; x <= 720; x += 15) {
    const hex = src.getPixelColor(x, 220).toString(16).padStart(8, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    console.log(`x=${x}: rgb(${r},${g},${b})`);
  }
}

refine().catch(console.error);
