import { Jimp } from 'jimp';

async function findTop() {
  const img = await Jimp.read('d:/Metaverse/public/geumgangjwa/geumgang_front.jpg');

  for (let y = 0; y < 50; y++) {
    const hex = img.getPixelColor(420, y).toString(16).padStart(8, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    console.log(`y=${y}: rgb(${r},${g},${b})`);
  }
}

findTop().catch(console.error);
