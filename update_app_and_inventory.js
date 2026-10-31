const fs = require('fs');
const path = require('path');

// 1. UPDATE js/app.js
const appPath = path.join(__dirname, '..', 'js', 'app.js');
let appCode = fs.readFileSync(appPath, 'utf8');

const tierHelperCode = `
// ── Quantity-Based Tiered Pricing Helpers ───────────────────────────
function getProductTierRate(item, qty) {
    if (!item) return { rate: 0, isTierApplied: false, matchedTier: null };
    const numQty = parseFloat(qty);
    let tiers = item.price_tiers;
    if (typeof tiers === 'string') {
        try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; }
    }
    const hasTiers = (item.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0;

    if (!hasTiers) {
        return {
            rate: typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0),
            isTierApplied: false,
            matchedTier: null
        };
    }

    if (isNaN(numQty) || numQty <= 0) {
        const firstTier = tiers[0];
        return {
            rate: firstTier ? (parseFloat(firstTier.ratePerUnit) || 0) : (parseFloat(item.price) || 0),
            isTierApplied: false,
            matchedTier: firstTier || null
        };
    }

    // Match tier: (quantity >= tier.minQty AND (quantity <= tier.maxQty OR tier.maxQty is null/unlimited))
    const matchedTier = tiers.find(t => {
        const min = parseFloat(t.minQty) || 0;
        const max = (t.maxQty === null || t.maxQty === undefined || t.maxQty === '' || t.maxQty === 999999 || String(t.maxQty).toLowerCase() === 'no limit' || String(t.maxQty).toLowerCase() === '∞')
            ? Infinity
            : parseFloat(t.maxQty);
        return numQty >= min && numQty <= max;
    });

    if (matchedTier) {
        return {
            rate: parseFloat(matchedTier.ratePerUnit) || 0,
            isTierApplied: true,
            matchedTier: matchedTier
        };
    }

    // Fallback: highest/last tier rate
    const lastTier = tiers[tiers.length - 1];
    return {
        rate: lastTier ? (parseFloat(lastTier.ratePerUnit) || 0) : (parseFloat(item.price) || 0),
        isTierApplied: true,
        matchedTier: lastTier || null
    };
}

function updateItemTierPrice(cartItem) {
    if (!cartItem) return;
    const invItem = inventory.find(i => String(i.id) === String(cartItem.id)) || cartItem;
    let tiers = invItem.price_tiers || cartItem.price_tiers;
    if (typeof tiers === 'string') {
        try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; }
    }
    const hasTiers = (invItem.enable_tiered_pricing || cartItem.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0;

    if (hasTiers) {
        cartItem.price_tiers = tiers;
        cartItem.enable_tiered_pricing = true;
        if (!cartItem.unit && invItem.unit) cartItem.unit = invItem.unit;

        if (!cartItem.isManualPriceOverride) {
            const result = getProductTierRate(invItem, cartItem.qty);
            cartItem.price = result.rate;
            cartItem.appliedTierRate = result.rate;
            cartItem.isTierApplied = result.isTierApplied;
        }
    } else {
        cartItem.isTierApplied = false;
    }
}
`;

if (!appCode.includes('function getProductTierRate(')) {
    appCode = appCode.replace("function renderProducts(query = '') {", tierHelperCode + "\nfunction renderProducts(query = '') {");
}

// Update card price in renderProducts
const renderProductOld = '                <div class="product-price">Rs. ${fmt(item.price)}</div>';
const renderProductNew = '                <div class="product-price">${(() => {\n'
    + '                    let tiers = item.price_tiers;\n'
    + '                    if (typeof tiers === "string") { try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; } }\n'
    + '                    if ((item.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0) {\n'
    + '                        const rates = tiers.map(t => parseFloat(t.ratePerUnit)).filter(r => !isNaN(r));\n'
    + '                        if (rates.length > 0) {\n'
    + '                            const minRate = Math.min(...rates);\n'
    + '                            const maxRate = Math.max(...rates);\n'
    + '                            return minRate === maxRate ? ("Rs. " + fmt(minRate)) : ("Rs. " + minRate + "-" + maxRate);\n'
    + '                        }\n'
    + '                    }\n'
    + '                    return "Rs. " + fmt(item.price);\n'
    + '                })()}</div>';

if (appCode.includes(renderProductOld)) {
    appCode = appCode.replace(renderProductOld, renderProductNew);
}

// Update addToCart
const addToCartOld = `function addToCart(productId) {
    const item = inventory.find(i => i.id === productId);
    if (!item || item.stock <= 0) return;

    const cartItemIdx = cart.findIndex(i => i.id === productId);
    if (cartItemIdx !== -1) {
        if (cart[cartItemIdx].qty < item.stock) {
            cart[cartItemIdx].qty++;
        } else {
            alert('Out of stock!');
            return;
        }
        lastAddedIndex = cartItemIdx;
    } else {
        const activeCart = carts.find(c => c.id === currentCartId);
        if (activeCart && activeCart.isBulkMode) {
            cart.push({ ...item, qty: "", price: "", originalPrice: item.price });
        } else {
            cart.push({ ...item, qty: 1 });
        }
        lastAddedIndex = cart.length - 1;
    }`;

const addToCartNew = `function addToCart(productId) {
    const item = inventory.find(i => i.id === productId);
    if (!item || item.stock <= 0) return;

    const cartItemIdx = cart.findIndex(i => i.id === productId);
    if (cartItemIdx !== -1) {
        if (cart[cartItemIdx].qty < item.stock) {
            cart[cartItemIdx].qty++;
            updateItemTierPrice(cart[cartItemIdx]);
        } else {
            alert('Out of stock!');
            return;
        }
        lastAddedIndex = cartItemIdx;
    } else {
        const activeCart = carts.find(c => c.id === currentCartId);
        let newCartItem;
        if (activeCart && activeCart.isBulkMode) {
            newCartItem = { ...item, qty: "", price: "", originalPrice: item.price };
        } else {
            newCartItem = { ...item, qty: 1 };
        }
        updateItemTierPrice(newCartItem);
        cart.push(newCartItem);
        lastAddedIndex = cart.length - 1;
    }`;

appCode = appCode.replace(addToCartOld.replace(/\r\n/g, '\n'), addToCartNew.replace(/\r\n/g, '\n'));
appCode = appCode.replace(addToCartOld.replace(/\n/g, '\r\n'), addToCartNew.replace(/\n/g, '\r\n'));

// Update qty handlers in app.js
appCode = appCode.replace("    cartItem.qty = newQty;\r\n    refreshCartItemDisplay(index);", "    cartItem.qty = newQty;\r\n    updateItemTierPrice(cartItem);\r\n    refreshCartItemDisplay(index);");
appCode = appCode.replace("    cartItem.qty = newQty;\n    refreshCartItemDisplay(index);", "    cartItem.qty = newQty;\n    updateItemTierPrice(cartItem);\n    refreshCartItemDisplay(index);");

appCode = appCode.replace("    cartItem.qty = qty;\r\n    refreshCartItemDisplay(index);", "    cartItem.qty = qty;\r\n    updateItemTierPrice(cartItem);\r\n    refreshCartItemDisplay(index);");
appCode = appCode.replace("    cartItem.qty = qty;\n    refreshCartItemDisplay(index);", "    cartItem.qty = qty;\n    updateItemTierPrice(cartItem);\n    refreshCartItemDisplay(index);");

// Update manualPrice
appCode = appCode.replace("    if (isNaN(price) || price < 0) {\r\n        cartItem.price = 0;\r\n    } else {\r\n        cartItem.price = price;\r\n    }", "    cartItem.isManualPriceOverride = true;\r\n    if (isNaN(price) || price < 0) {\r\n        cartItem.price = 0;\r\n    } else {\r\n        cartItem.price = price;\r\n    }");
appCode = appCode.replace("    if (isNaN(price) || price < 0) {\n        cartItem.price = 0;\n    } else {\n        cartItem.price = price;\n    }", "    cartItem.isManualPriceOverride = true;\n    if (isNaN(price) || price < 0) {\n        cartItem.price = 0;\n    } else {\n        cartItem.price = price;\n    }");

// Update refreshCartItemDisplay and renderCart for tier note
const refreshOld = `function refreshCartItemDisplay(index) {
    const cartItem = cart[index];
    const rows = els.cartItems ? els.cartItems.querySelectorAll('.cart-item') : [];
    const row = rows[index];
    if (!cartItem || !row) {
        renderCart();
        return;
    }

    const itemTotal = (cartItem.price || 0) * (cartItem.qty || 0);
    const qtyInput = row.querySelector('.qty-input');
    const totalEl = row.querySelector('.cart-item-total');
    const unitPriceEl = row.querySelector('.cart-item-price');
    if (qtyInput && document.activeElement !== qtyInput) qtyInput.value = cartItem.qty;
    if (totalEl) totalEl.textContent = \`Rs. \${fmt(itemTotal)}\`;
    if (unitPriceEl) unitPriceEl.textContent = \`Rs \${fmt(cartItem.price)} x \${cartItem.qty}\`;

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
    if (els.subTotal) els.subTotal.textContent = \`Rs. \${fmt(total)}\`;
    if (els.grandTotal) els.grandTotal.textContent = \`Rs. \${fmt(total)}\`;
}`;

const refreshNew = `function refreshCartItemDisplay(index) {
    const cartItem = cart[index];
    const rows = els.cartItems ? els.cartItems.querySelectorAll('.cart-item') : [];
    const row = rows[index];
    if (!cartItem || !row) {
        renderCart();
        return;
    }

    updateItemTierPrice(cartItem);

    const itemTotal = (cartItem.price || 0) * (cartItem.qty || 0);
    const qtyInput = row.querySelector('.qty-input');
    const totalEl = row.querySelector('.cart-item-total');
    const unitPriceEl = row.querySelector('.cart-item-price');
    if (qtyInput && document.activeElement !== qtyInput) qtyInput.value = cartItem.qty;
    if (totalEl) totalEl.textContent = \`Rs. \${fmt(itemTotal)}\`;
    if (unitPriceEl) unitPriceEl.textContent = \`Rs \${fmt(cartItem.price)} x \${cartItem.qty}\`;

    // Update tier note live
    let tierNote = row.querySelector('.cart-item-tier-note');
    if (cartItem.isTierApplied) {
        const unitStr = cartItem.unit ? \`/\${cartItem.unit.trim()}\` : '';
        const text = \`(Bulk rate: Rs.\${fmt(cartItem.price)}\${unitStr} applied)\`;
        if (tierNote) {
            tierNote.textContent = text;
            tierNote.style.display = 'block';
        } else {
            const info = row.querySelector('.cart-item-info');
            if (info) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'cart-item-tier-note';
                noteDiv.style.cssText = 'font-size: 0.75rem; color: var(--accent-primary, #3b82f6); font-weight: 500; margin-top: 2px;';
                noteDiv.textContent = text;
                info.appendChild(noteDiv);
            }
        }
    } else if (tierNote) {
        tierNote.style.display = 'none';
    }

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
    if (els.subTotal) els.subTotal.textContent = \`Rs. \${fmt(total)}\`;
    if (els.grandTotal) els.grandTotal.textContent = \`Rs. \${fmt(total)}\`;
}`;

appCode = appCode.replace(refreshOld.replace(/\r\n/g, '\n'), refreshNew.replace(/\r\n/g, '\n'));
appCode = appCode.replace(refreshOld.replace(/\n/g, '\r\n'), refreshNew.replace(/\n/g, '\r\n'));

// Update renderCart loop
const renderCartItemOld = `        // Format: Rs Total then down Rs UnitPrice*Qty
        const unitPriceQty = \`Rs \${fmt(item.price)} x \${item.qty}\`;

        div.innerHTML = \`
            <div class="cart-item-info">
                <div class="cart-item-name">\${index + 1}. \${item.name} \${item.isBulk ? '<span style="font-size: 0.65rem; color: var(--accent-primary); font-weight: normal; margin-left: 0.5rem; border: 1px solid var(--accent-primary); padding: 0 4px; border-radius: 4px;">BULK</span>' : ''}</div>
            </div>`;

const renderCartItemNew = `        updateItemTierPrice(item);
        // Format: Rs Total then down Rs UnitPrice*Qty
        const unitPriceQty = \`Rs \${fmt(item.price)} x \${item.qty}\`;
        const unitStr = item.unit ? \`/\${item.unit.trim()}\` : '';
        const tierNoteHtml = item.isTierApplied 
            ? \`<div class="cart-item-tier-note" style="font-size: 0.75rem; color: var(--accent-primary, #3b82f6); font-weight: 500; margin-top: 2px;">(Bulk rate: Rs.\${fmt(item.price)}\${unitStr} applied)</div>\` 
            : '';

        div.innerHTML = \`
            <div class="cart-item-info">
                <div class="cart-item-name">\${index + 1}. \${item.name} \${item.isBulk ? '<span style="font-size: 0.65rem; color: var(--accent-primary); font-weight: normal; margin-left: 0.5rem; border: 1px solid var(--accent-primary); padding: 0 4px; border-radius: 4px;">BULK</span>' : ''}</div>
                \${tierNoteHtml}
            </div>`;

appCode = appCode.replace(renderCartItemOld.replace(/\r\n/g, '\n'), renderCartItemNew.replace(/\r\n/g, '\n'));
appCode = appCode.replace(renderCartItemOld.replace(/\n/g, '\r\n'), renderCartItemNew.replace(/\n/g, '\r\n'));

// Update getCurrentBulkRate
const currentBulkRateOld = `function getCurrentBulkRate() {
    const item = inventory.find(i => i.id === currentBulkProductId);
    const rateEl = document.getElementById('bulkRate');
    const rateInput = rateEl ? rateEl.value : '';
    const rate = rateInput === '' ? (item ? item.price : 0) : parseFloat(rateInput);
    return isNaN(rate) ? 0 : rate;
}`;

const currentBulkRateNew = `function getCurrentBulkRate() {
    const item = inventory.find(i => i.id === currentBulkProductId);
    const rateEl = document.getElementById('bulkRate');
    const qtyEl = document.getElementById('bulkQty');
    const qty = parseFloat(qtyEl?.value) || 1;
    const rateInput = rateEl ? rateEl.value : '';
    if (rateInput !== '') {
        const rate = parseFloat(rateInput);
        return isNaN(rate) ? 0 : rate;
    }
    if (item) {
        const res = getProductTierRate(item, qty);
        return res.rate;
    }
    return 0;
}`;

appCode = appCode.replace(currentBulkRateOld.replace(/\r\n/g, '\n'), currentBulkRateNew.replace(/\r\n/g, '\n'));
appCode = appCode.replace(currentBulkRateOld.replace(/\n/g, '\r\n'), currentBulkRateNew.replace(/\n/g, '\r\n'));

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('SUCCESS: Updated js/app.js');


// 2. UPDATE js/inventory.js
const invPath = path.join(__dirname, '..', 'js', 'inventory.js');
let invCode = fs.readFileSync(invPath, 'utf8');

const oldPriceCell = "        tr.appendChild(createCell(`Rs. ${parseFloat(item.price).toFixed(2)}`, 'right', 'Price'));";
const newPriceCell = `        let priceHtml = 'Rs. ' + parseFloat(item.price || 0).toFixed(2);
        let tiers = item.price_tiers;
        if (typeof tiers === 'string') {
            try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; }
        }
        const hasTiers = (item.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0;

        if (hasTiers) {
            const rates = tiers.map(t => parseFloat(t.ratePerUnit)).filter(r => !isNaN(r));
            if (rates.length > 0) {
                const minRate = Math.min(...rates);
                const maxRate = Math.max(...rates);
                const rangeStr = minRate === maxRate ? ('Rs. ' + minRate) : ('Rs. ' + minRate + '-' + maxRate);

                const unitStr = item.unit ? (' ' + item.unit) : '';
                const breakdownRows = tiers.map((t, i) => {
                    const hasUpper = t.maxQty !== null && t.maxQty !== undefined && t.maxQty !== '' && t.maxQty !== 999999 && String(t.maxQty).toLowerCase() !== 'no limit' && String(t.maxQty).toLowerCase() !== '∞';
                    const qtyRange = hasUpper ? (t.minQty + ' - ' + t.maxQty + unitStr) : (t.minQty + '+' + unitStr);
                    return '• ' + qtyRange + ': Rs. ' + parseFloat(t.ratePerUnit).toFixed(2);
                }).join('\\n');

                const tooltipTitle = 'Quantity-Based Tiers (Unit: ' + (item.unit || 'Unit') + '):\\n' + breakdownRows;

                priceHtml = '<div style="cursor: pointer; display: inline-flex; flex-direction: column; align-items: flex-end;" title="' + tooltipTitle.replace(/"/g, '&quot;') + '" onclick="showTierPopup(event, \\'' + (item.name || '').replace(/'/g, "\\\\'") + '\\', \\'' + encodeURIComponent(JSON.stringify(tiers)) + '\\', \\'' + (item.unit || 'Unit').replace(/'/g, "\\\\'") + '\\')">'
                    + '<span style="font-weight: 700; color: var(--text-primary); text-decoration: underline dotted var(--accent-primary); text-underline-offset: 3px;">' + rangeStr + '</span>'
                    + '<span style="font-size: 0.68rem; color: var(--accent-primary); font-weight: 600; display: inline-flex; align-items: center; gap: 2px; margin-top: 1px;">'
                    + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M7 12h10M10 18h4"/></svg>'
                    + 'Tiers (' + tiers.length + ')'
                    + '</span>'
                    + '</div>';
            }
        }
        tr.appendChild(createCell(priceHtml, 'right', 'Price'));`;

if (invCode.includes(oldPriceCell)) {
    invCode = invCode.replace(oldPriceCell, newPriceCell);
}

const tierPopupFunction = `
function showTierPopup(event, productName, encodedTiers, unit) {
    if (event) {
        event.stopPropagation();
    }
    let tiers = [];
    try {
        tiers = JSON.parse(decodeURIComponent(encodedTiers));
    } catch (e) { tiers = []; }

    const oldModal = document.getElementById('tierBreakdownPopup');
    if (oldModal) oldModal.remove();

    const unitStr = unit ? (' ' + unit) : '';
    const rowsHtml = tiers.map((t, idx) => {
        const hasUpper = t.maxQty !== null && t.maxQty !== undefined && t.maxQty !== '' && t.maxQty !== 999999 && String(t.maxQty).toLowerCase() !== 'no limit' && String(t.maxQty).toLowerCase() !== '∞';
        const qtyRange = hasUpper ? (t.minQty + ' - ' + t.maxQty + unitStr) : (t.minQty + '+' + unitStr + ' (No Limit)');
        return '<tr style="border-bottom: 1px solid var(--border-light);">'
            + '<td style="padding: 0.5rem 0.75rem; font-weight: 500;">Tier ' + (idx + 1) + '</td>'
            + '<td style="padding: 0.5rem 0.75rem;">' + qtyRange + '</td>'
            + '<td style="padding: 0.5rem 0.75rem; font-weight: 700; text-align: right; color: var(--accent-primary);">Rs. ' + parseFloat(t.ratePerUnit).toFixed(2) + '</td>'
            + '</tr>';
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'tierBreakdownPopup';
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '3000';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    modal.innerHTML = '<div class="modal" style="max-width: 420px; padding: 0; overflow: hidden;" onclick="event.stopPropagation()">'
        + '<div class="modal-header" style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">'
        + '<div><h3 style="margin: 0; font-size: 1rem; font-weight: 700;">📊 Tiered Pricing</h3>'
        + '<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">' + productName + '</div></div>'
        + '<button type="button" class="btn btn-secondary" onclick="document.getElementById(\\'tierBreakdownPopup\\').remove()" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">✕</button>'
        + '</div>'
        + '<div class="modal-body" style="padding: 1rem 1.25rem;">'
        + '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">'
        + '<thead><tr style="background: var(--bg-main); border-bottom: 1px solid var(--border-light); text-align: left;">'
        + '<th style="padding: 0.4rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Tier</th>'
        + '<th style="padding: 0.4rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Quantity Range</th>'
        + '<th style="padding: 0.4rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); text-align: right;">Rate/Unit</th>'
        + '</tr></thead>'
        + '<tbody>' + rowsHtml + '</tbody>'
        + '</table></div>'
        + '<div class="modal-footer" style="padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end;">'
        + '<button type="button" class="btn btn-primary" onclick="document.getElementById(\\'tierBreakdownPopup\\').remove()" style="font-size: 0.8rem; padding: 0.35rem 0.85rem;">Close</button>'
        + '</div></div>';

    document.body.appendChild(modal);
}
window.showTierPopup = showTierPopup;
`;

if (!invCode.includes('function showTierPopup(')) {
    invCode += tierPopupFunction;
}

fs.writeFileSync(invPath, invCode, 'utf8');
console.log('SUCCESS: Updated js/inventory.js');
