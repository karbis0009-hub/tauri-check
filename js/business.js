/**
 * js/business.js - Multi-Business Management & Switcher Component
 * Supports managing multiple shops (e.g. 1 VAT Registered, 2 PAN Only)
 * with independent bill counters, isolated inventory/sales, and top navigation switcher.
 */

(function () {
    const STORAGE_BUSINESSES_KEY = 'pos_businesses';
    const STORAGE_CURRENT_BIZ_KEY = 'currentBusinessId';
    const STORAGE_SETTINGS_KEY = 'pos_settings';

    class POSBusinessManager {
        constructor() {
            this.init();
        }

        init() {
            this.migrateLegacySettings();
            this.ensureActiveBusiness();
            this.syncSettingsWithCurrentBusiness();
        }

        /**
         * Read all businesses from localStorage
         */
        getBusinesses(includeInactive = false) {
            try {
                const data = JSON.parse(localStorage.getItem(STORAGE_BUSINESSES_KEY) || '[]');
                if (!Array.isArray(data)) return [];
                if (includeInactive) return data;
                return data.filter(b => b && b.is_active !== false && !b.deleted);
            } catch (e) {
                console.error('Error reading businesses:', e);
                return [];
            }
        }

        saveBusinessesList(list) {
            localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(list));
        }

        getCurrentBusinessId() {
            return localStorage.getItem(STORAGE_CURRENT_BIZ_KEY) || 'biz_1';
        }

        getActiveBusinessId() {
            return this.getCurrentBusinessId();
        }

        getCurrentBusiness() {
            const currentId = this.getCurrentBusinessId();
            const businesses = this.getBusinesses(true);
            let biz = businesses.find(b => String(b.id) === String(currentId) && b.is_active !== false);
            if (!biz) {
                biz = businesses.find(b => b.is_active !== false);
                if (biz) {
                    localStorage.setItem(STORAGE_CURRENT_BIZ_KEY, biz.id);
                }
            }
            return biz || null;
        }

        getActiveBusiness() {
            return this.getCurrentBusiness();
        }

        getBusinessById(id) {
            const businesses = this.getBusinesses(true);
            return businesses.find(b => String(b.id) === String(id)) || null;
        }

        ensureActiveBusiness() {
            const activeBiz = this.getCurrentBusiness();
            if (activeBiz) {
                localStorage.setItem(STORAGE_CURRENT_BIZ_KEY, activeBiz.id);
            }
        }

        /**
         * STEP 2 & 3: Migrate existing settings to Business 1 (e.g. Karki Store)
         * and tag all existing records with business_id: 'biz_1'
         */
        migrateLegacySettings() {
            const existingBizList = localStorage.getItem(STORAGE_BUSINESSES_KEY);
            let businesses = [];
            try {
                businesses = existingBizList ? JSON.parse(existingBizList) : [];
            } catch (e) {
                businesses = [];
            }

            if (!Array.isArray(businesses) || businesses.length === 0) {
                // Check existing pos_settings
                let settings = {};
                try {
                    settings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
                } catch (e) {
                    settings = {};
                }

                const isPanOnly = settings.businessType === 'pan_only';
                const storeName = settings.storeName || 'Karki Store';
                const panNo = settings.panNo || (isPanOnly ? (settings.vatNo || '') : '');
                const vatNo = settings.vatNoActual || settings.vatNo || '';

                const biz1 = {
                    id: 'biz_1',
                    name: storeName,
                    address: settings.address || '',
                    phone: settings.phone || '',
                    registration_type: isPanOnly ? 'pan' : 'vat',
                    business_type: isPanOnly ? 'pan_only' : 'vat_registered',
                    pan_no: panNo,
                    vat_no: isPanOnly ? '' : vatNo,
                    footer: settings.footer || 'Thank you for your visit!',
                    bill_format: settings.billFormat || 'prefix',
                    bill_prefix: settings.billPrefix || 'TH',
                    starting_no: settings.startingNo || 1,
                    fiscal_year: settings.fiscalYear || '082/83',
                    is_active: true,
                    is_default: true,
                    created_at: new Date().toISOString()
                };

                businesses = [biz1];
                this.saveBusinessesList(businesses);
                localStorage.setItem(STORAGE_CURRENT_BIZ_KEY, 'biz_1');

                // STEP 3: Tag all existing data with business_id: 'biz_1'
                this.tagExistingDataWithBusinessId('biz_1');
            } else {
                // Ensure existing data has business_id tagged
                const firstActive = businesses.find(b => b.is_active !== false) || businesses[0];
                const defId = firstActive ? firstActive.id : 'biz_1';
                this.tagExistingDataWithBusinessId(defId);
            }
        }

        tagExistingDataWithBusinessId(targetBizId) {
            if (!targetBizId) return;

            const safeTag = (key) => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    const list = JSON.parse(raw);
                    if (Array.isArray(list) && list.length > 0) {
                        let changed = false;
                        list.forEach(item => {
                            if (item && !item.business_id) {
                                item.business_id = targetBizId;
                                changed = true;
                            }
                        });
                        if (changed) {
                            localStorage.setItem(key, JSON.stringify(list));
                        }
                    }
                } catch (e) {}
            };

            safeTag('pos_items');
            safeTag('pos_sales');
            safeTag('pos_sales_invoices');
            safeTag('pos_purchases');
            safeTag('pos_credit_notes');
            safeTag('pos_debit_notes');
            safeTag('pos_ar_accounts');
            safeTag('pos_ar_transactions');
        }

        /**
         * STEP 5: Keep existing VAT/PAN toggle logic intact by syncing
         * the CURRENTLY SELECTED business into pos_settings.
         */
        syncSettingsWithCurrentBusiness() {
            const biz = this.getCurrentBusiness();
            if (!biz) return;

            let settings = {};
            try {
                settings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
            } catch (e) {
                settings = {};
            }

            const isPanOnly = biz.registration_type === 'pan' || biz.business_type === 'pan_only' || biz.registrationType === 'pan';
            const name = biz.name || biz.storeName || biz.store_name || '';
            const address = biz.address !== undefined ? biz.address : (biz.storeAddress !== undefined ? biz.storeAddress : '');
            const phone = biz.phone !== undefined ? biz.phone : (biz.storePhone !== undefined ? biz.storePhone : '');
            const regNumber = (biz.pan_no || biz.vat_no || biz.panNo || biz.vatNo || biz.pan || biz.vat || '').trim();
            const panNo = regNumber;
            const vatNo = regNumber;
            const footer = biz.footer !== undefined ? biz.footer : (biz.footerText !== undefined ? biz.footerText : 'Thank you for your visit!');
            const billPrefix = biz.bill_prefix !== undefined ? biz.bill_prefix : (biz.billPrefix || 'TH');
            const startingNo = biz.starting_no !== undefined ? biz.starting_no : (biz.startingNo !== undefined ? biz.startingNo : 1);
            const fiscalYear = biz.fiscal_year || biz.fiscalYear || '082/83';

            settings.businessType = isPanOnly ? 'pan_only' : 'vat_registered';
            settings.storeName = name;
            settings.address = address;
            settings.phone = phone;
            settings.panNo = regNumber;
            settings.vatNoActual = regNumber;
            settings.vatNo = regNumber;
            settings.vatLabelType = isPanOnly ? 'PAN' : 'VAT';
            settings.footer = footer;
            settings.billPrefix = billPrefix;
            settings.startingNo = startingNo;
            settings.fiscalYear = fiscalYear;

            localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));

            if (window.posAPI && typeof window.posAPI.saveSetting === 'function') {
                ['businessType', 'storeName', 'address', 'phone', 'panNo', 'vatNo', 'vatNoActual', 'vatLabelType', 'footer', 'billPrefix', 'startingNo', 'fiscalYear'].forEach(k => {
                    if (settings[k] !== undefined) {
                        window.posAPI.saveSetting(k, settings[k]).catch(() => {});
                    }
                });
            }
        }

        /**
         * STEP 1: Switch active business and reload page data
         */
        switchBusiness(businessId) {
            const biz = this.getBusinessById(businessId);
            if (!biz || biz.is_active === false) {
                alert('Business not found or inactive.');
                return;
            }

            localStorage.setItem(STORAGE_CURRENT_BIZ_KEY, String(businessId));
            this.syncSettingsWithCurrentBusiness();

            if (typeof updateBusinessSwitcherState === 'function') {
                updateBusinessSwitcherState();
            }

            if (typeof updateSidebarBrand === 'function') {
                updateSidebarBrand();
            }

            if (typeof populateDropdownList === 'function') {
                populateDropdownList();
            }

            if (typeof closeAllDropdowns === 'function') {
                closeAllDropdowns();
            }

            if (typeof loadSettings === 'function' && document.getElementById('settingsBusinessesList')) {
                // Instantly update settings UI in place without full reload
                loadSettings();
            } else {
                // Refresh UI and reload current page
                window.location.reload();
            }
        }

        /**
         * STEP 6: Save or Add Business
         */
        saveBusiness(data) {
            if (!data.name || !data.name.trim()) {
                alert('Business Name is required.');
                return null;
            }
            const isPanOnly = data.registration_type === 'pan';
            if (data.is_modal_submit) {
                if (isPanOnly) {
                    if (!data.pan_no || !data.pan_no.trim()) {
                        alert('PAN Number is required.');
                        return null;
                    }
                    if (data.pan_no.trim().length !== 9) {
                        alert('PAN Number must be exactly 9 digits.');
                        return null;
                    }
                } else {
                    if (!data.vat_no || !data.vat_no.trim()) {
                        alert('VAT Number is required.');
                        return null;
                    }
                    if (data.vat_no.trim().length !== 9) {
                        alert('VAT Number must be exactly 9 digits.');
                        return null;
                    }
                }
            }

            const businesses = this.getBusinesses(true);

            const record = {
                id: data.id || `biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: data.name.trim(),
                address: (data.address || '').trim(),
                phone: (data.phone || '').trim(),
                registration_type: isPanOnly ? 'pan' : 'vat',
                business_type: isPanOnly ? 'pan_only' : 'vat_registered',
                pan_no: (data.pan_no || data.vat_no || '').trim(),
                vat_no: (data.vat_no || data.pan_no || '').trim(),
                footer: (data.footer || 'Thank you for your visit!').trim(),
                bill_format: data.bill_format || 'prefix',
                bill_prefix: (data.bill_prefix || (data.name.trim().substring(0, 3).toUpperCase())).trim(),
                starting_no: parseInt(data.starting_no || 1, 10),
                fiscal_year: data.fiscal_year || '082/83',
                is_active: true,
                created_at: data.created_at || new Date().toISOString()
            };

            const existingIndex = businesses.findIndex(b => String(b.id) === String(record.id));
            if (existingIndex > -1) {
                businesses[existingIndex] = { ...businesses[existingIndex], ...record };
            } else {
                businesses.push(record);
            }

            this.saveBusinessesList(businesses);

            // If creating new or updating currently active business, sync settings
            const currentId = this.getCurrentBusinessId();
            if (!data.id || String(data.id) === String(currentId)) {
                localStorage.setItem(STORAGE_CURRENT_BIZ_KEY, record.id);
                this.syncSettingsWithCurrentBusiness();
            }

            return record;
        }

        /**
         * STEP 6: Soft Delete Business
         */
        deleteBusiness(businessId) {
            const businesses = this.getBusinesses(true);
            const activeList = businesses.filter(b => b.is_active !== false && !b.deleted);

            if (activeList.length <= 1) {
                alert('Cannot delete the only remaining active business.');
                return false;
            }

            const bizIndex = businesses.findIndex(b => String(b.id) === String(businessId));
            if (bizIndex === -1) {
                alert('Business not found.');
                return false;
            }

            // Warning prompt
            const confirmed = confirm(
                `Are you sure you want to delete "${businesses[bizIndex].name}"?\n\n` +
                `NOTE: This will not delete past sales data, only hide this business from the switcher.`
            );
            if (!confirmed) return false;

            // Mark inactive (soft delete)
            businesses[bizIndex].is_active = false;
            this.saveBusinessesList(businesses);

            // If deleted business was active, switch to another active business
            const currentId = this.getCurrentBusinessId();
            if (String(businessId) === String(currentId)) {
                const nextActive = businesses.find(b => b.is_active !== false);
                if (nextActive) {
                    this.switchBusiness(nextActive.id);
                    return true;
                }
            }

            return true;
        }
    }

    // Create singleton instance
    window.BusinessManager = new POSBusinessManager();

    // ============================================================
    // UI: TOP NAVIGATION BUSINESS SWITCHER & MODAL INJECTION
    // ============================================================

    function injectBusinessStyles() {
        if (document.getElementById('pos-business-switcher-styles')) return;

        const style = document.createElement('style');
        style.id = 'pos-business-switcher-styles';
        style.textContent = `
            /* Top Navbar Business Switcher */
            .business-switcher-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
                margin-left: 0.5rem;
                z-index: 1000;
            }
            .business-switcher-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-light, #e2e8f0);
                color: var(--text-primary, #0f172a);
                padding: 0.35rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                max-width: 220px;
                white-space: nowrap;
            }
            .business-switcher-btn:hover {
                background: var(--bg-main, #f8fafc);
                border-color: var(--accent-primary, #333333);
                transform: translateY(-1px);
            }
            [data-theme="dark"] .business-switcher-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.3);
            }
            .business-active-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 140px;
            }
            .business-badge {
                font-size: 0.65rem;
                font-weight: 700;
                padding: 0.15rem 0.45rem;
                border-radius: 9999px;
                text-transform: uppercase;
                letter-spacing: 0.03em;
            }
            .business-badge-vat {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            .business-badge-pan {
                background: rgba(59, 130, 246, 0.15);
                color: #2563eb;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            .business-chevron {
                transition: transform 0.2s ease;
                color: var(--text-muted, #64748b);
                flex-shrink: 0;
            }
            .business-switcher-wrapper.open .business-chevron {
                transform: rotate(180deg);
            }

            /* Dropdown Menu */
            .business-dropdown-menu {
                position: absolute;
                top: calc(100% + 6px);
                left: 0;
                min-width: 280px;
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-light, #e2e8f0);
                border-radius: 0.75rem;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                padding: 0.5rem;
                z-index: 10000;
                display: none;
                animation: bizFadeIn 0.15s ease-out;
            }
            @keyframes bizFadeIn {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .business-dropdown-header {
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--text-muted, #64748b);
                padding: 0.4rem 0.75rem 0.25rem;
                letter-spacing: 0.05em;
            }
            .business-dropdown-list {
                max-height: 260px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .business-dropdown-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.55rem 0.75rem;
                border-radius: 0.5rem;
                cursor: pointer;
                border: 1px solid transparent;
                background: transparent;
                color: var(--text-primary, #0f172a);
                text-align: left;
                width: 100%;
                font-size: 0.85rem;
                font-weight: 500;
                transition: all 0.15s ease;
                user-select: none;
            }
            .business-dropdown-item:hover {
                background: rgba(16, 185, 129, 0.08);
                color: var(--text-primary, #0f172a);
            }
            [data-theme="dark"] .business-dropdown-item:hover {
                background: rgba(16, 185, 129, 0.14);
                color: #ffffff;
            }
            .business-dropdown-item.active {
                background: rgba(16, 185, 129, 0.1);
                border-color: rgba(16, 185, 129, 0.35);
                font-weight: 600;
            }
            .business-dropdown-item.active:hover {
                background: rgba(16, 185, 129, 0.22);
                border-color: rgba(16, 185, 129, 0.5);
            }
            [data-theme="dark"] .business-dropdown-item.active {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.4);
            }
            [data-theme="dark"] .business-dropdown-item.active:hover {
                background: rgba(16, 185, 129, 0.28);
                border-color: rgba(16, 185, 129, 0.6);
            }
            .business-item-left {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                overflow: hidden;
            }
            .business-radio-indicator {
                font-size: 1rem;
                line-height: 1;
                color: var(--text-muted, #94a3b8);
            }
            .business-dropdown-item.active .business-radio-indicator {
                color: #10b981;
            }
            .business-item-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .business-dropdown-footer {
                border-top: 1px solid var(--border-light, #e2e8f0);
                margin-top: 0.4rem;
                padding-top: 0.4rem;
            }
            .btn-add-business-dropdown {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.4rem;
                width: 100%;
                padding: 0.5rem;
                background: transparent;
                border: 1px dashed var(--border-light, #cbd5e1);
                border-radius: 0.5rem;
                color: var(--accent-primary, #333333);
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .btn-add-business-dropdown:hover {
                background: var(--bg-main, #f1f5f9);
                border-color: var(--accent-primary, #333333);
            }

            /* Add / Edit Business Modal Styles */
            .biz-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: bizFadeIn 0.2s ease-out;
            }
            .biz-modal-box {
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-light, #e2e8f0);
                border-radius: 1rem;
                max-width: 520px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
            }
            .biz-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--border-light, #e2e8f0);
                padding-bottom: 0.75rem;
            }
            .biz-modal-title {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
            }
            .biz-modal-close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                line-height: 1;
                cursor: pointer;
                color: var(--text-muted, #64748b);
            }
            .biz-modal-close-btn:hover {
                color: var(--text-primary, #0f172a);
            }
            .biz-form-group {
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
            }
            .biz-form-group label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-secondary, #334155);
            }
            .biz-form-input {
                padding: 0.6rem 0.8rem;
                border: 1px solid var(--border-light, #cbd5e1);
                border-radius: 0.5rem;
                background: var(--bg-primary, #ffffff);
                color: var(--text-primary, #0f172a);
                font-size: 0.9rem;
                font-family: inherit;
            }
            .biz-form-input:focus {
                outline: none;
                border-color: var(--accent-primary, #333333);
                box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
            }
            .biz-type-toggle-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                background: var(--bg-main, #f1f5f9);
                padding: 0.35rem;
                border-radius: 0.6rem;
            }
            .biz-type-option {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.4rem;
                padding: 0.55rem;
                border-radius: 0.45rem;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            .biz-type-option input {
                display: none;
            }
            .biz-type-option.selected {
                background: var(--bg-card, #ffffff);
                color: var(--text-primary, #0f172a);
                box-shadow: 0 2px 4px rgba(0,0,0,0.06);
            }
            .biz-modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.75rem;
                border-top: 1px solid var(--border-light, #e2e8f0);
                padding-top: 1rem;
            }

            /* Responsive tweaks */
            @media (max-width: 640px) {
                .business-switcher-btn {
                    max-width: 160px;
                    padding: 0.3rem 0.5rem;
                    font-size: 0.75rem;
                }
                .business-active-name {
                    max-width: 75px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function renderBusinessSwitcherDOM() {
        injectBusinessStyles();

        // Check if switcher already exists in header
        if (document.getElementById('businessSwitcherWrapper')) {
            updateBusinessSwitcherState();
            return;
        }

        // Find top bar header logo or hamburger button
        const topBar = document.querySelector('.top-bar') || document.querySelector('header');
        if (!topBar) return;

        const currentBiz = window.BusinessManager.getCurrentBusiness();
        if (!currentBiz) {
            // STEP 1: If 0 businesses exist, trigger "Add Your First Business"
            showAddFirstBusinessModal();
            return;
        }

        const isPan = currentBiz.registration_type === 'pan';
        const typeBadge = isPan ? 'PAN' : 'VAT';
        const badgeClass = isPan ? 'business-badge-pan' : 'business-badge-vat';

        const wrapper = document.createElement('div');
        wrapper.className = 'business-switcher-wrapper';
        wrapper.id = 'businessSwitcherWrapper';

        wrapper.innerHTML = `
            <button type="button" class="business-switcher-btn" id="businessSwitcherBtn" title="Switch Business">
                <span class="business-active-name" id="businessActiveName">${escapeHTML(currentBiz.name)}</span>
                <span class="business-badge ${badgeClass}" id="businessActiveBadge">${typeBadge}</span>
                <svg class="business-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </button>
            <div class="business-dropdown-menu" id="businessDropdownMenu">
                <div class="business-dropdown-header">Switch Business</div>
                <div class="business-dropdown-list" id="businessDropdownList"></div>
                <div class="business-dropdown-footer">
                    <button type="button" class="btn-add-business-dropdown" id="btnAddBusinessDropdown">
                        <span>+</span> Add New Business
                    </button>
                </div>
            </div>
        `;

        // Insert after logo-text or hamburger button if found
        const logo = topBar.querySelector('.logo-text') || topBar.querySelector('h1');
        if (logo && logo.parentNode) {
            logo.parentNode.insertBefore(wrapper, logo.nextSibling);
        } else {
            topBar.prepend(wrapper);
        }

        // Dropdown toggle
        const btn = wrapper.querySelector('#businessSwitcherBtn');
        const menu = wrapper.querySelector('#businessDropdownMenu');
        const addBtn = wrapper.querySelector('#btnAddBusinessDropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.style.display === 'block';
            closeAllDropdowns();
            if (!isOpen) {
                populateDropdownList();
                menu.style.display = 'block';
                wrapper.classList.add('open');
            }
        });

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            wrapper.classList.remove('open');
            openBusinessModal();
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                menu.style.display = 'none';
                wrapper.classList.remove('open');
            }
        });
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.business-dropdown-menu').forEach(m => m.style.display = 'none');
        document.querySelectorAll('.business-switcher-wrapper').forEach(w => w.classList.remove('open'));
    }

    function populateDropdownList() {
        const listContainer = document.getElementById('businessDropdownList');
        if (!listContainer) return;

        const businesses = window.BusinessManager.getBusinesses(false);
        const currentBiz = window.BusinessManager.getCurrentBusiness();
        const currentId = currentBiz ? currentBiz.id : '';

        listContainer.innerHTML = '';

        businesses.forEach(biz => {
            const isActive = String(biz.id) === String(currentId);
            const isPan = biz.registration_type === 'pan';
            const typeBadge = isPan ? 'PAN' : 'VAT';
            const badgeClass = isPan ? 'business-badge-pan' : 'business-badge-vat';
            const radioSymbol = isActive ? '●' : '○';

            const item = document.createElement('button');
            item.type = 'button';
            item.className = `business-dropdown-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="business-item-left">
                    <span class="business-radio-indicator">${radioSymbol}</span>
                    <span class="business-item-name">${escapeHTML(biz.name)}</span>
                </div>
                <span class="business-badge ${badgeClass}">${typeBadge}</span>
            `;

            item.addEventListener('click', () => {
                if (!isActive) {
                    window.BusinessManager.switchBusiness(biz.id);
                }
            });

            listContainer.appendChild(item);
        });
    }

    function updateBusinessSwitcherState() {
        const currentBiz = window.BusinessManager.getCurrentBusiness();
        if (!currentBiz) return;

        const nameEl = document.getElementById('businessActiveName');
        const badgeEl = document.getElementById('businessActiveBadge');
        if (nameEl) nameEl.textContent = currentBiz.name;
        if (badgeEl) {
            const isPan = currentBiz.registration_type === 'pan';
            badgeEl.textContent = isPan ? 'PAN' : 'VAT';
            badgeEl.className = `business-badge ${isPan ? 'business-badge-pan' : 'business-badge-vat'}`;
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ============================================================
    // MODAL: ADD / EDIT BUSINESS (WITH CONDITIONAL PAN/VAT BOX)
    // ============================================================

    function openBusinessModal(editBizId = null, isFirstBusiness = false) {
        injectBusinessStyles();
        let existingModal = document.getElementById('posBusinessModalOverlay');
        if (existingModal) existingModal.remove();

        const editBiz = editBizId ? window.BusinessManager.getBusinessById(editBizId) : null;
        const isEdit = !!editBiz;

        const defaultRegType = editBiz ? editBiz.registration_type : 'vat';
        const modalTitle = isFirstBusiness
            ? 'Add Your First Business'
            : (isEdit ? 'Edit Business Profile' : 'Add New Business');

        const overlay = document.createElement('div');
        overlay.className = 'biz-modal-overlay';
        overlay.id = 'posBusinessModalOverlay';

        overlay.innerHTML = `
            <div class="biz-modal-box">
                <div class="biz-modal-header">
                    <h2 class="biz-modal-title">${modalTitle}</h2>
                    ${isFirstBusiness ? '' : '<button type="button" class="biz-modal-close-btn" id="btnBizModalClose">&times;</button>'}
                </div>

                <form id="bizModalForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="biz-form-group">
                        <label>Business Name *</label>
                        <input type="text" id="bizModalName" class="biz-form-input" placeholder="e.g. Karki Store" required value="${escapeHTML(editBiz?.name || '')}">
                    </div>

                    <div class="biz-form-group">
                        <label>Registration Type</label>
                        <div class="biz-type-toggle-container">
                            <label class="biz-type-option ${defaultRegType === 'pan' ? 'selected' : ''}" id="lblBizTypePan">
                                <input type="radio" name="bizModalRegType" value="pan" ${defaultRegType === 'pan' ? 'checked' : ''}>
                                <span>PAN Only</span>
                            </label>
                            <label class="biz-type-option ${defaultRegType === 'vat' ? 'selected' : ''}" id="lblBizTypeVat">
                                <input type="radio" name="bizModalRegType" value="vat" ${defaultRegType === 'vat' ? 'checked' : ''}>
                                <span>VAT Registered</span>
                            </label>
                        </div>
                    </div>

                    <div class="biz-form-group" id="bizModalPanGroup" style="display: ${defaultRegType === 'pan' ? 'flex' : 'none'};">
                        <label>PAN Number *</label>
                        <input type="text" id="bizModalPan" class="biz-form-input" placeholder="e.g. 123456789 (9 digits)" maxlength="9" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 9)" ${defaultRegType === 'pan' ? 'required' : ''} value="${escapeHTML(editBiz?.pan_no || '')}">
                    </div>

                    <div class="biz-form-group" id="bizModalVatGroup" style="display: ${defaultRegType === 'vat' ? 'flex' : 'none'};">
                        <label>VAT Number *</label>
                        <input type="text" id="bizModalVat" class="biz-form-input" placeholder="e.g. 123456789 (9 digits)" maxlength="9" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 9)" ${defaultRegType === 'vat' ? 'required' : ''} value="${escapeHTML(editBiz?.vat_no || editBiz?.pan_no || '')}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div class="biz-form-group">
                            <label>Address</label>
                            <input type="text" id="bizModalAddress" class="biz-form-input" placeholder="e.g. Thali, Kathmandu" value="${escapeHTML(editBiz?.address || '')}">
                        </div>
                        <div class="biz-form-group">
                            <label>Phone</label>
                            <input type="text" id="bizModalPhone" class="biz-form-input" placeholder="e.g. 9841234567" value="${escapeHTML(editBiz?.phone || '')}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div class="biz-form-group">
                            <label>Bill Prefix</label>
                            <input type="text" id="bizModalPrefix" class="biz-form-input" placeholder="e.g. TH" value="${escapeHTML(editBiz?.bill_prefix || '')}">
                        </div>
                        <div class="biz-form-group">
                            <label>Starting Bill No</label>
                            <input type="number" id="bizModalStartingNo" class="biz-form-input" placeholder="1" value="${editBiz?.starting_no || 1}">
                        </div>
                    </div>

                    <div class="biz-form-group">
                        <label>Footer Message</label>
                        <input type="text" id="bizModalFooter" class="biz-form-input" placeholder="e.g. Thank you for your visit!" value="${escapeHTML(editBiz?.footer || 'Thank you for your visit!')}">
                    </div>

                    <div class="biz-modal-footer">
                        ${isFirstBusiness ? '' : '<button type="button" class="btn btn-secondary" id="btnBizModalCancel" style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light); background: transparent; cursor: pointer;">Cancel</button>'}
                        <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.25rem; border-radius: 0.5rem; background: var(--accent-primary); color: var(--text-on-accent, #fff); font-weight: 600; border: none; cursor: pointer;">
                            ${isEdit ? 'Save Changes' : 'Create Business'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        // Registration type toggle listener
        const panLbl = overlay.querySelector('#lblBizTypePan');
        const vatLbl = overlay.querySelector('#lblBizTypeVat');
        const panGroup = overlay.querySelector('#bizModalPanGroup');
        const vatGroup = overlay.querySelector('#bizModalVatGroup');
        const panInput = overlay.querySelector('#bizModalPan');
        const vatInput = overlay.querySelector('#bizModalVat');

        panLbl.addEventListener('click', () => {
            panLbl.classList.add('selected');
            vatLbl.classList.remove('selected');
            panLbl.querySelector('input').checked = true;
            if (panGroup) panGroup.style.display = 'flex';
            if (vatGroup) vatGroup.style.display = 'none';
            if (panInput && vatInput && vatInput.value && !panInput.value) panInput.value = vatInput.value;
            if (panInput) panInput.required = true;
            if (vatInput) vatInput.required = false;
        });

        vatLbl.addEventListener('click', () => {
            vatLbl.classList.add('selected');
            panLbl.classList.remove('selected');
            vatLbl.querySelector('input').checked = true;
            if (panGroup) panGroup.style.display = 'none';
            if (vatGroup) vatGroup.style.display = 'flex';
            if (vatInput && panInput && panInput.value && !vatInput.value) vatInput.value = panInput.value;
            if (panInput) panInput.required = false;
            if (vatInput) vatInput.required = true;
        });

        if (panInput && vatInput) {
            panInput.addEventListener('input', () => {
                panInput.value = panInput.value.replace(/[^0-9]/g, '').slice(0, 9);
                vatInput.value = panInput.value;
            });
            vatInput.addEventListener('input', () => {
                vatInput.value = vatInput.value.replace(/[^0-9]/g, '').slice(0, 9);
                panInput.value = vatInput.value;
            });
        }

        const closeBtn = overlay.querySelector('#btnBizModalClose');
        const cancelBtn = overlay.querySelector('#btnBizModalCancel');
        const closeModal = () => overlay.remove();

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Handle form submission
        const form = overlay.querySelector('#bizModalForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const isPan = overlay.querySelector('input[name="bizModalRegType"]:checked').value === 'pan';
            const name = overlay.querySelector('#bizModalName').value.trim();
            const panNo = overlay.querySelector('#bizModalPan').value.trim();
            const vatNo = overlay.querySelector('#bizModalVat').value.trim();
            const address = overlay.querySelector('#bizModalAddress').value.trim();
            const phone = overlay.querySelector('#bizModalPhone').value.trim();
            const prefix = overlay.querySelector('#bizModalPrefix').value.trim();
            const startingNo = parseInt(overlay.querySelector('#bizModalStartingNo').value, 10) || 1;
            const footer = overlay.querySelector('#bizModalFooter').value.trim();

            const saved = window.BusinessManager.saveBusiness({
                id: editBiz ? editBiz.id : undefined,
                name,
                registration_type: isPan ? 'pan' : 'vat',
                pan_no: panNo,
                vat_no: vatNo,
                address,
                phone,
                bill_prefix: prefix,
                starting_no: startingNo,
                footer,
                is_modal_submit: true
            });

            if (saved) {
                closeModal();
                // If on settings page, refresh the manage businesses list
                if (typeof renderManageBusinessesSection === 'function') {
                    renderManageBusinessesSection();
                }
                // Switch to newly created or reload
                window.BusinessManager.switchBusiness(saved.id);
            }
        });
    }

    function showAddFirstBusinessModal() {
        openBusinessModal(null, true);
    }

    // Export modal function globally
    window.openBusinessModal = openBusinessModal;

    // Auto-mount switcher on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBusinessSwitcherDOM);
    } else {
        renderBusinessSwitcherDOM();
    }
})();
