const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

const marker = "document.getElementById('bulkProductRetail').textContent = `Retail Price: Rs. ${fmt(item.price)}`;";
const idx = appJs.indexOf(marker);

if (idx === -1) {
    console.error('Marker not found');
    process.exit(1);
}

const afterMarker = appJs.indexOf("const qtyEl = document.getElementById('bulkQty');", idx);
if (afterMarker === -1) {
    console.error('After marker not found');
    process.exit(1);
}

const isCrlf = appJs.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

const stockSnippet = [
    marker,
    "    const stockEl = document.getElementById('bulkProductStock');",
    "    if (stockEl) {",
    "        const unitStr = item.unit ? ` ${item.unit.trim()}` : '';",
    "        stockEl.textContent = `Available Stock: ${item.stock !== undefined && item.stock !== null ? item.stock : 0}${unitStr}`;",
    "        if ((item.stock || 0) <= 5) {",
    "            stockEl.style.color = '#ef4444';",
    "            stockEl.style.fontWeight = '600';",
    "        } else {",
    "            stockEl.style.color = 'var(--text-muted)';",
    "            stockEl.style.fontWeight = 'normal';",
    "        }",
    "    }",
    "    "
].join(eol);

appJs = appJs.slice(0, idx) + stockSnippet + appJs.slice(afterMarker);
fs.writeFileSync(appPath, appJs, 'utf8');
console.log('SUCCESS: Fixed openSmartBulkModal in js/app.js');
