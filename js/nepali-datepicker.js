/**
 * Premium Nepali Datepicker for Dashboard
 * Designed for high-end UI/UX with dual date display
 */

let calendarState = {
    currentYear: 0,
    currentMonth: 0,
    selectedDate: null, // Date object (AD)
    isVisible: false
};

function formatLocalDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initNepaliCalendar() {
    const today = new Date();
    const bsTodayStr = window.convertToBS(today); // "YYYY-MM-DD"
    const [y, m, d] = bsTodayStr.split('-').map(Number);
    
    calendarState.currentYear = y;
    calendarState.currentMonth = m;
    calendarState.selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Initial render
    renderNepaliCalendar();
}

function toggleNepaliCalendar() {
    const container = document.getElementById('nepali-calendar-container');
    if (!container) return;
    
    calendarState.isVisible = !calendarState.isVisible;
    container.style.display = calendarState.isVisible ? 'block' : 'none';
    
    if (calendarState.isVisible) {
        renderNepaliCalendar();
        
        // Prevent clicks inside the calendar from closing it
        container.onclick = (e) => e.stopPropagation();

        // Add outside click listener
        setTimeout(() => document.addEventListener('click', handleOutsideClick), 10);
    }
}

function handleOutsideClick(e) {
    const container = document.getElementById('nepali-calendar-container');
    const trigger = document.getElementById('calendar-trigger');
    
    if (container && !container.contains(e.target) && !trigger.contains(e.target)) {
        calendarState.isVisible = false;
        container.style.display = 'none';
        document.removeEventListener('click', handleOutsideClick);
    }
}

function renderNepaliCalendar() {
    const container = document.getElementById('nepali-calendar-container');
    if (!container) return;

    const ND = (window.NepaliDate && window.NepaliDate.default) || window.NepaliDate;
    if (!ND) {
        container.innerHTML = '<div style="padding:1rem; color:red;">NepaliDate library not loaded!</div>';
        return;
    }

    const { currentYear, currentMonth } = calendarState;
    const monthsBS = ["Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
    const monthsAD = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Get AD range for this BS month
    // First day of BS month
    const firstDayBS = new ND(currentYear, currentMonth - 1, 1);
    const firstDayAD = firstDayBS.toJsDate();
    
    // Last day of BS month
    // NepaliDate library: number of days in month
    // We can just iterate or use ND.getDaysInMonth(y, m) if available
    // Standard ND approach is to go to next month and subtract 1 day
    const daysInMonth = getBSMonthDays(currentYear, currentMonth, ND);
    const lastDayBS = new ND(currentYear, currentMonth - 1, daysInMonth);
    const lastDayAD = lastDayBS.toJsDate();

    // AD Month Title: "Mar/Apr 2026"
    let adTitle = `${monthsAD[firstDayAD.getMonth()]}`;
    if (firstDayAD.getMonth() !== lastDayAD.getMonth()) {
        adTitle += `/${monthsAD[lastDayAD.getMonth()]}`;
    }
    adTitle += ` ${firstDayAD.getFullYear()}`;

    const html = `
        <div class="calendar-header">
            <div class="calendar-title-bs">${monthsBS[currentMonth - 1]} ${currentYear}</div>
            <div class="calendar-title-ad">/ ${adTitle}</div>
            <div class="calendar-nav">
                <button class="nav-btn" onclick="window.changeBSMonth(-1); event.stopPropagation();" title="Previous Month">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="nav-btn" onclick="window.changeBSMonth(1); event.stopPropagation();" title="Next Month">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        </div>

        <div class="calendar-weekdays">
            <div class="weekday">Su</div><div class="weekday">Mo</div><div class="weekday">Tu</div>
            <div class="weekday">We</div><div class="weekday">Th</div><div class="weekday">Fr</div>
            <div class="weekday">Sa</div>
        </div>

        <div class="calendar-grid">
            ${generateCalendarDays(currentYear, currentMonth, ND)}
        </div>

        <div class="calendar-footer">
            <button class="calendar-apply-btn" onclick="applyBSFilter()">Apply Filter</button>
        </div>
    `;

    container.innerHTML = html;
}

function getBSMonthDays(y, m, ND) {
    // Some versions of ND have .getDaysInMonth(), others we must check
    try {
        // Try to create a date at 32nd and see if it rolls over, or use a known list
        // Actually, the easiest way with this library is to use its metadata if exposed
        // But most reliable is:
        let days = 32;
        while (days > 27) {
            const d = new ND(y, m - 1, days);
            if (d.getDate() === days) return days;
            days--;
        }
    } catch (e) { return 30; }
    return 30;
}

function generateCalendarDays(y, m, ND) {
    const firstDay = new ND(y, m - 1, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = getBSMonthDays(y, m, ND);
    
    let html = '';
    
    // Empty slots before start
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    const todayBS = window.convertToBS(new Date());
    const selectedBS = calendarState.selectedDate ? window.convertToBS(calendarState.selectedDate) : null;

    for (let d = 1; d <= daysInMonth; d++) {
        const currentBS = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const adDate = new ND(y, m - 1, d).toJsDate();
        const adDay = adDate.getDate();
        
        const isToday = currentBS === todayBS;
        const isSelected = currentBS === selectedBS;
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 onclick="selectBSDate(${y}, ${m}, ${d})">
                <span class="bs-num">${d}</span>
                <span class="ad-num">${adDay}</span>
            </div>
        `;
    }
    
    return html;
}

function changeBSMonth(delta) {
    calendarState.currentMonth += delta;
    if (calendarState.currentMonth > 12) {
        calendarState.currentMonth = 1;
        calendarState.currentYear++;
    } else if (calendarState.currentMonth < 1) {
        calendarState.currentMonth = 12;
        calendarState.currentYear--;
    }
    renderNepaliCalendar();
}

function selectBSDate(y, m, d) {
    const ND = (window.NepaliDate && window.NepaliDate.default) || window.NepaliDate;
    const nd = new ND(y, m - 1, d);
    calendarState.selectedDate = nd.toJsDate();
    renderNepaliCalendar();
}

function applyBSFilter() {
    if (calendarState.selectedDate) {
        const dateStr = formatLocalDate(calendarState.selectedDate); // YYYY-MM-DD
        const input = document.getElementById('dashboardDatePicker');
        if (input) input.value = dateStr;
        if (typeof window.handleDateChange === 'function') {
            window.handleDateChange(dateStr);
        }
    }
    toggleNepaliCalendar();
}

// Global hooks
window.toggleNepaliCalendar = toggleNepaliCalendar;
window.changeBSMonth = changeBSMonth;
window.selectBSDate = selectBSDate;
window.applyBSFilter = applyBSFilter;

// Initialize when library is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts
    setTimeout(initNepaliCalendar, 100);
});
