const sharp = require('sharp');
const fs = require('fs');

// Preventli logo SVG - Shield with checkmark representing compliance/protection
const logoSvg = `
<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#52B788;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2D6A4F;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Shield icon -->
  <path d="M50 15 L80 25 L80 55 C80 75 65 90 50 95 C35 90 20 75 20 55 L20 25 Z"
        fill="url(#shieldGrad)" />

  <!-- Checkmark inside shield -->
  <path d="M35 50 L45 60 L65 40"
        stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Preventli text -->
  <text x="95" y="70" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#1C3D5A">
    Preventli
  </text>
</svg>
`;

// Also create a white version for dark backgrounds
const logoWhiteSvg = `
<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#52B788;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2D6A4F;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Shield icon -->
  <path d="M50 15 L80 25 L80 55 C80 75 65 90 50 95 C35 90 20 75 20 55 L20 25 Z"
        fill="url(#shieldGrad)" />

  <!-- Checkmark inside shield -->
  <path d="M35 50 L45 60 L65 40"
        stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Preventli text in white -->
  <text x="95" y="70" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="white">
    Preventli
  </text>
</svg>
`;

async function createLogos() {
  try {
    // Create dark text version (for light backgrounds)
    await sharp(Buffer.from(logoSvg))
      .png()
      .toFile('preventli-logo.png');
    console.log('Created: preventli-logo.png');

    // Create white text version (for dark backgrounds like title slide)
    await sharp(Buffer.from(logoWhiteSvg))
      .png()
      .toFile('preventli-logo-white.png');
    console.log('Created: preventli-logo-white.png');

    console.log('Logos created successfully!');
  } catch (err) {
    console.error('Error creating logos:', err);
  }
}

createLogos();
