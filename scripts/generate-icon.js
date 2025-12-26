const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const size = 1024;
const padding = 100;
const barCount = 5;
const barGap = 40;
const cornerRadius = 180;

// Calculate bar dimensions
const availableWidth = size - (padding * 2);
const barWidth = (availableWidth - (barGap * (barCount - 1))) / barCount;

// Bar heights (as percentages of available height)
const barHeights = [0.4, 0.7, 0.55, 0.9, 0.65];

async function generateIcon() {
  const availableHeight = size - (padding * 2);

  // Create SVG with equalizer bars
  const bars = barHeights.map((heightPercent, i) => {
    const x = padding + (i * (barWidth + barGap));
    const barHeight = availableHeight * heightPercent;
    const y = padding + (availableHeight - barHeight);

    // Gradient from green to yellow to red (WinAmp style)
    return `
      <defs>
        <linearGradient id="barGrad${i}" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#00ff00"/>
          <stop offset="60%" style="stop-color:#00ff00"/>
          <stop offset="80%" style="stop-color:#ffff00"/>
          <stop offset="100%" style="stop-color:#ff0000"/>
        </linearGradient>
      </defs>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="20" fill="url(#barGrad${i})"/>
    `;
  }).join('');

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#1a1a2e"/>
      ${bars}
    </svg>
  `;

  const resourcesDir = path.join(__dirname, '..', 'resources');
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  // Generate PNG at various sizes
  const sizes = [1024, 512, 256, 128, 64, 32, 16];

  console.log('Generating icon files...');

  // Generate main 1024x1024 PNG
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(resourcesDir, 'icon.png'));
  console.log('  Created icon.png (1024x1024)');

  // Generate different sizes for iconset
  const iconsetDir = path.join(resourcesDir, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  for (const s of sizes) {
    await sharp(Buffer.from(svg))
      .resize(s, s)
      .png()
      .toFile(path.join(iconsetDir, `icon_${s}x${s}.png`));

    // Also create @2x versions for Retina
    if (s <= 512) {
      await sharp(Buffer.from(svg))
        .resize(s * 2, s * 2)
        .png()
        .toFile(path.join(iconsetDir, `icon_${s}x${s}@2x.png`));
    }
  }
  console.log('  Created iconset folder');

  // Generate ICO for Windows (multi-size)
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoBuffers = await Promise.all(
    icoSizes.map(s =>
      sharp(Buffer.from(svg))
        .resize(s, s)
        .png()
        .toBuffer()
    )
  );

  // For now, just use 256x256 as the ico (proper ICO generation needs additional library)
  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .png()
    .toFile(path.join(resourcesDir, 'icon.ico.png'));
  console.log('  Created icon.ico.png (convert to .ico manually or use online converter)');

  console.log('\nIcon generation complete!');
  console.log('\nTo create macOS .icns file, run:');
  console.log('  iconutil -c icns resources/icon.iconset -o resources/icon.icns');
  console.log('\nTo create Windows .ico file:');
  console.log('  Use an online converter or tool like png2ico with resources/icon.png');
}

generateIcon().catch(console.error);
