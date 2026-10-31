// js/nepalidate.js
// Utility wrapper for nepali-date-converter UMD library
// The UMD file exposes: window.NepaliDate = { default: NepaliDate, dateConfigMap: ... }

function _getNDClass() {
    // Try window.NepaliDate.default (UMD export), then window.NepaliDate directly as class fallback
    if (window.NepaliDate && typeof window.NepaliDate.default === 'function') {
        return window.NepaliDate.default;
    }
    if (typeof window.NepaliDate === 'function') {
        return window.NepaliDate;
    }
    console.warn("NepaliDate library not found or not loaded yet!");
    return null;
}

/**
 * Convert a JS Date or date string (AD) to BS formatted string "YYYY-MM-DD"
 * @param {Date|string} adDate
 * @returns {string} e.g. "2082-11-08"
 */
function convertToBS(adDate) {
    const ND = _getNDClass();
    if (!ND) return '';
    try {
        const d = adDate instanceof Date ? adDate : new Date(adDate);
        const bsDate = new ND(d);
        return bsDate.format('YYYY-MM-DD');
    } catch (e) {
        console.error('convertToBS error:', e);
        return '';
    }
}

/**
 * Convert a JS Date or date string (AD) to full BS string "YYYY MMMM DD"
 * @param {Date|string} adDate
 * @returns {string} e.g. "2082 Falgun 08"
 */
function convertToBSFull(adDate) {
    const ND = _getNDClass();
    if (!ND) return '';
    try {
        const d = adDate instanceof Date ? adDate : new Date(adDate);
        const bsDate = new ND(d);
        return bsDate.format('YYYY MMMM DD');
    } catch (e) {
        return '';
    }
}

/**
 * Convert a JS Date or date string (AD) to BS month-year "MMMM YYYY"
 * @param {Date|string} adDate
 * @returns {string} e.g. "Falgun 2082"
 */
function convertToBSMonth(adDate) {
    const ND = _getNDClass();
    if (!ND) return '';
    try {
        const d = adDate instanceof Date ? adDate : new Date(adDate);
        const bsDate = new ND(d);
        return bsDate.format('MMMM YYYY');
    } catch (e) {
        return '';
    }
}

// Expose globally
window.convertToBS = convertToBS;
window.convertToBSFull = convertToBSFull;
window.convertToBSMonth = convertToBSMonth;

// Automatic Fiscal Year Rollover
async function autoCheckFiscalYear() {
    if (window._fiscalYearChecking || window._fiscalYearChecked) return;
    window._fiscalYearChecking = true;

    try {
        const ND = _getNDClass() || (window.NepaliDate && window.NepaliDate.default) || window.NepaliDate;
        if (!ND) {
            window._fiscalYearChecking = false;
            return;
        }

        // Wait for window.posAPI to be initialized (it might be loaded just after this file)
        if (!window.posAPI) {
            setTimeout(autoCheckFiscalYear, 100);
            window._fiscalYearChecking = false;
            return;
        }

        const todayBS = new ND(new Date());
        const bsYear = todayBS.getYear();
        const bsMonth = todayBS.getMonth(); // 0-indexed: 3 is Shrawan (Month 4)

        const settings = await window.posAPI.getAllSettings().catch(err => {
            console.warn('[Fiscal Year Check] Settings fetch failed:', err);
            return null;
        });

        if (!settings) {
            window._fiscalYearChecking = false;
            return;
        }

        const savedBSYear = parseInt(settings.fiscal_year_bs_year || 2082); // default to 2082 (FY 082/83 start year)
        const currentFiscalYearStr = settings.fiscalYear || '082/83';

        // Check if BS Year > saved year and month is Shrawan (Month index 3) or later
        if (bsYear > savedBSYear && bsMonth >= 3) {
            const yy = String(bsYear).slice(-2);
            const next_yy = String(bsYear + 1).slice(-2);
            const newFiscalYearStr = `${yy}/${next_yy}`;

            // Safety check to prevent double rollover
            if (currentFiscalYearStr === newFiscalYearStr) {
                await window.posAPI.saveSetting('fiscal_year_bs_year', bsYear);
                window._fiscalYearChecked = true;
                window._fiscalYearChecking = false;
                return;
            }

            console.log(`[Fiscal Year Rollover] Rolling over from FY ${currentFiscalYearStr} to FY ${newFiscalYearStr}...`);
            
            // Perform rollover
            await window.posAPI.rolloverFiscalYear(bsYear, newFiscalYearStr);

            // Log event to local audit logs
            const logs = JSON.parse(localStorage.getItem('pos_audit_logs') || '[]');
            logs.push({
                timestamp: new Date().toISOString(),
                action: 'Fiscal Year Rollover',
                details: `Fiscal Year automatically rolled over from ${currentFiscalYearStr} to ${newFiscalYearStr}. Bill counter reset to 001.`
            });
            localStorage.setItem('pos_audit_logs', JSON.stringify(logs));

            // Show green success notification
            showGreenRolloverNotification(currentFiscalYearStr, newFiscalYearStr);
        }
        window._fiscalYearChecked = true;
    } catch (e) {
        console.error('[Fiscal Year Rollover] Error during auto check:', e);
    } finally {
        window._fiscalYearChecking = false;
    }
}

function showGreenRolloverNotification(oldFY, newFY) {
    const notification = document.createElement('div');
    notification.id = 'fiscal-year-rollover-notification';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #fff; flex-shrink: 0;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
                <strong style="display: block; font-size: 0.95rem; margin-bottom: 2px;">Fiscal Year Rollover Successful!</strong>
                <span style="font-size: 0.85rem; opacity: 0.9;">Rolled over from FY ${oldFY} to FY ${newFY}. Bill counter reset to 001.</span>
            </div>
        </div>
    `;

    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#10b981', // emerald green
        color: '#ffffff',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        zIndex: '100000',
        fontFamily: "'Inter', sans-serif",
        maxWidth: '380px',
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    document.body.appendChild(notification);

    // Slide up / fade in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);

    // Fade out and reload after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => {
            notification.remove();
            window.location.reload();
        }, 500);
    }, 5000);
}

// Register checking on DOMContentLoaded
document.addEventListener('DOMContentLoaded', autoCheckFiscalYear);
