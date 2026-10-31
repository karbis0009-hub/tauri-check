const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'add-product.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. In DOMContentLoaded, add updateTierUnitBadge
code = code.replace(
    "    const unitEl = document.getElementById('itemUnit');\r\n    if (unitEl) {\r\n        unitEl.addEventListener('change', updateLowStockUnit);\r\n    }\r\n    updateLowStockUnit();",
    "    const unitEl = document.getElementById('itemUnit');\r\n    if (unitEl) {\r\n        unitEl.addEventListener('change', () => { updateLowStockUnit(); updateTierUnitBadge(); });\r\n    }\r\n    updateLowStockUnit();\r\n    updateTierUnitBadge();"
);
// In case of LF
code = code.replace(
    "    const unitEl = document.getElementById('itemUnit');\n    if (unitEl) {\n        unitEl.addEventListener('change', updateLowStockUnit);\n    }\n    updateLowStockUnit();",
    "    const unitEl = document.getElementById('itemUnit');\n    if (unitEl) {\n        unitEl.addEventListener('change', () => { updateLowStockUnit(); updateTierUnitBadge(); });\n    }\n    updateLowStockUnit();\n    updateTierUnitBadge();"
);

// 2. In resetForm, reset tier pricing
const resetSearch = "    updateLowStockUnit();\r\n}";
const resetSearchLF = "    updateLowStockUnit();\n}";
const resetReplace = "    updateLowStockUnit();\r\n    const enableTieredEl = document.getElementById('enableTieredPricing');\r\n    if (enableTieredEl) enableTieredEl.checked = false;\r\n    productPriceTiers = [];\r\n    toggleTieredPricingSection(false);\r\n}";
const resetReplaceLF = "    updateLowStockUnit();\n    const enableTieredEl = document.getElementById('enableTieredPricing');\n    if (enableTieredEl) enableTieredEl.checked = false;\n    productPriceTiers = [];\n    toggleTieredPricingSection(false);\n}";

if (code.includes(resetSearch)) {
    code = code.replace(resetSearch, resetReplace);
} else if (code.includes(resetSearchLF)) {
    code = code.replace(resetSearchLF, resetReplaceLF);
}

// 3. Add Tier Builder Functions before populateFormForEdit
const tierFunctions = `
// ── Quantity-Based Tiered Pricing Logic ─────────────────────────────
let productPriceTiers = [];
let tierAutoSaveTimeout = null;

function updateTierUnitBadge() {
    const unitEl = document.getElementById('itemUnit');
    const badge = document.getElementById('tierUnitBadge');
    if (badge) {
        badge.textContent = (unitEl && unitEl.value.trim()) ? unitEl.value.trim() : 'Unit';
    }
}

function toggleTieredPricingSection(enabled) {
    const section = document.getElementById('tieredPricingSection');
    if (!section) return;
    section.style.display = enabled ? 'block' : 'none';
    
    updateTierUnitBadge();
    
    if (enabled) {
        if (!Array.isArray(productPriceTiers) || productPriceTiers.length === 0) {
            const currentPrice = parseFloat(document.getElementById('itemPrice')?.value) || '';
            productPriceTiers = [
                {
                    tierId: 'tier_' + Date.now() + '_1',
                    minQty: 0,
                    maxQty: null,
                    ratePerUnit: currentPrice
                }
            ];
        }
        renderTierBuilder();
    } else {
        const errorContainer = document.getElementById('tierValidationErrors');
        if (errorContainer) errorContainer.style.display = 'none';
    }
}

function renderTierBuilder() {
    const tbody = document.getElementById('tierTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    updateTierUnitBadge();

    productPriceTiers.forEach((tier, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light, #e2e8f0)';

        const isLast = index === productPriceTiers.length - 1;
        const maxDisplayVal = (tier.maxQty === null || tier.maxQty === undefined || tier.maxQty === '' || tier.maxQty === 999999 || String(tier.maxQty).toLowerCase() === 'no limit' || String(tier.maxQty).toLowerCase() === '∞') ? '' : tier.maxQty;

        tr.innerHTML = \`
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-min-qty" data-index="\${index}"
                       value="\${tier.minQty !== undefined && tier.minQty !== null ? tier.minQty : ''}" 
                       min="0" step="any" placeholder="0" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box; \${index === 0 ? 'background: var(--bg-main, #f1f5f9); cursor: not-allowed;' : ''}"
                       \${index === 0 ? 'readonly' : ''}
                       oninput="handleTierInputChange(\${index}, 'minQty', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-max-qty" data-index="\${index}"
                       value="\${maxDisplayVal}" 
                       min="0" step="any" placeholder="\${isLast ? 'No limit (∞)' : 'e.g. 0.499'}" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box;"
                       oninput="handleTierInputChange(\${index}, 'maxQty', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-rate" data-index="\${index}"
                       value="\${tier.ratePerUnit !== undefined && tier.ratePerUnit !== null ? tier.ratePerUnit : ''}" 
                       min="0.01" step="0.01" placeholder="0.00" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box;"
                       oninput="handleTierInputChange(\${index}, 'ratePerUnit', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem; text-align: center;">
                <button type="button" class="btn btn-danger btn-remove-tier" 
                        onclick="removeTierRow(\${index})" 
                        title="Remove Tier"
                        style="padding: 0.2rem 0.45rem; font-size: 0.75rem; height: 28px; line-height: 1; \${productPriceTiers.length <= 1 ? 'visibility:hidden;' : ''}">
                    ✕
                </button>
            </td>
        \`;

        tbody.appendChild(tr);
    });

    const btnAdd = document.getElementById('btnAddTier');
    if (btnAdd) {
        btnAdd.style.display = productPriceTiers.length >= 5 ? 'none' : 'inline-flex';
    }

    const hint = document.getElementById('tierCountHint');
    if (hint) {
        hint.textContent = \`\${productPriceTiers.length} of 5 tiers allowed\`;
    }

    validatePriceTiers(false);
}

function addNewTierRow() {
    if (productPriceTiers.length >= 5) return;

    const prevIndex = productPriceTiers.length - 1;
    let newMinQty = 0;
    let prevRate = parseFloat(document.getElementById('itemPrice')?.value) || 0;

    if (prevIndex >= 0) {
        const prevTier = productPriceTiers[prevIndex];
        prevRate = parseFloat(prevTier.ratePerUnit) || prevRate;
        
        let prevMax = parseFloat(prevTier.maxQty);
        if (isNaN(prevMax) || prevTier.maxQty === null || prevTier.maxQty === '' || prevTier.maxQty === 999999) {
            const prevMin = parseFloat(prevTier.minQty) || 0;
            if (prevMin === 0) {
                prevMax = 0.499;
            } else if (prevMin < 1) {
                prevMax = parseFloat((prevMin + 0.499).toFixed(3));
            } else {
                prevMax = prevMin + 1;
            }
            prevTier.maxQty = prevMax;
        }

        if (prevMax < 1) {
            newMinQty = parseFloat((prevMax + 0.001).toFixed(3));
        } else {
            newMinQty = Number.isInteger(prevMax) ? (prevMax + 1) : parseFloat((prevMax + 0.001).toFixed(3));
        }
    }

    productPriceTiers.push({
        tierId: 'tier_' + Date.now() + '_' + (productPriceTiers.length + 1),
        minQty: newMinQty,
        maxQty: null,
        ratePerUnit: prevRate > 0 ? prevRate : ''
    });

    renderTierBuilder();
    triggerTierAutoSave();
}

function removeTierRow(index) {
    if (productPriceTiers.length <= 1) return;
    productPriceTiers.splice(index, 1);

    if (productPriceTiers.length > 0) {
        productPriceTiers[0].minQty = 0;
    }

    renderTierBuilder();
    triggerTierAutoSave();
}

function handleTierInputChange(index, field, value) {
    if (!productPriceTiers[index]) return;

    if (field === 'maxQty') {
        const val = String(value).trim();
        if (val === '' || val.toLowerCase() === 'no limit' || val.toLowerCase() === '∞') {
            productPriceTiers[index].maxQty = null;
        } else {
            productPriceTiers[index].maxQty = parseFloat(val);
        }
    } else if (field === 'minQty') {
        productPriceTiers[index].minQty = parseFloat(value) || 0;
    } else if (field === 'ratePerUnit') {
        productPriceTiers[index].ratePerUnit = String(value).trim() === '' ? '' : parseFloat(value);
    }

    validatePriceTiers(false);
    triggerTierAutoSave();
}

function triggerTierAutoSave() {
    const statusEl = document.getElementById('tierAutoSaveStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
    }

    if (tierAutoSaveTimeout) clearTimeout(tierAutoSaveTimeout);
    tierAutoSaveTimeout = setTimeout(() => {
        const validation = validatePriceTiers(false);
        if (validation.isValid && statusEl) {
            statusEl.textContent = '✓ Saved';
            statusEl.style.display = 'inline';
            setTimeout(() => {
                if (statusEl) statusEl.style.display = 'none';
            }, 2500);
        }
    }, 800);
}

function validatePriceTiers(showHighlight = false) {
    const enableTieredEl = document.getElementById('enableTieredPricing');
    const isEnabled = enableTieredEl ? enableTieredEl.checked : false;
    const errorContainer = document.getElementById('tierValidationErrors');

    if (!isEnabled) {
        if (errorContainer) errorContainer.style.display = 'none';
        return { isValid: true, error: '' };
    }

    if (!Array.isArray(productPriceTiers) || productPriceTiers.length === 0) {
        const msg = 'At least 1 tier is required when Quantity-Based Pricing is enabled.';
        if (errorContainer) {
            errorContainer.textContent = msg;
            errorContainer.style.display = 'block';
        }
        return { isValid: false, error: msg };
    }

    if (productPriceTiers.length > 5) {
        const msg = 'Maximum 5 tiers allowed.';
        if (errorContainer) {
            errorContainer.textContent = msg;
            errorContainer.style.display = 'block';
        }
        return { isValid: false, error: msg };
    }

    const firstMin = parseFloat(productPriceTiers[0].minQty);
    if (isNaN(firstMin) || firstMin !== 0) {
        const msg = 'First tier must start at Min Qty: 0.';
        if (errorContainer) {
            errorContainer.textContent = msg;
            errorContainer.style.display = 'block';
        }
        return { isValid: false, error: msg };
    }

    for (let i = 0; i < productPriceTiers.length; i++) {
        const tier = productPriceTiers[i];
        const min = parseFloat(tier.minQty);
        const rate = parseFloat(tier.ratePerUnit);
        const hasMax = tier.maxQty !== null && tier.maxQty !== undefined && tier.maxQty !== '' && tier.maxQty !== 999999;
        const max = hasMax ? parseFloat(tier.maxQty) : Infinity;

        if (isNaN(min) || min < 0) {
            const msg = \`Tier \${i + 1}: Min Qty must be a valid non-negative number.\`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (isNaN(rate) || rate <= 0) {
            const msg = \`Tier \${i + 1}: Rate/Unit must be a positive number greater than 0.\`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (hasMax) {
            if (isNaN(max) || max <= min) {
                const msg = \`Tier \${i + 1}: Max Qty (\${tier.maxQty}) must be greater than Min Qty (\${min}).\`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }
        } else if (i < productPriceTiers.length - 1) {
            const msg = \`Tier \${i + 1}: Only the last tier can have an unlimited Max Qty.\`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (i > 0) {
            const prev = productPriceTiers[i - 1];
            const prevMax = parseFloat(prev.maxQty);
            if (isNaN(prevMax)) {
                const msg = \`Tier \${i}: Previous tier must have a defined Max Qty.\`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }

            if (min < prevMax) {
                const msg = \`Tiers must not overlap. Tier \${i + 1} starts at \${min} which is less than Tier \${i} max (\${prevMax}).\`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }

            if (min - prevMax > 0.01 && min - prevMax > 1) {
                const msg = \`Tiers must be sequential with no gaps. Tier \${i + 1} starts at \${min} but Tier \${i} ends at \${prevMax}.\`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }
        }
    }

    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
    return { isValid: true, error: '' };
}
`;

code = code.replace("function populateFormForEdit(item) {", tierFunctions + "\nfunction populateFormForEdit(item) {");

// 4. In populateFormForEdit, populate tiers
const editEndTarget = "    calcInventoryMargin();\r\n    updateLowStockUnit();\r\n}";
const editEndTargetLF = "    calcInventoryMargin();\n    updateLowStockUnit();\n}";
const editEndReplace = `    calcInventoryMargin();
    updateLowStockUnit();
    updateTierUnitBadge();

    const isTiered = Boolean(item.enable_tiered_pricing || (item.price_tiers && item.price_tiers.length > 0));
    const tierToggle = document.getElementById('enableTieredPricing');
    if (tierToggle) tierToggle.checked = isTiered;

    let loadedTiers = item.price_tiers;
    if (typeof loadedTiers === 'string') {
        try { loadedTiers = JSON.parse(loadedTiers); } catch(e) { loadedTiers = []; }
    }
    productPriceTiers = Array.isArray(loadedTiers) && loadedTiers.length > 0 ? JSON.parse(JSON.stringify(loadedTiers)) : [];

    toggleTieredPricingSection(isTiered);
    if (isTiered) {
        renderTierBuilder();
    }
}`;

if (code.includes(editEndTarget)) {
    code = code.replace(editEndTarget, editEndReplace.replace(/\n/g, '\r\n') + '\r\n}');
} else if (code.includes(editEndTargetLF)) {
    code = code.replace(editEndTargetLF, editEndReplace + '\n}');
}

// 5. In saveItem, validate tiers and attach to item object
const saveItemTarget = "    const item = {\r\n        id: id || Date.now().toString(),";
const saveItemTargetLF = "    const item = {\n        id: id || Date.now().toString(),";

const saveItemTierValidation = `    const enableTieredEl = document.getElementById('enableTieredPricing');
    const isTiered = enableTieredEl ? enableTieredEl.checked : false;

    if (isTiered) {
        const val = validatePriceTiers(true);
        if (!val.isValid) {
            alert('Please resolve tiered pricing error:\\n' + val.error);
            const section = document.getElementById('tieredPricingSection');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    const cleanedTiers = isTiered ? productPriceTiers.map((t, idx) => ({
        productId: id || '',
        tierId: t.tierId || ('tier_' + Date.now() + '_' + idx),
        minQty: parseFloat(t.minQty) || 0,
        maxQty: (t.maxQty === null || t.maxQty === undefined || t.maxQty === '' || t.maxQty === 999999 || String(t.maxQty).toLowerCase() === 'no limit' || String(t.maxQty).toLowerCase() === '∞') ? null : parseFloat(t.maxQty),
        ratePerUnit: parseFloat(t.ratePerUnit) || 0
    })) : [];

    const item = {
        id: id || Date.now().toString(),`;

if (code.includes(saveItemTarget)) {
    code = code.replace(saveItemTarget, saveItemTierValidation.replace(/\n/g, '\r\n'));
} else if (code.includes(saveItemTargetLF)) {
    code = code.replace(saveItemTargetLF, saveItemTierValidation);
}

// Attach enable_tiered_pricing and price_tiers inside item object
code = code.replace("        barcodeWeight, barcodeMfg, barcodeBatchNo: batchNo, barcodeNote: expiryNote,\r\n        status,", "        barcodeWeight, barcodeMfg, barcodeBatchNo: batchNo, barcodeNote: expiryNote,\r\n        enable_tiered_pricing: isTiered,\r\n        price_tiers: cleanedTiers,\r\n        status,");
code = code.replace("        barcodeWeight, barcodeMfg, barcodeBatchNo: batchNo, barcodeNote: expiryNote,\n        status,", "        barcodeWeight, barcodeMfg, barcodeBatchNo: batchNo, barcodeNote: expiryNote,\n        enable_tiered_pricing: isTiered,\n        price_tiers: cleanedTiers,\n        status,");

// Export window methods
code += `
window.toggleTieredPricingSection = toggleTieredPricingSection;
window.addNewTierRow = addNewTierRow;
window.removeTierRow = removeTierRow;
window.handleTierInputChange = handleTierInputChange;
window.renderTierBuilder = renderTierBuilder;
`;

fs.writeFileSync(filePath, code, 'utf8');
console.log('SUCCESS: Updated js/add-product.js');
