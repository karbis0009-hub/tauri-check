
function applyBusinessTypeInventory() {
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const isPanOnly = settings.businessType === 'pan_only';
    const vatTh = document.getElementById('th-vat');
    if (vatTh) {
        vatTh.style.display = isPanOnly ? 'none' : '';
    }
}

// Inventory Manager

// Default keys
const STORAGE_KEY = 'pos_items';
const STORAGE_CATEGORIES_KEY = 'pos_custom_categories';
const STORAGE_DELETED_DEFAULTS_KEY = 'pos_deleted_defaults';
const OLD_DEFAULT_CATEGORIES = ['Grocery', 'Snacks', 'Dairy', 'Beverage', 'Household', 'Personal Care', 'Other'];
const OLD_DEFAULT_ITEM_NAMES = [
    'Basmati Rice 25kg', 'Black Lentils', 'Tori oil liter', 'Sarso', 'Bottle 2.5',
    'Bottle 5liter', 'Chickpeas', 'Green checkpea', 'Local kalo dal',
    'kalo dall', 'Khodo', 'Rato dal', 'Bottle Sliter', 'Khodo pitho', 'Local Musuro dal',
    'Jeera phidako', 'Local jira 30kg', 'Local jeera chamal',
    'Local rato dal', 'Mechi chiya pail', 'pina two', 'shakkar',
    'Test Product', 'Test Persistent Product', 'Test Post Product'
];
const OLD_DEFAULT_ITEM_CATEGORY_PAIRS = [
    ['Junalo', 'Chamal'],
    ['Pina', 'Pitho/chyakhla'],
    ['tori', 'Chamal']
];

// Seed with default products if localStorage is empty
const defaultItems = [

    // ── OIL ──────────────────────────────────────────────
    { name: "Tori Oil", category: "Oil", price: 350, unit: "Liter", vat: 0 },
    { name: "Sarso oil", category: "Oil", price: 400, unit: "Liter", vat: 0 },
    { name: "Aalas Oil", category: "Oil", price: 600, unit: "Liter ", vat: 0 },
    { name: "Til Oil", category: "Oil", price: 750, unit: "Liter", vat: 0 },
    { name: "Bottle 2.5 Liter", category: "Oil", price: 90, unit: "pcs", vat: 0 },
    { name: "Bottle 5 Liter", category: "Oil", price: 120, unit: "pcs", vat: 0 },
    { name: "Bottle 10 Liter", category: "Oil", price: 220, unit: "pcs", vat: 0 },
    { name: "Bottle 20 Liter", category: "Oil", price: 350, unit: "pcs", vat: 0 },
    { name: "Tori phalako ", category: "Oil", price: 20, unit: "kg", vat: 0 },


    // ── DAL ──────────────────────────────────────────────
    { name: "Local Maas Dal", category: "Dal", price: 260, unit: "kg", vat: 0 },
    { name: "Maas Dal", category: "Dal", price: 230, unit: "kg", vat: 0 },
    { name: "Local Musuro ", category: "Dal", price: 220, unit: "kg", vat: 0 },
    { name: "Musuro", category: "Dal", price: 150, unit: "kg", vat: 0 },
    { name: "Local Moong Dal", category: "Dal", price: 220, unit: "kg", vat: 0 },
    { name: "Moong Dal", category: "Dal", price: 200, unit: "kg", vat: 0 },
    { name: "Moong Geda", category: "Dal", price: 220, unit: "kg", vat: 0 },
    { name: "Moong Chata Dal", category: "Dal", price: 180, unit: "kg", vat: 0 },
    { name: "Mix Dal", category: "Dal", price: 200, unit: "kg", vat: 0 },
    { name: "Rahar", category: "Dal", price: 240, unit: "kg", vat: 0 },
    { name: "Chana Dal", category: "Dal", price: 170, unit: "kg", vat: 0 },


    // ── SIMI ─────────────────────────────────────────────
    { name: "Chana", category: "Simi", price: 150, unit: "kg", vat: 0 },
    { name: "Local Chana", category: "Simi", price: 200, unit: "kg", vat: 0 },
    { name: "Kabuli Chana", category: "Simi", price: 200, unit: "kg", vat: 0 },
    { name: "Green kerau", category: "Simi", price: 160, unit: "kg", vat: 0 },
    { name: "Seto Kerau", category: "Simi", price: 150, unit: "kg", vat: 0 },
    { name: "Sano Kerau", category: "Simi", price: 270, unit: "kg", vat: 0 },
    { name: "Sano Kerau", category: "Simi", price: 60, unit: "gram", vat: 0 },
    { name: "Palpali Simi", category: "Simi", price: 200, unit: "kg", vat: 0 },
    { name: "Rajma", category: "Simi", price: 280, unit: "kg", vat: 0 },
    { name: "Rajma", category: "Simi", price: 60, unit: "gram", vat: 0 },
    { name: "Bodi", category: "Simi", price: 200, unit: "kg", vat: 0 },
    { name: "Mashang", category: "Simi", price: 170, unit: "kg", vat: 0 },
    { name: "Kwati", category: "Simi", price: 190, unit: "kg", vat: 0 },
    { name: "Gahat ", category: "Simi", price: 200, unit: "kg", vat: 0 },
    { name: "Lukla Simi", category: "Simi", price: 250, unit: "kg", vat: 0 },
    { name: "Lukla Simi", category: "Simi", price: 300, unit: "kg", vat: 0 },
    { name: "Kalo Simi", category: "Simi", price: 300, unit: "kg", vat: 0 },

    // ── PITHO / CHYAKHLA ─────────────────────────────────
    { name: "Phapar Pitho", category: "Pitho/Chyakhla", price: 200, unit: "kg", vat: 0 },
    { name: "Phapar ", category: "Pitho/Chyakhla", price: 190, unit: "kg", vat: 0 },
    { name: "Kodo Pitho", category: "Pitho/Chyakhla", price: 100, unit: "kg", vat: 0 },
    { name: "Kodo ", category: "Pitho/Chyakhla", price: 90, unit: "kg", vat: 0 },
    { name: "Gahun Pitho", category: "Pitho/Chyakhla", price: 90, unit: "kg", vat: 0 },
    { name: "Gahun", category: "Pitho/Chyakhla", price: 80, unit: "kg", vat: 0 },
    { name: "Makai Pitho", category: "Pitho/Chyakhla", price: 70, unit: "kg", vat: 0 },
    { name: "Popcon Makai", category: "Pitho/Chyakhla", price: 130, unit: "kg", vat: 0 },
    { name: "Local Makai", category: "Pitho/Chyakhla", price: 150, unit: "kg", vat: 0 },
    { name: "Makai Chyakhla", category: "Pitho/Chyakhla", price: 100, unit: "kg", vat: 0 },
    { name: "Phito Phidako", category: "Pitho/Chyakhla", price: 20, unit: "pcs", vat: 0 },
    { name: "Mix Sattu", category: "Pitho/Chyakhla", price: 250, unit: "kg", vat: 0 },
    { name: "Chana Sattu", category: "Pitho/Chyakhla", price: 250, unit: "kg", vat: 0 },
    { name: "Junalo", category: "Pitho/Chyakhla", price: 150, unit: "kg", vat: 0 },


    // ── SPECIES / MASALA ─────────────────────────────────

    { name: "Jeera", category: "Species", price: 550, unit: "kg", vat: 0 },
    { name: "Dhaniya", category: "Species", price: 140, unit: "kg", vat: 0 },
    { name: "Jeera Powder", category: "Species", price: 600, unit: "kg", vat: 0 },
    { name: "Jeera Powder", category: "Species", price: 130, unit: "gram", vat: 0 },
    { name: "Jeera Pidhako", category: "Species", price: 30, unit: "kg", vat: 0 },
    { name: "Besar Powder", category: "Species", price: 500, unit: "kg", vat: 0 },
    { name: "Besar Powder", category: "Species", price: 110, unit: "gram", vat: 0 },
    { name: "Jwano", category: "Species", price: 100, unit: "gram", vat: 0 },
    { name: "Jwano", category: "Species", price: 50, unit: "gram", vat: 0 },
    { name: "Lwang", category: "Species", price: 200, unit: "gram", vat: 0 },
    { name: "Timur", category: "Species", price: 100, unit: "gram", vat: 0 },



    // ── SEEDS ───────────────────────────────────────────
    { name: "Khairo Til", category: "Seeds", price: 400, unit: "kg", vat: 0 },
    { name: "Khairo Til", category: "Seeds", price: 90, unit: "gram", vat: 0 },
    { name: "Seto Til", category: "Seeds", price: 400, unit: "kg", vat: 0 },
    { name: "Seto Til", category: "Seeds", price: 90, unit: "gram", vat: 0 },
    { name: "Aalas ", category: "Seeds", price: 300, unit: "kg", vat: 0 },
    { name: "Aalas ", category: "Seeds", price: 70, unit: "gram", vat: 0 },
    { name: "Silam", category: "Seeds", price: 750, unit: "kg", vat: 0 },
    { name: "Silam", category: "Seeds", price: 150, unit: "gram", vat: 0 },
    { name: "Methi", category: "Seeds", price: 200, unit: "kg", vat: 0 },
    { name: "Methi", category: "Seeds", price: 40, unit: "gram", vat: 0 },
    { name: "Kalo Bhatmas", category: "Seeds", price: 260, unit: "kg", vat: 0 },
    { name: "Khairo Bhatmas", category: "Seeds", price: 200, unit: "kg", vat: 0 },
    { name: "Thulo Seto Bhatmas", category: "Seeds", price: 250, unit: "kg", vat: 0 },
    { name: "Seto Bhatmas", category: "Seeds", price: 150, unit: "kg", vat: 0 },
    { name: "Hariyo Bhatmas", category: "Seeds", price: 500, unit: "kg", vat: 0 },
    { name: "Ban Silam", category: "Seeds", price: 600, unit: "kg", vat: 0 },
    { name: "Tori", category: "Seeds", price: 200, unit: "kg", vat: 0 },
    { name: "Surso", category: "Seeds", price: 300, unit: "kg", vat: 0 },


    // ── CHAMAL ───────────────────────────────────────────
    { name: "Local Pokhrali", category: "Chamal", price: 120, unit: "kg", vat: 0 },
    { name: "Local Pokhrali 30kg", category: "Chamal", price: 3000, unit: "bag", vat: 0 },
    { name: "Local Jeera", category: "Chamal", price: 150, unit: "kg", vat: 0 },
    { name: "Local Jeera 30kg", category: "Chamal", price: 4300, unit: "bag", vat: 0 },
    { name: "Local Basmati", category: "Chamal", price: 200, unit: "kg", vat: 0 },
    { name: "Local Basmati 30kg", category: "Chamal", price: 5700, unit: "bag", vat: 0 },
    { name: "Taichin Chamal", category: "Chamal", price: 180, unit: "kg", vat: 0 },
    { name: "Khata Chamal", category: "Chamal", price: 140, unit: "kg", vat: 0 },
    { name: "Chamal Phidako", category: "Chamal", price: 10, unit: "kg", vat: 0 },


    // ── PINA ───────────────────────────────────────────
    { name: "Pina", category: "Pina", price: 50, unit: "kg", vat: 0 },
    { name: "Pina ", category: "Pina", price: 45, unit: "kg", vat: 0 },
    { name: "Pina 40 kg", category: "Pina", price: 1800, unit: "kg", vat: 0 },
    { name: "Dhulo Pina", category: "Pina", price: 60, unit: "kg", vat: 0 },


    // ── CHIURA ───────────────────────────────────────────
    { name: "Local Taichin Chiura", category: "Chiura", price: 160, unit: "kg", vat: 0 },
    { name: " Rato chiura ", category: "Chiura", price: 140, unit: "kg", vat: 0 },


    // ── CHIYA PATI ───────────────────────────────────────
    { name: "Mechi chiya", category: "Chiya Pati", price: 275, unit: "kg", vat: 0 },
    { name: "Mechi Masala ", category: "Chiya Pati", price: 290, unit: "kg", vat: 0 },
    { name: "Maiti Ghar", category: "Chiya Pati", price: 300, unit: "kg", vat: 0 },


    // ── SEASONAL  ────────────────────────────────────
    { name: "Shakar", category: "Seasonal", price: 300, unit: "kg", vat: 0 },
    { name: "Janai", category: "Seasonal", price: 25, unit: "pcs", vat: 0 },
    { name: "Battai Egg", category: "Seasonal", price: 100, unit: "pcs", vat: 0 },
    { name: "Chakku", category: "Seasonal", price: 100, unit: "kg", vat: 0 },



];

let inventory = [];
let currentCategory = 'All';
let customCategories = [];
let categoryOrder = [];

function readArray(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function categoryKey(category) {
    return String(category || '').trim().toLowerCase();
}

function uniqueCategories(categories) {
    const seen = new Set();
    return categories
        .map(c => String(c || '').trim())
        .filter(c => {
            const key = categoryKey(c);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function sameCategory(a, b) {
    return categoryKey(a) === categoryKey(b);
}

function getDefaultCategories() {
    return uniqueCategories(defaultItems.map(item => item.category).filter(Boolean));
}

function loadCategoryOrder() {
    categoryOrder = uniqueCategories(readArray('pos_category_order').filter(c => c && c !== 'All' && !OLD_DEFAULT_CATEGORIES.includes(c)));
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder));
}

function getOrderedCategories(includeAll = false) {
    const defaultCats = getDefaultCategories();
    const defaultCatKeys = new Set(defaultCats.map(categoryKey));
    const inventoryCats = uniqueCategories(inventory.map(i => i.category).filter(Boolean));
    const activeDefaultCats = defaultCats.filter(c => inventoryCats.some(cat => sameCategory(cat, c)) || customCategories.some(cat => sameCategory(cat, c)));
    let allCats = uniqueCategories([...activeDefaultCats, ...inventoryCats.filter(c => !defaultCatKeys.has(categoryKey(c))), ...customCategories.filter(c => !defaultCatKeys.has(categoryKey(c)))]).filter(c => c && c !== 'All');
    const baseOrder = allCats.slice();

    if (categoryOrder.length > 0) {
        allCats.sort((a, b) => {
            const idxA = categoryOrder.findIndex(c => sameCategory(c, a));
            const idxB = categoryOrder.findIndex(c => sameCategory(c, b));
            if (idxA !== -1 && idxB !== -1) {
                return idxA - idxB;
            }
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return baseOrder.indexOf(a) - baseOrder.indexOf(b);
        });
    }

    return includeAll ? ['All', ...allCats] : allCats;
}

function isOldDefaultItem(item) {
    const itemName = String(item && item.name || '').trim().toLowerCase();
    const itemId = String(item && item.id || '').toLowerCase();
    if (itemName.startsWith('test ') || itemName === 'test product' || itemId.startsWith('test-') || itemId.includes('test')) {
        return true;
    }
    return OLD_DEFAULT_ITEM_NAMES.some(name => String(name).trim().toLowerCase() === itemName) ||
        OLD_DEFAULT_CATEGORIES.includes(item && item.category) ||
        OLD_DEFAULT_ITEM_CATEGORY_PAIRS.some(([name, category]) => itemName === String(name).trim().toLowerCase() && sameCategory(item.category, category));
}

function isNewDefaultItem(item) {
    return defaultItems.some(defaultItem => defaultItem.name === item.name && sameCategory(defaultItem.category, item.category));
}

function normalizeInventoryIds(items) {
    const seen = new Set();
    let changed = false;

    if (!Array.isArray(items)) items = [];

    // Filter out old legacy demo items (old test items or removed categories)
    items = items.filter(item => !isOldDefaultItem(item));

    if (items.length === 0) {
        const seeded = defaultItems.map((item, index) => ({
            ...item,
            id: `default-${index + 1}`,
            stock: item.stock != null ? item.stock : 999
        }));
        return { items: seeded, changed: true };
    }

    // Ensure every existing item has a valid unique ID and stock value without altering user edited values
    const normalized = items.map((item, index) => {
        let id = item && item.id != null ? String(item.id) : '';
        if (!id || seen.has(id)) {
            id = `user-${Date.now()}-${index}`;
            changed = true;
        }
        seen.add(id);
        const stock = item.stock == null ? 0 : item.stock;
        if (item.stock == null) changed = true;

        let price = item.price;
        if (price == null || price === '' || isNaN(parseFloat(price))) {
            const defItem = defaultItems.find(d => d.name === item.name && sameCategory(d.category, item.category));
            if (defItem && defItem.price != null) {
                price = defItem.price;
                changed = true;
            } else {
                price = 0;
            }
        }

        return (item.id === id && item.stock != null && item.price === price) ? item : { ...item, id, stock, price };
    });
    return { items: normalized, changed };
}

function init() {
    // Restore Category State
    const savedCat = sessionStorage.getItem('pos_inventory_category');
    if (savedCat) {
        currentCategory = savedCat;
    }

    loadCategoryOrder();
    loadInventory();
    loadCustomCategories();
    renderTable();

    // Search listener
    const searchEl = document.getElementById('search-inventory');
    const clearSearchEl = document.getElementById('clearSearchInventory');
    const syncSearchClearButton = () => {
        if (clearSearchEl && searchEl) clearSearchEl.style.display = searchEl.value.trim() ? 'flex' : 'none';
    };
    if (searchEl) {
        searchEl.addEventListener('input', (e) => {
            renderTable(e.target.value);
            syncSearchClearButton();
        });
        syncSearchClearButton();
    }
    if (clearSearchEl && searchEl) {
        clearSearchEl.addEventListener('click', () => {
            searchEl.value = '';
            renderTable('');
            syncSearchClearButton();
            searchEl.focus();
        });
    }

    // Handle deep links (action parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'add') {
        setTimeout(openModal, 100);
    } else if (action === 'category') {
        window.location.href = 'category.html';
    }

    setupScrollPersistence();
}

function updateStats() {
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const totalQtyEl = document.getElementById('totalQty');

    if (!totalProductsEl || !lowStockCountEl || !totalQtyEl) return;

    const totalProducts = inventory.length;
    const lowStockCount = inventory.filter(item => (item.stock || 0) <= 5).length;
    const totalQty = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);

    totalProductsEl.textContent = totalProducts;
    lowStockCountEl.textContent = lowStockCount;
    totalQtyEl.textContent = fmt(totalQty);
}

function fmt(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function mergeSavedBarcodeRecords(items) {
    return (Array.isArray(items) ? items : []).map(item => {
        if (!item || !item.id) return item;
        const merged = { ...item };
        try {
            const barcodeRecord = JSON.parse(localStorage.getItem(`barcode_${item.id}`) || 'null');
            if (barcodeRecord && typeof barcodeRecord === 'object') {
                if (barcodeRecord.barcodeValue && !merged.barcode) {
                    merged.barcode = barcodeRecord.barcodeValue;
                } else if (barcodeRecord.value && !merged.barcode) {
                    merged.barcode = barcodeRecord.value;
                }
                if (barcodeRecord.barcodeType && !merged.barcodeType) {
                    merged.barcodeType = barcodeRecord.barcodeType;
                } else if (barcodeRecord.type && !merged.barcodeType) {
                    merged.barcodeType = barcodeRecord.type;
                }
            }
        } catch (e) { }
        return merged;
    });
}

function loadInventory() {
    const curBizId = window.BusinessManager ? window.BusinessManager.getCurrentBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1');
    window.posAPI.getAllInventory()
        .then(data => {
            if (data && data.length > 0) {
                inventory = mergeSavedBarcodeRecords(data);
            } else if (curBizId === 'biz_1') {
                inventory = mergeSavedBarcodeRecords([...defaultItems]);
                saveInventory();
            } else {
                inventory = [];
            }
            const normalizedInventory = normalizeInventoryIds(inventory);
            inventory = normalizedInventory.items;
            if (normalizedInventory.changed) saveInventory();
            const searchEl = document.getElementById('search-inventory');
            renderTable(searchEl ? searchEl.value : '');
            renderCategoryTabs();
            if (typeof renderCategoryManagerList === 'function') renderCategoryManagerList();
            updateStats();
        })
        .catch(err => {
            console.warn('API unavailable, falling back to localStorage:', err);
            let all = [];
            try {
                all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            } catch(e) { all = []; }
            inventory = mergeSavedBarcodeRecords(all.filter(i => (i.business_id || 'biz_1') === curBizId));
            if (inventory.length === 0 && curBizId === 'biz_1') {
                inventory = mergeSavedBarcodeRecords([...defaultItems]);
                saveInventory();
            }
            const normalizedInventory = normalizeInventoryIds(inventory);
            inventory = normalizedInventory.items;
            if (normalizedInventory.changed) saveInventory();
            const searchEl = document.getElementById('search-inventory');
            renderTable(searchEl ? searchEl.value : '');
            renderCategoryTabs();
            if (typeof renderCategoryManagerList === 'function') renderCategoryManagerList();
            updateStats();
        });
}

function saveInventory() {
    const curBizId = window.BusinessManager ? window.BusinessManager.getCurrentBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1');
    let allItems = [];
    try {
        allItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(allItems)) allItems = [];
    } catch(e) { allItems = []; }

    const otherBizItems = allItems.filter(i => (i.business_id || 'biz_1') !== curBizId);
    const updatedBizItems = inventory.map(i => ({ ...i, business_id: curBizId }));
    const merged = [...otherBizItems, ...updatedBizItems];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function renderTable(searchTerm = '') {
    const tbody = document.getElementById('inventory-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    const term = searchTerm.toLowerCase().trim();

    let filtered = inventory;

    // Filter by Category
    if (currentCategory !== 'All') {
        const curCat = currentCategory.trim();
        filtered = filtered.filter(item => (item.category || '').trim() === curCat);
    }

    // Filter by Search
    if (term) {
        filtered = filtered.filter((item, index) => {
            const name = (item.name || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const seqCode = `K${String(index + 1).padStart(4, '0')}`.toLowerCase();
            const barcode = String(item.itemCode || item.barcode || seqCode).toLowerCase();
            const hsCode = String(item.hsCode || item.hscCode || '').toLowerCase();
            const id = String(item.id || '').toLowerCase();

            return name.includes(term) ||
                category.includes(term) ||
                barcode.includes(term) ||
                seqCode.includes(term) ||
                hsCode.includes(term) ||
                id.includes(term);
        });
    }

    updateStats();

    // Sort: Category order > item custom order > exact saved defaultItems order
    const itemOrder = JSON.parse(localStorage.getItem('pos_item_order') || '{}');
    const defaultIndexMap = new Map();
    defaultItems.forEach((item, index) => {
        defaultIndexMap.set(`${String(item.name || '').trim().toLowerCase()}|${categoryKey(item.category)}`, index);
    });

    filtered.sort((a, b) => {
        const catA = a.category || '';
        const catB = b.category || '';

        // 1. Category Order
        const orderedCats = getOrderedCategories(false);
        const catIdxA = orderedCats.findIndex(c => sameCategory(c, catA));
        const catIdxB = orderedCats.findIndex(c => sameCategory(c, catB));
        const catValA = catIdxA !== -1 ? catIdxA : 9999;
        const catValB = catIdxB !== -1 ? catIdxB : 9999;
        if (catValA !== catValB) return catValA - catValB;

        // 2. Custom Item Order (if user explicitly dragged/reordered in this category)
        if (itemOrder[catA]) {
            const orderIndexA = itemOrder[catA].indexOf(a.id);
            const orderIndexB = itemOrder[catB].indexOf(b.id);
            if (orderIndexA !== -1 || orderIndexB !== -1) {
                const itemValA = orderIndexA !== -1 ? orderIndexA : 9999;
                const itemValB = orderIndexB !== -1 ? orderIndexB : 9999;
                if (itemValA !== itemValB) return itemValA - itemValB;
            }
        }

        // 3. Exact Canonical Default Items Order as saved in defaultItems
        const keyA = `${String(a.name || '').trim().toLowerCase()}|${categoryKey(a.category)}`;
        const keyB = `${String(b.name || '').trim().toLowerCase()}|${categoryKey(b.category)}`;
        const defIdxA = defaultIndexMap.has(keyA) ? defaultIndexMap.get(keyA) : 99999;
        const defIdxB = defaultIndexMap.has(keyB) ? defaultIndexMap.get(keyB) : 99999;
        if (defIdxA !== defIdxB) return defIdxA - defIdxB;

        return 0;
    });

    filtered.forEach((item, index, arr) => {
        const tr = document.createElement('tr');
        tr.draggable = true;
        tr.dataset.id = item.id;
        tr.dataset.category = item.category;

        tr.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.effectAllowed = 'move';
            tr.classList.add('dragging');
        });

        tr.addEventListener('dragend', () => {
            tr.classList.remove('dragging');
            saveDraggedOrder(item.category);
        });

        tr.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingRow = document.querySelector('#inventory-list tr.dragging');
            if (!draggingRow || draggingRow === tr) return;

            // Only allow dragging within the same category to keep categories grouped
            if (!sameCategory(draggingRow.dataset.category, tr.dataset.category)) return;

            const rect = tr.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            tr.parentNode.insertBefore(draggingRow, next ? tr.nextSibling : tr);
        });

        tr.addEventListener('drop', (e) => {
            e.preventDefault();
        });

        // Helper for cells
        const createCell = (html, align = 'left', label = '') => {
            const td = document.createElement('td');
            td.style.textAlign = align;
            td.innerHTML = html;
            if (label) td.setAttribute('data-label', label);
            return td;
        };

        const sn = inventory.findIndex(product => String(product.id) === String(item.id)) + 1;
        const itemCode = `K${String(sn).padStart(4, '0')}`;

        tr.appendChild(createCell(`<span style="color: var(--text-muted); font-weight: 600;">${sn}</span>`, 'center', 'S.N.'));
        const isInactive = item.status === 'inactive' || item.isActive === false || item.active === false;
        const inactiveBadge = isInactive ? ' <span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:0.68rem; padding:0.15rem 0.35rem; margin-left:0.35rem; font-weight:600; vertical-align:middle;">Inactive</span>' : '';
        tr.appendChild(createCell(`<strong>${item.name}</strong>${inactiveBadge}`, 'left', 'Product Name'));
        tr.appendChild(createCell(item.category, 'left', 'Category'));
        tr.appendChild(createCell(item.unit || 'Pcs', 'left', 'Unit'));
        let priceHtml = 'Rs. ' + parseFloat(item.price || 0).toFixed(2);
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
                const minRateStr = minRate.toFixed(2);
                const maxRateStr = maxRate.toFixed(2);

                const unitStr = item.unit ? (' ' + item.unit) : '';
                const breakdownRows = tiers.map((t, i) => {
                    const hasUpper = t.maxQty !== null && t.maxQty !== undefined && t.maxQty !== '' && t.maxQty !== 999999 && String(t.maxQty).toLowerCase() !== 'no limit' && String(t.maxQty).toLowerCase() !== '∞';
                    const qtyRange = hasUpper ? (t.minQty + ' - ' + t.maxQty + unitStr) : (t.minQty + '+' + unitStr);
                    return '• ' + qtyRange + ': Rs. ' + parseFloat(t.ratePerUnit).toFixed(2);
                }).join('\n');

                const tooltipTitle = 'Quantity-Based Tiers (Unit: ' + (item.unit || 'Unit') + '):\n' + breakdownRows;

                const priceLinesHtml = minRate === maxRate
                    ? '<span style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">Rs. ' + minRateStr + '</span>'
                    : '<span style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">Rs. ' + minRateStr + '</span>'
                      + '<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; line-height: 1;">- ' + maxRateStr + '</span>';

                priceHtml = '<div style="cursor: pointer; display: inline-flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 1px;" title="' + tooltipTitle.replace(/"/g, '&quot;') + '" onclick="showTierPopup(event, \'' + (item.name || '').replace(/'/g, "\\'") + '\', \'' + encodeURIComponent(JSON.stringify(tiers)) + '\', \'' + (item.unit || 'Unit').replace(/'/g, "\\'") + '\')">'
                    + priceLinesHtml
                    + '<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--accent-primary, #6366f1); border: 1px solid rgba(99, 102, 241, 0.25); font-size: 0.62rem; padding: 1px 5px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 2px; margin-top: 2px; line-height: 1.1;">'
                    + '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M7 12h10M10 18h4"/></svg>'
                    + tiers.length + ' Tiers'
                    + '</span>'
                    + '</div>';
            }
        }
        tr.appendChild(createCell(priceHtml, 'right', 'Price'));
        const cleanStock = typeof item.stock === 'number'
            ? parseFloat(item.stock.toFixed(3))
            : (isNaN(parseFloat(item.stock)) ? 0 : parseFloat(parseFloat(item.stock).toFixed(3)));
        tr.appendChild(createCell(`<span class="${cleanStock < 10 ? 'text-danger' : ''}">${cleanStock}</span>`, 'right', 'Stock'));
        const vatRate = item.vatRate ?? item.vat ?? 13;
        tr.appendChild(createCell(vatRate === 0 ? 'Exempt' : `${vatRate}%`, 'left', 'VAT'));
        const rawBarcode = String(item.barcode || '').trim();
        const isEan13 = (/^\d{13}$/.test(rawBarcode) || item.barcodeType === 'ean13') && /^\d{13}$/.test(rawBarcode);
        const barcodeType = isEan13 ? 'ean13' : (item.barcodeType || 'code128');
        const barcodeValue = rawBarcode || itemCode;
        const barcodeTypeLabel = barcodeType === 'ean13' ? 'EAN-13' : (barcodeType === 'qr' ? 'QR Code' : 'Code128');
        const barcodeTypeStyle = barcodeType === 'ean13'
            ? 'background:rgba(16,185,129,.15);color:#059669;'
            : (barcodeType === 'qr' ? 'background:rgba(59,130,246,.15);color:#2563eb;' : 'background:rgba(245,158,11,.15);color:#d97706;');
        tr.appendChild(createCell(`<div><span class="badge badge-secondary mono" style="font-family: monospace, var(--font-mono, monospace); font-size: 0.8rem; letter-spacing: 0.02em;">${barcodeValue}</span></div><span style="display:inline-block;margin-top:.2rem;padding:.12rem .42rem;border-radius:.6rem;font-size:.65rem;font-weight:600;line-height:1.2;${barcodeTypeStyle}">${barcodeTypeLabel}</span>`, 'left', 'Barcode'));
        tr.appendChild(createCell(item.barcodeBatchNo || '<span style="color:var(--text-muted);">—</span>', 'left', 'Batch No'));
        const expiryDate = item.barcodeMfg || item.expiry || '';
        const expiryNote = item.barcodeNote || item.expiryNote || '';
        const expiryDetails = expiryDate || expiryNote
            ? `${expiryDate ? `<div>${expiryDate}</div>` : ''}${expiryNote ? `<div style="margin-top:.15rem;font-size:.75rem;color:var(--text-muted);white-space:pre-wrap;">${expiryNote}</div>` : ''}`
            : '<span style="color:var(--text-muted);">—</span>';
        tr.appendChild(createCell(expiryDetails, 'left', 'Expiry Date & Note'));
        tr.appendChild(createCell(item.barcodeWeight || '<span style="color:var(--text-muted);">—</span>', 'left', 'Weight/Qty'));
        tr.appendChild(createCell(item.hsCode || item.hscCode || '<span style="color:var(--text-muted);">—</span>', 'left', 'HSC Code'));

        // Actions Cell
        const tdActions = document.createElement('td');
        tdActions.setAttribute('data-label', 'Actions');

        const actionsWrapper = document.createElement('div');
        actionsWrapper.style.cssText = 'display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.35rem; white-space: nowrap;';

        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'btn btn-secondary';
        btnEdit.style.cssText = 'padding: 0.25rem 0.4rem; font-size: 0.75rem; flex-shrink: 0;';
        btnEdit.textContent = 'Edit';
        btnEdit.onclick = () => editItem(item.id, inventory.indexOf(item));

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-danger';
        btnDel.style.cssText = 'padding: 0.25rem 0.4rem; font-size: 0.75rem; flex-shrink: 0;';
        btnDel.textContent = 'Del';
        btnDel.onclick = () => removeProduct(item.id);

        actionsWrapper.appendChild(btnEdit);
        actionsWrapper.appendChild(btnDel);

        tdActions.appendChild(actionsWrapper);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
    updateCategoryCounts(); // Update counts after rendering table
    restoreInventoryScrollPosition();
}

function saveInventoryScrollState() {
    try {
        const winY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const winX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;

        const mainContent = document.querySelector('.main-content');
        const mainY = mainContent ? mainContent.scrollTop : 0;

        const tableWrapper = document.querySelector('.table-wrapper');
        const tblX = tableWrapper ? tableWrapper.scrollLeft : 0;
        const tblY = tableWrapper ? tableWrapper.scrollTop : 0;

        sessionStorage.setItem('inventory_page_scroll_y', String(winY));
        sessionStorage.setItem('inventory_page_scroll_x', String(winX));
        sessionStorage.setItem('inventory_page_main_y', String(mainY));
        sessionStorage.setItem('inventory_page_table_x', String(tblX));
        sessionStorage.setItem('inventory_page_table_y', String(tblY));
        if (typeof currentCategory !== 'undefined') {
            sessionStorage.setItem('pos_inventory_category', currentCategory);
        }
    } catch (e) {
        // Ignore storage errors
    }
}

function setupScrollPersistence() {
    let scrollSaveTimeout = null;
    const onScrollDebounced = () => {
        if (scrollSaveTimeout) clearTimeout(scrollSaveTimeout);
        scrollSaveTimeout = setTimeout(saveInventoryScrollState, 80);
    };

    window.addEventListener('scroll', onScrollDebounced, { passive: true });
    document.addEventListener('scroll', onScrollDebounced, { passive: true, capture: true });

    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.addEventListener('scroll', onScrollDebounced, { passive: true });
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', onScrollDebounced, { passive: true });
    }

    window.addEventListener('beforeunload', saveInventoryScrollState);
    window.addEventListener('pagehide', saveInventoryScrollState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveInventoryScrollState();
        }
    });

    // Save on any navigation clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a') || e.target.closest('button');
        if (link) {
            saveInventoryScrollState();
        }
    }, { capture: true });
}

function restoreInventoryScrollPosition() {
    const scrollItemId = sessionStorage.getItem('inventory_scroll_item_id');
    const scrollY = sessionStorage.getItem('inventory_scroll_y');
    const tableScrollY = sessionStorage.getItem('inventory_scroll_table_y');

    const pageScrollY = sessionStorage.getItem('inventory_page_scroll_y');
    const pageScrollX = sessionStorage.getItem('inventory_page_scroll_x');
    const pageMainY = sessionStorage.getItem('inventory_page_main_y');
    const pageTableX = sessionStorage.getItem('inventory_page_table_x');
    const pageTableY = sessionStorage.getItem('inventory_page_table_y');

    // Case 1: Returning from item edit
    if (scrollItemId) {
        sessionStorage.removeItem('inventory_scroll_item_id');
        sessionStorage.removeItem('inventory_scroll_y');
        sessionStorage.removeItem('inventory_scroll_table_y');

        const executeScroll = () => {
            const tableWrapper = document.querySelector('.table-wrapper');
            if (tableWrapper && tableScrollY != null) {
                tableWrapper.scrollTop = parseInt(tableScrollY, 10) || 0;
            }

            const row = document.querySelector(`#inventory-list tr[data-id="${scrollItemId}"]`);
            if (row) {
                row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                row.style.transition = 'background-color 0.5s ease';
                const originalBg = row.style.backgroundColor;
                row.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                setTimeout(() => {
                    row.style.backgroundColor = originalBg;
                }, 1200);
                return;
            }

            if (scrollY != null) {
                window.scrollTo({ top: parseInt(scrollY, 10) || 0, behavior: 'instant' });
            }
        };

        requestAnimationFrame(() => {
            executeScroll();
            setTimeout(executeScroll, 60);
            setTimeout(executeScroll, 150);
        });
        return;
    }

    // Case 2: General page navigation return
    if (pageScrollY != null || pageMainY != null || pageTableX != null || pageTableY != null) {
        const executeGeneralScroll = () => {
            const targetWinY = pageScrollY != null ? parseInt(pageScrollY, 10) : 0;
            const targetWinX = pageScrollX != null ? parseInt(pageScrollX, 10) : 0;
            if (targetWinY > 0 || targetWinX > 0) {
                window.scrollTo({ top: targetWinY, left: targetWinX, behavior: 'instant' });
                if (document.documentElement) {
                    document.documentElement.scrollTop = targetWinY;
                    document.documentElement.scrollLeft = targetWinX;
                }
                if (document.body) {
                    document.body.scrollTop = targetWinY;
                    document.body.scrollLeft = targetWinX;
                }
            }

            const mainContent = document.querySelector('.main-content');
            if (mainContent && pageMainY != null) {
                const targetMainY = parseInt(pageMainY, 10) || 0;
                if (targetMainY > 0) {
                    mainContent.scrollTop = targetMainY;
                }
            }

            const tableWrapper = document.querySelector('.table-wrapper');
            if (tableWrapper) {
                if (pageTableX != null) {
                    tableWrapper.scrollLeft = parseInt(pageTableX, 10) || 0;
                }
                if (pageTableY != null) {
                    tableWrapper.scrollTop = parseInt(pageTableY, 10) || 0;
                }
            }
        };

        requestAnimationFrame(() => {
            executeGeneralScroll();
            setTimeout(executeGeneralScroll, 50);
            setTimeout(executeGeneralScroll, 120);
        });
    }
}

function saveDraggedOrder(category) {
    const rows = Array.from(document.querySelectorAll('#inventory-list tr'));
    const newOrder = rows
        .filter(r => sameCategory(r.dataset.category, category))
        .map(r => r.dataset.id);

    let itemOrder = JSON.parse(localStorage.getItem('pos_item_order') || '{}');
    itemOrder[category] = newOrder;
    localStorage.setItem('pos_item_order', JSON.stringify(itemOrder));

    const searchInput = document.getElementById('search-inventory');
    renderTable(searchInput ? searchInput.value : '');
}

// Move Item Ordering
function moveItem(itemId, category, direction) {
    let itemOrder = JSON.parse(localStorage.getItem('pos_item_order') || '{}');

    // If we haven't ordered this category yet, initialize it with current sorted array state
    if (!itemOrder[category]) {
        const catItems = inventory.filter(i => sameCategory(i.category, category));
        itemOrder[category] = catItems.map(i => i.id);
    }

    const catList = itemOrder[category];
    const currentIndex = catList.indexOf(itemId);

    if (currentIndex === -1) {
        // Fallback: item was added recently and isn't in order list
        itemOrder[category].push(itemId);
        // Retry
        moveItem(itemId, category, direction);
        return;
    }

    const targetIndex = currentIndex + direction;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= catList.length) return;

    // Swap
    const temp = catList[currentIndex];
    catList[currentIndex] = catList[targetIndex];
    catList[targetIndex] = temp;

    localStorage.setItem('pos_item_order', JSON.stringify(itemOrder));

    const searchInput = document.getElementById('search-inventory');
    renderTable(searchInput ? searchInput.value : '');
}

// Modal Logic
const modal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');

function openModal(item = null) {
    if (item && item.id) {
        window.location.href = `add-product.html?id=${encodeURIComponent(item.id)}`;
    } else {
        window.location.href = 'add-product.html';
    }
}

function populateCategoryDropdown() {
    const select = document.getElementById('itemCategory');
    if (!select) return;

    const activeDefaultCats = getDefaultCategories();

    let customCats = uniqueCategories(JSON.parse(localStorage.getItem(STORAGE_CATEGORIES_KEY) || '[]'));

    // Clear and re-populate
    select.innerHTML = '';

    // Combine and deduplicate
    const allCats = uniqueCategories([...activeDefaultCats, ...customCats]);

    allCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function closeModal() {
    modal.classList.remove('active');
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const stock = parseFloat(document.getElementById('itemStock').value);
    const id = document.getElementById('itemId').value;

    if (!name || isNaN(price) || isNaN(stock)) {
        alert('Please fill all required fields correctly.');
        return;
    }

    // Read optional / new fields safely
    const costEl = document.getElementById('itemCost');
    const costPrice = costEl && costEl.value ? parseFloat(costEl.value) : 0;

    const skuEl = document.getElementById('itemSku');
    const sku = skuEl ? skuEl.value.trim() : '';

    const barcode = document.getElementById('itemBarcode').value.trim();

    const brandEl = document.getElementById('itemBrand');
    const brand = brandEl ? brandEl.value.trim() : '';

    const hsEl = document.getElementById('itemHsCode');
    const hsCode = hsEl ? hsEl.value.trim() : '';

    const unitEl = document.getElementById('itemUnit');
    const unit = unitEl ? unitEl.value : '';

    const descEl = document.getElementById('itemDescription');
    const description = descEl ? descEl.value.trim() : '';

    let vatRate = 13;
    const vatTypeEl = document.getElementById('itemVatType');
    if (vatTypeEl) {
        const vatType = vatTypeEl.value;
        if (vatType === 'none' || vatType === '0') {
            vatRate = 0;
        } else if (vatType === '13') {
            vatRate = 13;
        } else if (vatType === 'manual') {
            const customVal = parseFloat(document.getElementById('itemVatCustom')?.value);
            vatRate = isNaN(customVal) ? 0 : customVal;
        }
    } else {
        const vatChecked = document.querySelector('#itemForm input[name="itemVat"]:checked');
        vatRate = (vatChecked && vatChecked.value === '0') ? 0 : 13;
    }

    const lowEl = document.getElementById('itemLowStock');
    const lowStockAlert = lowEl && lowEl.value ? parseInt(lowEl.value) : 5;

    const supEl = document.getElementById('itemSupplier');
    const supplier = supEl ? supEl.value.trim() : '';

    const expEl = document.getElementById('itemExpiry');
    const expiry = expEl ? expEl.value : '';

    const expNoteEl = document.getElementById('itemExpiryNote');
    const expiryNote = expNoteEl ? expNoteEl.value.trim() : '';

    const item = {
        id: id || Date.now().toString(),
        name,
        category,
        sku,
        barcode: barcode || sku,  // keep barcode compat for existing code
        brand,
        hsCode,
        unit,
        description,
        costPrice,
        price,
        vatRate,
        stock,
        lowStockAlert,
        supplier,
        expiry,
        expiryNote,
        barcodeWeight: document.getElementById('itemBarcodeWeight')?.value.trim() || '',
        barcodeMfg: document.getElementById('itemBarcodeMfg')?.value.trim() || '',
        barcodeBatchNo: document.getElementById('itemBatchNo')?.value.trim() || '',
        barcodeNote: expiryNote
    };

    const index = inventory.findIndex(i => i.id === item.id);
    let actionName = 'Added Product';

    if (index > -1) {
        const oldItem = inventory[index];
        const changes = [];

        if ((oldItem.costPrice || 0) !== item.costPrice) changes.push(`Cost: Rs${oldItem.costPrice || 0} → Rs${item.costPrice}`);
        if (oldItem.price !== item.price) changes.push(`Price: Rs${oldItem.price} → Rs${item.price}`);
        if (oldItem.stock !== item.stock) changes.push(`Stock: ${oldItem.stock} → ${item.stock}`);
        if (oldItem.name !== item.name) changes.push(`Name: ${oldItem.name} → ${item.name}`);
        if (oldItem.category !== item.category) changes.push(`Cat: ${oldItem.category} → ${item.category}`);
        if ((oldItem.barcode || '') !== item.barcode) changes.push(`Barcode: ${oldItem.barcode || '-'} → ${item.barcode}`);
        if ((oldItem.unit || '') !== item.unit) changes.push(`Unit: ${oldItem.unit || '-'} → ${item.unit}`);

        actionName = changes.length > 0 ? `Updated Product [${changes.join(' | ')}]` : 'Updated Product';
        // Keep barcode-label settings when a product is edited from the list, while
        // making the saved label data follow the newly saved product data.
        if (oldItem.barcodeLabelContent && typeof oldItem.barcodeLabelContent === 'object') {
            item.barcodeLabelContent = {
                ...oldItem.barcodeLabelContent,
                productName: name,
                price: String(price),
                weight: item.barcodeWeight || oldItem.barcodeLabelContent.weight || '',
                batchNo: item.barcodeBatchNo || oldItem.barcodeLabelContent.batchNo || '',
                mfg: item.barcodeMfg || oldItem.barcodeLabelContent.mfg || '',
                note: item.barcodeNote || oldItem.barcodeLabelContent.note || ''
            };
        }
        ['barcodeLabelLayout', 'barcodeLabelExtras', 'barcodeLabelShopName', 'barcodeWeightType'].forEach(key => {
            if (oldItem[key] !== undefined) item[key] = oldItem[key];
        });
        item.barcodeType = (item.barcode && /^\d{13}$/.test(item.barcode)) ? 'ean13' : (oldItem.barcodeType || 'code128');
        // Sync barcode_${id} record so barcode.html reads current data
        try {
            const barcodeRecord = JSON.parse(localStorage.getItem(`barcode_${item.id}`) || 'null');
            if (barcodeRecord && typeof barcodeRecord === 'object') {
                barcodeRecord.priceOnLabel = item.price;
                barcodeRecord.wtVolQty = item.barcodeWeight || barcodeRecord.wtVolQty || '';
                barcodeRecord.expiryDate = item.barcodeMfg || item.expiry || barcodeRecord.expiryDate || '';
                barcodeRecord.expiryNote = item.barcodeNote || item.expiryNote || barcodeRecord.expiryNote || '';
                if (barcodeRecord.labelContent && typeof barcodeRecord.labelContent === 'object') {
                    barcodeRecord.labelContent.productName = item.name;
                    barcodeRecord.labelContent.price = String(item.price);
                    barcodeRecord.labelContent.weight = item.barcodeWeight || barcodeRecord.labelContent.weight || '';
                    barcodeRecord.labelContent.batchNo = item.barcodeBatchNo || barcodeRecord.labelContent.batchNo || '';
                    barcodeRecord.labelContent.mfg = item.barcodeMfg || item.expiry || barcodeRecord.labelContent.mfg || '';
                    barcodeRecord.labelContent.note = item.barcodeNote || item.expiryNote || barcodeRecord.labelContent.note || '';
                }
                localStorage.setItem(`barcode_${item.id}`, JSON.stringify(barcodeRecord));
            }
        } catch (e) { }
        inventory[index] = item;
    } else {
        inventory.push(item);
    }

    // Audit log
    const logs = JSON.parse(localStorage.getItem('pos_audit_logs') || '[]');
    let cashierName = 'Admin User';
    try {
        const cNameEl = document.getElementById('cashierName');
        if (cNameEl) cashierName = cNameEl.textContent;
    } catch (e) { }
    logs.push({
        user: cashierName,
        action: actionName,
        module: 'Inventory',
        refId: `#P-${item.id.slice(-4)}`,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pos_audit_logs', JSON.stringify(logs));

    // Save only this specific item to the database (avoid bulk-writing all items)
    if (window.posAPI && window.posAPI.saveInventoryItem) {
        window.posAPI.saveInventoryItem(item)
            .then(() => localStorage.setItem('pos_inventory_sync', String(Date.now())))
            .catch(err => {
                console.warn('Failed to persist item to DB:', item.id, err);
            });
    }

    saveInventory();
    const searchInput = document.getElementById('search-inventory');
    renderTable(searchInput ? searchInput.value : '');
    closeModal();
    renderCategoryTabs();
}

// ── Margin calculator ──────────────────────────────────────
function calcInventoryMargin() {
    const cost = parseFloat(document.getElementById('itemCost')?.value) || 0;
    const selling = parseFloat(document.getElementById('itemPrice')?.value) || 0;
    const el = document.getElementById('itemMarginDisplay');
    if (!el) return;
    if (cost > 0 && selling > 0) {
        const pct = ((selling - cost) / cost * 100).toFixed(1);
        const profit = (selling - cost).toFixed(2);
        const color = selling >= cost ? '#10b981' : '#ef4444';
        const arrow = selling >= cost ? '▲' : '▼';
        el.innerHTML = `<span style="color:${color};font-weight:700;">${arrow} ${pct}%</span> <span style="color:var(--text-muted);font-size:0.8rem;">(Rs. ${profit})</span>`;
    } else {
        el.textContent = '—';
    }
}

// ── SKU auto-generator ─────────────────────────────────────
function generateInventorySKU() {
    const name = document.getElementById('itemName')?.value.trim() || '';
    const prefix = name ? name.replace(/\s+/g, '').substring(0, 4).toUpperCase() : 'PROD';
    const num = Math.floor(1000 + Math.random() * 9000);
    const skuEl = document.getElementById('itemSku');
    if (skuEl) skuEl.value = `${prefix}-${num}`;
}

function editItem(id, index = -1) {
    if (id != null) {
        sessionStorage.setItem('inventory_scroll_item_id', String(id));
    }
    sessionStorage.setItem('inventory_scroll_y', String(window.scrollY || window.pageYOffset || 0));
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        sessionStorage.setItem('inventory_scroll_table_y', String(tableWrapper.scrollTop || 0));
    }
    const params = new URLSearchParams();
    params.set('id', id == null ? '' : String(id));
    if (index >= 0) params.set('index', String(index));
    params.set('_', Date.now().toString());
    window.location.href = `add-product.html?${params.toString()}`;
}

// Custom Product Removal with Modal
function removeProduct(id) {
    const item = inventory.find(i => String(i.id) === String(id));
    if (!item) return;

    // Create custom modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'productDeleteChoiceModal';
    overlay.style.zIndex = '2000';

    overlay.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h3 style="color: var(--accent-danger);">Delete Product?</h3>
                <button class="btn btn-secondary" onclick="document.getElementById('productDeleteChoiceModal').remove()" style="padding: 0.4rem;">✕</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 2rem 1.5rem;">
                <p style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem; font-weight: 500;">
                    ${item.name}
                </p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem;">
                    Are you sure you want to remove this item from your inventory? This action cannot be undone.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="document.getElementById('productDeleteChoiceModal').remove()" style="flex: 1; justify-content: center; padding: 0.8rem;">
                        Unchange
                    </button>
                    <button class="btn btn-danger" id="confirmDeleteProd" style="flex: 1; justify-content: center; padding: 0.8rem; background: var(--accent-danger); color: var(--text-on-accent);">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirmDeleteProd').onclick = () => {
        const initialLength = inventory.length;
        inventory = inventory.filter(i => String(i.id) !== String(id));

        if (inventory.length < initialLength) {
            // Delete from database (targeted single-item delete)
            if (window.posAPI && window.posAPI.deleteInventoryItem) {
                window.posAPI.deleteInventoryItem(id).catch(err => {
                    console.warn('Failed to delete item from DB:', id, err);
                });
            }

            saveInventory();
            const searchInput = document.getElementById('search-inventory');
            renderTable(searchInput ? searchInput.value : '');
            renderCategoryTabs();

            // Record audit log
            const logs = JSON.parse(localStorage.getItem('pos_audit_logs') || '[]');
            let cashierName = 'Admin User';
            try {
                const cNameEl = document.getElementById('cashierName');
                if (cNameEl) cashierName = cNameEl.textContent;
            } catch (e) { }

            logs.push({
                user: cashierName,
                action: 'Deleted Product',
                module: 'Inventory',
                refId: `#P-${id.slice(-4)}`, // Use last 4 chars if it's a timestamp ID
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pos_audit_logs', JSON.stringify(logs));
        }

        overlay.remove();
    };
}

// Global exposure for HTML onclicks
// Category Bar Logic
function loadCustomCategories() {
    customCategories = readArray(STORAGE_CATEGORIES_KEY).filter(c => !OLD_DEFAULT_CATEGORIES.includes(c));
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCategories));
    loadCategoryOrder();
    renderCategoryTabs();
    renderCategoryManagerList();
}

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    const allCats = getOrderedCategories(true);

    // 4. Render
    container.innerHTML = '';

    allCats.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `category-tab ${sameCategory(currentCategory, cat) ? 'active' : ''}`;
        btn.dataset.category = cat;
        btn.onclick = () => filterByCategory(cat);

        // Drag Attributes
        if (cat !== 'All') {
            btn.draggable = true;
            btn.style.cursor = 'grab';
            btn.ondragstart = (e) => handleDragStart(e, index);
            btn.ondragover = (e) => handleDragOver(e);
            btn.ondragend = (e) => handleDragEnd(e);
            btn.ondrop = (e) => handleDrop(e, index);
        } else {
            btn.style.cursor = 'pointer';
            btn.ondrop = (e) => handleDrop(e, index);
            btn.ondragover = (e) => handleDragOver(e);
        }

        // Name
        const label = document.createElement('span');
        label.textContent = cat;
        btn.appendChild(label);

        // Count
        const count = cat === 'All' ? inventory.length : inventory.filter(i => sameCategory(i.category, cat)).length;
        const countSpan = document.createElement('span');
        countSpan.className = 'category-count';
        countSpan.textContent = count;
        btn.appendChild(countSpan);

        // Delete Button (For all except 'All')
        if (cat !== 'All') {
            const del = document.createElement('span');
            del.className = 'delete-cat-btn';
            del.innerHTML = '×';
            del.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteCategory(cat);
            };
            btn.appendChild(del);
        }

        container.appendChild(btn);
    });
}

// Drag and Drop Handlers
let draggedItemIndex = null;

function handleDragStart(e, index) {
    draggedItemIndex = index;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    }
    setTimeout(() => {
        if (e.target) e.target.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
}

function handleDragEnd(e) {
    if (e.target) e.target.classList.remove('dragging');
    draggedItemIndex = null;
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
    if (targetIndex === 0) return; // 'All' must stay at 0

    const allCats = getOrderedCategories(true);

    // Perform Swap
    const items = [...allCats];
    const draggedItem = items.splice(draggedItemIndex, 1)[0];
    items.splice(targetIndex, 0, draggedItem);

    // Update Global Order
    categoryOrder = items.filter(c => c !== 'All');
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder));

    renderCategoryTabs();
    renderCategoryManagerList();
}

function updateCategoryCounts() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        const cat = tab.dataset.category;
        if (!cat) return;

        let count = 0;
        if (cat === 'All') {
            count = inventory.length;
        } else {
            count = inventory.filter(i => sameCategory(i.category, cat)).length;
        }

        let countSpan = tab.querySelector('.category-count');
        if (countSpan) countSpan.textContent = count;
    });
}

function filterByCategory(category) {
    currentCategory = category;
    sessionStorage.setItem('pos_inventory_category', category);

    // Update active tab UI
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        if (sameCategory(tab.dataset.category, category)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const searchInput = document.getElementById('search-inventory');
    renderTable(searchInput ? searchInput.value : '');
}

// Sidebar Logic
function toggleSubmenu(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('active');
    }
}

function openCategoryManager() {
    window.location.href = 'category.html';
}

function closeCategoryManager() {
    if (catModal) catModal.classList.remove('active');
}

function renderCategoryManagerList() {
    const tbody = document.getElementById('categoryListBody');
    if (!tbody) return;

    const allCats = getOrderedCategories(false);

    tbody.innerHTML = '';

    allCats.forEach((cat, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';

        // Name Cell
        const tdName = document.createElement('td');
        tdName.style.padding = '0.75rem';
        const nameDiv = document.createElement('div');
        nameDiv.style.fontWeight = '500';
        nameDiv.textContent = cat;
        if (customCategories.some(c => sameCategory(c, cat))) {
            const badge = document.createElement('span');
            badge.textContent = 'Custom';
            badge.style.cssText = 'font-size: 0.7em; background: var(--bg-secondary); padding: 2px 5px; border-radius: 4px; margin-left: 8px; color: var(--text-muted);';
            nameDiv.appendChild(badge);
        }
        tdName.appendChild(nameDiv);

        // Actions Cell
        const tdActions = document.createElement('td');
        tdActions.style.cssText = 'padding: 0.75rem; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;';

        // Reorder Buttons
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '&uarr;';
        upBtn.className = 'btn btn-secondary';
        upBtn.style.padding = '2px 8px';
        upBtn.onclick = () => moveCategory(cat, -1);
        if (index === 0) upBtn.disabled = true;

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '&darr;';
        downBtn.className = 'btn btn-secondary';
        downBtn.style.padding = '2px 8px';
        downBtn.onclick = () => moveCategory(cat, 1);
        if (index === allCats.length - 1) downBtn.disabled = true;

        tdActions.appendChild(upBtn);
        tdActions.appendChild(downBtn);

        // Rename Button
        const btnRename = document.createElement('button');
        btnRename.className = 'btn btn-secondary';
        btnRename.style.cssText = 'padding: 0.2rem 0.6rem; font-size: 0.75rem; margin-left: 0.5rem;';
        btnRename.textContent = 'Rename';
        btnRename.onclick = () => renameCategory(cat);
        tdActions.appendChild(btnRename);

        // Delete Button (For all)
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-danger';
        btnDelete.style.cssText = 'padding: 0.2rem 0.6rem; font-size: 0.75rem; margin-left: 0.5rem;';
        btnDelete.textContent = 'Delete';
        btnDelete.onclick = () => deleteCategory(cat);
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdName);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
}

function renameCategory(oldName) {
    const newNameRaw = prompt('Enter new category name:', oldName);
    if (newNameRaw === null) return; // Cancelled

    const newName = newNameRaw.trim();
    if (!newName) {
        alert('Category name cannot be empty.');
        return;
    }
    if (sameCategory(newName, oldName)) return; // No change

    // Check if new name exists (only if strictly equal, case-insensitive check optional but safer to block duplicates)
    // We check against all visible categories
    const inventoryCats = uniqueCategories(inventory.map(i => i.category));
    const defaultCats = getDefaultCategories();
    let allCats = uniqueCategories([...defaultCats, ...inventoryCats, ...customCategories]);

    if (allCats.some(c => sameCategory(c, newName))) {
        alert('Category with this name already exists!');
        return;
    }

    // 1. Update Products
    let updatedCount = 0;
    inventory.forEach(item => {
        if (sameCategory(item.category, oldName)) {
            item.category = newName;
            updatedCount++;
        }
    });
    if (updatedCount > 0) saveInventory();

    // 2. Handle Persistence
    // If it's a Custom Category -> Rename it
    if (customCategories.some(c => sameCategory(c, oldName))) {
        customCategories = uniqueCategories(customCategories.map(c => sameCategory(c, oldName) ? newName : c));
        localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCategories));
    } else {
        // It's a Default Category (e.g. Grocery) -> Rename means "Delete Grocery, Add Food"
        if (defaultCats.some(c => sameCategory(c, oldName))) {
            // Mark default as deleted
            if (!deletedDefaults.some(c => sameCategory(c, oldName))) {
                deletedDefaults.push(oldName);
                localStorage.setItem(STORAGE_DELETED_DEFAULTS_KEY, JSON.stringify(deletedDefaults));
            }
            // Add new name as custom
            if (!customCategories.some(c => sameCategory(c, newName))) {
                customCategories.push(newName);
                customCategories = uniqueCategories(customCategories);
                localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCategories));
            }
        }
    }

    // 3. Update Order Reference
    if (categoryOrder.some(c => sameCategory(c, oldName))) {
        categoryOrder = uniqueCategories(categoryOrder.map(c => sameCategory(c, oldName) ? newName : c));
        localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder));
    }

    // 4. Refresh UI
    renderCategoryManagerList();
    renderCategoryTabs();

    // Update active view
    if (sameCategory(currentCategory, oldName)) {
        filterByCategory(newName);
    } else {
        const searchInput = document.getElementById('search-inventory');
        renderTable(searchInput ? searchInput.value : '');
    }
}

function moveCategory(catName, direction) {
    let allCats = getOrderedCategories(false);

    const currentIndex = allCats.indexOf(catName);
    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= allCats.length) return;

    // Swap in the local list
    const temp = allCats[currentIndex];
    allCats[currentIndex] = allCats[targetIndex];
    allCats[targetIndex] = temp;

    categoryOrder = allCats;
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder));

    // Refresh
    renderCategoryTabs();
    renderCategoryManagerList();
}

function openModalForCategory(categoryName) {
    window.location.href = `add-product.html?category=${encodeURIComponent(categoryName)}`;
}

function addCustomCategory() {
    const input = document.getElementById('catManagerInput');
    const name = input.value.trim();
    if (!name) return;

    let customCats = uniqueCategories(readArray(STORAGE_CATEGORIES_KEY));
    const defaultCategories = getDefaultCategories();

    if (customCats.some(c => sameCategory(c, name)) || defaultCategories.some(c => sameCategory(c, name))) {
        alert('Category already exists!');
        return;
    }

    customCats.push(name);
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCats));
    customCategories = customCats;
    categoryOrder = uniqueCategories([...categoryOrder.filter(c => customCategories.some(cat => sameCategory(cat, c)) || inventory.some(item => sameCategory(item.category, c)) || defaultCategories.some(cat => sameCategory(cat, c))), name]);
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder));
    input.value = '';
    renderCategoryManagerList();
    loadCustomCategories(); // Update the top bar
}



// Two-way delete logic
function deleteCategory(name) {
    if (!name) return;

    // Create a custom modal for the choice
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'categoryDeleteChoiceModal';
    overlay.style.zIndex = '2000'; // Make sure it's on top

    overlay.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h3 style="color: var(--accent-danger);">Delete Category: ${name}</h3>
                <button class="btn btn-secondary" onclick="document.getElementById('categoryDeleteChoiceModal').remove()" style="padding: 0.4rem;">✕</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 2rem 1.5rem;">
                <p style="margin-bottom: 2rem; color: var(--text-primary); line-height: 1.5;">
                    How would you like to handle the products in this category?
                </p>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <button class="btn btn-secondary" id="deleteOnlyCat" style="padding: 1rem; width: 100%; border: 1px solid var(--accent-primary); color: var(--accent-primary); justify-content: center;">
                        <strong>Option 1: Delete Category Only</strong><br>
                        <small style="opacity: 0.8;">Move all products to "Other" category</small>
                    </button>
                    
                    <button class="btn btn-danger" id="deleteAll" style="padding: 1rem; width: 100%; justify-content: center; background: rgba(239, 68, 68, 0.2);">
                        <strong>Option 2: Delete Everything</strong><br>
                        <small style="opacity: 0.8;">Delete category and all its products</small>
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('categoryDeleteChoiceModal').remove()">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Add listeners to buttons
    document.getElementById('deleteOnlyCat').onclick = () => {
        executeCategoryDeletion(name, 'move');
        overlay.remove();
    };

    document.getElementById('deleteAll').onclick = () => {
        executeCategoryDeletion(name, 'delete');
        overlay.remove();
    };
}

function executeCategoryDeletion(name, mode) {
    try {
        const trimmedName = name.trim().toLowerCase();

        // 1. Update Custom Categories List
        let customCats = JSON.parse(localStorage.getItem(STORAGE_CATEGORIES_KEY) || '[]');
        if (customCats.map(c => c.trim().toLowerCase()).includes(trimmedName)) {
            customCats = customCats.filter(c => c.trim().toLowerCase() !== trimmedName);
            localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCats));
        }

        // 2. Handle Default Categories (Add to deleted list)
        const defaultCats = getDefaultCategories();
        if (defaultCats.some(c => categoryKey(c) === trimmedName)) {
            let deletedDefaults = JSON.parse(localStorage.getItem(STORAGE_DELETED_DEFAULTS_KEY) || '[]');
            // Find the exact original name from the default list to store
            const originalName = defaultCats.find(c => categoryKey(c) === trimmedName);
            if (originalName && !deletedDefaults.some(c => sameCategory(c, originalName))) {
                deletedDefaults.push(originalName);
                localStorage.setItem(STORAGE_DELETED_DEFAULTS_KEY, JSON.stringify(deletedDefaults));
            }
        }

        // 3. Handle Products
        if (mode === 'move') {
            // Move products to 'Other'
            inventory = inventory.map(item => {
                if (categoryKey(item.category) === trimmedName) {
                    return { ...item, category: 'Other' };
                }
                return item;
            });
        } else {
            // Delete products
            inventory = inventory.filter(item => {
                return (item.category || '').trim().toLowerCase() !== trimmedName;
            });
        }

        // Save changes (Product changes)
        saveInventory();

        // 3. Update active view if needed
        if (categoryKey(currentCategory) === trimmedName) {
            currentCategory = 'All';
        }

        // 4. Refresh everything
        loadCustomCategories();
        const searchInput = document.getElementById('search-inventory');
        renderTable(searchInput ? searchInput.value : '');
        renderCategoryManagerList();

        console.log(`Category "${name}" handled in mode: ${mode}`);

    } catch (error) {
        console.error('Delete error:', error);
        alert('An error occurred while deleting the category.');
    }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.saveItem = saveItem;
window.editItem = editItem;
window.removeProduct = removeProduct;
window.toggleSubmenu = toggleSubmenu;
window.openCategoryManager = openCategoryManager;
window.closeCategoryManager = closeCategoryManager;
window.addCustomCategory = addCustomCategory;
window.deleteCategory = deleteCategory;
window.deleteCustomCategory = deleteCategory; // Alias for backward compatibility if any
window.openModalForCategory = openModalForCategory;
window.filterByCategory = filterByCategory;
window.moveCategory = moveCategory;
window.renameCategory = renameCategory;

// Sync with other tabs
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_CATEGORIES_KEY || e.key === 'pos_inventory_sync' || (e.key && e.key.startsWith('barcode_'))) {
        loadInventory();
        loadCustomCategories();
        const searchInput = document.getElementById('search-inventory');
        renderTable(searchInput ? searchInput.value : '');
    }
});

init();

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
        + '<button type="button" class="btn btn-secondary" onclick="document.getElementById(\'tierBreakdownPopup\').remove()" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">✕</button>'
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
        + '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'tierBreakdownPopup\').remove()" style="font-size: 0.8rem; padding: 0.35rem 0.85rem;">Close</button>'
        + '</div></div>';

    document.body.appendChild(modal);
}
window.showTierPopup = showTierPopup;
