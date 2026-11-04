// scripts/sync.mjs
import { copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');
const src       = resolve(root, 'admin/build');
const dst       = resolve(root, '.dev-server/default/node_modules/iobroker.wem_canapi/admin');

if (!existsSync(dst)) {
    console.log('⚠️  Dev-Server Pfad nicht gefunden');
    process.exit(0);
}

// Diese Dateien synchronisieren
const files = [
    'index_m.html',
    'index.js',
    'index.css',
    'jsonConfig.json',
];

let copied = 0;
for (const file of files) {
    const srcFile = resolve(src, file);
    const dstFile = resolve(dst, file);

    if (!existsSync(srcFile)) {
        console.warn(`⚠️  ${file} nicht in admin/ gefunden`);
        continue;
    }

    copyFileSync(srcFile, dstFile);
    console.log(`✅ ${file}`);
    copied++;
}

console.log(`\n📦 ${copied} Dateien synchronisiert → Dev-Server`);