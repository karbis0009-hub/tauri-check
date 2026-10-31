// Analytics Controller for K Pos

let charts = {};
let allSalesData = [];
let inventoryData = []; // Store inventory for cost calculations
let currentPeriod = 'all';
let selectedDate = new Date();

function formatLocalDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function initAnalytics() {
    migrateLocalSales();

    // Set initial date in UI and prevent future dates
    const dateInput = document.getElementById('dashboardDatePicker');
    if (dateInput) {
        const todayStr = formatLocalDate(new Date()); // YYYY-MM-DD format
        dateInput.value = todayStr;
        dateInput.max = todayStr;
        selectedDate = parseLocalDate(todayStr); // Initialize as local midnight
        updateDateText(todayStr);
    }

    loadInitialData();

    // Auto-refresh logic
    window.addEventListener('focus', () => {
        loadInitialData();
    });

    window.addEventListener('themeChanged', () => {
        if (allSalesData.length > 0) {
            updateDashboardView(currentPeriod);
        }
    });
}

function handleDateChange(dateStr) {
    // Force local midnight to avoid timezone shifts
    const safeDateStr = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || '')) ? dateStr : formatLocalDate(new Date(dateStr));
    selectedDate = parseLocalDate(safeDateStr);
    const dateInput = document.getElementById('dashboardDatePicker');
    if (dateInput) dateInput.value = safeDateStr;
    updateDateText(safeDateStr);
    loadDashboardStats();
    updateDashboardView(currentPeriod);
}

function updateDateText(dateStr) {
    const textEl = document.getElementById('selectedDateText');
    if (textEl) {
        const d = parseLocalDate(dateStr);
        if (typeof window.convertToBSFull === 'function') {
            const bsStr = window.convertToBSFull(dateStr + 'T00:00:00');
            if (bsStr) {
                textEl.innerHTML = `${bsStr} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${d.toLocaleDateString()})</span>`;
                return;
            }
        }
        textEl.textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function loadInitialData() {
    // Load both sales and inventory for profit/margin calculations
    Promise.all([
        window.posAPI.getAllSales(),
        window.posAPI.getAllInventory()
    ])
    .then(([sales, inventory]) => {
        allSalesData = sales || [];
        inventoryData = inventory || [];
        loadDashboardStats();
        updateDashboardView(currentPeriod);
    })
    .catch(err => {
        console.error('Failed to load dashboard data:', err);
    });
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

        sales.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        sales.forEach((s, i) => {
            s.billNo = `${i + 1}-082/83`;
        });

        localStorage.setItem('pos_sales', JSON.stringify(sales));
        localStorage.setItem('pos_migration_resequence_v1', 'true');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

function loadDashboardStats() {
    // Rule: Exclude Cancelled/Returned from general statistics
    const sales = allSalesData.filter(s => s.status !== 'CANCELLED' && s.status !== 'RETURNED');

    // Start of the selected day
    const startOfSelected = new Date(selectedDate);
    startOfSelected.setHours(0, 0, 0, 0);

    // End of the selected day
    const endOfSelected = new Date(selectedDate);
    endOfSelected.setHours(23, 59, 59, 999);

    // Daily (On selected date)
    const dailySales = sales.filter(s => {
        const d = new Date(s.timestamp);
        return d >= startOfSelected && d <= endOfSelected;
    });
    const dailyTotal = dailySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

    // Weekly (7 days ending at the end of selected date)
    const oneWeekAgo = new Date(startOfSelected);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6); // 7 days including today
    const weeklySales = sales.filter(s => {
        const d = new Date(s.timestamp);
        return d >= oneWeekAgo && d <= endOfSelected;
    });
    const weeklyTotal = weeklySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

    // Monthly (Based on selected BS month)
    // Compare by BS year+month so it matches Nepali calendar boundaries
    const selectedBSMonth = (typeof window.convertToBS === 'function')
        ? window.convertToBS(startOfSelected).slice(0, 7)  // "YYYY-MM"
        : null;
    const monthlySales = sales.filter(s => {
        const d = new Date(s.timestamp);
        if (selectedBSMonth && typeof window.convertToBS === 'function') {
            const saleBSMonth = window.convertToBS(d).slice(0, 7);
            return saleBSMonth === selectedBSMonth;
        }
        // Fallback: AD month
        return d.getMonth() === startOfSelected.getMonth() && d.getFullYear() === startOfSelected.getFullYear();
    });
    const monthlyTotal = monthlySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    
    // Update DOM for fixed static metrics
    updateElement('todaySales', `Rs. ${dailyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('weeklySales', `Rs. ${weeklyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('monthlySales', `Rs. ${monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    
    // For Total Orders, use the total count from allSalesData to match History
    // "if sale is 113 total order should be 113"
    let maxBillNum = 0;
    allSalesData.forEach(s => {
        const num = parseInt(s.billNo);
        if (!isNaN(num) && num > maxBillNum) maxBillNum = num;
    });
    updateElement('totalOrders', maxBillNum || allSalesData.length);
}

function updateAnalyticsMetrics(periodSales) {
    // Profit & Margin Calculations
    let totalRevenue = 0;
    let totalCost = 0;
    let orderCount = periodSales.length;

    periodSales.forEach(s => {
        totalRevenue += parseFloat(s.total || 0);
        (s.items || []).forEach(item => {
            // Find cost price from inventoryData if not in sale record
            const invItem = inventoryData.find(i => i.id === item.id);
            const cost = invItem ? (parseFloat(invItem.costPrice) || 0) : (parseFloat(item.price) * 0.7);
            totalCost += (cost * (item.qty || 0));
        });
    });

    const grossProfit = totalRevenue - totalCost;
    // Standard Gross Margin % = (Gross Profit / Total Revenue) * 100
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Online Payments for this filtered period
    const onlineSales = periodSales.filter(s => s.paymentMode === 'ESEWA');
    const onlineTotal = onlineSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

    // Due Payments: All-time outstanding credit sales (UNPAID / PARTIAL)
    // This is an account-receivable balance — must span ALL time, not just the selected period
    const dueSales = allSalesData.filter(s =>
        s.paymentMode === 'CREDIT' &&
        (s.status === 'UNPAID' || s.status === 'PARTIAL' || (!s.status && s.paymentMode === 'CREDIT'))
    );
    const dueTotal = dueSales.reduce((sum, s) => {
        const paid = parseFloat(s.amountPaid || 0);
        const total = parseFloat(s.total || 0);
        return sum + (total - paid);
    }, 0);
    const dueCount = dueSales.length;

    updateElement('avgOrderValue', `Rs. ${aov.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('grossProfit', `Rs. ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('grossMargin', `${grossMargin.toFixed(1)}%`);
    updateElement('onlineSales', `Rs. ${onlineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('duePayment', `Rs. ${dueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    updateElement('dueCount', `${dueCount} sale${dueCount !== 1 ? 's' : ''}`);
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Map IDs to periods
const periodMap = {
    'today': 'statToday',
    'weekly': 'statWeekly',
    'monthly': 'statMonthly',
    'all': 'statTotal'
};

function updateDashboardView(period) {
    currentPeriod = period;

    // Update UI active state
    Object.values(periodMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    const activeId = periodMap[period];
    if (activeId) {
        const activeEl = document.getElementById(activeId);
        if (activeEl) activeEl.classList.add('active');
    }

    // Update Recent Transactions Title
    const tableTitle = document.querySelector('.flex-between h3.page-title');
    if (tableTitle) {
        const titles = {
            'today': "Today's Transactions",
            'weekly': "Weekly Transactions",
            'monthly': "Monthly Transactions",
            'all': "Recent Transactions"
        };
        tableTitle.textContent = titles[period];
    }

    // Filter Sales for Transactions & Summary
    // Rule: Exclude Cancelled/Returned from general view
    const activeSales = allSalesData.filter(s => s.status !== 'CANCELLED' && s.status !== 'RETURNED');
    const filteredSales = filterSalesByPeriod(activeSales, period);

    // Update Profit Metrics for the selected period
    updateAnalyticsMetrics(filteredSales);

    // Update Charts & Table
    renderRecentTransactions(filteredSales);
    // Update Revenue Chart dynamically based on the selected period
    renderRevenueChart(activeSales, period);

    // Peak Hours and Best Sellers now use the filtered sales (today, weekly, or monthly)
    renderPeakHoursChart(filteredSales);
    renderBestSellersChart(filteredSales);

    // Product Analytics tables (Top Selling, Least Selling, Revenue Contribution)
    renderProductAnalytics(filteredSales, period);
}

function filterSalesByPeriod(sales, period) {
    const startOfToday = new Date(selectedDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(selectedDate);
    endOfToday.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today':
            return sales.filter(s => {
                const d = new Date(s.timestamp);
                return d >= startOfToday && d <= endOfToday;
            });
        case 'weekly':
            const oneWeekAgo = new Date(startOfToday);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
            return sales.filter(s => {
                const d = new Date(s.timestamp);
                return d >= oneWeekAgo && d <= endOfToday;
            });
        case 'monthly':
            return sales.filter(s => {
                const d = new Date(s.timestamp);
                if (typeof window.convertToBS === 'function') {
                    const saleBSMonth = window.convertToBS(d).slice(0, 7);
                    const selectedBSMonth = window.convertToBS(startOfToday).slice(0, 7);
                    return saleBSMonth === selectedBSMonth;
                }
                // Fallback: AD month
                return d.getMonth() === startOfToday.getMonth() && d.getFullYear() === startOfToday.getFullYear();
            });
        default:
            return sales;
    }
}
function renderRevenueChart(salesToUse, period = 'all') {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    try {
        const sales = (salesToUse || allSalesData).filter(s => s.status !== 'CANCELLED' && s.status !== 'RETURNED');
        const periodLabels = { today: "Today", weekly: "Last 7 Days", monthly: "This Month", all: "All Time" };
        const labelEl = document.getElementById('revenuePeriodLabel');
        if (labelEl) labelEl.textContent = periodLabels[period] || "All Time";

        let labels = [];
        let values = [];

        if (period === 'today') {
            const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
            labels = hours.map(h => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`);
            const hourMap = {};
            hours.forEach(h => hourMap[h] = 0);

            const startOfToday = new Date(selectedDate); startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(selectedDate); endOfToday.setHours(23, 59, 59, 999);

            sales.forEach(sale => {
                const d = new Date(sale.timestamp);
                if (d >= startOfToday && d <= endOfToday) {
                    const h = d.getHours();
                    let closest = hours[0];
                    for (let bh of hours) {
                        if (h >= bh) closest = bh;
                    }
                    hourMap[closest] += parseFloat(sale.total || 0);
                }
            });
            values = hours.map(h => hourMap[h]);
        } else if (period === 'monthly') {
            const daysInMonth = 32;
            const dayValues = Array(daysInMonth).fill(0);
            let currentBSMonth = '';
            if (typeof window.convertToBS === 'function') {
                currentBSMonth = window.convertToBS(selectedDate).slice(0, 7);
            }

            sales.forEach(sale => {
                const d = new Date(sale.timestamp);
                if (typeof window.convertToBS === 'function') {
                    const bs = window.convertToBS(d);
                    if (bs && bs.slice(0, 7) === currentBSMonth) {
                        const dayNum = parseInt(bs.split('-')[2], 10);
                        if (dayNum >= 1 && dayNum <= daysInMonth) {
                            dayValues[dayNum - 1] += parseFloat(sale.total || 0);
                        }
                    }
                } else {
                    if (d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()) {
                        const dayNum = d.getDate();
                        if (dayNum >= 1 && dayNum <= daysInMonth) {
                            dayValues[dayNum - 1] += parseFloat(sale.total || 0);
                        }
                    }
                }
            });
            labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
            values = dayValues;
        } else if (period === 'all') {
            // All Time: Plot across all 12 BS months
            const bsMonthNames = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
            const monthValues = Array(12).fill(0);

            sales.forEach(sale => {
                const d = new Date(sale.timestamp);
                if (typeof window.convertToBS === 'function') {
                    const bs = window.convertToBS(d);
                    if (bs) {
                        const m = parseInt(bs.split('-')[1], 10);
                        if (m >= 1 && m <= 12) {
                            monthValues[m - 1] += parseFloat(sale.total || 0);
                        }
                    }
                } else {
                    const m = d.getMonth();
                    if (m >= 0 && m < 12) {
                        monthValues[m] += parseFloat(sale.total || 0);
                    }
                }
            });
            labels = bsMonthNames;
            values = monthValues;
        } else {
            // Default: Weekly (last 7 days)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - i);
                last7Days.push(d);
            }

            const dataMap = {};
            last7Days.forEach(d => dataMap[d.toDateString()] = 0);

            sales.forEach(sale => {
                const dateKey = new Date(sale.timestamp).toDateString();
                if (dataMap.hasOwnProperty(dateKey)) {
                    dataMap[dateKey] += parseFloat(sale.total || 0);
                }
            });

            labels = last7Days.map(d => {
                if (typeof window.convertToBS === 'function') {
                    const bs = window.convertToBS(d);
                    if (bs) {
                        const parts = bs.split('-');
                        return `${parts[1]}/${parts[2]}`;
                    }
                }
                return `${d.getMonth() + 1}/${d.getDate()}`;
            });
            values = last7Days.map(d => dataMap[d.toDateString()]);
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const accentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#6366f1';
        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#334155';
        const borderLight = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || '#f3f4f6';

        if (charts.revenue) charts.revenue.destroy();
        charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: values,
                    borderColor: accentPrimary,
                    backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                    fill: 'origin',
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: accentPrimary
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Revenue: Rs. ${parseFloat(context.parsed.y || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: borderLight },
                        ticks: {
                            color: textSecondary,
                            callback: function(value) {
                                if (value >= 100000) return (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textSecondary,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering revenue chart:', error);
    }
}

function renderPeakHoursChart(salesToUse) {
    const ctx = document.getElementById('peakHoursChart');
    if (!ctx) return;

    try {
        const sales = salesToUse || allSalesData;
        const hours = Array(24).fill(0);

        sales.forEach(sale => {
            const hour = new Date(sale.timestamp).getHours();
            hours[hour]++;
        });

        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#334155';
        const borderLight = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || '#f3f4f6';

        if (charts.peak) charts.peak.destroy();
        charts.peak = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Orders',
                    data: hours,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: textSecondary },
                        grid: { color: borderLight }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textSecondary }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering peak hours chart:', error);
    }
}
function renderBestSellersChart(salesToUse) {
    const canvas = document.getElementById('bestSellersChart');
    const list = document.getElementById('bestSellersList');
    if (!canvas || !list) return;

    try {
        const sales = salesToUse || allSalesData;
        const productMap = {};

        sales.forEach(sale => {
            let items = sale.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch(e) { items = []; }
            }
            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (!item) return;
                    let name = item.name;
                    let qty = parseFloat(item.qty || item.quantity || 1) || 1;
                    if (!name && typeof item === 'string') {
                        const mName = item.match(/name=([^;]+)/i);
                        const mQty = item.match(/qty=([^;]+)/i);
                        if (mName) name = mName[1].trim();
                        if (mQty) qty = parseFloat(mQty[1]) || 1;
                    }
                    if (name) {
                        productMap[name] = (productMap[name] || 0) + qty;
                    }
                });
            }
        });

        const sorted = Object.entries(productMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            canvas.style.display = 'none';
            list.style.display = 'flex';
            renderBestSellersList(sorted, list);
        } else {
            canvas.style.display = 'block';
            list.style.display = 'none';
            renderBestSellersChartDesktop(sorted, canvas);
        }
    } catch (error) {
        console.error('Error rendering best sellers:', error);
    }
}

function renderBestSellersList(data, container) {
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">No sales in this period</div>`;
        return;
    }
    data.forEach(([name, count]) => {
        const item = document.createElement('div');
        item.className = 'best-seller-item';
        item.innerHTML = `
            <div class="best-seller-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                    <path d="M3 6h18"></path>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
            </div>
            <div class="best-seller-info">
                <span class="best-seller-name">${name}</span>
                <span class="best-seller-count">Qty: ${count}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderBestSellersChartDesktop(data, ctx) {
    if (charts.best) charts.best.destroy();

    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#0f172a';
    const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';

    if (!data || data.length === 0) {
        charts.best = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(148, 163, 184, 0.2)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11 }, color: textMuted }
                    },
                    tooltip: { enabled: false }
                },
                cutout: '70%'
            }
        });
        return;
    }

    const labels = data.map(s => s[0]);
    const values = data.map(s => s[1]);
    const colorPalette = [
        '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
        '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#3b82f6'
    ];

    charts.best = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colorPalette.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 10 }, color: textPrimary }
                }
            },
            cutout: '65%'
        }
    });
}

function renderRecentTransactions(salesToUse) {
    const tbody = document.querySelector('.content-area table tbody');
    if (!tbody) return;

    try {
        const sales = salesToUse || allSalesData;
        const recent = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

        tbody.innerHTML = '';
        recent.forEach(sale => {
            const date = new Date(sale.timestamp);
            const tr = document.createElement('tr');
            const isCredit = sale.paymentMode === 'CREDIT';
            let statusLabel = sale.status || (isCredit ? 'CREDIT' : 'PAID');
            let badgeClass = 'badge-success';
            if (sale.status === 'CANCELLED') badgeClass = 'badge-danger';
            if (sale.status === 'RETURNED') badgeClass = 'badge-warning';
            if (isCredit && sale.status === 'UNPAID') badgeClass = 'badge-warning';

            tr.innerHTML = `
                <td>#${sale.billNo}</td>
                <td>${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${sale.customer}</td>
                <td>Rs. ${parseFloat(sale.total || 0).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error rendering recent transactions:', error);
    }
}

// ─── Product Analytics ───────────────────────────────────────────────────────

const NO_RECORDS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 0.5rem;opacity:0.3;"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

function renderProductAnalytics(filteredSales, period) {
    // Period label text
    const periodLabels = { today: "Today", weekly: "Last 7 Days", monthly: "This Month", all: "All Time" };
    const labelText = periodLabels[period] || "All Time";
    ['topSellingPeriodLabel', 'leastSellingPeriodLabel', 'revenueContribPeriodLabel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = labelText;
    });

    // Build product map: { name -> { qty, amount } }
    const productMap = {};
    filteredSales.forEach(sale => {
        (sale.items || []).forEach(item => {
            const name = item.name || 'Unknown';
            if (!productMap[name]) productMap[name] = { qty: 0, amount: 0 };
            productMap[name].qty   += parseFloat(item.qty   || 0);
            productMap[name].amount += parseFloat(item.qty || 0) * parseFloat(item.price || 0);
        });
    });

    const products = Object.entries(productMap).map(([name, d]) => ({ name, qty: d.qty, amount: d.amount }));
    const totalRevenue = products.reduce((s, p) => s + p.amount, 0);

    // Top Selling – sorted by qty desc, top 10
    const top = [...products].sort((a, b) => b.qty - a.qty).slice(0, 10);
    renderProductTable('topSellingBody', top, 3);

    // Least Selling – sorted by qty asc, top 10
    const least = [...products].sort((a, b) => a.qty - b.qty).slice(0, 10);
    renderProductTable('leastSellingBody', least, 3);

    // Revenue Contribution – sorted by amount desc, all products
    const contrib = [...products].sort((a, b) => b.amount - a.amount);
    renderRevenueContrib('revenueContribBody', contrib, totalRevenue);
}

function renderProductTable(tbodyId, products, colspan) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:2.5rem;color:var(--text-muted);font-size:0.82rem;">${NO_RECORDS_SVG}No records</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map((p, i) => `
        <tr style="border-bottom:1px solid var(--border-light); transition: background 0.15s;" 
            onmouseover="this.style.background='rgba(var(--accent-primary-rgb),0.04)'" 
            onmouseout="this.style.background=''">
            <td style="padding:0.65rem 1.25rem; font-size:0.85rem; font-weight:500; color:var(--text-primary);">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                    <span style="min-width:20px; height:20px; border-radius:50%; background:${i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c2f':'rgba(var(--accent-primary-rgb),0.1)'}; color:${i<3?'#fff':'var(--text-muted)'}; font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">${i+1}</span>
                    <span>${p.name}</span>
                </div>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:right; font-size:0.85rem; color:var(--text-secondary);">${parseFloat(p.qty).toFixed(2)}</td>
            <td style="padding:0.65rem 1.25rem 0.65rem 0.75rem; text-align:right; font-size:0.85rem; font-weight:600; color:var(--text-primary);">Rs. ${p.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        </tr>
    `).join('');
}

function renderRevenueContrib(tbodyId, products, totalRevenue) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2.5rem;color:var(--text-muted);font-size:0.82rem;">${NO_RECORDS_SVG}No records</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map((p, i) => {
        const pct = totalRevenue > 0 ? (p.amount / totalRevenue) * 100 : 0;
        const barColor = pct > 50 ? '#10b981' : pct > 20 ? '#6366f1' : pct > 10 ? '#f59e0b' : '#94a3b8';
        return `
        <tr style="border-bottom:1px solid var(--border-light); transition: background 0.15s;"
            onmouseover="this.style.background='rgba(var(--accent-primary-rgb),0.04)'" 
            onmouseout="this.style.background=''">
            <td style="padding:0.65rem 1.25rem; font-size:0.85rem; font-weight:500; color:var(--text-primary);">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                    <span style="min-width:20px; height:20px; border-radius:50%; background:rgba(var(--accent-primary-rgb),0.1); color:var(--text-muted); font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center;">${i+1}</span>
                    ${p.name}
                </div>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:right; font-size:0.85rem; color:var(--text-secondary);">${parseFloat(p.qty).toFixed(2)}</td>
            <td style="padding:0.65rem 0.75rem; text-align:right; font-size:0.85rem; font-weight:600; color:var(--text-primary);">Rs. ${p.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="padding:0.65rem 1.25rem 0.65rem 0.75rem; text-align:right;">
                <div style="display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">
                    <div style="width:70px; height:6px; border-radius:3px; background:var(--border-light); overflow:hidden;">
                        <div style="width:${Math.min(pct,100).toFixed(1)}%; height:100%; background:${barColor}; border-radius:3px; transition:width 0.4s ease;"></div>
                    </div>
                    <span style="font-size:0.82rem; font-weight:600; color:${barColor}; min-width:38px; text-align:right;">${pct.toFixed(1)}%</span>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────

// Auto-init if we are on dashboard
if (document.getElementById('revenueChart')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }
}

window.updateDashboardView = updateDashboardView;

// Re-render on resize to handle mobile/desktop view switches
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        loadDashboardStats();
        // Force re-render of current view
        updateDashboardView(currentPeriod);
    }, 250);
});
