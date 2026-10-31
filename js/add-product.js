// js/add-product.js

let inventory = [];
let currentEditIndex = -1;
const STORAGE_CATEGORIES_KEY = 'pos_custom_categories';
const STORAGE_DELETED_DEFAULTS_KEY = 'pos_deleted_defaults';

function readArray(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function normalizeInventoryIds(items) {
    const seen = new Set();
    let changed = false;
    const normalized = items.map((item, index) => {
        let id = item && item.id != null ? String(item.id) : '';
        if (!id || seen.has(id)) {
            id = `${Date.now()}-${index}`;
            changed = true;
        }
        seen.add(id);
        return item.id === id ? item : { ...item, id };
    });
    if (changed) {
        localStorage.setItem('pos_items', JSON.stringify(normalized));
    }
    return normalized;
}


function applyBusinessTypeUI() {
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const isPanOnly = settings.businessType === 'pan_only';

    const vatGroup = document.getElementById('itemVatType')?.closest('.form-group');
    if (vatGroup) {
        vatGroup.style.display = isPanOnly ? 'none' : 'block';
    }

    const hsGroup = document.getElementById('itemHsCode')?.closest('.form-group');
    if (hsGroup) {
        hsGroup.style.display = isPanOnly ? 'none' : 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    const editIndex = Number.parseInt(urlParams.get('index') || '', 10);
    const categoryName = urlParams.get('category');

    if (editId) {
        sessionStorage.setItem('inventory_scroll_item_id', String(editId));
        const titleEl = document.querySelector('.page-title');
        if (titleEl) titleEl.textContent = 'Edit Product';

        const modalTitleEl = document.getElementById('modalTitle');
        if (modalTitleEl) modalTitleEl.textContent = 'Edit Product';

        document.title = 'Edit Product - K Pos';
    } else {
        document.title = 'Add Product - K Pos';
        // Clear any saved page state from a previous edit session
        // so old edit data doesn't leak into the blank Add Product form
        const pageId = window.location.pathname.split('/').pop() || 'add-product.html';
        sessionStorage.removeItem('pos_page_state_' + pageId);
    }

    // 1. Fetch inventory from posAPI (SQLite) if available, otherwise fall back to localStorage
    if (window.posAPI) {
        try {
            inventory = await window.posAPI.getAllInventory();
            if (!Array.isArray(inventory)) inventory = [];
            // Mirror to localStorage so other pages that still read from it stay in sync
            localStorage.setItem('pos_items', JSON.stringify(inventory));
        } catch (e) {
            console.warn('posAPI.getAllInventory failed, falling back to localStorage:', e);
            inventory = readArray('pos_items');
        }
    } else {
        inventory = readArray('pos_items');
    }
    if (!Array.isArray(inventory)) inventory = [];

    populateCategoryDropdown();
    applyBusinessTypeUI();

    if (editId) {
        // Search by ID string (from API or localStorage)
        let item = inventory.find(i => String(i.id) === String(editId));

        // Fallback: try fetching the single item directly from posAPI if not found
        if (!item && window.posAPI) {
            try {
                item = await window.posAPI.getInventoryItem(editId);
            } catch (e) { /* ignore */ }
        }

        // Fallback: try by index if ID doesn't match
        if (!item && Number.isInteger(editIndex) && editIndex >= 0 && inventory[editIndex]) {
            item = inventory[editIndex];
        }

        if (item) {
            currentEditIndex = inventory.indexOf(item);
            populateFormForEdit(item);
        } else {
            alert('Item not found!');
        }
    } else if (categoryName) {
        // Pre-select category if coming from category manager
        const select = document.getElementById('itemCategory');
        if (select) select.value = categoryName;
    }

    const unitEl = document.getElementById('itemUnit');
    if (unitEl) {
        unitEl.addEventListener('change', () => { updateLowStockUnit(); updateTierUnitBadge(); });
    }
    updateLowStockUnit();
    updateTierUnitBadge();
});

function populateCategoryDropdown() {
    const select = document.getElementById('itemCategory');
    if (!select) return;

    const defaultCategories = ['Oil', 'Dal', 'Simi', 'Pitho/chyakhla', 'Species', 'Seeds', 'Chamal', 'Pina', 'Chiura', 'Chiya Pati', 'Seasonal'];
    const deletedDefaults = readArray(STORAGE_DELETED_DEFAULTS_KEY);
    const activeDefaultCats = defaultCategories.filter(c => !deletedDefaults.includes(c));

    let customCats = readArray(STORAGE_CATEGORIES_KEY);
    const inventoryCats = [...new Set(inventory.map(item => item.category).filter(Boolean))];

    select.innerHTML = '';

    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = '— Select Category —';
    select.appendChild(blankOption);

    const allCats = [...new Set([...activeDefaultCats, ...inventoryCats, ...customCats])];
    allCats.sort();

    allCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function resetForm() {
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = 'Add Product';

    const modalTitleEl = document.getElementById('modalTitle');
    if (modalTitleEl) modalTitleEl.textContent = 'Add Product';

    const fields = [
        'itemId', 'itemName', 'itemSku', 'itemBarcode', 'itemBatchNo', 'itemHsCode',
        'itemUnit', 'itemDescription', 'itemCost', 'itemPrice', 'itemStock',
        'itemLowStock', 'itemSupplier', 'itemExpiry', 'itemExpiryNote',
        'itemBarcodeWeight', 'itemBarcodeMfg'
    ];

    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.value = '';
    });

    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) categorySelect.value = '';

    const vatTypeEl = document.getElementById('itemVatType');
    const vatCustomEl = document.getElementById('itemVatCustom');
    const vatWrapperEl = document.getElementById('itemVatCustomWrapper');
    if (vatTypeEl) vatTypeEl.value = '13';
    if (vatWrapperEl) vatWrapperEl.style.display = 'none';
    if (vatCustomEl) {
        vatCustomEl.value = '';
    }

    const marginDisplay = document.getElementById('itemMarginDisplay');
    if (marginDisplay) {
        marginDisplay.textContent = '—';
    }

    const statusEl = document.getElementById('itemStatus');
    if (statusEl) {
        statusEl.checked = true;
        handleProductStatusChange(true);
    }

    updateLowStockUnit();
    const enableTieredEl = document.getElementById('enableTieredPricing');
    if (enableTieredEl) enableTieredEl.checked = false;
    productPriceTiers = [];
    toggleTieredPricingSection(false);
}

let currentDateMode = 'AD';

function adToBs(dateStr) {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (!clean) return '';
    
    let d, m, y;
    if (clean.includes('/')) {
        const p = clean.split('/');
        if (p[0].length === 4) {
            y = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            d = parseInt(p[2], 10);
        } else {
            m = parseInt(p[0], 10) - 1;
            d = parseInt(p[1], 10);
            y = parseInt(p[2], 10);
        }
    } else if (clean.includes('-')) {
        const p = clean.split('-');
        if (p[0].length === 4) {
            y = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            d = parseInt(p[2], 10);
        } else {
            m = parseInt(p[0], 10) - 1;
            d = parseInt(p[1], 10);
            y = parseInt(p[2], 10);
        }
    } else {
        return '';
    }

    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100) return '';
    const jsDate = new Date(y, m, d);
    if (isNaN(jsDate.getTime())) return '';

    const ND = (window.NepaliDate && window.NepaliDate.default) || window.NepaliDate;
    if (!ND) return '';
    try {
        const bs = new ND(jsDate);
        const bsD = String(bs.getDate()).padStart(2, '0');
        const bsM = String(bs.getMonth() + 1).padStart(2, '0');
        const bsY = bs.getYear();
        return `${bsY}/${bsM}/${bsD}`;
    } catch (e) {
        return '';
    }
}

function bsToAd(dateStr) {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (!clean) return '';

    let d, m, y;
    if (clean.includes('/')) {
        const p = clean.split('/');
        if (p[0].length === 4) {
            y = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            d = parseInt(p[2], 10);
        } else {
            d = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            y = parseInt(p[2], 10);
        }
    } else if (clean.includes('-')) {
        const p = clean.split('-');
        if (p[0].length === 4) {
            y = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            d = parseInt(p[2], 10);
        } else {
            d = parseInt(p[0], 10);
            m = parseInt(p[1], 10) - 1;
            y = parseInt(p[2], 10);
        }
    } else {
        return '';
    }

    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 2000 || y > 2150) return '';

    const ND = (window.NepaliDate && window.NepaliDate.default) || window.NepaliDate;
    if (!ND) return '';
    try {
        const bs = new ND(y, m, d);
        const jsDate = bs.toJsDate();
        if (!jsDate || isNaN(jsDate.getTime())) return '';
        const adD = String(jsDate.getDate()).padStart(2, '0');
        const adM = String(jsDate.getMonth() + 1).padStart(2, '0');
        const adY = jsDate.getFullYear();
        return `${adY}/${adM}/${adD}`;
    } catch (e) {
        return '';
    }
}

function setDateMode(mode) {
    const oldMode = currentDateMode;
    currentDateMode = mode;

    const btnAD = document.getElementById('btnDateModeAD');
    const btnBS = document.getElementById('btnDateModeBS');
    const input = document.getElementById('itemExpiry');

    if (mode === 'BS') {
        if (btnAD) {
            btnAD.style.background = 'transparent';
            btnAD.style.color = 'var(--text-secondary, #6b7280)';
        }
        if (btnBS) {
            btnBS.style.background = 'var(--accent-primary, #4f46e5)';
            btnBS.style.color = '#ffffff';
        }
        if (input) {
            input.placeholder = 'YYYY/MM/DD (BS)';
            if (input.value && oldMode === 'AD') {
                const converted = adToBs(input.value);
                if (converted) input.value = converted;
            }
        }
    } else {
        if (btnBS) {
            btnBS.style.background = 'transparent';
            btnBS.style.color = 'var(--text-secondary, #6b7280)';
        }
        if (btnAD) {
            btnAD.style.background = 'var(--accent-primary, #4f46e5)';
            btnAD.style.color = '#ffffff';
        }
        if (input) {
            input.placeholder = 'YYYY/MM/DD (AD)';
            if (input.value && oldMode === 'BS') {
                const converted = bsToAd(input.value);
                if (converted) input.value = converted;
            }
        }
    }
}
window.setDateMode = setDateMode;

function formatDateInput(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 6) {
        input.value = v.substring(0, 4) + '/' + v.substring(4, 6) + '/' + v.substring(6);
    } else if (v.length > 4) {
        input.value = v.substring(0, 4) + '/' + v.substring(4);
    } else {
        input.value = v;
    }
}
window.formatDateInput = formatDateInput;

function handleDatePickerChange(val) {
    if (!val) return;
    const parts = val.split('-');
    if (parts.length === 3) {
        const formatted = `${parts[0]}/${parts[1]}/${parts[2]}`;
        const input = document.getElementById('itemExpiry');
        if (input) {
            if (currentDateMode === 'BS') {
                const bsVal = adToBs(formatted);
                input.value = bsVal || formatted;
            } else {
                input.value = formatted;
            }
        }
    }
}
window.handleDatePickerChange = handleDatePickerChange;

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (!clean) return '';
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
        return clean;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, d] = clean.split('-');
        return `${y}/${m}/${d}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [p1, p2, y] = clean.split('/');
        return `${y}/${p1}/${p2}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
        const [p1, p2, y] = clean.split('-');
        return `${y}/${p1}/${p2}`;
    }
    return clean;
}

function handleProductStatusChange(isActive) {
    const label = document.getElementById('itemStatusLabel');
    if (!label) return;
    if (isActive) {
        label.textContent = 'Active';
        label.style.color = '#10b981';
    } else {
        label.textContent = 'Inactive';
        label.style.color = '#ef4444';
    }
}
window.handleProductStatusChange = handleProductStatusChange;

function setSelectUnit(val) {
    const select = document.getElementById('itemUnit');
    if (!select) return '';
    if (!val && val !== 0) {
        select.value = '';
        return '';
    }
    const clean = String(val).trim();
    if (!clean) {
        select.value = '';
        return '';
    }

    // 1. Direct or case-insensitive match on existing options
    for (let i = 0; i < select.options.length; i++) {
        const opt = select.options[i];
        if (opt.value && opt.value.trim().toLowerCase() === clean.toLowerCase()) {
            select.selectedIndex = i;
            return opt.value;
        }
    }

    // 2. Common aliases
    const lower = clean.toLowerCase();
    let aliasMatch = '';
    if (lower === 'kg' || lower === 'kgs' || lower === 'kilogram' || lower === 'kilograms') aliasMatch = 'Kg';
    else if (lower === 'pcs' || lower === 'pc' || lower === 'piece' || lower === 'pieces') aliasMatch = 'Pcs';
    else if (lower === 'gm' || lower === 'g' || lower === 'gram' || lower === 'grams') aliasMatch = 'Gm';
    else if (lower === 'liter' || lower === 'litre' || lower === 'ltr' || lower === 'l' || lower === 'liters') aliasMatch = 'Liter';
    else if (lower === 'ml' || lower === 'milliliter' || lower === 'millilitre') aliasMatch = 'ML';
    else if (lower === 'meter' || lower === 'metre' || lower === 'm' || lower === 'mtr') aliasMatch = 'Meter';
    else if (lower === 'box' || lower === 'boxes' || lower === 'bx') aliasMatch = 'Box';
    else if (lower === 'dozen' || lower === 'doz' || lower === 'dz') aliasMatch = 'Dozen';
    else if (lower === 'bag' || lower === 'bags') aliasMatch = 'Bag';
    else if (lower === 'sack' || lower === 'sacks') aliasMatch = 'Sack';
    else if (lower === 'drum' || lower === 'drums') aliasMatch = 'Drum';
    else if (lower === 'carton' || lower === 'cartons' || lower === 'ctn') aliasMatch = 'Carton';

    if (aliasMatch) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === aliasMatch) {
                select.selectedIndex = i;
                return aliasMatch;
            }
        }
    }

    // 3. Custom unit not in standard options - dynamically create option so unit is never lost!
    const opt = document.createElement('option');
    opt.value = clean;
    opt.textContent = clean;
    select.appendChild(opt);
    select.value = clean;
    return clean;
}
window.setSelectUnit = setSelectUnit;

function updateLowStockUnit() {
    const unitEl = document.getElementById('itemUnit');
    const unit = unitEl ? unitEl.value.trim() : '';
    
    // Purchase Rate & Selling Rate
    const costBadgeEl = document.getElementById('purchaseRateUnitBadge');
    const priceBadgeEl = document.getElementById('sellingRateUnitBadge');
    if (costBadgeEl) {
        costBadgeEl.textContent = unit ? `(${unit})` : '';
    }
    if (priceBadgeEl) {
        priceBadgeEl.textContent = unit ? `(${unit})` : '';
    }

    // Low Stock Alert
    const lowBadgeEl = document.getElementById('lowStockUnitBadge');
    const lowInputEl = document.getElementById('itemLowStock');

    if (lowBadgeEl) {
        lowBadgeEl.textContent = unit ? `(${unit})` : '';
    }
    if (lowInputEl) {
        lowInputEl.placeholder = 'e.g. 10';
    }

    // Opening Stock
    const openBadgeEl = document.getElementById('openingStockUnitBadge');
    const openInputEl = document.getElementById('itemStock');

    if (openBadgeEl) {
        openBadgeEl.textContent = unit ? `(${unit})` : '';
    }
    if (openInputEl) {
        openInputEl.placeholder = '0';
    }
}
window.updateLowStockUnit = updateLowStockUnit;

function handleVatTypeChange(val) {
    const wrapper = document.getElementById('itemVatCustomWrapper');
    const customInput = document.getElementById('itemVatCustom');
    if (val === 'manual') {
        if (wrapper) wrapper.style.display = 'flex';
        else if (customInput) customInput.style.display = 'block';
        if (customInput && typeof customInput.focus === 'function') customInput.focus();
    } else {
        if (wrapper) wrapper.style.display = 'none';
        else if (customInput) customInput.style.display = 'none';
        if (customInput) customInput.value = '';
    }
}
window.handleVatTypeChange = handleVatTypeChange;

function stepValue(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;
    const min = el.min !== '' ? parseFloat(el.min) : -Infinity;
    const max = el.max !== '' ? parseFloat(el.max) : Infinity;
    let val = parseFloat(el.value);
    if (isNaN(val)) val = 0;
    let newVal = val + delta;
    if (newVal < min) newVal = min;
    if (newVal > max) newVal = max;
    if (Number.isInteger(newVal)) {
        el.value = newVal;
    } else {
        el.value = parseFloat(newVal.toFixed(3));
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (id === 'itemCost' || id === 'itemPrice') {
        calcInventoryMargin();
    }
}
window.stepValue = stepValue;


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

        tr.innerHTML = `
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-min-qty" data-index="${index}"
                       value="${tier.minQty !== undefined && tier.minQty !== null ? tier.minQty : ''}" 
                       min="0" step="any" placeholder="0" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box; ${index === 0 ? 'background: var(--bg-main, #f1f5f9); cursor: not-allowed;' : ''}"
                       ${index === 0 ? 'readonly' : ''}
                       oninput="handleTierInputChange(${index}, 'minQty', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-max-qty" data-index="${index}"
                       value="${maxDisplayVal}" 
                       min="0" step="any" placeholder="${isLast ? 'No limit (∞)' : 'e.g. 0.499'}" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box;"
                       oninput="handleTierInputChange(${index}, 'maxQty', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem;">
                <input type="number" class="form-input tier-rate" data-index="${index}"
                       value="${tier.ratePerUnit !== undefined && tier.ratePerUnit !== null ? tier.ratePerUnit : ''}" 
                       min="0.01" step="0.01" placeholder="0.00" 
                       style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.82rem; height: 32px; box-sizing: border-box;"
                       oninput="handleTierInputChange(${index}, 'ratePerUnit', this.value)">
            </td>
            <td style="padding: 0.35rem 0.4rem; text-align: center;">
                <button type="button" class="btn btn-danger btn-remove-tier" 
                        onclick="removeTierRow(${index})" 
                        title="Remove Tier"
                        style="padding: 0.2rem 0.45rem; font-size: 0.75rem; height: 28px; line-height: 1; ${productPriceTiers.length <= 1 ? 'visibility:hidden;' : ''}">
                    ✕
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    const btnAdd = document.getElementById('btnAddTier');
    if (btnAdd) {
        btnAdd.style.display = productPriceTiers.length >= 5 ? 'none' : 'inline-flex';
    }

    const hint = document.getElementById('tierCountHint');
    if (hint) {
        hint.textContent = `${productPriceTiers.length} of 5 tiers allowed`;
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
            const msg = `Tier ${i + 1}: Min Qty must be a valid non-negative number.`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (isNaN(rate) || rate <= 0) {
            const msg = `Tier ${i + 1}: Rate/Unit must be a positive number greater than 0.`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (hasMax) {
            if (isNaN(max) || max <= min) {
                const msg = `Tier ${i + 1}: Max Qty (${tier.maxQty}) must be greater than Min Qty (${min}).`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }
        } else if (i < productPriceTiers.length - 1) {
            const msg = `Tier ${i + 1}: Only the last tier can have an unlimited Max Qty.`;
            if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
            return { isValid: false, error: msg };
        }

        if (i > 0) {
            const prev = productPriceTiers[i - 1];
            const prevMax = parseFloat(prev.maxQty);
            if (isNaN(prevMax)) {
                const msg = `Tier ${i}: Previous tier must have a defined Max Qty.`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }

            if (min < prevMax) {
                const msg = `Tiers must not overlap. Tier ${i + 1} starts at ${min} which is less than Tier ${i} max (${prevMax}).`;
                if (errorContainer) { errorContainer.textContent = msg; errorContainer.style.display = 'block'; }
                return { isValid: false, error: msg };
            }

            if (min - prevMax > 0.01 && min - prevMax > 1) {
                const msg = `Tiers must be sequential with no gaps. Tier ${i + 1} starts at ${min} but Tier ${i} ends at ${prevMax}.`;
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

function populateFormForEdit(item) {
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = 'Edit Product';
    document.getElementById('itemId').value     = item.id == null ? '' : String(item.id);
    document.getElementById('itemName').value   = item.name || '';
    document.getElementById('itemCategory').value = item.category || '';
    
    const skuEl = document.getElementById('itemSku');
    if (skuEl) skuEl.value = item.sku || item.barcode || '';
    
    document.getElementById('itemBarcode').value = item.barcode || '';
    document.getElementById('itemBatchNo').value = item.barcodeBatchNo || '';
    document.getElementById('itemHsCode').value = item.hsCode || '';
    
    setSelectUnit(item.unit);
    
    const descEl = document.getElementById('itemDescription');
    if (descEl) descEl.value = item.description || '';

    document.getElementById('itemCost').value = item.costPrice || '';
    document.getElementById('itemPrice').value = item.price   || '';
    document.getElementById('itemStock').value = item.stock   ?? 0;

    const vatTypeEl = document.getElementById('itemVatType');
    const vatCustomEl = document.getElementById('itemVatCustom');
    const vatWrapperEl = document.getElementById('itemVatCustomWrapper');
    const rawVat = item.vatRate != null ? item.vatRate : (item.vat != null ? item.vat : 13);

    if (rawVat === 'none' || item.vatType === 'none') {
        if (vatTypeEl) vatTypeEl.value = 'none';
        if (vatWrapperEl) vatWrapperEl.style.display = 'none';
        if (vatCustomEl) { vatCustomEl.value = ''; }
    } else if (rawVat === 0 || rawVat === '0') {
        if (vatTypeEl) vatTypeEl.value = '0';
        if (vatWrapperEl) vatWrapperEl.style.display = 'none';
        if (vatCustomEl) { vatCustomEl.value = ''; }
    } else if (rawVat === 13 || rawVat === '13' || rawVat == null) {
        if (vatTypeEl) vatTypeEl.value = '13';
        if (vatWrapperEl) vatWrapperEl.style.display = 'none';
        if (vatCustomEl) { vatCustomEl.value = ''; }
    } else {
        const num = parseFloat(rawVat);
        if (vatTypeEl) vatTypeEl.value = 'manual';
        if (vatWrapperEl) vatWrapperEl.style.display = 'flex';
        if (vatCustomEl) {
            vatCustomEl.value = isNaN(num) ? rawVat : num;
        }
    }

    const lowStock = item.lowStockAlert != null ? item.lowStockAlert : (item.lowStock != null ? item.lowStock : '');
    document.getElementById('itemLowStock').value = lowStock;
    document.getElementById('itemSupplier').value = item.supplier || '';
    document.getElementById('itemExpiry').value = formatDisplayDate(item.expiry || item.barcodeMfg || '');
    document.getElementById('itemExpiryNote').value = item.expiryNote || item.barcodeNote || '';
    document.getElementById('itemBarcodeWeight').value = item.barcodeWeight || '';
    
    const mfgEl = document.getElementById('itemBarcodeMfg');
    if (mfgEl) mfgEl.value = item.barcodeMfg || '';

    const statusEl = document.getElementById('itemStatus');
    if (statusEl) {
        const isActive = !(item.status === 'inactive' || item.isActive === false || item.active === false);
        statusEl.checked = isActive;
        handleProductStatusChange(isActive);
    }

    calcInventoryMargin();
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
}

function calcInventoryMargin() {
    const cost = parseFloat(document.getElementById('itemCost').value) || 0;
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const marginDisplay = document.getElementById('itemMarginDisplay');
    
    if (cost > 0 && price > 0) {
        const profit = price - cost;
        const marginPct = (profit / cost) * 100;
        const color = profit >= 0 ? 'var(--accent-success)' : '#ef4444';
        marginDisplay.innerHTML = `<span style="color:${color}; font-weight:700;">${marginPct.toFixed(1)}%</span> <span style="font-size:0.7rem;">(Rs.${profit.toFixed(2)})</span>`;
    } else {
        marginDisplay.textContent = '—';
    }
}

function closeModal() {
    currentEditIndex = -1;
    resetForm();
}

function goBackToInventory() {
    const editId = document.getElementById('itemId')?.value || new URLSearchParams(window.location.search).get('id');
    if (editId) {
        sessionStorage.setItem('inventory_scroll_item_id', String(editId));
    }
    currentEditIndex = -1;
    resetForm();
    document.getElementById('itemId').value = '';
    window.location.href = 'inventory.html';
}

async function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const priceStr = document.getElementById('itemPrice').value;
    const stockStr = document.getElementById('itemStock').value;
    const id = document.getElementById('itemId').value;

    if (!name || !category || !priceStr || !stockStr) {
        alert('Please fill in all required fields (Name, Category, Price, Stock).');
        return;
    }

    const price = parseFloat(priceStr);
    const stock = parseFloat(stockStr);

    if (isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
        alert('Price and Stock must be valid non-negative numbers.');
        return;
    }

    const costPrice = parseFloat(document.getElementById('itemCost').value) || 0;
    const skuEl = document.getElementById('itemSku');
    const sku = skuEl ? skuEl.value.trim() : '';
    const barcode = document.getElementById('itemBarcode').value.trim();
    const batchNo = document.getElementById('itemBatchNo').value.trim();
    const hsCode = document.getElementById('itemHsCode').value.trim();
    const unit = document.getElementById('itemUnit')?.value.trim() || '';
    
    const descEl2 = document.getElementById('itemDescription');
    const description = descEl2 ? descEl2.value.trim() : '';
    
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const isPanOnly = settings.businessType === 'pan_only';

    let vatRate = 13;
    if (isPanOnly) {
        vatRate = 0;
    } else {
        const vatType = document.getElementById('itemVatType')?.value || '13';
        if (vatType === 'none' || vatType === '0') {
            vatRate = 0;
        } else if (vatType === '13') {
            vatRate = 13;
        } else if (vatType === 'manual') {
            const customVal = parseFloat(document.getElementById('itemVatCustom')?.value);
            vatRate = isNaN(customVal) ? 0 : customVal;
        }
    }

    const lowStockRaw = document.getElementById('itemLowStock')?.value.trim();
    const lowStockAlert = (lowStockRaw !== '' && !isNaN(parseInt(lowStockRaw, 10))) ? parseInt(lowStockRaw, 10) : 5;
    const supplier = document.getElementById('itemSupplier').value.trim();
    const expiry = document.getElementById('itemExpiry').value;
    const expiryNote = document.getElementById('itemExpiryNote').value.trim();
    const barcodeWeight = document.getElementById('itemBarcodeWeight').value.trim();
    const mfgEl = document.getElementById('itemBarcodeMfg');
    const barcodeMfg = mfgEl?.value.trim() || expiry;

    const statusEl = document.getElementById('itemStatus');
    const isActive = statusEl ? statusEl.checked : true;
    const status = isActive ? 'active' : 'inactive';

    const curBizId = window.BusinessManager ? window.BusinessManager.getCurrentBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1');

    const enableTieredEl = document.getElementById('enableTieredPricing');
    const isTiered = enableTieredEl ? enableTieredEl.checked : false;

    if (isTiered) {
        const val = validatePriceTiers(true);
        if (!val.isValid) {
            alert('Please resolve tiered pricing error:\n' + val.error);
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
        id: id || Date.now().toString(),
        business_id: curBizId,
        name, category, sku, barcode: barcode || sku,
        hsCode, unit, description, costPrice, price,
        vatRate, stock, lowStockAlert, supplier, expiry, expiryNote,
        barcodeWeight, barcodeMfg, barcodeBatchNo: batchNo, barcodeNote: expiryNote,
        enable_tiered_pricing: isTiered,
        price_tiers: cleanedTiers,
        status,
        isActive
    };

    const isEdit = !!id;
    let actionName = 'Added Product';
    
    if (isEdit) {
        actionName = 'Updated Product';
    }

    // Save to Database/local storage
    try {
        if (window.posAPI && window.posAPI.saveInventoryItem) {
            await window.posAPI.saveInventoryItem(item);
        } else {
            throw new Error('API not available');
        }
    } catch (error) {
        console.warn('API save failed, using local storage fallback', error);
        // Fallback
    }

    // Mirror to localStorage without overwriting other businesses' items
    let allItems = [];
    try {
        allItems = JSON.parse(localStorage.getItem('pos_items') || '[]');
        if (!Array.isArray(allItems)) allItems = [];
    } catch(e) { allItems = []; }

    const idx = allItems.findIndex(i => String(i.id) === String(item.id));
    if (idx > -1) {
        allItems[idx] = { ...allItems[idx], ...item };
    } else {
        allItems.push(item);
    }
    localStorage.setItem('pos_items', JSON.stringify(allItems));
    localStorage.setItem('pos_inventory_sync', String(Date.now()));

    try {
        const savedBarcode = JSON.parse(localStorage.getItem(`barcode_${item.id}`) || 'null');
        if (savedBarcode) {
            savedBarcode.priceOnLabel = item.price;
            savedBarcode.wtVolQty = item.barcodeWeight || savedBarcode.wtVolQty || '';
            savedBarcode.batchNo = item.barcodeBatchNo;
            savedBarcode.expiryDate = item.barcodeMfg || item.expiry || null;
            savedBarcode.note = item.expiryNote;
            if (savedBarcode.labelContent) {
                savedBarcode.labelContent.productName = item.name;
                savedBarcode.labelContent.price = String(item.price);
                savedBarcode.labelContent.weight = item.barcodeWeight || savedBarcode.labelContent.weight || '';
                savedBarcode.labelContent.batchNo = item.barcodeBatchNo;
                savedBarcode.labelContent.mfg = item.barcodeMfg || item.expiry || '';
                savedBarcode.labelContent.note = item.expiryNote;
            }
            localStorage.setItem(`barcode_${item.id}`, JSON.stringify(savedBarcode));
        }
    } catch(e) { }

    // Audit log
    const logs = JSON.parse(localStorage.getItem('pos_audit_logs') || '[]');
    logs.push({
        user: 'Admin User',
        action: actionName,
        module: 'Inventory',
        refId: `#P-${item.id.slice(-4)}`,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pos_audit_logs', JSON.stringify(logs));

    currentEditIndex = -1;
    resetForm();
    if (item.id) {
        sessionStorage.setItem('inventory_scroll_item_id', String(item.id));
    }
    document.getElementById('itemId').value = '';

    // Navigate back to inventory so the user can see their saved product
    window.location.href = 'inventory.html';
}

window.toggleTieredPricingSection = toggleTieredPricingSection;
window.addNewTierRow = addNewTierRow;
window.removeTierRow = removeTierRow;
window.handleTierInputChange = handleTierInputChange;
window.renderTierBuilder = renderTierBuilder;
