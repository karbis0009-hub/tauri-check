// Cashier Management System
let cashiersList = ["Admin User"];
try {
    const stored = localStorage.getItem('pos_cashiers_list');
    if (stored) {
        const parsed = window.safeJSONParse(stored, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
            cashiersList = parsed;
        }
    }
} catch (e) {
    console.error('Error loading cashiers list:', e);
}
window.cashiersList = cashiersList;
window.cashierName = localStorage.getItem('pos_cashier_name') || 'Admin User';

function loadCashier() {
    updateCashierUI();
    renderCashierList();
}

function updateCashierUI() {
    const nameEl = document.getElementById('cashierName');
    const avatarEl = document.getElementById('cashierAvatar');
    const sidebarNameEl = document.getElementById('sidebarCashierName');
    const sidebarAvatarEl = document.getElementById('sidebarAvatar');

    if (nameEl) nameEl.textContent = window.cashierName;
    if (sidebarNameEl) sidebarNameEl.textContent = window.cashierName;

    const initials = window.cashierName.split(' ').map(w => w[0]).join('').toUpperCase();
    if (avatarEl) avatarEl.textContent = initials;
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initials;
}

let editingCashierName = null;

function renderCashierList() {
    const listContainer = document.getElementById('cashierListContainer');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    listContainer.style.display = 'grid';
    listContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(130px, 1fr))';
    listContainer.style.gap = '1rem';
    listContainer.style.padding = '0.5rem 0';
    listContainer.style.maxHeight = 'none'; // Allow grid to flow

    window.cashiersList.forEach((name, index) => {
        const isActive = name === window.cashierName;
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

        const card = document.createElement('div');
        card.className = `cashier-card ${isActive ? 'active' : ''}`;
        card.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1.25rem 0.75rem;
            background: ${isActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-main)'};
            border: 2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-light)'};
            border-radius: 1rem;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            text-align: center;
        `;

        card.onmouseover = () => {
            if (!isActive) {
                card.style.borderColor = 'var(--accent-primary)';
                card.style.transform = 'translateY(-2px)';
            }
        };
        card.onmouseout = () => {
            if (!isActive) {
                card.style.borderColor = 'var(--border-light)';
                card.style.transform = 'translateY(0)';
            }
        };

        const avatar = document.createElement('div');
        avatar.textContent = initials;
        avatar.style.cssText = `
            width: 48px;
            height: 48px;
            background: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'};
            color: ${isActive ? 'var(--text-on-accent)' : 'white'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;

        const nameLabel = document.createElement('span');
        nameLabel.textContent = name;
        nameLabel.style.cssText = `
            font-size: 0.9rem;
            font-weight: ${isActive ? '700' : '500'};
            color: var(--text-primary);
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: none;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            display: ${window.cashiersList.length > 1 ? 'flex' : 'none'};
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeCashier(name);
        };
        card.onmouseenter = () => deleteBtn.style.opacity = '1';
        card.onmouseleave = () => deleteBtn.style.opacity = '0';

        card.onclick = () => selectCashier(name);

        card.appendChild(avatar);
        card.appendChild(nameLabel);
        card.appendChild(deleteBtn);
        listContainer.appendChild(card);
    });

    // Simple Add Card
    const addCard = document.createElement('div');
    addCard.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.25rem 0.75rem;
        background: transparent;
        border: 2px dashed var(--border-light);
        border-radius: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text-muted);
    `;
    addCard.innerHTML = `
        <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px dashed var(--border-light); display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; font-size: 1.5rem;">+</div>
        <span style="font-size: 0.85rem; font-weight: 500;">Add Cashier</span>
    `;
    addCard.onclick = () => {
        const name = prompt('Enter new cashier name:');
        if (name && name.trim()) {
            const newName = name.trim();
            if (!window.cashiersList.includes(newName)) {
                window.cashiersList.push(newName);
                localStorage.setItem('pos_cashiers_list', JSON.stringify(window.cashiersList));
                renderCashierList();
            } else {
                alert('Cashier already exists');
            }
        }
    };
    listContainer.appendChild(addCard);
}

function editCashier(oldName) {
    // This function is now handled inline by renderCashierList
    editingCashierName = oldName;
    renderCashierList();
}

function removeCashier(name) {
    if (window.cashiersList.length <= 1) return;

    // Remote popup confirmation as requested
    window.cashiersList = window.cashiersList.filter(n => n !== name);
    localStorage.setItem('pos_cashiers_list', JSON.stringify(window.cashiersList));

    if (window.cashierName === name) {
        window.cashierName = window.cashiersList[0];
        localStorage.setItem('pos_cashier_name', window.cashierName);
        updateCashierUI();
    }

    renderCashierList();
}

function selectCashier(name) {
    window.cashierName = name;
    localStorage.setItem('pos_cashier_name', name);
    updateCashierUI();
    renderCashierList();
    closeCashierModal();

    // Update receipt if visible
    const pCashier = document.getElementById('p-cashier');
    if (pCashier) pCashier.textContent = window.cashierName;
}

function addCashier() {
    const input = document.getElementById('cashierNameInput');
    if (input && input.value.trim()) {
        const newName = input.value.trim();
        if (!window.cashiersList.includes(newName)) {
            window.cashiersList.push(newName);
            localStorage.setItem('pos_cashiers_list', JSON.stringify(window.cashiersList));
            input.value = '';
            renderCashierList();
        } else {
            alert('Cashier already exists');
        }
    }
}

function openCashierModal() {
    const modal = document.getElementById('cashierModal');
    if (modal) {
        modal.classList.add('active');
        renderCashierList();
    } else {
        console.warn('Cashier modal not found');
    }
}

function closeCashierModal() {
    const modal = document.getElementById('cashierModal');
    if (modal) modal.classList.remove('active');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadCashier);

// Global Exposure
window.openCashierModal = openCashierModal;
window.closeCashierModal = closeCashierModal;
window.addCashier = addCashier;
window.selectCashier = selectCashier;
window.removeCashier = removeCashier;
