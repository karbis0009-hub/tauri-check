// Returns & Credit Notes Controller
let allCreditNotes = [];

function init() {
    loadCreditNotes();
}

function loadCreditNotes() {
    window.posAPI.getAllCreditNotes()
        .then(data => {
            allCreditNotes = data;
            renderReturnsTable();
        })
        .catch(err => {
            console.error('Failed to load credit notes:', err);
        });
}

function renderReturnsTable() {
    const tbody = document.getElementById('returns-list');
    tbody.innerHTML = '';

    if (allCreditNotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No credit notes found.</td></tr>';
        return;
    }

    allCreditNotes.forEach(note => {
        const date = new Date(note.timestamp);
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><strong>${note.cnNo}</strong></td>
            <td>
                ${date.toLocaleDateString()}<br>
                <small style="color: var(--text-muted);">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </td>
            <td>#${note.originalBillNo}</td>
            <td>${note.customerName || ''}</td>
            <td style="font-weight: 600;">Rs. ${note.totalAmount.toFixed(2)}</td>
            <td><span class="badge badge-warning">${note.reason || 'Return'}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="viewCreditNote('${note.cnNo}')">View Details</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewCreditNote(cnNo) {
    const note = allCreditNotes.find(n => n.cnNo === cnNo);
    if (!note) return;

    // Minimal implementation for now - could show a receipt-like modal
    let itemsList = note.items.map(i => `${i.name} (x${i.qty})`).join('\n');
    alert(`Credit Note: ${note.cnNo}\nTotal: Rs. ${note.totalAmount.toFixed(2)}\nOriginal Bill: #${note.originalBillNo}\n\nItems:\n${itemsList}`);
}

init();
