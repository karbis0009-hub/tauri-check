const fs = require('fs');
const inv = fs.readFileSync('inventory.html', 'utf8');

const mainIdx = inv.indexOf('<main class="main-content">');
const header = inv.substring(0, mainIdx);

const newHtml = header + `<main class="main-content">
    <div class="top-bar">
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="mobile-menu-btn" onclick="toggleSidebar()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 class="page-title">Manage Categories</h2>
        </div>
    </div>
    
    <div style="padding: 1.5rem; max-width: 600px; margin: 0 auto;">
        <div class="card" style="padding: 2rem;">
            <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem;">
                <input type="text" id="catManagerInput" class="form-input" placeholder="New Category Name">
                <button class="btn btn-primary" onclick="addCustomCategory()">Add</button>
            </div>
            <div style="border:1px solid var(--border-light); border-radius:0.5rem; overflow: hidden;">
                <table style="width:100%; border-collapse: collapse;">
                    <tbody id="categoryListBody"></tbody>
                </table>
            </div>
        </div>
    </div>
</main>
</div>
<script src="js/api.js"></script>
<script src="js/theme.js"></script>
<script src="js/inventory.js"></script>
<script src="js/sidebar.js"></script>

<script>
    document.title = "Manage Categories - K Pos";
    // Initialize category list manually since we are on a separate page
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a small delay to ensure inventory is loaded
        setTimeout(() => {
            if (typeof renderCategoryManagerList === 'function') {
                renderCategoryManagerList();
            }
        }, 100);
    });
</script>
</body>
</html>`;

fs.writeFileSync('category.html', newHtml);
console.log('Created category.html');
