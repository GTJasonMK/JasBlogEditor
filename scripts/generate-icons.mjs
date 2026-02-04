import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');

const svgPath = join(iconsDir, 'jbe-logo.svg');
const svgBuffer = readFileSync(svgPath);

// 生成 1024x1024 PNG 供 tauri icon 使用
const pngPath = join(iconsDir, 'jbe-logo.png');

console.log('Converting SVG to PNG...');

sharp(svgBuffer)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('PNG generated:', pngPath);
    console.log('Now run: npx tauri icon src-tauri/icons/jbe-logo.png');
  })
  .catch(err => {
    console.error('Error:', err);
  });
