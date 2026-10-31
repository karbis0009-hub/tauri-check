// js/notifications.js

let deliveryNotificationTimer = null;
const maxDeliveryNotificationDelay = 60 * 60 * 1000;
const deliveryNotificationStoreKey = 'pos_delivery_notifications';

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) panel.classList.toggle('active');
}

function clearNotifications() {
    const deliveryNotifications = getDeliveryAlertsForNotification();
    const dot = document.getElementById('notificationDot');
    const list = document.getElementById('notificationList');
    if (deliveryNotifications.length > 0) {
        if (dot) dot.style.display = 'block';
        if (list) list.innerHTML = renderNotificationItems(deliveryNotifications.map(deliveryAlertToNotification));
        return;
    }
    if (dot) dot.style.display = 'none';
    if (list) list.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No notifications</div>';
}

function getStoredDeliveryNotifications() {
    try {
        const stored = JSON.parse(localStorage.getItem(deliveryNotificationStoreKey) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function saveStoredDeliveryNotifications(notifications) {
    localStorage.setItem(deliveryNotificationStoreKey, JSON.stringify(notifications));
}

function syncStoredDeliveryNotifications(alerts) {
    const activeIds = new Set(
        alerts
            .filter(alert => alert && alert.status !== 'done')
            .map(alert => String(alert.id || `${alert.name || ''}-${alert.item || ''}-${alert.fireAt || ''}`))
    );
    const synced = getStoredDeliveryNotifications().filter(item => activeIds.has(String(item.id)));
    saveStoredDeliveryNotifications(synced);
    return synced;
}

function getDeliveryAlertsForNotification() {
    let alerts = [];
    try {
        alerts = JSON.parse(localStorage.getItem('pos_alerts') || '[]');
    } catch (e) {
        alerts = [];
    }

    if (!Array.isArray(alerts)) return [];

    const now = new Date();
    let changed = false;

    const dueAlerts = alerts.filter(alert => {
        if (!alert || alert.status === 'done' || !alert.fireAt) return false;
        const isDue = now >= new Date(alert.fireAt);
        if (isDue && alert.status === 'pending') {
            alert.status = 'firing';
            changed = true;
        }
        return isDue || alert.status === 'firing';
    });

    if (changed) {
        localStorage.setItem('pos_alerts', JSON.stringify(alerts));
    }

    const stored = syncStoredDeliveryNotifications(alerts);
    if (dueAlerts.length > 0) {
        dueAlerts.forEach(alert => {
            const id = String(alert.id || `${alert.name || ''}-${alert.item || ''}-${alert.fireAt || ''}`);
            const existing = stored.find(item => item.id === id);
            const nextItem = {
                id,
                name: alert.name || 'Customer',
                item: alert.item || 'Item',
                area: alert.area || 'delivery area',
                time: alert.time || '',
                fireAt: alert.fireAt || ''
            };
            if (existing) {
                Object.assign(existing, nextItem);
            } else {
                stored.push(nextItem);
            }
        });
        saveStoredDeliveryNotifications(stored);
    }

    scheduleNextDeliveryNotificationCheck(alerts);

    return getStoredDeliveryNotifications();
}

function deliveryAlertToNotification(alert) {
    const timeText = alert.time ? ` at ${alert.time}` : '';
    return {
        type: 'delivery',
        title: `Delivery Alert: ${alert.name || 'Customer'}`,
        desc: `${alert.item || 'Item'} to ${alert.area || 'delivery area'}${timeText}`,
        color: '#ef4444'
    };
}

function renderNotificationItems(notifications) {
    return notifications.map(notif => `
            <div class="notification-item">
                <div class="notif-icon" style="background: ${notif.color};"></div>
                <div class="notif-content">
                    <div class="notif-title">${notif.title}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${notif.desc}</div>
                </div>
            </div>
        `).join('');
}

function scheduleNextDeliveryNotificationCheck(alerts) {
    if (deliveryNotificationTimer) {
        clearTimeout(deliveryNotificationTimer);
        deliveryNotificationTimer = null;
    }

    let source = alerts;
    if (!Array.isArray(source)) {
        try {
            source = JSON.parse(localStorage.getItem('pos_alerts') || '[]');
        } catch (e) {
            source = [];
        }
    }
    const now = Date.now();
    const next = source
        .filter(alert => alert && alert.status === 'pending' && alert.fireAt)
        .map(alert => new Date(alert.fireAt).getTime())
        .filter(time => Number.isFinite(time))
        .sort((a, b) => a - b)[0];

    if (!next) return;

    deliveryNotificationTimer = setTimeout(() => {
        deliveryNotificationTimer = null;
        checkNotifications();
    }, Math.min(Math.max(0, next - now), maxDeliveryNotificationDelay));
}

async function checkNotifications() {
    try {
        const inventory = await window.posAPI.getAllInventory();
        const sales = await window.posAPI.getAllSales();
        updateNotificationUI(inventory, sales);
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
    }
}

function updateNotificationUI(inventory, sales) {
    const list = document.getElementById('notificationList');
    const dot = document.getElementById('notificationDot');
    if (!list || !dot) return;

    const notifications = [];

    // 1. Check Low Stock (below 10)
    const lowStockItems = Array.isArray(inventory) ? inventory.filter(i => i.stock < 10) : [];
    lowStockItems.forEach(item => {
        notifications.push({
            type: 'stock',
            title: `Low Stock: ${item.name}`,
            desc: `${item.stock} units remaining`,
            color: 'var(--accent-danger)'
        });
    });

    // 2. Check Overdue Payments (UNPAID Credit Sales > 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueSales = Array.isArray(sales) ? sales.filter(s =>
        s.paymentMode === 'CREDIT' &&
        s.status !== 'PAID' &&
        new Date(s.timestamp) < sevenDaysAgo
    ) : [];

    overdueSales.forEach(sale => {
        notifications.push({
            type: 'credit',
            title: `Payment Due: ${sale.customer}`,
            desc: `Bill #${sale.billNo} is over 7 days old`,
            color: 'var(--accent-warning)'
        });
    });

    // 3. Check due delivery alerts from Payroll > Delivery Alert
    getDeliveryAlertsForNotification().forEach(alert => {
        notifications.push(deliveryAlertToNotification(alert));
    });

    if (notifications.length > 0) {
        dot.style.display = 'block';
        list.innerHTML = renderNotificationItems(notifications);
    } else {
        dot.style.display = 'none';
        list.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No new notifications</div>';
    }
}

// Global exposure for onclick handlers
window.toggleNotificationPanel = toggleNotificationPanel;
window.clearNotifications = clearNotifications;
window.checkStockAlerts = checkNotifications; // Keep name for compatibility

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkNotifications, 500);
    setInterval(checkNotifications, 10000);
    window.addEventListener('focus', checkNotifications);
    window.addEventListener('storage', event => {
        if (event.key === 'pos_alerts') {
            checkNotifications();
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notificationPanel');
        const container = document.getElementById('notificationContainer');
        if (panel && panel.classList.contains('active')) {
            if (!panel.contains(e.target) && !container.contains(e.target)) {
                panel.classList.remove('active');
            }
        }
    });
});
