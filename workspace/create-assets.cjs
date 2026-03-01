const sharp = require('sharp');

async function createGradientBackground(filename, color1, color2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="562.5">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filename);

  console.log(`Created ${filename}`);
}

async function main() {
  await createGradientBackground('workspace/gradient-blue.png', '#1C3D5A', '#2E5C8A');
  console.log('All assets created successfully!');
}

main().catch(console.error);
