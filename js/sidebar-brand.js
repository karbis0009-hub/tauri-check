document.addEventListener('DOMContentLoaded', () => {
    updateSidebarBrand();
});

function updateSidebarBrand() {
    const brandEl = document.getElementById('sidebarBrand');
    const pageStoreName = document.getElementById('pageStoreName');
    const logoTexts = document.querySelectorAll('.logo-text');
    const brandTexts = document.querySelectorAll('.brand-text');
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');

    // Default branding logo to "K Pos"
    logoTexts.forEach(el => el.textContent = 'K Pos');

    if (settings.storeName) {
        if (brandEl) brandEl.textContent = settings.storeName;
        if (pageStoreName) pageStoreName.textContent = settings.storeName;
        
        // Update all brand-text elements (like the one in mobile sidebar header)
        brandTexts.forEach(el => el.textContent = settings.storeName);
    }
}
