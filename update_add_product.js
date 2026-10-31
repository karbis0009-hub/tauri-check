const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'add-product.html');
let html = fs.readFileSync(filePath, 'utf8');

// Find insertion point right after itemMarginDisplay's parent div
const marker = 'id="itemMarginDisplay"';
const markerIdx = html.indexOf(marker);

if (markerIdx === -1) {
    console.error('Marker id="itemMarginDisplay" not found');
    process.exit(1);
}

const closingDiv = '</div>';
const divIdx = html.indexOf(closingDiv, markerIdx);
if (divIdx === -1) {
    console.error('Closing div not found');
    process.exit(1);
}

const insertPos = divIdx + closingDiv.length;

const isCrlf = html.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

const tierSection = [
    '',
    '                                    <div class="form-group" style="margin-top:0.85rem; margin-bottom:0.5rem;">',
    '                                        <label style="display:inline-flex; align-items:center; gap:0.5rem; cursor:pointer; font-weight:600; font-size:0.875rem; color:var(--text-primary); user-select:none;">',
    '                                            <input type="checkbox" id="enableTieredPricing" style="width:1.1rem; height:1.1rem; accent-color:var(--accent-primary); cursor:pointer;" onchange="toggleTieredPricingSection(this.checked)">',
    '                                            <span>Enable Quantity-Based Pricing (Tiers)</span>',
    '                                        </label>',
    '                                    </div>',
    '',
    '                                    <!-- Quantity-Based Pricing Tier Builder -->',
    '                                    <div id="tieredPricingSection" style="display:none; background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-light, #e2e8f0); border-radius:0.5rem; padding:0.85rem; margin-top:0.5rem; margin-bottom:1rem;">',
    '                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">',
    '                                            <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">',
    '                                                Pricing Tiers <span style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">(based on Unit: <strong id="tierUnitBadge" style="color:var(--accent-primary);">Kg</strong>)</span>',
    '                                            </div>',
    '                                            <span id="tierAutoSaveStatus" style="font-size:0.75rem; color:var(--accent-success, #10b981); display:none; font-weight:600;">✓ Saved</span>',
    '                                        </div>',
    '',
    '                                        <div id="tierValidationErrors" style="display:none; padding:0.5rem 0.75rem; margin-bottom:0.6rem; background:rgba(239, 68, 68, 0.1); border:1px solid #ef4444; border-radius:0.35rem; color:#ef4444; font-size:0.78rem; font-weight:600; line-height:1.4;">',
    '                                        </div>',
    '',
    '                                        <div class="table-wrapper" style="overflow-x:auto; margin-bottom:0.6rem; border-radius:0.35rem; border:1px solid var(--border-light);">',
    '                                            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; background:var(--bg-card, #fff);">',
    '                                                <thead>',
    '                                                    <tr style="background:var(--bg-main, #f1f5f9); border-bottom:1px solid var(--border-light); text-align:left;">',
    '                                                        <th style="padding:0.4rem 0.5rem; width:30%; font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">Min Qty</th>',
    '                                                        <th style="padding:0.4rem 0.5rem; width:30%; font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">Max Qty</th>',
    '                                                        <th style="padding:0.4rem 0.5rem; width:30%; font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">Rate/Unit (Rs.)</th>',
    '                                                        <th style="padding:0.4rem 0.5rem; width:10%; text-align:center; font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">✕</th>',
    '                                                    </tr>',
    '                                                </thead>',
    '                                                <tbody id="tierTableBody">',
    '                                                    <!-- Tier rows generated dynamically -->',
    '                                                </tbody>',
    '                                            </table>',
    '                                        </div>',
    '',
    '                                        <div style="display:flex; justify-content:space-between; align-items:center;">',
    '                                            <button type="button" id="btnAddTier" class="btn btn-secondary" style="font-size:0.78rem; padding:0.3rem 0.7rem; display:inline-flex; align-items:center; gap:0.3rem;" onclick="addNewTierRow()">',
    '                                                <span>+ Add Tier</span>',
    '                                            </button>',
    '                                            <span id="tierCountHint" style="font-size:0.72rem; color:var(--text-muted);">1 to 5 tiers allowed</span>',
    '                                        </div>',
    '                                    </div>'
].join(eol);

html = html.slice(0, insertPos) + eol + tierSection + html.slice(insertPos);
fs.writeFileSync(filePath, html, 'utf8');
console.log('SUCCESS: Injected tiered pricing into add-product.html');
