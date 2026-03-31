const fs = require('fs');
const m = JSON.parse(fs.readFileSync('dist/easter.tmj', 'utf8'));
const l = m.layers.find(l => l.name === 'EasterEggVisuals');
if (!l) {
    console.log('EasterEggVisuals NOT FOUND');
    m.layers.forEach(l => console.log(' -', l.name, l.type));
    process.exit(1);
}
console.log('Layer type:', l.type, 'visible:', l.visible);
const nz = l.data.filter(d => d !== 0);
console.log('Non-zero tiles:', nz.length);
console.log('All GIDs:', JSON.stringify(nz));
const maxGid = Math.max(...m.tilesets.map(t => t.firstgid + (t.tilecount || 0)));
console.log('Max valid GID:', maxGid);
console.log('All within valid range:', nz.every(g => g <= maxGid));
