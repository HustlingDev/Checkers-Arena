const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function run() {
  const sourceImage = path.join(__dirname, '../src/assets/images/checkers_app_icon_1788035576523.jpg');
  console.log('Source image:', sourceImage);

  if (!fs.existsSync(sourceImage)) {
    throw new Error('Source image not found: ' + sourceImage);
  }

  // 1. Web & PWA Icons
  const publicDir = path.join(__dirname, '../public');
  const webTargets = [
    { file: 'app-icon.png', size: 512 },
    { file: 'icon.png', size: 512 },
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-192.png', size: 192 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'favicon.png', size: 64 },
    { file: 'app-icon.jpg', size: 512, format: 'jpeg' },
    { file: 'icon.jpg', size: 512, format: 'jpeg' }
  ];

  for (const t of webTargets) {
    const dest = path.join(publicDir, t.file);
    if (t.format === 'jpeg') {
      await sharp(sourceImage)
        .resize(t.size, t.size)
        .jpeg({ quality: 95 })
        .toFile(dest);
    } else {
      await sharp(sourceImage)
        .resize(t.size, t.size)
        .png({ compressionLevel: 9 })
        .toFile(dest);
    }
    console.log(`Generated: public/${t.file} (${t.size}x${t.size})`);
  }

  // 2. Android Mipmap Icons
  const androidResDir = path.join(__dirname, '../android/app/src/main/res');
  const mipmaps = [
    { dir: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { dir: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { dir: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { dir: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { dir: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ];

  // Helper to create circular/round icon
  async function createRoundIcon(size, destPath) {
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white" /></svg>`
    );
    await sharp(sourceImage)
      .resize(size, size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(destPath);
  }

  // Helper to create adaptive icon foreground (padded with 18% safe margin)
  async function createForegroundIcon(size, destPath) {
    const innerSize = Math.round(size * 0.72);
    const innerBuffer = await sharp(sourceImage)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: innerBuffer, gravity: 'center' }])
      .png()
      .toFile(destPath);
  }

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard square launcher
    await sharp(sourceImage)
      .resize(m.launcher, m.launcher)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher
    await createRoundIcon(m.launcher, path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive foreground launcher
    await createForegroundIcon(m.foreground, path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated Android mipmap: ${m.dir} (launcher: ${m.launcher}px, fg: ${m.foreground}px)`);
  }

  // 3. Android Splash Drawables
  const splashDirs = [
    'drawable',
    'drawable-port-hdpi',
    'drawable-port-mdpi',
    'drawable-port-xhdpi',
    'drawable-port-xxhdpi',
    'drawable-port-xxxhdpi',
    'drawable-land-hdpi',
    'drawable-land-mdpi',
    'drawable-land-xhdpi',
    'drawable-land-xxhdpi',
    'drawable-land-xxxhdpi',
  ];

  // Helper to create square splash drawable centered on device screen
  async function createSquareSplash(size, destPath) {
    const iconSize = Math.round(size * 0.48); // ~48% of splash canvas for balanced framing
    const cornerRadius = Math.round(iconSize * 0.18); // Modern squircle rounded corners
    const strokeWidth = Math.max(3, Math.round(iconSize * 0.025));

    // Rounded square mask
    const squareMask = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}">
        <rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" />
      </svg>`
    );

    // Rounded square gold & amber border overlay
    const borderOverlay = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}">
        <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${iconSize - strokeWidth}" height="${iconSize - strokeWidth}" rx="${cornerRadius - 2}" ry="${cornerRadius - 2}" fill="none" stroke="#f59e0b" stroke-width="${strokeWidth}" />
        <rect x="${strokeWidth + 1}" y="${strokeWidth + 1}" width="${iconSize - (strokeWidth * 2) - 2}" height="${iconSize - (strokeWidth * 2) - 2}" rx="${cornerRadius - 4}" ry="${cornerRadius - 4}" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.5" />
      </svg>`
    );

    const maskedIcon = await sharp(sourceImage)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .composite([
        { input: squareMask, blend: 'dest-in' },
        { input: borderOverlay, blend: 'over' }
      ])
      .png()
      .toBuffer();

    // Composite centered on deep slate-950 #020617 background
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 2, g: 6, b: 23, alpha: 1 }
      }
    })
      .composite([{ input: maskedIcon, gravity: 'center' }])
      .png()
      .toFile(destPath);
  }

  for (const dir of splashDirs) {
    const targetDir = path.join(androidResDir, dir);
    if (fs.existsSync(targetDir)) {
      await createSquareSplash(512, path.join(targetDir, 'splash.png'));
    }
  }

  console.log('All icons and splash drawables successfully generated!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
