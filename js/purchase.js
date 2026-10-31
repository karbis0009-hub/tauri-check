// js/purchase.js
// Handles frontend interactions, grid calculations, autocompletes, and saving of Purchase Invoices.

let inventoryItems = [];
let supplierList = [];
let purchaseHistory = [];
let gridItems = []; // List of active items in the grid
let selectedSupplier = null;

// Initialize purchase page
document.addEventListener('DOMContentLoaded', () => {
    initDates();
    loadActiveCashier();
    initAutocompletes();
    loadNextPINumber();
    loadInventory();
    loadSuppliers();
    loadPurchaseHistory();

    // Add initial blank row to the grid
    addNewGridRow();
});

// --- Date Handling (AD to BS Sync) ---
function initDates() {
    const today = new Date().toISOString().split('T')[0];
    
    const entryAD = document.getElementById('entryDateAD');
    const invoiceAD = document.getElementById('invoiceDateAD');
    
    if (entryAD) {
        entryAD.value = today;
        updateBSText(today, 'entryDateBS');
        entryAD.addEventListener('change', (e) => {
            updateBSText(e.target.value, 'entryDateBS');
        });
    }
    
    if (invoiceAD) {
        invoiceAD.value = today;
        updateBSText(today, 'invoiceDateBS');
        invoiceAD.addEventListener('change', (e) => {
            updateBSText(e.target.value, 'invoiceDateBS');
        });
    }
}

function updateBSText(adDateStr, targetBSId) {
    const targetEl = document.getElementById(targetBSId);
    if (!targetEl || !adDateStr) return;
    
    if (typeof window.convertToBS === 'function') {
        const bsStr = window.convertToBS(adDateStr + 'T00:00:00');
        targetEl.value = bsStr || '';
    } else {
        targetEl.value = adDateStr; // Fallback
    }
}

// --- Load Initial Data ---
async function loadNextPINumber() {
    try {
        const res = await window.posAPI.getNextPINumber();
        document.getElementById('piNo').value = res.nextNo || 'PI1-MUL-082/83';
    } catch (err) {
        console.error('Failed to load next PI number:', err);
        document.getElementById('piNo').value = 'PI1-MUL-082/83';
    }
}

async function loadInventory() {
    try {
        const res = await window.posAPI.getAllInventory();
        inventoryItems = Array.isArray(res) ? res : [];
    } catch (err) {
        console.error('Failed to load inventory:', err);
        inventoryItems = [];
    }
}

async function loadSuppliers() {
    // Collect supplier list from previously saved purchase invoices to suggest them
    try {
        const res = await window.posAPI.getAllPurchases();
        purchaseHistory = Array.isArray(res) ? res : [];
        
        const uniqSuppliers = new Set();
        purchaseHistory.forEach(p => {
            if (p.supplier) uniqSuppliers.add(JSON.stringify({
                name: p.supplier,
                address: p.address || '',
                vatNo: p.vatNo || ''
            }));
        });
        
        supplierList = Array.from(uniqSuppliers).map(s => JSON.parse(s));
    } catch (err) {
        console.error('Failed to load suppliers:', err);
    }
}

// --- Cashier Selection (Matching POS flow) ---
function loadActiveCashier() {
    const activeCashier = localStorage.getItem('pos_active_cashier') || 'Administrator';
    const activeEl = document.getElementById('activeCashierName');
    if (activeEl) activeEl.textContent = activeCashier;
}

// --- Autocomplete Functionality ---
function initAutocompletes() {
    // 1. Supplier Autocomplete
    const supplierInput = document.getElementById('supplier');
    const supplierSuggestions = document.getElementById('supplierSuggestions');
    if (!supplierInput || !supplierSuggestions) return;
    
    supplierInput.addEventListener('input', () => {
        const query = supplierInput.value.toLowerCase().trim();
        supplierSuggestions.innerHTML = '';
        if (!query) {
            supplierSuggestions.style.display = 'none';
            return;
        }
        
        const filtered = supplierList.filter(s => s.name.toLowerCase().includes(query));
        if (filtered.length === 0) {
            supplierSuggestions.style.display = 'none';
            return;
        }
        
        filtered.forEach(s => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'suggestion-item';
            itemDiv.innerHTML = `<span><strong>${s.name}</strong></span><span class="stock">${s.address}</span>`;
            itemDiv.addEventListener('mousedown', () => {
                supplierInput.value = s.name;
                document.getElementById('address').value = s.address || '';
                document.getElementById('vatNo').value = s.vatNo || '';
                supplierSuggestions.style.display = 'none';
            });
            supplierSuggestions.appendChild(itemDiv);
        });
        
        supplierSuggestions.style.display = 'block';
    });
    
    supplierInput.addEventListener('blur', () => {
        setTimeout(() => { supplierSuggestions.style.display = 'none'; }, 200);
    });

    // 2. Quick Item Search Autocomplete
    const itemNameInput = document.getElementById('itemName');
    const itemSuggestions = document.getElementById('itemSuggestions');
    if (!itemNameInput || !itemSuggestions) return;
    let selectedItemFromSuggest = null;
    
    itemNameInput.addEventListener('input', () => {
        const query = itemNameInput.value.toLowerCase().trim();
        itemSuggestions.innerHTML = '';
        if (!query) {
            itemSuggestions.style.display = 'none';
            return;
        }
        
        const filtered = inventoryItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            String(item.barcode || '').toLowerCase().includes(query) ||
            String(item.id || '').toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            itemSuggestions.style.display = 'none';
            return;
        }
        
        filtered.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'suggestion-item';
            itemDiv.innerHTML = `<span>${item.name} (${item.id})</span><span class="stock">Stock: ${item.stock || 0}</span>`;
            itemDiv.addEventListener('mousedown', () => {
                itemNameInput.value = item.name;
                document.getElementById('itemBarcode').value = item.barcode || '';
                document.getElementById('itemStock').value = item.stock || 0;
                document.getElementById('itemRate').value = parseFloat(item.price || 0).toFixed(2);
                selectedItemFromSuggest = item;
                itemSuggestions.style.display = 'none';
                document.getElementById('itemQty').focus();
            });
            itemSuggestions.appendChild(itemDiv);
        });
        
        itemSuggestions.style.display = 'block';
    });

    itemNameInput.addEventListener('blur', () => {
        setTimeout(() => { itemSuggestions.style.display = 'none'; }, 200);
    });
}

// Handle Barcode scanner input in quick bar
function handleBarcodeScan(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = e.target.value.trim();
        if (!barcode) return;
        
        const item = inventoryItems.find(i => i.barcode === barcode || i.id === barcode);
        if (item) {
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemStock').value = item.stock || 0;
            document.getElementById('itemRate').value = parseFloat(item.price || 0).toFixed(2);
            document.getElementById('itemQty').focus();
        } else {
            alert('Product not found in inventory. Please add it first.');
        }
    }
}

// Quick Add item button click
function quickAddItem() {
    const barcodeInput = document.getElementById('itemBarcode');
    const nameInput = document.getElementById('itemName');
    const qtyInput = document.getElementById('itemQty');
    const rateInput = document.getElementById('itemRate');
    const stockInput = document.getElementById('itemStock');

    const barcode = barcodeInput.value.trim();
    const name = nameInput.value.trim();
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const stock = parseFloat(stockInput.value) || 0;

    if (!name) {
        alert('Please select or scan an item first.');
        nameInput.focus();
        return;
    }

    if (qty <= 0) {
        alert('Quantity must be greater than 0.');
        qtyInput.focus();
        return;
    }

    // Find if it exists in inventory cache to retrieve the actual ID/code
    const item = inventoryItems.find(i => i.name === name || i.barcode === barcode);
    const itemId = item ? item.id : 'CUSTOM';
    const itemCode = item ? item.id : 'N/A';
    const hsCode = '';

    // Add to our grid items
    const gridItemObj = {
        id: itemId,
        code: itemCode,
        hsCode: hsCode,
        barcode: barcode,
        name: name,
        unit: 'Pcs',
        qty: qty,
        rate: rate,
        discountPct: 0,
        discountAmt: 0,
        vatType: '13%',
        mfgDate: '',
        expDate: ''
    };

    // Remove any completely blank row at the start if it is empty
    if (gridItems.length === 1 && !gridItems[0].name) {
        gridItems = [];
    }

    gridItems.push(gridItemObj);
    
    // Clear quick add fields
    barcodeInput.value = '';
    nameInput.value = '';
    qtyInput.value = '1';
    rateInput.value = '0.00';
    stockInput.value = '0';

    renderGrid();
    calculateTotals();
    barcodeInput.focus();
}

// --- Payment Terms Change Handler ---
function handlePaymentTermsChange() {
    const terms = document.getElementById('paymentTerms').value;
    const chequeInput = document.getElementById('chequeNo');
    if (terms === 'Bank') {
        chequeInput.disabled = false;
        chequeInput.placeholder = 'Chq # / mm-dd-yyyy';
        chequeInput.focus();
    } else {
        chequeInput.disabled = true;
        chequeInput.value = '';
        chequeInput.placeholder = 'Chq No & Date';
    }
}

// --- Grid Table Handlers ---
function addNewGridRow() {
    gridItems.push({
        id: 'CUSTOM_' + Date.now(),
        code: '',
        hsCode: '',
        barcode: '',
        name: '',
        unit: 'Pcs',
        qty: 0,
        rate: 0,
        discountPct: 0,
        discountAmt: 0,
        vatType: '13%',
        mfgDate: '',
        expDate: ''
    });
    renderGrid();
}

function removeGridRow(index) {
    gridItems.splice(index, 1);
    if (gridItems.length === 0) {
        addNewGridRow();
    } else {
        renderGrid();
    }
    calculateTotals();
}

function updateRowField(index, field, value) {
    const item = gridItems[index];
    if (!item) return;

    if (field === 'qty' || field === 'rate' || field === 'discountPct' || field === 'discountAmt') {
        item[field] = parseFloat(value) || 0;
    } else {
        item[field] = value;
    }

    // Recalculate row amounts if rates/qtys change
    if (field === 'qty' || field === 'rate') {
        // If discountPct exists, recalculate discountAmt
        if (item.discountPct > 0) {
            item.discountAmt = (item.qty * item.rate) * (item.discountPct / 100);
        }
    } else if (field === 'discountPct') {
        item.discountAmt = (item.qty * item.rate) * (item.discountPct / 100);
    } else if (field === 'discountAmt') {
        const gross = item.qty * item.rate;
        item.discountPct = gross > 0 ? (item.discountAmt / gross) * 100 : 0;
    }

    // Trigger UI updates
    const rowEl = document.getElementById(`row-${index}`);
    if (rowEl) {
        const amountInput = rowEl.querySelector('.col-amount');
        const netAmtInput = rowEl.querySelector('.col-net-amt');
        const netRateInput = rowEl.querySelector('.col-net-rate');
        const disPctInput = rowEl.querySelector('.col-dis-pct');
        const disAmtInput = rowEl.querySelector('.col-dis-amt');

        const amount = item.qty * item.rate;
        if (amountInput) amountInput.value = amount.toFixed(2);
        if (disPctInput && field !== 'discountPct') disPctInput.value = item.discountPct.toFixed(2);
        if (disAmtInput && field !== 'discountAmt') disAmtInput.value = item.discountAmt.toFixed(2);

        // Net Amount & Rate calculation
        const disAmt = item.discountAmt;
        const taxable = amount - disAmt;
        let vat = 0;
        if (item.vatType === '13%') {
            vat = taxable * 0.13;
        }
        const netAmt = taxable + vat;
        const netRate = item.qty > 0 ? netAmt / item.qty : 0;

        if (netAmtInput) netAmtInput.value = netAmt.toFixed(2);
        if (netRateInput) netRateInput.value = netRate.toFixed(2);
    }

    calculateTotals();
}

function handleParticularSelect(index, inputVal) {
    const query = inputVal.toLowerCase().trim();
    const suggestDiv = document.getElementById(`grid-suggest-${index}`);
    if (!suggestDiv) return;

    suggestDiv.innerHTML = '';
    if (!query) {
        suggestDiv.style.display = 'none';
        return;
    }

    const filtered = inventoryItems.filter(item => 
        item.name.toLowerCase().includes(query) || 
        String(item.barcode || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        suggestDiv.style.display = 'none';
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const itemPrice = parseFloat(item.price || item.rate || item.purchasePrice || 0);
        div.innerHTML = `<span>${item.name}</span><span class="stock">Price: ${itemPrice.toFixed(2)}</span>`;
        div.addEventListener('mousedown', () => {
            gridItems[index].id = item.id;
            gridItems[index].code = item.id;
            gridItems[index].name = item.name;
            gridItems[index].barcode = item.barcode || '';
            gridItems[index].rate = itemPrice;
            gridItems[index].qty = 1;

            suggestDiv.style.display = 'none';
            renderGrid();
            calculateTotals();
        });
        suggestDiv.appendChild(div);
    });

    suggestDiv.style.display = 'block';
}

function hideParticularSelect(index) {
    setTimeout(() => {
        const suggestDiv = document.getElementById(`grid-suggest-${index}`);
        if (suggestDiv) suggestDiv.style.display = 'none';
    }, 200);
}

// Render the main table grid based on gridItems state
function renderGrid() {
    const tbody = document.getElementById('purchaseGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    gridItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.id = `row-${index}`;

        const amount = item.qty * item.rate;
        const taxable = amount - item.discountAmt;
        let vat = 0;
        if (item.vatType === '13%') {
            vat = taxable * 0.13;
        }
        const netAmt = taxable + vat;
        const netRate = item.qty > 0 ? netAmt / item.qty : 0;

        tr.innerHTML = `
            <td style="text-align: center; font-weight: bold; color: var(--text-muted);">${index + 1}</td>
            <td><input type="text" value="${item.code || ''}" placeholder="Code" onchange="updateRowField(${index}, 'code', this.value)"></td>
            <td><input type="text" value="${item.hsCode || ''}" placeholder="HS" onchange="updateRowField(${index}, 'hsCode', this.value)"></td>
            <td><input type="text" value="${item.barcode || ''}" placeholder="Barcode" onchange="updateRowField(${index}, 'barcode', this.value)"></td>
            <td class="autocomplete-wrapper">
                <input type="text" value="${item.name || ''}" placeholder="Press ENTER or type to select item..." 
                    oninput="handleParticularSelect(${index}, this.value); updateRowField(${index}, 'name', this.value);" 
                    onblur="hideParticularSelect(${index})"
                    onchange="updateRowField(${index}, 'name', this.value)">
                <div id="grid-suggest-${index}" class="autocomplete-suggestions" style="display: none;"></div>
            </td>
            <td>
                <select onchange="updateRowField(${index}, 'unit', this.value)">
                    <option value="Pcs" ${item.unit === 'Pcs' ? 'selected' : ''}>Pcs</option>
                    <option value="Kg" ${item.unit === 'Kg' ? 'selected' : ''}>Kg</option>
                    <option value="Ltr" ${item.unit === 'Ltr' ? 'selected' : ''}>Ltr</option>
                    <option value="Box" ${item.unit === 'Box' ? 'selected' : ''}>Box</option>
                    <option value="Pack" ${item.unit === 'Pack' ? 'selected' : ''}>Pack</option>
                </select>
            </td>
            <td><input type="number" class="col-qty" value="${item.qty}" min="0" step="any" oninput="updateRowField(${index}, 'qty', this.value)"></td>
            <td><input type="number" class="col-rate" value="${item.rate.toFixed(2)}" min="0" step="any" oninput="updateRowField(${index}, 'rate', this.value)"></td>
            <td><input type="text" class="col-amount" value="${amount.toFixed(2)}" readonly></td>
            <td><input type="number" class="col-dis-pct" value="${item.discountPct.toFixed(2)}" min="0" max="100" step="any" oninput="updateRowField(${index}, 'discountPct', this.value)"></td>
            <td><input type="number" class="col-dis-amt" value="${item.discountAmt.toFixed(2)}" min="0" step="any" oninput="updateRowField(${index}, 'discountAmt', this.value)"></td>
            <td>
                <select class="col-vat" onchange="updateRowField(${index}, 'vatType', this.value)">
                    <option value="13%" ${item.vatType === '13%' ? 'selected' : ''}>13%</option>
                    <option value="0%" ${item.vatType === '0%' ? 'selected' : ''}>0%</option>
                    <option value="Non-Taxable" ${item.vatType === 'Non-Taxable' ? 'selected' : ''}>Non-Taxable</option>
                </select>
            </td>
            <td><input type="text" class="col-net-amt" value="${netAmt.toFixed(2)}" readonly></td>
            <td><input type="text" class="col-net-rate" value="${netRate.toFixed(2)}" readonly></td>
            <td><input type="date" value="${item.mfgDate || ''}" onchange="updateRowField(${index}, 'mfgDate', this.value)"></td>
            <td><input type="date" value="${item.expDate || ''}" onchange="updateRowField(${index}, 'expDate', this.value)"></td>
            <td style="text-align: center;">
                <button class="btn-icon" onclick="removeGridRow(${index})" title="Remove item">
                    &times;
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById('gridRowsCount').textContent = `${gridItems.filter(i => i.name).length} items in list`;
}

// Calculate totals from all rows
function calculateTotals() {
    let tQty = 0;
    let tGross = 0;
    let tDiscount = 0;
    let tTaxable = 0;
    let tNonTaxable = 0;
    let tVat = 0;
    let tNet = 0;

    gridItems.forEach(item => {
        if (!item.name) return; // Skip blank rows
        
        tQty += item.qty;
        const gross = item.qty * item.rate;
        tGross += gross;
        
        const disc = item.discountAmt;
        tDiscount += disc;

        const taxableBase = gross - disc;
        if (item.vatType === '13%') {
            tTaxable += taxableBase;
            tVat += taxableBase * 0.13;
        } else {
            tNonTaxable += taxableBase;
        }
    });

    tNet = tTaxable + tNonTaxable + tVat;

    // Set UI elements
    document.getElementById('totalQty').textContent = tQty.toFixed(3);
    document.getElementById('grossTotal').textContent = 'Rs. ' + tGross.toFixed(2);
    document.getElementById('totalDiscount').textContent = 'Rs. ' + tDiscount.toFixed(2);
    document.getElementById('taxableAmount').textContent = 'Rs. ' + tTaxable.toFixed(2);
    document.getElementById('nonTaxableAmount').textContent = 'Rs. ' + tNonTaxable.toFixed(2);
    document.getElementById('vatTotal').textContent = 'Rs. ' + tVat.toFixed(2);
    document.getElementById('netAmount').textContent = 'Rs. ' + tNet.toFixed(2);
}

// Reset/Clear entry screen form
function resetForm() {
    if (confirm('Are you sure you want to clear the current invoice fields?')) {
        document.getElementById('invoiceNo').value = '';
        document.getElementById('remarks').value = '';
        document.getElementById('supplier').value = '';
        document.getElementById('address').value = '';
        document.getElementById('vatNo').value = '';
        document.getElementById('chequeNo').value = '';
        
        gridItems = [];
        addNewGridRow();
        calculateTotals();
        initDates();
        loadNextPINumber();
    }
}

// --- Save Invoice Operation ---
async function savePurchaseInvoice() {
    const piNo = document.getElementById('piNo').value;
    const entryDateAD = document.getElementById('entryDateAD').value;
    const entryDateBS = document.getElementById('entryDateBS').value;
    const invoiceNo = document.getElementById('invoiceNo').value;
    const invoiceDateAD = document.getElementById('invoiceDateAD').value;
    const invoiceDateBS = document.getElementById('invoiceDateBS').value;
    const purchaseType = document.getElementById('purchaseType').value;
    const paymentTerms = document.getElementById('paymentTerms').value;
    const account = document.getElementById('account').value;
    const chequeNo = document.getElementById('chequeNo').value;
    const godown = document.getElementById('godown').value;
    const supplierName = document.getElementById('supplier').value.trim();
    const address = document.getElementById('address').value.trim();
    const vatNo = document.getElementById('vatNo').value.trim();
    const remarks = document.getElementById('remarks').value.trim();

    // Sync any directly-typed values from the DOM back into gridItems before validation
    const tbody = document.getElementById('purchaseGridBody');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (!gridItems[index]) return;
            // Sync name from particular input
            const nameInput = row.querySelector('td.autocomplete-wrapper input[type="text"]');
            if (nameInput && nameInput.value.trim()) {
                gridItems[index].name = nameInput.value.trim();
            }
            // Sync qty from col-qty input
            const qtyInput = row.querySelector('input.col-qty');
            if (qtyInput) {
                const qtyVal = parseFloat(qtyInput.value);
                if (!isNaN(qtyVal)) gridItems[index].qty = qtyVal;
            }
            // Sync rate from col-rate input
            const rateInput = row.querySelector('input.col-rate');
            if (rateInput) {
                const rateVal = parseFloat(rateInput.value);
                if (!isNaN(rateVal)) gridItems[index].rate = rateVal;
            }
        });
    }

    // Filters out blank grid items
    const items = gridItems.filter(i => i.name && i.qty > 0);

    if (!supplierName) {
        alert('Please specify a Supplier.');
        document.getElementById('supplier').focus();
        return;
    }

    // Verify that the Nepali BS dates are within 2082/2083 (82/83)
    const validateBSDate = (dateStr, fieldName) => {
        if (!dateStr) return true;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const isValid = (year === 2082 && month >= 4) || (year === 2083 && month <= 3);
            if (!isValid) {
                alert(`${fieldName} must be within the fiscal year 82/83 BS.`);
                return false;
            }
        }
        return true;
    };

    if (!validateBSDate(entryDateBS, 'Entry Date (BS)')) {
        document.getElementById('entryDateAD').focus();
        return;
    }
    if (!validateBSDate(invoiceDateBS, 'Invoice Date (BS)')) {
        document.getElementById('invoiceDateAD').focus();
        return;
    }

    if (items.length === 0) {
        // Give a more specific message about what's missing
        const hasNames = gridItems.some(i => i.name);
        const hasQtys = gridItems.some(i => i.qty > 0);
        if (!hasNames) {
            alert('Please add at least one product to the invoice grid.');
        } else if (!hasQtys) {
            alert('Please enter a quantity greater than zero for at least one product.');
        } else {
            alert('Please add at least one product with a name AND quantity greater than zero.');
        }
        return;
    }

    // Verify cashier exists
    const cashierName = localStorage.getItem('pos_active_cashier') || 'Administrator';

    // Construct invoice payload
    let tQty = 0, tGross = 0, tDiscount = 0, tTaxable = 0, tNonTaxable = 0, tVat = 0;
    const payloadItems = items.map(item => {
        tQty += item.qty;
        const gross = item.qty * item.rate;
        tGross += gross;
        tDiscount += item.discountAmt;
        const taxableBase = gross - item.discountAmt;
        let itemVat = 0;
        if (item.vatType === '13%') {
            tTaxable += taxableBase;
            itemVat = taxableBase * 0.13;
            tVat += itemVat;
        } else {
            tNonTaxable += taxableBase;
        }
        return {
            id: item.id,
            code: item.code,
            hsCode: item.hsCode,
            barcode: item.barcode,
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            rate: item.rate,
            disPct: item.discountPct,
            disAmt: item.discountAmt,
            vatType: item.vatType,
            netAmt: taxableBase + itemVat,
            mfgDate: item.mfgDate,
            expDate: item.expDate
        };
    });

    const netAmount = tTaxable + tNonTaxable + tVat;

    const purchaseInvoiceData = {
        piNo: piNo,
        entryDate: entryDateAD,
        invoiceNo: invoiceNo,
        invoiceDate: invoiceDateAD,
        purchaseType: purchaseType,
        paymentTerms: paymentTerms,
        account: account,
        chequeNo: chequeNo,
        godown: godown,
        supplier: supplierName,
        address: address,
        vatNo: vatNo,
        remarks: remarks,
        items: payloadItems,
        totalQty: tQty,
        gross: tGross,
        discount: tDiscount,
        taxable: tTaxable,
        nonTaxable: tNonTaxable,
        vat: tVat,
        netAmount: netAmount,
        timestamp: new Date().toISOString(),
        cashier: cashierName
    };

    try {
        const res = await window.posAPI.createPurchase(purchaseInvoiceData);
        alert('Purchase Invoice saved successfully! Inventory stock levels updated.');
        
        // Print/Reset triggers
        if (confirm('Do you want to print a goods receipt copy?')) {
            printInvoiceObject(purchaseInvoiceData);
        }
        
        // Reset and reload page state
        document.getElementById('invoiceNo').value = '';
        document.getElementById('remarks').value = '';
        document.getElementById('supplier').value = '';
        document.getElementById('address').value = '';
        document.getElementById('vatNo').value = '';
        document.getElementById('chequeNo').value = '';
        gridItems = [];
        addNewGridRow();
        calculateTotals();
        loadNextPINumber();
        loadInventory(); // reload updated stock levels
        loadSuppliers();
        loadPurchaseHistory();
    } catch (err) {
        console.error('Save failed:', err);
        alert('Failed to save purchase invoice: ' + err.message);
    }
}

// --- History / Reports Tab Flow ---
async function loadPurchaseHistory() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return;

    try {
        const res = await window.posAPI.getAllPurchases();
        purchaseHistory = Array.isArray(res) ? res : [];
        
        const start = document.getElementById('historyStartDate').value;
        const end = document.getElementById('historyEndDate').value;
        const search = document.getElementById('historySearch').value.toLowerCase().trim();

        let filtered = purchaseHistory;
        
        if (start) {
            filtered = filtered.filter(p => p.entryDate >= start);
        }
        if (end) {
            filtered = filtered.filter(p => p.entryDate <= end);
        }
        if (search) {
            filtered = filtered.filter(p => 
                p.piNo.toLowerCase().includes(search) || 
                p.supplier.toLowerCase().includes(search) ||
                (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search))
            );
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 0.75rem 1rem;"><strong>${p.piNo}</strong></td>
                <td style="padding: 0.75rem 1rem;">${p.entryDate}</td>
                <td style="padding: 0.75rem 1rem;">${p.invoiceNo || '-'}</td>
                <td style="padding: 0.75rem 1rem;">${p.supplier}</td>
                <td style="padding: 0.75rem 1rem; text-align: center;">${p.items ? p.items.length : 0}</td>
                <td style="padding: 0.75rem 1rem; text-align: right; font-weight: 600;">Rs. ${parseFloat(p.netAmount || 0).toFixed(2)}</td>
                <td style="padding: 0.75rem 1rem; text-align: center;"><span class="badge ${p.paymentTerms === 'Credit' ? 'badge-warning' : 'badge-success'}">${p.paymentTerms}</span></td>
                <td style="padding: 0.75rem 1rem; text-align: center;">
                    <button class="btn btn-secondary" onclick="viewPurchaseDetail('${p.piNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Failed to load purchase history:', err);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--accent-danger);">Error loading purchase history.</td></tr>';
    }
}

// --- Detail View Modal ---
let activeDetailInvoice = null;

function viewPurchaseDetail(piNo) {
    const inv = purchaseHistory.find(p => p.piNo === piNo);
    if (!inv) return;

    activeDetailInvoice = inv;

    document.getElementById('detailPiNo').textContent = inv.piNo;
    document.getElementById('detailEntryDateAD').textContent = inv.entryDate;
    
    let entryBS = '';
    if (typeof window.convertToBS === 'function') {
        entryBS = window.convertToBS(inv.entryDate + 'T00:00:00');
    }
    document.getElementById('detailEntryDateBS').textContent = entryBS || '-';
    
    document.getElementById('detailInvoiceNo').textContent = inv.invoiceNo || '-';
    document.getElementById('detailInvoiceDateAD').textContent = inv.invoiceDate || '-';
    
    let invBS = '';
    if (inv.invoiceDate && typeof window.convertToBS === 'function') {
        invBS = window.convertToBS(inv.invoiceDate + 'T00:00:00');
    }
    document.getElementById('detailInvoiceDateBS').textContent = invBS || '-';
    
    document.getElementById('detailSupplier').textContent = inv.supplier;
    document.getElementById('detailVatNo').textContent = inv.vatNo || '-';
    document.getElementById('detailPaymentTerms').textContent = inv.paymentTerms;
    document.getElementById('detailRemarks').textContent = inv.remarks || '-';

    document.getElementById('detailGross').textContent = 'Rs. ' + parseFloat(inv.gross || 0).toFixed(2);
    document.getElementById('detailDiscount').textContent = 'Rs. ' + parseFloat(inv.discount || 0).toFixed(2);
    document.getElementById('detailTaxable').textContent = 'Rs. ' + parseFloat(inv.taxable || 0).toFixed(2);
    document.getElementById('detailNonTaxable').textContent = 'Rs. ' + parseFloat(inv.nonTaxable || 0).toFixed(2);
    document.getElementById('detailVat').textContent = 'Rs. ' + parseFloat(inv.vat || 0).toFixed(2);
    document.getElementById('detailNet').textContent = 'Rs. ' + parseFloat(inv.netAmount || 0).toFixed(2);

    const detailBody = document.getElementById('detailItemsBody');
    detailBody.innerHTML = '';

    if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 0.5rem; text-align: center;">${index + 1}</td>
                <td style="padding: 0.5rem;">${item.code || '-'}</td>
                <td style="padding: 0.5rem;"><strong>${item.name}</strong></td>
                <td style="padding: 0.5rem; text-align: center;">${item.qty} ${item.unit || ''}</td>
                <td style="padding: 0.5rem; text-align: right;">Rs. ${parseFloat(item.rate || 0).toFixed(2)}</td>
                <td style="padding: 0.5rem; text-align: right;">Rs. ${parseFloat(item.disAmt || 0).toFixed(2)} (${parseFloat(item.disPct || 0).toFixed(0)}%)</td>
                <td style="padding: 0.5rem; text-align: right;">${item.vatType || '13%'}</td>
                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">Rs. ${parseFloat(item.netAmt || 0).toFixed(2)}</td>
            `;
            detailBody.appendChild(tr);
        });
    }

    document.getElementById('invoiceDetailModal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('invoiceDetailModal').classList.remove('active');
    activeDetailInvoice = null;
}

function printInvoiceDetail() {
    if (activeDetailInvoice) {
        printInvoiceObject(activeDetailInvoice);
    }
}

// Print invoice logic (using a nice print template layout)
function printInvoiceObject(inv) {
    const printWindow = window.open('', '_blank');
    
    let entryBS = '';
    if (typeof window.convertToBS === 'function') {
        entryBS = window.convertToBS(inv.entryDate + 'T00:00:00');
    }
    
    let itemsRows = inv.items.map((item, index) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${item.code || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 6px;"><b>${item.name}</b></td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${item.qty} ${item.unit || ''}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">Rs. ${parseFloat(item.rate).toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">Rs. ${parseFloat(item.disAmt).toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${item.vatType}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">Rs. ${parseFloat(item.netAmt).toFixed(2)}</td>
        </tr>
    `).join('');

    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
    const storeName = settings.storeName || 'K Pos';
    const storeAddress = settings.address || '';
    const storeVat = settings.vatNo || '';

    const html = `
        <html>
        <head>
            <title>Goods Receipt Note - ${inv.piNo}</title>
            <style>
                body { font-family: 'Inter', sans-serif; color: #333; padding: 20px; font-size: 13px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .store-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                .invoice-title { font-size: 16px; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .info-col p { margin: 3px 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: left; font-size: 12px; }
                .summary-table { width: 300px; margin-left: auto; margin-right: 0; }
                .summary-table td { padding: 4px 8px; }
                .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; }
                .signature-line { border-top: 1px solid #333; width: 150px; text-align: center; margin-top: 40px; padding-top: 5px; font-weight: 500; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="header">
                <div class="store-title">${storeName}</div>
                <div>${storeAddress}</div>
                ${storeVat ? `<div>PAN/VAT No: ${storeVat}</div>` : ''}
                <div class="invoice-title">Goods Receipt / Purchase Invoice Copy</div>
            </div>

            <div class="info-grid">
                <div class="info-col">
                    <p><strong>Supplier:</strong> ${inv.supplier}</p>
                    <p><strong>Address:</strong> ${inv.address || '-'}</p>
                    <p><strong>Vat/PAN:</strong> ${inv.vatNo || '-'}</p>
                </div>
                <div class="info-col" style="text-align: right;">
                    <p><strong>GRN / PI No:</strong> ${inv.piNo}</p>
                    <p><strong>Entry Date:</strong> ${inv.entryDate} (${entryBS} BS)</p>
                    <p><strong>Invoice Ref #:</strong> ${inv.invoiceNo || '-'}</p>
                    <p><strong>Terms:</strong> ${inv.paymentTerms}</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">SNo</th>
                        <th style="width: 80px;">Code</th>
                        <th>Particular</th>
                        <th style="width: 80px; text-align: center;">Qty</th>
                        <th style="width: 100px; text-align: right;">Rate</th>
                        <th style="width: 80px; text-align: right;">Discount</th>
                        <th style="width: 80px; text-align: center;">VAT</th>
                        <th style="width: 100px; text-align: right;">Net Amt</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between;">
                <div style="width: 50%;">
                    <p><strong>Remarks:</strong> ${inv.remarks || '-'}</p>
                </div>
                <div style="width: 40%;">
                    <table class="summary-table" style="border: none; margin-bottom: 0;">
                        <tr><td>Gross Total:</td><td style="text-align: right;">Rs. ${parseFloat(inv.gross || 0).toFixed(2)}</td></tr>
                        <tr><td>Discount:</td><td style="text-align: right;">Rs. ${parseFloat(inv.discount || 0).toFixed(2)}</td></tr>
                        <tr><td>Taxable Amt:</td><td style="text-align: right;">Rs. ${parseFloat(inv.taxable || 0).toFixed(2)}</td></tr>
                        <tr><td>Non-Taxable Amt:</td><td style="text-align: right;">Rs. ${parseFloat(inv.nonTaxable || 0).toFixed(2)}</td></tr>
                        <tr><td>VAT (13%):</td><td style="text-align: right;">Rs. ${parseFloat(inv.vat || 0).toFixed(2)}</td></tr>
                        <tr style="font-weight: bold; border-top: 1.5px solid #333; font-size: 14px;">
                            <td>Net Amount:</td><td style="text-align: right;">Rs. ${parseFloat(inv.netAmount || 0).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="footer">
                <div>
                    <p>Entered By: ${inv.cashier || 'System Admin'}</p>
                </div>
                <div>
                    <div class="signature-line">Authorized Signature</div>
                </div>
            </div>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

// --- Tab Switching Logic ---
function switchTab(tabId) {
    const entryTab = document.getElementById('entryTabContent');
    const historyTab = document.getElementById('historyTabContent');
    const tabEntryBtn = document.getElementById('tabEntry');
    const tabHistoryBtn = document.getElementById('tabHistory');

    if (tabId === 'entry') {
        entryTab.classList.add('active');
        historyTab.classList.remove('active');
        tabEntryBtn.classList.add('active');
        tabHistoryBtn.classList.remove('active');
    } else {
        entryTab.classList.remove('active');
        historyTab.classList.add('active');
        tabEntryBtn.classList.remove('active');
        tabHistoryBtn.classList.add('active');
        loadPurchaseHistory(); // Auto-reload on switch
    }
}

// Sidebar toggle (standard)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// Cashier name select modal handlers (standard)
function openCashierModal() {
    const modal = document.getElementById('cashierModal');
    if (modal) modal.classList.add('active');
    renderCashierList();
}

function closeCashierModal() {
    const modal = document.getElementById('cashierModal');
    if (modal) modal.classList.remove('active');
}

function renderCashierList() {
    const cashiers = ['Administrator', 'Cashier A', 'Cashier B', 'Manager'];
    const container = document.getElementById('cashierListContainer');
    if (!container) return;

    container.innerHTML = cashiers.map(c => `
        <div onclick="selectCashier('${c}')" style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light); cursor: pointer; font-weight: 500; transition: background-color 0.2s;">
            ${c}
        </div>
    `).join('');
}

function selectCashier(name) {
    localStorage.setItem('pos_active_cashier', name);
    loadActiveCashier();
    closeCashierModal();
}

// Expose globally
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.openCashierModal = openCashierModal;
window.closeCashierModal = closeCashierModal;
window.selectCashier = selectCashier;
window.viewPurchaseDetail = viewPurchaseDetail;
window.closeDetailModal = closeDetailModal;
window.printInvoiceDetail = printInvoiceDetail;
window.addNewGridRow = addNewGridRow;
window.removeGridRow = removeGridRow;
window.updateRowField = updateRowField;
window.handleParticularSelect = handleParticularSelect;
window.hideParticularSelect = hideParticularSelect;
window.handlePaymentTermsChange = handlePaymentTermsChange;
window.quickAddItem = quickAddItem;
window.handleBarcodeScan = handleBarcodeScan;
window.savePurchaseInvoice = savePurchaseInvoice;
window.resetForm = resetForm;
window.loadPurchaseHistory = loadPurchaseHistory;
