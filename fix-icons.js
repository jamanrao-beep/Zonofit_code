let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require('./website/node_modules/sharp');
}
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const b1 = fs.readFileSync(path.join(__dirname, 'assets/images/logo_part_top_bar.png'));
    const b2 = fs.readFileSync(path.join(__dirname, 'assets/images/logo_part_hook.png'));
    const b3 = fs.readFileSync(path.join(__dirname, 'assets/images/logo_part_dot.png'));
    
    // Composite white vector mark and trim to exact bounds
    const comp = await sharp(b1).composite([{ input: b2 }, { input: b3 }]).png().toBuffer();
    const trimmedMark = await sharp(comp).trim().png().toBuffer();
    
    // Scale mark to 440px width (optimal 64% safe zone for adaptive launcher icons)
    const markResized = await sharp(trimmedMark).resize({ width: 440 }).png().toBuffer();
    const markMeta = await sharp(markResized).metadata();
    
    const left = Math.round((1024 - markMeta.width) / 2);
    const top = Math.round((1024 - markMeta.height) / 2);

    // 1. Android Adaptive Foreground (transparent + centered mark)
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: markResized, left, top }])
    .png()
    .toFile(path.join(__dirname, 'assets/images/android-icon-foreground.png'));

    // 2. Android Adaptive Background (#649C2D green)
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 100, g: 156, b: 45, alpha: 1 }
      }
    })
    .png()
    .toFile(path.join(__dirname, 'assets/images/android-icon-background.png'));

    // 3. Android Monochrome
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: markResized, left, top }])
    .png()
    .toFile(path.join(__dirname, 'assets/images/android-icon-monochrome.png'));

    // 4. Standard App Icon (solid green + centered mark)
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 100, g: 156, b: 45, alpha: 1 }
      }
    })
    .composite([{ input: markResized, left, top }])
    .png()
    .toFile(path.join(__dirname, 'assets/images/icon.png'));

    // 5. Splash Icon
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: markResized, left, top }])
    .png()
    .toFile(path.join(__dirname, 'assets/images/splash-icon.png'));

    console.log('All icons generated successfully with centered mark at 440x353 inside 1024x1024!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

main();
