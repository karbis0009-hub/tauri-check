// API Client for POS Backend
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:3000/api'
    : '/api'; // Fallback to relative path for production (Vercel Serverless Functions)

// Helper to get active business id
function getActiveBusinessId() {
    try {
        if (window.BusinessManager) {
            if (typeof window.BusinessManager.getActiveBusinessId === 'function') {
                return window.BusinessManager.getActiveBusinessId();
            }
            if (typeof window.BusinessManager.getCurrentBusinessId === 'function') {
                return window.BusinessManager.getCurrentBusinessId();
            }
        }
    } catch (e) {}
    return localStorage.getItem('currentBusinessId') || 'biz_1';
}

class POSApi {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Generic fetch wrapper with error handling
    async fetch(endpoint, options = {}) {
        try {
            const bizId = getActiveBusinessId();
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-business-id': bizId,
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============ SALES API ============

    async getAllSales(filters = {}) {
        const params = new URLSearchParams({ business_id: getActiveBusinessId(), ...filters });
        return this.fetch(`/sales?${params}`);
    }

    async getTodaySales() {
        return this.fetch(`/sales/today?business_id=${getActiveBusinessId()}`);
    }

    async createSale(saleData) {
        return this.fetch('/sales', {
            method: 'POST',
            body: JSON.stringify({ ...saleData, business_id: getActiveBusinessId() })
        });
    }

    async getNextBillNumber(options = {}) {
        const params = new URLSearchParams({ business_id: getActiveBusinessId(), ...options });
        return this.fetch(`/sales/next-bill-number?${params}`);
    }

    // ============ INVENTORY API ============

    async getAllInventory() {
        return this.fetch(`/inventory?business_id=${getActiveBusinessId()}`);
    }

    async getInventoryItem(id) {
        return this.fetch(`/inventory/${id}`);
    }

    async saveInventoryItem(item) {
        return this.fetch('/inventory', {
            method: 'POST',
            body: JSON.stringify({ ...item, business_id: item.business_id || getActiveBusinessId() })
        });
    }

    async updateStock(items) {
        return this.fetch('/inventory/stock', {
            method: 'PUT',
            body: JSON.stringify({ items })
        });
    }

    async deleteInventoryItem(id) {
        return this.fetch(`/inventory/${id}`, {
            method: 'DELETE'
        });
    }

    async deleteSale(billNo) {
        return this.fetch(`/sales/${billNo}`, {
            method: 'DELETE'
        });
    }

    // ============ SETTINGS API ============

    async getAllSettings() {
        return this.fetch('/settings');
    }

    async saveSetting(key, value) {
        return this.fetch('/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value })
        });
    }

    async rolloverFiscalYear(newBSYear, newFiscalYearStr) {
        return this.fetch('/settings/rollover', {
            method: 'POST',
            body: JSON.stringify({ newBSYear, newFiscalYearStr, business_id: getActiveBusinessId() })
        });
    }

    // ============ ANALYTICS API ============

    async getSalesSummary(period = 'today') {
        return this.fetch(`/analytics/summary?period=${period}&business_id=${getActiveBusinessId()}`);
    }

    // ============ ACCOUNTS RECEIVABLE (AR) API ============

    async getARAccounts() {
        return this.fetch(`/ar/accounts?business_id=${getActiveBusinessId()}`);
    }

    async getCustomers(filters = {}) {
        const params = new URLSearchParams({ business_id: getActiveBusinessId(), ...filters });
        return this.fetch(`/ar/accounts?${params.toString()}`);
    }

    async getCustomerByPhone(phone) {
        if (!phone) return null;
        const cleanPhone = String(phone).replace(/\D/g, '').trim();
        if (!cleanPhone) return null;
        const accounts = await this.getARAccounts();
        return accounts.find(a => {
            const aPhone = String(a.customerPhone || a.phone || '').replace(/\D/g, '').trim();
            return aPhone === cleanPhone;
        }) || null;
    }

    async recordCustomerSale(saleData, paymentMode = 'CASH') {
        return this.fetch('/ar/customer-sale', {
            method: 'POST',
            body: JSON.stringify({ ...saleData, paymentMode, business_id: getActiveBusinessId() })
        });
    }

    async getARAccount(name) {
        return this.fetch(`/ar/accounts/${encodeURIComponent(name)}`);
    }

    async recordARPayment(paymentData) {
        return this.fetch('/ar/payment', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async getARTransactions(name) {
        return this.fetch(`/ar/transactions/${encodeURIComponent(name)}`);
    }

    async createCreditSale(saleData) {
        return this.fetch('/sales/credit', {
            method: 'POST',
            body: JSON.stringify({ ...saleData, business_id: getActiveBusinessId() })
        });
    }

    async saveCustomer(customerData) {
        return this.fetch('/ar/customer', {
            method: 'POST',
            body: JSON.stringify({ ...customerData, business_id: getActiveBusinessId() })
        });
    }

    async toggleCustomerActive(customerName, isActive) {
        return this.fetch('/ar/customer/toggle-active', {
            method: 'POST',
            body: JSON.stringify({ customerName, isActive, business_id: getActiveBusinessId() })
        });
    }

    async addCustomerTimelineEvent(customerName, event) {
        return this.fetch('/ar/customer/timeline', {
            method: 'POST',
            body: JSON.stringify({ customerName, event, business_id: getActiveBusinessId() })
        });
    }

    async rebuildARStats() {
        return this.fetch('/ar/rebuild-stats', {
            method: 'POST',
            body: JSON.stringify({ business_id: getActiveBusinessId() })
        });
    }

    // ============ CREDIT NOTES (RETURNS) API ============

    async createCreditNote(cnData) {
        return this.fetch('/credit-notes', {
            method: 'POST',
            body: JSON.stringify({ ...cnData, business_id: getActiveBusinessId() })
        });
    }

    async getAllCreditNotes() {
        return this.fetch(`/credit-notes?business_id=${getActiveBusinessId()}`);
    }

    async getNextCreditNoteNumber() {
        return this.fetch(`/credit-notes/next-number?business_id=${getActiveBusinessId()}`);
    }

    // ============ DEBIT NOTES (PURCHASE RETURNS) API ============

    async createDebitNote(dnData) {
        return this.fetch('/debit-notes', {
            method: 'POST',
            body: JSON.stringify({ ...dnData, business_id: getActiveBusinessId() })
        });
    }

    async getAllDebitNotes() {
        return this.fetch(`/debit-notes?business_id=${getActiveBusinessId()}`);
    }

    async getNextDebitNoteNumber() {
        return this.fetch(`/debit-notes/next-number?business_id=${getActiveBusinessId()}`);
    }

    // ============ PURCHASE API ============

    async getAllPurchases(filters = {}) {
        const params = new URLSearchParams({ business_id: getActiveBusinessId(), ...filters });
        return this.fetch(`/purchases?${params}`);
    }

    async createPurchase(purchaseData) {
        return this.fetch('/purchases', {
            method: 'POST',
            body: JSON.stringify({ ...purchaseData, business_id: getActiveBusinessId() })
        });
    }

    async getNextPINumber() {
        return this.fetch(`/purchases/next-pi-number?business_id=${getActiveBusinessId()}`);
    }

    // ============ SALES INVOICE (TAX INVOICE) API ============

    async getAllSalesInvoices(filters = {}) {
        const sales = await this.getAllSales(filters);
        let fiscalYear = '082/83';
        try {
            const settings = await this.getAllSettings();
            if (settings) {
                if (Array.isArray(settings)) {
                    const fYear = settings.find(s => s.key === 'fiscalYear');
                    if (fYear) fiscalYear = JSON.parse(fYear.value);
                } else if (settings.fiscalYear) {
                    fiscalYear = settings.fiscalYear;
                }
            }
        } catch (e) { }

        return sales
            .filter(s => s.address || s.vatNo || s.remarks || s.totalQty)
            .map(s => {
                let itemsList = [];
                try {
                    itemsList = JSON.parse(s.items || '[]');
                } catch (e) { }

                return {
                    siNo: `SI${s.billNo}-MUL-${fiscalYear}`,
                    entryDate: s.timestamp.split('T')[0],
                    invoiceNo: s.billNo,
                    invoiceDate: s.timestamp.split('T')[0],
                    salesType: 'Trading',
                    paymentTerms: s.paymentMode === 'CREDIT' ? 'Credit' : 'Cash',
                    account: 'Sales Account',
                    chequeNo: '',
                    godown: 'Main Warehouse',
                    customer: s.customer,
                    address: s.address,
                    vatNo: s.vatNo,
                    remarks: s.remarks,
                    items: itemsList.map(item => ({
                        id: item.id,
                        code: item.id,
                        hsCode: '',
                        barcode: item.barcode || '',
                        name: item.name,
                        unit: 'Pcs',
                        qty: item.qty,
                        rate: item.price,
                        disPct: 0,
                        disAmt: item.discount || 0,
                        vatType: item.vatType || '13%',
                        netAmt: item.qty * item.price,
                        mfgDate: '',
                        expDate: ''
                    })),
                    totalQty: s.totalQty || 0,
                    gross: s.gross || s.total,
                    discount: s.discount || 0,
                    taxable: s.taxable || 0,
                    nonTaxable: s.nonTaxable || 0,
                    vat: s.vat || 0,
                    netAmount: s.total,
                    cashier: s.status || 'Administrator'
                };
            });
    }

    async createSalesInvoice(invoiceData) {
        const billNoMatch = invoiceData.siNo ? invoiceData.siNo.match(/\d+/) : null;
        const billNo = billNoMatch ? parseInt(billNoMatch[0], 10) : Date.now();

        const mappedData = {
            billNo: billNo,
            business_id: getActiveBusinessId(),
            timestamp: invoiceData.timestamp || new Date().toISOString(),
            customer: invoiceData.customer,
            customerPhone: '',
            paymentMode: invoiceData.paymentTerms === 'Credit' ? 'CREDIT' : 'CASH',
            total: invoiceData.netAmount,
            items: invoiceData.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.rate,
                qty: item.qty,
                vatType: item.vatType,
                discount: item.disAmt
            })),
            address: invoiceData.address,
            vatNo: invoiceData.vatNo,
            remarks: invoiceData.remarks,
            totalQty: invoiceData.totalQty,
            gross: invoiceData.gross,
            discount: invoiceData.discount,
            taxable: invoiceData.taxable,
            nonTaxable: invoiceData.nonTaxable,
            vat: invoiceData.vat
        };

        return this.fetch('/sales', {
            method: 'POST',
            body: JSON.stringify(mappedData)
        });
    }

    async getNextSINumber() {
        const sales = await this.getAllSales();
        const count = sales.filter(s => s.address || s.vatNo || s.remarks || s.totalQty).length + 1;

        let fiscalYear = '082/83';
        try {
            const settings = await this.getAllSettings();
            if (settings) {
                if (Array.isArray(settings)) {
                    const fYear = settings.find(s => s.key === 'fiscalYear');
                    if (fYear) fiscalYear = JSON.parse(fYear.value);
                } else if (settings.fiscalYear) {
                    fiscalYear = settings.fiscalYear;
                }
            }
        } catch (e) { }

        const nextNo = `SI${count}-MUL-${fiscalYear}`;
        return { nextNo };
    }

    // ============ HEALTH CHECK ============

    async healthCheck() {
        return this.fetch('/health');
    }
}

// Create singleton instance
const api = new POSApi();

// Fallback to localStorage when server is unavailable
class LocalStorageFallback {
    constructor() {
        this.SALES_KEY = 'pos_sales';
        this.ITEMS_KEY = 'pos_items';
        this.SETTINGS_KEY = 'pos_settings';
    }

    readArray(key) {
        const data = safeJSONParse(localStorage.getItem(key) || '[]', []);
        return Array.isArray(data) ? data : [];
    }

    readObject(key) {
        const data = safeJSONParse(localStorage.getItem(key) || '{}', {});
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    }

    sameId(a, b) {
        return String(a) === String(b);
    }

    getAllSales(filters = {}) {
        const curBizId = getActiveBusinessId();
        let sales = this.readArray(this.SALES_KEY);

        // Filter by business_id
        sales = sales.filter(sale => {
            if (!sale) return false;
            const saleBiz = sale.business_id || 'biz_1';
            return saleBiz === curBizId;
        });

        if (filters.startDate || filters.endDate) {
            sales = sales.filter(sale => {
                // Use local date string to avoid UTC midnight shifting for Nepal timezone
                const d = new Date(sale.timestamp);
                const offset = d.getTimezoneOffset();
                const localDate = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                if (filters.startDate && localDate < filters.startDate) return false;
                if (filters.endDate && localDate > filters.endDate) return false;
                return true;
            });
        }

        return Promise.resolve(sales);
    }

    getTodaySales() {
        const curBizId = getActiveBusinessId();
        const sales = this.readArray(this.SALES_KEY);
        const today = new Date().toDateString();
        const todaySales = sales.filter(s => {
            const saleBiz = s.business_id || 'biz_1';
            return saleBiz === curBizId && new Date(s.timestamp).toDateString() === today;
        });
        return Promise.resolve(todaySales);
    }

    createSale(saleData) {
        const curBizId = getActiveBusinessId();
        const sales = this.readArray(this.SALES_KEY);
        const storeSettings = saleData.storeSettings || this.readObject(this.SETTINGS_KEY);
        sales.push({ ...saleData, business_id: curBizId, storeSettings, status: 'PAID' });
        localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));

        // Update / create customer record if customer phone is provided
        this.recordCustomerSale(saleData, saleData.paymentMode || 'CASH');

        return Promise.resolve({ id: sales.length, message: 'Sale recorded (offline)' });
    }

    getNextBillNumber(options = {}) {
        const curBizId = getActiveBusinessId();
        const sales = this.readArray(this.SALES_KEY);
        let reqType = options.businessType;
        if (!reqType) {
            const curBiz = window.BusinessManager ? window.BusinessManager.getBusinessById(curBizId) : null;
            if (curBiz) {
                const isPan = curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan';
                reqType = isPan ? 'pan_only' : 'vat_registered';
            } else {
                reqType = (this.readObject(this.SETTINGS_KEY).businessType) || 'vat_registered';
            }
        }
        let maxNo = 0;
        sales.forEach(s => {
            const saleBiz = s.business_id || 'biz_1';
            if (saleBiz !== curBizId) return; // Isolated counter per business!

            const sType = s.businessType || s.storeSettings?.businessType || (s.status === 'PAID_PAN' ? 'pan_only' : 'vat_registered');
            if (sType === reqType && s.billNo) {
                const match = String(s.billNo).match(/(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNo) maxNo = num;
                }
            }
        });

        let startingNo = 1;
        try {
            if (window.BusinessManager) {
                const biz = window.BusinessManager.getBusinessById(curBizId);
                if (biz && biz.starting_no) startingNo = parseInt(biz.starting_no, 10) || 1;
            }
        } catch (e) {}

        const nextBillNo = maxNo > 0 ? (maxNo + 1) : startingNo;
        return Promise.resolve({ nextBillNo });
    }

    getAllInventory() {
        const curBizId = getActiveBusinessId();
        let items = this.readArray(this.ITEMS_KEY);
        const oldDefaultCategories = ['Grocery', 'Snacks', 'Dairy', 'Beverage', 'Household', 'Personal Care', 'Other'];
        const oldDefaultItemNames = [
            'Basmati Rice 25kg', 'Black Lentils', 'Tori oil liter', 'Sarso', 'Bottle 2.5',
            'Bottle 5liter', 'Chickpeas', 'Green checkpea', 'Local kalo dal',
            'kalo dall', 'Khodo', 'Rato dal', 'Bottle Sliter', 'Khodo pitho', 'Local Musuro dal',
            'Jeera phidako', 'Local jira 30kg', 'Local jeera chamal',
            'Local rato dal', 'Mechi chiya pail', 'pina two', 'shakkar',
            'Test Product', 'Test Persistent Product', 'Test Post Product'
        ];
        const oldDefaultItemCategoryPairs = [
            ['Junalo', 'Chamal'],
            ['Pina', 'Pitho/chyakhla'],
            ['tori', 'Chamal']
        ];
        const cleanItemName = name => String(name || '').trim().toLowerCase();
        const cleanCategory = category => String(category || '').trim().toLowerCase();
        const itemKey = item => `${cleanItemName(item && item.name)}|${cleanCategory(item && item.category)}|${String(item && item.unit || '').trim().toLowerCase()}|${Number(item && item.price || 0)}`;
        const isOldDefaultItem = item => {
            const name = cleanItemName(item && item.name);
            const id = String(item && item.id || '').toLowerCase();
            if (name.startsWith('test ') || name === 'test product' || id.startsWith('test-') || id.includes('test')) return true;
            return oldDefaultItemNames.some(oldName => cleanItemName(oldName) === name) ||
                oldDefaultCategories.includes(item && item.category) ||
                oldDefaultItemCategoryPairs.some(([pName, category]) => cleanItemName(pName) === name && cleanCategory(category) === cleanCategory(item && item.category));
        };
        const originalCount = items.length;
        items = items.filter(item => !isOldDefaultItem(item));
        const stableDefaultKeys = new Set(items.filter(item => String(item.id || '').startsWith('default-')).map(itemKey));
        if (stableDefaultKeys.size > 0) {
            items = items.filter(item => String(item.id || '').startsWith('default-') || !stableDefaultKeys.has(itemKey(item)));
        }
        if (items.length !== originalCount) localStorage.setItem(this.ITEMS_KEY, JSON.stringify(items));
        // Define the canonical default seed list
        const seedList = [
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
        // Build seed map by default id
        const seedMap = new Map(seedList.map((item, index) => [`default-${index + 1}`, { ...item, id: `default-${index + 1}` }]));

        // Add any missing default seed items if items list was empty
        let updated = false;
        if (items.length === 0 && curBizId === 'biz_1') {
            items = seedList.map((seedItem, index) => ({
                id: `default-${index + 1}`,
                business_id: 'biz_1',
                ...seedItem,
                stock: seedItem.stock == null ? 999 : seedItem.stock
            }));
            updated = true;
        }

        if (updated || items.some(item => !item.id || item.stock == null)) {
            items = items.map((item, index) => ({
                ...item,
                id: item.id || `default-${index + 1}`,
                business_id: item.business_id || 'biz_1',
                stock: item.stock == null ? 999 : item.stock
            }));
            localStorage.setItem(this.ITEMS_KEY, JSON.stringify(items));
        }

        // Return only items for the current active business
        const bizItems = items.filter(item => {
            if (!item) return false;
            const itemBiz = item.business_id || 'biz_1';
            return itemBiz === curBizId;
        });

        return Promise.resolve(bizItems);
    }

    saveInventoryItem(item) {
        const curBizId = getActiveBusinessId();
        item.business_id = item.business_id || curBizId;
        const items = this.readArray(this.ITEMS_KEY);
        const index = items.findIndex(i => this.sameId(i.id, item.id));
        if (index > -1) {
            items[index] = item;
        } else {
            items.push(item);
        }
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(items));
        return Promise.resolve({ id: item.id, message: 'Item saved (offline)' });
    }

    updateStock(items) {
        const inventory = this.readArray(this.ITEMS_KEY);
        items.forEach(({ id, quantity }) => {
            const item = inventory.find(i => this.sameId(i.id, id));
            if (item) {
                item.stock = parseFloat(((item.stock || 0) - (parseFloat(quantity) || 0)).toFixed(3));
            }
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));
        return Promise.resolve({ message: 'Stock updated (offline)' });
    }

    deleteInventoryItem(id) {
        const items = this.readArray(this.ITEMS_KEY);
        const filtered = items.filter(i => !this.sameId(i.id, id));
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filtered));
        return Promise.resolve({ message: 'Item deleted (offline)' });
    }

    deleteSale(billNo) {
        let sales = this.readArray(this.SALES_KEY);
        const saleIndex = sales.findIndex(s => s.billNo == billNo);
        if (saleIndex === -1) return Promise.reject(new Error('Sale not found (offline)'));

        const sale = sales[saleIndex];

        // Rule 2: Block the DELETE command. Change status to CANCELLED instead.
        sale.status = 'CANCELLED';

        // 1. Restore Stock
        const inventory = this.readArray(this.ITEMS_KEY);
        sale.items.forEach(item => {
            const invItem = inventory.find(i => this.sameId(i.id, item.id));
            if (invItem) invItem.stock += item.qty;
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));

        // 2. Reverse Credit if needed
        if (sale.paymentMode === 'CREDIT') {
            const accounts = this.readArray('pos_ar_accounts');
            const acc = accounts.find(a => a.customerName === sale.customer);
            if (acc) {
                acc.totalBalance -= sale.total;
                localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
            }

            const trans = this.readArray('pos_ar_transactions');
            const filteredTrans = trans.filter(t => t.billNo != billNo);
            localStorage.setItem('pos_ar_transactions', JSON.stringify(filteredTrans));
        }

        // 3. Save Sale with CANCELLED status
        localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));
        return Promise.resolve({ message: 'Sale cancelled (offline)' });
    }

    getAllSettings() {
        return Promise.resolve(this.readObject(this.SETTINGS_KEY));
    }

    saveSetting(key, value) {
        const settings = this.readObject(this.SETTINGS_KEY);
        settings[key] = value;
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        return Promise.resolve({ message: 'Setting saved (offline)' });
    }

    rolloverFiscalYear(newBSYear, newFiscalYearStr) {
        try {
            const curBizId = getActiveBusinessId();
            const currentSales = this.readArray(this.SALES_KEY);
            const currentSettings = this.readObject(this.SETTINGS_KEY);

            // 1. Create backup
            const backupKey = `pos_backup_rollover_${curBizId}_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                timestamp: new Date().toISOString(),
                business_id: curBizId,
                sales: currentSales.filter(s => (s.business_id || 'biz_1') === curBizId),
                settings: currentSettings
            }));

            // 2. Archive sales for current business
            const archiveSales = this.readArray('pos_sales_archive');
            archiveSales.push(...currentSales.filter(s => (s.business_id || 'biz_1') === curBizId));
            localStorage.setItem('pos_sales_archive', JSON.stringify(archiveSales));

            // 3. Reset bill counter (remove active sales for current business only)
            const remainingSales = currentSales.filter(s => (s.business_id || 'biz_1') !== curBizId);
            localStorage.setItem(this.SALES_KEY, JSON.stringify(remainingSales));

            // 4. Update settings
            currentSettings['fiscalYear'] = newFiscalYearStr;
            currentSettings['fiscal_year_bs_year'] = newBSYear;
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(currentSettings));

            return Promise.resolve({ message: 'Local rollover completed successfully' });
        } catch (error) {
            return Promise.reject(error);
        }
    }

    getSalesSummary(period) {
        const curBizId = getActiveBusinessId();
        const sales = this.readArray(this.SALES_KEY).filter(s => (s.business_id || 'biz_1') === curBizId);
        const now = new Date();

        let filteredSales = sales;
        if (period === 'today') {
            filteredSales = sales.filter(s => new Date(s.timestamp).toDateString() === now.toDateString());
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredSales = sales.filter(s => new Date(s.timestamp) >= weekAgo);
        } else if (period === 'month') {
            filteredSales = sales.filter(s => {
                const d = new Date(s.timestamp);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        }

        return Promise.resolve({
            totalOrders: filteredSales.length,
            totalRevenue: filteredSales.reduce((sum, s) => sum + s.total, 0),
            averageOrder: filteredSales.length > 0
                ? filteredSales.reduce((sum, s) => sum + s.total, 0) / filteredSales.length
                : 0
        });
    }

    getARAccounts() {
        const curBizId = getActiveBusinessId();
        let accounts = this.readArray('pos_ar_accounts');
        let modified = false;

        // Auto-normalize fields and ensure default values
        accounts = accounts.map((a, idx) => {
            let changed = false;
            if (!a.customerId) { a.customerId = `cust_${idx + 1}`; changed = true; }
            if (a.name === undefined) { a.name = a.customerName || 'Customer'; changed = true; }
            if (a.customerName === undefined) { a.customerName = a.name || 'Customer'; changed = true; }
            if (a.phone === undefined) { a.phone = a.customerPhone || ''; changed = true; }
            if (a.customerPhone === undefined) { a.customerPhone = a.phone || ''; changed = true; }
            if (a.pan === undefined) { a.pan = a.customerPAN || ''; changed = true; }
            if (a.customerPAN === undefined) { a.customerPAN = a.pan || ''; changed = true; }
            if (a.address === undefined) { a.address = a.customerAddress || ''; changed = true; }
            if (a.customerAddress === undefined) { a.customerAddress = a.address || ''; changed = true; }
            if (a.totalBalance === undefined) { a.totalBalance = parseFloat(a.creditDue) || 0; changed = true; }
            if (a.creditDue === undefined) { a.creditDue = parseFloat(a.totalBalance) || 0; changed = true; }
            if (a.totalSpent === undefined) { a.totalSpent = 0; changed = true; }
            if (a.visitCount === undefined) { a.visitCount = 0; changed = true; }
            if (!a.business_id) { a.business_id = a.businessId || 'biz_1'; changed = true; }
            if (!a.businessId) { a.businessId = a.business_id || 'biz_1'; changed = true; }
            if (changed) modified = true;
            return a;
        });

        // If totalSpent is 0 for all accounts, attempt historical backfill from pos_sales once
        const needsBackfill = accounts.length > 0 && accounts.every(a => !a.visitCount || a.visitCount === 0);
        if (needsBackfill) {
            const sales = this.readArray(this.SALES_KEY);
            accounts.forEach(acc => {
                const accPhone = String(acc.customerPhone || acc.phone || '').replace(/\D/g, '').trim();
                const accName = (acc.customerName || acc.name || '').trim().toLowerCase();
                const custSales = sales.filter(s => {
                    const sBiz = s.business_id || 'biz_1';
                    const aBiz = acc.business_id || 'biz_1';
                    if (sBiz !== aBiz) return false;
                    const sPhone = String(s.customerPhone || '').replace(/\D/g, '').trim();
                    const sName = (s.customer || '').trim().toLowerCase();
                    if (accPhone && sPhone && accPhone === sPhone) return true;
                    if (accName && sName && accName === sName && sName !== 'walk-in') return true;
                    return false;
                });
                if (custSales.length > 0) {
                    acc.visitCount = custSales.length;
                    acc.totalSpent = custSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
                    custSales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    acc.firstVisit = custSales[0].timestamp;
                    acc.lastVisit = custSales[custSales.length - 1].timestamp;
                    acc.lastTransactionAt = acc.lastVisit;
                    modified = true;
                }
            });
        }

        if (modified) {
            localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
        }

        const filtered = accounts.filter(a => (a.business_id || a.businessId || 'biz_1') === curBizId);
        return Promise.resolve(filtered);
    }

    getCustomers(filters = {}) {
        return this.getARAccounts().then(accounts => {
            let filtered = accounts;
            if (filters.dueOnly) {
                filtered = filtered.filter(a => (a.creditDue || a.totalBalance || 0) > 0.001);
            }
            if (filters.query) {
                const q = String(filters.query).toLowerCase().trim();
                filtered = filtered.filter(a =>
                    (a.name && a.name.toLowerCase().includes(q)) ||
                    (a.customerName && a.customerName.toLowerCase().includes(q)) ||
                    (a.phone && a.phone.includes(q)) ||
                    (a.customerPhone && a.customerPhone.includes(q))
                );
            }
            return filtered;
        });
    }

    getCustomerByPhone(phone) {
        if (!phone) return Promise.resolve(null);
        const cleanPhone = String(phone).replace(/\D/g, '').trim();
        if (!cleanPhone) return Promise.resolve(null);
        return this.getARAccounts().then(accounts => {
            const found = accounts.find(a => {
                const aPhone = String(a.customerPhone || a.phone || '').replace(/\D/g, '').trim();
                return aPhone === cleanPhone;
            });
            return found || null;
        });
    }

    recordCustomerSale(saleData, paymentMode = 'CASH') {
        const rawName = (saleData.customer || '').trim();
        const rawPhone = String(saleData.customerPhone || '').trim();
        const phone = rawPhone.replace(/\D/g, '').trim();
        const custPAN = (saleData.customerPAN || saleData.vatNo || '').trim();
        const custAddr = (saleData.customerAddress || saleData.address || '').trim();

        const isWalkInName = !rawName ||
            rawName.toLowerCase() === 'walk-in' ||
            rawName.toLowerCase() === 'walkin' ||
            rawName.toLowerCase() === 'customer' ||
            rawName.toLowerCase() === 'anonymous';

        const hasPhone = phone.length >= 6;
        const hasName = !isWalkInName;
        const hasPan = custPAN.length >= 3;
        const hasAddr = custAddr.length >= 2;

        if (!hasName && !hasPhone && !hasPan && !hasAddr) {
            // Anonymous walk-in sale — do not create or update any customer record
            return Promise.resolve(null);
        }

        const curBizId = saleData.business_id || getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        const netTotal = parseFloat(saleData.total || 0);
        const timestamp = saleData.timestamp || new Date().toISOString();
        let custName = rawName;
        if (isWalkInName) {
            if (hasPhone) {
                custName = 'Customer ' + (phone.length >= 4 ? phone.slice(-4) : phone);
            } else if (hasPan) {
                custName = 'Customer PAN-' + custPAN;
            } else {
                custName = 'Customer';
            }
        }

        // Match on Name first (if provided), then phone, then PAN scoped per business
        let acc = accounts.find(a => {
            const aBiz = a.business_id || a.businessId || 'biz_1';
            if (aBiz !== curBizId) return false;
            if (hasName && (a.customerName || a.name || '').trim().toLowerCase() === custName.toLowerCase()) return true;
            const aPhone = String(a.customerPhone || a.phone || '').replace(/\D/g, '').trim();
            if (hasPhone && aPhone && aPhone === phone) return true;
            if (hasPan && (a.customerPAN || a.pan || '').trim() === custPAN) return true;
            return false;
        });

        if (acc) {
            // Case A: Existing customer
            acc.visitCount = (parseInt(acc.visitCount) || 0) + 1;
            acc.totalSpent = parseFloat(((parseFloat(acc.totalSpent) || 0) + netTotal).toFixed(2));
            acc.lastVisit = timestamp;
            acc.lastTransactionAt = timestamp;
            if (!acc.firstVisit) acc.firstVisit = timestamp;

            if (custName && custName !== 'Walk-in' && (!acc.customerName || acc.customerName === 'Walk-in' || acc.customerName === 'Customer')) {
                acc.customerName = custName;
                acc.name = custName;
            }
            if (custPAN) {
                acc.customerPAN = custPAN;
                acc.pan = custPAN;
            }
            if (custAddr) {
                acc.customerAddress = custAddr;
                acc.address = custAddr;
            }

            if (paymentMode === 'CREDIT') {
                acc.totalBalance = parseFloat(((parseFloat(acc.totalBalance || acc.creditDue) || 0) + netTotal).toFixed(2));
                acc.creditDue = acc.totalBalance;
            } else {
                acc.totalBalance = parseFloat((parseFloat(acc.totalBalance || acc.creditDue) || 0).toFixed(2));
                acc.creditDue = acc.totalBalance;
            }
        } else {
            // Case B: New customer
            const newAcc = {
                customerId: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                business_id: curBizId,
                businessId: curBizId,
                customerName: custName,
                name: custName,
                customerPhone: saleData.customerPhone,
                phone: saleData.customerPhone,
                customerPAN: custPAN,
                pan: custPAN,
                customerAddress: custAddr,
                address: custAddr,
                totalSpent: parseFloat(netTotal.toFixed(2)),
                visitCount: 1,
                firstVisit: timestamp,
                lastVisit: timestamp,
                lastTransactionAt: timestamp,
                totalBalance: paymentMode === 'CREDIT' ? parseFloat(netTotal.toFixed(2)) : 0,
                creditDue: paymentMode === 'CREDIT' ? parseFloat(netTotal.toFixed(2)) : 0,
                creditLimit: 0,
                notes: '',
                tags: [],
                isActive: 1,
                createdAt: timestamp
            };
            accounts.push(newAcc);
            acc = newAcc;
        }

        localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
        return Promise.resolve(acc);
    }

    createCreditSale(saleData) {
        const curBizId = getActiveBusinessId();
        // 1. Record Sale
        const sales = this.readArray(this.SALES_KEY);
        const storeSettings = saleData.storeSettings || this.readObject(this.SETTINGS_KEY);
        sales.push({ ...saleData, business_id: curBizId, storeSettings, paymentMode: 'CREDIT', status: 'UNPAID' });
        localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));

        // 2. Update Customer Record (includes AR credit balance)
        this.recordCustomerSale(saleData, 'CREDIT');

        // 3. Record Transaction
        const trans = this.readArray('pos_ar_transactions');
        trans.push({
            business_id: curBizId,
            customerName: saleData.customer,
            type: 'CREDIT',
            amount: saleData.total,
            billNo: saleData.billNo,
            timestamp: saleData.timestamp
        });
        localStorage.setItem('pos_ar_transactions', JSON.stringify(trans));

        return Promise.resolve({ id: sales.length, message: 'Credit sale recorded (offline)' });
    }

    recordARPayment(paymentData) {
        const curBizId = getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        let acc = accounts.find(a => a.customerName === paymentData.customerName && (a.business_id || 'biz_1') === curBizId);
        if (acc) {
            if (paymentData.amount > acc.totalBalance + 0.01) {
                return Promise.reject(new Error(`Payment (Rs. ${paymentData.amount}) exceeds outstanding balance (Rs. ${acc.totalBalance.toFixed(2)})`));
            }

            acc.totalBalance -= paymentData.amount;
            acc.lastTransactionAt = paymentData.timestamp;
            localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));

            const trans = this.readArray('pos_ar_transactions');
            trans.push({
                business_id: curBizId,
                customerName: paymentData.customerName,
                type: 'PAYMENT',
                amount: paymentData.amount,
                timestamp: paymentData.timestamp,
                notes: paymentData.notes
            });
            localStorage.setItem('pos_ar_transactions', JSON.stringify(trans));

            // Robust FIFO Settle Bills in LocalStorage
            const sales = this.readArray(this.SALES_KEY);
            let debt = acc.totalBalance;
            let changed = false;

            // Sort by timestamp to ensure we process in sequence, then backwards
            sales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Iterate backwards from newest
            for (let i = sales.length - 1; i >= 0; i--) {
                const sale = sales[i];
                if (sale.customer === paymentData.customerName && sale.paymentMode === 'CREDIT' && (sale.business_id || 'biz_1') === curBizId) {
                    const status = debt > 0.01 ? 'UNPAID' : 'PAID';
                    if (sale.status !== status) {
                        sale.status = status;
                        changed = true;
                    }
                    debt -= sale.total;
                }
            }

            if (changed) {
                localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));
            }

            return Promise.resolve({ message: 'Payment recorded and bills settled (offline)' });
        }
        return Promise.reject(new Error('Account not found'));
    }

    getARTransactions(name) {
        const curBizId = getActiveBusinessId();
        const trans = this.readArray('pos_ar_transactions');
        return Promise.resolve(trans.filter(t => t.customerName === name && (t.business_id || 'biz_1') === curBizId));
    }

    repairARAccount(name) {
        const curBizId = getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        let acc = accounts.find(a => a.customerName === name && (a.business_id || 'biz_1') === curBizId);
        if (!acc || acc.totalBalance >= -0.01) return Promise.resolve();

        const overpaid = Math.abs(acc.totalBalance);
        acc.totalBalance = 0;
        localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));

        const trans = this.readArray('pos_ar_transactions');
        let removed = 0;
        for (let i = trans.length - 1; i >= 0; i--) {
            if (trans[i].customerName === name && trans[i].type === 'PAYMENT' && (trans[i].business_id || 'biz_1') === curBizId) {
                removed += trans[i].amount;
                trans.splice(i, 1);
                if (removed >= overpaid) break;
            }
        }
        localStorage.setItem('pos_ar_transactions', JSON.stringify(trans));

        // Re-settle local sales
        const sales = this.readArray(this.SALES_KEY);
        let debt = 0;
        sales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = sales.length - 1; i >= 0; i--) {
            const s = sales[i];
            if (s.customer === name && s.paymentMode === 'CREDIT' && (s.business_id || 'biz_1') === curBizId) {
                s.status = debt > 0.01 ? 'UNPAID' : 'PAID';
                debt -= s.total;
            }
        }
        localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));

        return Promise.resolve({ message: 'Offline account repaired' });
    }

    saveCustomer(customerData) {
        const curBizId = customerData.business_id || getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        const effName = (customerData.customerName || customerData.name || '').trim();
        const effPhone = String(customerData.customerPhone || customerData.phone || '').trim();

        let acc = accounts.find(a => {
            const aBiz = a.business_id || a.businessId || 'biz_1';
            if (aBiz !== curBizId) return false;
            if (customerData.customerId && a.customerId === customerData.customerId) return true;
            if (effName && (a.customerName === effName || a.name === effName)) return true;
            if (effPhone && (a.customerPhone === effPhone || a.phone === effPhone)) return true;
            return false;
        });

        if (acc) {
            if (effName) { acc.customerName = effName; acc.name = effName; }
            if (effPhone) { acc.customerPhone = effPhone; acc.phone = effPhone; }
            if (customerData.pan !== undefined || customerData.customerPAN !== undefined) {
                acc.pan = customerData.pan || customerData.customerPAN || '';
                acc.customerPAN = acc.pan;
            }
            if (customerData.address !== undefined || customerData.customerAddress !== undefined) {
                acc.address = customerData.address || customerData.customerAddress || '';
                acc.customerAddress = acc.address;
            }
            if (customerData.notes !== undefined) acc.notes = customerData.notes;
            if (customerData.tags !== undefined) acc.tags = customerData.tags;
            if (customerData.creditLimit !== undefined) acc.creditLimit = parseFloat(customerData.creditLimit) || 0;
            if (customerData.loyaltyPoints !== undefined) acc.loyaltyPoints = parseFloat(customerData.loyaltyPoints) || 0;
            if (customerData.isActive !== undefined) acc.isActive = customerData.isActive ? 1 : 0;
            if (customerData.promiseDate !== undefined) acc.promiseDate = customerData.promiseDate;
            if (customerData.timeline !== undefined) acc.timeline = customerData.timeline;
        } else {
            acc = {
                customerId: customerData.customerId || 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                business_id: curBizId,
                businessId: curBizId,
                customerName: effName || 'Customer',
                name: effName || 'Customer',
                customerPhone: effPhone,
                phone: effPhone,
                pan: customerData.pan || customerData.customerPAN || '',
                customerPAN: customerData.pan || customerData.customerPAN || '',
                address: customerData.address || customerData.customerAddress || '',
                customerAddress: customerData.address || customerData.customerAddress || '',
                notes: customerData.notes || '',
                tags: customerData.tags || [],
                creditLimit: parseFloat(customerData.creditLimit) || 0,
                loyaltyPoints: parseFloat(customerData.loyaltyPoints) || 0,
                isActive: customerData.isActive !== undefined ? (customerData.isActive ? 1 : 0) : 1,
                promiseDate: customerData.promiseDate || null,
                timeline: customerData.timeline || [],
                totalSpent: 0,
                visitCount: 0,
                totalBalance: 0,
                creditDue: 0,
                createdAt: new Date().toISOString()
            };
            accounts.push(acc);
        }

        localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
        return Promise.resolve(acc);
    }

    toggleCustomerActive(customerName, isActive) {
        const curBizId = getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        const acc = accounts.find(a => (a.customerName === customerName || a.name === customerName) && (a.business_id || a.businessId || 'biz_1') === curBizId);
        if (acc) {
            acc.isActive = (isActive === false || isActive === 0 || isActive === '0' || isActive === 'false') ? 0 : 1;
            localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
            return Promise.resolve({ message: 'Status updated', isActive: acc.isActive });
        }
        return Promise.resolve({ message: 'Customer not found' });
    }

    addCustomerTimelineEvent(customerName, event) {
        const curBizId = getActiveBusinessId();
        const accounts = this.readArray('pos_ar_accounts');
        const acc = accounts.find(a => (a.customerName === customerName || a.name === customerName) && (a.business_id || a.businessId || 'biz_1') === curBizId);
        if (acc) {
            let timeline = [];
            if (Array.isArray(acc.timeline)) timeline = acc.timeline;
            else if (typeof acc.timeline === 'string') {
                try { timeline = JSON.parse(acc.timeline); } catch(e) { timeline = []; }
            }
            timeline.unshift({ ...event, timestamp: event.timestamp || new Date().toISOString() });
            acc.timeline = timeline;
            localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
            return Promise.resolve({ message: 'Timeline updated', timeline });
        }
        return Promise.resolve({ message: 'Customer not found' });
    }

    rebuildARStats() {
        const curBizId = getActiveBusinessId();
        const sales = this.readArray(this.SALES_KEY);
        const accounts = this.readArray('pos_ar_accounts');
        const trans = this.readArray('pos_ar_transactions');

        accounts.forEach(acc => {
            if ((acc.business_id || acc.businessId || 'biz_1') !== curBizId) return;
            const accPhone = String(acc.customerPhone || acc.phone || '').replace(/\D/g, '').trim();
            const accName = (acc.customerName || acc.name || '').trim().toLowerCase();

            const custSales = sales.filter(s => {
                if (s.status === 'CANCELLED' || s.status === 'RETURNED') return false;
                const sBiz = s.business_id || 'biz_1';
                if (sBiz !== curBizId) return false;
                const sPhone = String(s.customerPhone || '').replace(/\D/g, '').trim();
                const sName = (s.customer || '').trim().toLowerCase();
                if (accPhone && sPhone && accPhone === sPhone) return true;
                if (accName && sName && accName === sName && sName !== 'walk-in') return true;
                return false;
            });

            acc.visitCount = custSales.length;
            acc.totalSpent = custSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
            if (custSales.length > 0) {
                custSales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                acc.firstVisit = custSales[0].timestamp;
                acc.lastVisit = custSales[custSales.length - 1].timestamp;
                acc.lastTransactionAt = acc.lastVisit;
            }

            const creditSalesTotal = custSales.filter(s => s.paymentMode === 'CREDIT').reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
            const custPayments = trans.filter(t => t.type === 'PAYMENT' && t.customerName && t.customerName.trim().toLowerCase() === accName).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            acc.totalBalance = Math.max(0, creditSalesTotal - custPayments);
            acc.creditDue = acc.totalBalance;
        });

        localStorage.setItem('pos_ar_accounts', JSON.stringify(accounts));
        return Promise.resolve({ message: 'Customer stats rebuilt successfully' });
    }

    // ============ CREDIT NOTES (RETURNS) FALLBACK ============

    createCreditNote(cnData) {
        const curBizId = getActiveBusinessId();
        const notes = this.readArray('pos_credit_notes');

        const record = {
            ...cnData,
            business_id: curBizId,
            status: 'ISSUED',
            type: 'RETURN'
        };

        notes.push(record);
        localStorage.setItem('pos_credit_notes', JSON.stringify(notes));

        // 1. Restore Stock
        const inventory = this.readArray(this.ITEMS_KEY);
        cnData.items.forEach(item => {
            const invItem = inventory.find(i => this.sameId(i.id, item.id));
            if (invItem) {
                invItem.stock = parseFloat(((invItem.stock || 0) - (parseFloat(item.qty) || 0)).toFixed(3));
            }
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));

        // 2. Mark original sale as HAVING_RETURNS
        const sales = this.readArray(this.SALES_KEY);
        const original = sales.find(s => s.billNo == cnData.originalBillNo && (s.business_id || 'biz_1') === curBizId);
        if (original) {
            original.status = 'PARTIAL_RETURN';
        }
        localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));

        return Promise.resolve({ id: notes.length, message: 'Credit Note issued (offline)' });
    }

    getAllCreditNotes() {
        const curBizId = getActiveBusinessId();
        return Promise.resolve(this.readArray('pos_credit_notes').filter(n => (n.business_id || 'biz_1') === curBizId));
    }

    getNextCreditNoteNumber() {
        const curBizId = getActiveBusinessId();
        const notes = this.readArray('pos_credit_notes').filter(n => (n.business_id || 'biz_1') === curBizId);
        const count = notes.length + 1;

        let fiscalYear = '082/83';
        try {
            const settings = this.readObject(this.SETTINGS_KEY);
            if (settings.fiscalYear) fiscalYear = settings.fiscalYear;
        } catch (e) { }

        const nextNo = `RET-${String(count).padStart(4, '0')}-${fiscalYear}`;
        return Promise.resolve({ nextNo });
    }

    // ============ DEBIT NOTES (PURCHASE RETURNS) FALLBACK ============

    createDebitNote(dnData) {
        const curBizId = getActiveBusinessId();
        const notes = this.readArray('pos_debit_notes');
        const record = {
            ...dnData,
            business_id: curBizId,
            status: 'ISSUED',
            type: 'PURCHASE_RETURN'
        };
        notes.push(record);
        localStorage.setItem('pos_debit_notes', JSON.stringify(notes));

        // 1. Deduct Stock
        const inventory = this.readArray(this.ITEMS_KEY);
        dnData.items.forEach(item => {
            const invItem = inventory.find(i => this.sameId(i.id, item.id));
            if (invItem) {
                invItem.stock = parseFloat(invItem.stock || 0) - parseFloat(item.qty || 0);
            }
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));

        // 2. Mark original purchase
        const purchases = this.readArray('pos_purchases');
        const original = purchases.find(p => p.piNo == dnData.originalPINo && (p.business_id || 'biz_1') === curBizId);
        if (original) {
            original.status = 'PARTIAL_RETURN';
        }
        localStorage.setItem('pos_purchases', JSON.stringify(purchases));

        return Promise.resolve({ id: notes.length, message: 'Debit Note issued (offline)' });
    }

    getAllDebitNotes() {
        const curBizId = getActiveBusinessId();
        return Promise.resolve(this.readArray('pos_debit_notes').filter(n => (n.business_id || 'biz_1') === curBizId));
    }

    getNextDebitNoteNumber() {
        const curBizId = getActiveBusinessId();
        const notes = this.readArray('pos_debit_notes').filter(n => (n.business_id || 'biz_1') === curBizId);
        const count = notes.length + 1;
        let fiscalYear = '082/83';
        try {
            const settings = this.readObject(this.SETTINGS_KEY);
            if (settings.fiscalYear) fiscalYear = settings.fiscalYear;
        } catch (e) { }
        const nextNo = `DN-${String(count).padStart(4, '0')}-${fiscalYear}`;
        return Promise.resolve({ nextNo });
    }

    getAllPurchases(filters = {}) {
        const curBizId = getActiveBusinessId();
        let purchases = this.readArray('pos_purchases').filter(p => (p.business_id || 'biz_1') === curBizId);
        return Promise.resolve(purchases);
    }

    createPurchase(purchaseData) {
        const curBizId = getActiveBusinessId();
        const purchases = this.readArray('pos_purchases');
        purchases.push({ ...purchaseData, business_id: curBizId });
        localStorage.setItem('pos_purchases', JSON.stringify(purchases));

        // Update Stock of items (Increase stock)
        const inventory = this.readArray(this.ITEMS_KEY);
        purchaseData.items.forEach(item => {
            const invItem = inventory.find(i => this.sameId(i.id, item.id) || (item.barcode && String(i.barcode) === String(item.barcode)));
            if (invItem) {
                invItem.stock = parseFloat(invItem.stock || 0) + parseFloat(item.qty || 0);
            }
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));

        return Promise.resolve({ id: purchases.length, message: 'Purchase recorded (offline)' });
    }

    getNextPINumber() {
        const curBizId = getActiveBusinessId();
        const purchases = this.readArray('pos_purchases').filter(p => (p.business_id || 'biz_1') === curBizId);
        const count = purchases.length + 1;
        let fiscalYear = '082/83';
        try {
            const settings = this.readObject(this.SETTINGS_KEY);
            if (settings.fiscalYear) fiscalYear = settings.fiscalYear;
        } catch (e) { }
        const nextNo = `PI${count}-MUL-${fiscalYear}`;
        return Promise.resolve({ nextNo });
    }

    // ============ SALES INVOICES (TAX INVOICE) FALLBACK ============

    getAllSalesInvoices(filters = {}) {
        const curBizId = getActiveBusinessId();
        let invoices = this.readArray('pos_sales_invoices').filter(i => (i.business_id || 'biz_1') === curBizId);
        return Promise.resolve(invoices);
    }

    createSalesInvoice(invoiceData) {
        const curBizId = getActiveBusinessId();
        const invoices = this.readArray('pos_sales_invoices');
        invoices.push({ ...invoiceData, business_id: curBizId });
        localStorage.setItem('pos_sales_invoices', JSON.stringify(invoices));

        // Update Stock of items (Decrease stock for sales)
        const inventory = this.readArray(this.ITEMS_KEY);
        invoiceData.items.forEach(item => {
            const invItem = inventory.find(i => this.sameId(i.id, item.id) || (item.barcode && String(i.barcode) === String(item.barcode)));
            if (invItem) {
                invItem.stock = parseFloat(invItem.stock || 0) - parseFloat(item.qty || 0);
            }
        });
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(inventory));

        return Promise.resolve({ id: invoices.length, message: 'Sales invoice recorded (offline)' });
    }

    getNextSINumber() {
        const invoices = this.readArray('pos_sales_invoices');
        const count = invoices.length + 1;
        let fiscalYear = '082/83';
        try {
            const settings = this.readObject(this.SETTINGS_KEY);
            if (settings.fiscalYear) fiscalYear = settings.fiscalYear;
        } catch (e) { }
        const nextNo = `SI${count}-MUL-${fiscalYear}`;
        return Promise.resolve({ nextNo });
    }
}

const fallbackApi = new LocalStorageFallback();

// Smart API wrapper with automatic fallback
function safeJSONParse(str, fallback) { try { return JSON.parse(str); } catch (e) { console.error('JSON parse error', e); return fallback; } }
window.safeJSONParse = safeJSONParse;
class SmartAPI {
    constructor() {
        this.serverAvailable = null;
        this.serverCheckPromise = null;
    }

    async checkServerAvailability() {
        if (this.serverAvailable !== null) {
            return this.serverAvailable;
        }

        if (this.serverCheckPromise) {
            return this.serverCheckPromise;
        }

        this.serverCheckPromise = (async () => {
            try {
                // Add a timeout to health check so it doesn't hang the UI
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

                const response = await fetch(`${api.baseUrl}/health`, { signal: controller.signal });
                clearTimeout(timeoutId);
                this.serverAvailable = response.ok;
            } catch (error) {
                console.warn('Server unavailable, using localStorage fallback');
                this.serverAvailable = false;
            } finally {
                this.serverCheckPromise = null;
            }
            return this.serverAvailable;
        })();

        return this.serverCheckPromise;
    }

    async execute(apiMethod, ...args) {
        // Check server on first call
        if (this.serverAvailable === null) {
            await this.checkServerAvailability();
        }

        try {
            if (this.serverAvailable) {
                return await api[apiMethod](...args);
            } else {
                return await fallbackApi[apiMethod](...args);
            }
        } catch (error) {
            console.warn(`API call failed, using fallback: ${error.message}`);
            return await fallbackApi[apiMethod](...args);
        }
    }

    // Proxy all methods
    getAllSales(filters) { return this.execute('getAllSales', filters); }
    getTodaySales() { return this.execute('getTodaySales'); }
    createSale(data) { return this.execute('createSale', data); }
    getNextBillNumber(options) { return this.execute('getNextBillNumber', options); }
    async getAllInventory() {
        const items = await this.execute('getAllInventory');

        // If server is available and returned valid data, trust it directly.
        // Do NOT run the 'default-' ID gating logic — that destroys user-saved products.
        if (this.serverAvailable && Array.isArray(items) && items.length > 0) {
            // Only strip items from truly obsolete old categories (grocery-store defaults
            // that were replaced in a previous migration).
            const oldDefaultCategories = ['Grocery', 'Snacks', 'Dairy', 'Beverage', 'Household', 'Personal Care', 'Other'];
            const oldDefaultItemNames = [
                'Basmati Rice 25kg', 'Black Lentils', 'Tori oil liter', 'Sarso', 'Bottle 2.5',
                'Bottle 5liter', 'Chickpeas', 'Green checkpea', 'Local kalo dal',
                'kalo dall', 'Khodo', 'Rato dal', 'Bottle Sliter', 'Khodo pitho', 'Local Musuro dal',
                'Jeera phidako', 'Local jira 30kg', 'Local jeera chamal',
                'Local rato dal', 'Mechi chiya pail', 'pina two', 'shakkar'
            ];
            const oldDefaultItemCategoryPairs = [
                ['Junalo', 'Chamal'],
                ['Pina', 'Pitho/chyakhla'],
                ['tori', 'Chamal']
            ];
            const cleanName = n => String(n || '').trim().toLowerCase();
            const cleanCat = c => String(c || '').trim().toLowerCase();
            const cleanedItems = items.filter(item =>
                !oldDefaultItemNames.some(n => cleanName(n) === cleanName(item.name)) &&
                !oldDefaultCategories.includes(item.category) &&
                !oldDefaultItemCategoryPairs.some(([n, c]) => cleanName(n) === cleanName(item.name) && cleanCat(c) === cleanCat(item.category))
            );
            // Mirror to localStorage so offline pages stay in sync
            localStorage.setItem(fallbackApi.ITEMS_KEY, JSON.stringify(cleanedItems));
            return cleanedItems;
        }

        // Server unavailable or returned nothing — fall back to localStorage seed
        const defaultItems = await fallbackApi.getAllInventory();
        if (this.serverAvailable && Array.isArray(defaultItems)) {
            defaultItems.forEach(item => api.saveInventoryItem(item).catch(() => { }));
        }
        return defaultItems;
    }
    getInventoryItem(id) { return this.execute('getInventoryItem', id); }
    saveInventoryItem(item) { return this.execute('saveInventoryItem', item); }
    updateStock(items) { return this.execute('updateStock', items); }
    deleteInventoryItem(id) { return this.execute('deleteInventoryItem', id); }
    getAllSettings() { return this.execute('getAllSettings'); }
    saveSetting(key, value) { return this.execute('saveSetting', key, value); }
    rolloverFiscalYear(newBSYear, newFiscalYearStr) { return this.execute('rolloverFiscalYear', newBSYear, newFiscalYearStr); }
    getSalesSummary(period) { return this.execute('getSalesSummary', period); }

    // AR & Customer CRM methods
    getARAccounts() { return this.execute('getARAccounts'); }
    getCustomers(filters) { return this.execute('getCustomers', filters); }
    getCustomerByPhone(phone) { return this.execute('getCustomerByPhone', phone); }
    recordCustomerSale(saleData, paymentMode) { return this.execute('recordCustomerSale', saleData, paymentMode); }
    getARAccount(name) { return this.execute('getARAccount', name); }
    recordARPayment(data) { return this.execute('recordARPayment', data); }
    getARTransactions(name) { return this.execute('getARTransactions', name); }
    createCreditSale(data) { return this.execute('createCreditSale', data); }
    deleteSale(billNo) { return this.execute('deleteSale', billNo); }
    repairARAccount(name) { return this.execute('repairARAccount', name); }
    saveCustomer(customerData) { return this.execute('saveCustomer', customerData); }
    toggleCustomerActive(customerName, isActive) { return this.execute('toggleCustomerActive', customerName, isActive); }
    addCustomerTimelineEvent(customerName, event) { return this.execute('addCustomerTimelineEvent', customerName, event); }
    rebuildARStats() { return this.execute('rebuildARStats'); }

    // Credit Note methods
    createCreditNote(data) { return this.execute('createCreditNote', data); }
    getAllCreditNotes() { return this.execute('getAllCreditNotes'); }
    getNextCreditNoteNumber() { return this.execute('getNextCreditNoteNumber'); }

    // Debit Note methods
    createDebitNote(data) { return this.execute('createDebitNote', data); }
    getAllDebitNotes() { return this.execute('getAllDebitNotes'); }
    getNextDebitNoteNumber() { return this.execute('getNextDebitNoteNumber'); }

    // Purchase methods
    getAllPurchases(filters) { return this.execute('getAllPurchases', filters); }
    createPurchase(data) { return this.execute('createPurchase', data); }
    getNextPINumber() { return this.execute('getNextPINumber'); }

    // Sales Invoice methods
    getAllSalesInvoices(filters) { return this.execute('getAllSalesInvoices', filters); }
    createSalesInvoice(data) { return this.execute('createSalesInvoice', data); }
    getNextSINumber() { return this.execute('getNextSINumber'); }
}

// Export smart API instance
window.posAPI = new SmartAPI();
