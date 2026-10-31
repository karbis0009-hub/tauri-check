// Payroll Management System

const STORAGE_PAYROLL_KEY = 'pos_payroll';
let payrollData = [];

function initPayroll() {
    loadPayroll();
    // Event Listeners
    if (document.getElementById('payrollSearch')) {
        document.getElementById('payrollSearch').addEventListener('input', (e) => {
            applyFilters();
        });
    }

    if (document.getElementById('dateFilterStart')) {
        document.getElementById('dateFilterStart').addEventListener('change', applyFilters);
    }
    if (document.getElementById('dateFilterEnd')) {
        document.getElementById('dateFilterEnd').addEventListener('change', applyFilters);
    }

    renderPayrollTable();
}

function loadPayroll() {
    const stored = localStorage.getItem(STORAGE_PAYROLL_KEY);
    if (stored) {
        payrollData = JSON.parse(stored);
    } else {
        // Dummy data for demonstration
        payrollData = [
            { id: '1', employee: 'Chris', position: 'Waiter', salary: 1325.16, days: 26, total: 1148.47, paymentDate: '2023-07', status: 'Paid' },
            { id: '2', employee: 'Jenny', position: 'Waiter', salary: 1325.16, days: 25, total: 1104.30, paymentDate: '2023-07', status: 'Pending' },
            { id: '3', employee: 'Leon', position: 'Waiter', salary: 1325.16, days: 28, total: 1236.82, paymentDate: '2023-07', status: 'Paid' }
        ];
        savePayroll();
    }
}

function savePayroll() {
    localStorage.setItem(STORAGE_PAYROLL_KEY, JSON.stringify(payrollData));
}

function applyFilters() {
    const search = document.getElementById('payrollSearch').value;
    const start = document.getElementById('dateFilterStart').value;
    const end = document.getElementById('dateFilterEnd').value;
    renderPayrollTable(search, start, end);
}

function renderPayrollTable(filter = '', startDate = '', endDate = '') {
    const tbody = document.getElementById('payroll-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    const term = filter.toLowerCase();
    let filtered = payrollData.filter(p =>
        (p.employee || '').toLowerCase().includes(term) ||
        (p.position || '').toLowerCase().includes(term)
    );

    if (startDate) {
        filtered = filtered.filter(p => p.paymentDate >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(p => p.paymentDate <= endDate);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No records found.</td></tr>';
        return;
    }

    // Sort by employee name to group them
    filtered.sort((a, b) => (a.employee || '').localeCompare(b.employee || ''));

    let currentEmployee = '';
    let subTotal = 0;
    let employeeRecordsCount = 0;

    filtered.forEach((item, index) => {
        // If employee changed and it's not the first one, show subtotal of previous employee
        if (currentEmployee !== '' && item.employee !== currentEmployee) {
            if (employeeRecordsCount > 1) {
                renderSubTotalRow(tbody, currentEmployee, subTotal);
            }
            subTotal = 0;
            employeeRecordsCount = 0;
        }

        currentEmployee = item.employee;
        subTotal += parseFloat(item.total || 0);
        employeeRecordsCount++;

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';

        const statusBadge = item.status === 'Paid'
            ? '<span class="badge badge-success">Paid</span>'
            : '<span class="badge badge-warning">Pending</span>';

        tr.innerHTML = `
            <td style="padding: 1rem; font-weight: 500;">${item.employee}</td>
            <td style="padding: 1rem; color: var(--text-secondary);">${item.position || '-'}</td>
            <td style="padding: 1rem;">Rs. ${parseFloat(item.salary || 0).toFixed(2)}</td>
            <td style="padding: 1rem; color: var(--text-secondary);">${item.days || '0'}</td>
            <td style="padding: 1rem; text-align: left;">${item.paymentDate || '-'}</td>
            <td style="padding: 1rem; text-align: right; font-weight: 600;">Rs. ${parseFloat(item.total || 0).toFixed(2)}</td>
            <td style="padding: 1rem; text-align: center;">${statusBadge}</td>
            <td style="padding: 1rem; text-align: right;">
                <button class="btn btn-secondary" onclick="prepareNextMonth('${item.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem; background: var(--bg-main); border: 1px solid var(--accent-primary); color: var(--accent-primary);">Next</button>
                <button class="btn btn-secondary" onclick="editPayroll('${item.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem;">Edit</button>
                <button class="btn btn-danger" onclick="deletePayroll('${item.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Del</button>
            </td>
        `;
        tbody.appendChild(tr);

        // Final subtotal for the last employee
        if (index === filtered.length - 1) {
            if (employeeRecordsCount > 1) {
                renderSubTotalRow(tbody, currentEmployee, subTotal);
            }
        }
    });

    updateTotals(filtered);
}

function renderSubTotalRow(tbody, employee, total) {
    const tr = document.createElement('tr');
    tr.style.background = 'rgba(var(--accent-primary-rgb), 0.03)';
    tr.style.fontSize = '0.9rem';
    tr.style.fontWeight = '600';
    tr.innerHTML = `
        <td colspan="5" style="padding: 0.5rem 1rem; text-align: right; color: var(--text-secondary);">${employee} Subtotal</td>
        <td style="padding: 0.5rem 1rem; text-align: right; border-bottom: 2px solid var(--accent-primary);">Rs. ${total.toFixed(2)}</td>
        <td colspan="2"></td>
    `;
    tbody.appendChild(tr);
}

function updateTotals(data) {
    const totalAmount = data.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const footerTotal = document.getElementById('footerTotal');
    if (footerTotal) footerTotal.textContent = `Rs. ${totalAmount.toFixed(2)}`;
}

// Modal Logic
let currentEditId = null;
let sourceRecordId = null;

function openPayrollModal(id = null) {
    const modal = document.getElementById('payrollModal');
    const form = document.getElementById('payrollForm');

    if (id) {
        const item = payrollData.find(p => p.id === id);
        if (!item) return;

        currentEditId = id;
        sourceRecordId = null;
        document.getElementById('modalTitle').textContent = 'Edit Payroll Record';

        document.getElementById('payEmployee').value = item.employee;
        document.getElementById('payPosition').value = item.position || '';
        document.getElementById('paySalary').value = item.salary || '';
        document.getElementById('payDays').value = item.days || '';
        document.getElementById('payTotal').value = item.total || '';
        document.getElementById('payStatus').value = item.status || 'Pending';
        document.getElementById('payDate').value = item.paymentDate || '';
    } else {
        currentEditId = null;
        sourceRecordId = null;
        document.getElementById('modalTitle').textContent = 'Add Payroll Record';
        // Reset form manually
        document.getElementById('payEmployee').value = '';
        document.getElementById('payPosition').value = '';
        document.getElementById('paySalary').value = '';
        document.getElementById('payDays').value = '';
        document.getElementById('payTotal').value = '';
        document.getElementById('payStatus').value = 'Pending';
        document.getElementById('payDate').value = ''; // Reset range
    }

    modal.classList.add('active');
}

function closePayrollModal() {
    const modal = document.getElementById('payrollModal');
    if (modal) modal.classList.remove('active');
}

function savePayrollRecord() {
    const employee = document.getElementById('payEmployee').value;
    const position = document.getElementById('payPosition').value;
    const salary = parseFloat(document.getElementById('paySalary').value) || 0;
    const days = parseInt(document.getElementById('payDays').value) || 0;
    const total = parseFloat(document.getElementById('payTotal').value) || 0;
    const status = document.getElementById('payStatus').value;
    const paymentDate = document.getElementById('payDate').value;

    if (!employee) {
        alert('Employee Name is required.');
        return;
    }

    const record = {
        id: currentEditId || Date.now().toString(),
        employee,
        position,
        salary,
        days,
        total,
        status,
        paymentDate
    };

    if (currentEditId) {
        const index = payrollData.findIndex(p => p.id === currentEditId);
        if (index !== -1) {
            payrollData[index] = record;
        }
    } else if (sourceRecordId) {
        // Insert directly after the source record for grouping
        const index = payrollData.findIndex(p => p.id === sourceRecordId);
        if (index !== -1) {
            payrollData.splice(index + 1, 0, record);
        } else {
            payrollData.push(record);
        }
        sourceRecordId = null; // Reset
    } else {
        payrollData.push(record);
    }

    savePayroll();
    applyFilters();
    closePayrollModal();
}

function editPayroll(id) {
    openPayrollModal(id);
}

function deletePayroll(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        payrollData = payrollData.filter(p => p.id !== id);
        savePayroll();
        renderPayrollTable();
    }
}

function calculatePayrollTotal() {
    const salary = parseFloat(document.getElementById('paySalary').value) || 0;
    const days = parseFloat(document.getElementById('payDays').value) || 0;

    // Assuming 30 days month for simplicity or just daily rate.
    // If Salary is monthly rate, and we want to pay based on days worked:
    // Total = (Salary / 30) * Days

    if (salary > 0 && days > 0) {
        const total = (salary / 30) * days;
        document.getElementById('payTotal').value = total.toFixed(2);
    }
}

function prepareNextMonth(id) {
    const item = payrollData.find(p => p.id === id);
    if (!item) return;

    // Open ritual Add Modal
    openPayrollModal();
    sourceRecordId = id; // Set source for save location logic

    // Set title and pre-fill fields
    document.getElementById('modalTitle').textContent = `New Record: ${item.employee}`;
    document.getElementById('payEmployee').value = item.employee;
    document.getElementById('payPosition').value = item.position || '';
    document.getElementById('paySalary').value = item.salary || '';

    // Clear period-specific fields
    document.getElementById('payDate').value = '';
    document.getElementById('payDays').value = '';
    document.getElementById('payTotal').value = '';
    document.getElementById('payStatus').value = 'Pending';
}

function toNepaliDigits(num) {
    const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return num.toString().split('').map(d => devanagariDigits[parseInt(d)]).join('');
}

// Date Piker Modal Logic (Dual Calendar)
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
    return 11; // Default to Falgun 2082 if out of range for demo
}

let currentPickerMonthIdx = findNepaliMonthIndex(new Date());
let rangeStartDate = null;
let rangeEndDate = null;
let pickerFilterMode = false; // true = filter bar, false = payroll form

function openFilterPicker() {
    pickerFilterMode = true;
    rangeStartDate = null;
    rangeEndDate = null;
    openRangePicker();
}

function clearFilterRange() {
    document.getElementById('dateFilterStart').value = '';
    document.getElementById('dateFilterEnd').value = '';
    document.getElementById('filterRangeLabel').textContent = 'All Dates';
    document.getElementById('filterClearBtn').style.display = 'none';
    applyFilters();
}

function openRangePicker() {
    const modal = document.getElementById('dateRangeModal');
    if (modal) {
        modal.classList.add('active');
        renderPickerCalendar();
    }
}

function closeRangePicker() {
    const modal = document.getElementById('dateRangeModal');
    if (modal) modal.classList.remove('active');
}

function renderPickerCalendar() {
    const container = document.getElementById('pickerCalendarContainer');
    if (!container) return;

    let html = '';
    const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Render 2 Months: starting from currentPickerMonthIdx
    for (let i = 0; i < 2; i++) {
        const idx = currentPickerMonthIdx + i;
        if (idx >= nepaliMonthData.length) break;

        const mData = nepaliMonthData[idx];
        const englishYear = mData.start.getFullYear();
        const startMonthIdx = mData.start.getMonth();
        const endMonthIdx = (startMonthIdx + 1) % 12;
        const monthRangeIndication = `${shortMonthNames[startMonthIdx]}/${shortMonthNames[endMonthIdx]}`;

        html += `<div style="flex: 1 1 350px; min-width: 350px;">`;
        html += `
            <div style="font-weight: 700; text-align: center; margin-bottom: 1rem; color: var(--text-primary);">
                <span style="font-size: 1.2rem; display: block;">${mData.name} ${mData.year}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">/ ${monthRangeIndication} ${englishYear}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;">
                <div class="cal-header-cell" style="font-size: 0.8rem;">Su</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">Mo</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">Tu</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">We</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">Th</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">Fr</div>
                <div class="cal-header-cell" style="font-size: 0.8rem;">Sa</div>
        `;

        const startDayOfWeek = mData.start.getDay();

        // Empty cells until the first of the month
        for (let j = 0; j < startDayOfWeek; j++) {
            html += `<div class="empty"></div>`;
        }

        for (let d = 1; d <= mData.length; d++) {
            // Calculate actual English date for this BS day
            const actualDate = new Date(mData.start);
            actualDate.setDate(mData.start.getDate() + (d - 1));
            const dateStr = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}-${String(actualDate.getDate()).padStart(2, '0')}`;

            let classes = 'cal-cell clickable';

            // Range Logic
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

        if (i === 0) {
            html += `<div style="width: 1px; background: var(--border-light); margin: 0 1.5rem;"></div>`;
        }
    }

    container.innerHTML = html;
    updateRangeInfo();
}

function changePickerMonth(offset) {
    currentPickerMonthIdx = Math.max(0, Math.min(nepaliMonthData.length - 2, currentPickerMonthIdx + offset));
    renderPickerCalendar();
}

function handleDateClick(dateStr) {
    if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
        // Start new selection
        rangeStartDate = dateStr;
        rangeEndDate = null;
    } else {
        // Evaluate
        if (dateStr < rangeStartDate) {
            rangeEndDate = rangeStartDate;
            rangeStartDate = dateStr;
        } else {
            rangeEndDate = dateStr;
        }
    }
    renderPickerCalendar();
}

function updateRangeInfo() {
    const info = document.getElementById('rangeSelectionInfo');
    if (!rangeStartDate) info.textContent = "Select start date";
    else if (!rangeEndDate) info.textContent = `Start: ${rangeStartDate} - Select end date`;
    else {
        const d1 = new Date(rangeStartDate);
        const d2 = new Date(rangeEndDate);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        info.textContent = `${rangeStartDate} to ${rangeEndDate} (${diffDays} days)`;
    }
}

function confirmDateRange() {
    if (!rangeStartDate) return;
    if (!rangeEndDate) rangeEndDate = rangeStartDate;

    const d1 = new Date(rangeStartDate);
    const d2 = new Date(rangeEndDate);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // BS Calculation
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

    if (pickerFilterMode) {
        document.getElementById('dateFilterStart').value = rangeStartDate;
        document.getElementById('dateFilterEnd').value = rangeEndDate;
        document.getElementById('filterRangeLabel').textContent = bsDisplay || `${rangeStartDate} - ${rangeEndDate}`;
        document.getElementById('filterClearBtn').style.display = 'flex';
        pickerFilterMode = false;
        closeRangePicker();
        applyFilters();
    } else {
        const finalDisplay = bsDisplay ? `${bsDisplay} (${rangeStartDate} to ${rangeEndDate})` : `${rangeStartDate} to ${rangeEndDate}`;
        document.getElementById('payDate').value = finalDisplay;
        document.getElementById('payDays').value = diffDays;
        calculatePayrollTotal();
        closeRangePicker();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPayroll();
});

// Expose globally
window.openPayrollModal = openPayrollModal;
window.closePayrollModal = closePayrollModal;
window.savePayrollRecord = savePayrollRecord;
window.editPayroll = editPayroll;
window.deletePayroll = deletePayroll;
window.calculatePayrollTotal = calculatePayrollTotal;

window.openRangePicker = openRangePicker;
window.openFilterPicker = openFilterPicker;
window.clearFilterRange = clearFilterRange;
window.closeRangePicker = closeRangePicker;
window.changePickerMonth = changePickerMonth;
window.handleDateClick = handleDateClick;
window.confirmDateRange = confirmDateRange;
window.prepareNextMonth = prepareNextMonth;






document.addEventListener("DOMContentLoaded", () => {
    const rowHeight = 46; // Must match --picker-row-h in CSS exactly
    const container = document.getElementById("singleTimerContainer");

    if (!container) return;

    const hrStrip = container.querySelector(".hours-track .picker-inner-strip");
    const minStrip = container.querySelector(".minutes-track .picker-inner-strip");
    const hiddenInput = document.getElementById("deliveryAlertTime");

    // 1. Generate standard numerical option elements programmatically
    for (let h = 1; h <= 12; h++) {
        const val = h.toString().padStart(2, '0');
        hrStrip.insertAdjacentHTML('beforeend', `<div class="picker-cell">${val}</div>`);
    }

    for (let m = 0; m < 60; m++) {
        const val = m.toString().padStart(2, '0');
        minStrip.insertAdjacentHTML('beforeend', `<div class="picker-cell">${val}</div>`);
    }

    const tracks = container.querySelectorAll(".picker-track-column");

    // 2. Track scrolling states for active center highlights
    tracks.forEach(track => {
        track.addEventListener("scroll", () => {
            const index = Math.round(track.scrollTop / rowHeight);
            const cells = track.querySelectorAll(".picker-cell");

            cells.forEach((cell, i) => {
                if (i === index) {
                    cell.classList.add("selected");
                } else {
                    cell.classList.remove("selected");
                }
            });

            updateValuePipeline();
        });

        // Make elements slide when clicked directly
        track.addEventListener("click", (e) => {
            if (e.target.classList.contains("picker-cell")) {
                const cells = Array.from(track.querySelectorAll(".picker-cell"));
                const targetIndex = cells.indexOf(e.target);
                track.scrollTo({ top: targetIndex * rowHeight, behavior: 'smooth' });
            }
        });
    });

    // 3. Map selected UI elements back to standard 24H time format string
    function updateValuePipeline() {
        const ampm = container.querySelector(".ampm-track .selected")?.textContent || "AM";
        let hr = parseInt(container.querySelector(".hours-track .selected")?.textContent || "12");
        const min = container.querySelector(".minutes-track .selected")?.textContent || "00";

        if (ampm === "PM" && hr !== 12) hr += 12;
        if (ampm === "AM" && hr === 12) hr = 0;

        hiddenInput.value = `${hr.toString().padStart(2, '0')}:${min}`;
    }

    // 4. Initialize wheel items into position targets: 04:02 PM
    setTimeout(() => {
        const ampmTrack = container.querySelector(".ampm-track");
        const hrTrack = container.querySelector(".hours-track");
        const minTrack = container.querySelector(".minutes-track");

        ampmTrack.scrollTop = rowHeight;            // Index 1 = PM
        hrTrack.scrollTop = (4 - 1) * rowHeight;    // Index 3 = 04
        minTrack.scrollTop = 2 * rowHeight;         // Index 2 = 02
    }, 150);
});




// Payroll delivery alerts
(function () {
    'use strict';

    var deliveryAlerts = [];
    try { deliveryAlerts = JSON.parse(localStorage.getItem('pos_alerts') || '[]'); } catch (e) { deliveryAlerts = []; }
    var deliveryDateMode = 'AD';
    var deliveryAudioCtx = null;
    var deliveryAlarmInterval = null;
    var deliveryFiringId = null;
    var deliveryCountdownInterval = null;
    var deliveryNextAlarmTimer = null;
    var maxDeliveryTimerDelay = 60 * 60 * 1000;

    var deliveryBsMonths = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    var deliveryAdMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var deliveryBsData = {
        2081: ['2024-04-13', '2024-05-14', '2024-06-15', '2024-07-16', '2024-08-16', '2024-09-17', '2024-10-17', '2024-11-16', '2024-12-15', '2025-01-14', '2025-02-12', '2025-03-14'],
        2082: ['2025-04-14', '2025-05-15', '2025-06-15', '2025-07-16', '2025-08-17', '2025-09-17', '2025-10-17', '2025-11-16', '2025-12-15', '2026-01-14', '2026-02-13', '2026-03-14'],
        2083: ['2026-04-14', '2026-05-15', '2026-06-15', '2026-07-16', '2026-08-17', '2026-09-17', '2026-10-17', '2026-11-16', '2026-12-15', '2027-01-14', '2027-02-13', '2027-03-14']
    };

    function saveDeliveryAlerts() {
        localStorage.setItem('pos_alerts', JSON.stringify(deliveryAlerts));
        scheduleNextDeliveryAlarm();
        if (typeof window.checkStockAlerts === 'function') window.checkStockAlerts();
    }

    function deliveryBsToAd(bsYear, bsMonth, bsDay) {
        const data = deliveryBsData[bsYear];
        if (!data) return new Date(bsYear - 57, bsMonth - 1, bsDay);
        const date = new Date(data[bsMonth - 1]);
        date.setDate(date.getDate() + bsDay - 1);
        return date;
    }

    function deliveryAdToBs(adDate) {
        const entries = Object.entries(deliveryBsData).reverse();
        for (const [year, starts] of entries) {
            for (let month = 11; month >= 0; month--) {
                const start = new Date(starts[month]);
                if (adDate >= start) {
                    const diff = Math.floor((adDate - start) / 86400000);
                    return { year: parseInt(year, 10), month: month + 1, day: diff + 1 };
                }
            }
        }
        return { year: adDate.getFullYear() + 57, month: adDate.getMonth() + 1, day: adDate.getDate() };
    }

    function formatDeliveryBs(date) { return date ? date.day + ' ' + deliveryBsMonths[date.month - 1] + ' ' + date.year + ' BS' : ''; }
    function formatDeliveryAd(date) { return date.getDate() + ' ' + deliveryAdMonths[date.getMonth()] + ' ' + date.getFullYear() + ' AD'; }

    function setDeliveryDateMode(mode) {
        deliveryDateMode = mode;
        document.getElementById('deliveryDateModeAd')?.classList.toggle('active', mode === 'AD');
        document.getElementById('deliveryDateModeBs')?.classList.toggle('active', mode === 'BS');
        const ad = document.getElementById('deliveryAdInputs');
        const bs = document.getElementById('deliveryBsInputs');
        if (ad) ad.style.display = mode === 'AD' ? '' : 'none';
        if (bs) bs.style.display = mode === 'BS' ? '' : 'none';
        updateDeliveryDateHint();
    }

    function updateDeliveryDateHint() {
        const hint = document.getElementById('deliveryDateHint');
        if (!hint) return;
        hint.textContent = '';
        try {
            if (deliveryDateMode === 'BS') {
                const year = parseInt(document.getElementById('deliveryBsYear').value, 10);
                const month = parseInt(document.getElementById('deliveryBsMonth').value, 10);
                const day = parseInt(document.getElementById('deliveryBsDay').value, 10);
                if (year && month && day) hint.textContent = 'AD date: ' + formatDeliveryAd(deliveryBsToAd(year, month, day));
            } else {
                const year = parseInt(document.getElementById('deliveryAdYear').value, 10);
                const month = parseInt(document.getElementById('deliveryAdMonth').value, 10);
                const day = parseInt(document.getElementById('deliveryAdDay').value, 10);
                if (year && month && day) hint.textContent = 'BS date: ' + formatDeliveryBs(deliveryAdToBs(new Date(year, month - 1, day)));
            }
        } catch (e) { hint.textContent = ''; }
    }

    function initDeliveryAlertDates() {
        const now = new Date();
        const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
        setVal('deliveryAdYear', now.getFullYear());
        setVal('deliveryAdMonth', now.getMonth() + 1);
        setVal('deliveryAdDay', now.getDate());
        const bs = deliveryAdToBs(now);
        setVal('deliveryBsYear', bs.year);
        setVal('deliveryBsMonth', bs.month);
        setVal('deliveryBsDay', bs.day);
        ['deliveryBsYear', 'deliveryBsMonth', 'deliveryBsDay', 'deliveryAdYear', 'deliveryAdMonth', 'deliveryAdDay'].forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.deliveryBound) return;
            el.dataset.deliveryBound = '1';
            el.addEventListener('input', updateDeliveryDateHint);
            el.addEventListener('change', updateDeliveryDateHint);
        });
        updateDeliveryDateHint();
    }

    function initDeliveryTimePicker() {
        const input = document.getElementById('deliveryAlertTime');
        const hourStrip = document.querySelector('.hours-track .picker-inner-strip');
        const minuteStrip = document.querySelector('.minutes-track .picker-inner-strip');
        const ampmStrip = document.querySelector('.ampm-track .picker-inner-strip');
        if (!input || !hourStrip || !minuteStrip || !ampmStrip) return;
        hourStrip.innerHTML = Array.from({ length: 12 }, (_, i) => '<div class="picker-cell" data-value="' + String(i + 1).padStart(2, '0') + '">' + String(i + 1).padStart(2, '0') + '</div>').join('');
        minuteStrip.innerHTML = Array.from({ length: 60 }, (_, i) => '<div class="picker-cell" data-value="' + String(i).padStart(2, '0') + '">' + String(i).padStart(2, '0') + '</div>').join('');
        function applyTime(hour12, minute, period) {
            let hour24 = parseInt(hour12, 10);
            if (period === 'PM' && hour24 !== 12) hour24 += 12;
            if (period === 'AM' && hour24 === 12) hour24 = 0;
            input.value = String(hour24).padStart(2, '0') + ':' + String(parseInt(minute, 10)).padStart(2, '0');
            hourStrip.querySelectorAll('.picker-cell').forEach(cell => cell.classList.toggle('selected', cell.dataset.value === String(hour12).padStart(2, '0')));
            minuteStrip.querySelectorAll('.picker-cell').forEach(cell => cell.classList.toggle('selected', cell.dataset.value === String(minute).padStart(2, '0')));
            ampmStrip.querySelectorAll('.picker-cell').forEach(cell => cell.classList.toggle('selected', cell.textContent.trim() === period));
        }
        function currentParts() {
            const [hourText = '10', minuteText = '00'] = (input.value || '10:00').split(':');
            const hour24 = parseInt(hourText, 10) || 0;
            const period = hour24 >= 12 ? 'PM' : 'AM';
            return { hour: String(hour24 % 12 || 12).padStart(2, '0'), minute: String(parseInt(minuteText, 10) || 0).padStart(2, '0'), period };
        }
        function bind(strip, onPick) { strip.querySelectorAll('.picker-cell').forEach(cell => cell.addEventListener('click', () => onPick(cell, currentParts()))); }
        bind(hourStrip, (cell, parts) => applyTime(cell.dataset.value, parts.minute, parts.period));
        bind(minuteStrip, (cell, parts) => applyTime(parts.hour, cell.dataset.value, parts.period));
        bind(ampmStrip, (cell, parts) => applyTime(parts.hour, parts.minute, cell.textContent.trim()));
        const parts = currentParts();
        applyTime(parts.hour, parts.minute, parts.period);
    }

    function switchDeliveryAlertView(view) {
        const showList = view === 'list';
        document.getElementById('deliveryAlertAddPanel')?.classList.toggle('active', !showList);
        document.getElementById('deliveryAlertListPanel')?.classList.toggle('active', showList);
        document.getElementById('deliveryAlertAddBtn')?.classList.toggle('active', !showList);
        document.getElementById('deliveryAlertListBtn')?.classList.toggle('active', showList);
        if (showList) renderDeliveryAlerts();
    }

    function addDeliveryAlert() {
        const value = id => document.getElementById(id)?.value || '';
        const name = value('deliveryCustomerName').trim();
        const phone = value('deliveryCustomerPhone').trim();
        const item = value('deliveryItemName').trim();
        const amount = value('deliveryAmountPaid');
        const area = value('deliveryArea').trim();
        const time = value('deliveryAlertTime');
        const note = value('deliveryAlertNote').trim();
        if (!name || !item || !area || !time) { alert('Please fill customer name, item, delivery area, and time.'); return; }
        let adDate;
        let bsDate;
        if (deliveryDateMode === 'AD') {
            const year = parseInt(value('deliveryAdYear'), 10);
            const month = parseInt(value('deliveryAdMonth'), 10);
            const day = parseInt(value('deliveryAdDay'), 10);
            if (!year || !month || !day) { alert('Please fill the delivery date.'); return; }
            adDate = new Date(year, month - 1, day);
            bsDate = deliveryAdToBs(adDate);
        } else {
            const year = parseInt(value('deliveryBsYear'), 10);
            const month = parseInt(value('deliveryBsMonth'), 10);
            const day = parseInt(value('deliveryBsDay'), 10);
            if (!year || !month || !day) { alert('Please fill the BS delivery date.'); return; }
            adDate = deliveryBsToAd(year, month, day);
            bsDate = { year, month, day };
        }
        const [hours, minutes] = time.split(':').map(Number);
        const fireAt = new Date(adDate);
        fireAt.setHours(hours, minutes, 0, 0);
        deliveryAlerts.push({ id: Date.now(), name, phone, item, amount: parseFloat(amount) || 0, area, note, adDateStr: adDate.toISOString().split('T')[0], bsDate, time, fireAt: fireAt.toISOString(), status: 'pending' });
        saveDeliveryAlerts();
        ['deliveryCustomerName', 'deliveryCustomerPhone', 'deliveryItemName', 'deliveryAmountPaid', 'deliveryArea', 'deliveryAlertNote'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        switchDeliveryAlertView('list');
    }

    function deliveryTimeRemaining(ms) {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        if (seconds < 60) return seconds + 's';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ' + (seconds % 60) + 's';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ' + (minutes % 60) + 'm ' + (seconds % 60) + 's';
        const days = Math.floor(hours / 24);
        return days + 'd ' + (hours % 24) + 'h ' + (minutes % 60) + 'm ' + (seconds % 60) + 's';
    }

    function renderDeliveryAlerts() {
        const list = document.getElementById('deliveryAlertsList');
        const metrics = document.getElementById('deliveryAlertMetrics');
        const pendingCount = document.getElementById('deliveryPendingCount');
        if (!list || !metrics) return;
        const pending = deliveryAlerts.filter(a => a.status === 'pending').length;
        const firing = deliveryAlerts.filter(a => a.status === 'firing').length;
        const done = deliveryAlerts.filter(a => a.status === 'done').length;
        if (pendingCount) pendingCount.textContent = pending ? '(' + pending + ')' : '';
        metrics.innerHTML = [['Total', deliveryAlerts.length], ['Pending', pending], ['Firing', firing], ['Done', done]].map(([label, value]) => '<div class="metric"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div></div>').join('');
        if (!deliveryAlerts.length) { list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:2rem 1rem;">No alerts yet. Add one from the New Alert tab.</div>'; return; }
        const now = new Date();
        list.innerHTML = [...deliveryAlerts].sort((a, b) => new Date(a.fireAt) - new Date(b.fireAt)).map(alertItem => {
            const fire = new Date(alertItem.fireAt);
            const diff = fire - now;
            const isPast = diff < 0;
            const status = alertItem.status;
            const badge = status === 'firing' ? 'Ringing' : status === 'done' ? 'Done' : isPast ? 'Overdue' : 'Pending';
            const countdown = status === 'pending' ? '<div style="color:' + (isPast ? '#ef4444' : '#f59e0b') + ';font-weight:700;margin-top:0.35rem;">' + (isPast ? 'Overdue by ' + deliveryTimeRemaining(-diff) : 'Fires in ' + deliveryTimeRemaining(diff)) + '</div>' : '';
            const bs = alertItem.bsDate ? formatDeliveryBs(alertItem.bsDate) : '';
            const ad = formatDeliveryAd(new Date(alertItem.adDateStr));
            return '<div class="delivery-alert-list-item ' + (status === 'firing' ? 'firing' : status === 'done' ? 'done' : '') + '">' +
                '<div class="delivery-alert-top"><div class="delivery-alert-name">' + alertItem.name + '</div><span class="delivery-alert-badge">' + badge + '</span></div>' +
                '<div class="delivery-alert-meta"><div>Item: ' + alertItem.item + ' | Amount: NPR ' + (alertItem.amount ? alertItem.amount.toLocaleString('en-NP') : '0') + '</div>' +
                '<div>Area: ' + alertItem.area + (alertItem.phone ? ' | Phone: ' + alertItem.phone : '') + '</div><div>Date: ' + bs + ' / ' + ad + ' at ' + alertItem.time + '</div>' +
                (alertItem.note ? '<div>Note: ' + alertItem.note + '</div>' : '') + '</div>' + countdown +
                '<div class="delivery-alert-actions">' + (status !== 'done' ? '<button class="btn btn-secondary" onclick="markDeliveryAlertDone(' + alertItem.id + ')">Mark Delivered</button>' : '') +
                '<button class="btn btn-danger" onclick="deleteDeliveryAlert(' + alertItem.id + ')">Delete</button></div></div>';
        }).join('');
    }

    function deleteDeliveryAlert(id) { if (!confirm('Delete this alert?')) return; deliveryAlerts = deliveryAlerts.filter(a => a.id !== id); saveDeliveryAlerts(); renderDeliveryAlerts(); }
    function markDeliveryAlertDone(id) { const item = deliveryAlerts.find(a => a.id === id); if (item) { item.status = 'done'; saveDeliveryAlerts(); } renderDeliveryAlerts(); hideDeliveryAlarmPopup(); }

    function startDeliveryAlarmSound() {
        if (deliveryAlarmInterval) return;
        try {
            deliveryAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const beep = () => {
                if (!deliveryAudioCtx) return;
                const osc = deliveryAudioCtx.createOscillator();
                const gain = deliveryAudioCtx.createGain();
                osc.connect(gain); gain.connect(deliveryAudioCtx.destination);
                osc.frequency.setValueAtTime(880, deliveryAudioCtx.currentTime);
                gain.gain.setValueAtTime(0.45, deliveryAudioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, deliveryAudioCtx.currentTime + 0.55);
                osc.start(deliveryAudioCtx.currentTime); osc.stop(deliveryAudioCtx.currentTime + 0.55);
            };
            beep(); deliveryAlarmInterval = setInterval(beep, 1200);
        } catch (e) { console.warn('Delivery alert sound is not available.'); }
    }
    function stopDeliveryAlarmSound() { if (deliveryAlarmInterval) clearInterval(deliveryAlarmInterval); deliveryAlarmInterval = null; if (deliveryAudioCtx) { try { deliveryAudioCtx.close(); } catch (e) { } deliveryAudioCtx = null; } }
    function isDeliveryTabActive() { return document.getElementById('deliveryAlertTab')?.classList.contains('active'); }
    function hideDeliveryAlarmPopup() { document.getElementById('deliveryAlarmOverlay')?.classList.remove('show'); stopDeliveryAlarmSound(); }
    function showCurrentDeliveryAlarm() {
        const item = deliveryAlerts.find(a => a.id === deliveryFiringId) || deliveryAlerts.find(a => a.status === 'firing');
        if (!item || !isDeliveryTabActive()) { hideDeliveryAlarmPopup(); return; }
        deliveryFiringId = item.id;
        const customer = document.getElementById('deliveryAlarmCustomer');
        const detail = document.getElementById('deliveryAlarmDetail');
        if (customer) customer.textContent = item.name + (item.phone ? ' - ' + item.phone : '');
        if (detail) detail.innerHTML = 'Item: ' + item.item + '<br>Amount: NPR ' + (item.amount ? item.amount.toLocaleString('en-NP') : '0') + '<br>Area: ' + item.area + '<br>Date: ' + (item.bsDate ? formatDeliveryBs(item.bsDate) + ' / ' : '') + formatDeliveryAd(new Date(item.adDateStr)) + ' at ' + item.time + (item.note ? '<br>Note: ' + item.note : '');
        document.getElementById('deliveryAlarmOverlay')?.classList.add('show');
        startDeliveryAlarmSound();
    }
    function dismissDeliveryAlarm() { if (deliveryFiringId) { const item = deliveryAlerts.find(a => a.id === deliveryFiringId); if (item) item.status = 'done'; deliveryFiringId = null; saveDeliveryAlerts(); } hideDeliveryAlarmPopup(); renderDeliveryAlerts(); }
    function fireDeliveryAlarm(item) { deliveryFiringId = item.id; item.status = 'firing'; saveDeliveryAlerts(); showCurrentDeliveryAlarm(); renderDeliveryAlerts(); }
    function tickDeliveryAlerts() { const now = Date.now(); deliveryAlerts.forEach(item => { const fireTime = new Date(item.fireAt).getTime(); if (item.status === 'pending' && Number.isFinite(fireTime) && now >= fireTime) fireDeliveryAlarm(item); }); if (document.getElementById('deliveryAlertListPanel')?.classList.contains('active')) renderDeliveryAlerts(); }
    function scheduleNextDeliveryAlarm() { if (deliveryNextAlarmTimer) clearTimeout(deliveryNextAlarmTimer); deliveryNextAlarmTimer = null; const now = Date.now(); const next = deliveryAlerts.filter(a => a.status === 'pending' && a.fireAt).map(a => ({ item: a, fireTime: new Date(a.fireAt).getTime() })).filter(x => Number.isFinite(x.fireTime)).sort((a, b) => a.fireTime - b.fireTime)[0]; if (!next) return; deliveryNextAlarmTimer = setTimeout(() => { deliveryNextAlarmTimer = null; tickDeliveryAlerts(); scheduleNextDeliveryAlarm(); }, Math.min(Math.max(0, next.fireTime - now), maxDeliveryTimerDelay)); }
    function startDeliveryCountdownClock() { if (deliveryCountdownInterval) clearInterval(deliveryCountdownInterval); deliveryCountdownInterval = setInterval(tickDeliveryAlerts, 1000); }
    function initPayrollDeliveryAlert() { initDeliveryAlertDates(); initDeliveryTimePicker(); startDeliveryCountdownClock(); scheduleNextDeliveryAlarm(); tickDeliveryAlerts(); renderDeliveryAlerts(); window.addEventListener('focus', () => { tickDeliveryAlerts(); scheduleNextDeliveryAlarm(); }); document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickDeliveryAlerts(); scheduleNextDeliveryAlarm(); } }); }

    document.addEventListener('DOMContentLoaded', initPayrollDeliveryAlert);
    window.setDeliveryDateMode = setDeliveryDateMode;
    window.switchDeliveryAlertView = switchDeliveryAlertView;
    window.addDeliveryAlert = addDeliveryAlert;
    window.renderDeliveryAlerts = renderDeliveryAlerts;
    window.deleteDeliveryAlert = deleteDeliveryAlert;
    window.markDeliveryAlertDone = markDeliveryAlertDone;
    window.showCurrentDeliveryAlarm = showCurrentDeliveryAlarm;
    window.hideDeliveryAlarmPopup = hideDeliveryAlarmPopup;
    window.dismissDeliveryAlarm = dismissDeliveryAlarm;
    window.tickDeliveryAlerts = tickDeliveryAlerts;
    window.scheduleNextDeliveryAlarm = scheduleNextDeliveryAlarm;
})();




// Payroll tab switching
(function () {
    'use strict';

    function placePayrollFeaturePanels() {
        const wageCalculatorTab = document.getElementById('wageCalculatorTab');
        const deliveryAlertTab = document.getElementById('deliveryAlertTab');
        const deliveryAlarmOverlay = document.getElementById('deliveryAlarmOverlay');
        const payrollContentArea = document.querySelector('.content-area');
        if (wageCalculatorTab && payrollContentArea && wageCalculatorTab.parentElement !== payrollContentArea) {
            payrollContentArea.appendChild(wageCalculatorTab);
        }
        if (deliveryAlertTab && payrollContentArea && deliveryAlertTab.parentElement !== payrollContentArea) {
            payrollContentArea.appendChild(deliveryAlertTab);
        }
        if (deliveryAlarmOverlay && document.body && deliveryAlarmOverlay.parentElement !== document.body) {
            document.body.appendChild(deliveryAlarmOverlay);
        }
    }

    function switchPayrollTab(tab) {
        placePayrollFeaturePanels();
        const showWage = tab === 'wage';
        const showDelivery = tab === 'delivery';
        document.getElementById('payrollRecordsTab')?.classList.toggle('active', !showWage && !showDelivery);
        document.getElementById('wageCalculatorTab')?.classList.toggle('active', showWage);
        document.getElementById('deliveryAlertTab')?.classList.toggle('active', showDelivery);
        document.getElementById('payrollTabRecords')?.classList.toggle('active', !showWage && !showDelivery);
        document.getElementById('payrollTabWage')?.classList.toggle('active', showWage);
        document.getElementById('payrollTabDelivery')?.classList.toggle('active', showDelivery);
        if (showWage && typeof window.calcWage === 'function') setTimeout(window.calcWage, 50);
        if (showDelivery) {
            if (typeof window.renderDeliveryAlerts === 'function') window.renderDeliveryAlerts();
            if (typeof window.showCurrentDeliveryAlarm === 'function') window.showCurrentDeliveryAlarm();
        } else if (typeof window.hideDeliveryAlarmPopup === 'function') {
            window.hideDeliveryAlarmPopup();
        }
    }

    function openWageModal() { switchPayrollTab('wage'); }
    function closeWageModal() { switchPayrollTab('records'); }

    document.addEventListener('DOMContentLoaded', placePayrollFeaturePanels);
    window.switchPayrollTab = switchPayrollTab;
    window.openWageModal = openWageModal;
    window.closeWageModal = closeWageModal;
})();



// Payroll wage calculator
(function () {
    'use strict';

    var mode = 'bora';
    var bagItems = [{ name: '', bagKg: 50, count: '', rate: '' }];

    // ── Quintal state ─────────────────────────────────────────────────
    var _qtlIdCtr = 0;
    var _lastQtlMode = 'kg';   // default mode for new rows
    var _lastKgPerBag = '';    // sticky kgPerBag default
    var wageHistory = [];

    function _newQtlRow(overrides) {
        _qtlIdCtr++;
        return Object.assign(
            { id: _qtlIdCtr, item: '', mode: _lastQtlMode,
              totalKg: 0, bags: '', kgPerBag: _lastKgPerBag, ratePerQtl: '' },
            overrides || {}
        );
    }
    var quintalItems = [_newQtlRow({ mode: 'kg', kgPerBag: '' })];

    function money(n) {
        return 'NPR ' + Math.round(parseFloat(n) || 0).toLocaleString('en-NP');
    }
    function moneyFull(n) {
        var v = parseFloat(n) || 0;
        var s = v.toFixed(2);
        return 'NPR ' + (s.endsWith('.00') ? Math.round(v).toLocaleString('en-NP') : s);
    }
    function roundHalfUp(n, dp) {
        var f = Math.pow(10, dp);
        return Math.round((n + Number.EPSILON) * f) / f;
    }

    function addRow(label, value) {
        const box = document.getElementById('breakdown-rows');
        if (!box) return;
        const row = document.createElement('div');
        row.className = 'rrow';
        row.innerHTML = '<span class="lbl">' + label + '</span><span class="val">' + value + '</span>';
        box.appendChild(row);
    }

    function renderBagItems() {
        const list = document.getElementById('bag-items-list');
        if (!list) return;
        const bagWtOpts = [10, 20, 25, 30, 45, 50];
        list.innerHTML = bagItems.map((item, i) => {
            const wtOptions = bagWtOpts.map(w => '<option value="' + w + '"' + (parseFloat(item.bagKg) === w ? ' selected' : '') + '>' + w + ' kg</option>').join('');
            return '<div class="bag-item-row">' +
                '<input type="text" placeholder="Item" value="' + (item.name || '') + '" oninput="bagItems[' + i + '].name=this.value;calcWage()">' +
                '<select onchange="bagItems[' + i + '].bagKg=parseFloat(this.value)||0;calcWage()">' + wtOptions + '</select>' +
                '<input type="number" placeholder="0" value="' + (item.count || '') + '" min="0" oninput="bagItems[' + i + '].count=parseFloat(this.value)||0;calcWage()">' +
                '<input type="number" placeholder="0" value="' + (item.rate || '') + '" min="0" step="0.5" oninput="bagItems[' + i + '].rate=parseFloat(this.value)||0;calcWage()">' +
                '<button class="rm-btn" onclick="removeBagItem(' + i + ')" aria-label="Remove"><i class="ti ti-x" aria-hidden="true"></i></button>' +
                '</div>';
        }).join('');
    }

    function renderQuintalItems() {
        const list = document.getElementById('quintal-items-list');
        if (!list) return;
        list.innerHTML = quintalItems.map(function (item, i) {
            var isBags   = item.mode === 'bags';
            var bags     = parseFloat(item.bags)     || 0;
            var kpb      = parseFloat(item.kgPerBag) || 0;
            var computed = isBags ? bags * kpb : 0;

            var modeToggle =
                '<div class="qtl-mode-toggle">' +
                '<button type="button" class="qtl-mode-btn' + (item.mode === 'kg' ? ' active' : '') +
                '" onclick="switchQtlMode(' + i + ',\'kg\')" title="Enter total kg directly">Total&nbsp;kg</button>' +
                '<button type="button" class="qtl-mode-btn' + (item.mode === 'bags' ? ' active' : '') +
                '" onclick="switchQtlMode(' + i + ',\'bags\')" title="Bags \u00d7 kg per bag">Bags\u00d7kg</button>' +
                '</div>';

            var qtyHtml;
            if (item.mode === 'kg') {
                qtyHtml =
                    '<div class="qtl-qty-wrap">' +
                    '<input type="number" class="qtl-num" placeholder="0" value="' + (item.totalKg > 0 ? item.totalKg : '') +
                    '" min="0" step="1" title="Total kg"' +
                    ' oninput="quintalItems[' + i + '].totalKg=parseFloat(this.value)||0;calcWage()">' +
                    '<span class="qtl-unit">kg</span>' +
                    '</div>';
            } else {
                var dispKg = computed > 0
                    ? bags + ' \u00d7 ' + kpb + ' = <strong>' +
                      (computed % 1 === 0 ? computed : computed.toFixed(2)) + ' kg</strong>'
                    : '\u2014';
                qtyHtml =
                    '<div class="qtl-qty-wrap qtl-bags-wrap">' +
                    '<input type="number" class="qtl-num" placeholder="Bags" value="' +
                    (item.bags !== '' ? item.bags : '') + '" min="1" step="1" title="Number of bags"' +
                    ' oninput="quintalItems[' + i + '].bags=this.value===\'\'?\'\':Math.max(1,parseInt(this.value)||1);' +
                    'updateQtlComputed(' + i + ')">' +
                    '<span class="qtl-x">\u00d7</span>' +
                    '<input type="number" class="qtl-num" placeholder="kg/bag" value="' +
                    (item.kgPerBag !== '' ? item.kgPerBag : '') + '" min="0.01" step="0.01" title="kg per bag"' +
                    ' oninput="quintalItems[' + i + '].kgPerBag=this.value===\'\'?\'\':parseFloat(this.value)||0;' +
                    '_lastKgPerBag=quintalItems[' + i + '].kgPerBag;updateQtlComputed(' + i + ')">' +
                    '</div>' +
                    '<div class="qtl-computed" id="qtl-comp-' + i + '">' + dispKg + '</div>';
            }

            return '<div class="qtl-row">' +
                modeToggle +
                qtyHtml +
                '<input type="number" class="qtl-num qtl-rate" placeholder="Rate/Qtl" value="' + (item.ratePerQtl || '') +
                '" min="0" step="1" title="Rate per quintal (NPR)"' +
                ' oninput="quintalItems[' + i + '].ratePerQtl=parseFloat(this.value)||0;calcWage()">' +
                '<button class="rm-btn" onclick="removeQuintalItem(' + i + ')" aria-label="Remove">' +
                '<i class="ti ti-x" aria-hidden="true"></i></button>' +
                '</div>';
        }).join('');
    }


    function addBagItem() { bagItems.push({ name: '', bagKg: 50, count: '', rate: '' }); renderBagItems(); calcWage(); }
    function removeBagItem(i) { if (bagItems.length <= 1) return; bagItems.splice(i, 1); renderBagItems(); calcWage(); }
    function addQuintalItem() {
        var prev = quintalItems[quintalItems.length - 1];
        _lastQtlMode = prev ? prev.mode : 'kg';
        if (prev && prev.mode === 'bags') _lastKgPerBag = prev.kgPerBag;
        quintalItems.push(_newQtlRow());
        renderQuintalItems();
        calcWage();
    }
    function removeQuintalItem(i) {
        if (quintalItems.length <= 1) return;
        quintalItems.splice(i, 1);
        renderQuintalItems();
        calcWage();
    }
    function switchQtlMode(i, newMode) {
        var row = quintalItems[i];
        if (!row || row.mode === newMode) return;
        if (newMode === 'kg') {
            // bags -> kg: copy computed totalKg
            var bags = parseFloat(row.bags) || 0;
            var kpb  = parseFloat(row.kgPerBag) || 0;
            var computed = bags * kpb;
            row.totalKg = computed > 0 ? computed : (row.totalKg || 0);
        } else {
            // kg -> bags: clear bags / kgPerBag
            row.bags = '';
            row.kgPerBag = _lastKgPerBag || '';
        }
        row.mode = newMode;
        _lastQtlMode = newMode;
        renderQuintalItems();
        calcWage();
    }
    function updateQtlComputed(i) {
        var row = quintalItems[i];
        if (!row) return;
        var bags = row.bags === '' ? 0 : (parseInt(row.bags) || 0);
        var kpb  = row.kgPerBag === '' ? 0 : (parseFloat(row.kgPerBag) || 0);
        var computed = bags > 0 && kpb > 0 ? bags * kpb : 0;
        row.totalKg = computed;
        // update display label only (no full re-render to preserve focus)
        var el = document.getElementById('qtl-comp-' + i);
        if (el) {
            if (computed > 0) {
                el.innerHTML = bags + ' × ' + kpb + ' = <strong>' +
                    (computed % 1 === 0 ? computed : computed.toFixed(2)) + ' kg</strong>';
            } else {
                el.innerHTML = '—';
            }
        }
        calcWage();
    }

    function setMode(nextMode) {
        mode = nextMode;
        document.getElementById('btn-bora')?.classList.toggle('active', mode === 'bora');
        document.getElementById('btn-quintal')?.classList.toggle('active', mode === 'quintal');
        const bora = document.getElementById('bora-section');
        const quintal = document.getElementById('quintal-section');
        if (bora) bora.style.display = mode === 'bora' ? '' : 'none';
        if (quintal) quintal.style.display = mode === 'quintal' ? '' : 'none';
        calcWage();
    }

    function calcWage() {
        var rows = document.getElementById('breakdown-rows');
        if (rows) rows.innerHTML = '';
        var totalWage = 0;
        var totalBags = 0;
        var totalKgAll = 0;
        var hasBagsRow = false;

        if (mode === 'bora') {
            bagItems.forEach(function (item, i) {
                var bags = parseFloat(item.count) || 0;
                var kg   = parseFloat(item.bagKg)  || 0;
                var rate = parseFloat(item.rate)    || 0;
                var line = bags * rate;
                totalBags  += bags;
                totalKgAll += bags * kg;
                totalWage  += line;
                if (line > 0)
                    addRow((item.name || 'Item ' + (i + 1)) + ' (' + bags + ' bags x NPR ' + rate + ')', money(line));
            });
        } else {
            quintalItems.forEach(function (item, i) {
                var totalKg   = parseFloat(item.totalKg) || 0;
                var rate      = parseFloat(item.ratePerQtl) || 0;
                var quintals  = totalKg / 100;
                var lineWage  = roundHalfUp(quintals * rate, 2);
                if (totalKg <= 0) return; // skip empty rows
                totalKgAll += totalKg;
                totalWage  += lineWage;
                if (item.mode === 'bags') {
                    var bags = parseInt(item.bags) || 0;
                    var kpb  = parseFloat(item.kgPerBag) || 0;
                    hasBagsRow = true;
                    totalBags += bags;
                    addRow(bags + ' bags × ' + kpb + ' kg = ' + quintals.toFixed(2) + ' qtl × NPR ' + rate,
                           moneyFull(lineWage));
                } else {
                    addRow(quintals.toFixed(2) + ' qtl × NPR ' + rate,
                           moneyFull(lineWage));
                }
            });
        }

        var setText = function (id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        if (mode === 'bora') {
            setText('m-bags', totalBags.toLocaleString('en-NP'));
        } else {
            var bagsDisplay = hasBagsRow ? totalBags.toLocaleString('en-NP') : '-';
            var bagsEl = document.getElementById('m-bags');
            if (bagsEl) {
                bagsEl.textContent = bagsDisplay;
                bagsEl.title = hasBagsRow ? '' : 'Bags counted only for rows entered as bags';
            }
        }
        setText('m-quintal', (totalKgAll / 100).toFixed(2));
        setText('m-base', moneyFull(totalWage));
        setText('m-total', moneyFull(totalWage));
        setText('r-total', moneyFull(totalWage));
    }

    function initPayrollWage() {
        renderBagItems();
        renderQuintalItems();
        document.getElementById('btn-bora')?.addEventListener('click', () => setMode('bora'));
        document.getElementById('btn-quintal')?.addEventListener('click', () => setMode('quintal'));
        calcWage();
    }

    document.addEventListener('DOMContentLoaded', initPayrollWage);
    window.mode = mode;
    window.bagItems = bagItems;
    window.quintalItems = quintalItems;
    window.addBagItem = addBagItem;
    window.removeBagItem = removeBagItem;
    window.addQuintalItem = addQuintalItem;
    window.removeQuintalItem = removeQuintalItem;
    window.switchQtlMode = switchQtlMode;
    window.updateQtlComputed = updateQtlComputed;
    window.setMode = setMode;
    window.calcWage = calcWage;
})();
