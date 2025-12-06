// Script to generate favicon files from SVG
// Run with: node scripts/generate-favicons.js
// Requires: npm install sharp --save-dev

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('Error: favicon.svg not found at', svgPath);
  process.exit(1);
}

async function generateFavicons() {
  console.log('Generating favicon files from SVG...');
  
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate PNG files
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
      { size: 192, name: 'favicon-192x192.png' },
      { size: 512, name: 'favicon-512x512.png' }
    ];
    
    for (const { size, name } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, name));
      console.log(`✓ Generated ${name}`);
    }
    
    // Generate ICO file (16x16 and 32x32)
    const ico16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
    
    // For ICO, we'll create a simple 32x32 PNG renamed as .ico
    // Most browsers will accept this
    await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');
    
    console.log('\n✅ All favicon files generated successfully!');
    console.log('Now rebuild your project and redeploy.');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();

