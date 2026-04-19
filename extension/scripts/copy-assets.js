/**
 * 复制静态资源到 dist/
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');

function copy(src, dest) {
  const destPath = resolve(DIST, dest);
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(resolve(__dirname, '..', src), destPath);
  console.log(`  copied: ${dest}`);
}

// 复制静态资源
console.log('[copy-assets] Copying static files...');
copy('manifest.json', 'manifest.json');
copy('sidepanel/sidepanel.html', 'sidepanel/sidepanel.html');
copy('icons/icon16.png', 'icons/icon16.png');
copy('icons/icon48.png', 'icons/icon48.png');
copy('icons/icon128.png', 'icons/icon128.png');
console.log('[copy-assets] Done.');
