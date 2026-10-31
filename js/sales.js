
function applyBusinessTypeSalesUI() {
    const isPanOnly = storeSettings.businessType === 'pan_only';
    const tabs = document.querySelector('.tabs');
    if (tabs) {
        tabs.style.display = 'none';
    }
    const thVat = document.getElementById('th-vat');
    if (thVat) {
        thVat.style.display = isPanOnly ? 'none' : '';
    }
}


let currentSalesTab = 'all';

function switchSalesTab(tab) {
    currentSalesTab = tab;
    const searchInput = document.getElementById('salesSearch');
    renderSalesTable(searchInput ? searchInput.value : '');
}

let allSales = [];
let allCreditNotes = [];
let storeSettings = {};

const STORAGE_SALES_KEY = 'pos_sales';
const STORAGE_SETTINGS_KEY = 'pos_settings';

function init() {
    migrateLocalSales();
    loadSettings();
    loadSales();
    applyReceiptSettings(); // Sync header labels on init
    initSmoothTableScroll();

    // Listeners
    const salesSearch = document.getElementById('salesSearch');
    const salesSearchClear = document.getElementById('salesSearchClear');

    if (salesSearch) {
        salesSearch.addEventListener('input', (e) => {
            updateSalesSearchClearButton();
            renderSalesTable(e.target.value);
        });
    }

    if (salesSearchClear) {
        salesSearchClear.addEventListener('click', clearSalesSearch);
    }

    updateSalesSearchClearButton();
}

function initSmoothTableScroll() {
    const containers = document.querySelectorAll('.table-container');
    containers.forEach(container => {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let hasDragged = false;
        let velX = 0;
        let lastX = 0;
        let momentumID = null;

        // Smooth mouse wheel horizontal scrolling
        container.addEventListener('wheel', (e) => {
            if (container.scrollWidth <= container.clientWidth) return;
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (delta !== 0) {
                const atLeft = container.scrollLeft <= 0 && delta < 0;
                const atRight = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1 && delta > 0;
                if (!atLeft && !atRight) {
                    e.preventDefault();
                    container.scrollLeft += delta;
                }
            }
        }, { passive: false });

        // Smooth drag-to-scroll (mouse drag left/right)
        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, a, input, select, textarea, .btn, .action-btn')) return;
            if (container.scrollWidth <= container.clientWidth) return;

            isDown = true;
            hasDragged = false;
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            lastX = e.pageX;
            velX = 0;
            if (momentumID) cancelAnimationFrame(momentumID);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX);
            if (Math.abs(walk) > 4) {
                hasDragged = true;
                container.classList.add('is-dragging');
            }
            container.scrollLeft = scrollLeft - walk;
            velX = e.pageX - lastX;
            lastX = e.pageX;
        });

        const stopDragging = () => {
            if (!isDown) return;
            isDown = false;
            setTimeout(() => {
                container.classList.remove('is-dragging');
            }, 50);

            if (hasDragged && Math.abs(velX) > 1.5) {
                let momentum = velX * 1.2;
                const applyMomentum = () => {
                    if (Math.abs(momentum) > 0.5 && !isDown) {
                        container.scrollLeft -= momentum;
                        momentum *= 0.92;
                        momentumID = requestAnimationFrame(applyMomentum);
                    }
                };
                momentumID = requestAnimationFrame(applyMomentum);
            }
        };

        window.addEventListener('mouseup', stopDragging);
        container.addEventListener('mouseleave', () => {
            if (isDown) stopDragging();
        });

        container.addEventListener('click', (e) => {
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                hasDragged = false;
            }
        }, true);
    });
}

function updateSalesSearchClearButton() {
    const salesSearch = document.getElementById('salesSearch');
    const salesSearchClear = document.getElementById('salesSearchClear');
    if (!salesSearch || !salesSearchClear) return;
    salesSearchClear.style.display = salesSearch.value.trim() ? 'flex' : 'none';
}

function clearSalesSearch() {
    const salesSearch = document.getElementById('salesSearch');
    if (!salesSearch) return;
    salesSearch.value = '';
    updateSalesSearchClearButton();
    renderSalesTable('');
    salesSearch.focus();
}

function applyReceiptSettings(customSettings = storeSettings) {
    const activeSettings = customSettings || storeSettings || {};
    const snLab = activeSettings.snLabel || 'S.N.';
    const partLab = activeSettings.particularsLabel || 'Particulars';
    const qtyLab = activeSettings.qtyLabel || 'Qty';
    const rateLab = activeSettings.rateLabel || 'Rate';
    const amtLab = activeSettings.amtLabel || 'Amt';

    if (document.getElementById('p-snLabel')) document.getElementById('p-snLabel').textContent = snLab;
    if (document.getElementById('p-particularsLabel')) document.getElementById('p-particularsLabel').textContent = partLab;
    if (document.getElementById('p-qtyLabel')) document.getElementById('p-qtyLabel').textContent = qtyLab;
    if (document.getElementById('p-rateLabel')) document.getElementById('p-rateLabel').textContent = rateLab;
    if (document.getElementById('p-amtLabel')) document.getElementById('p-amtLabel').textContent = amtLab;
    if (document.getElementById('p-totalWords-label')) document.getElementById('p-totalWords-label').textContent = (activeSettings.wordsLabel || 'In Words') + ': ';
    applyReceiptPaperTextSize(undefined, activeSettings);
}

function applyReceiptPaperTextSize(isVatInvoice, customSettings = storeSettings) {
    const activeSettings = customSettings || storeSettings || {};
    const paperWidth = Math.max(40, parseFloat(activeSettings.paperWidth) || 58);
    const storeNameText = String(activeSettings.storeName || 'K Pos').trim();
    const storeNameFitSize = ((paperWidth - 6) * 3.78) / (Math.max(storeNameText.length, 1) * 0.78);
    const readReceiptSize = (key, fallback) => {
        const value = parseFloat(activeSettings[key]);
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
    const isPanReceipt = activeSettings.businessType === 'pan_only' || (activeSettings.businessType !== 'vat_registered' && (storeSettings && storeSettings.businessType === 'pan_only'));
    const billTitleSize = isPanReceipt
        ? Math.max(7, Math.min(24, readReceiptSize('panBillFontSize', autoBillTitleSize)))
        : (isVatInvoice
            ? Math.max(7, Math.min(24, readReceiptSize('taxInvoiceFontSize', autoBillTitleSize)))
            : Math.max(7, Math.min(24, readReceiptSize('abbreviatedTaxInvoiceFontSize', autoBillTitleSize))));
    const metaSize = Math.max(8, Math.min(13.5, paperWidth * 0.165));
    const thSize = Math.max(7.5, Math.min(12.5, paperWidth * 0.15));
    const tdSize = Math.max(7.5, Math.min(12.5, paperWidth * 0.15));
    const wordsSize = Math.max(7, Math.min(24, readReceiptSize('wordsFontSize', Math.max(7, Math.min(12, paperWidth * 0.14)))));
    const footerSize = Math.max(7, Math.min(24, readReceiptSize('footerFontSize', Math.max(7, Math.min(12, paperWidth * 0.14)))));

    const partLabText = String(activeSettings.particularsLabel || 'Particulars').trim();
    const partFitSize = ((paperWidth * 0.37 - 1) * 3.78) / (Math.max(partLabText.length, 1) * 0.62);
    const finalThSize = Math.max(7, Math.min(thSize, partFitSize));
    const headerSizes = {
        'p-snLabel': Math.max(7, Math.min(24, readReceiptSize('snFontSize', finalThSize))),
        'p-particularsLabel': Math.max(7, Math.min(24, readReceiptSize('particularsFontSize', finalThSize))),
        'p-qtyLabel': Math.max(7, Math.min(24, readReceiptSize('qtyFontSize', finalThSize))),
        'p-rateLabel': Math.max(7, Math.min(24, readReceiptSize('rateFontSize', finalThSize))),
        'p-amtLabel': Math.max(7, Math.min(24, readReceiptSize('amtFontSize', finalThSize)))
    };

    const printableArea = document.getElementById('printableArea');
    const printableDiv = printableArea ? printableArea.querySelector('div') : null;
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

function isSalePan(sale) {
    if (!sale) return false;
    const bType = String(sale.businessType || '').toLowerCase().trim();
    if (bType === 'pan_only' || bType === 'pan') return true;
    if (bType === 'vat_registered' || bType === 'vat') return false;
    if (sale.status === 'PAID_PAN') return true;

    if (window.BusinessManager && typeof window.BusinessManager.getBusinessById === 'function' && sale.business_id) {
        const biz = window.BusinessManager.getBusinessById(sale.business_id);
        if (biz) {
            const isBizPan = biz.registration_type === 'pan' || biz.business_type === 'pan_only' || biz.registrationType === 'pan';
            if (isBizPan) return true;
            const isBizVat = biz.registration_type === 'vat' || biz.business_type === 'vat_registered' || biz.registrationType === 'vat';
            if (isBizVat) return false;
        }
    }

    let sSettings = sale.storeSettings;
    if (typeof sSettings === 'string') {
        try { sSettings = JSON.parse(sSettings); } catch(e) { sSettings = null; }
    }
    if (sSettings) {
        const sbType = String(sSettings.businessType || '').toLowerCase().trim();
        if (sbType === 'pan_only' || sbType === 'pan') return true;
        if (sbType === 'vat_registered' || sbType === 'vat') return false;
    }

    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    if (curBiz) {
        const isCurPan = curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan';
        if (isCurPan) return true;
        const isCurVat = curBiz.registration_type === 'vat' || curBiz.business_type === 'vat_registered' || curBiz.registrationType === 'vat';
        if (isCurVat) return false;
    }

    const globalType = String(storeSettings.businessType || '').toLowerCase().trim();
    if (globalType === 'pan_only' || globalType === 'pan') return true;

    return false;
}

function loadSettings() {
    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    let isPan = false;
    if (curBiz) {
        isPan = curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan';
    }
    const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
    storeSettings = stored ? window.safeJSONParse(stored, {}) : {
        storeName: 'K Pos',
        address: '123 Food Street',
        phone: '9876543210',
        footer: 'Thank you for your visit!',
        businessType: isPan ? 'pan_only' : 'vat_registered'
    };
    if (curBiz) {
        storeSettings.businessType = isPan ? 'pan_only' : 'vat_registered';
        storeSettings.storeName = curBiz.name || curBiz.storeName || storeSettings.storeName;
        storeSettings.address = curBiz.address !== undefined ? curBiz.address : (curBiz.storeAddress !== undefined ? curBiz.storeAddress : storeSettings.address);
        storeSettings.phone = curBiz.phone !== undefined ? curBiz.phone : (curBiz.storePhone !== undefined ? curBiz.storePhone : storeSettings.phone);
        const regNum = (curBiz.pan_no || curBiz.vat_no || curBiz.panNo || curBiz.vatNo || curBiz.pan || curBiz.vat || '').trim();
        storeSettings.panNo = isPan ? (curBiz.pan_no || curBiz.panNo || regNum) : '';
        storeSettings.vatNoActual = isPan ? '' : (curBiz.vat_no || curBiz.vatNo || regNum);
        storeSettings.vatNo = isPan ? storeSettings.panNo : storeSettings.vatNoActual;
        storeSettings.vatLabelType = isPan ? 'PAN' : 'VAT';
        storeSettings.billPrefix = curBiz.bill_prefix !== undefined ? curBiz.bill_prefix : storeSettings.billPrefix;
        storeSettings.startingNo = curBiz.starting_no !== undefined ? curBiz.starting_no : storeSettings.startingNo;
        storeSettings.footer = curBiz.footer !== undefined ? curBiz.footer : storeSettings.footer;
    }
    if (window.posAPI && typeof window.posAPI.getAllSettings === 'function') {
        window.posAPI.getAllSettings().then(s => {
            const freshBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
            let localSettings = {};
            try {
                localSettings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
            } catch (e) {}
            storeSettings = Object.assign({}, storeSettings, s || {}, localSettings);
            if (freshBiz) {
                const freshIsPan = freshBiz.registration_type === 'pan' || freshBiz.business_type === 'pan_only' || freshBiz.registrationType === 'pan';
                storeSettings.businessType = freshIsPan ? 'pan_only' : 'vat_registered';
                storeSettings.storeName = freshBiz.name || freshBiz.storeName || storeSettings.storeName;
                storeSettings.address = freshBiz.address !== undefined ? freshBiz.address : (freshBiz.storeAddress !== undefined ? freshBiz.storeAddress : storeSettings.address);
                storeSettings.phone = freshBiz.phone !== undefined ? freshBiz.phone : (freshBiz.storePhone !== undefined ? freshBiz.storePhone : storeSettings.phone);
                const regNum = (freshBiz.pan_no || freshBiz.vat_no || freshBiz.panNo || freshBiz.vatNo || freshBiz.pan || freshBiz.vat || '').trim();
                storeSettings.panNo = freshIsPan ? (freshBiz.pan_no || freshBiz.panNo || regNum) : '';
                storeSettings.vatNoActual = freshIsPan ? '' : (freshBiz.vat_no || freshBiz.vatNo || regNum);
                storeSettings.vatNo = freshIsPan ? storeSettings.panNo : storeSettings.vatNoActual;
                storeSettings.vatLabelType = freshIsPan ? 'PAN' : 'VAT';
                storeSettings.billPrefix = freshBiz.bill_prefix !== undefined ? freshBiz.bill_prefix : storeSettings.billPrefix;
                storeSettings.startingNo = freshBiz.starting_no !== undefined ? freshBiz.starting_no : storeSettings.startingNo;
                storeSettings.footer = freshBiz.footer !== undefined ? freshBiz.footer : storeSettings.footer;
            }
            applyBusinessTypeSalesUI();
            renderSalesTable();
        }).catch(() => {});
    }
    applyBusinessTypeSalesUI();
}

function loadSales() {
    const startEl = document.getElementById('startDate');
    const endEl = document.getElementById('endDate');
    const startDate = startEl ? startEl.value : '';
    const endDate = endEl ? endEl.value : '';

    const salesPromise = window.posAPI.getAllSales({ startDate, endDate });
    const cnPromise = window.posAPI.getAllCreditNotes();

    Promise.all([salesPromise, cnPromise])
        .then(([salesData, cnData]) => {
            allSales = Array.isArray(salesData) ? salesData : [];
            allCreditNotes = Array.isArray(cnData) ? cnData : [];
            renderSalesTable();
        })
        .catch(err => {
            console.error('Failed to load sales data:', err);
            allSales = [];
            allCreditNotes = [];
            renderSalesTable();
        });
}

function migrateLocalSales() {
    const salesStr = localStorage.getItem('pos_sales');
    if (!salesStr) return;

    try {
        const sales = window.safeJSONParse ? window.safeJSONParse(salesStr, []) : JSON.parse(salesStr || '[]');
        if (!Array.isArray(sales) || sales.length === 0) return;

        let modified = false;

        if (!localStorage.getItem('pos_migration_resequence_v1')) {
            sales.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
            sales.forEach((s, i) => {
                s.billNo = `${i + 1}-082/83`;
            });
            localStorage.setItem('pos_migration_resequence_v1', 'true');
            modified = true;
        }

        // Snapshot settings and business_id on existing sales that don't have them
        const defaultSettings = window.safeJSONParse ? window.safeJSONParse(localStorage.getItem('pos_settings') || '{}', {}) : {};
        sales.forEach(s => {
            if (!s.business_id) {
                s.business_id = 'biz_1';
                modified = true;
            }
            if (!s.storeSettings || typeof s.storeSettings !== 'object' || Object.keys(s.storeSettings).length === 0) {
                s.storeSettings = JSON.parse(JSON.stringify(defaultSettings));
                modified = true;
            }
        });

        if (modified) {
            localStorage.setItem('pos_sales', JSON.stringify(sales));
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

function renderSalesTable(query = '') {
    const tbody = document.getElementById('sales-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(allSales)) {
        allSales = [];
    }

    const term = (query || '').toLowerCase().trim();
    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    const isPanOnlyMode = curBiz
        ? (curBiz.registration_type === 'pan' || curBiz.business_type === 'pan_only' || curBiz.registrationType === 'pan')
        : (storeSettings.businessType === 'pan_only');
    const thVat = document.getElementById('th-vat');
    if (thVat) {
        thVat.style.display = isPanOnlyMode ? 'none' : '';
    }

    const filtered = allSales.filter(sale => {
        if (!sale) return false;
        const isPanSale = isSalePan(sale);

        if (isPanOnlyMode) {
            // When PAN Only is selected in profile/settings, ONLY show PAN records (hide VAT sales)
            if (!isPanSale) return false;
        } else {
            // When VAT Registered is selected in profile/settings, ONLY show VAT records (hide PAN sales)
            if (isPanSale) return false;
        }

        return (
            (sale.billNo || '').toString().toLowerCase().includes(term) ||
            (sale.customer || '').toLowerCase().includes(term) ||
            (sale.customerAddress || sale.address || '').toLowerCase().includes(term) ||
            (sale.customerPhone || '').toString().includes(term) ||
            (sale.customerPAN || '').toString().includes(term)
        );
    });

    // Sort by date descending — newest bills at top
    filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    if (filtered.length === 0) {
        const emptyTr = document.createElement('tr');
        emptyTr.innerHTML = `
            <td colspan="${isPanOnlyMode ? 13 : 14}" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                <div style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.25rem;">No sales records found</div>
                <div style="font-size: 0.85rem;">New sales and transactions will appear here</div>
            </td>
        `;
        tbody.appendChild(emptyTr);
        return;
    }

    filtered.forEach(sale => {
        const date = new Date(sale.timestamp || Date.now());
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';

        const isCredit = sale.paymentMode === 'CREDIT';
        const isPaid = sale.status === 'PAID';
        const isCancelled = sale.status === 'CANCELLED';
        const isReturned = sale.status === 'RETURNED';

        let displayMode = sale.paymentMode || 'CASH';
        let modeBadge = 'badge-success';

        if (isCredit) {
            if (isPaid) {
                displayMode = 'PAID (CR)';
                modeBadge = 'badge-success';
            } else {
                displayMode = 'CREDIT';
                modeBadge = 'badge-warning';
            }
        }

        let statusLabel = sale.status || 'PAID';
        let statusBadge = 'badge-success';
        if (isCancelled) statusBadge = 'badge-danger';
        if (isReturned) statusBadge = 'badge-warning';

        let pDateStr = date.toLocaleDateString();
        let sDateStr = '';
        if (typeof window.convertToBS === 'function') {
            const bs = window.convertToBS(date);
            if (bs) {
                pDateStr = `${bs} BS`;
                sDateStr = ` <span style="font-size: 0.8rem; color: var(--text-muted);">(${date.toLocaleDateString()} AD)</span>`;
            }
        }

        const saleItems = Array.isArray(sale.items)
            ? sale.items
            : (typeof sale.items === 'string' ? (window.safeJSONParse ? window.safeJSONParse(sale.items, []) : []) : []);

        const totalSold = saleItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);
        const creditNotesList = Array.isArray(allCreditNotes) ? allCreditNotes : [];
        const billReturns = creditNotesList.filter(cn => cn && cn.originalBillNo == sale.billNo);
        const totalReturned = billReturns.reduce((sum, cn) => {
            const cnItems = Array.isArray(cn.items)
                ? cn.items
                : (typeof cn.items === 'string' ? (window.safeJSONParse ? window.safeJSONParse(cn.items, []) : []) : []);
            return sum + cnItems.reduce((isum, i) => isum + Math.abs(parseFloat(i.qty) || 0), 0);
        }, 0);

        // Block actions if cancelled, fully returned, or negative sale (return record itself)
        const saleTotal = parseFloat(sale.total) || 0;
        const isFullyReturned = totalReturned >= totalSold && totalSold > 0;
        const hideActions = isCancelled || isReturned || isFullyReturned || saleTotal < 0;

        const isPanSale = isSalePan(sale);
        let vatAmount = 0;
        if (!isPanSale) {
            if (sale.vat != null && !isNaN(parseFloat(sale.vat)) && parseFloat(sale.vat) > 0) {
                vatAmount = parseFloat(sale.vat);
            } else if (Array.isArray(saleItems) && saleItems.length > 0) {
                let computedVat = 0;
                saleItems.forEach(item => {
                    const itemQty = parseFloat(item.qty || 0);
                    const itemPrice = parseFloat(item.price || 0);
                    const rackAmt = itemQty * itemPrice;
                    let rate = 13;
                    if (item.vatRate !== undefined && item.vatRate !== null && item.vatRate !== '') {
                        rate = (item.vatRate === 'none' || item.vatRate === '0' || item.vatRate === 0) ? 0 : (parseFloat(item.vatRate) || 13);
                    } else if (item.vat_rate !== undefined && item.vat_rate !== null && item.vat_rate !== '') {
                        rate = (item.vat_rate === 'none' || item.vat_rate === '0' || item.vat_rate === 0) ? 0 : (parseFloat(item.vat_rate) || 13);
                    } else if (item.vat !== undefined && item.vat !== null && item.vat !== '' && item.vat !== 0 && item.vat !== '0') {
                        rate = parseFloat(item.vat) || 13;
                    }
                    if (rate > 0) {
                        const base = rackAmt / (1 + (rate / 100));
                        computedVat += (rackAmt - base);
                    }
                });
                if (computedVat > 0) {
                    vatAmount = computedVat;
                } else if (saleTotal > 0) {
                    const base = saleTotal / 1.13;
                    vatAmount = saleTotal - base;
                }
            } else if (saleTotal > 0) {
                const base = saleTotal / 1.13;
                vatAmount = saleTotal - base;
            }
        }

        const typeBadge = isPanSale
            ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">PAN</span>`
            : `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">VAT</span>`;

        tr.innerHTML = `
            <td style="padding: 1rem;">#${sale.billNo || '-'}</td>
            <td style="padding: 1rem;">${typeBadge}</td>
            <td style="padding: 1rem;">
                ${pDateStr}${sDateStr}<br>
                <small style="color: var(--text-muted);">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </td>
            <td style="padding: 1rem;"><strong>${sale.customer || 'Walk-in'}</strong></td>
            <td style="padding: 1rem;">${sale.customerAddress || sale.address || '-'}</td>
            <td style="padding: 1rem;">${sale.customerPhone || '-'}</td>
            <td style="padding: 1rem;">${sale.customerPAN || '-'}</td>
            <td style="padding: 1rem;"><span class="badge ${modeBadge}">${displayMode}</span></td>
            <td style="padding: 1rem;"><span class="badge ${statusBadge}">${isFullyReturned ? 'RETURNED' : statusLabel}</span></td>
            <td style="padding: 1rem; text-align: center;">${saleItems.length}</td>
            <td style="padding: 1rem; text-align: center;">${totalSold % 1 === 0 ? totalSold : totalSold.toFixed(2)}</td>
            ${isPanOnlyMode ? '' : `<td style="padding: 1rem; text-align: right; font-weight: 500; color: var(--text-secondary);">${isPanSale ? '-' : 'Rs. ' + vatAmount.toFixed(2)}</td>`}
            <td style="padding: 1rem; text-align: right; font-weight: 600;">Rs. ${saleTotal.toFixed(2)}</td>
            <td style="padding: 1rem; text-align: right;">
                <div style="display: flex; gap: 0.25rem; justify-content: flex-end; align-items: center;">
                  <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="previewSale('${sale.billNo}')" title="Preview Receipt">Preview</button>
                  ${(!hideActions) ? `
                  <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #6366f1; color: white; border: none;" onclick="issueReturn('${sale.billNo}')" title="Issue Credit Note (Return)">Return</button>
                  ` : ''}
                  ${(!hideActions) ? `
                  <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteSale('${sale.billNo}')" title="Void Bill">Void</button>
                  ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function prepareReceiptDOM(billNo) {
    const targetBill = String(billNo || '').trim().toLowerCase();
    const sale = allSales.find(s => 
        String(s.billNo || '').trim().toLowerCase() === targetBill ||
        String(s.id || '').trim() === targetBill
    );
    if (!sale) return;

    // Identify the Business and Settings for this bill
    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    const saleBiz = (sale.business_id && window.BusinessManager && typeof window.BusinessManager.getBusinessById === 'function')
        ? window.BusinessManager.getBusinessById(sale.business_id)
        : null;
    const activeBiz = saleBiz || curBiz;

    let saleSettings = sale.storeSettings;
    if (typeof saleSettings === 'string') {
        saleSettings = window.safeJSONParse ? window.safeJSONParse(saleSettings, null) : null;
    }
    if (!saleSettings || typeof saleSettings !== 'object' || Object.keys(saleSettings).length === 0) {
        saleSettings = {};
    }

    const isPanOnly = isSalePan(sale);
    const isVatInvoice = !isPanOnly && !!sale.isVatInvoice;

    // Resolve store header details from activeBiz/storeSettings
    const effStoreName = (activeBiz && (activeBiz.name || activeBiz.storeName)) 
        || storeSettings.storeName 
        || saleSettings.storeName 
        || 'K Pos';

    const effAddress = (activeBiz && (activeBiz.address !== undefined ? activeBiz.address : activeBiz.storeAddress)) 
        || (storeSettings.address !== undefined ? storeSettings.address : saleSettings.address) 
        || '';

    const effPhone = (activeBiz && (activeBiz.phone !== undefined ? activeBiz.phone : activeBiz.storePhone)) 
        || (storeSettings.phone !== undefined ? storeSettings.phone : saleSettings.phone) 
        || '';

    const effPanNo = (activeBiz && (activeBiz.pan_no || activeBiz.panNo || activeBiz.pan))
        || storeSettings.panNo 
        || saleSettings.panNo 
        || '';

    const effVatNoActual = (activeBiz && (activeBiz.vat_no || activeBiz.vatNo || activeBiz.vat))
        || storeSettings.vatNoActual 
        || saleSettings.vatNoActual 
        || '';

    const effFooter = (activeBiz && activeBiz.footer) 
        || storeSettings.footer 
        || saleSettings.footer 
        || 'Thank you for your visit!';

    const mergedSettings = Object.assign({}, storeSettings, saleSettings, {
        storeName: effStoreName,
        address: effAddress,
        phone: effPhone,
        panNo: effPanNo,
        vatNoActual: effVatNoActual,
        footer: effFooter,
        businessType: isPanOnly ? 'pan_only' : 'vat_registered'
    });

    // Apply Invoice Format Settings
    const printableArea = document.getElementById('printableArea');
    const printableDiv = printableArea ? printableArea.querySelector('div') : null;
    if (printableDiv) {
        printableDiv.style.fontSize = (mergedSettings.baseFontSize || 11) + 'px';
        printableDiv.style.lineHeight = (mergedSettings.lineHeight || 1.3);
        printableDiv.style.width = (mergedSettings.paperWidth || 58) + 'mm';
        applyReceiptPaperTextSize(isVatInvoice, mergedSettings);
    }

    // Populate Store Info
    document.getElementById('p-storeName').textContent = effStoreName;
    document.getElementById('p-address').textContent = effAddress;

    const vatEl = document.getElementById('p-vatNo');
    const vatRow = document.getElementById('p-vat-row');
    if (vatEl && vatRow) {
        const vatLabelType = isPanOnly ? 'PAN' : (mergedSettings.vatLabelType || 'VAT');
        const displayTaxNo = isPanOnly 
            ? (effPanNo || effVatNoActual || mergedSettings.vatNo) 
            : (vatLabelType === 'VAT' ? (effVatNoActual || effPanNo || mergedSettings.vatNo) : (effPanNo || effVatNoActual || mergedSettings.vatNo));
        if (displayTaxNo) {
            vatRow.style.display = 'block';
            const vatLabelEl = document.getElementById('p-vat-label');
            if (vatLabelEl) vatLabelEl.textContent = vatLabelType;
            vatEl.textContent = displayTaxNo;
        } else {
            vatRow.style.display = 'none';
        }
    }

    const phoneEl = document.getElementById('p-phone');
    const storePhoneRow = document.getElementById('p-phone-row');
    if (phoneEl && storePhoneRow) {
        if (effPhone) {
            storePhoneRow.style.display = 'block';
            phoneEl.textContent = effPhone;
        } else {
            storePhoneRow.style.display = 'none';
        }
    }

    document.getElementById('p-footer').textContent = effFooter;
    document.getElementById('p-billNo').textContent = sale.billNo;

    const date = new Date(sale.timestamp);
    const bsDate = typeof window.convertToBS === 'function' ? window.convertToBS(date) : '';

    // Custom Date Formatting: (3/16/2026 AD) 02:39:27 PM (2082/12/03 BS)
    const adDatePart = `(${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} AD)`;
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const bsDateStr = bsDate ? `(${bsDate.replace(/-/g, '/')} BS)` : '';
    const timeParts = timePart.match(/^(.*)\s(AM|PM)$/);
    const timeWithoutMeridiem = timeParts ? timeParts[1] : timePart;
    const meridiem = timeParts ? timeParts[2] : '';
    const firstDateLine = `${bsDateStr} ${timeWithoutMeridiem}`.trim();
    const secondDateLine = ` ${meridiem} ${adDatePart}`;

    const pDate = document.getElementById('p-date-AD') || document.getElementById('p-date-ad');
    const pDateBS = document.getElementById('p-date-BS') || document.getElementById('p-date-bs');

    if (pDate) {
        pDate.textContent = firstDateLine;
        pDate.style.fontStyle = 'normal';
        pDate.style.whiteSpace = 'nowrap';
    }
    if (pDateBS && pDateBS !== pDate) {
        pDateBS.textContent = secondDateLine;
        pDateBS.style.fontStyle = 'normal';
        pDateBS.style.whiteSpace = 'nowrap';
        pDateBS.style.display = 'block';
    }

    // Handle Customer Details for THIS specific bill
    const pCustomer = document.getElementById('p-customer');
    if (pCustomer) {
        const custName = (sale.customer && sale.customer.trim() !== '' && sale.customer !== 'Walk-in') ? sale.customer.trim() : '-';
        pCustomer.textContent = custName;
    }

    const pCustomerAddress = document.getElementById('p-customerAddress');
    if (pCustomerAddress) {
        const custAddr = (sale.customerAddress && sale.customerAddress.trim() !== '') 
            ? sale.customerAddress.trim() 
            : (sale.address && sale.address.trim() !== '' ? sale.address.trim() : '-');
        pCustomerAddress.textContent = custAddr;
    }

    const panSpan = document.getElementById('p-customerpan');
    if (panSpan) {
        const custPan = (sale.customerPAN && sale.customerPAN.trim() !== '') 
            ? sale.customerPAN.trim() 
            : (sale.vatNo && sale.vatNo.trim() !== '' ? sale.vatNo.trim() : '-');
        panSpan.textContent = custPan;
    }

    const pCustomerPhone = document.getElementById('p-customerPhone');
    if (pCustomerPhone) {
        const custPhone = (sale.customerPhone && sale.customerPhone !== '-' && sale.customerPhone.trim() !== '') ? sale.customerPhone.trim() : '-';
        pCustomerPhone.textContent = custPhone;
    }

    let payModeText = sale.paymentMode || 'CASH';
    if (sale.paymentMode === 'CREDIT') {
        payModeText = sale.status === 'PAID' ? 'Settled (Credit)' : 'Credit (A/C Receivable)';
    } else if (sale.paymentMode === 'ESEWA') {
        payModeText = 'eSewa';
    }
    document.getElementById('p-payMode').textContent = payModeText;

    const pCashier = document.getElementById('p-cashier');
    if (pCashier) pCashier.textContent = sale.cashier || (saleSettings && saleSettings.cashier) || 'Admin';

    const billTitle = document.getElementById('p-bill-title');
    if (billTitle) {
        if (isPanOnly) {
            billTitle.textContent = mergedSettings.panBillLabel || 'BILL';
        } else {
            billTitle.textContent = isVatInvoice 
                ? (mergedSettings.taxInvoiceLabel || 'TAX INVOICE') 
                : (mergedSettings.abbreviatedTaxInvoiceLabel || 'ABBREVIATED TAX INVOICE');
        }
    }

    const pItems = document.getElementById('p-items');
    if (pItems) pItems.innerHTML = '';
    let totalQty = 0;
    let grossAmount = 0;
    let taxableBase = 0;
    let nonTaxableBase = 0;
    let totalVatAmount = 0;
    let totalRackAmount = 0;
    const vatRatesUsed = new Set();

    const saleItems = Array.isArray(sale.items)
        ? sale.items
        : (typeof sale.items === 'string' ? (window.safeJSONParse ? window.safeJSONParse(sale.items, []) : []) : []);

    let storedInventory = Array.isArray(window.inventory) && window.inventory.length > 0 ? window.inventory : [];
    if (storedInventory.length === 0) {
        try {
            storedInventory = JSON.parse(localStorage.getItem('pos_items') || '[]');
        } catch (e) {
            storedInventory = [];
        }
    }

    saleItems.forEach((item, index) => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.price) || 0;
        const rackPrice = qty * price;
        totalQty += qty;
        totalRackAmount += rackPrice;

        const inv = storedInventory.find(invItem => (invItem.id != null && item.id != null && String(invItem.id) === String(item.id)) || (invItem.name && item.name && invItem.name.trim().toLowerCase() === item.name.trim().toLowerCase()));
        const rawHsc = (item.hsCode || item.hscCode || (inv && (inv.hsCode || inv.hscCode)) || '').toString().trim();
        let hscDisplay = '';
        if (rawHsc && rawHsc !== '—' && rawHsc !== '-') {
            const clean = rawHsc.replace(/^hsc\s*:\s*/i, '').trim();
            hscDisplay = clean ? `HSC: ${clean}` : 'HSC:';
        }

        let rate = 13;
        const rawRate = item.vatRate !== undefined ? item.vatRate 
            : (item.vat_rate !== undefined ? item.vat_rate 
            : (item.vat !== undefined ? item.vat : 13));

        if (isPanOnly || rawRate === 'none' || rawRate === '0' || rawRate === 0 || item.vatType === 'none') {
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
                displayRate = baseRate;
                displayAmount = baseAmount;
            } else {
                displayRate = price;
                displayAmount = rackPrice;
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="width: 7%; padding: 2px 1px 2px 0; vertical-align: top; text-align: left;">${index + 1}</td>
            <td style="width: 37%; padding: 2px 2px 2px 0; vertical-align: top; text-align: left; word-break: break-word; overflow-wrap: break-word;">${item.name || 'Unknown Item'}${hscDisplay ? `<div style="padding-left: 2px; margin-top: 1px;">${hscDisplay}</div>` : ''}</td>
            <td style="width: 17%; padding: 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${qty.toFixed(2)}</td>
            <td style="width: 18%; padding: 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${displayRate.toFixed(2)}</td>
            <td style="width: 21%; padding: 2px 0 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${displayAmount.toFixed(2)}</td>
        `;
        pItems.appendChild(tr);
    });

    const vatAmount = totalVatAmount;
    const discount = parseFloat(sale.discount) || 0;
    const savedNetAmount = parseFloat(sale.total);
    const netAmount = Number.isFinite(savedNetAmount)
        ? Math.max(0, savedNetAmount)
        : Math.max(0, totalRackAmount - discount);

    grossAmount = isVatInvoice ? (taxableBase + nonTaxableBase) : totalRackAmount;

    const elGrossRow    = document.getElementById('p-gross-row');
    const elDiscountRow = document.getElementById('p-discount-row');
    const elTaxableRow  = document.getElementById('p-taxable-row');
    const elNonTaxRow   = document.getElementById('p-nontaxable-row');
    const elVatRow      = document.getElementById('p-vat-breakdown-row');
    const elNetRow      = document.getElementById('p-net-row');
    const showGross = !isPanOnly && (isVatInvoice || discount > 0);
    if (elGrossRow)   elGrossRow.style.display   = (isPanOnly ? (discount > 0 ? 'table-row' : 'none') : (showGross ? 'table-row' : 'none'));
    if (elDiscountRow) {
        elDiscountRow.style.display = discount > 0 ? 'table-row' : 'none';
        const pDiscount = document.getElementById('p-discount');
        if (pDiscount) pDiscount.textContent = discount.toFixed(2);
    }
    if (elTaxableRow) elTaxableRow.style.display  = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elNonTaxRow)  elNonTaxRow.style.display   = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elVatRow)     elVatRow.style.display       = isPanOnly ? 'none' : (isVatInvoice ? 'table-row' : 'none');
    if (elNetRow)     elNetRow.style.display       = 'table-row';

    // Dynamic VAT label with percentage always shown
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

    if (document.getElementById('p-gross'))     document.getElementById('p-gross').textContent     = grossAmount.toFixed(2);
    if (document.getElementById('p-taxable'))   document.getElementById('p-taxable').textContent   = taxableBase.toFixed(2);
    if (document.getElementById('p-nontaxable'))document.getElementById('p-nontaxable').textContent= nonTaxableBase.toFixed(2);
    if (document.getElementById('p-vatAmount')) document.getElementById('p-vatAmount').textContent = vatAmount.toFixed(2);
    if (document.getElementById('p-total'))     document.getElementById('p-total').textContent     = netAmount.toFixed(2);

    const pTotalQty = document.getElementById('p-totalQty');
    if (pTotalQty) pTotalQty.textContent = totalQty % 1 === 0 ? String(totalQty) : totalQty.toFixed(2);

    const pTenderRow = document.getElementById('p-tender-row');
    const pChangeRow = document.getElementById('p-change-row');
    const pTenderDividerRow = document.getElementById('p-tender-divider-row');
    const pTendered = document.getElementById('p-tendered');
    const pChange = document.getElementById('p-change');

    if (sale.paymentMode === 'CASH') {
        const tenderedVal = parseFloat(sale.tendered != null ? sale.tendered : sale.total) || 0;
        const changeVal = parseFloat(sale.change != null ? sale.change : (tenderedVal - netAmount)) || 0;
        if (pTendered) pTendered.textContent = tenderedVal.toFixed(2);
        if (pChange) pChange.textContent = Math.max(0, changeVal).toFixed(2);
        if (pTenderRow) pTenderRow.style.display = 'table-row';
        if (pChangeRow) pChangeRow.style.display = 'table-row';
        if (pTenderDividerRow) pTenderDividerRow.style.display = 'table-row';
    } else {
        if (pTenderRow) pTenderRow.style.display = 'none';
        if (pChangeRow) pChangeRow.style.display = 'none';
        if (pTenderDividerRow) pTenderDividerRow.style.display = 'none';
    }

    // Convert total to words
    const pTotalWords = document.getElementById('p-totalWords');
    if (pTotalWords) {
        pTotalWords.textContent = numberToWords(netAmount);
        applyReceiptPaperTextSize(isVatInvoice, mergedSettings);
    }

    // Sync labels
    applyReceiptSettings(mergedSettings);

    return { sale, saleSettings: mergedSettings, isPanOnly, isVatInvoice, netAmount };
}

function viewSale(billNo) {
    const res = prepareReceiptDOM(billNo);
    if (!res) return;

    // Give browser a moment to render the populated fields
    setTimeout(() => {
        window.print();
    }, 300);
}

let currentPreviewBillNo = null;

function previewSale(billNo) {
    const res = prepareReceiptDOM(billNo);
    if (!res) return;
    currentPreviewBillNo = billNo;

    const titleEl = document.getElementById('receiptPreviewTitle');
    if (titleEl) {
        titleEl.textContent = `Receipt Preview - Bill #${res.sale.billNo || billNo}`;
    }

    const paper = document.getElementById('receiptPreviewPaper');
    const printableArea = document.getElementById('printableArea');
    if (paper && printableArea) {
        const receiptContent = printableArea.querySelector('div');
        if (receiptContent) {
            const paperWidth = (res.saleSettings.paperWidth || storeSettings.paperWidth || 58);
            paper.innerHTML = receiptContent.outerHTML;
            paper.style.width = 'max-content';
            paper.style.minWidth = paperWidth + 'mm';
            paper.style.maxWidth = '100%';
            paper.style.margin = '0 auto';
            paper.style.padding = '0';
            paper.style.overflowX = 'hidden';
            paper.style.boxSizing = 'border-box';
        }
    }

    const modal = document.getElementById('receiptPreviewModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeReceiptPreview() {
    const modal = document.getElementById('receiptPreviewModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentPreviewBillNo = null;
}

function printFromPreview() {
    if (!currentPreviewBillNo) return;
    viewSale(currentPreviewBillNo);
}

window.viewSale = viewSale;
window.previewSale = previewSale;
window.closeReceiptPreview = closeReceiptPreview;
window.printFromPreview = printFromPreview;

function exportCSV() {
    if (allSales.length === 0) {
        alert('No sales data to export');
        return;
    }

    // Show export options modal
    showExportModal();
}

function showExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Export Sales Report</h3>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 0.4rem;">✕</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Report Type</label>
                    <select id="reportType" class="form-input" style="width: 100%;">
                        <option value="summary">Summary Report (One row per sale)</option>
                        <option value="detailed">Detailed Report (Item breakdown)</option>
                        <option value="inventory">Inventory Impact Report</option>
                        <option value="payment">Payment Mode Analysis</option>
                    </select>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="includeStats" checked>
                        <span>Include Summary Statistics</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="executeExport()">Export CSV</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function executeExport() {
    const reportType = document.getElementById('reportType').value;
    const includeStats = document.getElementById('includeStats').checked;

    let csvContent = '';
    let filename = '';

    switch (reportType) {
        case 'summary':
            csvContent = generateSummaryReport(includeStats);
            filename = 'sales_summary';
            break;
        case 'detailed':
            csvContent = generateDetailedReport(includeStats);
            filename = 'sales_detailed';
            break;
        case 'inventory':
            csvContent = generateInventoryReport(includeStats);
            filename = 'inventory_impact';
            break;
        case 'payment':
            csvContent = generatePaymentReport(includeStats);
            filename = 'payment_analysis';
            break;
    }

    // Add date range to filename
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateStr = startDate && endDate ? `_${startDate}_to_${endDate}` : `_${new Date().toISOString().split('T')[0]}`;

    downloadCSV(csvContent, `${filename}${dateStr}.csv`);

    // Close modal
    document.querySelector('.modal-overlay').remove();
}

function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function generateSummaryReport(includeStats) {
    let csv = [];

    if (includeStats) {
        csv.push(['Sales Summary Report']);
        csv.push(['Generated', new Date().toLocaleString()]);
        csv.push(['Total Sales', allSales.length]);
        csv.push(['Total Revenue', `Rs. ${allSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}`]);
        csv.push(['Average Sale', `Rs. ${(allSales.reduce((sum, s) => sum + s.total, 0) / allSales.length).toFixed(2)}`]);
        csv.push([]);
    }

    // Headers
    csv.push(['Bill No', 'Date', 'Time', 'Customer', 'Phone', 'Payment Mode', 'Items Count', 'Total Amount', 'Cashier']);

    // Data rows
    allSales.forEach(sale => {
        const date = new Date(sale.timestamp);
        csv.push([
            sale.billNo,
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            escapeCSV(sale.customer),
            escapeCSV(sale.customerPhone || ''),
            sale.paymentMode || 'CASH',
            sale.items.length,
            sale.total.toFixed(2),
            escapeCSV(sale.cashier || 'N/A')
        ]);
    });

    return csv.map(row => row.join(',')).join('\n');
}

function generateDetailedReport(includeStats) {
    let csv = [];

    if (includeStats) {
        csv.push(['Detailed Sales Report (Item Breakdown)']);
        csv.push(['Generated', new Date().toLocaleString()]);
        csv.push(['Total Transactions', allSales.length]);
        const totalItems = allSales.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + i.qty, 0), 0);
        csv.push(['Total Items Sold', totalItems]);
        csv.push([]);
    }

    // Headers
    csv.push(['Bill No', 'Date', 'Time', 'Customer', 'Phone', 'Payment Mode', 'Item Name', 'Category', 'Quantity', 'Unit Price', 'Line Total', 'Bill Total']);

    // Data rows - one row per item
    allSales.forEach(sale => {
        const date = new Date(sale.timestamp);
        sale.items.forEach((item, index) => {
            csv.push([
                sale.billNo,
                index === 0 ? date.toLocaleDateString() : '',
                index === 0 ? date.toLocaleTimeString() : '',
                index === 0 ? escapeCSV(sale.customer) : '',
                index === 0 ? escapeCSV(sale.customerPhone || '') : '',
                index === 0 ? (sale.paymentMode || 'CASH') : '',
                escapeCSV(item.name),
                escapeCSV(item.category || ''),
                item.qty,
                item.price.toFixed(2),
                (item.qty * item.price).toFixed(2),
                index === 0 ? sale.total.toFixed(2) : ''
            ]);
        });
    });

    return csv.map(row => row.join(',')).join('\n');
}

function generateInventoryReport(includeStats) {
    let csv = [];

    // Aggregate items sold
    const itemsSold = {};
    allSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemsSold[item.name]) {
                itemsSold[item.name] = {
                    name: item.name,
                    category: item.category || 'N/A',
                    totalQty: 0,
                    totalRevenue: 0,
                    transactions: 0
                };
            }
            itemsSold[item.name].totalQty += item.qty;
            itemsSold[item.name].totalRevenue += item.qty * item.price;
            itemsSold[item.name].transactions++;
        });
    });

    const sorted = Object.values(itemsSold).sort((a, b) => b.totalRevenue - a.totalRevenue);

    if (includeStats) {
        csv.push(['Inventory Impact Report']);
        csv.push(['Generated', new Date().toLocaleString()]);
        csv.push(['Unique Products Sold', sorted.length]);
        csv.push(['Total Units Sold', sorted.reduce((sum, i) => sum + i.totalQty, 0)]);
        csv.push(['Total Revenue', `Rs. ${sorted.reduce((sum, i) => sum + i.totalRevenue, 0).toFixed(2)}`]);
        csv.push([]);
    }

    // Headers
    csv.push(['Product Name', 'Category', 'Total Quantity Sold', 'Total Revenue', 'Number of Transactions', 'Avg Qty per Transaction']);

    // Data rows
    sorted.forEach(item => {
        csv.push([
            escapeCSV(item.name),
            escapeCSV(item.category),
            item.totalQty,
            item.totalRevenue.toFixed(2),
            item.transactions,
            (item.totalQty / item.transactions).toFixed(2)
        ]);
    });

    return csv.map(row => row.join(',')).join('\n');
}

function generatePaymentReport(includeStats) {
    let csv = [];

    // Aggregate by payment mode
    const paymentBreakdown = {};
    allSales.forEach(sale => {
        const mode = sale.paymentMode || 'CASH';
        if (!paymentBreakdown[mode]) {
            paymentBreakdown[mode] = {
                count: 0,
                total: 0
            };
        }
        paymentBreakdown[mode].count++;
        paymentBreakdown[mode].total += sale.total;
    });

    if (includeStats) {
        csv.push(['Payment Mode Analysis Report']);
        csv.push(['Generated', new Date().toLocaleString()]);
        csv.push(['Total Sales', allSales.length]);
        csv.push(['Total Revenue', `Rs. ${allSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}`]);
        csv.push([]);
    }

    // Summary
    csv.push(['Payment Mode', 'Transaction Count', 'Total Amount', 'Percentage of Sales']);
    const totalRevenue = allSales.reduce((sum, s) => sum + s.total, 0);

    Object.entries(paymentBreakdown).forEach(([mode, data]) => {
        csv.push([
            mode,
            data.count,
            data.total.toFixed(2),
            ((data.total / totalRevenue) * 100).toFixed(2) + '%'
        ]);
    });

    csv.push([]);
    csv.push(['Detailed Transactions by Payment Mode']);
    csv.push(['Payment Mode', 'Bill No', 'Date', 'Customer', 'Amount']);

    allSales.forEach(sale => {
        const date = new Date(sale.timestamp);
        csv.push([
            sale.paymentMode || 'CASH',
            sale.billNo,
            date.toLocaleDateString(),
            escapeCSV(sale.customer),
            sale.total.toFixed(2)
        ]);
    });

    return csv.map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Void Sale (Cancel)
function deleteSale(billNo) {
    if (!confirm(`Are you sure you want to CANCEL (VOID) Bill #${billNo}? This will restore stock.`)) {
        return;
    }

    window.posAPI.deleteSale(billNo)
        .then(() => {
            // Record audit log
            if (typeof window.recordAuditLog === 'function') {
                const cashierName = document.getElementById('cashierName')?.textContent || 'Admin User';
                window.recordAuditLog(cashierName, 'Cancelled Bill', 'Sales', `#${billNo}`);
            }
            loadSales(); // Refresh table
        })
        .catch(err => {
            console.error(err);
            alert('Failed to cancel sale: ' + err.message);
        });
}

// Edit Sale (Change) - Moves current sale to cart for modification
function editSale(billNo) {
    const sale = allSales.find(s => s.billNo == billNo);
    if (!sale) {
        alert('Sale not found.');
        return;
    }

    if (!confirm(`Prepare Bill #${billNo} for changes? Items will be moved to a new cart.`)) {
        return;
    }

    try {
        const stored = localStorage.getItem('pos_cart_state');
        let cartState = { carts: [], currentCartId: 1 };

        try {
            if (stored) {
                const parsed = window.safeJSONParse(stored, {});
                if (Array.isArray(parsed)) cartState.carts = parsed;
                else if (parsed && Array.isArray(parsed.carts)) cartState = parsed;
            }
        } catch (e) { console.warn('Malformed cart state'); }

        const nextId = (cartState.carts.length > 0 ? Math.max(...cartState.carts.map(c => parseInt(c.id) || 0)) : 0) + 1;

        const newCart = {
            id: nextId,
            name: `Edit #${billNo}`,
            // Preserve original identity for replacement in app.js
            originalBillNo: billNo,
            originalTimestamp: sale.timestamp,
            isEdit: true,
            items: (sale.items || []).map(i => ({
                id: i.id,
                name: i.name,
                price: parseFloat(i.price) || 0,
                qty: parseFloat(i.qty) || 0
            })),
            customerName: (!sale.customer || sale.customer === 'Walk-in') ? '' : sale.customer,
            customerPhone: sale.customerPhone || '',
            paymentMode: sale.paymentMode || 'CASH'
        };

        cartState.carts.push(newCart);
        cartState.currentCartId = nextId;

        localStorage.setItem('pos_cart_state', JSON.stringify(cartState));
        localStorage.setItem('pos_auto_switch_cart', nextId.toString());

        window.location.href = 'billing.html';
    } catch (e) {
        console.error('Preparation failed:', e);
        alert('Critical Error: Failed to prepare items for editing.');
    }
}

// Issue Return (Credit Note) - Modified for partial returns
let currentReturnSale = null;

function issueReturn(billNo) {
    const sale = allSales.find(s => s.billNo == billNo);
    if (!sale) return;

    currentReturnSale = sale;
    document.getElementById('returnBillNo').textContent = `#${billNo}`;
    document.getElementById('returnReason').value = '';

    const allToggle = document.getElementById('returnAllToggle');
    if (allToggle) allToggle.checked = false;

    renderReturnItems();
    document.getElementById('returnModal').classList.add('active');
}

function closeReturnModal() {
    document.getElementById('returnModal').classList.remove('active');
    currentReturnSale = null;
}

function renderReturnItems() {
    const tbody = document.getElementById('returnItemsList');
    tbody.innerHTML = '';

    currentReturnSale.items.forEach((item, index) => {
        // Calculate already returned quantity for THIS item in THIS bill
        const billReturns = allCreditNotes.filter(cn => cn.originalBillNo == currentReturnSale.billNo);
        let returnedAlready = 0;
        billReturns.forEach(cn => {
            const cnItem = cn.items.find(i => i.id === item.id);
            if (cnItem) {
                returnedAlready += Math.abs(cnItem.qty || 0);
            }
        });

        const remainToReturn = Math.max(0, parseFloat((item.qty - returnedAlready).toFixed(3)));
        const isDisabled = remainToReturn <= 0;

        const tr = document.createElement('tr');
        tr.style.opacity = isDisabled ? '0.6' : '1';

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; font-size: 1rem;">${item.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Rs. ${item.price.toFixed(2)} / unit</div>
            </td>
            <td style="text-align: right;">
                <div style="font-weight: 600;">${item.qty} Sold</div>
                ${returnedAlready > 0 ? `<div style="font-size: 0.75rem; color: #EF4444;">Returned: ${returnedAlready}</div>` : ''}
            </td>
            <td style="text-align: right;">
                <div class="qty-controls" style="display: inline-flex; align-items: center; background: ${isDisabled ? 'var(--border-light)' : 'var(--bg-main)'}; border-radius: 0.6rem; border: 2px solid var(--border-light); padding: 2px; gap: 4px;">
                    <button type="button" onclick="updateReturnQty(${index}, -1)" 
                        ${isDisabled ? 'disabled' : ''}
                        style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 0.4rem; font-size: 1.5rem; font-weight: 800; cursor: pointer; color: var(--text-primary); transition: all 0.1s;">-</button>
                    
                    <input type="number" 
                        class="form-input" 
                        style="width: 70px; height: 40px; text-align: center; border: none; background: transparent; padding: 0; font-weight: 800; font-size: 1.1rem; color: var(--text-primary); -webkit-appearance: none; margin: 0;" 
                        min="0" 
                        max="${remainToReturn}" 
                        step="0.1"
                        value="0"
                        ${isDisabled ? 'readonly disabled' : ''}
                        oninput="updateReturnSummary()"
                        onkeydown="if(event.key === 'ArrowUp'){ event.preventDefault(); adjustReturnQtyDecimal(${index}, 0.1); } else if(event.key === 'ArrowDown'){ event.preventDefault(); adjustReturnQtyDecimal(${index}, -0.1); }"
                        data-index="${index}"
                    >
                    
                    <button type="button" onclick="updateReturnQty(${index}, 1)" 
                        ${isDisabled ? 'disabled' : ''}
                        style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 0.4rem; font-size: 1.5rem; font-weight: 800; cursor: pointer; color: var(--text-primary); transition: all 0.1s;">+</button>
                </div>
            </td>
            <td style="text-align: right; font-weight: 700; font-size: 1rem; color: var(--text-primary); width: 120px;" class="item-refund-amt">Rs. 0.00</td>
        `;
        tbody.appendChild(tr);
    });
    updateReturnSummary();
}

function updateReturnQty(index, delta) {
    const inputs = document.querySelectorAll('#returnItemsList input[data-index]');
    const input = Array.from(inputs).find(i => parseInt(i.dataset.index) === index);
    if (!input) return;

    let val = parseFloat(input.value) || 0;
    // Using 0.1 step for both buttons and arrows if they are in decimal mode?
    // Actually billing page uses +/- 1 for buttons and +/- 0.1 for arrows. I'll stick to that.
    val = parseFloat((val + delta).toFixed(3));

    const max = parseFloat(input.getAttribute('max'));
    if (val > max) val = max;
    if (val < 0) val = 0;

    input.value = val;
    updateReturnSummary();
}

function adjustReturnQtyDecimal(index, delta) {
    updateReturnQty(index, delta);
}

function updateReturnSummary() {
    const inputs = document.querySelectorAll('#returnItemsList input[data-index]');
    let totalRefund = 0;

    inputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        const item = currentReturnSale.items[index];
        let returnQty = parseFloat(input.value) || 0;

        // Cap at sold quantity
        if (returnQty > item.qty) {
            returnQty = item.qty;
            input.value = item.qty;
        }
        if (returnQty < 0) {
            returnQty = 0;
            input.value = 0;
        }

        const refund = returnQty * item.price;
        totalRefund += refund;

        const refundCell = input.closest('tr').querySelector('.item-refund-amt');
        refundCell.textContent = `Rs. ${refund.toFixed(2)}`;
    });

    document.getElementById('returnRefundTotal').textContent = `Rs. ${totalRefund.toFixed(2)}`;
}

async function processReturn() {
    if (!currentReturnSale) return;

    const inputs = document.querySelectorAll('#returnItemsList input');
    const returnItems = [];
    let totalRefund = 0;

    inputs.forEach(input => {
        const index = input.dataset.index;
        const item = currentReturnSale.items[index];
        const returnQty = parseFloat(input.value) || 0;

        if (returnQty > 0) {
            returnItems.push({
                id: item.id,
                name: item.name,
                price: item.price,
                qty: returnQty, // Will be stored as negative in API
                category: item.category
            });
            totalRefund += returnQty * item.price;
        }
    });

    if (returnItems.length === 0) {
        alert('Please select at least one item to return.');
        return;
    }

    const reason = document.getElementById('returnReason').value.trim() || 'Customer Return';

    if (!confirm(`Confirm refund of Rs. ${totalRefund.toFixed(2)}? This will record a new Credit Note and update stock.`)) {
        return;
    }

    const btn = document.getElementById('confirmReturnBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const cnRes = await window.posAPI.getNextCreditNoteNumber();
        const cnData = {
            cnNo: cnRes.nextNo,
            originalBillNo: currentReturnSale.billNo,
            customerName: currentReturnSale.customer,
            customerPhone: currentReturnSale.customerPhone,
            totalAmount: -totalRefund, // Store as negative
            items: returnItems.map(i => ({ ...i, qty: -i.qty })), // Store qty as negative
            reason: reason,
            timestamp: new Date().toISOString()
        };

        await window.posAPI.createCreditNote(cnData);

        // Success
        alert('Partial Return processed successfully. Credit Note #' + cnRes.nextNo + ' issued.');
        closeReturnModal();
        loadSales(); // Refresh history
    } catch (err) {
        console.error(err);
        alert('Failed to process return: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Return';
    }
}

// Exposure
window.loadSales = loadSales;
window.viewSale = viewSale;
window.exportCSV = exportCSV;
window.deleteSale = deleteSale;
window.editSale = editSale;
window.issueReturn = issueReturn;
window.closeReturnModal = closeReturnModal;
window.updateReturnSummary = updateReturnSummary;
window.processReturn = processReturn;
window.updateReturnQty = updateReturnQty;
window.adjustReturnQtyDecimal = adjustReturnQtyDecimal;
function toggleReturnAll(checked) {
    const inputs = document.querySelectorAll('#returnItemsList input');
    inputs.forEach(input => {
        // Use the max attribute which we already calculated as (item.qty - returnedAlready)
        const maxReturnable = parseFloat(input.getAttribute('max')) || 0;
        input.value = checked ? maxReturnable : 0;
    });
    updateReturnSummary();
}

window.toggleReturnAll = toggleReturnAll;

// --- Nepali Calendar Picker Logic ---
const nepaliMonthData = [
    { year: 2081, month: 11, name: "Chaitra", start: new Date(2025, 2, 14), length: 30 },
    { year: 2082, month: 0, name: "Baishakh", start: new Date(2025, 3, 14), length: 31 },
    { year: 2082, month: 1, name: "Jestha", start: new Date(2025, 4, 15), length: 31 },
    { year: 2082, month: 2, name: "Ashadh", start: new Date(2025, 5, 15), length: 32 },
    { year: 2082, month: 3, name: "Shrawan", start: new Date(2025, 6, 17), length: 32 },
    { year: 2082, month: 4, name: "Bhadra", start: new Date(2025, 7, 18), length: 31 },
    { year: 2082, month: 5, name: "Ashwin", start: new Date(2025, 8, 18), length: 30 },
    { year: 2082, month: 6, name: "Kartik", start: new Date(2025, 9, 18), length: 30 },
    { year: 2082, month: 7, name: "Mangsir", start: new Date(2025, 10, 17), length: 30 },
    { year: 2082, month: 8, name: "Poush", start: new Date(2025, 11, 17), length: 29 },
    { year: 2082, month: 9, name: "Magh", start: new Date(2026, 0, 15), length: 29 },
    { year: 2082, month: 10, name: "Falgun", start: new Date(2026, 1, 13), length: 30 },
    { year: 2082, month: 11, name: "Chaitra", start: new Date(2026, 2, 15), length: 30 },
    { year: 2083, month: 0, name: "Baishakh", start: new Date(2026, 3, 14), length: 31 },
    { year: 2083, month: 1, name: "Jestha", start: new Date(2026, 4, 15), length: 31 },
    { year: 2083, month: 2, name: "Ashadh", start: new Date(2026, 5, 15), length: 32 },
    { year: 2083, month: 3, name: "Shrawan", start: new Date(2026, 6, 17), length: 32 },
    { year: 2083, month: 4, name: "Bhadra", start: new Date(2026, 7, 18), length: 31 },
    { year: 2083, month: 5, name: "Ashwin", start: new Date(2026, 8, 18), length: 31 },
    { year: 2083, month: 6, name: "Kartik", start: new Date(2026, 9, 18), length: 30 },
    { year: 2083, month: 7, name: "Mangsir", start: new Date(2026, 10, 17), length: 30 },
    { year: 2083, month: 8, name: "Poush", start: new Date(2026, 11, 16), length: 29 },
    { year: 2083, month: 9, name: "Magh", start: new Date(2027, 0, 14), length: 30 },
    { year: 2083, month: 10, name: "Falgun", start: new Date(2027, 1, 13), length: 30 },
    { year: 2083, month: 11, name: "Chaitra", start: new Date(2027, 2, 15), length: 30 }
];

function findNepaliMonthIndex(date) {
    for (let i = 0; i < nepaliMonthData.length; i++) {
        const m = nepaliMonthData[i];
        const nextM = nepaliMonthData[i + 1];
        if (date >= m.start && (!nextM || date < nextM.start)) {
            return i;
        }
    }
    return 11;
}

let currentPickerMonthIdx = findNepaliMonthIndex(new Date());
let rangeStartDate = null;
let rangeEndDate = null;

function openRangePicker() {
    const modal = document.getElementById('dateRangeModal');
    if (modal) {
        modal.classList.add('active');
        renderPickerCalendar();
    }
}
window.openRangePicker = openRangePicker;

function closeRangePicker() {
    const modal = document.getElementById('dateRangeModal');
    if (modal) modal.classList.remove('active');
}
window.closeRangePicker = closeRangePicker;

function renderPickerCalendar() {
    const container = document.getElementById('pickerCalendarContainer');
    if (!container) return;

    let html = '';
    const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 2; i++) {
        const idx = currentPickerMonthIdx + i;
        if (idx >= nepaliMonthData.length) break;

        const mData = nepaliMonthData[idx];
        const englishYear = mData.start.getFullYear();
        const startMonthIdx = mData.start.getMonth();
        const endMonthIdx = (startMonthIdx + 1) % 12;
        const monthRangeIndication = `${shortMonthNames[startMonthIdx]}/${shortMonthNames[endMonthIdx]}`;

        html += `<div style="flex: 1 1 350px; min-width: 320px;">
            <div style="font-weight: 700; text-align: center; margin-bottom: 1rem; color: var(--text-primary);">
                <span style="font-size: 1.1rem; display: block;">${mData.name} ${mData.year}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">/ ${monthRangeIndication} ${englishYear}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;">
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Su</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Mo</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Tu</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">We</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Th</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Fr</div>
                <div class="cal-header-cell" style="font-size: 0.75rem; padding: 5px; color: var(--text-muted);">Sa</div>
        `;

        const startDayOfWeek = mData.start.getDay();
        for (let j = 0; j < startDayOfWeek; j++) html += `<div class="empty"></div>`;

        for (let d = 1; d <= mData.length; d++) {
            const actualDate = new Date(mData.start);
            actualDate.setDate(mData.start.getDate() + (d - 1));
            const dateStr = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}-${String(actualDate.getDate()).padStart(2, '0')}`;

            let classes = 'cal-cell clickable';
            if (rangeStartDate && rangeEndDate) {
                if (dateStr === rangeStartDate) classes += ' range-start';
                else if (dateStr === rangeEndDate) classes += ' range-end';
                else if (dateStr > rangeStartDate && dateStr < rangeEndDate) classes += ' in-range';
            } else if (rangeStartDate && dateStr === rangeStartDate) {
                classes += ' range-start range-end';
            }

            const isStart = classes.includes('range-start');
            const isEnd = classes.includes('range-end');
            const isSelected = isStart || isEnd;
            const cellStyle = isSelected
                ? 'padding: 10px 5px; border-radius: 4px; cursor: pointer; position: relative; background: var(--accent-primary) !important; color: var(--text-on-accent) !important;'
                : 'padding: 10px 5px; border-radius: 4px; cursor: pointer; position: relative;';
            const spanStyle = isSelected ? 'color: var(--text-on-accent) !important;' : '';

            html += `
                <div class="${classes}" onclick="handleDateClick('${dateStr}')" style="${cellStyle}">
                    <span class="nepali-date" style="display: block; font-weight: 600; font-size: 0.95rem; ${spanStyle}">${d}</span>
                    <span class="english-date" style="display: block; font-size: 0.65rem; ${isSelected ? 'color: var(--text-on-accent) !important; opacity: 1;' : 'color: var(--text-muted); opacity: 0.7;'}">${actualDate.getDate()}</span>
                </div>
            `;
        }
        html += `</div></div>`;
        if (i === 0) html += `<div style="width: 1px; background: var(--border-light); margin: 0 1rem;"></div>`;
    }

    container.innerHTML = html;
    updateRangeInfo();
}
window.renderPickerCalendar = renderPickerCalendar;

function changePickerMonth(offset) {
    currentPickerMonthIdx = Math.max(0, Math.min(nepaliMonthData.length - 2, currentPickerMonthIdx + offset));
    renderPickerCalendar();
}
window.changePickerMonth = changePickerMonth;

function handleDateClick(dateStr) {
    if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
        rangeStartDate = dateStr;
        rangeEndDate = null;
    } else {
        if (dateStr < rangeStartDate) {
            rangeEndDate = rangeStartDate;
            rangeStartDate = dateStr;
        } else {
            rangeEndDate = dateStr;
        }
    }
    renderPickerCalendar();
}
window.handleDateClick = handleDateClick;

function updateRangeInfo() {
    const info = document.getElementById('rangeSelectionInfo');
    if (!rangeStartDate) info.textContent = "Select start date";
    else if (!rangeEndDate) info.textContent = `Start: ${rangeStartDate} - Select end date`;
    else {
        const d1 = new Date(rangeStartDate);
        const d2 = new Date(rangeEndDate);
        const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        info.textContent = `${rangeStartDate} to ${rangeEndDate} (${diffDays} days)`;
    }
}

function confirmDateRange() {
    if (!rangeStartDate) return;
    if (!rangeEndDate) rangeEndDate = rangeStartDate;

    document.getElementById('startDate').value = rangeStartDate;
    document.getElementById('endDate').value = rangeEndDate;

    const d1 = new Date(rangeStartDate);
    const d2 = new Date(rangeEndDate);
    const idx1 = findNepaliMonthIndex(d1);
    const idx2 = findNepaliMonthIndex(d2);

    let bsDisplay = "";
    if (idx1 !== -1) {
        const m1 = nepaliMonthData[idx1];
        const bsDay1 = Math.floor((d1.getTime() - m1.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (rangeStartDate === rangeEndDate) {
            bsDisplay = `${m1.name} ${bsDay1}, ${m1.year}`;
        } else if (idx1 === idx2) {
            const bsDay2 = Math.floor((d2.getTime() - m1.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            bsDisplay = `${m1.name} ${bsDay1} - ${bsDay2}, ${m1.year}`;
        } else if (idx2 !== -1) {
            const m2 = nepaliMonthData[idx2];
            const bsDay2 = Math.floor((d2.getTime() - m2.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            bsDisplay = `${m1.name} ${bsDay1} - ${m2.name} ${bsDay2}`;
        }
    }

    document.getElementById('filterRangeLabel').textContent = bsDisplay || `${rangeStartDate} - ${rangeEndDate}`;
    document.getElementById('filterClearBtn').style.display = 'block';

    closeRangePicker();
    loadSales();
}
window.confirmDateRange = confirmDateRange;

function clearFilterRange() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('filterRangeLabel').textContent = 'All Recent Sales';
    document.getElementById('filterClearBtn').style.display = 'none';
    rangeStartDate = null;
    rangeEndDate = null;
    loadSales();
}
window.clearFilterRange = clearFilterRange;

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

init();
