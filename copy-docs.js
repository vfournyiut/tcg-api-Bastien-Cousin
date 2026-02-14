/**
 * Script pour copier les fichiers YAML de documentation depuis src/docs vers dist/docs
 * Utilise Node.js standard pour fonctionner sur tous les OS
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'docs');
const distDir = path.join(__dirname, 'dist', 'docs');

// Créer le répertoire de destination s'il n'existe pas
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log(`✓ Répertoire créé: ${distDir}`);
}

// Lister et copier tous les fichiers YAML
const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.yml'));

files.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(distDir, file);
    fs.copyFileSync(src, dest);
    console.log(`✓ Copié: ${file}`);
});

console.log(`\n${files.length} fichiers YAML copiés vers dist/docs`);
