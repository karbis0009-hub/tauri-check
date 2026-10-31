

function onBusinessTypeChange() {
    const isPanOnly = document.getElementById('bizTypePan')?.checked;
    const panVatGroup = document.getElementById('panVatGroup');
    const panOnlyGroup = document.getElementById('panOnlyGroup');
    const vatInvoiceTitleGroup = document.getElementById('vatInvoiceTitleGroup');
    const panBillTitleGroup = document.getElementById('panBillTitleGroup');
    const invoiceFormatHeading = document.getElementById('invoiceFormatHeading');

    // Keep PAN and VAT numbers identical when switching business registration types
    const panInput = document.getElementById('storePan');
    const vatInput = document.getElementById('storeVat');
    const regVal = (panInput?.value || vatInput?.value || '').trim();
    if (panInput && regVal) panInput.value = regVal;
    if (vatInput && regVal) vatInput.value = regVal;

    if (isPanOnly) {
        if (panVatGroup) panVatGroup.style.display = 'none';
        if (panOnlyGroup) panOnlyGroup.style.display = 'block';
        if (vatInvoiceTitleGroup) vatInvoiceTitleGroup.style.display = 'none';
        if (panBillTitleGroup) panBillTitleGroup.style.display = 'block';
        if (invoiceFormatHeading) invoiceFormatHeading.textContent = 'Bill Format';
        const vatFontSizeVal = document.getElementById('vatFontSize')?.value || 10;
        const panOnlyFontSize = document.getElementById('panOnlyFontSize');
        if (panOnlyFontSize) panOnlyFontSize.value = vatFontSizeVal;
        const titleFontSizeVal = document.getElementById('abbreviatedTaxInvoiceFontSize')?.value || 10;
        const panBillFontSize = document.getElementById('panBillFontSize');
        if (panBillFontSize) panBillFontSize.value = titleFontSizeVal;
    } else {
        if (panVatGroup) panVatGroup.style.display = 'block';
        if (panOnlyGroup) panOnlyGroup.style.display = 'none';
        if (vatInvoiceTitleGroup) vatInvoiceTitleGroup.style.display = 'block';
        if (panBillTitleGroup) panBillTitleGroup.style.display = 'none';
        if (invoiceFormatHeading) invoiceFormatHeading.textContent = 'Invoice Format';
        const panFontSizeVal = document.getElementById('panOnlyFontSize')?.value || 10;
        const vatFontSize = document.getElementById('vatFontSize');
        if (vatFontSize && panFontSizeVal) vatFontSize.value = panFontSizeVal;
        const panTitleFontSizeVal = document.getElementById('panBillFontSize')?.value || 10;
        const abbrevFontSize = document.getElementById('abbreviatedTaxInvoiceFontSize');
        if (abbrevFontSize && panTitleFontSizeVal) abbrevFontSize.value = panTitleFontSizeVal;
    }
}

// Settings Manager

const STORAGE_SETTINGS_KEY = 'pos_settings';

const defaultSettings = {
    businessType: 'vat_registered',
    storeName: 'K Pos',
    address: '123 Food Street, Tasty City',
    phone: '9876543210',
    wordsLabel: 'In Words',
    wordsFontSize: 9.5,
    footer: 'Thank you for your visit!',
    panNo: '',
    vatNo: '',
    vatLabelType: 'PAN',
    storeNameFontSize: 30,
    addressFontSize: 10,
    phoneFontSize: 10,
    vatFontSize: 10,
    footerFontSize: 8,
    snFontSize: 10,
    particularsFontSize: 10,
    qtyFontSize: 10,
    rateFontSize: 10,
    amtFontSize: 10,
    baseFontSize: 10,
    headerFontSize: 16,
    lineHeight: 1.4,
    paperWidth: 58,
    billFormat: 'prefix',
    billPrefix: 'TH',
    startingNo: 1,
    snLabel: 'Sn',
    particularsLabel: 'Particulars',
    qtyLabel: 'Qty',
    rateLabel: 'Rate',
    amtLabel: 'Amt',
    fiscalYear: '082/83',
    abbreviatedTaxInvoiceLabel: 'ABBREVIATED TAX INVOICE',
    abbreviatedTaxInvoiceFontSize: 10,
    taxInvoiceLabel: 'TAX INVOICE',
    taxInvoiceFontSize: 10,
    panBillLabel: 'BILL',
    panBillFontSize: 10,
    paymentQRs: []
};

// --- IRD Preview Helpers ---
function numberToWords(num) {
    if (num === 0) return 'Zero only.';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : ' ');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        return '';
    }
    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    const wordsText = inWords(whole).trim().replace(/\s+/g, ' ');
    let str = wordsText + ' Rupees ';
    if (fraction > 0) str += 'and ' + fraction + '/100 Paisa ';
    return str + 'only.';
}



function updatePreview() {
    const preview = document.getElementById('receiptPreview');
    if (!preview) return;

    const isPanOnly = document.getElementById('bizTypePan')?.checked;
    const storeName = (document.getElementById('storeName')?.value || '').trim() || 'Store Name';
    const address = (document.getElementById('storeAddress')?.value || '').trim();
    const panVal = (document.getElementById('storePan')?.value || '').trim();
    const vatVal = (document.getElementById('storeVat')?.value || '').trim();
    const vat = isPanOnly ? panVal : vatVal;
    const phone = (document.getElementById('storePhone')?.value || '').trim();
    const footerText = document.getElementById('footerText')?.value !== undefined ? document.getElementById('footerText').value : 'Thank you for your visit!';
    const baseSize = document.getElementById('baseFontSize')?.value || 10;
    const lHeight = document.getElementById('lineHeight')?.value || 1.4;
    const pWidth = Math.max(40, parseFloat(document.getElementById('paperWidth')?.value) || 58);
    const snLab = document.getElementById('snLabel')?.value || 'S.N.';
    const partLab = document.getElementById('particularsLabel')?.value || 'Particulars';
    const qtyLab = document.getElementById('qtyLabel')?.value || 'Qty';
    const rateLab = document.getElementById('rateLabel')?.value || 'Rate';
    const amtLab = document.getElementById('amtLabel')?.value || 'Amt';
    const readSize = (id, fallback) => {
        const value = parseFloat(document.getElementById(id)?.value);
        return Number.isFinite(value) ? value : fallback;
    };
    const storeNameFitSize = ((pWidth - 6) * 3.78) / (Math.max(storeName.length, 1) * 0.78);
    const autoHeaderSize = Math.min(46, pWidth * 0.52, storeNameFitSize);
    const headerSize = Math.max(4, Math.min(storeNameFitSize, readSize('storeNameFontSize', autoHeaderSize)));
    const headerInfoSize = Math.max(7, Math.min(24, pWidth * 0.3));
    const addressSize = Math.max(7, Math.min(24, readSize('addressFontSize', headerInfoSize)));
    const phoneSize = Math.max(7, Math.min(24, readSize('phoneFontSize', headerInfoSize)));
    const vatSize = Math.max(7, Math.min(24, readSize('vatFontSize', headerInfoSize)));
    const autoBillTitleSize = Math.max(10, Math.min(18, pWidth * 0.21));
    const isTaxPreview = window._previewTitleType === 'tax';
    let currentTitleText = 'BILL';
    let billTitleSize = 10;
    if (isPanOnly) {
        currentTitleText = (document.getElementById('panBillLabel')?.value || 'BILL').trim() || 'BILL';
        billTitleSize = Math.max(7, Math.min(24, readSize('panBillFontSize', readSize('abbreviatedTaxInvoiceFontSize', autoBillTitleSize))));
    } else {
        currentTitleText = isTaxPreview
            ? (document.getElementById('taxInvoiceLabel')?.value || 'TAX INVOICE')
            : (document.getElementById('abbreviatedTaxInvoiceLabel')?.value || 'ABBREVIATED TAX INVOICE');
        billTitleSize = Math.max(7, Math.min(24, readSize('abbreviatedTaxInvoiceFontSize', autoBillTitleSize)));
    }
    const metaSize = Math.max(8, Math.min(13.5, pWidth * 0.165));
    const wordsLab = (document.getElementById('wordsLabel')?.value || 'In Words').trim() || 'In Words';
    const wordsSize = Math.max(7, Math.min(24, readSize('wordsFontSize', Math.max(7, Math.min(12, pWidth * 0.14)))));
    const footerSize = Math.max(7, Math.min(24, readSize('footerFontSize', Math.max(7, Math.min(12, pWidth * 0.14)))));
    const partLabText = String(partLab || 'Particulars').trim();
    const partFitSize = ((pWidth * 0.37 - 1) * 3.78) / (Math.max(partLabText.length, 1) * 0.62);
    const thSize = Math.max(7, Math.min(12.5, pWidth * 0.15, partFitSize));
    const tdSize = Math.max(7.5, Math.min(12.5, pWidth * 0.15));
    const snSize = Math.max(7, Math.min(24, readSize('snFontSize', thSize)));
    const particularsSize = Math.max(7, Math.min(24, readSize('particularsFontSize', thSize)));
    const qtySize = Math.max(7, Math.min(24, readSize('qtyFontSize', thSize)));
    const rateSize = Math.max(7, Math.min(24, readSize('rateFontSize', thSize)));
    const amtSize = Math.max(7, Math.min(24, readSize('amtFontSize', thSize)));

    preview.style.fontSize = baseSize + 'px';
    preview.style.lineHeight = lHeight;
    preview.style.width = pWidth + 'mm';
    preview.style.boxSizing = 'border-box';
    preview.style.minHeight = '140mm';
    preview.style.margin = '0 auto';
    preview.style.border = '1px solid #ddd';
    preview.style.padding = '10px';
    preview.style.color = '#000';
    preview.style.background = '#fff';
    preview.style.fontFamily = "'Courier New', monospace";
    preview.style.wordBreak = 'normal';
    preview.style.overflowWrap = 'break-word';
    preview.style.overflowX = 'hidden';
    preview.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';

    const dashedLine = `<div style="border-top: 1px dashed black; margin: 5px 0 8px 0;"></div>`;
    const simpleDashedLine = `<div style="border-top: 1px dashed black; margin: 4px 0;"></div>`;

    const vatLabelType = isPanOnly ? 'PAN' : 'VAT';

    preview.innerHTML = `
        <div style="text-align: center; margin-bottom: 4px; padding-top: 4px;">
            <div style="font-family: Arial, Helvetica, sans-serif; font-size: ${headerSize}px; line-height: 1.05; margin-top: 2px; margin-bottom: 3px; font-weight: 800; letter-spacing: 0; word-break: normal; overflow-wrap: normal; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: clip;">${storeName}</div>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size: ${addressSize}px; margin-bottom: 2px; font-weight: 400; word-break: normal; overflow-wrap: break-word; white-space: normal;">${address}</div>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size: ${phoneSize}px; margin-bottom: 2px; font-weight: 400; word-break: normal; overflow-wrap: break-word; white-space: normal;">Tel : <span>${phone}</span></div>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size: ${vatSize}px; margin-bottom: 4px; font-weight: 400; word-break: normal; overflow-wrap: break-word; white-space: normal;">${vatLabelType} No : <span style="font-weight:normal;">${vat}</span></div>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size: ${billTitleSize}px; font-weight: 600; letter-spacing: 0.5px; word-spacing: 2px; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase;">${currentTitleText}</div>
        </div>

        ${dashedLine}

        <table id="settingsPreviewMeta" style="width: 100%; font-size: ${metaSize}px; border-collapse: collapse; font-family: inherit; line-height: 1.15; table-layout: fixed;">
            <tr>
                <td style="width: 30%; vertical-align: top; padding: 0.5px 0;">Bill Date</td>
                <td style="width: 4%; text-align: center; vertical-align: top; padding: 0.5px 0;">:</td>
                <td style="width: 66%; vertical-align: top; padding: 0.5px 0;">
                    <span style="font-style: normal; white-space: normal; overflow-wrap: anywhere;">(2083/05/13 BS) 10:10:52</span><br>
                    <span style="font-style: normal; white-space: normal; overflow-wrap: anywhere;">AM (8/29/2026 AD)</span>
                </td>
            </tr>
            <tr>
                <td style="width: 30%; padding: 0.5px 0;">Bill No</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">146-TH-83/84</td>
            </tr>
             <tr>
                <td style="width: 30%; padding: 0.5px 0;">Bill To</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">bijal karki</td>
            </tr>
            <tr>
                <td style="width: 30%; padding: 0.5px 0;">Address</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">Kathmandu</td>
            </tr>
               <tr>
                <td style="width: 30%; padding: 0.5px 0;">Phone No</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">99990000</td>
            </tr> 
              <tr>
                <td style="width: 30%; padding: 0.5px 0;">PAN No</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">66666666</td>
            </tr>
           
            <tr>
                <td style="width: 30%; padding: 0.5px 0;">Payment</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">CASH</td>
            </tr>
            <tr>
                <td style="width: 30%; padding: 0.5px 0;">Cashier</td>
                <td style="width: 4%; text-align: center; padding: 0.5px 0;">:</td>
                <td style="width: 66%; padding: 0.5px 0;">Prajwol</td>
            </tr>
        </table>

        <div style="border-top: 1px dashed black; margin: 4px 0 0 0;"></div>

        <table style="width: 100%; font-size: ${thSize}px; border-collapse: collapse; font-family: inherit; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 4px 1px 4px 0; text-align: left; width: 7%; font-size: ${snSize}px; font-weight: normal; color: black; text-transform: none !important; white-space: nowrap;">${snLab}</th>
                    <th style="padding: 4px 2px 4px 0; text-align: left; width: 37%; font-size: ${particularsSize}px; font-weight: normal; color: black; text-transform: none !important; white-space: nowrap;">${partLab}</th>
                    <th style="padding: 4px 2px; text-align: right; width: 17%; font-size: ${qtySize}px; font-weight: normal; color: black; text-transform: none !important; white-space: nowrap;">${qtyLab}</th>
                    <th style="padding: 4px 2px; text-align: right; width: 18%; font-size: ${rateSize}px; font-weight: normal; color: black; text-transform: none !important; white-space: nowrap;">${rateLab}</th>
                    <th style="padding: 4px 0 4px 2px; text-align: right; width: 21%; font-size: ${amtSize}px; font-weight: normal; color: black; text-transform: none !important; white-space: nowrap;">${amtLab}</th>
                </tr>
            </thead>
            <tbody style="font-size: ${tdSize}px;">
                <tr><td colspan="5"><div style="border-top: 1px dashed black;"></div></td></tr>
                <tr>
                    <td style="width: 7%; vertical-align: top; padding: 3px 1px 3px 0; text-align: left;">1</td>
                    <td style="width: 37%; vertical-align: top; padding: 3px 2px 3px 0; text-align: left; word-break: break-word;">Sugar 1kg</td>
                    <td style="width: 17%; text-align: right; vertical-align: top; padding: 3px 2px; white-space: nowrap;">1.00</td>
                    <td style="width: 18%; text-align: right; vertical-align: top; padding: 3px 2px; white-space: nowrap;">110.00</td>
                    <td style="width: 21%; text-align: right; vertical-align: top; padding: 3px 0 3px 2px; white-space: nowrap;">110.00</td>
                </tr>
                <tr><td colspan="5"><div style="border-top: 1px dashed black;"></div></td></tr>
            </tbody>
        </table>

        <div style="width: 70%; margin-left: 30%; border-top: 1px dashed black; margin-top: 5px;"></div>

        <table style="width: 70%; margin-left: 30%; font-size: ${tdSize}px; border-collapse: collapse; font-family: inherit; table-layout: fixed;">
            <tr style="font-weight: normal;">
                <td style="width: 70%; text-align: left; padding: 2px 0; line-height: 1.1;">Net Amount</td>
                <td style="width: 5%; text-align: center; padding: 2px 0;">:</td>
                <td style="width: 25%; text-align: right; padding: 2px 0; white-space: nowrap;">110.00</td>
            </tr>
            <tr style="font-weight: normal;">
                <td style="text-align: left; padding: 2px 0; line-height: 1.1;">Tender</td>
                <td style="text-align: center; padding: 2px 0;">:</td>
                <td style="text-align: right; padding: 2px 0; white-space: nowrap;">110.00</td>
            </tr>
            <tr style="font-weight: normal;">
                <td style="text-align: left; padding: 2px 0; line-height: 1.1;">Change</td>
                <td style="text-align: center; padding: 2px 0;">:</td>
                <td style="text-align: right; padding: 2px 0; white-space: nowrap;">0.00</td>
            </tr>
        </table>

        <div style="width: 70%; margin-left: 30%; border-top: 1px dashed black; margin: 2px 0 3px 30%;"></div>

        <table style="width: 70%; margin-left: 30%; font-size: ${tdSize}px; border-collapse: collapse; font-family: inherit; table-layout: fixed;">
            <tr style="font-weight: normal;">
                <td style="width: 70%; text-align: left; padding: 2px 0; line-height: 1.1;">Total Qty</td>
                <td style="width: 5%; text-align: center; padding: 2px 0;">:</td>
                <td style="width: 25%; text-align: right; padding: 2px 0; white-space: nowrap;">1.00</td>
            </tr>
        </table>

        <div style="font-size: ${wordsSize}px; line-height: 1.1; margin: 2px 0; word-break: normal; overflow-wrap: break-word; white-space: normal;">
            <span style="font-weight: normal;">${wordsLab}: </span><span style="line-height: 1.1; font-size: ${wordsSize}px; word-break: normal; overflow-wrap: break-word; white-space: normal;">One Thousand One Hundred and Sixty Rupees only.</span>
        </div>

        <div style="border-top: 1px dashed black; margin: 3px 0 2px 0;"></div>

        <div style="text-align: center; margin-top: 0px; font-size: ${footerSize}px; margin-bottom: 1px; white-space: pre-wrap; word-break: normal; overflow-wrap: break-word;">${footerText}</div>
        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>
    `;
}

function renderManageBusinessesSection() {
    const container = document.getElementById('settingsBusinessesList');
    if (!container || !window.BusinessManager) return;

    const businesses = window.BusinessManager.getBusinesses(true);
    const currentBiz = window.BusinessManager.getCurrentBusiness();
    const currentId = currentBiz ? currentBiz.id : '';

    container.innerHTML = '';

    if (businesses.length === 0) {
        container.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:0.5rem;">No businesses created yet.</div>';
        return;
    }

    businesses.forEach(biz => {
        const isActive = String(biz.id) === String(currentId);
        const isPan = biz.registration_type === 'pan';
        const typeBadge = isPan ? 'PAN' : 'VAT';
        const badgeColor = isPan ? '#2563eb' : '#059669';
        const badgeBg = isPan ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)';
        const cardBg = isActive ? 'var(--bg-card, #ffffff)' : 'var(--bg-primary, #ffffff)';
        const borderColor = isActive ? 'var(--accent-primary, #333)' : 'var(--border-light, #e2e8f0)';

        const item = document.createElement('div');
        item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid ${borderColor}; border-radius: 0.5rem; background: ${cardBg}; box-shadow: ${isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}; flex-wrap: wrap; gap: 0.5rem;`;

        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.2rem; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${biz.name}</span>
                    <span style="font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}40;">${typeBadge}</span>
                    ${isActive ? '<span style="font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 0.3rem; background: var(--accent-primary); color: var(--text-on-accent, #fff);">ACTIVE</span>' : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    ${biz.pan_no ? `<span><strong>PAN:</strong> ${biz.pan_no}</span>` : ''}
                    ${biz.vat_no ? `<span><strong>VAT:</strong> ${biz.vat_no}</span>` : ''}
                    ${biz.address ? `<span><strong>Addr:</strong> ${biz.address}</span>` : ''}
                    ${biz.phone ? `<span><strong>Tel:</strong> ${biz.phone}</span>` : ''}
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.4rem;">
                ${!isActive && biz.is_active !== false ? `
                    <button type="button" class="btn btn-secondary" onclick="window.BusinessManager.switchBusiness('${biz.id}')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 0.35rem; cursor: pointer;">
                        Switch to this
                    </button>
                ` : ''}
                <button type="button" class="btn btn-secondary" onclick="openBusinessModal('${biz.id}')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 0.35rem; cursor: pointer;">
                    Edit
                </button>
                ${businesses.filter(b => b.is_active !== false).length > 1 && biz.is_active !== false ? `
                    <button type="button" class="btn btn-secondary" onclick="deleteBusinessFromSettings('${biz.id}')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 0.35rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); cursor: pointer;">
                        Delete
                    </button>
                ` : ''}
            </div>
        `;

        container.appendChild(item);
    });
}

function deleteBusinessFromSettings(bizId) {
    if (window.BusinessManager && window.BusinessManager.deleteBusiness(bizId)) {
        renderManageBusinessesSection();
    }
}
window.deleteBusinessFromSettings = deleteBusinessFromSettings;
window.renderManageBusinessesSection = renderManageBusinessesSection;

function switchSettingsTab(tabName) {
    const tabGeneral = document.getElementById('settingsTabGeneral');
    const tabBusinesses = document.getElementById('settingsTabBusinesses');
    const btnGeneral = document.getElementById('tabBtnGeneral');
    const btnBusinesses = document.getElementById('tabBtnBusinesses');

    if (tabName === 'businesses') {
        if (tabGeneral) tabGeneral.style.display = 'none';
        if (tabBusinesses) tabBusinesses.style.display = 'block';
        if (btnGeneral) btnGeneral.classList.remove('active');
        if (btnBusinesses) btnBusinesses.classList.add('active');
        renderManageBusinessesSection();
    } else {
        if (tabGeneral) tabGeneral.style.display = 'block';
        if (tabBusinesses) tabBusinesses.style.display = 'none';
        if (btnGeneral) btnGeneral.classList.add('active');
        if (btnBusinesses) btnBusinesses.classList.remove('active');
        loadSettings();
    }
}
window.switchSettingsTab = switchSettingsTab;

function applySettingsToForm(finalSettings) {
    if (!finalSettings) return;

    const bizType = finalSettings.businessType || 'vat_registered';
    const isPan = bizType === 'pan_only';

    if (isPan) {
        if (document.getElementById('bizTypePan')) document.getElementById('bizTypePan').checked = true;
        if (document.getElementById('bizTypeVat')) document.getElementById('bizTypeVat').checked = false;
    } else {
        if (document.getElementById('bizTypeVat')) document.getElementById('bizTypeVat').checked = true;
        if (document.getElementById('bizTypePan')) document.getElementById('bizTypePan').checked = false;
    }
    onBusinessTypeChange();

    if (document.getElementById('storeName')) {
        document.getElementById('storeName').value = finalSettings.storeName !== undefined ? finalSettings.storeName : '';
    }
    if (document.getElementById('storeAddress')) {
        document.getElementById('storeAddress').value = finalSettings.address !== undefined ? finalSettings.address : '';
    }
    if (document.getElementById('storePhone')) {
        document.getElementById('storePhone').value = finalSettings.phone !== undefined ? finalSettings.phone : '';
    }
    const regNumber = (finalSettings.panNo || finalSettings.vatNoActual || finalSettings.vatNo || '').trim();
    if (document.getElementById('storePan')) {
        document.getElementById('storePan').value = regNumber;
    }
    if (document.getElementById('storeVat')) {
        document.getElementById('storeVat').value = regNumber;
    }
    if (document.getElementById('vatLabelType')) {
        document.getElementById('vatLabelType').value = isPan ? 'PAN' : 'VAT';
    }
    if (document.getElementById('wordsLabel')) {
        document.getElementById('wordsLabel').value = finalSettings.wordsLabel !== undefined ? finalSettings.wordsLabel : 'In Words';
    }
    if (document.getElementById('wordsFontSize')) {
        document.getElementById('wordsFontSize').value = finalSettings.wordsFontSize || 9.5;
    }
    if (document.getElementById('footerText')) {
        document.getElementById('footerText').value = finalSettings.footer !== undefined ? finalSettings.footer : '';
    }
    if (document.getElementById('storeNameFontSize')) {
        document.getElementById('storeNameFontSize').value = finalSettings.storeNameFontSize || 30;
    }
    if (document.getElementById('addressFontSize')) {
        document.getElementById('addressFontSize').value = finalSettings.addressFontSize || 10;
    }
    if (document.getElementById('phoneFontSize')) {
        document.getElementById('phoneFontSize').value = finalSettings.phoneFontSize || 10;
    }
    if (document.getElementById('vatFontSize')) {
        document.getElementById('vatFontSize').value = finalSettings.vatFontSize || 10;
    }
    if (document.getElementById('panOnlyFontSize')) {
        document.getElementById('panOnlyFontSize').value = finalSettings.vatFontSize || 10;
    }
    if (document.getElementById('footerFontSize')) {
        document.getElementById('footerFontSize').value = finalSettings.footerFontSize || 8;
    }

    if (document.getElementById('baseFontSize')) {
        document.getElementById('baseFontSize').value = finalSettings.baseFontSize || 10;
    }
    if (document.getElementById('headerFontSize')) {
        document.getElementById('headerFontSize').value = finalSettings.headerFontSize || 16;
    }
    if (document.getElementById('lineHeight')) {
        document.getElementById('lineHeight').value = finalSettings.lineHeight || 1.4;
    }
    if (document.getElementById('paperWidth')) {
        document.getElementById('paperWidth').value = finalSettings.paperWidth || 58;
    }

    if (document.getElementById('billFormat')) {
        document.getElementById('billFormat').value = finalSettings.billFormat || 'prefix';
    }
    if (document.getElementById('billPrefix')) {
        document.getElementById('billPrefix').value = finalSettings.billPrefix !== undefined ? finalSettings.billPrefix : 'TH';
    }
    if (document.getElementById('startingBillNo')) {
        document.getElementById('startingBillNo').value = finalSettings.startingNo !== undefined ? finalSettings.startingNo : 1;
    }

    if (document.getElementById('snLabel')) {
        document.getElementById('snLabel').value = finalSettings.snLabel || 'S.N.';
    }
    if (document.getElementById('particularsLabel')) {
        document.getElementById('particularsLabel').value = finalSettings.particularsLabel || 'Particulars';
    }
    if (document.getElementById('qtyLabel')) {
        document.getElementById('qtyLabel').value = finalSettings.qtyLabel || 'Qty';
    }
    if (document.getElementById('rateLabel')) {
        document.getElementById('rateLabel').value = finalSettings.rateLabel || 'Rate';
    }
    if (document.getElementById('amtLabel')) {
        document.getElementById('amtLabel').value = finalSettings.amtLabel || 'Amt';
    }
    if (document.getElementById('snFontSize')) {
        document.getElementById('snFontSize').value = finalSettings.snFontSize || 10;
    }
    if (document.getElementById('particularsFontSize')) {
        document.getElementById('particularsFontSize').value = finalSettings.particularsFontSize || 10;
    }
    if (document.getElementById('qtyFontSize')) {
        document.getElementById('qtyFontSize').value = finalSettings.qtyFontSize || 10;
    }
    if (document.getElementById('rateFontSize')) {
        document.getElementById('rateFontSize').value = finalSettings.rateFontSize || 10;
    }
    if (document.getElementById('amtFontSize')) {
        document.getElementById('amtFontSize').value = finalSettings.amtFontSize || 10;
    }
    if (document.getElementById('fiscalYear')) {
        document.getElementById('fiscalYear').value = finalSettings.fiscalYear || '082/83';
    }
    if (document.getElementById('abbreviatedTaxInvoiceLabel')) {
        document.getElementById('abbreviatedTaxInvoiceLabel').value = finalSettings.abbreviatedTaxInvoiceLabel || 'ABBREVIATED TAX INVOICE';
    }
    if (document.getElementById('abbreviatedTaxInvoiceFontSize')) {
        document.getElementById('abbreviatedTaxInvoiceFontSize').value = finalSettings.abbreviatedTaxInvoiceFontSize || finalSettings.taxInvoiceFontSize || 10;
    }
    if (document.getElementById('taxInvoiceLabel')) {
        document.getElementById('taxInvoiceLabel').value = finalSettings.taxInvoiceLabel || 'TAX INVOICE';
    }
    if (document.getElementById('panBillLabel')) {
        document.getElementById('panBillLabel').value = finalSettings.panBillLabel || 'BILL';
    }
    if (document.getElementById('panBillFontSize')) {
        document.getElementById('panBillFontSize').value = finalSettings.panBillFontSize || finalSettings.abbreviatedTaxInvoiceFontSize || 10;
    }

    updatePreview();
}

function loadSettings() {
    if (window.BusinessManager && typeof window.BusinessManager.syncSettingsWithCurrentBusiness === 'function') {
        window.BusinessManager.syncSettingsWithCurrentBusiness();
    }
    renderManageBusinessesSection();

    const curBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : null;
    let localSettings = {};
    try {
        localSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
    } catch (e) {
        localSettings = {};
    }

    const buildSettingsFromBusiness = (biz, base) => {
        let res = Object.assign({}, defaultSettings, base || {});
        if (biz) {
            const isPan = biz.registration_type === 'pan' || biz.business_type === 'pan_only' || biz.registrationType === 'pan';
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

            res.businessType = isPan ? 'pan_only' : 'vat_registered';
            res.storeName = name;
            res.address = address;
            res.phone = phone;
            res.panNo = regNumber;
            res.vatNoActual = regNumber;
            res.vatNo = regNumber;
            res.vatLabelType = isPan ? 'PAN' : 'VAT';
            res.footer = footer;
            res.billPrefix = billPrefix;
            res.startingNo = startingNo;
            res.fiscalYear = fiscalYear;
        }
        return res;
    };

    // Immediately populate synchronously from current business & localStorage
    let syncSettings = buildSettingsFromBusiness(curBiz, localSettings);
    applySettingsToForm(syncSettings);

    // Fetch any API settings and merge
    window.posAPI.getAllSettings()
        .then(settings => {
            const freshBiz = window.BusinessManager ? window.BusinessManager.getCurrentBusiness() : curBiz;
            let freshLocal = {};
            try {
                freshLocal = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
            } catch (e) {
                freshLocal = {};
            }
            let finalSettings = buildSettingsFromBusiness(freshBiz, Object.assign({}, defaultSettings, settings || {}, freshLocal));
            applySettingsToForm(finalSettings);

            // Backward compat: migrate old formats to new {image, label} objects
            let qrList = finalSettings.paymentQRs || [];
            if (!Array.isArray(qrList)) qrList = [];
            // Migrate old single paymentQR string
            if (qrList.length === 0 && finalSettings.paymentQR) {
                qrList = [{ image: finalSettings.paymentQR, label: '' }];
            }
            // Migrate old string-only array items to objects
            qrList = qrList.map(item => {
                if (typeof item === 'string') return { image: item, label: '' };
                return item;
            });
            window._paymentQRs = qrList;
            renderQRGrid();
        })
        .catch(() => {});
}

// Auto-Save Implementation
const debounceTimers = {};
const statusTimers = {};

function getFieldLabelElement(fieldIdOrElement) {
    const el = typeof fieldIdOrElement === 'string' ? document.getElementById(fieldIdOrElement) : fieldIdOrElement;
    if (!el) {
        if (fieldIdOrElement === 'businessType') {
            const panEl = document.getElementById('bizTypePan');
            return panEl ? panEl.closest('.form-group')?.querySelector('.form-label') : null;
        }
        if (fieldIdOrElement === 'qrGrid') {
            const qrHeader = document.querySelector('#qrGrid')?.closest('.form-group')?.previousElementSibling;
            return qrHeader || document.querySelector('#qrGrid')?.closest('.form-group')?.querySelector('.form-label');
        }
        return null;
    }

    if (el.name === 'businessType' || el.id === 'bizTypePan' || el.id === 'bizTypeVat') {
        const group = document.getElementById('bizTypePan')?.closest('.form-group');
        return group ? group.querySelector('.form-label') : null;
    }

    const formGroup = el.closest('.form-group');
    if (formGroup) {
        const label = formGroup.querySelector('.form-label');
        if (label) return label;
    }

    return el.parentElement?.querySelector('label') || el.closest('label');
}

function showFieldStatus(fieldId, type, text) {
    const label = getFieldLabelElement(fieldId);
    if (!label) return;

    let indicator = label.querySelector('.save-status-indicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'save-status-indicator';
        label.appendChild(indicator);
    }

    if (statusTimers[fieldId]) {
        clearTimeout(statusTimers[fieldId]);
    }

    indicator.textContent = text || (type === 'success' ? '✓ Saved' : '⚠ Required');
    indicator.className = `save-status-indicator ${type}`;
    indicator.style.opacity = '1';

    if (type === 'success') {
        statusTimers[fieldId] = setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.style.opacity === '0') {
                    indicator.textContent = '';
                }
            }, 300);
        }, 2000);
    }
}

function autoSaveSingleField(fieldId) {
    if (fieldId === 'storeName') {
        const nameVal = (document.getElementById('storeName')?.value || '').trim();
        if (!nameVal) {
            showFieldStatus('storeName', 'error', '⚠ Required');
            return false;
        }
    }

    let localSettings = {};
    try {
        localSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
    } catch (e) {
        localSettings = {};
    }

    const isPanOnly = document.getElementById('bizTypePan')?.checked;
    const panVal = (document.getElementById('storePan')?.value || '').trim();
    const vatVal = (document.getElementById('storeVat')?.value || '').trim();
    const regVal = panVal || vatVal;

    const currentSettings = {
        ...defaultSettings,
        ...localSettings,
        businessType: isPanOnly ? 'pan_only' : 'vat_registered',
        storeName: document.getElementById('storeName')?.value !== undefined ? document.getElementById('storeName').value : (localSettings.storeName || defaultSettings.storeName),
        address: document.getElementById('storeAddress')?.value !== undefined ? document.getElementById('storeAddress').value : (localSettings.address || defaultSettings.address),
        phone: document.getElementById('storePhone')?.value !== undefined ? document.getElementById('storePhone').value : (localSettings.phone || defaultSettings.phone),
        panNo: regVal,
        vatNoActual: regVal,
        vatNo: regVal,
        vatLabelType: isPanOnly ? 'PAN' : 'VAT',
        wordsLabel: document.getElementById('wordsLabel')?.value !== undefined ? document.getElementById('wordsLabel').value : (localSettings.wordsLabel || 'In Words'),
        wordsFontSize: parseFloat(document.getElementById('wordsFontSize')?.value) || localSettings.wordsFontSize || 9.5,
        footer: document.getElementById('footerText')?.value !== undefined ? document.getElementById('footerText').value : (localSettings.footer || defaultSettings.footer),
        storeNameFontSize: parseFloat(document.getElementById('storeNameFontSize')?.value) || localSettings.storeNameFontSize || 30,
        addressFontSize: parseFloat(document.getElementById('addressFontSize')?.value) || localSettings.addressFontSize || 10,
        phoneFontSize: parseFloat(document.getElementById('phoneFontSize')?.value) || localSettings.phoneFontSize || 10,
        vatFontSize: parseFloat(document.getElementById('vatFontSize')?.value || document.getElementById('panOnlyFontSize')?.value) || localSettings.vatFontSize || 10,
        footerFontSize: parseFloat(document.getElementById('footerFontSize')?.value) || localSettings.footerFontSize || 8,
        baseFontSize: parseInt(document.getElementById('baseFontSize')?.value, 10) || localSettings.baseFontSize || 10,
        headerFontSize: parseInt(document.getElementById('headerFontSize')?.value, 10) || localSettings.headerFontSize || 16,
        lineHeight: parseFloat(document.getElementById('lineHeight')?.value) || localSettings.lineHeight || 1.4,
        paperWidth: parseInt(document.getElementById('paperWidth')?.value, 10) || localSettings.paperWidth || 58,
        billFormat: document.getElementById('billFormat')?.value || localSettings.billFormat || 'prefix',
        billPrefix: document.getElementById('billPrefix')?.value || localSettings.billPrefix || 'TH',
        startingNo: parseInt(document.getElementById('startingBillNo')?.value, 10) || localSettings.startingNo || 1,
        snLabel: document.getElementById('snLabel')?.value !== undefined ? document.getElementById('snLabel').value : (localSettings.snLabel || 'Sn'),
        particularsLabel: document.getElementById('particularsLabel')?.value !== undefined ? document.getElementById('particularsLabel').value : (localSettings.particularsLabel || 'Particulars'),
        qtyLabel: document.getElementById('qtyLabel')?.value !== undefined ? document.getElementById('qtyLabel').value : (localSettings.qtyLabel || 'Qty'),
        rateLabel: document.getElementById('rateLabel')?.value !== undefined ? document.getElementById('rateLabel').value : (localSettings.rateLabel || 'Rate'),
        amtLabel: document.getElementById('amtLabel')?.value !== undefined ? document.getElementById('amtLabel').value : (localSettings.amtLabel || 'Amt'),
        snFontSize: parseFloat(document.getElementById('snFontSize')?.value) || localSettings.snFontSize || 10,
        particularsFontSize: parseFloat(document.getElementById('particularsFontSize')?.value) || localSettings.particularsFontSize || 10,
        qtyFontSize: parseFloat(document.getElementById('qtyFontSize')?.value) || localSettings.qtyFontSize || 10,
        rateFontSize: parseFloat(document.getElementById('rateFontSize')?.value) || localSettings.rateFontSize || 10,
        amtFontSize: parseFloat(document.getElementById('amtFontSize')?.value) || localSettings.amtFontSize || 10,
        fiscalYear: document.getElementById('fiscalYear')?.value || localSettings.fiscalYear || '082/83',
        abbreviatedTaxInvoiceLabel: document.getElementById('abbreviatedTaxInvoiceLabel')?.value || localSettings.abbreviatedTaxInvoiceLabel || 'ABBREVIATED TAX INVOICE',
        abbreviatedTaxInvoiceFontSize: parseFloat(document.getElementById('abbreviatedTaxInvoiceFontSize')?.value) || localSettings.abbreviatedTaxInvoiceFontSize || 10,
        taxInvoiceLabel: document.getElementById('taxInvoiceLabel')?.value || localSettings.taxInvoiceLabel || 'TAX INVOICE',
        taxInvoiceFontSize: parseFloat(document.getElementById('abbreviatedTaxInvoiceFontSize')?.value) || localSettings.taxInvoiceFontSize || 10,
        panBillLabel: document.getElementById('panBillLabel')?.value || localSettings.panBillLabel || 'BILL',
        panBillFontSize: parseFloat(document.getElementById('panBillFontSize')?.value) || localSettings.panBillFontSize || 10,
        paymentQRs: window._paymentQRs || localSettings.paymentQRs || []
    };

    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(currentSettings));

    // Also update active business profile in BusinessManager
    if (window.BusinessManager) {
        const curBiz = window.BusinessManager.getCurrentBusiness();
        if (curBiz) {
            window.BusinessManager.saveBusiness({
                id: curBiz.id,
                name: currentSettings.storeName,
                address: currentSettings.address,
                phone: currentSettings.phone,
                registration_type: isPanOnly ? 'pan' : 'vat',
                pan_no: currentSettings.panNo,
                vat_no: currentSettings.vatNoActual,
                footer: currentSettings.footer,
                bill_prefix: currentSettings.billPrefix,
                starting_no: currentSettings.startingNo,
                fiscal_year: currentSettings.fiscalYear
            });
        }
    }

    if (window.posAPI && typeof window.posAPI.saveSetting === 'function') {
        Object.entries(currentSettings).forEach(([k, v]) => {
            window.posAPI.saveSetting(k, v).catch(() => {});
        });
    }

    if (fieldId === 'storeName' && typeof updateSidebarBrand === 'function') {
        updateSidebarBrand();
    }

    if (typeof renderManageBusinessesSection === 'function') {
        renderManageBusinessesSection();
    }

    showFieldStatus(fieldId, 'success', '✓ Saved');
}

// Backward compatibility alias if needed
function saveSettings() {
    autoSaveSingleField('storeName');
}

function init() {
    loadSettings();

    ['abbreviatedTaxInvoiceLabel', 'abbreviatedTaxInvoiceFontSize'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('focus', () => { window._previewTitleType = 'abbreviated'; updatePreview(); });
        }
    });

    ['taxInvoiceLabel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('focus', () => { window._previewTitleType = 'tax'; updatePreview(); });
        }
    });

    // Real-time synchronization between PAN and VAT inputs
    const storePanEl = document.getElementById('storePan');
    const storeVatEl = document.getElementById('storeVat');
    if (storePanEl && storeVatEl) {
        storePanEl.addEventListener('input', () => {
            storePanEl.value = storePanEl.value.replace(/[^0-9]/g, '').slice(0, 9);
            storeVatEl.value = storePanEl.value;
            updatePreview();
        });
        storeVatEl.addEventListener('input', () => {
            storeVatEl.value = storeVatEl.value.replace(/[^0-9]/g, '').slice(0, 9);
            storePanEl.value = storeVatEl.value;
            updatePreview();
        });
    }

    // Text, number, and textarea fields: Debounced auto-save (1000ms)
    const textAndNumberFields = [
        'storeName', 'storeAddress', 'storePhone', 'storePan', 'storeVat',
        'abbreviatedTaxInvoiceLabel', 'taxInvoiceLabel', 'panBillLabel', 'wordsLabel', 'wordsFontSize', 'footerText',
        'fiscalYear', 'billPrefix', 'snLabel', 'particularsLabel', 'qtyLabel', 'rateLabel', 'amtLabel',
        'storeNameFontSize', 'addressFontSize', 'phoneFontSize', 'vatFontSize', 'panOnlyFontSize',
        'abbreviatedTaxInvoiceFontSize', 'panBillFontSize', 'footerFontSize',
        'baseFontSize', 'headerFontSize', 'lineHeight', 'paperWidth', 'startingBillNo',
        'snFontSize', 'particularsFontSize', 'qtyFontSize', 'rateFontSize', 'amtFontSize'
    ];

    textAndNumberFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', () => {
            updatePreview();
            if (id === 'storeName' && !el.value.trim()) {
                showFieldStatus('storeName', 'error', '⚠ Required');
                if (debounceTimers[id]) clearTimeout(debounceTimers[id]);
                return;
            }
            if (debounceTimers[id]) clearTimeout(debounceTimers[id]);
            debounceTimers[id] = setTimeout(() => {
                autoSaveSingleField(id);
            }, 1000);
        });

        el.addEventListener('change', () => {
            updatePreview();
            if (id === 'storeName' && !el.value.trim()) {
                showFieldStatus('storeName', 'error', '⚠ Required');
                return;
            }
            if (debounceTimers[id]) clearTimeout(debounceTimers[id]);
            autoSaveSingleField(id);
        });
    });

    // Dropdown / Radio / Checkbox fields: Instant auto-save on 'change'
    const instantChangeFields = ['bizTypePan', 'bizTypeVat', 'billFormat', 'vatLabelType'];
    instantChangeFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', () => {
            if (id === 'bizTypePan' || id === 'bizTypeVat') {
                onBusinessTypeChange();
            }
            updatePreview();
            autoSaveSingleField(id === 'bizTypePan' || id === 'bizTypeVat' ? 'businessType' : id);
        });
    });
}


function exportData() {
    const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
    };

    const keys = [
        'pos_sales', 'pos_items', 'pos_settings', 'pos_custom_categories',
        'pos_ar_accounts', 'pos_ar_transactions', 'pos_credit_notes',
        'pos_audit_logs', 'pos_cart_state', 'pos_product_order'
    ];

    keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) backup.data[key] = JSON.parse(val);
    });

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function renderQRGrid() {
    const grid = document.getElementById('qrGrid');
    if (!grid) return;
    const qrs = window._paymentQRs || [];

    if (qrs.length === 0) {
        grid.innerHTML = `<div style="width: 100%; padding: 1.5rem; text-align: center; color: var(--text-muted); background: var(--bg-main); border: 1px dashed var(--border-light); border-radius: 0.5rem; font-size: 0.85rem;">No QR codes added yet</div>`;
        return;
    }

    grid.innerHTML = qrs.map((qr, i) => `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; width: 100px;">
            <div style="position: relative; width: 90px; height: 90px; border-radius: 0.5rem; overflow: hidden; border: 1px solid var(--border-light); background: white; flex-shrink: 0;">
                <img src="${qr.image}" style="width: 100%; height: 100%; object-fit: cover;">
                <button onclick="removeQRImage(${i})" style="position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%; background: rgba(239,68,68,0.9); border: none; color: white; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">&times;</button>
            </div>
            <input type="text" value="${(qr.label || '').replace(/"/g, '&quot;')}" placeholder="Label" 
                onchange="updateQRLabel(${i}, this.value)"
                style="width: 100%; padding: 4px 6px; font-size: 0.7rem; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-main); color: var(--text-primary); text-align: center; outline: none;">
        </div>
    `).join('');
}

function updateQRLabel(index, value) {
    if (!window._paymentQRs || !window._paymentQRs[index]) return;
    window._paymentQRs[index].label = value;
    if (debounceTimers['qrGrid']) clearTimeout(debounceTimers['qrGrid']);
    debounceTimers['qrGrid'] = setTimeout(() => {
        autoSaveSingleField('qrGrid');
    }, 1000);
}

function handleQRUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        if (!window._paymentQRs) window._paymentQRs = [];
        window._paymentQRs.push({ image: base64, label: '' });
        renderQRGrid();
        autoSaveSingleField('qrGrid');
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset so same file can be re-selected
}

function removeQRImage(index) {
    if (!window._paymentQRs) return;
    window._paymentQRs.splice(index, 1);
    renderQRGrid();
    autoSaveSingleField('qrGrid');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("This will overwrite your current sales, inventory, and settings with the data from the backup file. Are you sure you want to proceed?")) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.data || typeof backup.data !== 'object') {
                throw new Error("Invalid backup file format.");
            }

            // 1. Update LocalStorage
            Object.entries(backup.data).forEach(([key, val]) => {
                localStorage.setItem(key, JSON.stringify(val));
            });

            // 2. Clear Migration Flags (to re-trigger any necessary migrations on next reload)
            const flags = Object.keys(localStorage).filter(k => k.startsWith('pos_migration_'));
            flags.forEach(f => localStorage.removeItem(f));

            // 3. Optional: Sync to API if available
            // Note: Full server sync is complex and might time out for large datasets.
            // We'll prioritize local restoration and alert the user to check the server.

            alert("Backup imported successfully! The page will now reload to apply changes.");
            window.location.reload();

        } catch (err) {
            console.error("Import failed:", err);
            alert("Failed to import backup: " + err.message);
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);


// Stepper +/- handler
function handleStepper(btn, direction) {
    const stepper = btn.closest('.number-stepper');
    if (!stepper) return;
    const input = stepper.querySelector('input[type="number"]');
    if (!input) return;

    const step = parseFloat(input.step) || 1;
    const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
    const max = input.max !== '' ? parseFloat(input.max) : Infinity;
    let val = parseFloat(input.value);
    if (isNaN(val)) {
        val = (input.min !== '' && !isNaN(parseFloat(input.min))) ? parseFloat(input.min) : 0;
    }

    let newVal = direction === 'up' ? val + step : val - step;
    newVal = Math.round(newVal * 1000) / 1000;
    if (newVal < min) newVal = min;
    if (newVal > max) newVal = max;

    input.value = newVal;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn) return;
    e.preventDefault();
    const isPlus = btn.classList.contains('stepper-plus');
    handleStepper(btn, isPlus ? 'up' : 'down');
});
