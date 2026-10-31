/* ============================================================
   Sidebar — Burger Drawer with Swipe + Mouse Hover Gesture
   Works on ALL screen sizes. Sidebar is always an overlay drawer.

   HOVER BEHAVIOUR:
     - Mouse near left edge (≤30px) → sidebar opens
     - Mouse leaves sidebar area    → sidebar closes
     - Clicking a nav item navigates; sidebar STAYS OPEN across pages
     - Only ESC key, close-btn click, or overlay click will close it
   ============================================================ */

const SIDEBAR_OPEN_KEY = 'pos_sidebar_open';
let _isNavigating = false; // true while a nav link click is navigating away

// --- Prevent white flash/animation on page load ---
if (sessionStorage.getItem(SIDEBAR_OPEN_KEY) === '1') {
    const preloadStyle = document.createElement('style');
    preloadStyle.textContent = `
        .sidebar { transform: translateX(0) !important; transition: none !important; }
        .sidebar-overlay { display: block !important; opacity: 1 !important; }
    `;
    document.documentElement.appendChild(preloadStyle);

    window.addEventListener('load', () => {
        setTimeout(() => preloadStyle.remove(), 50);
    });
}

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && !sidebar.classList.contains('active')) {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        sessionStorage.setItem(SIDEBAR_OPEN_KEY, '1');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        // Only clear the persisted state if this is a real user close,
        // NOT a mouseleave that fires because the page is navigating away
        if (!_isNavigating) {
            sessionStorage.removeItem(SIDEBAR_OPEN_KEY);
        }
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// ---- Restore sidebar state after page navigation ----
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem(SIDEBAR_OPEN_KEY) === '1') {
        openSidebar();
    }
});

// ---- Swipe Gesture (Touch devices) ----
(function initSwipeGesture() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
    const EDGE_THRESHOLD = 50;   // px from left edge to start open swipe
    const SWIPE_MIN = 50;        // min px horizontal movement to trigger

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = false;

        const sidebar = document.querySelector('.sidebar');
        const isOpen = sidebar && sidebar.classList.contains('active');

        // Only begin swipe tracking if touching near left edge (to open)
        // OR anywhere on screen (to close)
        if (!isOpen && touchStartX > EDGE_THRESHOLD) return;
        isDragging = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        // Cancel if mostly vertical
        if (dy > Math.abs(dx) * 1.5) {
            isDragging = false;
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const sidebar = document.querySelector('.sidebar');
        const isOpen = sidebar && sidebar.classList.contains('active');

        if (!isOpen && dx > SWIPE_MIN) {
            openSidebar();
        } else if (isOpen && dx < -SWIPE_MIN) {
            closeSidebar();
        }
        isDragging = false;
    }, { passive: true });
})();

// ---- Mouse Hover Gesture (Desktop) ----
(function initMouseHoverGesture() {
    const HOVER_EDGE_THRESHOLD = 30; // px from left edge to trigger open

    document.addEventListener('mousemove', (e) => {
        if (e.clientX <= HOVER_EDGE_THRESHOLD) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && !sidebar.classList.contains('active')) {
                openSidebar();
            }
        }
    });

    // Close sidebar when the mouse leaves the sidebar element
    document.addEventListener('DOMContentLoaded', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.addEventListener('mouseleave', () => {
                // Don't auto-close if we're navigating to another page
                if (!_isNavigating) {
                    closeSidebar();
                }
            });
        }
    });
})();

// ---- ESC key closes sidebar ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});

// ---- Nav link interactions ----
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 1. Auto-open sub-menu if current page is a sub-item, and set active states
    document.querySelectorAll('.nav-sub-link').forEach(subLink => {
        const subHref = subLink.getAttribute('href') || '';
        const subPath = subHref.split('?')[0].split('/').pop();
        if (subPath === currentPage) {
            subLink.classList.add('active'); // Highlight the sub-link itself

            const subMenu = subLink.closest('.sub-menu');
            if (subMenu) {
                subMenu.classList.add('active');
                
                // Persist this auto-opened state so it doesn't close on next navigation
                const expanded = [];
                document.querySelectorAll('.nav-item-group').forEach((g, idx) => {
                    const sm = g.querySelector('.sub-menu');
                    if (sm && sm.classList.contains('active')) expanded.push(idx);
                });
                sessionStorage.setItem('pos_expanded_menus', JSON.stringify(expanded));
            }

            const parentGroup = subLink.closest('.nav-item-group');
            if (parentGroup) {
                const parentLink = parentGroup.querySelector('.nav-link');
                if (parentLink) parentLink.classList.add('active'); // Highlight parent link
            }
        }
    });

    // 1b. Also ensure regular top-level nav links get active state if they match current page
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        const linkPath = href.split('?')[0].split('/').pop();
        // If it's a direct match and not a parent link of a group (those are handled above)
        if (linkPath === currentPage && !link.closest('.nav-item-group')) {
            link.classList.add('active');
        }
    });

    // 2. Handle nav-link clicks (parent items with sub-menus like "Inventory")
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const group = link.closest('.nav-item-group');
            if (group) {
                const subMenu = group.querySelector('.sub-menu');
                if (subMenu) {
                    subMenu.classList.toggle('active');

                    // Persist expanded state
                    const expanded = [];
                    document.querySelectorAll('.nav-item-group').forEach((g, idx) => {
                        const sm = g.querySelector('.sub-menu');
                        if (sm && sm.classList.contains('active')) expanded.push(idx);
                    });
                    sessionStorage.setItem('pos_expanded_menus', JSON.stringify(expanded));

                    const linkPath = (link.getAttribute('href') || '').split('?')[0].split('/').pop();
                    if (currentPage === linkPath || link.getAttribute('href') === '#') {
                        e.preventDefault();
                    }
                }
            }
            // Mark as navigating so mouseleave won't clear sidebar state
            _isNavigating = true;
            sessionStorage.setItem(SIDEBAR_OPEN_KEY, '1');
        });
    });

    // 3. Handle sub-link clicks — navigate without closing sidebar
    document.querySelectorAll('.nav-sub-link').forEach(sub => {
        sub.addEventListener('click', (e) => {
            const href = sub.getAttribute('href') || '';
            if (href && href !== '#') {
                // Mark as navigating so mouseleave won't clear sidebar state
                _isNavigating = true;
                sessionStorage.setItem(SIDEBAR_OPEN_KEY, '1');

                const subPath = href.split('?')[0].split('/').pop();
                if (subPath === currentPage) {
                    e.preventDefault();
                    window.location.href = href;
                }
            }
        });
    });

    // 4. Restore expanded sub-menus
    const expandedMenus = JSON.parse(sessionStorage.getItem('pos_expanded_menus') || '[]');
    document.querySelectorAll('.nav-item-group').forEach((group, idx) => {
        if (expandedMenus.includes(idx)) {
            const subMenu = group.querySelector('.sub-menu');
            if (subMenu) subMenu.classList.add('active');
        }
    });

    // 5. Restore active tab
    const pageId = window.location.pathname.split('/').pop() || 'index.html';
    const activeTab = sessionStorage.getItem('pos_active_tab_' + pageId);
    if (activeTab) {
        const tabEl = document.querySelector(`[onclick="${activeTab.replace(/"/g, '&quot;')}"]`) ||
                      document.querySelector(`[onclick="${activeTab}"]`);
        if (tabEl && typeof tabEl.click === 'function') {
            setTimeout(() => tabEl.click(), 50);
        }
    }
});

// ---- Page State Preserver ----
window.restorePageState = function() {
    // Skip restoring state on pages with edit parameters (e.g. add-product.html?id=...)
    // to avoid overwriting programmatically populated form fields
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) return;

    const pageId = window.location.pathname.split('/').pop() || 'index.html';
    const stateKey = 'pos_page_state_' + pageId;
    const stored = sessionStorage.getItem(stateKey);
    if (stored) {
        try {
            const state = JSON.parse(stored);
            for (const [id, value] of Object.entries(state)) {
                if (id === 'themeCheckbox') continue;
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        if (el.checked !== value) {
                            el.checked = value;
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } else {
                        if (el.value !== value) {
                            el.value = value;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                }
            }
        } catch(e) {}
    }
};

(function() {
    const pageId = window.location.pathname.split('/').pop() || 'index.html';
    const stateKey = 'pos_page_state_' + pageId;

    window.addEventListener('DOMContentLoaded', () => {
        window.restorePageState();
        setTimeout(window.restorePageState, 150);
        setTimeout(window.restorePageState, 500);
    });

    window.addEventListener('beforeunload', () => {
        const state = {};
        document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
            if (el.id !== 'themeCheckbox' && el.type !== 'password' && el.type !== 'file' && el.type !== 'hidden') {
                state[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
            }
        });
        sessionStorage.setItem(stateKey, JSON.stringify(state));
    });

    document.addEventListener('click', (e) => {
        const target = e.target.closest('[onclick]');
        if (target) {
            const onclickAttr = target.getAttribute('onclick');
            if (onclickAttr && (onclickAttr.startsWith('showTab(') || onclickAttr.startsWith('switchTab('))) {
                sessionStorage.setItem('pos_active_tab_' + pageId, onclickAttr);
            }
        }
    });
})();

// Expose globally
window.openSidebar  = openSidebar;
window.closeSidebar = closeSidebar;
window.toggleSidebar = toggleSidebar;
