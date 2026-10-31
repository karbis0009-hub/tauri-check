const fs = require('fs');
const path = require('path');

const dir = '.';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('inventory.html?action=category')) {
        const newContent = content.replace(/inventory\.html\?action=category/g, 'category.html');
        fs.writeFileSync(filePath, newContent);
        updatedCount++;
    }
}

console.log(`Updated ${updatedCount} HTML files.`);
