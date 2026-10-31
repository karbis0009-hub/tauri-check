// Theme Management (Dark/Light Mode)

/**
 * Initializes the theme based on saved preference or default.
 * Applies the theme to documentElement and updates any toggle UIs.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('pos_theme') || 'light';
    applyTheme(savedTheme);
}

/**
 * Applies the specified theme to the document and updates the UI toggle.
 * @param {string} theme - 'dark' or 'light'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleUI(theme);
    
    // Emit event for other scripts (like charts) to react
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
}

/**
 * Toggles the theme between dark and light.
 * Saves the preference to localStorage.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    localStorage.setItem('pos_theme', newTheme);
    applyTheme(newTheme);
}

/**
 * Updates the state of the theme toggle checkbox.
 * @param {string} theme - 'dark' or 'light'
 */
function updateThemeToggleUI(theme) {
    const themeCheckbox = document.getElementById('themeCheckbox');
    if (themeCheckbox) {
        // Light mode = checked (Sun), Dark mode = unchecked (Moon)
        themeCheckbox.checked = (theme === 'light');
    }
}

// Listen for storage changes from other tabs to ensure all pages stay in sync
window.addEventListener('storage', (e) => {
    if (e.key === 'pos_theme' && e.newValue) {
        applyTheme(e.newValue);
    }
});

// Initialize theme as soon as the script loads to prevent a theme "flash"
initTheme();

// Also ensure UI is correct once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('pos_theme') || 'light';
    updateThemeToggleUI(savedTheme);
});
