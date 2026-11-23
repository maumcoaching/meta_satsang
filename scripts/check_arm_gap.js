import { Jimp } from 'jimp';

async function checkArmGap() {
  const img = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');

  console.log('--- Checking gap between raised arm and torso (Y=180 to 240, X=510 to 560) ---');
  for (let y = 170; y <= 240; y += 10) {
    let row = `y=${y}: `;
    for (let x = 505; x <= 565; x += 5) {
      const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Bright background or tree?
      const isBg = (r > 150 && g > 150 && b > 150);
      row += isBg ? ' ' : '#';
    }
    console.log(row);
  }
}

checkArmGap().catch(console.error);
