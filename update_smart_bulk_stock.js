const fs = require('fs');
const path = require('path');

// 1. Update billing.html
const billingPath = path.join(__dirname, '..', 'billing.html');
let billingHtml = fs.readFileSync(billingPath, 'utf8');

const targetOld = `          <div id="bulkProductRetail" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Retail
            Price: Rs.
            0.00</div>`;

const targetNew = `          <div id="bulkProductRetail" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Retail Price: Rs. 0.00</div>
          <div id="bulkProductStock" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Available Stock: 0</div>`;

billingHtml = billingHtml.replace(targetOld.replace(/\n/g, '\r\n'), targetNew.replace(/\n/g, '\r\n'));
billingHtml = billingHtml.replace(targetOld.replace(/\r\n/g, '\n'), targetNew.replace(/\r\n/g, '\n'));
billingHtml = billingHtml.replace('        </div>ght: normal;">', '        </div>');

fs.writeFileSync(billingPath, billingHtml, 'utf8');
console.log('SUCCESS: Updated billing.html');

// 2. Update js/app.js
const appPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

const retailOld = "    document.getElementById('bulkProductRetail').textContent = `Retail Price: Rs. ${fmt(item.price)}`;";
const retailNew = `    document.getElementById('bulkProductRetail').textContent = \`Retail Price: Rs. \${fmt(item.price)}\`;
    const stockEl = document.getElementById('bulkProductStock');
    if (stockEl) {
        const unitStr = item.unit ? \` \${item.unit.trim()}\` : '';
        stockEl.textContent = \`Available Stock: \${item.stock !== undefined && item.stock !== null ? item.stock : 0}\${unitStr}\`;
        if ((item.stock || 0) <= 5) {
            stockEl.style.color = '#ef4444';
            stockEl.style.fontWeight = '600';
        } else {
            stockEl.style.color = 'var(--text-muted)';
            stockEl.style.fontWeight = 'normal';
        }
    }`;

appJs = appJs.replace(retailOld.replace(/\n/g, '\r\n'), retailNew.replace(/\n/g, '\r\n'));
appJs = appJs.replace(retailOld.replace(/\r\n/g, '\n'), retailNew.replace(/\r\n/g, '\n'));

fs.writeFileSync(appPath, appJs, 'utf8');
console.log('SUCCESS: Updated js/app.js');
