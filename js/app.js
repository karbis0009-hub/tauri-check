
function applyBusinessTypeBilling() {
    const isPanOnly = storeSettings.businessType === 'pan_only';
    const vatCheckbox = document.getElementById('generateVatInvoice');
    if (vatCheckbox) {
        const container = vatCheckbox.closest('div');
        if (container) container.style.display = isPanOnly ? 'none' : 'flex';
        if (isPanOnly) vatCheckbox.checked = false;
    }
}

// POS Billing Controller

const STORAGE_ITEMS_KEY = 'pos_items';
const STORAGE_SETTINGS_KEY = 'pos_settings';
const STORAGE_SALES_KEY = 'pos_sales';
const STORAGE_CATEGORIES_KEY = 'pos_custom_categories';
const STORAGE_CART_STATE_KEY = 'pos_cart_state';
function getCartStorageKey() {
    const curBizId = (window.BusinessManager && typeof window.BusinessManager.getActiveBusinessId === 'function') ? window.BusinessManager.getActiveBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1');
    return `${STORAGE_CART_STATE_KEY}_${curBizId}`;
}
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
// Seed with default products matching inventory.js
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

// Canonical default category order — must match inventory.js defaultItems category sequence
const DEFAULT_CATEGORY_ORDER = ['Oil', 'Dal', 'Simi', 'Pitho/Chyakhla', 'Species', 'Seeds', 'Chamal', 'Pina', 'Chiura', 'Chiya Pati', 'Seasonal'];

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

function itemKey(item) {
    return `${String(item && item.name || '').trim().toLowerCase()}|${categoryKey(item && item.category)}|${String(item && item.unit || '').trim().toLowerCase()}|${Number(item && item.price || 0)}`;
}

function isOldDefaultItem(item, stableDefaultKeys = new Set()) {
    const itemName = String(item && item.name || '').trim().toLowerCase();
    const itemId = String(item && item.id || '').toLowerCase();
    if (itemName.startsWith('test ') || itemName === 'test product' || itemId.startsWith('test-') || itemId.includes('test')) {
        return true;
    }
    return OLD_DEFAULT_ITEM_NAMES.some(name => String(name).trim().toLowerCase() === itemName) ||
        OLD_DEFAULT_CATEGORIES.includes(item && item.category) ||
        OLD_DEFAULT_ITEM_CATEGORY_PAIRS.some(([name, category]) => itemName === String(name).trim().toLowerCase() && sameCategory(item.category, category));
}

// Global State
let inventory = [];
let carts = [{ id: 1, name: 'Cart 1', items: [], customerName: '', customerAddress: '', customerPhone: '', paymentMode: '', isBulkMode: false }];
let currentCartId = 1;
let cart = carts[0].items; // Points to the active cart's items
let storeSettings = {};
let customCategories = [];
let categoryOrder = []; // Stores the preferred order of categories
let productOrder = []; // Stores the preferred order of products
let pendingCartDeleteId = null; // Tracks which cart is about to be deleted
let lastAddedIndex = null;     // Tracks the last added/updated cart item index for scroll-to
let currentConfirmSaleData = null;
let currentConfirmSubtotal = 0;
let currentConfirmDiscountMode = 'amount';
let pendingConfirmDiscountValue = '';
let pendingConfirmDiscountMode = 'amount';
let pendingConfirmDiscountSubtotal = 0;

// Utility: Smart Number Format
const fmt = (n) => {
    if (n === undefined || n === null) return "0.00";
    const val = parseFloat(n);
    if (isNaN(val)) return "0.00";
    return val.toFixed(2);
};

// DOM Elements
const els = {
    productsGrid: document.getElementById('productsGrid'),
    cartItems: document.getElementById('cartItems'),
    search: document.getElementById('productSearch'),
    searchResults: document.getElementById('searchResults'),
    searchClear: document.getElementById('clearProductSearch'),
    subTotal: document.getElementById('subTotal'),
    grandTotal: document.getElementById('grandTotal'),
    customerName: document.getElementById('customerName'),
    customerAddress: document.getElementById('customerAddress'),
    customerPhone: document.getElementById('customerPhone'),
    paymentMode: document.getElementById('paymentMode'),
    // Print Elements
    pStoreName: document.getElementById('p-storeName'),
    pAddress: document.getElementById('p-address'),
    pBillNo: document.getElementById('p-billNo'),
    pDate: document.getElementById('p-date-ad'),
    pCustomer: document.getElementById('p-customer'),
    pCustomerAddress: document.getElementById('p-customerAddress'),
    pCustomerPhone: document.getElementById('p-customerPhone'),
    pItems: document.getElementById('p-items'),
    pTotal: document.getElementById('p-total'),
    pPayMode: document.getElementById('p-payMode'),
    pFooter: document.getElementById('p-footer'),
    pVatNo: document.getElementById('p-vatNo'),
    pPhone: document.getElementById('p-phone'),
    pTaxableAmt: document.getElementById('p-taxableAmt'),
    pVatAmt: document.getElementById('p-vatAmt'),
    pTotalWords: document.getElementById('p-totalWords'),
    pDateBs: document.getElementById('p-date-bs'),
    printableArea: document.getElementById('printableArea'),
    btnClear: document.getElementById('btnClear')
};

// --- IRD Compliance Helpers ---

// 1. Number to Words (Simplified)
function numberToWords(num) {
    // Match the two-decimal currency total shown on the receipt before spelling it out.
    const normalizedAmount = Math.max(0, Math.round((Number(num) || 0) * 100) / 100);
    if (normalizedAmount === 0) return 'Zero only.';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10].trim() : ' ');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        if (n < 1000000000) return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
        return '';
    }

    const whole = Math.floor(normalizedAmount);
    const fraction = Math.round((normalizedAmount - whole) * 100);
    const wordsText = inWords(whole).trim().replace(/\s+/g, ' ');
    let str = wordsText + ' Rupees ';
    if (fraction > 0) {
        str += 'and ' + inWords(fraction).trim() + ' Paisa ';
    }
    return str + 'only.';
}

function getNepaliDate(date) {
    if (typeof window.convertToBS === 'function') {
        return window.convertToBS(date);
    }
    return "";
}

let currentCategory = 'All';

function applyReceiptSettings() {
    const snLab = storeSettings.snLabel || 'S.N.';
    const partLab = storeSettings.particularsLabel || 'Particulars';
    const qtyLab = storeSettings.qtyLabel || 'Qty';
    const rateLab = storeSettings.rateLabel || 'Rate';
    const amtLab = storeSettings.amtLabel || 'Amt';

    if (document.getElementById('p-snLabel')) document.getElementById('p-snLabel').textContent = snLab;
    if (document.getElementById('p-particularsLabel')) document.getElementById('p-particularsLabel').textContent = partLab;
    if (document.getElementById('p-qtyLabel')) document.getElementById('p-qtyLabel').textContent = qtyLab;
    if (document.getElementById('p-rateLabel')) document.getElementById('p-rateLabel').textContent = rateLab;
    if (document.getElementById('p-amtLabel')) document.getElementById('p-amtLabel').textContent = amtLab;
    if (document.getElementById('p-totalWords-label')) document.getElementById('p-totalWords-label').textContent = (storeSettings.wordsLabel || 'In Words') + ': ';
    applyReceiptPaperTextSize();
}

function applyReceiptPaperTextSize(isVatInvoice) {
    const paperWidth = Math.max(40, parseFloat(storeSettings.paperWidth) || 58);
    const storeNameText = String(storeSettings.storeName || 'K Pos').trim();
    const storeNameFitSize = ((paperWidth - 6) * 3.78) / (Math.max(storeNameText.length, 1) * 0.78);
    const readReceiptSize = (key, fallback) => {
        const value = parseFloat(storeSettings[key]);
        return Number.isFinite(value) ? value : fallback;
    };
    const autoHeaderSize = Math.min(46, paperWidth * 0.52, storeNameFitSize);
    const headerSize = Math.max(4, Math.min(storeNameFitSize, readReceiptSize('storeNameFontSize', autoHeaderSize)));
    const autoHeaderInfoSize = Math.max(8.5, Math.min(16, paperWidth * 0.18));
    const addressSize = Math.max(7, Math.min(24, readReceiptSize('addressFontSize', autoHeaderInfoSize)));
    const phoneSize = Math.max(7, Math.min(24, readReceiptSize('phoneFontSize', autoHeaderInfoSize)));
    const vatSize = Math.max(7, Math.min(24, readReceiptSize('vatFontSize', autoHeaderInfoSize)));
    const headerInfoSize = autoHeaderInfoSize;
    const autoBillTitleSize = Math.max(10, Math.min(18, paperWidth * 0.21));
    const billTitleSize = isVatInvoice
        ? Math.max(7, Math.min(24, readReceiptSize('taxInvoiceFontSize', autoBillTitleSize)))
        : Math.max(7, Math.min(24, readReceiptSize('abbreviatedTaxInvoiceFontSize', autoBillTitleSize)));
    const metaSize = Math.max(8, Math.min(13.5, paperWidth * 0.165));
    const thSize = Math.max(7.5, Math.min(12.5, paperWidth * 0.15));
    const tdSize = Math.max(7.5, Math.min(12.5, paperWidth * 0.15));
    const wordsSize = Math.max(7, Math.min(24, readReceiptSize('wordsFontSize', Math.max(7, Math.min(12, paperWidth * 0.14)))));
    const footerSize = Math.max(7, Math.min(24, readReceiptSize('footerFontSize', Math.max(7, Math.min(12, paperWidth * 0.14)))));

    const partLabText = String(storeSettings.particularsLabel || 'Particulars').trim();
    const partFitSize = ((paperWidth * 0.37 - 1) * 3.78) / (Math.max(partLabText.length, 1) * 0.62);
    const finalThSize = Math.max(7, Math.min(thSize, partFitSize));
    const headerSizes = {
        'p-snLabel': Math.max(7, Math.min(24, readReceiptSize('snFontSize', finalThSize))),
        'p-particularsLabel': Math.max(7, Math.min(24, readReceiptSize('particularsFontSize', finalThSize))),
        'p-qtyLabel': Math.max(7, Math.min(24, readReceiptSize('qtyFontSize', finalThSize))),
        'p-rateLabel': Math.max(7, Math.min(24, readReceiptSize('rateFontSize', finalThSize))),
        'p-amtLabel': Math.max(7, Math.min(24, readReceiptSize('amtFontSize', finalThSize)))
    };

    const printableDiv = els.printableArea ? els.printableArea.querySelector('div') : null;
    if (printableDiv) {
        printableDiv.style.setProperty('--receipt-header-font-size', `${headerSize}px`);
        printableDiv.style.setProperty('--receipt-header-info-font-size', `${headerInfoSize}px`);
        printableDiv.style.setProperty('--receipt-bill-title-font-size', `${billTitleSize}px`);
        printableDiv.style.setProperty('--receipt-meta-font-size', `${metaSize}px`);
        printableDiv.style.setProperty('--receipt-th-font-size', `${finalThSize}px`);
        printableDiv.style.setProperty('--receipt-td-font-size', `${tdSize}px`);
        printableDiv.style.setProperty('--receipt-words-font-size', `${wordsSize}px`);
        const billTitleEl = document.getElementById('p-bill-title');
        if (billTitleEl) {
            billTitleEl.style.fontSize = `${billTitleSize}px`;
            billTitleEl.style.letterSpacing = '0.5px';
            billTitleEl.style.wordSpacing = '2px';
            billTitleEl.style.fontFamily = 'Arial, Helvetica, sans-serif';
        }
    }

    const setSize = (id, size) => {
        const el = document.getElementById(id);
        if (el) el.style.setProperty('font-size', `${size}px`, 'important');
    };
    const setReceiptWrap = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.setProperty('word-break', 'normal', 'important');
        el.style.setProperty('overflow-wrap', 'break-word', 'important');
        el.style.setProperty('white-space', 'normal', 'important');
        el.style.setProperty('max-width', '100%', 'important');
    };
    setSize('p-storeName', headerSize);
    const storeNameEl = document.getElementById('p-storeName');
    if (storeNameEl) {
        storeNameEl.style.setProperty('white-space', 'nowrap', 'important');
        storeNameEl.style.setProperty('word-break', 'normal', 'important');
        storeNameEl.style.setProperty('overflow-wrap', 'normal', 'important');
        storeNameEl.style.setProperty('max-width', '100%', 'important');
        storeNameEl.style.setProperty('overflow', 'hidden', 'important');
        storeNameEl.style.setProperty('text-overflow', 'clip', 'important');
    }
    setSize('p-address', addressSize);
    setSize('p-vat-row', vatSize);
    setSize('p-phone-row', phoneSize);
    setReceiptWrap('p-address');
    setReceiptWrap('p-vat-row');
    setReceiptWrap('p-phone-row');

    // Metadata Table Size
    const metaTable = document.getElementById('p-metaTable');
    if (metaTable) {
        metaTable.style.setProperty('font-size', `${metaSize}px`, 'important');
        metaTable.querySelectorAll('td, span').forEach(el => {
            el.style.setProperty('font-size', `${metaSize}px`, 'important');
        });
    }

    // Table Header Labels
    ['p-snLabel', 'p-particularsLabel', 'p-qtyLabel', 'p-rateLabel', 'p-amtLabel'].forEach(id => {
        setSize(id, headerSizes[id]);
        const el = document.getElementById(id);
        if (el) {
            el.style.setProperty('white-space', 'nowrap', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('text-overflow', 'clip', 'important');
        }
    });

    // Items and Totals Tables
    const itemsTable = document.getElementById('p-itemsTable');
    if (itemsTable) {
        itemsTable.style.setProperty('font-size', `${tdSize}px`, 'important');
        itemsTable.querySelectorAll('td, span').forEach(el => {
            el.style.setProperty('font-size', `${tdSize}px`, 'important');
        });
    }
    const totalsTable = document.getElementById('p-totalsTable');
    if (totalsTable) {
        totalsTable.style.setProperty('font-size', `${tdSize}px`, 'important');
        totalsTable.querySelectorAll('td, span').forEach(el => {
            el.style.setProperty('font-size', `${tdSize}px`, 'important');
        });
    }

    setSize('p-totalWords-row', wordsSize);
    setSize('p-totalWords-label', wordsSize);
    setSize('p-totalWords', wordsSize);
    const wordsLabel = document.getElementById('p-totalWords-label');
    const wordsText = document.getElementById('p-totalWords');
    if (wordsLabel) wordsLabel.style.setProperty('line-height', '1.15', 'important');
    if (wordsText) wordsText.style.setProperty('line-height', '1.15', 'important');
    const wordsRow = document.getElementById('p-totalWords-row');
    if (wordsRow) {
        wordsRow.style.setProperty('font-size', `${wordsSize}px`, 'important');
        wordsRow.style.setProperty('line-height', '1.15', 'important');
        wordsRow.style.setProperty('margin', '1px 0', 'important');
        wordsRow.style.setProperty('padding', '1px 0', 'important');
    }
    setSize('p-footer', footerSize);
    setReceiptWrap('p-footer');

    const billTitle = document.getElementById('p-bill-title');
    if (billTitle) billTitle.style.setProperty('font-size', `${billTitleSize}px`, 'important');
}

function calculateChange() {
    const total = currentConfirmSaleData
        ? (currentConfirmSaleData.total || 0)
        : cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tenderedInput = document.getElementById('cashTendered');
    const tendered = parseFloat(tenderedInput?.value) || 0;
    const change = tendered - total;
    const changeEl = document.getElementById('conf-change');
    const finalizeBtn = document.getElementById('btnFinalizePrint');

    if (changeEl) {
        changeEl.textContent = `Rs. ${fmt(Math.max(0, change))}`;
        changeEl.style.color = change < 0 ? '#EF4444' : 'var(--accent-primary)';
    }

    const pTendered = document.getElementById('p-tendered');
    const pChange = document.getElementById('p-change');
    if (pTendered) pTendered.textContent = fmt(tendered);
    if (pChange) pChange.textContent = fmt(Math.max(0, change));

    // Restrict Save & Print button
    if (finalizeBtn && tenderedInput) {
        const isInsufficient = (tendered < total) || (tenderedInput.value.trim() === '');
        if (isInsufficient) {
            finalizeBtn.disabled = true;
            finalizeBtn.style.opacity = '0.5';
            finalizeBtn.style.cursor = 'not-allowed';
            finalizeBtn.title = tendered < total ? 'Tendered amount must be greater than total' : 'Please enter tender amount';
        } else {
            finalizeBtn.disabled = false;
            finalizeBtn.style.opacity = '1';
            finalizeBtn.style.cursor = 'pointer';
            finalizeBtn.title = '';
        }
    }
}

function fillFullPayment() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tenderedInput = document.getElementById('cashTendered');
    if (tenderedInput) {
        tenderedInput.value = total.toFixed(2);
        calculateChange();
    }
}

function init() {
    migrateLocalSales();
    loadData();
    loadCustomCategories();

    // Migration for AR Status (Offline)
    migrateARStatus();

    // Initial load of cart state
    loadCartState();

    // Load Product Order
    try {
        const savedProdOrder = localStorage.getItem('pos_product_order');
        if (savedProdOrder) productOrder = JSON.parse(savedProdOrder);
    } catch (e) {
        console.error("Failed to load product order", e);
    }

    // Restore Category State
    const savedCat = sessionStorage.getItem('pos_billing_category');
    if (savedCat) {
        currentCategory = savedCat;
    }

    // Initial render
    renderCategoryTabs();
    renderProducts();
    updateCategoryCounts();
    renderCart();
    renderCartTabs();

    initCustomerInfo();
    updateCustomerDisplay();

    // Focus search on load (Removed as per user request)
    // if (els.search) els.search.focus();

    // Listeners
    if (els.btnClear) {
        els.btnClear.addEventListener('click', clearCart);
    }
    if (els.search) {
        els.search.addEventListener('input', handleSearch);
        els.search.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = els.search.value.trim();
                if (query) tryAddByBarcode(query);
            }
        });
    }
    if (els.searchClear) {
        els.searchClear.addEventListener('click', clearSearch);
    }

    // --- QR Long Press Detection ---
    const qrBtn = document.getElementById('payQRBtn');
    if (qrBtn) {
        let pressTimer;
        const startPress = (e) => {
            if (e.type === 'touchstart' || e.button === 0) {
                pressTimer = window.setTimeout(() => {
                    openQRPopup();
                }, 600); // 600ms for long press
            }
        };
        const cancelPress = () => {
            clearTimeout(pressTimer);
        };
        qrBtn.addEventListener('mousedown', startPress);
        qrBtn.addEventListener('touchstart', startPress, { passive: true });
        qrBtn.addEventListener('mouseup', cancelPress);
        qrBtn.addEventListener('mouseleave', cancelPress);
        qrBtn.addEventListener('touchend', cancelPress);
        qrBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openQRPopup();
        });
    }

    // Refresh data when window focused
    window.addEventListener('focus', () => {
        loadData();
        renderProducts();
    });

    // Horizontal scroll support for hidden bars
    const hScroll = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY;
                }
            });
        }
    };
    hScroll('categoryTabs');
    hScroll('cartTabs');
}

function migrateLocalSales() {
    if (localStorage.getItem('pos_migration_resequence_v1')) return;

    const salesStr = localStorage.getItem('pos_sales');
    if (!salesStr) {
        localStorage.setItem('pos_migration_resequence_v1', 'true');
        return;
    }

    try {
        const sales = JSON.parse(salesStr);
        if (sales.length === 0) {
            localStorage.setItem('pos_migration_resequence_v1', 'true');
            return;
        }

        // Sort by timestamp
        sales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Update bill numbers
        sales.forEach((s, i) => {
            s.billNo = `${i + 1}-082/83`;
        });

        localStorage.setItem('pos_sales', JSON.stringify(sales));
        localStorage.setItem('pos_migration_resequence_v1', 'true');
        console.log('Local sales history re-sequenced');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

function migrateARStatus() {
    if (localStorage.getItem('pos_migration_ar_status_v3')) return;

    const salesStr = localStorage.getItem('pos_sales');
    if (!salesStr) {
        localStorage.setItem('pos_migration_ar_status_v3', 'true');
        return;
    }

    try {
        const sales = JSON.parse(salesStr);
        const accounts = JSON.parse(localStorage.getItem('pos_ar_accounts') || '[]');

        let changed = false;

        // Group credit sales by customer
        const customerCreditSales = {};
        sales.forEach(s => {
            if (s.paymentMode === 'CREDIT') {
                if (!customerCreditSales[s.customer]) customerCreditSales[s.customer] = [];
                customerCreditSales[s.customer].push(s);
            } else if (!s.status) {
                s.status = 'PAID';
                changed = true;
            }
        });

        // Settle each customer
        Object.keys(customerCreditSales).forEach(name => {
            let acc = accounts.find(a => a.customerName === name);

            // Clean up Negative Balance (Overpayment)
            if (acc && acc.totalBalance < 0) {
                const overpaidAmount = Math.abs(acc.totalBalance);
                acc.totalBalance = 0;

                // Also remove the latest payment transaction that caused this in localStorage
                const trans = JSON.parse(localStorage.getItem('pos_ar_transactions') || '[]');
                let removed = 0;
                // Work backwards through transactions
                for (let i = trans.length - 1; i >= 0; i--) {
                    if (trans[i].customerName === name && trans[i].type === 'PAYMENT') {
                        removed += trans[i].amount;
                        trans.splice(i, 1);
                        changed = true;
                        if (removed >= overpaidAmount) break;
                    }
                }
                localStorage.setItem('pos_ar_transactions', JSON.stringify(trans));
                localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
            }

            let debt = acc ? acc.totalBalance : 0;

            // Sort customer sales newest first
            const cSales = customerCreditSales[name].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            cSales.forEach(s => {
                const status = debt > 0.01 ? 'UNPAID' : 'PAID';
                if (s.status !== status) {
                    s.status = status;
                    changed = true;
                }
                debt -= s.total;
            });
        });

        if (changed) {
            localStorage.setItem('pos_sales', JSON.stringify(sales));
        }
        localStorage.setItem('pos_migration_ar_status_v3', 'true');
    } catch (e) {
        console.error('AR Migration failed:', e);
    }
}

function syncDefaultProducts(items) {
    let list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
        return defaultItems.map((item, index) => ({
            ...item,
            id: `default-${index + 1}`,
            stock: 999
        }));
    }
    return list.filter(item => !isOldDefaultItem(item)).map(item => {
        let price = item.price;
        if (price == null || price === '' || isNaN(parseFloat(price))) {
            const defItem = defaultItems.find(d => d.name === item.name && sameCategory(d.category, item.category));
            if (defItem && defItem.price != null) {
                price = defItem.price;
            }
        }
        return {
            ...item,
            price: price != null ? price : (item.price || 0)
        };
    });
}

function loadData() {
    // Check for auto-switch instruction from sales history
    const autoSwitchId = localStorage.getItem('pos_auto_switch_cart');
    if (autoSwitchId) {
        localStorage.removeItem('pos_auto_switch_cart');
        try {
            const raw = localStorage.getItem(getCartStorageKey()) || localStorage.getItem(STORAGE_CART_STATE_KEY);
            if (raw) {
                const state = JSON.parse(raw);
                const savedCarts = state.carts || [];
                if (savedCarts.find(c => c.id == autoSwitchId)) {
                    currentCartId = parseInt(autoSwitchId);
                }
            }
        } catch (e) {
            console.error('Error auto-switching cart:', e);
        }
    }

    // Load data from API with fallback
    window.posAPI.getAllInventory()
        .then(data => {
            const rawInventory = Array.isArray(data) ? data : [];
            inventory = syncDefaultProducts(rawInventory);
            const searchEl = document.getElementById('productSearch');
            renderProducts(searchEl ? searchEl.value : '');
            updateCategoryCounts();
            renderCategoryTabs(); // Fix: Update tabs once inventory is loaded
            checkStockAlerts(); // Check stock alerts after inventory is loaded
        })
        .catch(err => {
            console.warn('API unavailable in loadData, falling back to localStorage/defaults:', err);
            try {
                const raw = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]');
                inventory = syncDefaultProducts(raw);
            } catch (e) {
                inventory = syncDefaultProducts([]);
            }
            const searchEl = document.getElementById('productSearch');
            renderProducts(searchEl ? searchEl.value : '');
            updateCategoryCounts();
            renderCategoryTabs();
            checkStockAlerts();
        });

    const updateStoreSettingsFromActiveBusiness = (baseSettings = {}) => {
        const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
        let localSettings = {};
        try {
            localSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
        } catch (e) {}
        let merged = Object.assign({}, baseSettings || {}, localSettings);
        if (curBiz) {
            const isPan = curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan';
            merged.businessType = isPan ? 'pan_only' : 'vat_registered';
            merged.storeName = curBiz.name || curBiz.storeName || merged.storeName || '';
            merged.address = curBiz.address !== undefined ? curBiz.address : (curBiz.storeAddress !== undefined ? curBiz.storeAddress : (merged.address || ''));
            merged.phone = curBiz.phone !== undefined ? curBiz.phone : (curBiz.storePhone !== undefined ? curBiz.storePhone : (merged.phone || ''));
            const regNum = (curBiz.pan_no || curBiz.vat_no || curBiz.panNo || curBiz.vatNo || curBiz.pan || curBiz.vat || '').trim();
            merged.panNo = isPan ? (curBiz.pan_no || curBiz.panNo || regNum) : '';
            merged.vatNoActual = isPan ? '' : (curBiz.vat_no || curBiz.vatNo || regNum);
            merged.vatNo = isPan ? merged.panNo : merged.vatNoActual;
            merged.vatLabelType = isPan ? 'PAN' : 'VAT';
            merged.billPrefix = curBiz.bill_prefix !== undefined ? curBiz.bill_prefix : (merged.billPrefix || 'TH');
            merged.startingNo = curBiz.starting_no !== undefined ? curBiz.starting_no : (merged.startingNo || 1);
            merged.footer = curBiz.footer !== undefined ? curBiz.footer : (merged.footer || 'Thank you for your visit!');
        }
        return merged;
    };

    window.posAPI.getAllSettings()
        .then(settings => {
            storeSettings = updateStoreSettingsFromActiveBusiness(settings);
            applyReceiptSettings();
            applyBusinessTypeBilling();
        })
        .catch(err => {
            storeSettings = updateStoreSettingsFromActiveBusiness({});
            applyReceiptSettings();
            applyBusinessTypeBilling();
        });
}

function loadCustomCategories() {
    const stored = localStorage.getItem(STORAGE_CATEGORIES_KEY);
    customCategories = uniqueCategories(stored ? JSON.parse(stored).filter(c => !OLD_DEFAULT_CATEGORIES.includes(c)) : []);
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(customCategories));
    renderCategoryTabs();
}

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    // 1. Get all available categories (including canonical default categories)
    const availableCategories = ['All', ...DEFAULT_CATEGORY_ORDER, ...inventory.map(i => i.category).filter(c => !OLD_DEFAULT_CATEGORIES.includes(c)), ...customCategories];
    const uniqueAvailable = ['All', ...uniqueCategories(availableCategories.filter(c => c !== 'All'))];

    // 2. Load saved order from localStorage
    const storedOrder = localStorage.getItem('pos_category_order');
    if (storedOrder) {
        categoryOrder = uniqueCategories(JSON.parse(storedOrder).filter(c => !OLD_DEFAULT_CATEGORIES.includes(c)));
    } else {
        categoryOrder = [];
    }

    // 3. Merge: Start with saved order (filtering out invalid ones), then add new ones
    let finalOrder = categoryOrder.filter(c => uniqueAvailable.some(cat => sameCategory(cat, c)));
    const newCategories = uniqueAvailable.filter(c => c !== 'All' && !finalOrder.some(cat => sameCategory(cat, c)));
    // Sort new categories by canonical default order so Pina, Chiya Pati etc appear in correct position
    const defaultCatKeyMap = new Map(DEFAULT_CATEGORY_ORDER.map((c, i) => [categoryKey(c), i]));
    newCategories.sort((a, b) => {
        const ia = defaultCatKeyMap.has(categoryKey(a)) ? defaultCatKeyMap.get(categoryKey(a)) : 9999;
        const ib = defaultCatKeyMap.has(categoryKey(b)) ? defaultCatKeyMap.get(categoryKey(b)) : 9999;
        return ia - ib;
    });
    // Insert each new category at its correct position relative to default order
    for (const cat of newCategories) {
        const catIdx = defaultCatKeyMap.get(categoryKey(cat)) ?? 9999;
        let inserted = false;
        for (let i = finalOrder.length - 1; i >= 0; i--) {
            const existIdx = defaultCatKeyMap.get(categoryKey(finalOrder[i])) ?? 9999;
            if (catIdx >= existIdx) {
                finalOrder.splice(i + 1, 0, cat);
                inserted = true;
                break;
            }
        }
        if (!inserted) finalOrder.unshift(cat);
    }

    // Ensure 'All' is always first
    finalOrder = finalOrder.filter(c => c !== 'All');
    finalOrder.unshift('All');

    // Update global order
    categoryOrder = finalOrder;
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder.filter(c => c !== 'All')));

    container.innerHTML = finalOrder.map((cat, index) => {
        const count = cat === 'All' ? inventory.length : inventory.filter(i => sameCategory(i.category, cat)).length;
        const isAll = cat === 'All';
        const escapedCat = cat.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
            <button class="category-tab ${sameCategory(currentCategory, cat) ? 'active' : ''}" 
                    data-category="${escapedCat}"
                    ${!isAll ? `draggable="true" ondragstart="handleCategoryDragStart(event, ${index})" ondragend="handleCategoryDragEnd(event)"` : ''}
                    ondragover="handleCategoryDragOver(event)"
                    ondrop="handleCategoryDrop(event, ${index})"
                    onclick="filterByCategory('${escapedCat}')"
                    style="cursor: ${isAll ? 'pointer' : 'grab'};">
                ${cat} <span class="tab-count" style="font-size: 0.75rem; opacity: 0.7; margin-left: 0.3rem;">(${count})</span>
            </button>
        `;
    }).join('');

    // Sync vertical category sidebar
    renderVertCatSidebar();
}

// Drag and drop handlers for category tabs
let draggedCategoryIndex = null;

function handleCategoryDragStart(e, index) {
    draggedCategoryIndex = index;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    }
    setTimeout(() => {
        if (e.target) e.target.classList.add('dragging');
    }, 0);
}

function handleCategoryDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
}

function handleCategoryDragEnd(e) {
    if (e.target) e.target.classList.remove('dragging');
    draggedCategoryIndex = null;
}

function handleCategoryDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === targetIndex) return;
    if (targetIndex === 0) return; // 'All' must stay at 0

    const items = [...categoryOrder];
    const draggedItem = items.splice(draggedCategoryIndex, 1)[0];
    items.splice(targetIndex, 0, draggedItem);

    categoryOrder = items;
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder.filter(c => c !== 'All')));
    renderCategoryTabs();
}

// --- Vertical Category Sidebar (PetPooja style) ---
function renderVertCatSidebar() {
    const sidebar = document.getElementById('vertCatSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = categoryOrder.map(cat => {
        const count = cat === 'All' ? inventory.length : inventory.filter(i => sameCategory(i.category, cat)).length;
        const isActive = sameCategory(currentCategory, cat);
        return `<button class="vert-cat-item${isActive ? ' active' : ''}"
                    onclick="filterByCategory('${cat.replace(/'/g, "\\'")}')"
                    title="${cat}">
                    <span>${cat}</span>
                    <span class="vert-cat-count">(${count})</span>
                </button>`;
    }).join('');
}


// --- Category Reordering Logic ---

function openCategoryOrderModal() {
    const modal = document.getElementById('categoryOrderModal');
    if (modal) modal.classList.add('active');
    renderCategoryOrderList();
}

function closeCategoryOrderModal() {
    const modal = document.getElementById('categoryOrderModal');
    if (modal) modal.classList.remove('active');
    renderCategoryTabs(); // Refresh tabs
}

function renderCategoryOrderList() {
    const list = document.getElementById('categoryOrderList');
    if (!list) return;

    // Use the current categoryOrder (excluding 'All' since it's fixed)
    const draggableCats = categoryOrder.filter(c => c !== 'All');

    list.innerHTML = draggableCats.map((cat, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-main); border: 1px solid var(--border-light); border-radius: 0.3rem;">
            <span>${cat}</span>
            <div style="display: flex; gap: 0.3rem;">
                <button onclick="moveCategory(${index}, -1)" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
                <button onclick="moveCategory(${index}, 1)" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" ${index === draggableCats.length - 1 ? 'disabled' : ''}>&darr;</button>
            </div>
        </div>
    `).join('');
}

function moveCategory(index, direction) {
    // Indices are based on the filtered list (without 'All')
    // We need to swap in the REAL list which starts with 'All'
    // So realIndex = index + 1
    const realIndex = index + 1;
    const targetIndex = realIndex + direction;

    if (targetIndex < 1 || targetIndex >= categoryOrder.length) return;

    // Swap
    const temp = categoryOrder[realIndex];
    categoryOrder[realIndex] = categoryOrder[targetIndex];
    categoryOrder[targetIndex] = temp;

    // Save
    localStorage.setItem('pos_category_order', JSON.stringify(categoryOrder.filter(c => c !== 'All')));

    // Re-render list and tabs
    renderCategoryOrderList();
    renderCategoryTabs();
}

function filterByCategory(category) {
    currentCategory = category;
    sessionStorage.setItem('pos_billing_category', category);
    const searchEl = document.getElementById('productSearch');
    renderProducts(searchEl ? searchEl.value : '');
    renderCategoryTabs();
}

function updateSearchClearButton() {
    if (!els.search || !els.searchClear) return;
    els.searchClear.style.display = els.search.value.trim() ? 'flex' : 'none';
}

function clearSearch() {
    if (els.search) {
        els.search.value = '';
    }
    if (els.searchResults) {
        els.searchResults.style.display = 'none';
    }
    updateSearchClearButton();
    renderProducts('');
    if (els.search) {
        els.search.focus();
    }
}

function handleSearch() {
    updateSearchClearButton();
    renderProducts(els.search.value);
    if (els.search && !els.search.value.trim() && els.searchResults) {
        els.searchResults.style.display = 'none';
    }
}


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

function renderProducts(query = '') {
    if (!els.productsGrid) return;
    els.productsGrid.innerHTML = '';

    const term = query.toLowerCase().trim();
    let filtered = inventory.filter(item => {
        if (item.status === 'inactive' || item.isActive === false || item.active === false) return false;
        const itemCat = (item.category || '').trim();
        const curCat = currentCategory.trim();

        const matchesCategory = curCat === 'All' || sameCategory(itemCat, curCat);
        const matchesQuery = (item.name || '').toLowerCase().includes(term) ||
            (item.barcode || '').toLowerCase().includes(term);

        return matchesCategory && matchesQuery;
    });

    // Apply Category Order > Custom Sort > Exact Saved defaultItems Order
    const itemOrder = JSON.parse(localStorage.getItem('pos_item_order') || '{}');
    const defaultIndexMap = new Map();
    defaultItems.forEach((item, index) => {
        defaultIndexMap.set(`${String(item.name || '').trim().toLowerCase()}|${categoryKey(item.category)}`, index);
    });

    filtered.sort((a, b) => {
        const catA = a.category || '';
        const catB = b.category || '';

        // 1. Category Order (when in 'All' view or comparing different categories)
        if (currentCategory === 'All' || !sameCategory(catA, catB)) {
            const catIdxA = categoryOrder.findIndex(c => sameCategory(c, catA));
            const catIdxB = categoryOrder.findIndex(c => sameCategory(c, catB));
            const catValA = catIdxA !== -1 ? catIdxA : 9999;
            const catValB = catIdxB !== -1 ? catIdxB : 9999;
            if (catValA !== catValB) return catValA - catValB;
        }

        // 2. Custom Item Order within Category (if user explicitly dragged/reordered)
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

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `product-card ${item.stock <= 0 ? 'out-of-stock' : ''}`;

        let pressTimer;
        let isLongPress = false;

        const startPress = (e) => {
            if (e.type === 'touchstart' || e.button === 0) {
                isLongPress = false;
                pressTimer = window.setTimeout(() => {
                    isLongPress = true;
                    if (item.stock > 0) openSmartBulkModal(item.id);
                }, 500);
            }
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('touchstart', startPress, { passive: true });
        card.addEventListener('mouseup', cancelPress);
        card.addEventListener('mouseleave', cancelPress);
        card.addEventListener('touchend', cancelPress);
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (item.stock > 0) openSmartBulkModal(item.id);
        });

        // Click to add
        card.onclick = (e) => {
            cancelPress();
            if (isLongPress) return;
            if (item.stock > 0) {
                // Flash animation
                card.classList.remove('clicked-flash');
                void card.offsetWidth; // Trigger reflow
                card.classList.add('clicked-flash');

                addToCart(item.id);
            }
        };

        card.innerHTML = `
            <div class="product-info">
                <div class="product-name">${item.name}</div>
                <div class="product-category">${item.category}</div>
                <div class="product-price">${(() => {
                    let tiers = item.price_tiers;
                    if (typeof tiers === "string") { try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; } }
                    if ((item.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0) {
                        const rates = tiers.map(t => parseFloat(t.ratePerUnit)).filter(r => !isNaN(r));
                        if (rates.length > 0) {
                            const minRate = Math.min(...rates);
                            const maxRate = Math.max(...rates);
                            return minRate === maxRate ? ("Rs. " + fmt(minRate)) : ("Rs. " + fmt(minRate) + " - " + fmt(maxRate));
                        }
                    }
                    return "Rs. " + fmt(item.price);
                })()}</div>
            </div>
        `;
        els.productsGrid.appendChild(card);
    });
}

function addToCart(productId) {
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
    }

    renderCart();
    renderCartTabs();
    saveCartState();

    // Clear search and reset view if a search was active
    if (els.search && els.search.value) {
        els.search.value = '';
        renderProducts('');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCartState();
    renderCart();
    renderCartTabs();
}

function updateQty(index, delta) {
    const cartItem = cart[index];
    const invItem = inventory.find(i => i.id === cartItem.id);

    // Dynamic Step: 0.1 steps when below 1.0, 1.0 steps when 1.0 or above
    let step;
    if (delta > 0) {
        step = cartItem.qty < 0.95 ? 0.1 : 1.0;
    } else {
        step = cartItem.qty <= 1.05 ? 0.1 : 1.0;
    }

    let newQty = parseFloat((cartItem.qty + (delta > 0 ? step : -step)).toFixed(2));

    if (newQty > invItem.stock) {
        alert('Cannot exceed available stock');
        return;
    }

    if (newQty < 0.1) {
        newQty = 0.1;
    }

    cartItem.qty = newQty;
    updateItemTierPrice(cartItem);
    refreshCartItemDisplay(index);
    saveCartState();
}

/**
 * Adjusts quantity by decimal amounts (e.g. 0.1)
 * Used for Up/Down arrow actions as requested.
 */
function adjustQtyDecimal(index, delta) {
    const cartItem = cart[index];
    const invItem = inventory.find(i => i.id === cartItem.id);

    let newQty = parseFloat((cartItem.qty + delta).toFixed(2));

    if (newQty > invItem.stock) {
        alert('Cannot exceed available stock');
        return;
    }

    // Minimum limit for decimals is 0.1
    if (newQty < 0.1) {
        newQty = 0.1;
    }

    cartItem.qty = newQty;
    refreshCartItemDisplay(index);
    saveCartState();
}

function manualQty(index, value) {
    const qty = parseFloat(value);
    const cartItem = cart[index];
    const invItem = inventory.find(i => i.id === cartItem.id);

    if (isNaN(qty) || qty < 0.1) {
        cartItem.qty = 1;
        saveCartState();
        renderCart();
        return;
    }

    if (qty > invItem.stock) {
        alert('Cannot exceed available stock');
        renderCart(); // Reset input
        return;
    }

    cartItem.qty = qty;
    updateItemTierPrice(cartItem);
    refreshCartItemDisplay(index);
    saveCartState();
}

function manualPrice(index, value) {
    const price = parseFloat(value);
    const cartItem = cart[index];

    cartItem.isManualPriceOverride = true;
    if (isNaN(price) || price < 0) {
        cartItem.price = 0;
    } else {
        cartItem.price = price;
    }
    saveCartState();
    renderCart();
}

function manualQtyLive(index, value) {
    const qty = parseFloat(value);
    const cartItem = cart[index];
    const invItem = cartItem && inventory.find(i => i.id === cartItem.id);
    if (!cartItem || !invItem || !Number.isFinite(qty) || qty < 0.1 || qty > invItem.stock) return;

    cartItem.qty = qty;
    refreshCartItemDisplay(index);
    saveCartState();
}

function refreshCartItemDisplay(index) {
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
    if (totalEl) totalEl.textContent = `Rs. ${fmt(itemTotal)}`;
    if (unitPriceEl) unitPriceEl.textContent = `Rs ${fmt(cartItem.price)} x ${cartItem.qty}`;

    // Update tier note live
    let tierNote = row.querySelector('.cart-item-tier-note');
    if (cartItem.isTierApplied) {
        const unitStr = cartItem.unit ? `/${cartItem.unit.trim()}` : '';
        const text = `(Bulk rate: Rs.${fmt(cartItem.price)}${unitStr} applied)`;
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
    if (els.subTotal) els.subTotal.textContent = `Rs. ${fmt(total)}`;
    if (els.grandTotal) els.grandTotal.textContent = `Rs. ${fmt(total)}`;
}

function toggleItemSelection(index) {
    const item = cart[index];
    if (item && !item.isBulk) {
        item.selected = !item.selected;
        renderCart();
    }
}

function toggleBulkMode() {
    const activeCart = carts.find(c => c.id === currentCartId);
    if (!activeCart) return;

    activeCart.isBulkMode = document.getElementById('bulkModeToggle').checked;

    if (activeCart.isBulkMode) {
        const selectedItems = cart.filter(item => item.selected);
        const targetItems = selectedItems.length > 0 ? selectedItems : cart;

        targetItems.forEach(item => {
            if (item.originalPrice === undefined) {
                item.originalPrice = item.price;
            }
            item.isBulk = true;
            // Removed clearing of qty and price to prevent data loss on accidental toggle
            item.selected = false; // Clear selection after applying
        });
    } else {
        // Restore all from bulk
        cart.forEach(item => {
            if (item.isBulk) {
                // If it was empty or invalid, fall back to defaults
                if (item.price === "" || isNaN(item.price)) {
                    const invItem = inventory.find(i => i.id === item.id);
                    item.price = invItem ? invItem.price : (item.originalPrice || 0);
                }
                if (item.qty === "" || isNaN(item.qty)) {
                    item.qty = 1;
                }
                item.isBulk = false;
            }
            item.selected = false;
        });
    }

    renderCart();
    saveCartState();
}

// ── Swipe-to-Delete for Cart Items ─────────────────────────────────────────
function attachSwipeBehavior(wrapper, itemEl, index) {
    const REVEAL_WIDTH = -88;   // Width of the delete button
    let startX = 0, startY = 0, currentX = 0;
    let dragging = false, locked = false, isHoriz = false;
    let isRevealed = false;
    let hasSwiped = false;

    const px = e => e.touches ? e.touches[0].clientX : e.clientX;
    const py = e => e.touches ? e.touches[0].clientY : e.clientY;
    const bg = () => wrapper.querySelector('.cart-delete-bg');

    // Add listener to close this swipe when another starts
    wrapper.addEventListener('close-swipe', () => {
        if (!isRevealed) return;
        isRevealed = false;
        currentX = 0;
        itemEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        itemEl.style.transform = 'translateX(0)';
        const b = bg();
        if (b) {
            b.style.transition = 'opacity 0.3s ease';
            b.style.opacity = '0';
            b.style.pointerEvents = 'none';
        }
    });

    function onStart(e) {
        // If we start a new swipe, close all other open swipes
        document.querySelectorAll('.cart-swipe-wrapper').forEach(w => {
            if (w !== wrapper) w.dispatchEvent(new CustomEvent('close-swipe'));
        });

        hasSwiped = false;
        startX = px(e) - (isRevealed ? REVEAL_WIDTH : 0);
        startY = py(e);
        currentX = isRevealed ? REVEAL_WIDTH : 0;
        dragging = true;
        locked = false;
        isHoriz = false;

        itemEl.style.transition = 'none';
        const b = bg();
        if (b) b.style.transition = 'none';
    }

    function onMove(e) {
        if (!dragging) return;
        const dx = px(e) - startX, dy = py(e) - startY;

        if (!locked) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            isHoriz = Math.abs(dx) > Math.abs(dy);
            locked = true;
        }

        if (!isHoriz) {
            dragging = false;
            return;
        }

        // It is a horizontal swipe: prevent clicks on children and prevent scroll
        e.preventDefault();
        hasSwiped = true;

        currentX = Math.min(0, dx);
        itemEl.style.transform = `translateX(${currentX}px)`;

        const b = bg();
        if (b) {
            b.style.pointerEvents = 'none';
            b.style.opacity = String(Math.min(1, Math.abs(currentX) / 30));
        }
    }

    function onEnd() {
        if (!dragging) return;
        dragging = false;
        itemEl.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

        const b = bg();
        if (b) b.style.transition = 'opacity 0.3s ease';

        if (currentX < REVEAL_WIDTH / 2) {
            // Reveal delete button
            currentX = REVEAL_WIDTH;
            itemEl.style.transform = `translateX(${REVEAL_WIDTH}px)`;
            isRevealed = true;
            if (b) {
                b.style.opacity = '1';
                b.style.pointerEvents = 'auto';
            }
        } else {
            // Snap back
            currentX = 0;
            itemEl.style.transform = 'translateX(0)';
            isRevealed = false;
            if (b) {
                b.style.opacity = '0';
                b.style.pointerEvents = 'none';
            }
        }
    }

    let deleting = false;
    function executeDelete() {
        if (deleting) return; // Guard against double-fire
        deleting = true;

        // Phase 1: fly off-screen
        itemEl.style.transition = 'transform 0.3s ease-in';
        itemEl.style.transform = 'translateX(-120%)';

        // Phase 2: collapse wrapper height
        setTimeout(() => {
            const h = wrapper.offsetHeight;
            wrapper.style.overflow = 'hidden';
            wrapper.style.height = h + 'px';
            requestAnimationFrame(() => {
                wrapper.style.transition = 'height 0.3s ease, opacity 0.25s ease, margin-bottom 0.3s ease';
                wrapper.style.height = '0';
                wrapper.style.opacity = '0';
                wrapper.style.marginBottom = '0';
            });
            setTimeout(() => removeFromCart(index), 350);
        }, 100);
    }

    // Attach click to background (and mousedown for faster response)
    const b = bg();
    if (b) {
        const handleDelete = (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isRevealed) executeDelete();
        };
        b.onclick = handleDelete;
        b.onmousedown = handleDelete;
        b.ontouchstart = handleDelete;
    }

    wrapper.addEventListener('click', (e) => {
        // Only block the click if it's NOT on the delete button itself
        if (hasSwiped && !e.target.closest('.cart-delete-bg')) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, { capture: true });

    // Listen for swipe starting anywhere in the wrapper (using capture to beat child buttons)
    wrapper.addEventListener('touchstart', onStart, { passive: true, capture: true });
    wrapper.addEventListener('touchmove', onMove, { passive: false, capture: true });
    wrapper.addEventListener('touchend', onEnd, { capture: true });
    wrapper.addEventListener('touchcancel', onEnd, { capture: true });

    wrapper.addEventListener('mousedown', e => {
        onStart(e);
        if (!dragging) return;
        const mm = ev => onMove(ev);
        const mu = () => { onEnd(); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
        window.addEventListener('mousemove', mm, { capture: true });
        window.addEventListener('mouseup', mu, { capture: true });
    }, { capture: true });
}
// ────────────────────────────────────────────────────────────────────────────

function renderCart() {
    if (!els.cartItems) return;
    els.cartItems.innerHTML = '';

    if (cart.length === 0) {
        els.cartItems.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Empty Cart</div>';
        els.subTotal.textContent = 'Rs. 0.00';
        els.grandTotal.textContent = 'Rs. 0.00';
        return;
    }

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = (item.price || 0) * (item.qty || 0);
        total += itemTotal;

        const div = document.createElement('div');
        div.className = `cart-item ${item.isBulk ? 'is-bulk' : ''}`;

        // Long-press and Right-click for Smart Bulk Modal on cart items
        let pressTimer;
        let isLongPress = false;
        let startX, startY;

        const startPress = (e) => {
            // Only trigger if clicking on the card body, not buttons/inputs
            if (e.target.closest('button') || e.target.closest('input')) return;

            if (e.type === 'touchstart' || e.button === 0) {
                isLongPress = false;
                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                pressTimer = window.setTimeout(() => {
                    isLongPress = true;
                    openSmartBulkModal(item.id, index);
                }, 600);
            }
        };

        const checkMove = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);
            if (dx > 10 || dy > 10) {
                clearTimeout(pressTimer);
            }
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        div.addEventListener('mousedown', startPress);
        div.addEventListener('touchstart', startPress, { passive: true });
        div.addEventListener('touchmove', checkMove, { passive: true });
        div.addEventListener('mousemove', checkMove);
        div.addEventListener('mouseup', cancelPress);
        div.addEventListener('touchend', cancelPress);
        div.addEventListener('mouseleave', cancelPress);

        div.addEventListener('contextmenu', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return;
            e.preventDefault();
            openSmartBulkModal(item.id, index);
        });

        // Click to toggle selection (original behavior)
        div.onclick = (e) => {
            cancelPress();
            if (isLongPress) return;
            if (!e.target.closest('button') && !e.target.closest('input')) {
                toggleItemSelection(index);
            }
        };

        updateItemTierPrice(item);
        // Format: Rs Total then down Rs UnitPrice*Qty
        const unitPriceQty = `Rs ${fmt(item.price)} x ${item.qty}`;
        const unitStr = item.unit ? `/${item.unit.trim()}` : '';
        const tierNoteHtml = item.isTierApplied 
            ? `<div class="cart-item-tier-note" style="font-size: 0.75rem; color: var(--accent-primary, #3b82f6); font-weight: 500; margin-top: 2px;">(Bulk rate: Rs.${fmt(item.price)}${unitStr} applied)</div>` 
            : '';

        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${index + 1}. ${item.name} ${item.isBulk ? '<span style="font-size: 0.65rem; color: var(--accent-primary); font-weight: normal; margin-left: 0.5rem; border: 1px solid var(--accent-primary); padding: 0 4px; border-radius: 4px;">BULK</span>' : ''}</div>
                ${tierNoteHtml}
            </div>
            <div class="qty-controls" onclick="event.stopPropagation()">
                <button onclick="updateQty(${index}, -1)">-</button>
                <input type="number" class="qty-input" value="${item.qty}" 
                       step="0.1" min="0.1"
                       onkeydown="if(event.key === 'ArrowUp'){ event.preventDefault(); adjustQtyDecimal(${index}, 0.1); } else if(event.key === 'ArrowDown'){ event.preventDefault(); adjustQtyDecimal(${index}, -0.1); }"
                       oninput="manualQtyLive(${index}, this.value)"
                       onchange="manualQty(${index}, this.value)" >
                <button onclick="updateQty(${index}, 1)">+</button>
            </div>
            <div class="cart-item-price-group" style="display: flex; flex-direction: column; align-items: flex-end; min-width: 85px;">
                <div class="cart-item-total" style="width: auto; margin-bottom: 0;">Rs. ${fmt(itemTotal)}</div>
                <div class="cart-item-price" style="margin-top: 0; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); opacity: 1; white-space: nowrap;">${unitPriceQty}</div>
            </div>
        `;
        // Wrap in swipe-to-delete shell
        const wrapper = document.createElement('div');
        wrapper.className = 'cart-swipe-wrapper';

        const deleteBg = document.createElement('div');
        deleteBg.className = 'cart-delete-bg';
        deleteBg.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
            </svg>
            <span>Delete</span>`;

        wrapper.appendChild(deleteBg);
        wrapper.appendChild(div);
        attachSwipeBehavior(wrapper, div, index);
        els.cartItems.appendChild(wrapper);
    });

    els.subTotal.textContent = `Rs. ${fmt(total)}`;
    els.grandTotal.textContent = `Rs. ${fmt(total)}`;

    // Scroll to and highlight the last added/updated item
    if (lastAddedIndex !== null && lastAddedIndex >= 0) {
        const allItems = els.cartItems.querySelectorAll('.cart-item');
        const target = allItems[lastAddedIndex];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            target.classList.add('cart-item-flash');
            setTimeout(() => target.classList.remove('cart-item-flash'), 700);
        }
        lastAddedIndex = null;
    }
}

function clearCart() {
    // Determine if there's anything to clear
    const hasItems = cart.length > 0;
    const hasCustomer = (els.customerName && els.customerName.value) || (els.customerAddress && els.customerAddress.value) || (els.customerPhone && els.customerPhone.value);
    const active = carts.find(c => c.id == currentCartId);
    const isEdit = active && active.isEdit;

    if (!hasItems && !hasCustomer && !isEdit) return;

    const originalBtn = els.btnClear;
    if (!originalBtn || !originalBtn.parentElement) return;

    const parent = originalBtn.parentElement;

    // Create inline confirmation options
    const confirmContainer = document.createElement('div');
    confirmContainer.className = 'confirm-clear-grid';
    confirmContainer.style.display = 'grid';
    confirmContainer.style.gridTemplateColumns = '1fr 1fr';
    confirmContainer.style.gap = '0.3rem';
    confirmContainer.style.width = '100%';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.style.fontSize = '0.8rem';
    deleteBtn.style.padding = '0.4rem';
    deleteBtn.textContent = 'Clear Now';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        executeClearAction();
        resetClearButtonUI();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.style.justifyContent = 'center';
    cancelBtn.style.fontSize = '0.8rem';
    cancelBtn.style.padding = '0.4rem';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        resetClearButtonUI();
    };

    confirmContainer.appendChild(deleteBtn);
    confirmContainer.appendChild(cancelBtn);

    // Replace "Clear Cart" button with the confirm options
    parent.replaceChild(confirmContainer, originalBtn);
}

function resetClearButtonUI() {
    const grid = document.querySelector('.confirm-clear-grid');
    if (grid && grid.parentElement) {
        grid.parentElement.replaceChild(els.btnClear, grid);
    }
}

function executeClearAction() {
    // Clear items array
    cart.length = 0;

    // Reset customer details in UI and State
    const active = carts.find(c => c.id == currentCartId);
    if (active) {
        active.items = []; // Re-ensure items is empty
        active.customerName = '';
        active.customerAddress = '';
        active.customerPhone = '';
        active.customerPAN = '';
        active.generateVatInvoice = false;
        active.paymentMode = '';

        // Clear Edit State if present
        if (active.isEdit) {
            delete active.isEdit;
            delete active.originalBillNo;
            delete active.originalTimestamp;

            // Also reset name if it was an Edit name
            if (active.name && active.name.startsWith('Edit #')) {
                active.name = `Cart ${active.id}`;
            }
        }
    }

    // Explicitly update global cart reference again
    if (active) cart = active.items;

    saveCartState();
    renderCart();
    renderCartTabs();

    // Clear UI Inputs (all customer fields + payment)
    if (els.customerName) els.customerName.value = '';
    if (els.customerAddress) els.customerAddress.value = '';
    if (els.customerPhone) els.customerPhone.value = '';
    const panInputClear = document.getElementById('customerPAN');
    if (panInputClear) panInputClear.value = '';
    const vatInvoiceCheck = document.getElementById('generateVatInvoice');
    if (vatInvoiceCheck) vatInvoiceCheck.checked = false;
    if (els.paymentMode) els.paymentMode.value = '';
    updateCustomerDisplay();

    // Reset payment buttons visual state
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
}


function tryAddByBarcode(barcode) {
    const item = inventory.find(i => i.barcode === barcode);
    if (item) {
        addToCart(item.id);
        els.search.value = '';
    }
}

function setPaymentMode(mode, btn) {
    // Clear all active states first
    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
    
    // Set selected payment mode and keep it active
    els.paymentMode.value = mode;
    if (btn) btn.classList.add('active');

    // Update active cart
    const active = carts.find(c => c.id === currentCartId);
    if (active) {
        active.paymentMode = mode;
    }
    saveCartState();

    // Immediately open the Confirm Sale modal
    checkout();
}

function checkout() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    let pMode = els.paymentMode.value;
    if (!pMode) {
        alert('Please select a payment method');
        return;
    }

    const activeCart = carts.find(c => c.id === currentCartId);
    const customerPANEl = document.getElementById('customerPAN');
    const isVatInvoice = !!document.getElementById('generateVatInvoice')?.checked;
    const custName = (els.customerName ? els.customerName.value : '').trim();
    const custAddress = (els.customerAddress ? els.customerAddress.value : (document.getElementById('customerAddress') ? document.getElementById('customerAddress').value : '')).trim();
    const custPAN = (customerPANEl ? customerPANEl.value : '').trim();

    if (isVatInvoice) {
        if (!custName || !custPAN) {
            alert('Customer Name and PAN are required to generate a Tax Invoice.');
            toggleCustomerInfo(true);
            if (!custName && els.customerName) {
                els.customerName.focus();
            } else if (!custPAN && customerPANEl) {
                customerPANEl.focus();
            }
            return;
        }
        if (custPAN.length !== 9) {
            alert('Customer PAN must be exactly 9 digits to generate a Tax Invoice.');
            toggleCustomerInfo(true);
            if (customerPANEl) customerPANEl.focus();
            return;
        }
    } else if (custPAN && custPAN.length !== 9) {
        alert('Customer PAN must be exactly 9 digits.');
        toggleCustomerInfo(true);
        if (customerPANEl) customerPANEl.focus();
        return;
    }

    // Check if we are editing an existing sale (Preserve Bill No and Date)
    if (activeCart && activeCart.originalBillNo) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const saleData = {
            billNo: activeCart.originalBillNo,
            timestamp: activeCart.originalTimestamp, // Keep original date
            customer: custName,
            customerAddress: custAddress,
            address: custAddress,
            customerPhone: els.customerPhone.value || '',
            customerPAN: custPAN,
            isVatInvoice: isVatInvoice,
            items: cart.map(i => {
                const invItem = inventory.find(inv => (inv.id != null && i.id != null && String(inv.id) === String(i.id)) || (inv.name && i.name && inv.name.trim().toLowerCase() === i.name.trim().toLowerCase()));
                return {
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    price: i.price,
                    hsCode: i.hsCode || i.hscCode || (invItem && (invItem.hsCode || invItem.hscCode)) || '',
                    vatRate: i.vatRate !== undefined ? i.vatRate : (i.vat !== undefined ? i.vat : (i.vat_rate !== undefined ? i.vat_rate : 13))
                };
            }),
            total,
            paymentMode: pMode,
            cashier: cashierName,
            isEdit: true, // Flag for finalizeSale to replace old record
            business_id: activeCart.business_id || ((window.BusinessManager && typeof window.BusinessManager.getActiveBusinessId === 'function') ? window.BusinessManager.getActiveBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1')),
            storeSettings: JSON.parse(JSON.stringify(storeSettings || {}))
        };

        finalizeSale(saleData, pMode);
        return;
    }

    const timestamp = new Date().toISOString();

    // Ensure we resolve the current active business registration / type dynamically
    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    let localSettings = {};
    try {
        localSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
    } catch (e) {}
    const activeBizType = curBiz
        ? ((curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan') ? 'pan_only' : 'vat_registered')
        : (localSettings.businessType || storeSettings.businessType || 'vat_registered');
    const isPanOnly = activeBizType === 'pan_only';
    const effectiveBizType = isPanOnly ? 'pan_only' : 'vat_registered';

    // Generate NEW Bill Number for fresh sales partitioned by businessType
    window.posAPI.getNextBillNumber({ businessType: effectiveBizType })
        .then(res => {
            let billNo = res.nextBillNo;
            const format = storeSettings.billFormat || 'sequential';
            const prefix = storeSettings.billPrefix || 'TH';

            if (format === 'chronological') {
                const now = new Date();
                const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
                billNo = `${dateStr}-${String(billNo).padStart(3, '0')}`;
            } else if (format === 'prefix') {
                billNo = `${String(billNo).padStart(3, '0')}-${prefix}`;
            }

            const fy = storeSettings.fiscalYear || '082/83';
            billNo = `${billNo}-${fy}`;

            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const customer = custName;
            const customerAddress = custAddress;
            const customerPhone = els.customerPhone.value || '';
            const customerPAN = custPAN;

            let calculatedVat = 0;
            let calculatedTaxable = 0;
            let calculatedNonTaxable = 0;
            if (!isPanOnly) {
                cart.forEach(item => {
                    const itemQty = parseFloat(item.qty || 0);
                    const itemPrice = parseFloat(item.price || 0);
                    const rackAmt = itemQty * itemPrice;
                    const rawRate = item.vatRate !== undefined ? item.vatRate : (item.vat !== undefined ? item.vat : (item.vat_rate !== undefined ? item.vat_rate : 13));
                    const rate = (rawRate === 'none' || rawRate === '0' || rawRate === 0) ? 0 : (parseFloat(rawRate) || 13);
                    if (rate > 0) {
                        const base = rackAmt / (1 + (rate / 100));
                        calculatedVat += (rackAmt - base);
                        calculatedTaxable += base;
                    } else {
                        calculatedNonTaxable += rackAmt;
                    }
                });
            }

            const saleData = {
                billNo,
                timestamp,
                customer,
                customerAddress,
                address: customerAddress,
                customerPhone,
                customerPAN,
                vatNo: customerPAN,
                isVatInvoice: isPanOnly ? false : isVatInvoice,
                items: cart.map(i => {
                    const invItem = inventory.find(inv => (inv.id != null && i.id != null && String(inv.id) === String(i.id)) || (inv.name && i.name && inv.name.trim().toLowerCase() === i.name.trim().toLowerCase()));
                    return {
                        id: i.id,
                        name: i.name,
                        qty: i.qty,
                        price: i.price,
                        hsCode: i.hsCode || i.hscCode || (invItem && (invItem.hsCode || invItem.hscCode)) || '',
                        vatRate: isPanOnly ? 0 : (i.vatRate !== undefined ? i.vatRate : (i.vat !== undefined ? i.vat : (i.vat_rate !== undefined ? i.vat_rate : 13)))
                    };
                }),
                total,
                vat: calculatedVat,
                taxable: calculatedTaxable,
                nonTaxable: calculatedNonTaxable,
                gross: isVatInvoice ? (calculatedTaxable + calculatedNonTaxable) : total,
                totalQty: cart.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0),
                paymentMode: pMode,
                cashier: cashierName,
                businessType: effectiveBizType,
                business_id: (window.BusinessManager && typeof window.BusinessManager.getActiveBusinessId === 'function') ? window.BusinessManager.getActiveBusinessId() : (localStorage.getItem('currentBusinessId') || 'biz_1'),
                storeSettings: {
                    ...JSON.parse(JSON.stringify(storeSettings || {})),
                    businessType: effectiveBizType,
                    cashier: cashierName,
                    customerPAN: customerPAN,
                    customerAddress: customerAddress
                }
            };

            finalizeSale(saleData, pMode);
        });
}

function closeSaleConfirmModal(preserveDiscount = true) {
    if (preserveDiscount && currentConfirmSaleData) {
        const discountInput = document.getElementById('confirmDiscountInput');
        pendingConfirmDiscountValue = discountInput ? discountInput.value : '';
        pendingConfirmDiscountMode = currentConfirmDiscountMode;
        pendingConfirmDiscountSubtotal = currentConfirmSubtotal;
    } else if (!preserveDiscount) {
        pendingConfirmDiscountValue = '';
        pendingConfirmDiscountMode = 'amount';
        pendingConfirmDiscountSubtotal = 0;
    }
    const modal = document.getElementById('saleConfirmModal');
    if (modal) modal.classList.remove('active');
}


function renderQuickTenderButtons(total) {
    const container = document.getElementById('quickTenderContainer');
    if (!container) return;
    container.innerHTML = '';

    const suggestions = new Set();

    // 1. Exact Amount
    suggestions.add(total);

    // 2. Next rounded up Convenient Amount (Next 1 rupee if decimal)
    if (total % 1 !== 0) {
        suggestions.add(Math.ceil(total));
    }

    // 3. Convenient increments
    const convenientSteps = [10, 50, 100, 500, 1000];

    convenientSteps.forEach(step => {
        let nextStep = Math.ceil(total / step) * step;
        if (nextStep > total) {
            suggestions.add(nextStep);
        }
    });

    const sorted = Array.from(suggestions)
        .sort((a, b) => a - b)
        .filter(val => val >= total);

    // Take a logical subset: Exact, and next 7 relevant ones
    const finalSet = sorted.slice(0, 8);

    finalSet.forEach(amount => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.style.cssText = 'padding: 0.5rem 0.2rem; font-size: 1rem; justify-content: center; background: var(--bg-card); border: 1.5px solid var(--border-light); font-weight: 800; color: var(--text-primary); border-radius: 8px; transition: all 0.2s; box-shadow: var(--shadow-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        if (amount === total) {
            btn.innerHTML = `<span style="color: var(--accent-success); font-weight: 800;">EXACT</span>`;
            btn.style.borderColor = 'var(--accent-success)';
            btn.style.background = 'rgba(16, 185, 129, 0.05)';
        } else {
            btn.textContent = fmt(amount);
        }

        btn.onclick = (e) => {
            e.stopPropagation();
            const input = document.getElementById('cashTendered');
            if (input) {
                input.value = amount;
                calculateChange();

                // Visual feedback
                const allBtns = container.querySelectorAll('button');
                allBtns.forEach(b => b.style.borderColor = 'var(--border-light)');
                btn.style.borderColor = 'var(--accent-primary)';

                if (typeof window.finalizeSaleFromQuickTender === 'function') {
                    window.finalizeSaleFromQuickTender();
                }
            }
        };
        container.appendChild(btn);
    });
}

function setConfirmDiscountMode(mode) {
    currentConfirmDiscountMode = mode === 'amount' ? 'amount' : 'percent';
    const percentBtn = document.getElementById('discountPercentMode');
    const amountBtn = document.getElementById('discountAmountMode');
    if (percentBtn) percentBtn.classList.toggle('active', currentConfirmDiscountMode === 'percent');
    if (amountBtn) amountBtn.classList.toggle('active', currentConfirmDiscountMode === 'amount');
    const input = document.getElementById('confirmDiscountInput');
    if (input) {
        input.max = currentConfirmDiscountMode === 'percent' ? '100' : String(currentConfirmSubtotal);
        input.step = '1';
        input.min = '1';
        input.value = '';
    }
    updateConfirmDiscount();
}

function setConfirmDiscountQuick(value, mode = 'percent') {
    setConfirmDiscountMode(mode);
    const input = document.getElementById('confirmDiscountInput');
    if (input) input.value = String(value);
    updateConfirmDiscount();
}

function clearConfirmDiscount() {
    const input = document.getElementById('confirmDiscountInput');
    if (input) input.value = '';
    updateConfirmDiscount();
}

function updateConfirmDiscount() {
    if (!currentConfirmSaleData) return;
    const input = document.getElementById('confirmDiscountInput');
    const rawValue = parseFloat(input?.value);
    const enteredValue = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    const cappedValue = currentConfirmDiscountMode === 'percent'
        ? Math.min(100, enteredValue)
        : Math.min(currentConfirmSubtotal, enteredValue);
    if (input && Number.isFinite(rawValue) && rawValue !== cappedValue) input.value = String(cappedValue);
    const discount = currentConfirmDiscountMode === 'percent'
        ? currentConfirmSubtotal * cappedValue / 100
        : cappedValue;
    const total = Math.max(0, currentConfirmSubtotal - discount);
    currentConfirmSaleData.discount = discount;
    currentConfirmSaleData.discountType = currentConfirmDiscountMode;
    currentConfirmSaleData.subtotal = currentConfirmSubtotal;
    currentConfirmSaleData.total = total;

    const subtotalEl = document.getElementById('conf-subtotal');
    const totalEl = document.getElementById('conf-total');
    const saveEl = document.getElementById('conf-you-save');
    if (subtotalEl) subtotalEl.textContent = `Rs. ${fmt(currentConfirmSubtotal)}`;
    if (totalEl) totalEl.textContent = `Rs. ${fmt(total)}`;
    if (saveEl) saveEl.textContent = `You save: Rs. ${fmt(discount)}`;

    // VAT-breakdown rows — always keep visible, just update the Net Amount value
    const receiptGrossRow = document.getElementById('p-gross-row');
    const receiptDiscountRow = document.getElementById('p-discount-row');
    const receiptDiscount = document.getElementById('p-discount');
    const receiptNetLabel = document.getElementById('p-net-label');
    const receiptNetRow = document.getElementById('p-net-row');
    const receiptNetTotalCell = document.getElementById('p-net-total-cell');
    const receiptTotalQtyRow = document.getElementById('p-total-qty-row');
    const receiptChangeRow = document.getElementById('p-change-row');
    const receiptTenderRow = document.getElementById('p-tender-row');
    const receiptTenderDividerRow = document.getElementById('p-tender-divider-row');
    const receiptQtyDividerRow = document.getElementById('p-qty-divider-row');
    if (receiptGrossRow && receiptDiscountRow) receiptGrossRow.after(receiptDiscountRow);
    if (receiptNetRow && receiptTenderDividerRow) receiptNetRow.after(receiptTenderDividerRow);
    if (receiptTenderDividerRow && receiptTenderRow) receiptTenderDividerRow.after(receiptTenderRow);
    if (receiptTenderRow && receiptChangeRow) receiptTenderRow.after(receiptChangeRow);
    if (receiptChangeRow && receiptQtyDividerRow) receiptChangeRow.after(receiptQtyDividerRow);
    if (receiptQtyDividerRow && receiptTotalQtyRow) receiptQtyDividerRow.after(receiptTotalQtyRow);
    // Show Gross Amount in VAT Invoice mode OR if discount > 0 in Abbreviated Tax Invoice / PAN Bill
    const isPanOnly = (currentConfirmSaleData?.businessType === 'pan_only' || storeSettings.businessType === 'pan_only');
    const isVatInvoice = !isPanOnly && !!currentConfirmSaleData?.isVatInvoice;
    const showGross = !isPanOnly && (isVatInvoice || discount > 0);
    if (receiptGrossRow) receiptGrossRow.style.display = (isPanOnly ? (discount > 0 ? 'table-row' : 'none') : (showGross ? 'table-row' : 'none'));
    if (receiptDiscountRow) receiptDiscountRow.style.display = discount > 0 ? 'table-row' : 'none';
    if (receiptDiscount) receiptDiscount.textContent = fmt(discount);

    const receiptTaxableRow = document.getElementById('p-taxable-row');
    const receiptNonTaxRow = document.getElementById('p-nontaxable-row');
    const receiptVatRow = document.getElementById('p-vat-breakdown-row');
    if (receiptTaxableRow) receiptTaxableRow.style.display = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (receiptNonTaxRow) receiptNonTaxRow.style.display = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (receiptVatRow) receiptVatRow.style.display = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (receiptNetLabel) {
        receiptNetLabel.colSpan = 3;
        receiptNetLabel.style.width = 'auto';
        receiptNetLabel.style.flex = '';
        receiptNetLabel.style.textAlign = 'left';
    }
    if (receiptNetRow) {
        receiptNetRow.style.display = 'table-row';
        receiptNetRow.classList.remove('compact-net');
    }
    if (receiptNetTotalCell) {
        receiptNetTotalCell.style.width = '34%';
        receiptNetTotalCell.style.flex = '';
    }

    const discountEl = document.getElementById('discount');
    const grandTotalEl = document.getElementById('grandTotal');
    if (discountEl) discountEl.textContent = `Rs. ${fmt(discount)}`;
    if (grandTotalEl) grandTotalEl.textContent = `Rs. ${fmt(total)}`;

    if (els.pTotalWords) els.pTotalWords.textContent = numberToWords(total);
    if (els.pTotal) els.pTotal.textContent = fmt(total);

    const tenderInput = document.getElementById('cashTendered');
    if (tenderInput) {
        // A changed discount invalidates any earlier quick-tender selection.
        tenderInput.value = total.toFixed(2);
    }
    if (currentConfirmSaleData.paymentMode === 'CASH') {
        renderQuickTenderButtons(total);
        calculateChange();
    }
}

function finalizeSale(saleData, paymentMode) {
    if (!saleData.storeSettings) {
        saleData.storeSettings = JSON.parse(JSON.stringify(storeSettings || {}));
    }

    // Check for CREDIT payment validation
    if (paymentMode === 'CREDIT') {
        if (!els.customerName.value || els.customerName.value.trim() === '') {
            alert('Cannot record credit sale for an unnamed customer. Please enter a customer name.');
            return;
        }
    }

    // Apply Invoice Format Settings
    applyReceiptSettings();
    const printableDiv = els.printableArea.querySelector('div');
    if (printableDiv) {
        printableDiv.style.fontSize = (storeSettings.baseFontSize || 11) + 'px';
        printableDiv.style.lineHeight = (storeSettings.lineHeight || 1.3);
        printableDiv.style.width = (storeSettings.paperWidth || 58) + 'mm';
        applyReceiptPaperTextSize();
    }

    const isPanOnly = saleData.businessType === 'pan_only' || (!saleData.businessType && storeSettings.businessType === 'pan_only');
    const isVatInvoice = !isPanOnly && !!saleData.isVatInvoice;
    const billTitle = document.getElementById('p-bill-title');
    if (billTitle) {
        if (isPanOnly) {
            billTitle.textContent = storeSettings.panBillLabel || 'BILL';
        } else {
            billTitle.textContent = isVatInvoice ? (storeSettings.taxInvoiceLabel || 'TAX INVOICE') : (storeSettings.abbreviatedTaxInvoiceLabel || 'ABBREVIATED TAX INVOICE');
        }
    }

    // Populate Receipt UI
    const now = new Date(saleData.timestamp);
    els.pStoreName.textContent = storeSettings.storeName || 'K Pos';
    els.pAddress.textContent = storeSettings.address || '';

    const vatRow = document.getElementById('p-vat-row');
    if (els.pVatNo && vatRow) {
        const vatLabelType = isPanOnly ? 'PAN' : (storeSettings.vatLabelType || 'PAN');
        const displayTaxNo = isPanOnly ? (storeSettings.panNo || storeSettings.vatNo) : (vatLabelType === 'VAT' ? (storeSettings.vatNoActual || storeSettings.vatNo || storeSettings.panNo) : (storeSettings.panNo || storeSettings.vatNo));
        if (displayTaxNo) {
            vatRow.style.display = 'block';
            const vatLabelEl = document.getElementById('p-vat-label');
            if (vatLabelEl) vatLabelEl.textContent = vatLabelType;
            els.pVatNo.textContent = displayTaxNo;
        } else {
            vatRow.style.display = 'none';
        }
    }

    const storePhoneRow = document.getElementById('p-phone-row');
    if (els.pPhone && storePhoneRow) {
        if (storeSettings.phone) {
            storePhoneRow.style.display = 'block';
            els.pPhone.textContent = storeSettings.phone;
        } else {
            storePhoneRow.style.display = 'none';
        }
    }

    els.pFooter.textContent = storeSettings.footer || 'Thank you for your visit!';
    els.pBillNo.textContent = saleData.billNo;

    // Custom Date Formatting: (3/16/2026 AD) 02:39:27 PM (2082/12/03 BS)
    const bsDate = typeof window.convertToBS === 'function' ? window.convertToBS(now) : '';
    const adDatePart = `(${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} AD)`;
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const bsDateStr = bsDate ? `(${bsDate.replace(/-/g, '/')} BS)` : '';
    const timeParts = timePart.match(/^(.*)\s(AM|PM)$/);
    const timeWithoutMeridiem = timeParts ? timeParts[1] : timePart;
    const meridiem = timeParts ? timeParts[2] : '';
    const firstDateLine = `${bsDateStr} ${timeWithoutMeridiem}`.trim();
    const secondDateLine = ` ${meridiem} ${adDatePart}`;

    const pDateAd = document.getElementById('p-date-ad');
    const pDateBs = document.getElementById('p-date-bs');

    if (pDateAd) {
        pDateAd.textContent = firstDateLine;
        pDateAd.style.fontStyle = 'normal'; // Remove italic as per request style
        pDateAd.style.whiteSpace = 'nowrap';
    }
    if (pDateBs) {
        pDateBs.textContent = secondDateLine;
        pDateBs.style.fontStyle = 'normal';
        pDateBs.style.whiteSpace = 'nowrap';
        pDateBs.style.display = 'block';
    }

    currentConfirmSaleData = saleData;
    currentConfirmSubtotal = saleData.total || 0;
    const restoreDiscount = pendingConfirmDiscountSubtotal === currentConfirmSubtotal;
    currentConfirmDiscountMode = restoreDiscount ? pendingConfirmDiscountMode : 'amount';
    const confirmDiscountInput = document.getElementById('confirmDiscountInput');
    if (confirmDiscountInput) {
        confirmDiscountInput.value = restoreDiscount ? pendingConfirmDiscountValue : '';
        confirmDiscountInput.max = currentConfirmDiscountMode === 'percent' ? '100' : String(currentConfirmSubtotal);
        confirmDiscountInput.min = '1';
        confirmDiscountInput.step = '1';
    }
    const discountModePercent = document.getElementById('discountPercentMode');
    const discountModeAmount = document.getElementById('discountAmountMode');
    if (discountModePercent) discountModePercent.classList.toggle('active', currentConfirmDiscountMode === 'percent');
    if (discountModeAmount) discountModeAmount.classList.toggle('active', currentConfirmDiscountMode === 'amount');
    const cartDiscountEl = document.getElementById('discount');
    const cartGrandTotalEl = document.getElementById('grandTotal');
    if (cartDiscountEl) cartDiscountEl.textContent = 'Rs. 0.00';
    if (cartGrandTotalEl) cartGrandTotalEl.textContent = `Rs. ${fmt(currentConfirmSubtotal)}`;
    const confirmSubtotalEl = document.getElementById('conf-subtotal');
    if (confirmSubtotalEl) confirmSubtotalEl.textContent = `Rs. ${fmt(currentConfirmSubtotal)}`;
    updateConfirmDiscount();
    // Keep the words line tied to the final net total after any confirm-sale discount.
    const netAmount = Number(currentConfirmSaleData.total);
    if (els.pTotalWords) els.pTotalWords.textContent = numberToWords(Number.isFinite(netAmount) ? netAmount : 0);
    applyReceiptPaperTextSize();

    // Handle Customer Row Visibility
    const customerRow = els.pCustomer.closest('tr');
    customerRow.style.display = '';
    els.pCustomer.textContent = (saleData.customer && saleData.customer.trim() !== '') ? saleData.customer : '-';
    // Handle Address Row Visibility
    const pCustAddr = els.pCustomerAddress || document.getElementById('p-customerAddress');
    if (pCustAddr) {
        const addrRow = pCustAddr.closest('tr');
        if (addrRow) {
            pCustAddr.textContent = (saleData.customerAddress && saleData.customerAddress.trim() !== '') ? saleData.customerAddress : (saleData.address && saleData.address.trim() !== '' ? saleData.address : '-');
            addrRow.style.display = '';
        }
    }

    // Handle PAN Row Visibility
    const panSpan = document.getElementById('p-customerpan');
    if (panSpan) {
        const panRow = panSpan.closest('tr');
        if (panRow) {
            panSpan.textContent = (saleData.customerPAN && saleData.customerPAN.trim() !== '') ? saleData.customerPAN : '-';
            panRow.style.display = '';
        }
    }

    // Handle Phone Row Visibility
    const phoneRow = els.pCustomerPhone.closest('tr');
    phoneRow.style.display = '';
    els.pCustomerPhone.textContent = (saleData.customerPhone && saleData.customerPhone !== '-' && saleData.customerPhone.trim() !== '') ? saleData.customerPhone : '-';

    els.pPayMode.textContent = saleData.paymentMode === 'CREDIT' ? 'Credit (A/C Receivable)' : (saleData.paymentMode === 'ESEWA' ? 'E-Wallet' : saleData.paymentMode);

    const pCashier = document.getElementById('p-cashier');
    if (pCashier) pCashier.textContent = cashierName;

    if (!els.pItems) {
        console.error('CRITICAL: Receipt item list element (p-items) not found!');
        return;
    }

    els.pItems.innerHTML = '';
    let totalQty = 0;
    let grossAmount = 0;
    let taxableBase = 0;
    let nonTaxableBase = 0;
    let totalVatAmount = 0;
    let totalRackAmount = 0;
    const vatRatesUsed = new Set();

    cart.forEach((item, index) => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.price) || 0;
        const rackPrice = qty * price;
        totalQty += qty;
        totalRackAmount += rackPrice;

        const inv = inventory.find(invItem => (invItem.id != null && item.id != null && String(invItem.id) === String(item.id)) || (invItem.name && item.name && invItem.name.trim().toLowerCase() === item.name.trim().toLowerCase()));
        
        let rate = 13;
        const rawRate = item.vatRate !== undefined ? item.vatRate 
            : (item.vat_rate !== undefined ? item.vat_rate 
            : (item.vat !== undefined ? item.vat 
            : (inv && inv.vatRate !== undefined ? inv.vatRate 
            : (inv && inv.vat_rate !== undefined ? inv.vat_rate 
            : (inv && inv.vat !== undefined ? inv.vat : 13)))));

        if (isPanOnly || rawRate === 'none' || rawRate === '0' || rawRate === 0 || item.vatType === 'none' || (inv && inv.vatType === 'none')) {
            rate = 0;
        } else {
            const parsed = parseFloat(rawRate);
            rate = !isNaN(parsed) && parsed >= 0 ? parsed : 13;
        }

        let displayRate, displayAmount;
        if (rate === 0 || isPanOnly) {
            displayRate = price;
            displayAmount = rackPrice;
            nonTaxableBase += displayAmount;
        } else {
            const vatDivisor = 1 + (rate / 100);
            const baseRate = price / vatDivisor;
            const baseAmount = rackPrice / vatDivisor;
            const itemVat = rackPrice - baseAmount;
            taxableBase += baseAmount;
            totalVatAmount += itemVat;
            vatRatesUsed.add(rate);

            if (isVatInvoice) {
                // VAT exclusive in TAX INVOICE
                displayRate = baseRate;
                displayAmount = baseAmount;
            } else {
                // VAT inclusive in ABBREVIATED TAX INVOICE
                displayRate = price;
                displayAmount = rackPrice;
            }
        }

        const rawHsc = (item.hsCode || item.hscCode || (inv && (inv.hsCode || inv.hscCode)) || '').toString().trim();
        let hscDisplay = '';
        if (rawHsc && rawHsc !== '—' && rawHsc !== '-') {
            const clean = rawHsc.replace(/^hsc\s*:\s*/i, '').trim();
            hscDisplay = clean ? `HSC: ${clean}` : 'HSC:';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="width: 7%; padding: 2px 1px 2px 0; vertical-align: top; text-align: left;">${index + 1}</td>
            <td style="width: 37%; padding: 2px 2px 2px 0; vertical-align: top; text-align: left; word-break: break-word; overflow-wrap: break-word;">${item.name || 'Unknown Item'}${hscDisplay ? `<div style="padding-left: 2px; margin-top: 1px;">${hscDisplay}</div>` : ''}</td>
            <td style="width: 17%; padding: 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${fmt(qty)}</td>
            <td style="width: 18%; padding: 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${fmt(displayRate)}</td>
            <td style="width: 21%; padding: 2px 0 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${fmt(displayAmount)}</td>
        `;
        els.pItems.appendChild(tr);
    });

    const vatAmount = totalVatAmount;
    grossAmount = isVatInvoice ? (taxableBase + nonTaxableBase) : totalRackAmount;
    const receiptNetAmt = totalRackAmount;

    const elGrossRow    = document.getElementById('p-gross-row');
    const elDiscountRow = document.getElementById('p-discount-row');
    const elTaxableRow  = document.getElementById('p-taxable-row');
    const elNonTaxRow   = document.getElementById('p-nontaxable-row');
    const elVatRow      = document.getElementById('p-vat-breakdown-row');
    const elNetRow      = document.getElementById('p-net-row');
    const saleDiscount = parseFloat(saleData.discount) || 0;
    const showGross = !isPanOnly && (isVatInvoice || saleDiscount > 0);
    if (elGrossRow)   elGrossRow.style.display   = (isPanOnly ? (saleDiscount > 0 ? 'table-row' : 'none') : (showGross ? 'table-row' : 'none'));
    if (elDiscountRow) {
        elDiscountRow.style.display = saleDiscount > 0 ? 'table-row' : 'none';
        const pDiscount = document.getElementById('p-discount');
        if (pDiscount) pDiscount.textContent = fmt(saleDiscount);
    }
    if (elTaxableRow) elTaxableRow.style.display  = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elNonTaxRow)  elNonTaxRow.style.display   = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elVatRow)     elVatRow.style.display       = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elNetRow)     elNetRow.style.display       = 'table-row';

    // Dynamic VAT label with percentage always shown (e.g. VAT 13%, VAT 5%, or VAT (13%, 5%))
    const vatLabelEl = document.getElementById('p-vat-breakdown-label') || (elVatRow ? elVatRow.querySelector('td:first-child') : null);
    if (vatLabelEl) {
        if (vatRatesUsed.size === 1) {
            const singleRate = [...vatRatesUsed][0];
            vatLabelEl.textContent = `VAT ${singleRate}%`;
        } else if (vatRatesUsed.size > 1) {
            vatLabelEl.textContent = `VAT (${[...vatRatesUsed].map(r => r + '%').join(', ')})`;
        } else {
            vatLabelEl.textContent = 'VAT 13%';
        }
    }

    if (document.getElementById('p-gross'))     document.getElementById('p-gross').textContent     = fmt(grossAmount);
    if (document.getElementById('p-taxable'))   document.getElementById('p-taxable').textContent   = fmt(taxableBase);
    if (document.getElementById('p-nontaxable'))document.getElementById('p-nontaxable').textContent= fmt(nonTaxableBase);
    if (document.getElementById('p-vatAmount')) document.getElementById('p-vatAmount').textContent = fmt(vatAmount);
    if (document.getElementById('p-total'))     document.getElementById('p-total').textContent     = fmt(receiptNetAmt);

    const pTotalQty = document.getElementById('p-totalQty');
    if (pTotalQty) pTotalQty.textContent = totalQty % 1 === 0 ? String(totalQty) : fmt(totalQty);
    
    // Apply custom header labels
    applyReceiptSettings();

    // Encapsulated Save Logic — defined BEFORE the if/else so both branches can call it
    const saveSaleRecord = () => {
        console.log('Saving sale after confirmed print...');

        // If this is an edit, we must first DELETE the old record to restore stock
        let prepareOperation = Promise.resolve();
        if (saleData.isEdit) {
            console.log('Replacing old sale...', saleData.billNo);
            prepareOperation = window.posAPI.deleteSale(saleData.billNo);
        }

        prepareOperation.then(() => {
            // Record the new (or updated) sale
            const recordSale = paymentMode === 'CREDIT'
                ? window.posAPI.createCreditSale(saleData)
                : window.posAPI.createSale(saleData);

            recordSale
                .then(res => {
                    console.log('Sale recorded successfully:', res);

                    // Record audit log
                    if (typeof window.recordAuditLog === 'function') {
                        window.recordAuditLog(cashierName, 'Created Bill', 'Sales', `#${saleData.billNo}`);
                    }

                    // Signal AR reload across tabs/storage
                    try {
                        localStorage.setItem('pos_ar_accounts_sync', Date.now().toString());
                    } catch(e) {}

                    // Update inventory stock locally and via API
                    const stockUpdates = cart.map(item => ({ id: item.id, quantity: item.qty }));
                    window.posAPI.updateStock(stockUpdates);

                    // Update local inventory
                    cart.forEach(cartItem => {
                        const invItem = inventory.find(i => i.id === cartItem.id);
                        if (invItem) invItem.stock = parseFloat(((invItem.stock || 0) - (parseFloat(cartItem.qty) || 0)).toFixed(3));
                    });

                    // Preserve selected payment method and customer info
                    saveCartState();
                    renderCart();
                    renderCartTabs();
                    renderProducts(); // Refresh grid
                    checkStockAlerts();
                })
                .catch(err => {
                    console.error('Sale recording failed:', err);
                });
        }).catch(err => {
            console.error('Sale preparation (delete old) failed:', err);
        });
    };

    // --- New Confirmation Modal Logic ---
    const modal = document.getElementById('saleConfirmModal');
    const billDisplay = document.getElementById('conf-billNo');
    const customerDisplay = document.getElementById('conf-customer');
    const totalDisplay = document.getElementById('conf-total');
    if (modal && billDisplay && customerDisplay && totalDisplay) {
        modal.classList.toggle('cash-tender-active', paymentMode === 'CASH');
        billDisplay.textContent = saleData.billNo;
        customerDisplay.textContent = saleData.customer;
        totalDisplay.textContent = `Rs. ${fmt(saleData.total)}`;

        // Handle Tender Section
        const tenderSection = document.getElementById('tenderSection');
        const tenderInput = document.getElementById('cashTendered');
        const pTenderRow = document.getElementById('p-tender-row');
        const pChangeRow = document.getElementById('p-change-row');
        const pTenderDividerRow = document.getElementById('p-tender-divider-row');

        const quickTenderContainer = document.getElementById('quickTenderContainer');
        const changeSection = document.getElementById('changeSection');
        if (tenderSection && tenderInput) {
            if (paymentMode === 'CASH') {
                tenderSection.style.display = 'flex';
                if (quickTenderContainer) quickTenderContainer.style.display = 'grid';
                if (changeSection) changeSection.style.display = 'flex';
                tenderInput.value = saleData.total.toFixed(2); // Auto-fill full payment
                const changeEl = document.getElementById('conf-change');
                if (changeEl) {
                    changeEl.textContent = 'Rs. 0.00';
                    changeEl.style.color = 'var(--accent-primary)';
                }
                
                renderQuickTenderButtons(saleData.total);

                // Add listener
                tenderInput.oninput = calculateChange;
                calculateChange(); // Initial calc
            } else {
                // Non-CASH (QR CODE, E-Wallet, Credit) — hide all tender UI
                tenderSection.style.display = 'none';
                if (quickTenderContainer) quickTenderContainer.style.display = 'none';
                if (changeSection) changeSection.style.display = 'none';
                if (document.getElementById('p-tendered')) document.getElementById('p-tendered').textContent = fmt(saleData.total);
                if (document.getElementById('p-change')) document.getElementById('p-change').textContent = '0.00';
            }
        }

        // Receipt context for print
        if (pTenderRow && pChangeRow) {
            pTenderRow.classList.remove('hidden-print');
            pChangeRow.classList.remove('hidden-print');
            pTenderRow.style.display = 'table-row';
            pChangeRow.style.display = 'table-row';
            if (pTenderDividerRow) pTenderDividerRow.style.display = 'table-row';
        }

        const finalizeSale = () => {
            // Customer phone validation: if entered, allow between 7 and 20 digits
            const rawCustPhone = (saleData.customerPhone || (els.customerPhone ? els.customerPhone.value : '')).trim();
            const cleanCustPhone = rawCustPhone.replace(/\D/g, '');
            if (rawCustPhone.length > 0 && (cleanCustPhone.length < 7 || cleanCustPhone.length > 20)) {
                alert('Customer phone must be between 7 and 20 digits (or leave blank for walk-in).');
                return;
            }
            if (cleanCustPhone.length >= 7) {
                saleData.customerPhone = cleanCustPhone;
            } else {
                saleData.customerPhone = '';
            }

            if (saleData.isVatInvoice) {
                const cName = (saleData.customer || (els.customerName ? els.customerName.value : '')).trim();
                const cPan = (saleData.customerPAN || (document.getElementById('customerPAN') ? document.getElementById('customerPAN').value : '')).trim();
                if (!cName || !cPan) {
                    alert('Customer Name and PAN are required to generate a Tax Invoice.');
                    return;
                }
                if (cPan.length !== 9) {
                    alert('Customer PAN must be exactly 9 digits to generate a Tax Invoice.');
                    return;
                }
            } else if (saleData.customerPAN && saleData.customerPAN.trim().length !== 9) {
                alert('Customer PAN must be exactly 9 digits.');
                return;
            }

            // Re-validate tender mode for Cash
            if (paymentMode === 'CASH') {
                const tenderedValue = document.getElementById('cashTendered').value;
                const tendered = parseFloat(tenderedValue) || 0;
                const total = saleData.total || 0;

                if (tendered < total || tenderedValue.trim() === '') {
                    alert('Please enter a valid tender amount equal to or greater than the total.');
                    return;
                }

                const change = tendered - total;
                saleData.tendered = tendered;
                saleData.change = Math.max(0, change);

                // Update receipt preview for immediate print
                if (document.getElementById('p-tendered')) document.getElementById('p-tendered').textContent = fmt(tendered);
                if (document.getElementById('p-change')) document.getElementById('p-change').textContent = fmt(Math.max(0, change));
            }

            // Rebuild the receipt from the exact net total that will be saved and printed.
            const finalNetAmount = Number(saleData.total);
            const receiptNetAmount = Number.isFinite(finalNetAmount) ? Math.max(0, finalNetAmount) : 0;
            if (els.pTotal) els.pTotal.textContent = fmt(receiptNetAmount);
            if (els.pTotalWords) els.pTotalWords.textContent = numberToWords(receiptNetAmount);

            closeSaleConfirmModal(false);
            saveSaleRecord(); // Save immediately with updated saleData

            // Trigger Print after a short delay so the modal closes cleanly
            setTimeout(() => {
                window.print();
            }, 300);
        };

        window.finalizeSaleFromQuickTender = finalizeSale;
        const finalizeBtn = document.getElementById('btnFinalizePrint');
        const footer = document.getElementById('confirmSaleFooter');
        if (finalizeBtn) {
            finalizeBtn.onclick = finalizeSale;
            finalizeBtn.style.display = paymentMode === 'CASH' ? 'none' : 'flex';
        }
        if (footer) footer.style.gridTemplateColumns = paymentMode === 'CASH' ? '1fr' : '1fr 2fr';

        modal.classList.add('active');
    } else {
        // Fallback for missing modal elements
        if (confirm("Confirm sale and print?")) {
            saveSaleRecord();
            window.print();
        }
    }

}

let _qrPopupIndex = 0;

function openQRPopup() {
    const modal = document.getElementById('qrPopupModal');
    const container = document.getElementById('qrModalImageContainer');
    if (!modal || !container) return;

    // Get QR list: support new objects, old string arrays, and old single string
    let qrList = storeSettings.paymentQRs || [];
    if (!Array.isArray(qrList)) qrList = [];
    if (qrList.length === 0 && storeSettings.paymentQR) {
        qrList = [{ image: storeSettings.paymentQR, label: '' }];
    }
    // Normalize: ensure all items are objects
    qrList = qrList.map(item => {
        if (typeof item === 'string') return { image: item, label: '' };
        return item;
    });

    if (qrList.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #999; font-size: 0.9rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.75rem; opacity: 0.4;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <br>No QR Code uploaded.<br><span style="font-size: 0.75rem; opacity: 0.7;">Add one in Settings.</span>
        </div>`;
        document.getElementById('qrPrevBtn').style.display = 'none';
        document.getElementById('qrNextBtn').style.display = 'none';
        document.getElementById('qrDots').innerHTML = '';
        document.getElementById('qrCounter').textContent = '';
        document.getElementById('qrLabelText').textContent = '';
    } else {
        window._qrPopupList = qrList;
        _qrPopupIndex = 0;
        renderQRSlide();
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
}

function renderQRSlide() {
    const qrs = window._qrPopupList || [];
    if (qrs.length === 0) return;

    const container = document.getElementById('qrModalImageContainer');
    const counter = document.getElementById('qrCounter');
    const prevBtn = document.getElementById('qrPrevBtn');
    const nextBtn = document.getElementById('qrNextBtn');
    const dotsContainer = document.getElementById('qrDots');
    const labelEl = document.getElementById('qrLabelText');

    const current = qrs[_qrPopupIndex];

    // Render image
    container.innerHTML = `<img src="${current.image}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">`;

    // Label
    if (labelEl) {
        labelEl.textContent = current.label || '';
        labelEl.style.display = current.label ? 'block' : 'none';
    }

    // Counter
    if (qrs.length > 1) {
        counter.textContent = `${_qrPopupIndex + 1} / ${qrs.length}`;
    } else {
        counter.textContent = '';
    }

    // Navigation arrows
    if (qrs.length > 1) {
        prevBtn.style.display = _qrPopupIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = _qrPopupIndex < qrs.length - 1 ? 'flex' : 'none';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    // Dot indicators
    if (qrs.length > 1) {
        dotsContainer.innerHTML = qrs.map((_, i) =>
            `<div onclick="navigateQRTo(${i})" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === _qrPopupIndex ? 'var(--accent-primary)' : 'var(--border-light)'}; cursor: pointer; transition: background 0.2s;"></div>`
        ).join('');
    } else {
        dotsContainer.innerHTML = '';
    }
}

function navigateQR(direction) {
    const qrs = window._qrPopupList || [];
    const newIndex = _qrPopupIndex + direction;
    if (newIndex < 0 || newIndex >= qrs.length) return;
    _qrPopupIndex = newIndex;
    renderQRSlide();
}

function navigateQRTo(index) {
    const qrs = window._qrPopupList || [];
    if (index < 0 || index >= qrs.length) return;
    _qrPopupIndex = index;
    renderQRSlide();
}

function closeQRPopup() {
    const modal = document.getElementById('qrPopupModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}


// --- Multi-Cart Functions ---

let activePopoverCleanup = null;

function showCartTabPopover({ targetTabElement, message, actionLabel, actionClass, onAction }) {
    dismissCartTabPopovers();

    const popover = document.createElement('div');
    popover.id = 'cartTabPopover';
    popover.className = 'cart-tab-popover';
    popover.innerHTML = `
        <div class="cart-tab-popover-title">${message}</div>
        <div class="cart-tab-popover-btns">
            <button type="button" class="btn btn-secondary btn-sm" id="cartTabPopoverCancel">Cancel</button>
            <button type="button" class="btn ${actionClass || 'btn-danger'} btn-sm" id="cartTabPopoverAction">${actionLabel}</button>
        </div>
    `;

    document.body.appendChild(popover);

    if (targetTabElement) {
        const rect = targetTabElement.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        let left = rect.left;
        if (left + popoverRect.width > window.innerWidth - 10) {
            left = window.innerWidth - popoverRect.width - 10;
        }
        if (left < 10) left = 10;

        let top = rect.bottom + 6;
        if (top + popoverRect.height > window.innerHeight - 10) {
            top = rect.top - popoverRect.height - 6;
        }

        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }

    const actionBtn = document.getElementById('cartTabPopoverAction');
    if (actionBtn) {
        const handleAction = (e) => {
            if (e) {
                e.stopPropagation();
                if (e.preventDefault) e.preventDefault();
            }
            dismissCartTabPopovers();
            if (typeof onAction === 'function') onAction();
        };
        actionBtn.addEventListener('click', handleAction);
        actionBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    const cancelBtn = document.getElementById('cartTabPopoverCancel');
    if (cancelBtn) {
        const handleCancel = (e) => {
            if (e) {
                e.stopPropagation();
                if (e.preventDefault) e.preventDefault();
            }
            dismissCartTabPopovers();
        };
        cancelBtn.addEventListener('click', handleCancel);
        cancelBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    popover.addEventListener('pointerdown', (e) => e.stopPropagation());

    setTimeout(() => {
        const outsideClickListener = (e) => {
            if (popover && !popover.contains(e.target) && (!targetTabElement || !targetTabElement.contains(e.target))) {
                dismissCartTabPopovers();
            }
        };
        document.addEventListener('pointerdown', outsideClickListener, { passive: true });
        activePopoverCleanup = () => {
            document.removeEventListener('pointerdown', outsideClickListener);
        };
    }, 40);
}

function dismissCartTabPopovers(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    if (activePopoverCleanup) {
        activePopoverCleanup();
        activePopoverCleanup = null;
    }
    const existing = document.getElementById('cartTabPopover');
    if (existing) existing.remove();
}

function attachCartTabInteractions(container) {
    if (!container) return;

    container.querySelectorAll('.cart-tab').forEach(tab => {
        const cartId = parseInt(tab.dataset.cartId);
        if (isNaN(cartId)) return;

        let pressTimer = null;
        let isLongPressTriggered = false;
        let startX = 0;
        let startY = 0;
        let activePointerId = null;

        const cancelHold = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            tab.classList.remove('long-pressing');
            if (activePointerId !== null) {
                try {
                    if (tab.releasePointerCapture) tab.releasePointerCapture(activePointerId);
                } catch (_) {}
                activePointerId = null;
            }
        };

        tab.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target.closest('.cart-tab-close')) return;

            cancelHold();
            isLongPressTriggered = false;
            startX = e.clientX;
            startY = e.clientY;
            activePointerId = e.pointerId;

            // Delete / Clear only allowed on the CURRENTLY OPEN / active cart tab
            if (cartId !== currentCartId) {
                return;
            }

            try {
                if (tab.setPointerCapture && e.pointerId !== undefined) {
                    tab.setPointerCapture(e.pointerId);
                }
            } catch (_) {}

            tab.classList.add('long-pressing');

            pressTimer = setTimeout(() => {
                isLongPressTriggered = true;
                tab.classList.remove('long-pressing');
                if (navigator.vibrate) {
                    try { navigator.vibrate(40); } catch (_) {}
                }

                const targetCart = carts.find(c => c.id == cartId);
                if (targetCart && targetCart.id === currentCartId) {
                    const itemCount = targetCart.items ? targetCart.items.length : 0;
                    const itemWord = itemCount === 1 ? 'item' : 'items';
                    showCartTabPopover({
                        targetTabElement: tab,
                        message: `Clear ${itemCount} ${itemWord} from ${targetCart.name}?`,
                        actionLabel: 'Clear',
                        actionClass: 'btn-danger',
                        onAction: () => clearCartTab(cartId)
                    });
                }
            }, 600);
        });

        tab.addEventListener('pointermove', (e) => {
            if (pressTimer) {
                const diffX = Math.abs(e.clientX - startX);
                const diffY = Math.abs(e.clientY - startY);
                if (diffX > 16 || diffY > 16) {
                    cancelHold();
                }
            }
        });

        tab.addEventListener('pointerup', (e) => {
            const wasHolding = pressTimer !== null;
            cancelHold();

            if (e.target.closest('.cart-tab-close')) return;

            // If tapped on an inactive tab, switch to it immediately
            if (cartId !== currentCartId) {
                switchCart(cartId);
            }
        });

        tab.addEventListener('pointercancel', cancelHold);
        tab.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse') cancelHold();
        });
        tab.addEventListener('contextmenu', (e) => {
            if (isLongPressTriggered) {
                e.preventDefault();
            }
        });
    });

    container.querySelectorAll('.cart-tab-close').forEach(closeBtn => {
        closeBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        closeBtn.addEventListener('pointerup', (e) => {
            e.stopPropagation();
        });
    });
}

function clearCartTab(id) {
    dismissCartTabPopovers();
    const numId = parseInt(id);
    const targetCart = carts.find(c => c.id == numId);
    if (!targetCart) return;

    // Clear only operates on the currently open / active cart
    if (targetCart.id != currentCartId) return;

    targetCart.items = [];
    targetCart.customerName = '';
    targetCart.customerAddress = '';
    targetCart.customerPhone = '';
    targetCart.customerPAN = '';
    targetCart.generateVatInvoice = false;
    targetCart.paymentMode = '';

    if (targetCart.isEdit) {
        delete targetCart.isEdit;
        delete targetCart.originalBillNo;
        delete targetCart.originalTimestamp;
        if (targetCart.name && targetCart.name.startsWith('Edit #')) {
            targetCart.name = `Cart ${targetCart.id}`;
        }
    }

    cart = targetCart.items;
    resetClearButtonUI();
    if (els.customerName) els.customerName.value = '';
    if (els.customerAddress) els.customerAddress.value = '';
    if (els.customerPhone) els.customerPhone.value = '';
    const panInputClear = document.getElementById('customerPAN');
    if (panInputClear) panInputClear.value = '';
    const vatInvoiceCheck = document.getElementById('generateVatInvoice');
    if (vatInvoiceCheck) vatInvoiceCheck.checked = false;
    if (els.paymentMode) els.paymentMode.value = '';
    updateCustomerDisplay();
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    renderCart();

    saveCartState();
    renderCartTabs(false, true);
}

function renderCartTabs(scrollToEnd = false, preserveScroll = false) {
    const container = document.getElementById('cartTabs');
    if (!container) return;

    const savedScrollLeft = container.scrollLeft;

    // Maintain responsive + button
    const plusBtn = `<button class="cart-tab-plus" onclick="createNewCart()" title="Add New Cart">+</button>`;

    const tabsHtml = carts.map((c, idx) => {
        const isActive = c.id == currentCartId;
        // Delete button (×) ONLY shows on the currently open / active cart tab
        const canDelete = isActive && carts.length > 1 && idx !== 0 && c.id !== 1;

        return `
            <div class="cart-tab ${isActive ? 'active' : ''}" 
                 data-cart-id="${c.id}">
                <span class="cart-tab-title">${c.name} (${c.items.length})</span>
                ${canDelete ? `<span class="cart-tab-close" onclick="closeCart(${c.id}, event)" title="Close Cart">&times;</span>` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = tabsHtml + plusBtn;

    attachCartTabInteractions(container);

    requestAnimationFrame(() => {
        if (scrollToEnd) {
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        } else if (preserveScroll) {
            container.scrollLeft = savedScrollLeft;
        } else {
            const activeTab = container.querySelector('.cart-tab.active');
            if (activeTab) {
                const cLeft = container.scrollLeft;
                const cRight = cLeft + container.clientWidth;
                const eLeft = activeTab.offsetLeft;
                const eRight = eLeft + activeTab.offsetWidth;
                if (eLeft < cLeft) {
                    container.scrollTo({ left: Math.max(0, eLeft - 10), behavior: 'smooth' });
                } else if (eRight > cRight) {
                    container.scrollTo({ left: eRight - container.clientWidth + 10, behavior: 'smooth' });
                }
            }
        }
    });
}

function reindexCarts() {
    const activeCart = carts.find(c => c.id == currentCartId);

    carts.forEach((c, idx) => {
        const newSerial = idx + 1;
        c.id = newSerial;
        if (!c.isEdit && (!c.name || /^Cart \d+$/i.test(c.name.trim()))) {
            c.name = `Cart ${newSerial}`;
        }
    });

    if (activeCart) {
        currentCartId = activeCart.id;
    } else if (carts.length > 0) {
        currentCartId = carts[0].id;
    }
}

function createNewCart() {
    // Save current cart's PAN before creating a new one
    const panInput = document.getElementById('customerPAN');
    const addrInput = document.getElementById('customerAddress');
    const currentOld = carts.find(c => c.id == currentCartId);
    if (currentOld && panInput) currentOld.customerPAN = panInput.value;
    if (currentOld && addrInput) currentOld.customerAddress = addrInput.value;

    const newId = carts.length + 1;
    const newCart = {
        id: newId,
        name: `Cart ${newId}`,
        items: [],
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        customerPAN: '',
        paymentMode: '',
        isBulkMode: false
    };
    carts.push(newCart);
    reindexCarts();
    saveCartState();
    switchCart(newCart.id, true);
}

function switchCart(id, scrollToEnd = false) {
    if (id == currentCartId) return;

    // Save current UI state (including PAN) to the old cart
    const oldCart = carts.find(c => c.id == currentCartId);
    if (oldCart) {
        if (els.customerName) oldCart.customerName = els.customerName.value;
        if (els.customerAddress) oldCart.customerAddress = els.customerAddress.value;
        if (els.customerPhone) oldCart.customerPhone = els.customerPhone.value;
        const panInputSwitch = document.getElementById('customerPAN');
        if (panInputSwitch) oldCart.customerPAN = panInputSwitch.value;
        if (els.paymentMode) oldCart.paymentMode = els.paymentMode.value;
    }

    currentCartId = parseInt(id);
    const newCart = carts.find(c => c.id == currentCartId);

    if (!newCart) {
        console.error("Cart not found:", currentCartId);
        return;
    }

    // Update global cart reference
    cart = newCart.items;

    // Restore UI
    resetClearButtonUI();
    if (els.customerName) els.customerName.value = newCart.customerName || '';
    if (els.customerAddress) els.customerAddress.value = newCart.customerAddress || '';
    if (els.customerPhone) els.customerPhone.value = newCart.customerPhone || '';
    const panInputRestore = document.getElementById('customerPAN');
    if (panInputRestore) panInputRestore.value = newCart.customerPAN || '';
    if (els.paymentMode) els.paymentMode.value = newCart.paymentMode || '';
    updateCustomerDisplay();

    // Restore Bulk Mode Toggle
    const bulkToggle = document.getElementById('bulkModeToggle');
    if (bulkToggle) bulkToggle.checked = !!newCart.isBulkMode;

    handleCustomerPhoneLookup();

    // Update Payment Buttons Visual State
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
        const txt = btn.innerText.trim().toUpperCase();
        let mode = '';
        if (txt.includes('CASH')) mode = 'CASH';
        else if (txt.includes('E-WALLET') || txt.includes('ESEWA')) mode = 'ESEWA';
        else if (txt.includes('CREDIT')) mode = 'CREDIT';
        else if (txt.includes('QR')) mode = 'QR CODE';

        if (newCart.paymentMode && newCart.paymentMode === mode) btn.classList.add('active');
    });

    saveCartState();
    renderCart();
    renderCartTabs(scrollToEnd);

    if (!scrollToEnd) {
        requestAnimationFrame(() => {
            const container = document.getElementById('cartTabs');
            const activeTab = container ? container.querySelector('.cart-tab.active') : null;
            if (activeTab && container) {
                const cLeft = container.scrollLeft;
                const cRight = cLeft + container.clientWidth;
                const eLeft = activeTab.offsetLeft;
                const eRight = eLeft + activeTab.offsetWidth;
                if (eLeft < cLeft) {
                    container.scrollLeft = eLeft;
                } else if (eRight > cRight) {
                    container.scrollLeft = eRight - container.clientWidth;
                }
            }
        });
    }
}

function closeCart(id, event) {
    if (event) {
        event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
    }
    dismissCartTabPopovers();

    const numId = parseInt(id);
    if (isNaN(numId)) return;

    // Delete only works on the CURRENTLY OPEN / active cart
    if (numId !== currentCartId) return;

    // Feature 3: Minimum cart protection (Cart 1 or first cart is permanent)
    if (numId === 1 || carts.length <= 1 || (carts[0] && carts[0].id === numId)) {
        return;
    }

    const targetCart = carts.find(c => c.id === numId);
    if (!targetCart) return;

    // Feature 2: If 0 items -> single tap deletes immediately
    if (!targetCart.items || targetCart.items.length === 0) {
        executeCloseCart(numId);
        return;
    }

    // Feature 2: If 1+ items -> single tap shows confirmation
    const tabEl = document.querySelector(`.cart-tab[data-cart-id="${numId}"]`);
    const itemCount = targetCart.items.length;
    const itemWord = itemCount === 1 ? 'item' : 'items';
    showCartTabPopover({
        targetTabElement: tabEl,
        message: `Delete ${targetCart.name} with ${itemCount} ${itemWord}?`,
        actionLabel: 'Delete',
        actionClass: 'btn-danger',
        onAction: () => executeCloseCart(numId)
    });
}

function cancelCloseCart(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    dismissCartTabPopovers();
}

function executeCloseCart(id, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    dismissCartTabPopovers();

    const numId = parseInt(id);
    if (isNaN(numId)) return;
    if (numId === 1 || carts.length <= 1 || (carts[0] && carts[0].id === numId)) return; // Cart 1 / first cart is permanent

    let targetActiveCart = carts.find(c => c.id === currentCartId);
    if (numId === currentCartId) {
        const idx = carts.findIndex(c => c.id === numId);
        targetActiveCart = carts[idx + 1] || carts[idx - 1] || carts[0];
    }

    // Remove the deleted cart
    carts = carts.filter(c => c.id !== numId);

    if (carts.length === 0) {
        carts = [{ id: 1, name: 'Cart 1', items: [], customerName: '', customerAddress: '', customerPhone: '', customerPAN: '', paymentMode: '', isBulkMode: false }];
        targetActiveCart = carts[0];
    }

    if (targetActiveCart) {
        currentCartId = targetActiveCart.id;
    }

    // Renumber remaining carts serially (1, 2, 3, 4...)
    reindexCarts();
    saveCartState();

    // Ensure active cart is loaded and displayed
    const active = carts.find(c => c.id === currentCartId) || carts[0];
    currentCartId = active.id;
    cart = active.items;

    // Restore UI for active cart
    resetClearButtonUI();
    if (els.customerName) els.customerName.value = active.customerName || '';
    if (els.customerAddress) els.customerAddress.value = active.customerAddress || '';
    if (els.customerPhone) els.customerPhone.value = active.customerPhone || '';
    const panInputRestore2 = document.getElementById('customerPAN');
    if (panInputRestore2) panInputRestore2.value = active.customerPAN || '';
    const vatInvoiceCheckRestore = document.getElementById('generateVatInvoice');
    if (vatInvoiceCheckRestore) vatInvoiceCheckRestore.checked = !!active.generateVatInvoice;
    if (els.paymentMode) els.paymentMode.value = active.paymentMode || '';
    updateCustomerDisplay();

    // Restore Bulk Mode Toggle
    const bulkToggle = document.getElementById('bulkModeToggle');
    if (bulkToggle) bulkToggle.checked = !!active.isBulkMode;

    handleCustomerPhoneLookup();

    // Restore Payment Buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
        const txt = btn.innerText.trim().toUpperCase();
        let mode = '';
        if (txt.includes('CASH')) mode = 'CASH';
        else if (txt.includes('E-WALLET') || txt.includes('ESEWA')) mode = 'ESEWA';
        else if (txt.includes('CREDIT')) mode = 'CREDIT';
        else if (txt.includes('QR')) mode = 'QR CODE';

        if (active.paymentMode && active.paymentMode === mode) btn.classList.add('active');
    });

    renderCart();
    renderCartTabs(false, true);
}

// Notification re-check after inventory load moved to notifications.js via focus event or direct call if needed

function saveCartState() {
    localStorage.setItem(getCartStorageKey(), JSON.stringify({
        carts: carts,
        currentCartId: currentCartId
    }));
}

function loadCartState() {
    const stored = localStorage.getItem(getCartStorageKey()) || localStorage.getItem(STORAGE_CART_STATE_KEY);
    if (stored) {
        try {
            const state = JSON.parse(stored);
            if (state.carts && Array.isArray(state.carts) && state.carts.length > 0) {
                carts = state.carts;
                currentCartId = parseInt(state.currentCartId) || 1;
                reindexCarts();
            }
        } catch (e) {
            console.error("Failed to load cart state", e);
        }
    }

    // Ensure cart ref is correct
    const active = carts.find(c => c.id == currentCartId);
    cart = active ? active.items : carts[0].items;

    // Restore inputs immediately if possible
    if (active) {
        if (els.customerName) els.customerName.value = active.customerName || '';
        if (els.customerAddress) els.customerAddress.value = active.customerAddress || '';
        if (els.customerPhone) els.customerPhone.value = active.customerPhone || '';
        const panInput = document.getElementById('customerPAN');
        if (panInput) panInput.value = active.customerPAN || '';
        const vatInvoiceCheck = document.getElementById('generateVatInvoice');
        if (vatInvoiceCheck) vatInvoiceCheck.checked = !!active.generateVatInvoice;
        updateCustomerDisplay();

        const restoredMode = active.paymentMode || '';
        if (els.paymentMode) els.paymentMode.value = restoredMode;
        active.paymentMode = restoredMode;

        // Restore payment buttons
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.classList.remove('active');
            const txt = btn.innerText.trim().toUpperCase();
            let mode = '';
            if (txt.includes('CASH')) mode = 'CASH';
            else if (txt.includes('E-WALLET') || txt.includes('ESEWA')) mode = 'ESEWA';
            else if (txt.includes('CREDIT')) mode = 'CREDIT';
            else if (txt.includes('QR')) mode = 'QR CODE';

            if (restoredMode && restoredMode === mode) btn.classList.add('active');
        });

        // Restore Bulk Mode Toggle
        const bulkToggle = document.getElementById('bulkModeToggle');
        if (bulkToggle) bulkToggle.checked = !!active.isBulkMode;

        handleCustomerPhoneLookup();
    }
}

// Notification panel functions moved to notifications.js

function updateCategoryCounts() {
    renderCategoryTabs();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Global exposure for onclick handlers
window.filterByCategory = filterByCategory;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
window.setPaymentMode = setPaymentMode;
window.checkout = checkout;
window.closeSaleConfirmModal = closeSaleConfirmModal;
window.manualQty = manualQty;
window.manualQtyLive = manualQtyLive;
window.openCategoryOrderModal = openCategoryOrderModal;
window.closeCategoryOrderModal = closeCategoryOrderModal;
window.createNewCart = createNewCart;
window.switchCart = switchCart;
window.closeCart = closeCart;
window.executeCloseCart = executeCloseCart;
window.cancelCloseCart = cancelCloseCart;
window.clearCartTab = clearCartTab;
window.dismissCartTabPopovers = dismissCartTabPopovers;
window.moveCategory = moveCategory;
window.adjustQtyDecimal = adjustQtyDecimal;

// --- Inline Customer Info ---
let _customerPhoneLookupTimer = null;

function handleCustomerPhoneLookup() {
    clearTimeout(_customerPhoneLookupTimer);
    const phoneInput = els.customerPhone || document.getElementById('customerPhone');
    const infoEl = document.getElementById('customerLookupInfo');
    if (!phoneInput) return;

    const rawVal = phoneInput.value || '';
    const digits = rawVal.replace(/\D/g, '').trim();

    if (digits.length < 7) {
        if (infoEl) {
            infoEl.style.display = 'none';
            infoEl.innerHTML = '';
        }
        return;
    }

    _customerPhoneLookupTimer = setTimeout(() => {
        if (!window.posAPI || typeof window.posAPI.getCustomerByPhone !== 'function') return;
        window.posAPI.getCustomerByPhone(digits).then(cust => {
            const currentDigits = (phoneInput.value || '').replace(/\D/g, '').trim();
            if (currentDigits !== digits) return;

            if (cust) {
                const nameInput = els.customerName || document.getElementById('customerName');
                if (nameInput) {
                    const curName = nameInput.value.trim();
                    if (!curName || curName.toLowerCase() === 'walk-in' || curName.toLowerCase() === 'customer') {
                        nameInput.value = cust.name || cust.customerName || '';
                        saveCustomerInfo();
                    }
                }
                const addrInput = els.customerAddress || document.getElementById('customerAddress');
                if (addrInput && !addrInput.value.trim() && (cust.address || cust.customerAddress)) {
                    addrInput.value = cust.address || cust.customerAddress;
                    saveCustomerInfo();
                }
                const panInput = document.getElementById('customerPAN');
                if (panInput && !panInput.value.trim() && (cust.pan || cust.customerPAN)) {
                    panInput.value = cust.pan || cust.customerPAN;
                    saveCustomerInfo();
                }

                if (infoEl) {
                    const visits = cust.visitCount || 1;
                    const spent = typeof fmt === 'function' ? fmt(cust.totalSpent || 0) : Number(cust.totalSpent || 0).toFixed(2);
                    const due = parseFloat(cust.creditDue || cust.totalBalance || 0);

                    let html = `<div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="color:var(--accent-primary, #6366f1); font-weight:600;">👤 Returning customer — ${visits} ${visits === 1 ? 'visit' : 'visits'}, Rs. ${spent} total spent</span>`;
                    if (due > 0) {
                        const dueFmt = typeof fmt === 'function' ? fmt(due) : due.toFixed(2);
                        html += `<span style="color:#ef4444; font-weight:700;">⚠️ Outstanding credit: Rs. ${dueFmt}</span>`;
                    }
                    html += `</div>`;
                    infoEl.innerHTML = html;
                    infoEl.style.display = 'block';
                }
            } else {
                if (infoEl) {
                    infoEl.style.display = 'none';
                    infoEl.innerHTML = '';
                }
            }
        }).catch(err => {
            console.error('Customer phone lookup error:', err);
            if (infoEl) {
                infoEl.style.display = 'none';
                infoEl.innerHTML = '';
            }
        });
    }, 250);
}

function updateCustomerDisplay() {
    const display = document.getElementById('customerDisplayName');
    const name = els.customerName ? els.customerName.value.trim() : '';
    const label = document.getElementById('customerInfoLabel');
    if (display) display.textContent = '';
    if (label) label.textContent = `👤${name ? ` ${name}` : ''}`;
}

function toggleCustomerInfo(forceOpen) {
    const panel = document.getElementById('customerInfoAccordion');
    const arrow = document.getElementById('customerInfoArrow');
    if (!panel) return;
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('open');
    panel.classList.toggle('open', isOpen);
    panel.setAttribute('aria-hidden', String(!isOpen));
    if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
}

function saveCustomerInfo() {
    const active = carts.find(c => c.id == currentCartId);
    if (!active) return;
    active.customerName = els.customerName ? els.customerName.value.trim() : '';
    active.customerAddress = els.customerAddress ? els.customerAddress.value.trim() : (document.getElementById('customerAddress') ? document.getElementById('customerAddress').value.trim() : '');
    active.customerPhone = els.customerPhone ? els.customerPhone.value : '';
    active.customerPAN = document.getElementById('customerPAN') ? document.getElementById('customerPAN').value : '';
    active.generateVatInvoice = !!document.getElementById('generateVatInvoice')?.checked;
    saveCartState();
    updateCustomerDisplay();
}

function initCustomerInfo() {
    const panel = document.getElementById('customerInfoAccordion');
    if (!panel || panel.dataset.ready === 'true') return;
    panel.dataset.ready = 'true';
    panel.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            saveCustomerInfo();
            if (input.id === 'customerPhone') handleCustomerPhoneLookup();
        });
        input.addEventListener('change', () => {
            saveCustomerInfo();
            if (input.id === 'customerPhone') handleCustomerPhoneLookup();
        });
    });
}

function clearCustomerField(id) {
    const field = document.getElementById(id);
    if (!field) return;
    field.value = '';
    if (id === 'customerPhone') {
        const infoEl = document.getElementById('customerLookupInfo');
        if (infoEl) {
            infoEl.style.display = 'none';
            infoEl.innerHTML = '';
        }
    }
    saveCustomerInfo();
    field.focus();
}

window.toggleCustomerInfo = toggleCustomerInfo;
window.clearCustomerField = clearCustomerField;
window.clearConfirmDiscount = clearConfirmDiscount;
window.handleCustomerPhoneLookup = handleCustomerPhoneLookup;

// --- Smart Bulk Modal ---
let currentBulkProductId = null;
let currentBulkCartIndex = null;
let isBulkReverseAmountMode = false;

function getCurrentBulkRate() {
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
}

function openSmartBulkModal(productId, cartIndex = null) {
    const item = inventory.find(i => i.id === productId);
    if (!item) return;

    currentBulkProductId = productId;
    currentBulkCartIndex = cartIndex;
    isBulkReverseAmountMode = false;

    document.getElementById('bulkProductName').textContent = item.name;
    document.getElementById('bulkProductRetail').textContent = `Retail Price: Rs. ${fmt(item.price)}`;
    const stockEl = document.getElementById('bulkProductStock');
    if (stockEl) {
        const unitStr = item.unit ? ` ${item.unit.trim()}` : '';
        stockEl.textContent = `Available Stock: ${item.stock !== undefined && item.stock !== null ? item.stock : 0}${unitStr}`;
        if ((item.stock || 0) <= 5) {
            stockEl.style.color = '#ef4444';
            stockEl.style.fontWeight = '600';
        } else {
            stockEl.style.color = 'var(--text-muted)';
            stockEl.style.fontWeight = 'normal';
        }
    }
    const qtyEl = document.getElementById('bulkQty');
    const rateEl = document.getElementById('bulkRate');
    const amountEl = document.getElementById('bulkAmount');
    if (amountEl) amountEl.value = '';

    if (cartIndex !== null) {
        // Opened from cart item — show its exact qty and rate
        const cartItem = cart[cartIndex];
        if (qtyEl) qtyEl.value = cartItem.qty;
        // Show custom rate only if it differs from retail price
        if (rateEl) rateEl.value = cartItem.price;
    } else {
        // Opened from product grid — check if item already exists in cart
        const existingIdx = cart.findIndex(i => i.id === productId);
        if (existingIdx !== -1) {
            // Pre-fill with current cart values and treat as an update
            const existingItem = cart[existingIdx];
            currentBulkCartIndex = existingIdx;
            if (qtyEl) qtyEl.value = existingItem.qty;
            if (rateEl) rateEl.value = existingItem.price;
        } else {
            // Fresh add — default qty 1, no custom rate
            if (qtyEl) qtyEl.value = '';
            if (rateEl) rateEl.value = item.price;
        }
    }

    handleBulkQtyInput(); // Calculates subtotal and scales font size if needed

    const modal = document.getElementById('smartBulkModal');
    if (modal) modal.classList.add('active');

    // Ensure search input loses focus when modal opens. Do not auto-focus qty to avoid popup keyboards.
    setTimeout(() => {
        if (els.search) els.search.blur();
        const qtyEl = document.getElementById('bulkQty');
        if (qtyEl) qtyEl.blur();
    }, 100);
}

function closeSmartBulkModal() {
    const modal = document.getElementById('smartBulkModal');
    if (modal) modal.classList.remove('active');
    currentBulkProductId = null;
    currentBulkCartIndex = null;
    isBulkReverseAmountMode = false;
}

function addBulkQty(val, isStep = false) {
    const input = document.getElementById('bulkQty');
    if (!input) return;

    let current = parseFloat(input.value) || 0;
    let newVal;

    if (isStep) {
        if (val === 1) {
            // + button: Step up by 1, keep decimal
            newVal = parseFloat((current + 1).toFixed(2));
        } else if (val === -1) {
            // - button: Step down by 1 if above 1, floor at 1
            if (current > 1.99) {
                newVal = parseFloat((current - 1).toFixed(2));
            } else {
                // If at 1 or between 1 and 2, stay at current (or floor to 1 if user prefers)
                // Based on "From 1 -> 1", we stay at 1.
                newVal = current > 1 ? 1 : current;
            }
        }
    } else {
        // Quick-selection buttons (decimal OR integer replacement)
        if (val > 0 && val < 1) {
            // Decimal buttons (0.1 - 0.9): Replace the fractional part
            newVal = parseFloat((Math.floor(current) + val).toFixed(2));
        } else {
            // Integer buttons (1, 2, 5, 10, etc.): Replace the whole number part
            // Example: 1.5 -> click 2 -> 2.5
            newVal = parseFloat((val + (current % 1)).toFixed(2));
        }
    }

    if (newVal < 0.1) newVal = 0.1;
    input.value = parseFloat(newVal.toFixed(2)).toString();
    handleBulkQtyInput();
}

function setBulkRateOffset(offset) {
    const item = inventory.find(i => i.id === currentBulkProductId);
    if (!item) return;

    const input = document.getElementById('bulkRate');
    if (input) {
        input.value = Math.max(0, item.price - offset);
        handleBulkRateInput();
    }
}

function adjustBulkRate(delta) {
    const input = document.getElementById('bulkRate');
    if (!input) return;

    const currentRate = input.value === '' ? getCurrentBulkRate() : (parseFloat(input.value) || 0);
    input.value = Math.max(0, currentRate + delta);
    handleBulkRateInput();
}

function handleBulkRateInput() {
    if (isBulkReverseAmountMode) {
        calculateReverseBulkQty();
    } else {
        const amountEl = document.getElementById('bulkAmount');
        if (amountEl) amountEl.value = '';
        calculateSmartBulkSubtotal();
    }
}

function handleBulkQtyInput() {
    isBulkReverseAmountMode = false;
    const amountEl = document.getElementById('bulkAmount');
    if (amountEl) amountEl.value = '';
    calculateSmartBulkSubtotal();
}

function calculateSmartBulkSubtotal() {
    const qtyEl = document.getElementById('bulkQty');
    const subtotalEl = document.getElementById('bulkSubtotal');
    const qty = parseFloat(qtyEl?.value) || 0;
    const rate = getCurrentBulkRate();

    const subtotal = qty * rate;
    if (subtotalEl) subtotalEl.textContent = `Rs. ${fmt(subtotal)}`;
}

function calculateReverseBulkQty() {
    const amountEl = document.getElementById('bulkAmount');
    const qtyEl = document.getElementById('bulkQty');
    const subtotalEl = document.getElementById('bulkSubtotal');
    if (!amountEl || !qtyEl) return;

    isBulkReverseAmountMode = true;
    const amount = parseFloat(amountEl.value);
    const rate = getCurrentBulkRate();

    if (isNaN(amount) || amount <= 0 || rate <= 0) {
        qtyEl.value = '';
        if (subtotalEl) subtotalEl.textContent = `Rs. ${fmt(0)}`;
        return;
    }

    const qty = amount / rate;
    qtyEl.value = parseFloat(qty.toFixed(3)).toString();
    if (subtotalEl) subtotalEl.textContent = `Rs. ${fmt(amount)}`;
}

function addSmartBulkToCart() {
    if (!currentBulkProductId) return;

    const qty = parseFloat(document.getElementById('bulkQty').value);
    const rateInput = document.getElementById('bulkRate').value;
    const item = inventory.find(i => i.id === currentBulkProductId);

    if (!item) return;

    // If rate is empty, fallback to default price
    const rate = rateInput === '' ? item.price : parseFloat(rateInput);

    if (isNaN(qty) || qty <= 0) {
        alert("Please enter a valid quantity greater than 0.");
        return;
    }

    if (isNaN(rate) || rate < 0) {
        alert("Please enter a valid rate.");
        return;
    }

    if (qty > item.stock) {
        alert("Insufficient stock!");
        return;
    }

    const isBulk = (rate !== item.price);

    if (currentBulkCartIndex !== null) {
        // Update specific cart item
        cart[currentBulkCartIndex].qty = qty;
        cart[currentBulkCartIndex].price = rate;
        cart[currentBulkCartIndex].originalPrice = item.price;
        cart[currentBulkCartIndex].isBulk = isBulk;
    } else {
        const cartItemIdx = cart.findIndex(i => i.id === currentBulkProductId);
        if (cartItemIdx !== -1) {
            cart[cartItemIdx].qty = qty;
            cart[cartItemIdx].price = rate;
            cart[cartItemIdx].originalPrice = item.price;
            cart[cartItemIdx].isBulk = isBulk;
            lastAddedIndex = cartItemIdx;
        } else {
            cart.push({ ...item, qty: qty, price: rate, originalPrice: item.price, isBulk: isBulk });
            lastAddedIndex = cart.length - 1;
        }
    }

    closeSmartBulkModal();
    renderCart();
    renderCartTabs();
    saveCartState();

    // Clear search and reset view if a search was active
    if (els.search && els.search.value) {
        els.search.value = '';
        renderProducts('');
    }
}

// Expose globally for HTML
window.openSmartBulkModal = openSmartBulkModal;
window.closeSmartBulkModal = closeSmartBulkModal;
window.addBulkQty = addBulkQty;
window.calculateSmartBulkSubtotal = calculateSmartBulkSubtotal;
window.calculateReverseBulkQty = calculateReverseBulkQty;
window.handleBulkRateInput = handleBulkRateInput;
window.handleBulkQtyInput = handleBulkQtyInput;
window.addSmartBulkToCart = addSmartBulkToCart;
window.setBulkRateOffset = setBulkRateOffset;

function toggleCartPanel() {
    const cartPanel = document.querySelector('.cart-panel');
    if (cartPanel) {
        cartPanel.classList.toggle('active');
    }
}
window.toggleCartPanel = toggleCartPanel;

function initCartPanelResize() {
    const cartPanel = document.querySelector('.cart-panel');
    const handle = document.querySelector('.cart-resize-handle');
    if (!cartPanel || !handle) return;

    // Restore saved width on load
    const savedWidth = localStorage.getItem('pos_cart_panel_width');
    if (savedWidth && window.innerWidth > 768) {
        cartPanel.style.width = savedWidth;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const getClientX = (event) => {
        const touch = event.touches && event.touches[0];
        return touch ? touch.clientX : event.clientX;
    };

    const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;
        cartPanel.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Save the width so it persists across page loads
        localStorage.setItem('pos_cart_panel_width', cartPanel.style.width);
    };

    const resizeCart = (event) => {
        if (!isResizing) return;
        const minWidth = 280;
        const maxWidth = window.innerWidth * 0.6;
        const nextWidth = startWidth + (startX - getClientX(event));
        const clampedWidth = Math.min(maxWidth, Math.max(minWidth, nextWidth));
        cartPanel.style.width = `${clampedWidth}px`;
        event.preventDefault();
    };

    const startResize = (event) => {
        if (window.innerWidth <= 768) return;
        isResizing = true;
        startX = getClientX(event);
        startWidth = cartPanel.getBoundingClientRect().width;
        cartPanel.classList.add('is-resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        event.preventDefault();
    };

    const resetMobileWidth = () => {
        if (window.innerWidth <= 768) {
            cartPanel.style.width = '';
            stopResize();
        } else {
            const saved = localStorage.getItem('pos_cart_panel_width');
            if (saved && !cartPanel.style.width) {
                cartPanel.style.width = saved;
            }
        }
    };

    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });
    document.addEventListener('mousemove', resizeCart);
    document.addEventListener('touchmove', resizeCart, { passive: false });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);
    window.addEventListener('resize', resetMobileWidth);
}

// --- Responsive Search Bar Positioning ---
function handleResponsiveSearch() {
    const container = document.getElementById('productSearchContainer');
    const header = document.getElementById('headerSearchTarget');
    const mobile = document.getElementById('mobileSearchTarget');
    if (!container || !header || !mobile) return;

    if (window.innerWidth <= 768) {
        if (!mobile.contains(container)) mobile.appendChild(container);
    } else {
        if (!header.contains(container)) header.appendChild(container);
    }
}

window.addEventListener('resize', handleResponsiveSearch);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        setTimeout(handleResponsiveSearch, 50);
        initCartPanelResize();
    });
} else {
    init();
    setTimeout(handleResponsiveSearch, 50);
    initCartPanelResize();
}

// Sync immediately with changes from List Product or other tabs
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_ITEMS_KEY || e.key === 'pos_items' || e.key === 'pos_inventory_sync' || e.key === 'pos_categories' || e.key === 'pos_item_order') {
        if (typeof loadData === 'function') loadData();
    }
});
window.addEventListener('focus', () => {
    if (typeof loadData === 'function') {
        loadData();
    }
});
