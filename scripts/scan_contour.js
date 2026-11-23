import { Jimp } from 'jimp';

async function scanContour() {
  const img = await Jimp.read('d:/Metaverse/public/statue/statue_front.jpg');

  // Let's sample key sections
  console.log('--- Contour Scan ---');
  const sections = [
    { name: 'Crown top', y: 22 },
    { name: 'Crown mid', y: 40 },
    { name: 'Crown base / Head top', y: 65 },
    { name: 'Forehead / Face', y: 100 },
    { name: 'Eyes / Nose / Cheek hand', y: 130 },
    { name: 'Chin / Hand touching cheek', y: 160 },
    { name: 'Neck / Raised right forearm', y: 190 },
    { name: 'Chest necklace / Right forearm', y: 220 },
    { name: 'Torso mid / Right arm outer', y: 260 },
    { name: 'Waist / Left arm', y: 300 },
    { name: 'Right elbow on knee / Waist', y: 340 },
    { name: 'Horizontal right thigh / Left hand', y: 380 },
    { name: 'Right knee / Left wrist on knee', y: 410 },
    { name: 'Right foot on left knee / Drapery', y: 440 },
    { name: 'Vertical left leg / Flowing drapery', y: 480 },
    { name: 'Lotus stool / Cascading folds', y: 520 },
    { name: 'Bottom drapery hem / Base', y: 560 }
  ];

  for (const s of sections) {
    // Search left boundary starting from center (570) going left
    let leftX = 570;
    for (let x = 570; x >= 350; x--) {
      const hex = img.getPixelColor(x, s.y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // If we hit sky/background: in statue_front, sky is > 180 or building on right is bright/yellowish
      // Check difference or brightness
      leftX = x;
      if (r > 175 && g > 175 && b > 175) break; // sky
    }

    // Search right boundary starting from center (570) going right
    let rightX = 570;
    for (let x = 570; x <= 800; x++) {
      const hex = img.getPixelColor(x, s.y).toString(16).padStart(8, '0');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      rightX = x;
      // Building wall is yellowish (r > 160, g > 150, b > 140) or sky
      if (r > 170 && g > 165 && b > 160) break;
    }

    console.log(`${s.name.padEnd(35)} (Y=${String(s.y).padStart(3)}): xRange ~ [${leftX}, ${rightX}]`);
  }
}

scanContour().catch(console.error);
