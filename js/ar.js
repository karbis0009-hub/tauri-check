// Customer CRM & AR System Controller
// Business logic, Segments, Ledger, Purchase History, Aging & Statement

const CRM_THRESHOLDS = {
    VIP_SPENT: 50000,
    VIP_TOP_PERCENTILE: 0.10, // top 10% by totalSpent
    REGULAR_MIN_VISITS: 4,
    REGULAR_DAYS_WINDOW: 90,
    NEW_CUSTOMER_DAYS: 30,
    INACTIVE_DAYS: 45,
    CREDIT_RISK_DAYS: 30,
    CREDIT_RISK_LIMIT_PERCENT: 0.80 // 80% of creditLimit
};

// State
let accounts = [];
let allSales = [];
let allTransactions = [];
let selectedAccount = null;
let currentFilter = 'all'; // 'all', 'due', 'vip', 'regular', 'new', 'inactive', 'risk'
let currentSort = 'lastVisit'; // 'lastVisit', 'totalSpent', 'creditDue', 'visitCount', 'name'
let searchQuery = '';
let showDeactivated = false;
let activeTab = 'overview'; // 'overview', 'history', 'credit'

// Tab 2 History state
let historyPage = 1;
const historyPageSize = 20;
let historyStartDate = '';
let historyEndDate = '';

// Notes auto-save debounce
let notesSaveTimer = null;
let currentPreviewBill = null;

function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'wk' : 'wks'} ago`;
    }
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============ INITIALIZATION ============

async function init() {
    setupEventListeners();
    await reloadAllData();
}

function setupEventListeners() {
    const crmChips = document.querySelector('.crm-chips-container');
    if (crmChips) {
        crmChips.addEventListener('wheel', event => {
            const maxScrollLeft = crmChips.scrollWidth - crmChips.clientWidth;
            if (maxScrollLeft <= 0) return;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const nextScrollLeft = crmChips.scrollLeft + delta;
            if (delta && nextScrollLeft >= 0 && nextScrollLeft <= maxScrollLeft) {
                event.preventDefault();
                crmChips.scrollLeft = nextScrollLeft;
            }
        }, { passive: false });
    }

    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderCustomerList();
        });
    }

    const notesInput = document.getElementById('crmNotesInput');
    if (notesInput) {
        notesInput.addEventListener('input', () => {
            handleNotesAutoSave();
        });
    }

    // React to business switcher changes
    window.addEventListener('businessChanged', () => {
        selectedAccount = null;
        reloadAllData();
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'currentBusinessId' || e.key === 'pos_ar_accounts' || e.key === 'pos_sales' || e.key === 'pos_ar_accounts_sync') {
            reloadAllData();
        }
    });

    window.addEventListener('focus', () => {
        reloadAllData();
    });

    window.addEventListener('resize', handleResponsiveLayout);
}

function handleResponsiveLayout() {
    const custPanel = document.getElementById('customerPanel');
    const custDet = document.getElementById('customerDetails');
    const noCust = document.getElementById('noCustomerSelected');

    if (window.innerWidth >= 1100) {
        if (custPanel) custPanel.classList.remove('mobile-hidden');
        if (selectedAccount) {
            if (custDet) custDet.classList.remove('mobile-hidden');
            if (noCust) noCust.style.display = 'none';
        } else {
            if (custDet) custDet.classList.add('mobile-hidden');
            if (noCust) noCust.style.display = 'flex';
        }
    } else {
        // Mobile screen (< 1100px)
        if (selectedAccount) {
            if (custPanel) custPanel.classList.add('mobile-hidden');
            if (custDet) custDet.classList.remove('mobile-hidden');
            if (noCust) noCust.style.display = 'none';
        } else {
            if (custPanel) custPanel.classList.remove('mobile-hidden');
            if (custDet) custDet.classList.add('mobile-hidden');
            if (noCust) noCust.style.display = 'none';
        }
    }
}

// ============ DATA LOADING ============

async function reloadAllData() {
    try {
        if (!window.posAPI) return;

        // Load accounts
        if (typeof window.posAPI.getARAccounts === 'function') {
            accounts = await window.posAPI.getARAccounts();
        } else {
            accounts = [];
        }

        // Load all sales (for purchase history & item analytics & precise aging)
        if (typeof window.posAPI.getAllSales === 'function') {
            allSales = await window.posAPI.getAllSales();
        } else {
            allSales = [];
        }

        // Pre-compute CRM metrics for all accounts
        calculateCustomerCrmMetrics();

        // Update top live dashboard cards
        updateDashboardCards();

        // Update counts on filter chips
        updateFilterChipCounts();

        // Re-select customer if one was selected
        if (selectedAccount) {
            const updated = accounts.find(a =>
                (a.customerId && a.customerId === selectedAccount.customerId) ||
                (a.customerPhone && selectedAccount.customerPhone && cleanDigits(a.customerPhone) === cleanDigits(selectedAccount.customerPhone)) ||
                (a.customerName && selectedAccount.customerName && a.customerName === selectedAccount.customerName)
            );
            if (updated) {
                selectedAccount = updated;
                selectAccount(updated, false);
            } else {
                selectedAccount = null;
                const custDet = document.getElementById('customerDetails');
                const noCust = document.getElementById('noCustomerSelected');
                if (custDet) custDet.style.display = 'none';
                if (noCust) noCust.style.display = 'flex';
            }
        }

        renderCustomerList();
        handleResponsiveLayout();
    } catch (e) {
        console.error('Error reloading CRM data:', e);
    }
}

function cleanDigits(str) {
    return String(str || '').replace(/\D/g, '').trim();
}

// ============ CRM SEGMENTS & AGING CALCULATIONS ============

function calculateCustomerCrmMetrics() {
    const now = Date.now();

    // 1. Calculate top 10% threshold by totalSpent
    const activeAccounts = accounts.filter(a => a.isActive !== 0 && a.isActive !== false && a.isActive !== '0');
    const spentList = activeAccounts.map(a => parseFloat(a.totalSpent) || 0).filter(s => s > 0).sort((a, b) => b - a);
    let top10Cutoff = Infinity;
    if (spentList.length > 0) {
        const top10Index = Math.max(0, Math.floor(spentList.length * CRM_THRESHOLDS.VIP_TOP_PERCENTILE) - 1);
        top10Cutoff = spentList[top10Index] || Infinity;
    }

    accounts.forEach(acc => {
        const spent = parseFloat(acc.totalSpent) || 0;
        const visits = parseInt(acc.visitCount) || 0;
        const due = parseFloat(acc.creditDue != null ? acc.creditDue : acc.totalBalance) || 0;
        const limit = parseFloat(acc.creditLimit) || 0;
        const lastVisitTime = acc.lastVisit ? new Date(acc.lastVisit).getTime() : 0;
        const firstVisitTime = acc.firstVisit ? new Date(acc.firstVisit).getTime() : (acc.createdAt ? new Date(acc.createdAt).getTime() : 0);

        // Find customer's sales
        const accPhone = cleanDigits(acc.customerPhone || acc.phone);
        const accName = (acc.customerName || acc.name || '').trim().toLowerCase();
        const accPan = String(acc.customerPAN || acc.pan || '').trim();
        const custSales = allSales.filter(s => {
            if (s.status === 'CANCELLED' || s.status === 'RETURNED') return false;
            const sPhone = cleanDigits(s.customerPhone);
            const sName = (s.customer || '').trim().toLowerCase();
            const sPan = String(s.customerPAN || s.vatNo || '').trim();
            if (accPhone && sPhone && accPhone === sPhone) return true;
            if (accName && sName && accName === sName && sName !== 'walk-in') return true;
            if (accPan && sPan && accPan === sPan) return true;
            return false;
        });

        // Calculate Aging Buckets using FIFO on credit sales
        const creditSales = custSales
            .filter(s => s.paymentMode === 'CREDIT')
            .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

        const totalCreditSales = creditSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        // Payments made = creditSalesTotal - currentDue
        let paymentsCovered = Math.max(0, totalCreditSales - due);

        let bucket0_30 = 0;
        let bucket31_60 = 0;
        let bucket60_plus = 0;
        let oldestUnpaidDays = 0;

        creditSales.forEach(sale => {
            const saleAmt = parseFloat(sale.total) || 0;
            if (paymentsCovered >= saleAmt) {
                paymentsCovered -= saleAmt;
                return; // This credit sale is fully paid
            }
            const unpaidPart = saleAmt - paymentsCovered;
            paymentsCovered = 0;

            const saleTime = new Date(sale.timestamp || 0).getTime();
            const ageDays = Math.max(0, Math.floor((now - saleTime) / (1000 * 60 * 60 * 24)));

            if (ageDays > oldestUnpaidDays) {
                oldestUnpaidDays = ageDays;
            }

            if (ageDays <= 30) {
                bucket0_30 += unpaidPart;
            } else if (ageDays <= 60) {
                bucket31_60 += unpaidPart;
            } else {
                bucket60_plus += unpaidPart;
            }
        });

        acc._aging = {
            bucket0_30: Math.round(bucket0_30 * 100) / 100,
            bucket31_60: Math.round(bucket31_60 * 100) / 100,
            bucket60_plus: Math.round(bucket60_plus * 100) / 100,
            oldestUnpaidDays
        };

        // Segments
        const isVip = spent > CRM_THRESHOLDS.VIP_SPENT || (spent > 0 && spent >= top10Cutoff);
        const isRegular = visits >= CRM_THRESHOLDS.REGULAR_MIN_VISITS && (lastVisitTime > 0 && (now - lastVisitTime) <= CRM_THRESHOLDS.REGULAR_DAYS_WINDOW * 86400000);
        const isNew = firstVisitTime > 0 && (now - firstVisitTime) <= CRM_THRESHOLDS.NEW_CUSTOMER_DAYS * 86400000;
        const isInactive = visits > 0 ? (lastVisitTime > 0 && (now - lastVisitTime) >= CRM_THRESHOLDS.INACTIVE_DAYS * 86400000) : (firstVisitTime > 0 && (now - firstVisitTime) >= CRM_THRESHOLDS.INACTIVE_DAYS * 86400000);
        const isDue = due > 0.001;
        const isCreditRisk = (due > 0 && oldestUnpaidDays > CRM_THRESHOLDS.CREDIT_RISK_DAYS) || (limit > 0 && due > CRM_THRESHOLDS.CREDIT_RISK_LIMIT_PERCENT * limit);

        // Phone validation check
        const rawPhone = String(acc.customerPhone || acc.phone || '').trim();
        const digits = cleanDigits(rawPhone);
        const isPhoneInvalid = rawPhone !== '' && digits.length !== 10;

        acc._segments = {
            isVip,
            isRegular,
            isNew,
            isInactive,
            isDue,
            isCreditRisk,
            isPhoneInvalid
        };
    });
}

// ============ DASHBOARD CARDS ============

function updateDashboardCards() {
    const now = Date.now();
    const activeAccounts = accounts.filter(a => a.isActive !== 0 && a.isActive !== false && a.isActive !== '0');

    // 1. Total Customers
    const elTotal = document.getElementById('statTotalCustomers');
    if (elTotal) elTotal.textContent = activeAccounts.length;

    // 2. Active (Visited in last 30 days)
    const activeLast30 = activeAccounts.filter(a => {
        const last = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        return last > 0 && (now - last) <= 30 * 86400000;
    }).length;
    const elActive = document.getElementById('statActiveCustomers');
    if (elActive) elActive.textContent = activeLast30;

    // 3. New This Month (firstVisit within 30 days)
    const newCount = activeAccounts.filter(a => {
        const first = a.firstVisit ? new Date(a.firstVisit).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        return first > 0 && (now - first) <= 30 * 86400000;
    }).length;
    const elNew = document.getElementById('statNewThisMonth');
    if (elNew) elNew.textContent = newCount;

    // 4. Total Credit Due
    const totalDue = activeAccounts.reduce((sum, a) => {
        const due = parseFloat(a.creditDue != null ? a.creditDue : a.totalBalance) || 0;
        return sum + (due > 0 ? due : 0);
    }, 0);
    const elDue = document.getElementById('statTotalCreditDue');
    if (elDue) elDue.textContent = `Rs. ${fmt(totalDue)}`;

    // 5. Overdue Amount (credit older than 30 days: 31-60 and 60+ buckets)
    const totalOverdue = activeAccounts.reduce((sum, a) => {
        const aging = a._aging || { bucket31_60: 0, bucket60_plus: 0 };
        return sum + (aging.bucket31_60 || 0) + (aging.bucket60_plus || 0);
    }, 0);
    const elOverdue = document.getElementById('statOverdueCredit');
    if (elOverdue) elOverdue.textContent = `Rs. ${fmt(totalOverdue)}`;
}

function updateFilterChipCounts() {
    const list = accounts.filter(a => {
        if (!showDeactivated && (a.isActive === 0 || a.isActive === false || a.isActive === '0')) return false;
        return true;
    });

    const counts = {
        all: list.length,
        due: list.filter(a => a._segments?.isDue).length,
        vip: list.filter(a => a._segments?.isVip).length,
        regular: list.filter(a => a._segments?.isRegular).length,
        new: list.filter(a => a._segments?.isNew).length,
        inactive: list.filter(a => a._segments?.isInactive).length,
        risk: list.filter(a => a._segments?.isCreditRisk).length
    };

    Object.keys(counts).forEach(key => {
        const el = document.getElementById(`count-${key}`);
        if (el) el.textContent = counts[key];
    });
}

// ============ FILTER & SORT ============

function setCrmFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.crm-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    renderCustomerList();
}

function onSortChange(val) {
    currentSort = val;
    renderCustomerList();
}

function toggleShowDeactivated(val) {
    showDeactivated = val;
    updateFilterChipCounts();
    renderCustomerList();
}

function filterAccounts() {
    const q = searchQuery.toLowerCase();
    const cleanQ = cleanDigits(q);

    return accounts.filter(a => {
        // Soft delete check
        const isDeactivated = a.isActive === 0 || a.isActive === false || a.isActive === '0';
        if (!showDeactivated && isDeactivated) return false;
        if (showDeactivated && !isDeactivated && currentFilter === 'inactive') {
            // keep normal filter flow
        }

        // Chip segment filter
        const seg = a._segments || {};
        if (currentFilter === 'due' && !seg.isDue) return false;
        if (currentFilter === 'vip' && !seg.isVip) return false;
        if (currentFilter === 'regular' && !seg.isRegular) return false;
        if (currentFilter === 'new' && !seg.isNew) return false;
        if (currentFilter === 'inactive' && !seg.isInactive) return false;
        if (currentFilter === 'risk' && !seg.isCreditRisk) return false;

        // Search Query (Name, Phone, PAN)
        if (q) {
            const name = (a.customerName || a.name || '').toLowerCase();
            const phone = String(a.customerPhone || a.phone || '');
            const pan = String(a.customerPAN || a.pan || '').toLowerCase();
            const digits = cleanDigits(phone);

            const matchName = name.includes(q);
            const matchPhone = phone.includes(q) || (cleanQ && digits.includes(cleanQ));
            const matchPan = pan.includes(q);

            if (!matchName && !matchPhone && !matchPan) return false;
        }

        return true;
    });
}

function sortAccounts(list) {
    return list.sort((a, b) => {
        const spentA = parseFloat(a.totalSpent) || 0;
        const spentB = parseFloat(b.totalSpent) || 0;
        const dueA = parseFloat(a.creditDue != null ? a.creditDue : a.totalBalance) || 0;
        const dueB = parseFloat(b.creditDue != null ? b.creditDue : b.totalBalance) || 0;
        const visitsA = parseInt(a.visitCount) || 0;
        const visitsB = parseInt(b.visitCount) || 0;
        const timeA = new Date(a.lastVisit || a.lastTransactionAt || a.firstVisit || 0).getTime() || 0;
        const timeB = new Date(b.lastVisit || b.lastTransactionAt || b.firstVisit || 0).getTime() || 0;
        const nameA = (a.customerName || a.name || '').toLowerCase();
        const nameB = (b.customerName || b.name || '').toLowerCase();

        switch (currentSort) {
            case 'totalSpent':
                return spentB - spentA || dueB - dueA;
            case 'creditDue':
                return dueB - dueA || spentB - spentA;
            case 'lastVisit':
                return (timeB - timeA) || ((b.id || 0) - (a.id || 0));
            case 'visitCount':
                return visitsB - visitsA || spentB - spentA;
            case 'name':
                return nameA.localeCompare(nameB);
            default:
                return (timeB - timeA) || ((b.id || 0) - (a.id || 0));
        }
    });
}

// ============ RENDER CUSTOMER LIST ============

function renderCustomerList() {
    const listEl = document.getElementById('customerList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = sortAccounts(filterAccounts());

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                No customers found matching current filters.
            </div>
        `;
        return;
    }

    const escapeCell = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    const table = document.createElement('div');
    table.className = 'customer-directory-wrap';
    table.innerHTML = `
        <table class="customer-directory-table">
            <thead><tr>
                <th style="width:120px;">Name</th><th style="width:140px;">Address</th><th style="width:125px;">Phone No.</th>
                <th style="width:110px;">PAN / VAT No.</th><th style="width:105px;">Bill No.</th>
                <th style="width:105px;">Payment Mode</th><th style="width:115px;">Total Spent</th>
                <th style="width:115px;">Credit Due</th><th style="width:115px;">Credit Limit</th>
                <th style="width:70px;">Visits</th><th style="width:105px;">Last Visit</th>
                <th style="width:105px;">Customer Since</th><th style="width:135px;">Status</th>
            </tr></thead>
            <tbody></tbody>
        </table>`;
    const tbody = table.querySelector('tbody');

    filtered.forEach(acc => {
        const isSelected = selectedAccount && (
            (selectedAccount.customerId && selectedAccount.customerId === acc.customerId) ||
            (selectedAccount.customerName && selectedAccount.customerName === acc.customerName)
        );
        const name = acc.customerName || acc.name || 'Customer';
        const phone = acc.customerPhone || acc.phone || '';
        const pan = acc.customerPAN || acc.pan || '';
        const address = acc.customerAddress || acc.address || '';
        const latestSale = getSalesForAccount(acc)[0];
        const billNo = latestSale ? (latestSale.billNo || latestSale.id || '—') : '—';
        const paymentMode = latestSale ? (latestSale.paymentMode || 'CASH') : '—';
        const due = parseFloat(acc.creditDue != null ? acc.creditDue : acc.totalBalance) || 0;
        const spent = parseFloat(acc.totalSpent) || 0;
        const limit = parseFloat(acc.creditLimit) || 0;
        const visits = parseInt(acc.visitCount) || 0;
        const lastVisitStr = acc.lastVisit || acc.lastTransactionAt;
        const isDeactivated = acc.isActive === 0 || acc.isActive === false || acc.isActive === '0';
        const seg = acc._segments || {};
        const status = [
            seg.isVip && 'VIP', seg.isRegular && 'Regular', seg.isNew && 'New',
            seg.isInactive && 'Inactive', seg.isCreditRisk && 'Credit Risk', isDeactivated && 'Deactivated',
            seg.isPhoneInvalid && 'Invalid phone'
        ].filter(Boolean).join(' · ') || '—';
        const row = document.createElement('tr');
        row.className = isSelected ? 'active' : '';
        row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        row.innerHTML = `
            <td class="name-cell">${escapeCell(name)}</td>
            <td class="address-cell">${escapeCell(address || '—')}</td>
            <td>${escapeCell(phone || '—')}</td>
            <td>${escapeCell(pan || '—')}</td>
            <td>${escapeCell(billNo)}</td>
            <td>${escapeCell(paymentMode)}</td>
            <td>Rs. ${fmt(spent)}</td>
            <td class="${due > 0.001 ? 'val-danger' : ''}">Rs. ${fmt(due)}</td>
            <td>${limit > 0 ? `Rs. ${fmt(limit)}` : 'No Limit'}</td>
            <td>${visits}</td>
            <td title="${escapeCell(lastVisitStr ? new Date(lastVisitStr).toLocaleString() : 'Never')}">${escapeCell(formatTimeAgo(lastVisitStr))}</td>
            <td>${escapeCell(formatDate(acc.firstVisit || acc.createdAt))}</td>
            <td class="status-cell">${escapeCell(status)}</td>`;
        row.addEventListener('click', () => selectAccount(acc));
        tbody.appendChild(row);
    });
    listEl.appendChild(table);
}

// ============ SELECT & RENDER CUSTOMER DETAILS ============

async function selectAccount(acc, shouldRenderList = true) {
    selectedAccount = acc;
    if (shouldRenderList) renderCustomerList();

    const noCust = document.getElementById('noCustomerSelected');
    const custDet = document.getElementById('customerDetails');
    if (noCust) noCust.style.display = 'none';
    if (custDet) custDet.style.display = 'flex';

    handleResponsiveLayout();

    const name = acc.customerName || acc.name || 'Customer';
    const rawPhone = String(acc.customerPhone || acc.phone || '').trim();
    const cleanPhone = cleanDigits(rawPhone);
    const pan = acc.customerPAN || acc.pan || '';
    const addr = acc.customerAddress || acc.address || '';
    const due = parseFloat(acc.creditDue != null ? acc.creditDue : acc.totalBalance) || 0;
    const limit = parseFloat(acc.creditLimit) || 0;
    const spent = parseFloat(acc.totalSpent) || 0;
    const visits = parseInt(acc.visitCount) || 0;
    const avgBill = visits > 0 ? (spent / visits) : 0;
    const lastVisitStr = acc.lastVisit || acc.lastTransactionAt;
    const firstVisitStr = acc.firstVisit || acc.createdAt;
    const isDeactivated = acc.isActive === 0 || acc.isActive === false || acc.isActive === '0';

    // Header Info
    const detName = document.getElementById('detName');
    const detPhoneDisplay = document.getElementById('detPhoneDisplay');
    const detPhoneInvalidBadge = document.getElementById('detPhoneInvalidBadge');
    const detPAN = document.getElementById('detPAN');
    const detAddress = document.getElementById('detAddress');
    const detDeactivatedBadge = document.getElementById('detDeactivatedBadge');
    const btnDeactivate = document.getElementById('btnDeactivateCustomer');

    if (detName) detName.textContent = name;
    if (detPhoneDisplay) detPhoneDisplay.textContent = rawPhone ? `Phone No: ${rawPhone}` : 'Phone No: —';
    if (detPhoneInvalidBadge) {
        detPhoneInvalidBadge.style.display = (rawPhone && cleanPhone.length !== 10) ? 'inline-flex' : 'none';
    }

    if (detPAN) {
        detPAN.textContent = `PAN No: ${pan || '—'}`;
        detPAN.style.display = 'inline-block';
    }

    if (detAddress) {
        detAddress.textContent = `Address: ${addr || '—'}`;
        detAddress.style.display = 'inline-block';
    }

    if (detDeactivatedBadge) {
        detDeactivatedBadge.style.display = isDeactivated ? 'inline-block' : 'none';
    }

    if (btnDeactivate) {
        btnDeactivate.textContent = isDeactivated ? 'Reactivate' : 'Deactivate';
        btnDeactivate.style.color = isDeactivated ? 'var(--crm-val-success)' : 'var(--crm-val-danger)';
        btnDeactivate.style.borderColor = isDeactivated ? 'var(--crm-val-success)' : 'var(--crm-val-danger)';
    }

    // Call and WhatsApp buttons
    const btnCall = document.getElementById('btnDetCall');
    const btnWhatsApp = document.getElementById('btnDetWhatsApp');
    if (btnCall) {
        if (cleanPhone) {
            btnCall.href = `tel:${cleanPhone}`;
            btnCall.style.display = 'inline-flex';
        } else {
            btnCall.style.display = 'none';
        }
    }
    if (btnWhatsApp) {
        if (cleanPhone) {
            const storeName = (window.storeSettings && window.storeSettings.storeName) || 'Grocery Store';
            const msg = encodeURIComponent(`Namaste ${name}, greeting from ${storeName}.`);
            const waNumber = cleanPhone.length === 10 ? `977${cleanPhone}` : cleanPhone;
            btnWhatsApp.href = `https://wa.me/${waNumber}?text=${msg}`;
            btnWhatsApp.style.display = 'inline-flex';
        } else {
            btnWhatsApp.style.display = 'none';
        }
    }

    // Segment Badges & Manual Tags
    const detBadges = document.getElementById('detBadges');
    if (detBadges) {
        const seg = acc._segments || {};
        let bHtml = '';
        if (seg.isInactive) bHtml += `<span class="customer-badge badge-inactive">Inactive</span>`;
        if (seg.isCreditRisk) bHtml += `<span class="customer-badge badge-risk">Credit Risk</span>`;
        if (seg.isDue) bHtml += `<span class="customer-badge badge-due">Credit Due</span>`;
        detBadges.innerHTML = bHtml;
    }

    const detTags = document.getElementById('detTags');
    if (detTags) {
        let tagsList = [];
        if (Array.isArray(acc.tags)) {
            tagsList = acc.tags;
        } else if (typeof acc.tags === 'string' && acc.tags.trim()) {
            try {
                const parsed = JSON.parse(acc.tags);
                tagsList = Array.isArray(parsed) ? parsed : acc.tags.split(',').map(t => t.trim());
            } catch(e) {
                tagsList = acc.tags.split(',').map(t => t.trim());
            }
        }
        detTags.innerHTML = tagsList.filter(Boolean).map(t => `<span class="manual-tag-pill">#${t}</span>`).join(' ');
    }

    // TAB 1: 7 Overview Stat Cards
    const crmSpent = document.getElementById('crmTotalSpent');
    const crmVisits = document.getElementById('crmVisitCount');
    const crmAvg = document.getElementById('crmAvgBill');
    const crmDue = document.getElementById('crmCreditDue');
    const crmLimit = document.getElementById('crmCreditLimit');
    const crmLast = document.getElementById('crmLastVisit');
    const crmSince = document.getElementById('crmCustomerSince');

    if (crmSpent) crmSpent.textContent = `Rs. ${fmt(spent)}`;
    if (crmVisits) crmVisits.textContent = String(visits);
    if (crmAvg) crmAvg.textContent = `Rs. ${fmt(avgBill)}`;
    if (crmDue) {
        crmDue.textContent = `Rs. ${fmt(due)}`;
        crmDue.style.color = due > 0.001 ? 'var(--crm-val-danger)' : 'var(--text-primary)';
    }
    if (crmLimit) crmLimit.textContent = limit > 0 ? `Rs. ${fmt(limit)}` : 'No Limit';
    if (crmLast) crmLast.textContent = formatTimeAgo(lastVisitStr);
    if (crmSince) crmSince.textContent = formatDate(firstVisitStr);

    // Tab Header Badges
    const tabBadgeCredit = document.getElementById('tabBadgeCreditDue');
    if (tabBadgeCredit) tabBadgeCredit.textContent = `Rs. ${fmt(due)}`;

    // Notes box
    const notesInput = document.getElementById('crmNotesInput');
    if (notesInput) {
        notesInput.value = acc.notes || '';
    }

    // Render TAB 2 (Purchase History) & TAB 3 (Credit & Ledger)
    historyPage = 1;
    renderPurchaseHistory();
    await loadCustomerLedger();
}

// ============ TAB SWITCHING ============

function switchCrmTab(tab) {
    activeTab = tab;

    const btnOverview = document.getElementById('tabBtnOverview');
    const btnHistory = document.getElementById('tabBtnHistory');
    const btnCredit = document.getElementById('tabBtnCredit');

    const contentOverview = document.getElementById('tabContentOverview');
    const contentHistory = document.getElementById('tabContentHistory');
    const contentCredit = document.getElementById('tabContentCredit');

    if (btnOverview) btnOverview.classList.toggle('active', tab === 'overview');
    if (btnHistory) btnHistory.classList.toggle('active', tab === 'history');
    if (btnCredit) btnCredit.classList.toggle('active', tab === 'credit');

    if (contentOverview) contentOverview.style.display = tab === 'overview' ? 'flex' : 'none';
    if (contentHistory) contentHistory.style.display = tab === 'history' ? 'flex' : 'none';
    if (contentCredit) contentCredit.style.display = tab === 'credit' ? 'flex' : 'none';
}

// ============ TAB 1: AUTO-SAVING NOTES ============

function handleNotesAutoSave() {
    clearTimeout(notesSaveTimer);
    const indicator = document.getElementById('crmNotesSavedIndicator');
    if (indicator) indicator.classList.remove('visible');

    notesSaveTimer = setTimeout(async () => {
        if (!selectedAccount) return;
        const notesInput = document.getElementById('crmNotesInput');
        if (!notesInput) return;

        const val = notesInput.value.trim();
        selectedAccount.notes = val;

        try {
            await window.posAPI.saveCustomer({
                ...selectedAccount,
                notes: val
            });
            if (indicator) {
                indicator.classList.add('visible');
                setTimeout(() => indicator.classList.remove('visible'), 2500);
            }
        } catch(e) {
            console.error('Failed to auto-save customer notes:', e);
        }
    }, 800);
}

// ============ TAB 2: PURCHASE HISTORY & TOP ITEMS ============

function getCustomerPurchases() {
    return getSalesForAccount(selectedAccount);
}

function getSalesForAccount(account) {
    if (!account) return [];
    const accPhone = cleanDigits(account.customerPhone || account.phone);
    const accName = (account.customerName || account.name || '').trim().toLowerCase();
    const accPan = String(account.customerPAN || account.pan || '').trim();
    return allSales.filter(s => {
        if (s.status === 'CANCELLED' || s.status === 'RETURNED') return false;
        const sPhone = cleanDigits(s.customerPhone);
        const sName = (s.customer || '').trim().toLowerCase();
        const sPan = String(s.customerPAN || s.vatNo || '').trim();
        if (accPhone && sPhone && accPhone === sPhone) return true;
        if (accName && sName && accName === sName && sName !== 'walk-in') return true;
        if (accPan && sPan && accPan === sPan) return true;
        return false;
    }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

function renderPurchaseHistory() {
    const tbody = document.getElementById('historyTableBody');
    const badgeCount = document.getElementById('tabBadgeHistoryCount');

    let purchases = getCustomerPurchases();
    if (badgeCount) badgeCount.textContent = purchases.length;

    // Apply date range filter
    if (historyStartDate) {
        const start = new Date(historyStartDate).getTime();
        purchases = purchases.filter(p => new Date(p.timestamp || 0).getTime() >= start);
    }
    if (historyEndDate) {
        const end = new Date(historyEndDate).getTime() + (24 * 60 * 60 * 1000) - 1;
        purchases = purchases.filter(p => new Date(p.timestamp || 0).getTime() <= end);
    }

    // Pagination (20 rows per page)
    const totalPages = Math.max(1, Math.ceil(purchases.length / historyPageSize));
    if (historyPage > totalPages) historyPage = totalPages;
    const startIdx = (historyPage - 1) * historyPageSize;
    const pageRows = purchases.slice(startIdx, startIdx + historyPageSize);

    // Update pagination UI
    const pageInfo = document.getElementById('historyPageInfo');
    const btnPrev = document.getElementById('btnHistPrev');
    const btnNext = document.getElementById('btnHistNext');

    if (pageInfo) pageInfo.textContent = `Page ${historyPage} of ${totalPages} (${purchases.length} bills)`;
    if (btnPrev) btnPrev.disabled = historyPage <= 1;
    if (btnNext) btnNext.disabled = historyPage >= totalPages;

    if (tbody && pageRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No purchase history found for this period.</td></tr>`;
    } else if (tbody) {
        tbody.innerHTML = pageRows.map(sale => {
            const bill = sale.billNo || sale.id || '-';
            const mode = sale.paymentMode || 'CASH';
            const amt = parseFloat(sale.total) || 0;
            const dateStr = formatDateTime(sale.timestamp);

            return `
                <tr>
                    <td style="color: var(--text-secondary);">${dateStr}</td>
                    <td style="font-weight: 700; color: var(--crm-accent);">#${bill}</td>
                    <td><span class="customer-badge" style="background: var(--bg-main); border: 1px solid var(--border-light); font-weight: 600;">${mode}</span></td>
                    <td style="text-align: right; font-weight: 700;">Rs. ${fmt(amt)}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-secondary btn-sm" onclick="previewSale('${bill}')" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;" title="View Receipt">
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

}

function prevHistoryPage() {
    if (historyPage > 1) {
        historyPage--;
        renderPurchaseHistory();
    }
}

function nextHistoryPage() {
    historyPage++;
    renderPurchaseHistory();
}

function applyHistoryDateFilter() {
    const sInput = document.getElementById('historyStartDate');
    const eInput = document.getElementById('historyEndDate');
    historyStartDate = sInput ? sInput.value : '';
    historyEndDate = eInput ? eInput.value : '';
    historyPage = 1;
    renderPurchaseHistory();
}

function clearHistoryDateFilter() {
    const sInput = document.getElementById('historyStartDate');
    const eInput = document.getElementById('historyEndDate');
    if (sInput) sInput.value = '';
    if (eInput) eInput.value = '';
    historyStartDate = '';
    historyEndDate = '';
    historyPage = 1;
    renderPurchaseHistory();
}

function renderTopItems(purchases) {
    const container = document.getElementById('topItemsContainer');
    if (!container) return;

    // Aggregate items by product name
    const itemMap = {};
    purchases.forEach(sale => {
        let items = [];
        try {
            items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
        } catch(e) {
            items = [];
        }

        items.forEach(it => {
            const name = (it.name || it.productName || 'Item').trim();
            const qty = parseFloat(it.qty || it.quantity) || 0;
            const amt = parseFloat(it.amount || it.total || (it.rate * qty)) || 0;

            if (!itemMap[name]) {
                itemMap[name] = { name, qty: 0, amount: 0 };
            }
            itemMap[name].qty += qty;
            itemMap[name].amount += amt;
        });
    });

    const top5 = Object.values(itemMap)
        .sort((a, b) => b.qty - a.qty || b.amount - a.amount)
        .slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">No item purchase breakdown available.</div>`;
        return;
    }

    container.innerHTML = `
        <table class="crm-table">
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th>Product Name</th>
                    <th style="text-align: right; width: 120px;">Qty Purchased</th>
                    <th style="text-align: right; width: 140px;">Total Spent</th>
                </tr>
            </thead>
            <tbody>
                ${top5.map((item, idx) => `
                    <tr>
                        <td style="text-align: center; color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                        <td style="font-weight: 600;">${item.name}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--crm-accent);">${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 700;">Rs. ${fmt(item.amount)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============ TAB 3: CREDIT & PAYMENTS LEDGER ============

async function loadCustomerLedger() {
    if (!selectedAccount) return;

    const due = parseFloat(selectedAccount.creditDue != null ? selectedAccount.creditDue : selectedAccount.totalBalance) || 0;
    const limit = parseFloat(selectedAccount.creditLimit) || 0;
    const aging = selectedAccount._aging || { bucket0_30: 0, bucket31_60: 0, bucket60_plus: 0 };

    // Update Summary & Aging cards
    const elDue = document.getElementById('creditTabDue');
    const elLimit = document.getElementById('creditTabLimit');
    const elB1 = document.getElementById('bucket0_30');
    const elB2 = document.getElementById('bucket31_60');
    const elB3 = document.getElementById('bucket60_plus');

    if (elDue) elDue.textContent = `Rs. ${fmt(due)}`;
    if (elLimit) elLimit.textContent = limit > 0 ? `Rs. ${fmt(limit)}` : 'No Limit';
    if (elB1) elB1.textContent = `Rs. ${fmt(aging.bucket0_30 || 0)}`;
    if (elB2) elB2.textContent = `Rs. ${fmt(aging.bucket31_60 || 0)}`;
    if (elB3) elB3.textContent = `Rs. ${fmt(aging.bucket60_plus || 0)}`;

    // Disable Record Payment button if no balance
    const payBtn = document.getElementById('btnOpenPayment');
    if (payBtn) {
        if (due <= 0.001) {
            payBtn.disabled = true;
            payBtn.title = "No outstanding balance to pay.";
            payBtn.style.opacity = "0.5";
            payBtn.style.cursor = "not-allowed";
        } else {
            payBtn.disabled = false;
            payBtn.title = "";
            payBtn.style.opacity = "1";
            payBtn.style.cursor = "pointer";
        }
    }

    // Load ledger transactions
    const custName = selectedAccount.customerName || selectedAccount.name;
    let trans = [];
    try {
        if (window.posAPI && typeof window.posAPI.getARTransactions === 'function') {
            trans = await window.posAPI.getARTransactions(custName);
        }
    } catch(e) {
        console.error('Failed to load ledger transactions:', e);
    }

    renderLedgerTable(trans || []);
}

function renderLedgerTable(trans) {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    if (!trans || trans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No credit sales or payment records found.</td></tr>`;
        return;
    }

    // Sort chronologically ascending to compute running balance
    trans.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

    let runningBalance = 0;
    const rows = trans.map(t => {
        const isCredit = t.type === 'CREDIT';
        const amt = parseFloat(t.amount) || 0;
        if (isCredit) {
            runningBalance += amt;
        } else {
            runningBalance -= amt;
        }

        const dateStr = formatDateTime(t.timestamp);
        const ref = t.billNo ? `#${t.billNo}` : '-';
        const desc = isCredit ? 'Credit Sale' : (t.notes ? `Payment: ${t.notes}` : 'Payment Received');

        return `
            <tr>
                <td style="color: var(--text-secondary);">${dateStr}</td>
                <td style="font-weight: 700; color: var(--crm-accent);">${ref}</td>
                <td>${desc}</td>
                <td style="text-align: right; color: var(--crm-val-danger); font-weight: 700;">${isCredit ? `+ Rs. ${fmt(amt)}` : '-'}</td>
                <td style="text-align: right; color: var(--crm-val-success); font-weight: 700;">${!isCredit ? `- Rs. ${fmt(amt)}` : '-'}</td>
                <td style="text-align: right; font-weight: 800; color: ${runningBalance > 0.001 ? 'var(--crm-val-danger)' : 'var(--crm-val-success)'};">
                    Rs. ${fmt(runningBalance)}
                </td>
            </tr>
        `;
    });

    // Render most recent on top
    rows.reverse();
    tbody.innerHTML = rows.join('');
}

// ============ RECORD PAYMENT MODAL ============

function openPaymentModal() {
    if (!selectedAccount) return;
    const payAmt = document.getElementById('payAmount');
    const payNotes = document.getElementById('payNotes');
    const due = parseFloat(selectedAccount.creditDue != null ? selectedAccount.creditDue : selectedAccount.totalBalance) || 0;

    if (payAmt) {
        payAmt.value = due > 0 ? due.toFixed(2) : '';
    }
    if (payNotes) payNotes.value = '';

    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.add('active');
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('active');
}

async function submitPayment() {
    if (!selectedAccount) return;
    const payAmt = document.getElementById('payAmount');
    const payNotes = document.getElementById('payNotes');
    if (!payAmt) return;

    const amount = parseFloat(payAmt.value);
    const notes = payNotes ? payNotes.value.trim() : '';

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid payment amount.');
        return;
    }

    const currentDue = parseFloat(selectedAccount.creditDue != null ? selectedAccount.creditDue : selectedAccount.totalBalance) || 0;
    if (amount > currentDue + 0.01) {
        alert(`Payment amount (Rs. ${fmt(amount)}) exceeds outstanding balance (Rs. ${fmt(currentDue)}).`);
        return;
    }

    try {
        const custName = selectedAccount.customerName || selectedAccount.name;
        await window.posAPI.recordARPayment({
            customerName: custName,
            amount,
            notes,
            timestamp: new Date().toISOString()
        });

        showToast(`✅ Payment of Rs. ${fmt(amount)} recorded for ${custName}`);
        closePaymentModal();
        await reloadAllData();

    } catch (e) {
        console.error('Payment submission failed:', e);
        showToast('❌ Failed to record payment.');
    }
}

// ============ EXPORT STATEMENT ============

function exportCustomerStatement() {
    if (!selectedAccount) {
        alert('Please select a customer first.');
        return;
    }

    const name = selectedAccount.customerName || selectedAccount.name || 'Customer';
    const phone = selectedAccount.customerPhone || selectedAccount.phone || '-';
    const pan = selectedAccount.customerPAN || selectedAccount.pan || '-';
    const due = parseFloat(selectedAccount.creditDue != null ? selectedAccount.creditDue : selectedAccount.totalBalance) || 0;
    const spent = parseFloat(selectedAccount.totalSpent) || 0;
    const visits = parseInt(selectedAccount.visitCount) || 0;

    window.posAPI.getARTransactions(name).then(trans => {
        trans = trans || [];
        trans.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

        let runningBal = 0;
        let rows = trans.map((t, idx) => {
            const isCredit = t.type === 'CREDIT';
            const dateStr = t.timestamp ? new Date(t.timestamp).toLocaleDateString('en-IN') : '-';
            const amt = parseFloat(t.amount) || 0;
            if (isCredit) runningBal += amt; else runningBal -= amt;

            return `<tr>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${idx + 1}</td>
                <td style="padding:6px; border:1px solid #ddd;">${dateStr}</td>
                <td style="padding:6px; border:1px solid #ddd;">${t.billNo ? '#' + t.billNo : '-'}</td>
                <td style="padding:6px; border:1px solid #ddd;">${isCredit ? 'Credit Sale' : 'Payment Received'}${t.notes ? ' (' + t.notes + ')' : ''}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:right;">${isCredit ? 'Rs. ' + fmt(amt) : '-'}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:right;">${!isCredit ? 'Rs. ' + fmt(amt) : '-'}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:right; font-weight:bold;">Rs. ${fmt(runningBal)}</td>
            </tr>`;
        }).join('');

        if (trans.length === 0) {
            rows = `<tr><td colspan="7" style="padding:12px; text-align:center; color:#888;">No transactions found</td></tr>`;
        }

        const printWindow = window.open('', '_blank', 'width=850,height=650');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Account Statement - ${name}</title>
                <style>
                    body { font-family: 'Inter', sans-serif, Arial; margin: 24px; color: #111; }
                    h2 { margin-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                    th { background: #f4f4f5; padding: 8px; border: 1px solid #ddd; text-align: left; }
                    .summary-box { display: flex; gap: 20px; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 12px; }
                    .stat { flex: 1; }
                    .stat-val { font-size: 16px; font-weight: bold; }
                </style>
            </head>
            <body>
                <h2>Customer Account Statement</h2>
                <div style="font-size: 13px; color: #555;">Generated on ${new Date().toLocaleString('en-IN')}</div>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;">
                <div style="display:flex; justify-content:space-between; font-size:14px;">
                    <div><strong>Customer:</strong> ${name}<br><strong>Phone:</strong> ${phone}<br><strong>PAN:</strong> ${pan}</div>
                    <div style="text-align:right;"><strong>Total Outstanding Balance:</strong> <span style="color:#ef4444; font-size:16px;">Rs. ${fmt(due)}</span></div>
                </div>
                <div class="summary-box">
                    <div class="stat"><div style="color:#666; font-size:12px;">Total Spent</div><div class="stat-val">Rs. ${fmt(spent)}</div></div>
                    <div class="stat"><div style="color:#666; font-size:12px;">Visits</div><div class="stat-val">${visits}</div></div>
                    <div class="stat"><div style="color:#666; font-size:12px;">Balance Due</div><div class="stat-val" style="color:#ef4444;">Rs. ${fmt(due)}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:40px; text-align:center;">#</th>
                            <th style="width:100px;">Date</th>
                            <th style="width:80px;">Ref</th>
                            <th>Description</th>
                            <th style="width:110px; text-align:right;">Debit (Sale)</th>
                            <th style="width:110px; text-align:right;">Credit (Paid)</th>
                            <th style="width:110px; text-align:right;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 350);
    });
}

// ============ ADD & EDIT CUSTOMER MODALS ============

function openAddCustomerModal() {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const idInput = document.getElementById('custModalId');
    const nameInput = document.getElementById('custModalName');
    const phoneInput = document.getElementById('custModalPhone');
    const panInput = document.getElementById('custModalPAN');
    const addrInput = document.getElementById('custModalAddress');
    const limitInput = document.getElementById('custModalLimit');
    const tagsInput = document.getElementById('custModalTags');
    const notesInput = document.getElementById('custModalNotes');
    const warningEl = document.getElementById('custModalPhoneWarning');

    if (title) title.textContent = 'Add New Customer';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (panInput) panInput.value = '';
    if (addrInput) addrInput.value = '';
    if (limitInput) limitInput.value = '0';
    if (tagsInput) tagsInput.value = '';
    if (notesInput) notesInput.value = '';
    if (warningEl) warningEl.style.display = 'none';

    if (modal) modal.classList.add('active');
    setTimeout(() => nameInput && nameInput.focus(), 150);
}

function openEditCustomerModal() {
    if (!selectedAccount) return;
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const idInput = document.getElementById('custModalId');
    const nameInput = document.getElementById('custModalName');
    const phoneInput = document.getElementById('custModalPhone');
    const panInput = document.getElementById('custModalPAN');
    const addrInput = document.getElementById('custModalAddress');
    const limitInput = document.getElementById('custModalLimit');
    const tagsInput = document.getElementById('custModalTags');
    const notesInput = document.getElementById('custModalNotes');
    const warningEl = document.getElementById('custModalPhoneWarning');

    if (title) title.textContent = 'Edit Customer Details';
    if (idInput) idInput.value = selectedAccount.customerId || selectedAccount.id || '';
    if (nameInput) nameInput.value = selectedAccount.customerName || selectedAccount.name || '';
    if (phoneInput) phoneInput.value = cleanDigits(selectedAccount.customerPhone || selectedAccount.phone || '');
    if (panInput) panInput.value = selectedAccount.customerPAN || selectedAccount.pan || '';
    if (addrInput) addrInput.value = selectedAccount.customerAddress || selectedAccount.address || '';
    if (limitInput) limitInput.value = selectedAccount.creditLimit || '0';

    let tagsStr = '';
    if (Array.isArray(selectedAccount.tags)) {
        tagsStr = selectedAccount.tags.join(', ');
    } else if (typeof selectedAccount.tags === 'string') {
        try {
            const p = JSON.parse(selectedAccount.tags);
            tagsStr = Array.isArray(p) ? p.join(', ') : selectedAccount.tags;
        } catch(e) {
            tagsStr = selectedAccount.tags;
        }
    }
    if (tagsInput) tagsInput.value = tagsStr;
    if (notesInput) notesInput.value = selectedAccount.notes || '';
    if (warningEl) warningEl.style.display = 'none';

    if (modal) modal.classList.add('active');
}

function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.remove('active');
}

function handleModalPhoneInput(val) {
    const clean = cleanDigits(val);
    const phoneInput = document.getElementById('custModalPhone');
    if (phoneInput) phoneInput.value = clean;

    const warningEl = document.getElementById('custModalPhoneWarning');
    const existingNameEl = document.getElementById('custModalPhoneExistingName');
    const currentId = (document.getElementById('custModalId')?.value || '').trim();

    if (clean.length === 10) {
        const duplicate = accounts.find(a => {
            const aId = String(a.customerId || a.id || '');
            if (currentId && aId === currentId) return false;
            return cleanDigits(a.customerPhone || a.phone) === clean;
        });

        if (duplicate && warningEl) {
            if (existingNameEl) existingNameEl.textContent = duplicate.customerName || duplicate.name || 'Existing Customer';
            warningEl.style.display = 'block';
            return;
        }
    }

    if (warningEl) warningEl.style.display = 'none';
}

async function saveCustomerFromModal() {
    const nameInput = document.getElementById('custModalName');
    const phoneInput = document.getElementById('custModalPhone');
    const panInput = document.getElementById('custModalPAN');
    const addrInput = document.getElementById('custModalAddress');
    const limitInput = document.getElementById('custModalLimit');
    const tagsInput = document.getElementById('custModalTags');
    const notesInput = document.getElementById('custModalNotes');
    const idInput = document.getElementById('custModalId');

    const name = (nameInput?.value || '').trim();
    const phone = cleanDigits(phoneInput?.value || '');
    const pan = (panInput?.value || '').trim();
    const address = (addrInput?.value || '').trim();
    const creditLimit = parseFloat(limitInput?.value) || 0;
    const rawTags = (tagsInput?.value || '').split(',').map(t => t.trim()).filter(Boolean);
    const notes = (notesInput?.value || '').trim();
    const currentId = (idInput?.value || '').trim();

    if (!name) {
        alert('Please enter customer name.');
        nameInput?.focus();
        return;
    }

    // Phone validation: exactly 10 digits
    if (!phone || phone.length !== 10) {
        alert('Customer phone must be exactly 10 digits, numbers only.');
        phoneInput?.focus();
        return;
    }

    // PAN / VAT validation: if provided, must be exactly 9 digits
    if (pan && pan.length !== 9) {
        alert('Customer PAN / VAT number must be exactly 9 digits.');
        panInput?.focus();
        return;
    }

    const payload = {
        id: currentId || undefined,
        customerId: currentId || (selectedAccount && selectedAccount.customerId) || undefined,
        customerName: name,
        name: name,
        customerPhone: phone,
        phone: phone,
        customerPAN: pan,
        pan: pan,
        customerAddress: address,
        address: address,
        creditLimit: creditLimit,
        tags: rawTags,
        notes: notes,
        isActive: selectedAccount && currentId ? selectedAccount.isActive : 1
    };

    try {
        await window.posAPI.saveCustomer(payload);
        showToast(`✅ Customer ${name} saved successfully.`);
        closeCustomerModal();
        await reloadAllData();

        // Select the saved customer
        const updated = accounts.find(a => cleanDigits(a.customerPhone || a.phone) === phone || (a.customerName || a.name) === name);
        if (updated) selectAccount(updated);

    } catch(e) {
        console.error('Failed to save customer:', e);
        showToast('❌ Failed to save customer.');
    }
}

// ============ SOFT DELETE (DEACTIVATE / REACTIVATE) ============

async function toggleDeactivateCurrentCustomer() {
    if (!selectedAccount) return;
    const name = selectedAccount.customerName || selectedAccount.name;
    const isCurrentlyActive = selectedAccount.isActive !== 0 && selectedAccount.isActive !== false && selectedAccount.isActive !== '0';

    const actionText = isCurrentlyActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionText} customer "${name}"?\n\n${isCurrentlyActive ? 'They will be hidden from the customer list, but all bills, ledger and sales reports remain intact.' : 'They will be restored to your active customer list.'}`)) {
        return;
    }

    const newActiveVal = isCurrentlyActive ? 0 : 1;
    try {
        if (typeof window.posAPI.toggleCustomerActive === 'function') {
            await window.posAPI.toggleCustomerActive(name, newActiveVal);
        } else {
            await window.posAPI.saveCustomer({
                ...selectedAccount,
                isActive: newActiveVal
            });
        }

        showToast(`Customer ${name} ${isCurrentlyActive ? 'deactivated' : 'reactivated'}.`);
        await reloadAllData();

        // If deactivated and showDeactivated is false, reset selectedAccount
        if (!showDeactivated && isCurrentlyActive) {
            selectedAccount = null;
            const custDet = document.getElementById('customerDetails');
            const noCust = document.getElementById('noCustomerSelected');
            if (custDet) custDet.style.display = 'none';
            if (noCust) noCust.style.display = 'flex';
            handleResponsiveLayout();
        }
    } catch(e) {
        console.error('Failed to toggle customer status:', e);
        showToast('❌ Failed to update customer status.');
    }
}

// ============ REBUILD CRM STATS ============

async function rebuildCustomerStats() {
    if (!confirm('Rebuild customer stats from all stored sales? This will recalculate visits, total spent, and credit balances.')) return;
    try {
        if (typeof window.posAPI.rebuildARStats === 'function') {
            await window.posAPI.rebuildARStats();
            showToast('✅ Customer stats rebuilt successfully.');
            await reloadAllData();
        }
    } catch(e) {
        console.error('Failed to rebuild stats:', e);
        showToast('❌ Failed to rebuild stats.');
    }
}

// ============ RECEIPT PREVIEW (MATCHING SALES PAGE) ============

function previewSale(billNo) {
    const targetBill = String(billNo || '').trim().toLowerCase();
    const sale = allSales.find(s =>
        String(s.billNo || '').trim().toLowerCase() === targetBill ||
        String(s.id || '').trim() === targetBill
    );

    if (!sale) {
        alert('Receipt details not found.');
        return;
    }

    currentPreviewBill = sale;

    const modal = document.getElementById('receiptPreviewModal');
    const title = document.getElementById('receiptPreviewTitle');
    const paper = document.getElementById('receiptPreviewPaper');

    if (title) title.textContent = `Receipt Preview - Bill #${sale.billNo || sale.id}`;

    // Render receipt into paper
    if (paper) {
        paper.innerHTML = buildReceiptHTML(sale);
    }

    if (modal) modal.classList.add('active');
}

function closeReceiptPreview() {
    const modal = document.getElementById('receiptPreviewModal');
    if (modal) modal.classList.remove('active');
    currentPreviewBill = null;
}

function printReceiptPreview() {
    if (!currentPreviewBill) return;
    const printArea = document.getElementById('printableArea');
    if (printArea) {
        printArea.innerHTML = buildReceiptHTML(currentPreviewBill);
    }
    window.print();
}

function buildReceiptHTML(sale) {
    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    const settings = sale.storeSettings || (window.storeSettings || {});
    const storeName = (curBiz && curBiz.name) || settings.storeName || 'K POS STORE';
    const storeAddress = (curBiz && curBiz.address) || settings.storeAddress || '';
    const storePhone = (curBiz && curBiz.phone) || settings.storePhone || '';
    const storePan = (curBiz && (curBiz.pan || curBiz.tax_number)) || settings.pan || settings.vatNo || '';

    let items = [];
    try {
        items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
    } catch(e) {
        items = [];
    }

    const total = parseFloat(sale.total) || 0;
    const gross = parseFloat(sale.gross) || total;
    const discount = parseFloat(sale.discount) || 0;
    const taxable = parseFloat(sale.taxable) || 0;
    const nonTaxable = parseFloat(sale.nonTaxable) || 0;
    const vat = parseFloat(sale.vat) || 0;
    const dateStr = formatDateTime(sale.timestamp);

    return `
        <div style="font-family: monospace; font-size: 12px; line-height: 1.35; color: #000; text-align: left;">
            <div style="text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px;">${storeName}</div>
            ${storeAddress ? `<div style="text-align: center; font-size: 11px;">${storeAddress}</div>` : ''}
            ${storePhone ? `<div style="text-align: center; font-size: 11px;">Tel: ${storePhone}</div>` : ''}
            ${storePan ? `<div style="text-align: center; font-size: 11px; margin-bottom: 4px;">PAN: ${storePan}</div>` : ''}
            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

            <div style="display: flex; justify-content: space-between;">
                <span>Bill No: <strong>#${sale.billNo || sale.id}</strong></span>
                <span>Mode: ${sale.paymentMode || 'CASH'}</span>
            </div>
            <div>Date: ${dateStr}</div>
            ${sale.customer ? `<div>Customer: ${sale.customer}</div>` : ''}
            ${sale.customerPhone ? `<div>Phone: ${sale.customerPhone}</div>` : ''}
            ${sale.vatNo || sale.customerPAN ? `<div>Cust PAN: ${sale.vatNo || sale.customerPAN}</div>` : ''}

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 2px 0;">SN/Item</th>
                        <th style="text-align: right; width: 40px;">Qty</th>
                        <th style="text-align: right; width: 50px;">Rate</th>
                        <th style="text-align: right; width: 60px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((it, i) => {
                        const qty = parseFloat(it.qty || it.quantity) || 1;
                        const rate = parseFloat(it.rate || it.price) || 0;
                        const amt = parseFloat(it.amount || (qty * rate)) || 0;
                        return `
                            <tr>
                                <td style="padding: 2px 0;">${i + 1}. ${it.name || it.productName || 'Item'}</td>
                                <td style="text-align: right;">${qty}</td>
                                <td style="text-align: right;">${rate.toFixed(2)}</td>
                                <td style="text-align: right;">${amt.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
            <div style="display: flex; justify-content: space-between;"><span>Gross Total:</span><span>Rs. ${fmt(gross)}</span></div>
            ${discount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>- Rs. ${fmt(discount)}</span></div>` : ''}
            ${taxable > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Taxable:</span><span>Rs. ${fmt(taxable)}</span></div>` : ''}
            ${nonTaxable > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Non-Taxable:</span><span>Rs. ${fmt(nonTaxable)}</span></div>` : ''}
            ${vat > 0 ? `<div style="display: flex; justify-content: space-between;"><span>VAT (13%):</span><span>Rs. ${fmt(vat)}</span></div>` : ''}
            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                <span>NET TOTAL:</span>
                <span>Rs. ${fmt(total)}</span>
            </div>
            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
            <div style="text-align: center; font-size: 11px; margin-top: 6px;">Thank You! Visit Again.</div>
        </div>
    `;
}

// ============ TOAST & RESPONSIVE NAVIGATION ============

function showCustomerList() {
    if (window.innerWidth < 1100) {
        const custPanel = document.getElementById('customerPanel');
        const custDet = document.getElementById('customerDetails');
        const noCust = document.getElementById('noCustomerSelected');
        if (custPanel) custPanel.classList.remove('mobile-hidden');
        if (custDet) custDet.classList.add('mobile-hidden');
        if (noCust) noCust.classList.add('mobile-hidden');
    }
}

function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.style.display = 'none', 300);
    }, 2500);
}

// Window exports
window.init = init;
window.setCrmFilter = setCrmFilter;
window.onSortChange = onSortChange;
window.toggleShowDeactivated = toggleShowDeactivated;
window.selectAccount = selectAccount;
window.switchCrmTab = switchCrmTab;
window.openAddCustomerModal = openAddCustomerModal;
window.openEditCustomerModal = openEditCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.handleModalPhoneInput = handleModalPhoneInput;
window.saveCustomerFromModal = saveCustomerFromModal;
window.toggleDeactivateCurrentCustomer = toggleDeactivateCurrentCustomer;
window.rebuildCustomerStats = rebuildCustomerStats;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.submitPayment = submitPayment;
window.exportCustomerStatement = exportCustomerStatement;
window.previewSale = previewSale;
window.closeReceiptPreview = closeReceiptPreview;
window.printReceiptPreview = printReceiptPreview;
window.showCustomerList = showCustomerList;
window.showToast = showToast;
window.prevHistoryPage = prevHistoryPage;
window.nextHistoryPage = nextHistoryPage;
window.applyHistoryDateFilter = applyHistoryDateFilter;
window.clearHistoryDateFilter = clearHistoryDateFilter;

// Run on load
init();
