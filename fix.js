const fs = require('fs');
const inv = fs.readFileSync('inventory.html', 'utf8');
const mainIdx = inv.indexOf('<main class="main-content">');
const header = inv.substring(0, mainIdx);
const formStart = fs.readFileSync('add-product.html', 'utf8');
const justTheForm = formStart.substring(formStart.indexOf('<div class="card"'));

const newHtml = header + `<main class="main-content">
    <div class="top-bar">
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="mobile-menu-btn" onclick="toggleSidebar()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 class="page-title">Add/Edit Product</h2>
        </div>
    </div>
    <div style="padding: 1.5rem;">
` + justTheForm.replace('</div>\n</div>\n<script src="js/add-product.js"></script>\n</body>\n</html>', '</div>\n</div>\n</main>\n</div>\n<script src="js/add-product.js"></script>\n<script src="js/sidebar.js"></script>\n</body>\n</html>');

fs.writeFileSync('add-product.html', newHtml);
console.log('Fixed add-product.html');
