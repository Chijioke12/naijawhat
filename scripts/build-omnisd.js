import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildOmniSD() {
  const distDir = path.join(__dirname, '..', 'dist');
  const omnisdDir = path.join(__dirname, '..', 'omnisd_build');

  if (!fs.existsSync(omnisdDir)) {
    fs.mkdirSync(omnisdDir);
  }

  // 1. Create metadata.json for OmniSD
  const metadata = {
    version: 1,
    manifestURL: "app://naijawhot.hd/manifest.webapp"
  };
  fs.writeFileSync(path.join(omnisdDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // 2. Create manifest.webapp inside dist
  const webappManifest = {
    name: "Naija Whot HD",
    description: "A classic Naija Whot card game rebuilt with Phaser 3.",
    launch_path: "/index.html",
    icons: {
      "56": "/icon.png",
      "112": "/icon.png"
    },
    developer: {
      "name": "KaiOS Developer",
      "url": "http://example.com"
    },
    type: "web",
    fullscreen: "true"
  };
  fs.writeFileSync(path.join(distDir, 'manifest.webapp'), JSON.stringify(webappManifest, null, 2));

  // 3. Zip dist into application.zip
  const appZipPath = path.join(omnisdDir, 'application.zip');
  const appZipOut = fs.createWriteStream(appZipPath);
  const appArchive = new ZipArchive({ zlib: { level: 9 } });
  
  await new Promise((resolve, reject) => {
    appZipOut.on('close', resolve);
    appArchive.on('error', reject);
    appArchive.pipe(appZipOut);
    appArchive.directory(distDir, false);
    appArchive.finalize();
  });

  // 4. Zip metadata.json and application.zip into NaijaWhotHD.zip
  const finalZipPath = path.join(__dirname, '..', 'NaijaWhotHD_OmniSD.zip');
  const finalZipOut = fs.createWriteStream(finalZipPath);
  const finalArchive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    finalZipOut.on('close', resolve);
    finalArchive.on('error', reject);
    finalArchive.pipe(finalZipOut);
    finalArchive.file(path.join(omnisdDir, 'metadata.json'), { name: 'metadata.json' });
    finalArchive.file(path.join(omnisdDir, 'application.zip'), { name: 'application.zip' });
    finalArchive.finalize();
  });

  console.log('OmniSD package built successfully at NaijaWhotHD_OmniSD.zip');
}

buildOmniSD().catch(console.error);
