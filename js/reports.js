// reports.js

const fmtNum = (n) => parseFloat(n || 0).toFixed(2);
const fmtCurr = (n) => 'Rs. ' + fmtNum(n);

// --- Nepali Calendar Data (Duplicated from sales.js as requested for reports) ---
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
    return -1;
}

let allSales = [];
let allInventory = [];
let allCreditNotes = [];
let allPurchases = [];
let allSalesInvoices = [];
let auditLogs = [];

document.addEventListener('DOMContentLoaded', () => {
    // Basic setup
    const today = new Date().toISOString().split('T')[0];
    const dailySearch = document.getElementById('dailySearch');
    if (dailySearch) dailySearch.addEventListener('input', loadDailyReport);

    const returnsSearch = document.getElementById('returnsSearch');
    if (returnsSearch) returnsSearch.addEventListener('input', renderReturnsTable);

    // Set initial date for daily report based on picker defaults (usually today)
    document.getElementById('dailyStartDate').value = today;
    document.getElementById('dailyEndDate').value = today;

    const salesRegisterStart = document.getElementById('salesRegisterStartDate');
    const salesRegisterEnd = document.getElementById('salesRegisterEndDate');
    if (salesRegisterStart && salesRegisterEnd) {
        const currentYear = new Date().getFullYear();
        salesRegisterStart.value = new Date(currentYear, new Date().getMonth(), 1).toISOString().split('T')[0];
        salesRegisterEnd.value = today;
        salesRegisterStart.addEventListener('change', loadSalesRegisterReport);
        salesRegisterEnd.addEventListener('change', loadSalesRegisterReport);
    }
    
    // Set initial label
    const todayObj = new Date();
    const midx = findNepaliMonthIndex(todayObj);
    if (midx !== -1) {
        const m = nepaliMonthData[midx];
        const day = Math.floor((todayObj.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('filterRangeLabel').textContent = `${m.name} ${day}, ${m.year}`;
    }

    const monthlyMonth = document.getElementById('monthlyMonth');
    if (monthlyMonth) {
        // Find current Nepali Month
        const now = new Date();
        const midx = findNepaliMonthIndex(now);
        if (midx !== -1) {
            monthlyMonth.value = nepaliMonthData[midx].month;
        } else {
            monthlyMonth.value = 0; // Baishakh default
        }
        monthlyMonth.addEventListener('change', loadMonthlyReport);
    }
    const monthlyYear = document.getElementById('monthlyYear');
    if (monthlyYear) {
        monthlyYear.addEventListener('change', loadMonthlyReport);
    }
    
    const fiscalYearSelect = document.getElementById('fiscalYearSelect');
    if (fiscalYearSelect) {
        fiscalYearSelect.addEventListener('change', loadFiscalReport);
    }

    const taxStartDate = document.getElementById('taxStartDate');
    const taxEndDate = document.getElementById('taxEndDate');
    if (taxStartDate && taxEndDate) {
        const currentYear = new Date().getFullYear();
        taxStartDate.value = new Date(currentYear, new Date().getMonth(), 1).toISOString().split('T')[0];
        taxEndDate.value = today;
        taxStartDate.addEventListener('change', loadTaxReport);
        taxEndDate.addEventListener('change', loadTaxReport);
    }

    const salesRegisterSearch = document.getElementById('salesRegisterSearch');
    if (salesRegisterSearch) salesRegisterSearch.addEventListener('input', loadSalesRegisterReport);

    // Initialize data
    initReports();
    loadStoreInfo();
    
    // Tab switching from URL or Session
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || sessionStorage.getItem('pos_reports_active_tab');
    if (tab) {
        // If it's a full onclick string from generic sidebar, extract just the tabId
        if (tab.includes('switchTab(')) {
            const match = tab.match(/switchTab\('([^']+)'/);
            if (match) switchTab(match[1]);
        } else {
            switchTab(tab);
        }
    }
});

function loadStoreInfo() {
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const storeName = settings.storeName || 'K Pos';
    const address = settings.address || '';
    const vatLabelType = settings.vatLabelType || 'PAN';
    const vatNo = vatLabelType === 'VAT' ? (settings.vatNoActual || settings.vatNo || settings.panNo || '') : (settings.panNo || settings.vatNo || '');

    const suffix = ['d', 'm', 'f', 'r', 't', 's', 'p', 'a', 'ur', 'vs'];
    suffix.forEach(s => {
        const nameEl = document.getElementById(`p${s}-storeName`);
        const addrEl = document.getElementById(`p${s}-address`);
        const vatEl = document.getElementById(`p${s}-vat`);

        if (nameEl) nameEl.textContent = storeName;
        if (addrEl) addrEl.textContent = address;
        const vatLabel = settings.vatLabelType || 'PAN';
        if (vatEl) vatEl.textContent = vatNo ? `${vatLabel} No : ${vatNo}` : '';
    });
}

async function initReports() {
    try {
        const res = await window.posAPI.getAllSales({}); 
        allSales = Array.isArray(res) ? res : [];
        
        populateYearDropdown();
        
        loadDailyReport();
        loadMonthlyReport();
        loadReturnsReport();
        loadTaxReport();
        
        populateFiscalYearDropdown();
        loadFiscalReport();

    } catch (err) {
        console.error("Failed to load sales for reports:", err);
        allSales = [];
        populateYearDropdown();
        populateFiscalYearDropdown();
    }

    // Load inventory for stock/profit report
    try {
        const inv = await window.posAPI.getAllInventory();
        allInventory = Array.isArray(inv) ? inv : [];
        loadStockReport();
        loadProfitReport();
    } catch (err) {
        console.error("Failed to load inventory for stock report:", err);
        allInventory = [];
    }

    // Load audit logs
    loadAuditLogs();
    loadAuditReport();

    // Set audit date default
    const auditDateEl = document.getElementById('auditDate');
    if (auditDateEl) auditDateEl.value = '';

    // Load purchase invoices
    loadPurchaseReport();
    loadSalesRegisterReport();
}

function populateYearDropdown() {
    const yearSelect = document.getElementById('monthlyYear');
    if (!yearSelect) return;
    
    // Get current Nepali year
    const now = new Date();
    const midxNow = findNepaliMonthIndex(now);
    const currentYear = midxNow !== -1 ? nepaliMonthData[midxNow].year : 2082;
    
    const years = new Set();
    years.add(currentYear);
    
    // Add years from sales data if any (using Nepali dates)
    if (allSales && allSales.length > 0) {
        allSales.forEach(s => {
            if (s.timestamp) {
                const d = new Date(s.timestamp);
                const midx = findNepaliMonthIndex(d);
                if (midx !== -1) {
                    years.add(nepaliMonthData[midx].year);
                }
            }
        });
    }

    // Sort descending (newest first)
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    const prevVal = yearSelect.value;
    yearSelect.innerHTML = '';
    sortedYears.forEach(y => {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    });
    
    // Restore previous selection if valid, or default to current year
    if (prevVal && sortedYears.includes(parseInt(prevVal))) {
        yearSelect.value = prevVal;
    } else {
        yearSelect.value = currentYear;
    }
}

function switchTab(tabId, event) {
    if (event) {
        event.preventDefault();
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        // Find which button belongs to this tabId
        if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
    
    // Save to session for generic restoration
    sessionStorage.setItem('pos_reports_active_tab', tabId);
}

// ================= DAILY REPORT =================

function loadDailyReport() {
    const startDate = document.getElementById('dailyStartDate')?.value;
    const endDate = document.getElementById('dailyEndDate')?.value;
    const searchQuery = document.getElementById('dailySearch')?.value.toLowerCase();
    
    let filtered = allSales.filter(s => {
        if (!s.timestamp) return false;
        
        const saleDate = new Date(s.timestamp).toLocaleDateString('en-CA');
        
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
        
        if (searchQuery) {
            const billStr = String(s.billNo || '').toLowerCase();
            const custStr = String(s.customer || '').toLowerCase();
            if (!billStr.includes(searchQuery) && !custStr.includes(searchQuery)) return false;
        }
        
        return true;
    });
    
    // Sort oldest to newest
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const tbody = document.getElementById('dailyTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let totalSales = 0;
    
    filtered.forEach(sale => {
        const tr = document.createElement('tr');
        const timeStr = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isCancelled = sale.status === 'CANCELLED';
        if (!isCancelled) {
            totalSales += (sale.total || 0);
        }
        
        // Subtract any returns for this bill in this period
        allCreditNotes.forEach(cn => {
            if (cn.originalBillNo === sale.billNo) {
                const cnDate = new Date(cn.timestamp).toLocaleDateString('en-CA');
                if (startDate && cnDate < startDate) return;
                if (endDate && cnDate > endDate) return;
                totalSales += (cn.totalAmount || 0); // cn.totalAmount is negative
            }
        });
        
        let rowHtml = `
            <td>#${sale.billNo || 'N/A'}</td>
            <td>${timeStr}</td>
            <td>${sale.customer || '-'}</td>
            <td style="text-align: center;">${sale.items ? sale.items.length : 0}</td>
            <td style="text-align: right;">${fmtCurr(sale.total)}</td>
            <td style="text-align: center;">
                ${isCancelled ? '<span style="color:red; font-weight:bold;">Cancelled</span>' : '<span style="color:var(--accent-success);">Completed</span>'}
            </td>
        `;
        
        if (isCancelled) {
            tr.style.opacity = '0.6';
        }
        
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales found for this date/search.</td></tr>';
    }
    
    const totalBillsEl = document.getElementById('dailyTotalBills');
    if (totalBillsEl) totalBillsEl.textContent = filtered.length;
    const totalAmountEl = document.getElementById('dailyTotalAmount');
    if (totalAmountEl) totalAmountEl.textContent = fmtCurr(totalSales);

    // Update print info
    const dailyPrintEl = document.getElementById('dailyPrintInfo');
    if (dailyPrintEl) {
        if (startDate === endDate) {
            let bsDate = '';
            if (typeof window.convertToBS === 'function') {
                bsDate = window.convertToBS(startDate + 'T00:00:00');
            }
            dailyPrintEl.textContent = bsDate ? `Daily Sales Report - ${bsDate} BS` : `Date: ${startDate}`;
        } else {
            let bsStart = '', bsEnd = '';
            if (typeof window.convertToBS === 'function') {
                bsStart = window.convertToBS(startDate + 'T00:00:00');
                bsEnd = window.convertToBS(endDate + 'T00:00:00');
            }
            dailyPrintEl.textContent = (bsStart && bsEnd) ? `Period: ${bsStart} BS to ${bsEnd} BS` : `Period: ${startDate} to ${endDate}`;
        }
    }
}


// ================= MONTHLY REPORT =================

function loadMonthlyReport() {
    const monthEl = document.getElementById('monthlyMonth');
    const yearEl = document.getElementById('monthlyYear');
    if (!monthEl || !yearEl) return;

    const month = parseInt(monthEl.value);
    const year = parseInt(yearEl.value);
    
    if (isNaN(month) || isNaN(year)) return;
    
    // Group all valid sales by date
    const dailyTotals = {};
    
    allSales.forEach(sale => {
        if (!sale.timestamp || sale.status === 'CANCELLED') return;
        
        const d = new Date(sale.timestamp);
        const midx = findNepaliMonthIndex(d);
        if (midx === -1) return;
        
        const mData = nepaliMonthData[midx];
        if (mData.year === year && mData.month === month) {
            const dateStr = d.toLocaleDateString('en-CA');
            if (!dailyTotals[dateStr]) {
                dailyTotals[dateStr] = { count: 0, amount: 0 };
            }
            dailyTotals[dateStr].count += 1;
            dailyTotals[dateStr].amount += (sale.total || 0);
        }
    });

    // Substract returns for this month
    allCreditNotes.forEach(cn => {
        if (!cn.timestamp) return;
        const d = new Date(cn.timestamp);
        const midx = findNepaliMonthIndex(d);
        if (midx === -1) return;
        
        const mData = nepaliMonthData[midx];
        if (mData.year === year && mData.month === month) {
            const dateStr = d.toLocaleDateString('en-CA');
            if (!dailyTotals[dateStr]) {
                dailyTotals[dateStr] = { count: 0, amount: 0 };
            }
            // We don't increment count for returns in monthly daily breakdown, or we could. 
            // Usually returns are separate transactions.
            dailyTotals[dateStr].amount += (cn.totalAmount || 0); // negative
        }
    });
    
    const sortedDates = Object.keys(dailyTotals).sort();
    const tbody = document.getElementById('monthlyTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let grandTotal = 0;
    
    sortedDates.forEach(date => {
        const data = dailyTotals[date];
        grandTotal += data.amount;
        
        // Parse date as local timezone to avoid off-by-one BS day calculation
        const localDate = new Date(date + 'T00:00:00');
        let primaryDateStr = date; // Fallback to AD if convert fails
        let secondaryDateStr = '';
        if (typeof window.convertToBS === 'function') {
            const bs = window.convertToBS(date + 'T00:00:00');
            if (bs) {
                primaryDateStr = `${bs} BS`;
                secondaryDateStr = ` <span style="font-size: 0.8rem; color: var(--text-muted);">(${date} AD)</span>`;
            }
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${primaryDateStr}${secondaryDateStr}</td>
            <td style="text-align: center;">${data.count}</td>
            <td style="text-align: right;">${fmtCurr(data.amount)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (sortedDates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales found for this month.</td></tr>';
    }
    
    const grandTotalEl = document.getElementById('monthlyGrandTotal');
    if (grandTotalEl) grandTotalEl.textContent = fmtCurr(grandTotal);

    // Update print info
    const monthlyPrintEl = document.getElementById('monthlyPrintInfo');
    if (monthlyPrintEl && monthEl.selectedOptions.length > 0) {
        const m = monthEl.selectedOptions[0].text;
        monthlyPrintEl.textContent = `Period: ${m} ${year}`;
    }
}

// ================= FISCAL YEAR REPORT (NEPAL) =================

function getFiscalYearAndMonth(date) {
    const idx = findNepaliMonthIndex(new Date(date));
    if (idx === -1) return null;
    const m = nepaliMonthData[idx];
    
    // FY is X/X+1 if month is >= 3 (Shrawan and onwards)
    // If month < 3 (Baishakh, Jestha, Ashadh), then it belongs to FY X-1/X
    let fy_start_year = m.year;
    if (m.month < 3) {
        fy_start_year = m.year - 1;
    }
    const fyStr = `${fy_start_year}/${(fy_start_year+1).toString().slice(-2)}`;
    
    return {
        fy: fyStr,
        monthName: m.name,
        sortIndex: (m.month >= 3) ? (m.month - 3) : (m.month + 9)
    };
}

function populateFiscalYearDropdown() {
    const fySelect = document.getElementById('fiscalYearSelect');
    if (!fySelect) return;
    
    const fys = new Set();
    allSales.forEach(s => {
        if (!s.timestamp || s.status === 'CANCELLED') return;
        const fyData = getFiscalYearAndMonth(s.timestamp);
        if (fyData) fys.add(fyData.fy);
    });
    
    const todayFY = getFiscalYearAndMonth(new Date());
    if (todayFY) fys.add(todayFY.fy);
    
    const sortedFys = Array.from(fys).sort((a,b) => b.localeCompare(a)); // Descending string sort
    
    const prevVal = fySelect.value;
    fySelect.innerHTML = '';
    sortedFys.forEach(fy => {
        const option = document.createElement('option');
        option.value = fy;
        option.textContent = fy;
        fySelect.appendChild(option);
    });
    
    if (prevVal && sortedFys.includes(prevVal)) {
        fySelect.value = prevVal;
    } else if (sortedFys.length > 0) {
        fySelect.value = sortedFys[0];
    }
}

function loadFiscalReport() {
    const fyEl = document.getElementById('fiscalYearSelect');
    if (!fyEl) return;

    const selectedFY = fyEl.value;
    if (!selectedFY) return;
    
    // Group all valid sales by month for the selected FY
    const monthlyTotals = {};
    
    allSales.forEach(sale => {
        if (!sale.timestamp || sale.status === 'CANCELLED') return;
        
        const fyData = getFiscalYearAndMonth(sale.timestamp);
        if (fyData && fyData.fy === selectedFY) {
            const key = fyData.monthName;
            if (!monthlyTotals[key]) {
                monthlyTotals[key] = { amount: 0, sortIndex: fyData.sortIndex };
            }
            monthlyTotals[key].amount += (sale.total || 0);
        }
    });
    
    // Total returns for the FY
    allCreditNotes.forEach(cn => {
        if (!cn.timestamp) return;
        const fyData = getFiscalYearAndMonth(cn.timestamp);
        if (fyData && fyData.fy === selectedFY) {
            const key = fyData.monthName;
            if (!monthlyTotals[key]) {
                monthlyTotals[key] = { amount: 0, sortIndex: fyData.sortIndex };
            }
            monthlyTotals[key].amount += (cn.totalAmount || 0); // negative
        }
    });
    
    // Sort array by sortIndex (0=Shrawan, 11=Ashadh)
    const sortedMonths = Object.keys(monthlyTotals).map(k => ({
        name: k,
        amount: monthlyTotals[k].amount,
        sortIndex: monthlyTotals[k].sortIndex
    })).sort((a,b) => a.sortIndex - b.sortIndex);
    
    const tbody = document.getElementById('fiscalTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let grandTotal = 0;
    
    sortedMonths.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.name}</strong></td>
            <td style="text-align: right; font-weight: 500;">${fmtCurr(m.amount)}</td>
        `;
        tbody.appendChild(tr);
        grandTotal += m.amount;
    });
    
    if (sortedMonths.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales data for this fiscal year.</td></tr>';
    }
    
    const grandTotalEl = document.getElementById('fiscalGrandTotal');
    if (grandTotalEl) grandTotalEl.textContent = fmtCurr(grandTotal);

    const fiscalPrintInfo = document.getElementById('fiscalPrintInfo');
    if (fiscalPrintInfo) {
        fiscalPrintInfo.textContent = `Fiscal Year: ${selectedFY}`;
    }
}
window.loadFiscalReport = loadFiscalReport;


// ================= TAX REPORT =================

function loadTaxReport() {
    const startDate = document.getElementById('taxStartDate')?.value;
    const endDate = document.getElementById('taxEndDate')?.value;
    
    if (!startDate || !endDate) return;
    
    let totalSalesAmt = 0;
    
    allSales.forEach(sale => {
        if (!sale.timestamp || sale.status === 'CANCELLED') return;
        const d = new Date(sale.timestamp).toLocaleDateString('en-CA');
        if (d >= startDate && d <= endDate) {
            totalSalesAmt += (sale.total || 0);
        }
    });

    allCreditNotes.forEach(cn => {
        if (!cn.timestamp) return;
        const d = new Date(cn.timestamp).toLocaleDateString('en-CA');
        if (d >= startDate && d <= endDate) {
            totalSalesAmt += (cn.totalAmount || 0); // negative
        }
    });
    
    // Assuming PAN, VAT = 0
    const taxableAmt = totalSalesAmt;
    const vatAmt = 0;
    const grandTotal = totalSalesAmt + vatAmt;
    
    let pStart = startDate;
    let pEnd = endDate;
    let sStart = '';
    let sEnd = '';
    
    if (typeof window.convertToBS === 'function') {
        const bs1 = window.convertToBS(startDate + 'T00:00:00');
        if (bs1) { pStart = `${bs1} BS`; sStart = `(${startDate} AD)`; }
        const bs2 = window.convertToBS(endDate + 'T00:00:00');
        if (bs2) { pEnd = `${bs2} BS`; sEnd = `(${endDate} AD)`; }
    }
    
    const tbody = document.getElementById('taxTbody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td>
                <div>${pStart} <span style="font-size: 0.8rem; color: var(--text-muted);">${sStart}</span></div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0;">to</div>
                <div>${pEnd} <span style="font-size: 0.8rem; color: var(--text-muted);">${sEnd}</span></div>
            </td>
            <td style="text-align: right; vertical-align: middle;">${fmtCurr(totalSalesAmt)}</td>
            <td style="text-align: right; vertical-align: middle;">${fmtCurr(taxableAmt)}</td>
            <td style="text-align: right; vertical-align: middle;">${fmtCurr(vatAmt)}</td>
            <td style="text-align: right; font-weight: bold; vertical-align: middle;">${fmtCurr(grandTotal)}</td>
        </tr>
    `;

    // Update print info
    const taxPrintEl = document.getElementById('taxPrintInfo');
    if (taxPrintEl) taxPrintEl.textContent = `Period: ${pStart} to ${pEnd}`;
}

// ================= RETURNS REPORT =================

async function loadReturnsReport() {
    try {
        allCreditNotes = await window.posAPI.getAllCreditNotes();
        renderReturnsTable();
    } catch (err) {
        console.error("Failed to load credit notes for reports:", err);
        allCreditNotes = [];
        renderReturnsTable();
    }
}
window.loadReturnsReport = loadReturnsReport;

function renderReturnsTable() {
    const tbody = document.getElementById('returnsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('returnsSearch')?.value || '').toLowerCase();
    
    const filtered = allCreditNotes.filter(note => {
        if (!searchQuery) return true;
        const cnStr = String(note.cnNo || '').toLowerCase();
        const billStr = String(note.originalBillNo || '').toLowerCase();
        const custStr = String(note.customerName || '').toLowerCase();
        return cnStr.includes(searchQuery) || billStr.includes(searchQuery) || custStr.includes(searchQuery);
    });

    let totalReturns = 0;

    filtered.forEach(note => {
        const date = new Date(note.timestamp);
        const tr = document.createElement('tr');
        const amt = parseFloat(note.totalAmount || 0);
        totalReturns += amt;

        tr.innerHTML = `
            <td><strong>${note.cnNo}</strong></td>
            <td>
                ${date.toLocaleDateString()}<br>
                <small style="color: var(--text-muted);">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </td>
            <td>#${note.originalBillNo}</td>
            <td>${note.customerName || ''}</td>
            <td style="font-weight: 600; text-align: right;">${fmtCurr(amt)}</td>
            <td><span class="badge badge-warning">${note.reason || 'Return'}</span></td>
            <td class="no-print" style="text-align: right;">
                <button class="btn btn-secondary" onclick="viewCreditNote('${note.cnNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No returns found.</td></tr>';
    }

    const grandTotalEl = document.getElementById('returnsGrandTotal');
    if (grandTotalEl) grandTotalEl.textContent = fmtCurr(totalReturns);
    
    const printInfoEl = document.getElementById('returnsPrintInfo');
    if (printInfoEl) {
        let genDateStr = new Date().toLocaleDateString();
        if (typeof window.convertToBS === 'function') {
            const bsGen = window.convertToBS(new Date());
            if (bsGen) genDateStr = `${bsGen} BS`;
        }
        printInfoEl.textContent = `Generated: ${genDateStr}`;
    }
}
window.renderReturnsTable = renderReturnsTable;

function viewCreditNote(cnNo) {
    const note = allCreditNotes.find(n => n.cnNo === cnNo);
    if (!note) return;
    let itemsList = note.items.map(i => `${i.name} (x${i.qty})`).join('\n');
    alert(`Credit Note: ${note.cnNo}\nTotal: Rs. ${note.totalAmount.toFixed(2)}\nOriginal Bill: #${note.originalBillNo}\n\nItems:\n${itemsList}`);
}
window.viewCreditNote = viewCreditNote;

// ================= EXPORT & PRINT =================

async function printReport(type) {
    if (type === 'purchase') {
        const filterCard = document.getElementById('vatPurchaseFilterCard');
        const reportView = document.getElementById('vatPurchaseReportView');

        if (filterCard) filterCard.style.display = 'none';
        if (reportView) reportView.style.display = 'block';

        if (typeof loadPurchaseReport === 'function') {
            await loadPurchaseReport();
        }

        document.body.classList.add('print-purchase');

        const cleanup = () => {
            document.body.classList.remove('print-purchase');
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 30000);
        return;
    }

    window.print();
}

function getTableData(type) {
    let headers = [];
    let data = [];
    
    if (type === 'daily') {
        headers = [['Bill No', 'Time', 'Customer', 'Items', 'Total', 'Status']];
        const rows = document.querySelectorAll('#dailyTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 6) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText,
                    r.cells[5].innerText
                ]);
            }
        });
    } else if (type === 'monthly') {
        headers = [['Date', 'Number of Bills', 'Total Sales']];
        const rows = document.querySelectorAll('#monthlyTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 3) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText
                ]);
            }
        });
    } else if (type === 'fiscal') {
        headers = [['Month', 'Total Sales']];
        const rows = document.querySelectorAll('#fiscalTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 2) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText
                ]);
            }
        });
    } else if (type === 'returns') {
        headers = [['CN Number', 'Date & Time', 'Original Bill', 'Customer PAN', 'Amount', 'Reason']];
        const rows = document.querySelectorAll('#returnsTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 7) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText,
                    r.cells[5].innerText
                ]);
            }
        });
    } else if (type === 'tax') {
        headers = [['Period', 'Total Sales', 'Taxable Amount', 'VAT (0%)', 'Grand Total']];
        const rows = document.querySelectorAll('#taxTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 5) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText
                ]);
            }
        });
    } else if (type === 'stock') {
        headers = [['Product Name', 'SKU', 'Opening Stock', 'Sold Qty', 'Current Stock', 'Status']];
        const rows = document.querySelectorAll('#stockTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 6) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText,
                    r.cells[5].innerText
                ]);
            }
        });
    } else if (type === 'audit') {
        headers = [['User', 'Action', 'Module', 'Reference ID', 'Date', 'Time']];
        const rows = document.querySelectorAll('#auditTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 6) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText,
                    r.cells[5].innerText
                ]);
            }
        });
    } else if (type === 'profit') {
        headers = [['Product Name', 'Sold', 'Cost', 'Selling', 'Profit']];
        const rows = document.querySelectorAll('#profitTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 5) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText
                ]);
            }
        });
    } else if (type === 'purchase') {
        headers = [['MITI', 'INVOICE NO', 'PP NO', 'SUPPLIER NAME', 'SUPPLIER PAN', 'TOTAL PURCHASE', 'NON TAXABLE', 'TAXABLE PURCHASE (AMT)', 'TAXABLE PURCHASE (VAT)', 'IMPORT PURCHASE (AMT)', 'IMPORT PURCHASE (VAT)', 'CAPITALIZED PURCHASE (AMT)', 'CAPITALIZED PURCHASE (VAT)']];
        const rows = document.querySelectorAll('#purchaseTbody tr');
        rows.forEach(r => {
            if (r.cells.length === 13) {
                data.push([
                    r.cells[0].innerText,
                    r.cells[1].innerText,
                    r.cells[2].innerText,
                    r.cells[3].innerText,
                    r.cells[4].innerText,
                    r.cells[5].innerText,
                    r.cells[6].innerText,
                    r.cells[7].innerText,
                    r.cells[8].innerText,
                    r.cells[9].innerText,
                    r.cells[10].innerText,
                    r.cells[11].innerText,
                    r.cells[12].innerText
                ]);
            }
        });
    }
    
    return { headers, data };
}

function exportPDF(type) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert("PDF library not loaded.");
        return;
    }
    const doc = new jsPDF();
    
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const storeName = settings.storeName || 'K Pos';
    
    let title = 'Report';
    if (type === 'daily') {
        const start = document.getElementById('dailyStartDate').value;
        const end = document.getElementById('dailyEndDate').value;
        title = start === end ? `Daily Sales - ${start}` : `Sales Report - ${start} to ${end}`;
    }
    if (type === 'monthly') {
        const monthEl = document.getElementById('monthlyMonth');
        const m = monthEl.selectedOptions[0].text;
        const y = document.getElementById('monthlyYear').value;
        title = `Monthly Sales - ${m} ${y}`;
    }
    if (type === 'fiscal') title = `Fiscal Year Report - ${document.getElementById('fiscalYearSelect').value.replace('/', '_')}`;
    if (type === 'tax') title = `Tax Report (${document.getElementById('taxStartDate').value} to ${document.getElementById('taxEndDate').value})`;
    if (type === 'stock') title = 'Stock Report';
    if (type === 'profit') title = 'Profit Report';
    if (type === 'audit') title = 'Audit Log Report';
    if (type === 'purchase') title = `VAT Purchase Register Report`;
    
    doc.setFontSize(18);
    doc.text(storeName, 14, 22);
    doc.setFontSize(12);
    doc.text(title, 14, 30);
    
    const { headers, data } = getTableData(type);
    
    if (doc.autoTable) {
        doc.autoTable({
            startY: 35,
            head: headers,
            body: data,
        });
    } else {
        alert("PDF Table plugin not loaded.");
    }
    
    doc.save(`${title.replace(/ /g, '_')}.pdf`);
}

function exportExcel(type) {
    if (typeof XLSX === 'undefined') {
        alert("Excel library not loaded.");
        return;
    }
    
    let title = 'Report';
    if (type === 'daily') {
        const start = document.getElementById('dailyStartDate').value;
        const end = document.getElementById('dailyEndDate').value;
        title = start === end ? `Daily_Sales_${start}` : `Sales_Report_${start}_to_${end}`;
    }
    if (type === 'monthly') title = `Monthly_Sales_${document.getElementById('monthlyYear').value}_${document.getElementById('monthlyMonth').value}`;
    if (type === 'fiscal') title = `Fiscal_Year_${document.getElementById('fiscalYearSelect').value.replace('/', '_')}`;
    if (type === 'tax') title = `Tax_Report`;
    if (type === 'stock') title = `Stock_Report`;
    if (type === 'profit') title = `Profit_Report`;
    if (type === 'audit') title = `Audit_Log_Report`;
    if (type === 'purchase') title = `VAT_Purchase_Register_Report`;
    
    const { headers, data } = getTableData(type);
    
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    XLSX.writeFile(wb, `${title}.xlsx`);
}

// ================= STOCK REPORT =================

function loadStockReport() {
    const searchQuery = (document.getElementById('stockSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('stockStatusFilter')?.value || 'all';
    const tbody = document.getElementById('stockTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Calculate total sold per product from sales
    const soldMap = {};
    allSales.forEach(sale => {
        if (sale.status === 'CANCELLED' || sale.status === 'RETURNED') return;
        (sale.items || []).forEach(item => {
            const key = item.id || item.name;
            soldMap[key] = (soldMap[key] || 0) + (item.qty || 0);
        });
    });

    let totalProducts = 0;
    let lowCount = 0;
    let outCount = 0;

    const stockData = allInventory.map(product => {
        const productId = product.id || product.name;
        const soldQty = soldMap[productId] || 0;
        const currentStock = (product.stock || 0);
        // Opening stock = current stock + sold (since stock was reduced on sale)
        const openingStock = currentStock + soldQty;
        
        let status = 'OK';
        if (currentStock <= 0) status = 'OUT OF STOCK';
        else if (currentStock < 5) status = 'LOW STOCK';

        return {
            name: product.name || 'Unknown',
            sku: product.barcode || product.id || '-',
            openingStock,
            soldQty,
            currentStock,
            status
        };
    });

    // Filter
    const filtered = stockData.filter(item => {
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return false;
        if (statusFilter === 'ok' && item.status !== 'OK') return false;
        if (statusFilter === 'low' && item.status !== 'LOW STOCK') return false;
        if (statusFilter === 'out' && item.status !== 'OUT OF STOCK') return false;
        return true;
    });

    filtered.forEach(item => {
        totalProducts++;
        if (item.status === 'LOW STOCK') lowCount++;
        if (item.status === 'OUT OF STOCK') outCount++;

        let statusBadge = '';
        if (item.status === 'OUT OF STOCK') {
            statusBadge = '<span style="background: rgba(239,68,68,0.15); color: #ef4444; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.8rem; font-weight: 600;">OUT OF STOCK</span>';
        } else if (item.status === 'LOW STOCK') {
            statusBadge = '<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.8rem; font-weight: 600;">LOW STOCK</span>';
        } else {
            statusBadge = '<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.8rem; font-weight: 600;">OK</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td style="text-align: right;">${item.openingStock}</td>
            <td style="text-align: right;">${item.soldQty}</td>
            <td style="text-align: right; font-weight: 600;">${item.currentStock}</td>
            <td style="text-align: center;">${statusBadge}</td>
        `;
        if (item.status === 'OUT OF STOCK') tr.style.opacity = '0.7';
        tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No products found.</td></tr>';
    }

    const totalEl = document.getElementById('stockTotalProducts');
    if (totalEl) totalEl.textContent = totalProducts;
    const lowEl = document.getElementById('stockLowCount');
    if (lowEl) lowEl.textContent = lowCount;
    const outEl = document.getElementById('stockOutCount');
    if (outEl) outEl.textContent = outCount;

    const printEl = document.getElementById('stockPrintInfo');
    if (printEl) printEl.textContent = `Generated: ${new Date().toLocaleDateString()}`;
}
window.loadStockReport = loadStockReport;

// ================= PROFIT REPORT =================

function loadProfitReport() {
    const tbody = document.getElementById('profitTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('profitSearch')?.value || '').toLowerCase();
    
    // Sum total sold items across valid sales
    const soldMap = {};
    allSales.forEach(sale => {
        if (sale.status === 'CANCELLED' || sale.status === 'RETURNED') return;
        (sale.items || []).forEach(item => {
            const key = item.id || item.name;
            soldMap[key] = (soldMap[key] || 0) + (parseFloat(item.qty) || 0);
        });
    });

    let totalProfitAmount = 0;
    let hasData = false;

    // Use current inventory prices/costs to project profit
    // Only display items that actually sold > 0
    allInventory.forEach(product => {
        const key = product.id || product.name;
        const soldQty = soldMap[key] || 0;
        
        if (soldQty === 0) return;
        if (searchQuery && !(product.name || '').toLowerCase().includes(searchQuery)) return;
        
        const cost = parseFloat(product.costPrice) || 0;
        const selling = parseFloat(product.price) || 0;
        const totalItemProfit = (selling - cost) * soldQty;
        
        totalProfitAmount += totalItemProfit;
        hasData = true;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${product.name || 'Unknown'}</strong></td>
            <td style="text-align: right;">${soldQty}</td>
            <td style="text-align: right;">${fmtCurr(cost)}</td>
            <td style="text-align: right;">${fmtCurr(selling)}</td>
            <td style="text-align: right; font-weight: 600; color: ${totalItemProfit < 0 ? 'red' : 'var(--accent-success)'};">${fmtCurr(totalItemProfit)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (!hasData) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales data meets your filter or items haven\'t been sold.</td></tr>';
    }

    const grandTotalEl = document.getElementById('profitGrandTotal');
    if (grandTotalEl) grandTotalEl.textContent = fmtCurr(totalProfitAmount);
}
window.loadProfitReport = loadProfitReport;

// ================= AUDIT LOG REPORT =================

const AUDIT_LOG_KEY = 'pos_audit_logs';

function loadAuditLogs() {
    // Load persisted audit logs
    const stored = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    
    // Build logs from existing sales data (reconstruct history)
    const reconstructed = [];
    
    allSales.forEach(sale => {
        // Bill created
        reconstructed.push({
            user: sale.cashier || 'Admin',
            action: 'Created Bill',
            module: 'Sales',
            refId: `#${sale.billNo}`,
            timestamp: sale.timestamp
        });
        
        // Bill cancelled
        if (sale.status === 'CANCELLED') {
            reconstructed.push({
                user: sale.cashier || 'Admin',
                action: 'Cancelled Bill',
                module: 'Sales',
                refId: `#${sale.billNo}`,
                timestamp: sale.timestamp
            });
        }
        
        // Bill returned
        if (sale.status === 'RETURNED') {
            reconstructed.push({
                user: sale.cashier || 'Admin',
                action: 'Returned Bill',
                module: 'Sales',
                refId: `#${sale.billNo}`,
                timestamp: sale.timestamp
            });
        }
    });

    // Merge persisted and reconstructed, deduplicate by refId+action
    const existingKeys = new Set(stored.map(l => `${l.refId}|${l.action}`));
    reconstructed.forEach(log => {
        const key = `${log.refId}|${log.action}`;
        if (!existingKeys.has(key)) {
            stored.push(log);
            existingKeys.add(key);
        }
    });

    // Sort descending (latest first)
    stored.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    auditLogs = stored;

    // Populate user filter dropdown
    const userFilter = document.getElementById('auditUserFilter');
    if (userFilter) {
        const users = new Set();
        auditLogs.forEach(l => { if (l.user) users.add(l.user); });
        const prevVal = userFilter.value;
        userFilter.innerHTML = '<option value="all">All Users</option>';
        Array.from(users).sort().forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = u;
            userFilter.appendChild(opt);
        });
        if (prevVal && prevVal !== 'all') userFilter.value = prevVal;
    }
}

function loadAuditReport() {
    const dateFilter = document.getElementById('auditDate')?.value || '';
    const userFilter = document.getElementById('auditUserFilter')?.value || 'all';
    const searchQuery = (document.getElementById('auditSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('auditTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = auditLogs.filter(log => {
        if (dateFilter) {
            const logDate = new Date(log.timestamp).toLocaleDateString('en-CA');
            if (logDate !== dateFilter) return false;
        }
        if (userFilter !== 'all' && log.user !== userFilter) return false;
        if (searchQuery && !(log.action || '').toLowerCase().includes(searchQuery)) return false;
        return true;
    });

    filtered.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = d.toLocaleDateString('en-CA');
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let pDateStr = dateStr;
        let sDateStr = '';
        if (typeof window.convertToBS === 'function') {
            const bs = window.convertToBS(d);
            if (bs) {
                pDateStr = `${bs} BS`;
                sDateStr = `<br><span style="font-size: 0.8rem; color: var(--text-muted);">(${dateStr} AD)</span>`;
            }
        }

        let actionColor = 'var(--text-primary)';
        if (log.action.includes('Cancel')) actionColor = '#ef4444';
        else if (log.action.includes('Created')) actionColor = '#10b981';
        else if (log.action.includes('Return')) actionColor = '#f59e0b';
        else if (log.action.includes('Added')) actionColor = '#6366f1';
        else if (log.action.includes('Updated')) actionColor = '#8b5cf6';
        else if (log.action.includes('Deleted')) actionColor = '#ef4444';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.user || '-'}</td>
            <td style="color: ${actionColor}; font-weight: 600;">${log.action || '-'}</td>
            <td>${log.module || '-'}</td>
            <td><code style="background: var(--bg-main); padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem;">${log.refId || '-'}</code></td>
            <td>${pDateStr}${sDateStr}</td>
            <td>${timeStr}</td>
        `;
        tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No audit log entries found.</td></tr>';
    }

    const totalEl = document.getElementById('auditTotalEntries');
    if (totalEl) totalEl.textContent = filtered.length;

    const printEl = document.getElementById('auditPrintInfo');
    if (printEl) {
        let printDateStr = dateFilter;
        if (dateFilter && typeof window.convertToBS === 'function') {
            const bs = window.convertToBS(dateFilter + 'T00:00:00');
            if (bs) printDateStr = `${bs} BS`;
        }
        
        let genDateStr = new Date().toLocaleDateString();
        if (typeof window.convertToBS === 'function') {
            const bsGen = window.convertToBS(new Date());
            if (bsGen) genDateStr = `${bsGen} BS`;
        }

        if (dateFilter) {
            printEl.textContent = `Date: ${printDateStr}`;
        } else {
            printEl.textContent = `All dates - Generated: ${genDateStr}`;
        }
    }
}
window.loadAuditReport = loadAuditReport;

// Global helper to record an audit log entry from any page
function recordAuditLog(user, action, module, refId) {
    const logs = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    logs.push({
        user: user || 'Admin',
        action,
        module,
        refId,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
}
window.recordAuditLog = recordAuditLog;

// --- End of Reports Logic ---

// ================= PURCHASE INVOICE REPORT =================

let hasLoadedPurchases = false;

window.runVatPurchaseReport = function() {
    document.getElementById('vatPurchaseFilterCard').style.display = 'none';
    document.getElementById('vatPurchaseReportView').style.display = 'block';
    loadPurchaseReport();
};

async function loadPurchaseReport() {
    const tbody = document.getElementById('purchaseTbody');
    if (!tbody) return;

    // Load purchases from API if not loaded yet
    if (!hasLoadedPurchases) {
        try {
            const res = await window.posAPI.getAllPurchases();
            allPurchases = Array.isArray(res) ? res : [];
            hasLoadedPurchases = true;
        } catch (err) {
            console.error('Failed to load purchases for report:', err);
            allPurchases = [];
            hasLoadedPurchases = true;
        }
    }

    const startDate = document.getElementById('purchaseStartDate')?.value || '';
    const endDate = document.getElementById('purchaseEndDate')?.value || '';
    const search = (document.getElementById('purchaseSearch')?.value || '').toLowerCase().trim();

    let filtered = allPurchases;

    if (startDate) {
        filtered = filtered.filter(p => p.entryDate >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(p => p.entryDate <= endDate);
    }
    if (search) {
        filtered = filtered.filter(p =>
            (p.piNo || '').toLowerCase().includes(search) ||
            (p.supplier || '').toLowerCase().includes(search) ||
            (p.invoiceNo || '').toLowerCase().includes(search)
        );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp || b.entryDate) - new Date(a.timestamp || a.entryDate));

    tbody.innerHTML = '';

    let tTotalPur = 0, tNonTax = 0, tTaxAmt = 0, tTaxVat = 0;
    let tImpAmt = 0, tImpVat = 0, tCapAmt = 0, tCapVat = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:2rem; color:var(--text-muted);">No purchase invoices found.</td></tr>';
    } else {
        filtered.forEach(p => {
            let entryBS = '-';
            if (p.entryDate && typeof window.convertToBS === 'function') {
                const bs = window.convertToBS(p.entryDate + 'T00:00:00');
                if (bs) entryBS = bs;
            }

            const taxable = parseFloat(p.taxable || 0);
            const nonTaxable = parseFloat(p.nonTaxable || 0);
            const vat = parseFloat(p.vat || 0);
            const totalPur = taxable + nonTaxable;

            tTotalPur += totalPur;
            tNonTax += nonTaxable;
            tTaxAmt += taxable;
            tTaxVat += vat;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:0.5rem; border: 1px solid #bae6fd;">${entryBS}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd;">${p.invoiceNo || p.piNo}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd;"></td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd;">${p.supplier || '-'}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd;">${p.vatNo || '-'}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">${totalPur.toFixed(2)}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">${nonTaxable.toFixed(2)}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">${taxable.toFixed(2)}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">${vat.toFixed(2)}</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">0.00</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">0.00</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">0.00</td>
                <td style="padding:0.5rem; border: 1px solid #bae6fd; text-align:right;">0.00</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update summary totals
    const totGrossEl = document.getElementById('vatPurTotalGross');
    if (totGrossEl) totGrossEl.textContent = tTotalPur.toFixed(2);
    
    const totNonTaxEl = document.getElementById('vatPurTotalNonTaxable');
    if (totNonTaxEl) totNonTaxEl.textContent = tNonTax.toFixed(2);
    
    const totTaxEl = document.getElementById('vatPurTotalTaxable');
    if (totTaxEl) totTaxEl.textContent = tTaxAmt.toFixed(2);
    
    const totVatEl = document.getElementById('vatPurTotalVat');
    if (totVatEl) totVatEl.textContent = tTaxVat.toFixed(2);

    // Update print info
    const printEl = document.getElementById('purchasePrintInfo');
    const printMetaEl = document.getElementById('purchasePrintInfoPrint');
    let printDateStr = 'All Dates';
    if (startDate && endDate && typeof window.convertToBS === 'function') {
        const bsStart = window.convertToBS(startDate + 'T00:00:00');
        const bsEnd = window.convertToBS(endDate + 'T00:00:00');
        if (bsStart && bsEnd) {
            printDateStr = `${startDate} To ${endDate} (${bsStart} To ${bsEnd})`;
        } else {
            printDateStr = `${startDate} To ${endDate}`;
        }
    } else if (startDate || endDate) {
        printDateStr = `${startDate || 'Start'} To ${endDate || 'End'}`;
    }

    const division = document.getElementById('vatPurDivision')?.value || 'DEMO';
    const printInfo = `@As On Dated: ${printDateStr} @Division: ${division}`;
    if (printEl) printEl.textContent = printInfo;
    if (printMetaEl) printMetaEl.textContent = printInfo;
}
window.loadPurchaseReport = loadPurchaseReport;

// ================= VAT SALES REGISTER REPORT =================

let hasLoadedSalesInvoices = false;

window.runVatSalesReport = function() {
    document.getElementById('vatSalesFilterCard').style.display = 'none';
    document.getElementById('vatSalesReportView').style.display = 'block';
    loadSalesRegisterReport();
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getInvoiceDate(inv) {
    return inv.invoiceDate || inv.entryDate || (inv.timestamp ? new Date(inv.timestamp).toLocaleDateString('en-CA') : '');
}

function getBsDate(adDate) {
    if (!adDate) return '';
    if (typeof window.convertToBS === 'function') {
        return window.convertToBS(adDate + 'T00:00:00') || '';
    }
    return '';
}

async function ensureSalesInvoicesLoaded() {
    if (hasLoadedSalesInvoices) return;

    try {
        const res = await window.posAPI.getAllSalesInvoices();
        allSalesInvoices = Array.isArray(res) ? res : [];
    } catch (err) {
        console.error('Failed to load sales invoices for register:', err);
        allSalesInvoices = [];
    }

    hasLoadedSalesInvoices = true;
}

async function loadSalesRegisterReport() {
    const tbody = document.getElementById('salesRegisterTbody');
    if (!tbody) return;

    await ensureSalesInvoicesLoaded();

    const startDate = document.getElementById('salesRegisterStartDate')?.value || '';
    const endDate = document.getElementById('salesRegisterEndDate')?.value || '';
    const search = (document.getElementById('salesRegisterSearch')?.value || '').toLowerCase().trim();

    let filtered = allSalesInvoices.slice();

    if (startDate) {
        filtered = filtered.filter(inv => getInvoiceDate(inv) >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(inv => getInvoiceDate(inv) <= endDate);
    }
    if (search) {
        filtered = filtered.filter(inv =>
            String(inv.invoiceNo || inv.siNo || '').toLowerCase().includes(search) ||
            String(inv.customer || '').toLowerCase().includes(search) ||
            String(inv.vatNo || '').toLowerCase().includes(search)
        );
    }

    filtered.sort((a, b) => new Date(getInvoiceDate(a)) - new Date(getInvoiceDate(b)));

    tbody.innerHTML = '';

    let tGross = 0;
    let tNonTaxable = 0;
    let tTaxable = 0;
    let tVat = 0;
    let tExport = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:2rem; color:var(--text-muted);">No sales tax invoices found.</td></tr>';
    } else {
        filtered.forEach(inv => {
            const adDate = getInvoiceDate(inv);
            const bsDate = getBsDate(adDate);
            const taxable = parseFloat(inv.taxable || 0);
            const nonTaxable = parseFloat(inv.nonTaxable || 0);
            const vat = parseFloat(inv.vat || 0);
            const totalSales = taxable + nonTaxable;
            const exportValue = parseFloat(inv.exportValue || 0);

            tGross += totalSales;
            tNonTaxable += nonTaxable;
            tTaxable += taxable;
            tVat += vat;
            tExport += exportValue;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(adDate || '-')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(bsDate || '-')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.invoiceNo || inv.siNo || '-')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.customer || '-')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.vatNo || '-')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8; text-align:right;">${totalSales.toFixed(2)}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8; text-align:right;">${nonTaxable.toFixed(2)}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8; text-align:right;">${taxable.toFixed(2)}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8; text-align:right;">${vat.toFixed(2)}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8; text-align:right;">${exportValue.toFixed(2)}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.exportCountry || '')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.exportPpNo || '')}</td>
                <td style="padding:0.35rem 0.45rem; border: 1px solid #9fd7e8;">${escapeHtml(inv.exportPpDate || '')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const totalGrossEl = document.getElementById('vatSalesTotalGross');
    if (totalGrossEl) totalGrossEl.textContent = tGross.toFixed(2);
    const totalNonTaxableEl = document.getElementById('vatSalesTotalNonTaxable');
    if (totalNonTaxableEl) totalNonTaxableEl.textContent = tNonTaxable.toFixed(2);
    const totalTaxableEl = document.getElementById('vatSalesTotalTaxable');
    if (totalTaxableEl) totalTaxableEl.textContent = tTaxable.toFixed(2);
    const totalVatEl = document.getElementById('vatSalesTotalVat');
    if (totalVatEl) totalVatEl.textContent = tVat.toFixed(2);
    const totalExportEl = document.getElementById('vatSalesTotalExport');
    if (totalExportEl) totalExportEl.textContent = tExport.toFixed(2);

    let printDateStr = 'All Dates';
    if (startDate && endDate) {
        const bsStart = getBsDate(startDate);
        const bsEnd = getBsDate(endDate);
        printDateStr = bsStart && bsEnd ? `${startDate} To ${endDate} (${bsStart} To ${bsEnd})` : `${startDate} To ${endDate}`;
    } else if (startDate || endDate) {
        printDateStr = `${startDate || 'Start'} To ${endDate || 'End'}`;
    }

    const division = document.getElementById('vatSalesDivision')?.value || 'DEMO';
    const printInfo = `@As On Dated: ${printDateStr} @Division: ${division}`;
    const headerInfo = document.getElementById('salesRegisterPrintInfo');
    const filterInfo = document.getElementById('salesRegisterFilterInfo');
    const printMetaEl = document.getElementById('salesRegisterPrintInfoPrint');
    if (headerInfo) headerInfo.textContent = printInfo;
    if (filterInfo) filterInfo.textContent = printInfo;
    if (printMetaEl) printMetaEl.textContent = `Vat Sales Register Report ${printInfo}`;
}
window.loadSalesRegisterReport = loadSalesRegisterReport;

let currentPickerMonthIdx = findNepaliMonthIndex(new Date());
if (currentPickerMonthIdx === -1) currentPickerMonthIdx = 11;

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
            const dateStr = actualDate.toLocaleDateString('en-CA');

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

    document.getElementById('dailyStartDate').value = rangeStartDate;
    document.getElementById('dailyEndDate').value = rangeEndDate;

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
    loadDailyReport();
}
window.confirmDateRange = confirmDateRange;

function clearFilterRange() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dailyStartDate').value = today;
    document.getElementById('dailyEndDate').value = today;
    
    // Reset Label to today's Nepali date
    const todayObj = new Date();
    const midx = findNepaliMonthIndex(todayObj);
    if (midx !== -1) {
        const m = nepaliMonthData[midx];
        const day = Math.floor((todayObj.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('filterRangeLabel').textContent = `${m.name} ${day}, ${m.year}`;
    } else {
        document.getElementById('filterRangeLabel').textContent = today;
    }
    
    document.getElementById('filterClearBtn').style.display = 'none';
    rangeStartDate = null;
    rangeEndDate = null;
    loadDailyReport();
}
window.clearFilterRange = clearFilterRange;
