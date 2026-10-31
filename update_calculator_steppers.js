const fs = require('fs');
const path = require('path');

const billingPath = path.join(__dirname, '..', 'billing.html');
let content = fs.readFileSync(billingPath, 'utf8');

// 1. Add CSS styles
const cssToAdd = `
          #businessCalculatorContent .stepper-input {
            display: flex;
            align-items: stretch;
            border: 1px solid var(--color-border-tertiary);
            border-radius: var(--border-radius-md);
            overflow: hidden;
            background: var(--color-background-primary);
            width: 100%;
            height: 38px;
            transition: border-color .15s, box-shadow .15s;
          }

          #businessCalculatorContent .stepper-input:focus-within {
            border-color: var(--color-border-info);
            box-shadow: 0 0 0 2px rgba(51, 51, 51, .12);
          }

          #businessCalculatorContent[data-theme="dark"] .stepper-input:focus-within {
            box-shadow: 0 0 0 2px rgba(255, 255, 255, .15);
          }

          #businessCalculatorContent .stepper-btn {
            border: none;
            background: var(--color-background-secondary);
            color: var(--color-text-primary);
            cursor: pointer;
            font-size: 15px;
            font-weight: 700;
            width: 36px;
            min-width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            transition: background 0.15s, color 0.15s;
            padding: 0;
            line-height: 1;
            flex-shrink: 0;
          }

          #businessCalculatorContent .stepper-btn:hover {
            background: var(--color-background-info);
            color: var(--color-text-info);
          }

          #businessCalculatorContent .stepper-btn:active {
            background: var(--color-text-info);
            color: #ffffff;
          }

          #businessCalculatorContent .stepper-val {
            border: none !important;
            border-radius: 0 !important;
            text-align: center !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 0 0.5rem !important;
            box-shadow: none !important;
            height: 100% !important;
            font-weight: 500;
            background: transparent !important;
            color: var(--color-text-primary);
            outline: none !important;
            -webkit-appearance: none;
            -moz-appearance: textfield;
          }

          #businessCalculatorContent input[type="number"]::-webkit-inner-spin-button,
          #businessCalculatorContent input[type="number"]::-webkit-outer-spin-button,
          #businessCalculatorContent .stepper-val::-webkit-inner-spin-button,
          #businessCalculatorContent .stepper-val::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          #businessCalculatorContent input[type="number"] {
            -moz-appearance: textfield;
          }
`;

if (!content.includes('.stepper-input {')) {
  content = content.replace(
    `          #businessCalculatorContent input::placeholder {`,
    `${cssToAdd}\n          #businessCalculatorContent input::placeholder {`
  );
}

// 2. Quick tools replacements
content = content.replace(
  `<div class="f"><label>Square</label><input type="number" id="qt-sq" placeholder="number"\n                    oninput="qtSq()"></div>`,
  `<div class="f"><label>Square</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('qt-sq', -1)" aria-label="Decrease">−</button><input type="number" id="qt-sq" class="stepper-val" placeholder="number" oninput="qtSq()"><button type="button" class="stepper-btn" onclick="calcStep('qt-sq', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Square</label><input type="number" id="qt-sq" placeholder="number"\r\n                    oninput="qtSq()"></div>`,
  `<div class="f"><label>Square</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('qt-sq', -1)" aria-label="Decrease">−</button><input type="number" id="qt-sq" class="stepper-val" placeholder="number" oninput="qtSq()"><button type="button" class="stepper-btn" onclick="calcStep('qt-sq', 1)" aria-label="Increase">+</button></div></div>`
);

content = content.replace(
  `<div class="f"><label>Square root</label><input type="number" id="qt-sqrt" placeholder="number"\n                    oninput="qtSqrt()"></div>`,
  `<div class="f"><label>Square root</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('qt-sqrt', -1)" aria-label="Decrease">−</button><input type="number" id="qt-sqrt" class="stepper-val" placeholder="number" min="0" oninput="qtSqrt()"><button type="button" class="stepper-btn" onclick="calcStep('qt-sqrt', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Square root</label><input type="number" id="qt-sqrt" placeholder="number"\r\n                    oninput="qtSqrt()"></div>`,
  `<div class="f"><label>Square root</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('qt-sqrt', -1)" aria-label="Decrease">−</button><input type="number" id="qt-sqrt" class="stepper-val" placeholder="number" min="0" oninput="qtSqrt()"><button type="button" class="stepper-btn" onclick="calcStep('qt-sqrt', 1)" aria-label="Increase">+</button></div></div>`
);

const oldPower = `<div class="f"><label>Power (xⁿ)</label>\n                  <div style="display:flex;gap:4px;">\n                    <input type="number" id="qt-base" placeholder="x" oninput="qtPow()" style="width:50%;">\n                    <input type="number" id="qt-exp" placeholder="n" oninput="qtPow()" style="width:50%;">\n                  </div>\n                </div>`;
const oldPowerCRLF = `<div class="f"><label>Power (xⁿ)</label>\r\n                  <div style="display:flex;gap:4px;">\r\n                    <input type="number" id="qt-base" placeholder="x" oninput="qtPow()" style="width:50%;">\r\n                    <input type="number" id="qt-exp" placeholder="n" oninput="qtPow()" style="width:50%;">\r\n                  </div>\r\n                </div>`;
const newPower = `<div class="f"><label>Power (xⁿ)</label>\n                  <div style="display:flex;gap:6px;">\n                    <div class="stepper-input" style="flex:1;"><button type="button" class="stepper-btn" onclick="calcStep('qt-base', -1)" aria-label="Decrease">−</button><input type="number" id="qt-base" class="stepper-val" placeholder="x" oninput="qtPow()"><button type="button" class="stepper-btn" onclick="calcStep('qt-base', 1)" aria-label="Increase">+</button></div>\n                    <div class="stepper-input" style="flex:1;"><button type="button" class="stepper-btn" onclick="calcStep('qt-exp', -1)" aria-label="Decrease">−</button><input type="number" id="qt-exp" class="stepper-val" placeholder="n" oninput="qtPow()"><button type="button" class="stepper-btn" onclick="calcStep('qt-exp', 1)" aria-label="Increase">+</button></div>\n                  </div>\n                </div>`;

content = content.replace(oldPower, newPower).replace(oldPowerCRLF, newPower);

// 3. Discount tab replacements
content = content.replace(
  `<input type="number" id="d-price" placeholder="0.00" oninput="calcDisc()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('d-price', -1)" aria-label="Decrease">−</button><input type="number" id="d-price" class="stepper-val" placeholder="0.00" min="0" oninput="calcDisc()"><button type="button" class="stepper-btn" onclick="calcStep('d-price', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<input type="number" id="d-pct" placeholder="0" min="0" max="100" oninput="calcDisc()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('d-pct', -1)" aria-label="Decrease">−</button><input type="number" id="d-pct" class="stepper-val" placeholder="0" min="0" max="100" oninput="calcDisc()"><button type="button" class="stepper-btn" onclick="calcStep('d-pct', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<input type="number" id="d-amt" placeholder="0.00" oninput="calcDisc()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('d-amt', -1)" aria-label="Decrease">−</button><input type="number" id="d-amt" class="stepper-val" placeholder="0.00" min="0" oninput="calcDisc()"><button type="button" class="stepper-btn" onclick="calcStep('d-amt', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<input type="number" id="d-sp" placeholder="0.00" oninput="calcDisc()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('d-sp', -1)" aria-label="Decrease">−</button><input type="number" id="d-sp" class="stepper-val" placeholder="0.00" min="0" oninput="calcDisc()"><button type="button" class="stepper-btn" onclick="calcStep('d-sp', 1)" aria-label="Increase">+</button></div>`
);

// 4. Change tab replacements
content = content.replace(
  `<input type="number" id="ch-bill" placeholder="0.00" oninput="calcChange()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('ch-bill', -1)" aria-label="Decrease">−</button><input type="number" id="ch-bill" class="stepper-val" placeholder="0.00" min="0" oninput="calcChange()"><button type="button" class="stepper-btn" onclick="calcStep('ch-bill', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<input type="number" id="ch-cash" placeholder="0.00" oninput="calcChange()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('ch-cash', -1)" aria-label="Decrease">−</button><input type="number" id="ch-cash" class="stepper-val" placeholder="0.00" min="0" oninput="calcChange()"><button type="button" class="stepper-btn" onclick="calcStep('ch-cash', 1)" aria-label="Increase">+</button></div>`
);

// 5. VAT tab replacements
content = content.replace(
  `<input type="number" id="vat-price" placeholder="0.00" oninput="calcVat()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('vat-price', -1)" aria-label="Decrease">−</button><input type="number" id="vat-price" class="stepper-val" placeholder="0.00" min="0" oninput="calcVat()"><button type="button" class="stepper-btn" onclick="calcStep('vat-price', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<input type="number" id="vat-rate" value="13" min="0" max="100" oninput="calcVat()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('vat-rate', -1)" aria-label="Decrease">−</button><input type="number" id="vat-rate" class="stepper-val" value="13" min="0" max="100" oninput="calcVat()"><button type="button" class="stepper-btn" onclick="calcStep('vat-rate', 1)" aria-label="Increase">+</button></div>`
);

// 6. Profit tab replacements
content = content.replace(
  `<div class="f"><label>Cost price (Rs.)</label><input type="number" id="pr-cost" placeholder="0.00"\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Cost price (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-cost', -1)" aria-label="Decrease">−</button><input type="number" id="pr-cost" class="stepper-val" placeholder="0.00" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-cost', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Cost price (Rs.)</label><input type="number" id="pr-cost" placeholder="0.00"\r\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Cost price (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-cost', -1)" aria-label="Decrease">−</button><input type="number" id="pr-cost" class="stepper-val" placeholder="0.00" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-cost', 1)" aria-label="Increase">+</button></div></div>`
);

content = content.replace(
  `<div class="f"><label>Selling price (Rs.)</label><input type="number" id="pr-sell" placeholder="0.00"\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Selling price (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-sell', -1)" aria-label="Decrease">−</button><input type="number" id="pr-sell" class="stepper-val" placeholder="0.00" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-sell', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Selling price (Rs.)</label><input type="number" id="pr-sell" placeholder="0.00"\r\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Selling price (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-sell', -1)" aria-label="Decrease">−</button><input type="number" id="pr-sell" class="stepper-val" placeholder="0.00" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-sell', 1)" aria-label="Increase">+</button></div></div>`
);

content = content.replace(
  `<input type="number" id="pr-margin-target" placeholder="e.g. 30" oninput="calcMarginTarget()">`,
  `<div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-margin-target', -1)" aria-label="Decrease">−</button><input type="number" id="pr-margin-target" class="stepper-val" placeholder="e.g. 30" oninput="calcMarginTarget()"><button type="button" class="stepper-btn" onclick="calcStep('pr-margin-target', 1)" aria-label="Increase">+</button></div>`
);

content = content.replace(
  `<div class="f"><label>Fixed overhead (Rs.)</label><input type="number" id="pr-fixed" placeholder="0"\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Fixed overhead (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-fixed', -1)" aria-label="Decrease">−</button><input type="number" id="pr-fixed" class="stepper-val" placeholder="0" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-fixed', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Fixed overhead (Rs.)</label><input type="number" id="pr-fixed" placeholder="0"\r\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Fixed overhead (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-fixed', -1)" aria-label="Decrease">−</button><input type="number" id="pr-fixed" class="stepper-val" placeholder="0" min="0" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-fixed', 1)" aria-label="Increase">+</button></div></div>`
);

content = content.replace(
  `<div class="f"><label>Units sold</label><input type="number" id="pr-units" placeholder="1"\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Units sold</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-units', -1)" aria-label="Decrease">−</button><input type="number" id="pr-units" class="stepper-val" placeholder="1" min="1" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-units', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Units sold</label><input type="number" id="pr-units" placeholder="1"\r\n                    oninput="calcProfit()"></div>`,
  `<div class="f"><label>Units sold</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('pr-units', -1)" aria-label="Decrease">−</button><input type="number" id="pr-units" class="stepper-val" placeholder="1" min="1" oninput="calcProfit()"><button type="button" class="stepper-btn" onclick="calcStep('pr-units', 1)" aria-label="Increase">+</button></div></div>`
);

// 7. Split bill tab replacements
content = content.replace(
  `<div class="f"><label>Total bill (Rs.)</label><input type="number" id="sp-total" placeholder="0.00"\n                    oninput="calcSplit()"></div>`,
  `<div class="f"><label>Total bill (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('sp-total', -1)" aria-label="Decrease">−</button><input type="number" id="sp-total" class="stepper-val" placeholder="0.00" min="0" oninput="calcSplit()"><button type="button" class="stepper-btn" onclick="calcStep('sp-total', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Total bill (Rs.)</label><input type="number" id="sp-total" placeholder="0.00"\r\n                    oninput="calcSplit()"></div>`,
  `<div class="f"><label>Total bill (Rs.)</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('sp-total', -1)" aria-label="Decrease">−</button><input type="number" id="sp-total" class="stepper-val" placeholder="0.00" min="0" oninput="calcSplit()"><button type="button" class="stepper-btn" onclick="calcStep('sp-total', 1)" aria-label="Increase">+</button></div></div>`
);

content = content.replace(
  `<div class="f"><label>Service charge %</label><input type="number" id="sp-svc" placeholder="e.g. 10"\n                    oninput="calcSplit()"></div>`,
  `<div class="f"><label>Service charge %</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('sp-svc', -1)" aria-label="Decrease">−</button><input type="number" id="sp-svc" class="stepper-val" placeholder="e.g. 10" min="0" oninput="calcSplit()"><button type="button" class="stepper-btn" onclick="calcStep('sp-svc', 1)" aria-label="Increase">+</button></div></div>`
);
content = content.replace(
  `<div class="f"><label>Service charge %</label><input type="number" id="sp-svc" placeholder="e.g. 10"\r\n                    oninput="calcSplit()"></div>`,
  `<div class="f"><label>Service charge %</label><div class="stepper-input"><button type="button" class="stepper-btn" onclick="calcStep('sp-svc', -1)" aria-label="Decrease">−</button><input type="number" id="sp-svc" class="stepper-val" placeholder="e.g. 10" min="0" oninput="calcSplit()"><button type="button" class="stepper-btn" onclick="calcStep('sp-svc', 1)" aria-label="Increase">+</button></div></div>`
);

fs.writeFileSync(billingPath, content, 'utf8');
console.log('Successfully updated billing.html');
