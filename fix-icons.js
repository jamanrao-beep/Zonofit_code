const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcImage = path.join(__dirname, 'assets/images/Zonofit logo.jpeg');

const processImage = async (filename, size) => {
  const destPath = path.join(__dirname, 'assets/images', filename);
  
  await sharp(srcImage)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFormat('png')
    .toFile(destPath);
    
  console.log(`Created ${filename} at ${size}x${size}`);
};

async function main() {
  try {
    if (!fs.existsSync(srcImage)) {
      console.log('Source image not found');
      return;
    }
    
    // Create standard app icon
    await processImage('icon.png', 1024);
    
    // Create adaptive background (solid color or logo)
    await processImage('android-icon-background.png', 1024);
    
    // Create adaptive foreground
    await processImage('android-icon-foreground.png', 1024);
    
    // Create monochrome
    await processImage('android-icon-monochrome.png', 1024);
    
    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

main();
