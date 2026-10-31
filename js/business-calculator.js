// Business calculator controller extracted from billing.html.
// Loaded by billing.html as a normal script so existing onclick handlers stay global.
function calcStep(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const min = el.min !== '' && el.min !== undefined ? parseFloat(el.min) : -Infinity;
  const max = el.max !== '' && el.max !== undefined ? parseFloat(el.max) : Infinity;
  let val = parseFloat(el.value);
  if (isNaN(val)) val = 0;
  let newVal = val + delta;
  if (newVal < min) newVal = min;
  if (newVal > max) newVal = max;
  if (Number.isInteger(newVal)) {
    el.value = newVal;
  } else {
    el.value = parseFloat(newVal.toFixed(3));
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
window.calcStep = calcStep;

function go(id, btn) {
            document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
            document.querySelectorAll('.tb').forEach(b => b.classList.remove('on'));
            document.getElementById('pg-' + id).classList.add('on');
            btn.classList.add('on');
            document.querySelector('#businessCalculatorContent .calc-shell')?.classList.toggle('history-mode', id === 'hist');
          }

          /* ══ NO LEADING ZEROS on any numeric input ══
             Strips leading zeros as the user types (e.g. "0" + "5" -> "5", not "05").
             "0" alone, and "0." decimals are preserved since they're valid numbers in progress.
             Works on existing inputs and any added later (split people, VAT items, unit price rows). */
          function stripLeadingZero(el) {
            let v = el.value;
            if (v === '' || v === '-') return;
            const neg = v.startsWith('-');
            let body = neg ? v.slice(1) : v;
            // strip leading zeros unless followed by a dot or nothing (so "0" and "0.5" still work mid-typing)
            if (/^0+[0-9]/.test(body)) {
              body = body.replace(/^0+(?=[0-9])/, '');
            }
            const next = (neg ? '-' : '') + body;
            if (next !== v) {
              const pos = el.selectionStart;
              const diff = v.length - next.length;
              el.value = next;
              try { el.setSelectionRange(Math.max(0, (pos || next.length) - diff), Math.max(0, (pos || next.length) - diff)); } catch (e) { }
            }
          }
          function attachNoLeadingZero(root) {
            (root.matches && root.matches('input[type="number"]') ? [root] : root.querySelectorAll ? root.querySelectorAll('input[type="number"]') : []).forEach(el => {
              if (el.dataset.nlz) return;
              el.dataset.nlz = '1';
              el.addEventListener('input', () => stripLeadingZero(el));
            });
          }
          attachNoLeadingZero(document);
          // Watch for dynamically-added inputs (split people, VAT items, unit price rows)
          new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) attachNoLeadingZero(n); }));
          }).observe(document.body, { childList: true, subtree: true });

          var calcFmt = n => 'Rs. ' + (Math.round(n * 100) / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const pct = n => (Math.round(n * 100) / 100).toFixed(2) + '%';
          const CALC_HISTORY_KEY = 'billing_business_calculator_history';
          const CALC_STATE_KEY = 'billing_business_calculator_state';
          let calcHistoryReady = false;
          let calcStateReady = false;
          let calcStateRestoring = false;
          let history = loadHistory();

          function escHtml(value) {
            return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
          }

          function loadHistory() {
            try {
              const saved = JSON.parse(localStorage.getItem(CALC_HISTORY_KEY) || '[]');
              return Array.isArray(saved) ? saved : [];
            } catch (e) { return []; }
          }

          function saveHistory() {
            try { localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(history)); } catch (e) { }
          }

          function pushHistory(label, value, details, metadata = {}) {
            if (!calcHistoryReady) return;
            const now = new Date();
            const entry = {
              label,
              value,
              details: Array.isArray(details) ? details.filter(Boolean) : (details ? [details] : []),
              ...metadata,
              date: now.toLocaleDateString('en-NP'),
              time: now.toLocaleTimeString('en-NP'),
              recordedAt: now.toISOString()
            };
            const signature = JSON.stringify({ label: entry.label, value: entry.value, details: entry.details });
            const lastSignature = history[0] ? JSON.stringify({ label: history[0].label, value: history[0].value, details: history[0].details || [] }) : '';
            if (signature === lastSignature) return;
            history.unshift(entry);
            if (history.length > 200) history.pop();
            saveHistory();
            renderHistory();
          }

          function renderHistory() {
            const el = document.getElementById('hist-list');
            if (!history.length) { el.innerHTML = '<div class="empty-hist">No calculations yet.</div>'; return; }
            el.innerHTML = '<div class="history-list">' + history.map(h => {
              const stamp = ((h.date || '') + ' ' + (h.time || '')).trim();
              const details = (h.details || []).map(d => '<div class="ht">' + escHtml(d) + '</div>').join('');
              return '<div class="hist-item"><div><div class="hv">' + escHtml(h.value) + '</div><div class="ht">' + escHtml(h.label) + '</div>' + details + '</div><div class="ht" style="text-align:right;white-space:nowrap;">' + escHtml(stamp || h.time || '') + '</div></div>';
            }).join('') + '</div>';
          }
          function clearHist() { history = []; saveHistory(); renderHistory(); }
          function showRecordHint(text) {
            const el = document.getElementById('hist-list');
            renderHistory();
            if (text) console.info(text);
          }

          function getCalcInputState() {
            const values = {};
            document.querySelectorAll('#businessCalculatorContent input[id], #businessCalculatorContent select[id]').forEach(el => {
              values[el.id] = el.type === 'checkbox' ? !!el.checked : el.value;
            });
            return values;
          }

          function setCalcInputState(values) {
            Object.entries(values || {}).forEach(([id, value]) => {
              const el = document.getElementById(id);
              if (!el) return;
              if (el.type === 'checkbox') el.checked = !!value;
              else el.value = value;
            });
          }

          function saveCalcState() {
            if (!calcStateReady || calcStateRestoring) return;
            const activePage = document.querySelector('#businessCalculatorContent .pg.on');
            const state = {
              activeTab: activePage ? activePage.id.replace('pg-', '') : 'basic',
              inputValues: getCalcInputState(),
              basicExpr: exprEl ? getRaw() : '',
              basicNum: numEl ? numEl.textContent : '',
              justCalculated,
              lastResult,
              quickRecord,
              wageMode,
              wageBagItems,
              wageQuintalItems,
              lastKgPerBag: lastUsedKgPerBag,
              discType,
              vatMode,
              vatItems,
              splitPeople,
              unitItems
            };
            try { localStorage.setItem(CALC_STATE_KEY, JSON.stringify(state)); } catch (e) { }
          }

          function restoreCalcState() {
            let state = null;
            try { state = JSON.parse(localStorage.getItem(CALC_STATE_KEY) || 'null'); } catch (e) { state = null; }
            if (!state || typeof state !== 'object') return;
            calcStateRestoring = true;
            try {
              if (Array.isArray(state.wageBagItems) && state.wageBagItems.length) wageBagItems = state.wageBagItems.map(item => ({ name: item.name || '', bagKg: parseFloat(item.bagKg) || 50, count: item.count || '', rate: item.rate || '' }));
              if (Array.isArray(state.wageQuintalItems) && state.wageQuintalItems.length) wageQuintalItems = state.wageQuintalItems.map((item, index) => ({
                id: item.id || `wage-${Date.now()}-${index}`,
                item: item.item ?? item.name ?? '',
                mode: item.mode === 'bags' ? 'bags' : 'kg',
                totalKg: item.totalKg ?? item.kg ?? '',
                bags: item.bags ?? '',
                kgPerBag: item.kgPerBag ?? '',
                ratePerQtl: item.ratePerQtl ?? item.rate ?? ''
              }));
              if (Number(state.lastKgPerBag) > 0) lastUsedKgPerBag = Number(state.lastKgPerBag);
              if (Array.isArray(state.vatItems) && state.vatItems.length) vatItems = state.vatItems.map(item => ({ name: item.name || '', price: parseFloat(item.price) || 0 }));
              if (Array.isArray(state.splitPeople) && state.splitPeople.length) splitPeople = state.splitPeople.map((p, i) => ({ name: p.name || 'Person ' + (i + 1), share: parseFloat(p.share) || 0 }));
              if (Array.isArray(state.unitItems) && state.unitItems.length) unitItems = state.unitItems.map((item, i) => ({ name: item.name || 'Option ' + (i + 1), qty: parseFloat(item.qty) || 0, unit: item.unit || 'unit', price: parseFloat(item.price) || 0 }));
              wageMode = 'quintal';
              if (['pct', 'amt', 'sp'].includes(state.discType)) discType = state.discType;
              if (state.vatMode === 'add' || state.vatMode === 'extract') vatMode = state.vatMode;
              if (Array.isArray(state.quickRecord)) quickRecord = state.quickRecord;
              if (state.lastResult) lastResult = String(state.lastResult);
              justCalculated = !!state.justCalculated;

              wageRenderBagItems();
              wageRenderQuintalItems();
              wageSetMode(wageMode);
              renderVatItems();
              renderSplit();
              renderUnitItems();
              setCalcInputState(state.inputValues);

              const discBtn = document.querySelector('#disc-type-pills .pill[data-dt="' + discType + '"]');
              if (discBtn) setDiscType(discType, discBtn);
              const vatBtn = document.querySelector('#vat-mode-pills .pill[data-vm="' + vatMode + '"]');
              if (vatBtn) setVatMode(vatMode, vatBtn);
              setCalcInputState(state.inputValues);

              if (typeof state.basicExpr === 'string' && state.basicExpr) setRaw(state.basicExpr);
              if (numEl && typeof state.basicNum === 'string') numEl.textContent = state.basicNum;

              wageCalc();
              calcDisc();
              calcChange();
              calcVat();
              calcVatItems();
              calcProfit();
              calcSplit();
              calcUnit();

              if (state.activeTab) {
                const btn = Array.from(document.querySelectorAll('#businessCalculatorContent .tb')).find(b => (b.getAttribute('onclick') || '').includes("'" + state.activeTab + "'"));
                if (btn && document.getElementById('pg-' + state.activeTab)) go(state.activeTab, btn);
              }
            } catch (e) {
              console.warn('Calculator draft restore failed. Resetting saved calculator draft.', e);
              try { localStorage.removeItem(CALC_STATE_KEY); } catch (storageErr) { }
            } finally {
              calcStateRestoring = false;
            }
          }

          function attachCalcStateSaving() {
            const root = document.getElementById('businessCalculatorContent');
            if (!root) return;
            const queueSave = () => setTimeout(saveCalcState, 0);
            root.addEventListener('input', queueSave);
            root.addEventListener('change', queueSave);
            root.addEventListener('click', queueSave);
            window.addEventListener('beforeunload', saveCalcState);
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'hidden') saveCalcState();
            });
          }

          renderHistory();

          /* ══ BASIC ══
             Single source of truth: the contenteditable #b-expr div.
             We read its text, parse & evaluate, show live total in #b-num.
             Buttons manipulate the raw text directly.
             Hand-editing also works because we listen to 'input' on the div.
          */


          let wageMode = 'quintal';
          let wageBagItems = [{ name: '', bagKg: 50, count: '', rate: '' }];
          let lastUsedKgPerBag = 30;
          let wageQuintalItems = [{ id: 'wage-1', item: 'Item', mode: 'bags', totalKg: '', bags: '', kgPerBag: '', ratePerQtl: '' }];
          const wageNpr = n => 'Rs. ' + (Math.round((parseFloat(n) || 0) * 100) / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          function wageAddBagItem() { wageBagItems.push({ name: '', bagKg: 50, count: '', rate: '' }); wageRenderBagItems(); wageCalc(); }
          function wageRemoveBagItem(i) { if (wageBagItems.length === 1) return; wageBagItems.splice(i, 1); wageRenderBagItems(); wageCalc(); }
          function wageAddQuintalItem() {
            const previous = wageQuintalItems[wageQuintalItems.length - 1];
            wageQuintalItems.push({
              id: `wage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              item: 'Item', mode: previous?.mode || 'bags', totalKg: '', bags: '',
              kgPerBag: lastUsedKgPerBag, ratePerQtl: ''
            });
            wageRenderQuintalItems(); wageCalc();
          }
          function wageRemoveQuintalItem(i) { if (wageQuintalItems.length === 1) return; wageQuintalItems.splice(i, 1); wageRenderQuintalItems(); wageCalc(); }

          function wageStepBag(i, field, delta) {
            let val = parseFloat(wageBagItems[i][field]) || 0;
            val += delta;
            if (val < 0) val = 0;
            wageBagItems[i][field] = val;
            wageRenderBagItems();
            wageCalc();
          }
          window.wageStepBag = wageStepBag;

          function wageStepQuintal(i, field, delta) {
            const item = wageQuintalItems[i];
            let val = parseFloat(item[field]) || 0;
            val += delta;
            if (field === 'bags') val = Math.max(1, Math.round(val || 1));
            else if (field === 'kgPerBag') val = Math.max(0.01, Number(val.toFixed(2)));
            else val = Math.max(0, val);
            if (field === 'totalKg') item.mode = 'kg';
            else if (field === 'bags' || field === 'kgPerBag') item.mode = 'bags';
            item[field] = val;
            if (field === 'kgPerBag') lastUsedKgPerBag = val;
            wageRenderQuintalItems();
            wageCalc();
          }
          window.wageStepQuintal = wageStepQuintal;

          function wageQuintalTotalKg(item) {
            if (item.mode !== 'bags') return Math.max(0, Number(item.totalKg) || 0);
            const bags = Number(item.bags) || 0;
            const kgPerBag = Number(item.kgPerBag) || 0;
            if (!Number.isInteger(bags) || bags < 1 || kgPerBag <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(item.kgPerBag))) return 0;
            return bags * kgPerBag;
          }

          function wageRoundMoney(value) {
            return Math.floor((value + Number.EPSILON) * 100 + 0.5) / 100;
          }

          function wageRenderBagItems() {
            const list = document.getElementById('wageBagItemsList');
            if (!list) return;
            const bagWtOpts = [10, 20, 25, 30, 45, 50];
            list.innerHTML = wageBagItems.map((item, i) => {
              const wtOptions = bagWtOpts.map(w => '<option value="' + w + '"' + (item.bagKg === w ? ' selected' : '') + '>' + w + ' kg</option>').join('');
              return '<div class="wage-item-row">' +
                '<input type="text" placeholder="Item" value="' + item.name + '" oninput="wageBagItems[' + i + '].name=this.value;wageCalc()">' +
                '<select onchange="wageBagItems[' + i + '].bagKg=parseFloat(this.value)||0;wageCalc()">' + wtOptions + '</select>' +
                '<div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepBag(' + i + ',\'count\',-1)" aria-label="Decrease">−</button><input type="number" class="stepper-val" placeholder="0" value="' + (item.count || '') + '" min="0" oninput="wageBagItems[' + i + '].count=parseFloat(this.value)||0;wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepBag(' + i + ',\'count\',1)" aria-label="Increase">+</button></div>' +
                '<div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepBag(' + i + ',\'rate\',-1)" aria-label="Decrease">−</button><input type="number" class="stepper-val" placeholder="0" value="' + (item.rate || '') + '" min="0" step="0.5" oninput="wageBagItems[' + i + '].rate=parseFloat(this.value)||0;wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepBag(' + i + ',\'rate\',1)" aria-label="Increase">+</button></div>' +
                '<button class="rm" onclick="wageRemoveBagItem(' + i + ')" aria-label="Remove">x</button></div>';
            }).join('');
          }

          function wageRenderQuintalItems() {
            const list = document.getElementById('wageQuintalItemsList');
            if (!list) return;
            list.innerHTML = wageQuintalItems.map((row, i) => {
              const rate = escHtml(row.ratePerQtl);
              const totalKg = wageQuintalTotalKg(row);
              const totalKgValue = row.mode === 'bags' ? (totalKg || '') : row.totalKg;
              return `<div class="wage-item-row three"><div class="wage-field-with-clear"><div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'bags',-1)" aria-label="Decrease bags">−</button><input type="number" class="stepper-val" aria-label="Bags" placeholder="Bags" value="${escHtml(row.bags)}" min="1" step="1" oninput="wageQuintalItems[${i}].mode='bags';wageQuintalItems[${i}].bags=this.value;wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'bags',1)" aria-label="Increase bags">+</button></div><button type="button" class="wage-field-clear" onclick="wageClearQuintalField(${i},'bags')" aria-label="Clear bags">×</button></div><div class="wage-field-with-clear"><div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'kgPerBag',-1)" aria-label="Decrease kg per bag">−</button><input type="number" class="stepper-val" aria-label="Kg per bag" placeholder="Kg/bag" value="${escHtml(row.kgPerBag)}" min="0.01" step="0.01" oninput="wageQuintalItems[${i}].mode='bags';wageQuintalItems[${i}].kgPerBag=this.value;if(Number(this.value)>0)lastUsedKgPerBag=Number(this.value);wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'kgPerBag',1)" aria-label="Increase kg per bag">+</button></div><button type="button" class="wage-field-clear" onclick="wageClearQuintalField(${i},'kgPerBag')" aria-label="Clear kg per bag">×</button></div><div class="wage-field-with-clear"><div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'totalKg',-1)" aria-label="Decrease total kg">−</button><input type="number" id="wageTotalKg-${i}" class="stepper-val" aria-label="Total kg" placeholder="Total kg" value="${escHtml(totalKgValue)}" min="0" step="any" oninput="wageQuintalItems[${i}].mode='kg';wageQuintalItems[${i}].totalKg=this.value;wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'totalKg',1)" aria-label="Increase total kg">+</button></div><button type="button" class="wage-field-clear" onclick="wageClearQuintalField(${i},'totalKg')" aria-label="Clear total kg">×</button></div><div class="wage-field-with-clear"><div class="stepper-input"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'ratePerQtl',-1)" aria-label="Decrease rate">−</button><input type="number" class="stepper-val" aria-label="Rate per quintal" placeholder="Rate" value="${rate}" min="0" step="1" oninput="wageQuintalItems[${i}].ratePerQtl=this.value;wageCalc()"><button type="button" class="stepper-btn" onclick="wageStepQuintal(${i},'ratePerQtl',1)" aria-label="Increase rate">+</button></div><button type="button" class="wage-field-clear" onclick="wageClearQuintalField(${i},'ratePerQtl')" aria-label="Clear rate">×</button></div><button class="rm" onclick="wageRemoveQuintalItem(${i})" aria-label="Remove row">x</button></div>`;
            }).join('');
          }

          function wageClearQuintalField(index, field) {
            const row = wageQuintalItems[index];
            if (!row) return;
            row[field] = '';
            if (field === 'bags' || field === 'kgPerBag') row.mode = 'bags';
            if (field === 'totalKg') row.mode = 'kg';
            wageRenderQuintalItems();
            wageCalc();
          }

          function wageSetMode(mode) {
            wageMode = mode;
            document.getElementById('wageBtnBag')?.classList.toggle('active', mode === 'bag');
            document.getElementById('wageBtnQuintal')?.classList.toggle('active', mode === 'quintal');
            document.getElementById('wageBagSection').style.display = mode === 'bag' ? '' : 'none';
            document.getElementById('wageQuintalSection').style.display = mode === 'quintal' ? '' : 'none';
            wageCalc();
          }

          function wageAddBreakdown(label, value) {
            const rows = document.getElementById('wageBreakdownRows');
            if (!rows) return;
            const row = document.createElement('div');
            row.className = 'res-row';
            row.innerHTML = '<span class="lb">' + label + '</span><span class="vl">' + value + '</span>';
            rows.appendChild(row);
          }

          function wageCalc() {
            const rows = document.getElementById('wageBreakdownRows');
            if (rows) rows.innerHTML = '';
            let totalWage = 0, totalBags = 0, totalKg = 0, hasBagRows = false, hasKgRows = false;
            if (wageMode === 'bag') {
              wageBagItems.forEach(item => {
                const bags = parseFloat(item.count) || 0;
                const kg = parseFloat(item.bagKg) || 0;
                const rate = parseFloat(item.rate) || 0;
                const line = bags * rate;
                totalBags += bags;
                totalKg += bags * kg;
                totalWage += line;
                if (line > 0) wageAddBreakdown((item.name || 'Item') + ' (' + bags + ' bags x NPR ' + rate + ')', wageNpr(line));
              });
            } else {
              wageQuintalItems.forEach(item => {
                const kg = wageQuintalTotalKg(item);
                if (item.mode === 'bags') {
                  item.totalKg = kg;
                  const totalKgInput = document.getElementById(`wageTotalKg-${wageQuintalItems.indexOf(item)}`);
                  if (totalKgInput && document.activeElement !== totalKgInput) totalKgInput.value = kg || '';
                }
                const rate = parseFloat(item.ratePerQtl) || 0;
                if (item.mode === 'bags') {
                  const bagCount = Number(item.bags) || 0;
                  if (kg > 0 && Number.isInteger(bagCount) && bagCount >= 1) {
                    hasBagRows = true;
                    totalBags += bagCount;
                  }
                } else hasKgRows = true;
                if (kg <= 0) return;
                const qtl = kg / 100;
                const line = wageRoundMoney(qtl * rate);
                totalKg += kg;
                totalWage += line;
                const itemName = escHtml(item.item || 'Item');
                const quantityText = item.mode === 'bags' ? `${Number(item.bags)} bags x ${Number(item.kgPerBag)} kg = ` : '';
                if (line > 0) wageAddBreakdown(`${itemName} (${quantityText}${qtl.toFixed(2)} qtl x NPR ${rate})`, wageNpr(line));
              });
            }
            document.getElementById('wageMetricQuintal').textContent = (totalKg / 100).toFixed(2);
            const bagsMetric = document.getElementById('wageMetricBags');
            bagsMetric.textContent = wageMode === 'bag' ? totalBags : (hasBagRows ? String(totalBags) : '-');
            bagsMetric.title = wageMode === 'quintal' && hasKgRows ? 'Bags counted only for rows entered as bags' : '';
            document.getElementById('wageMetricBase').textContent = wageNpr(totalWage);
            document.getElementById('wageMetricTotal').textContent = wageNpr(totalWage);
            document.getElementById('wageResultTotal').textContent = wageNpr(totalWage);
          }

          function getWageRecord() {
            let totalWage = 0, totalBags = 0, totalKg = 0;
            const sourceItems = [], rows = [];
            if (wageMode === 'bag') {
              wageBagItems.forEach(item => {
                const bags = parseFloat(item.count) || 0;
                const kg = parseFloat(item.bagKg) || 0;
                const rate = parseFloat(item.rate) || 0;
                const line = bags * rate;
                totalBags += bags; totalKg += bags * kg; totalWage += line;
                if (bags > 0 || rate > 0) sourceItems.push((item.name || 'Item') + ': ' + bags + ' bags, ' + kg + ' kg, rate ' + rate);
              });
            } else {
              wageQuintalItems.forEach(item => {
                const kg = wageQuintalTotalKg(item);
                const rate = parseFloat(item.ratePerQtl) || 0;
                const bags = item.mode === 'bags' ? Number(item.bags) || 0 : 0;
                const kgPerBag = item.mode === 'bags' ? Number(item.kgPerBag) || 0 : 0;
                const validBags = item.mode === 'bags' && kg > 0 && Number.isInteger(bags) && bags >= 1;
                if (validBags) totalBags += bags;
                if (kg <= 0) return;
                const qtl = kg / 100;
                const line = wageRoundMoney(qtl * rate);
                rows.push({
                  id: item.id,
                  item: item.item || 'Item',
                  mode: item.mode === 'bags' ? 'bags' : 'kg',
                  bags: validBags ? bags : 0,
                  kgPerBag: validBags ? kgPerBag : 0,
                  totalKg: kg,
                  ratePerQtl: rate,
                  lineWage: line
                });
                totalKg += kg; totalWage += line;
                const displayName = item.item || 'Item';
                sourceItems.push(item.mode === 'bags'
                  ? `${displayName} (${bags} bags x ${kgPerBag} kg = ${qtl.toFixed(2)} qtl x NPR ${rate})`
                  : `${displayName} (${qtl.toFixed(2)} qtl x NPR ${rate})`);
              });
            }
            return { totalWage, totalBags, totalKg, sourceItems, rows };
          }

          function recordWage() {
            wageCalc();
            const rec = getWageRecord();
            if (rec.totalWage <= 0) return;
            pushHistory('Wage calculator (' + (wageMode === 'bag' ? 'Per-bag' : 'Quintal-wise') + ')', wageNpr(rec.totalWage), [
              'Total quintals: ' + (rec.totalKg / 100).toFixed(2),
              'Total bags: ' + (wageMode === 'bag' ? rec.totalBags : (rec.rows.some(row => row.mode === 'bags') ? rec.totalBags : '-')),
              ...rec.sourceItems
            ], wageMode === 'quintal' ? { rows: rec.rows.map(row => ({ ...row })) } : {});
          }

          wageRenderBagItems();
          wageRenderQuintalItems();
          wageSetMode(wageMode);

          const exprEl = document.getElementById('b-expr');
          const numEl = document.getElementById('b-num');

          // Allowed characters only
          const ALLOWED = /[^0-9\.\+\-×÷\.]/g;

          function fmtNum(n) {
            const parts = String(n).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
          }

          function getRaw() {
            return exprEl.textContent.replace(/\u00a0/g, ' ').trim();
          }

          // Used by buttons (no real caret context) — sets text and puts caret at end.
          function setRaw(str) {
            exprEl.textContent = str;
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(exprEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }

          // Used while the user is actively typing — keeps the caret where they left it.
          function setRawPreserveCaret(str, caretPos) {
            exprEl.textContent = str;
            const range = document.createRange();
            const sel = window.getSelection();
            const node = exprEl.firstChild;
            const pos = node ? Math.max(0, Math.min(caretPos, node.length)) : 0;
            if (node) {
              range.setStart(node, pos);
              range.setEnd(node, pos);
            } else {
              range.selectNodeContents(exprEl);
              range.collapse(false);
            }
            sel.removeAllRanges();
            sel.addRange(range);
          }

          function evalExpr(str) {
            try {
              // strip trailing operator
              const clean = str.replace(/[\+\-×÷]$/, '').replace(/÷/g, '/').replace(/×/g, '*');
              if (!clean) return null;
              const res = Function('"use strict";return(' + clean + ')')();
              if (!isFinite(res)) return null;
              return Math.round(res * 1e10) / 1e10;
            } catch (e) { return null; }
          }

          function bRefresh() {
            const raw = getRaw();
            if (!raw || raw === '0') { numEl.textContent = ''; return; }
            // Only show live total if there's an operator in the expression
            if (/[\+\-×÷]/.test(raw)) {
              const total = evalExpr(raw);
              numEl.textContent = total !== null ? '= ' + fmtNum(total) : '';
            } else {
              numEl.textContent = '';
            }
          }

          // Get caret offset within exprEl's text content
          function getCaretOffset() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return exprEl.textContent.length;
            const range = sel.getRangeAt(0);
            // Use a cloned range expanded from the start of exprEl to the caret —
            // its string length gives a reliable offset regardless of which text
            // node the browser actually placed the selection in.
            try {
              const preRange = document.createRange();
              preRange.selectNodeContents(exprEl);
              preRange.setEnd(range.startContainer, range.startOffset);
              return preRange.toString().length;
            } catch (e) {
              return exprEl.textContent.length;
            }
          }

          // Live refresh on manual edits — normalize * and / into × ÷, strip invalid chars.
          // IMPORTANT: only touch the DOM/caret when something actually needs fixing
          // (an invalid char, or */ to normalize). For ordinary valid edits — typing a
          // digit, operator, dot, or replacing a selected character like "+" with "-" —
          // we leave the browser's native contenteditable behavior alone, since
          // rewriting textContent and manually repositioning the caret on every single
          // keystroke is what causes the caret to jump to the end on some browsers.
          exprEl.addEventListener('input', () => {
            justCalculated = false;
            const before = exprEl.textContent;
            const normalized = before.replace(/\*/g, '×').replace(/\//g, '÷');
            const stripped = normalized.replace(/[^0-9\.\+\-×÷]/g, '');
            if (stripped !== before) {
              const caret = getCaretOffset();
              const keptBeforeCaret = normalized.slice(0, caret).replace(/[^0-9\.\+\-×÷]/g, '').length;
              setRawPreserveCaret(stripped, keptBeforeCaret);
            }
            bRefresh();
          });

          // Prevent paste of non-numeric garbage
          exprEl.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const clean = text.replace(/[^0-9\.\+\-×÷\/\*]/g, '').replace(/\//g, '÷').replace(/\*/g, '×');
            document.execCommand('insertText', false, clean);
          });

          // Prevent Enter key creating new lines in contenteditable
          exprEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); doEquals(); }
            if (e.key === 'Escape') { justCalculated = false; setRaw('0'); numEl.textContent = ''; }
          });

          // When true, the expression box holds a just-calculated expression and
          // b-num is showing its result on the line below (e.g. expr "100+400",
          // b-num "= 500"). The next digit/operator tap should react to that,
          // same as it used to react to a trailing "=500" embedded in the text.
          let justCalculated = false;
          let lastResult = '0';

          function doEquals() {
            const raw = getRaw();
            if (!raw) return;
            const total = evalExpr(raw);
            if (total !== null) {
              pushHistory(raw, fmtNum(total));
              lastResult = fmtNum(total);
              justCalculated = true;
              // keep the expression on its own line; show the result on the line below
              numEl.textContent = '= ' + lastResult;
            }
          }

          // Capture the caret position the instant a button is pressed, before the
          // button can steal focus away from exprEl (which happens before 'click'
          // fires in some browsers, losing the selection we need).
          let lastCaretInBox = null;
          function captureCaretBeforeButton() {
            const sel = window.getSelection();
            const selectionInsideExpr = sel && sel.anchorNode && exprEl.contains(sel.anchorNode);
            if (document.activeElement === exprEl || selectionInsideExpr) {
              lastCaretInBox = getCaretOffset();
            } else {
              lastCaretInBox = null;
            }
          }
          document.querySelectorAll('.bb').forEach(btn => {
            btn.addEventListener('mousedown', captureCaretBeforeButton);
            btn.addEventListener('touchstart', captureCaretBeforeButton, { passive: true });
          });

          document.querySelectorAll('.bb').forEach(btn => {
            btn.addEventListener('click', () => {
              const k = btn.dataset.k;
              let raw = getRaw();
              const lastIsEq = justCalculated;

              // Was the cursor sitting inside the expression box (not at the very end)
              // when this button was tapped? If so, operate at that position instead
              // of always at the end — e.g. tapping ÷ with the cursor right after an
              // existing "-" should replace that "-", not append ÷ to the end.
              const capturedCaret = lastCaretInBox;
              let caretPos = null;
              if (!lastIsEq && capturedCaret !== null) {
                if (capturedCaret < raw.length) caretPos = capturedCaret;
              }
              lastCaretInBox = null;

              if (caretPos !== null && ['÷', '×', '-', '+'].includes(k)) {
                const charBefore = raw[caretPos - 1];
                const charAfter = raw[caretPos];
                if (/[\+\-×÷]/.test(charBefore)) {
                  // cursor sits right after an operator — replace that operator
                  setRawPreserveCaret(raw.slice(0, caretPos - 1) + k + raw.slice(caretPos), caretPos);
                } else if (/[\+\-×÷]/.test(charAfter)) {
                  // cursor sits right before an operator — replace that operator
                  setRawPreserveCaret(raw.slice(0, caretPos) + k + raw.slice(caretPos + 1), caretPos + 1);
                } else {
                  // cursor is between digits — insert a new operator there
                  setRawPreserveCaret(raw.slice(0, caretPos) + k + raw.slice(caretPos), caretPos + 1);
                }
                bRefresh();
                return;
              }
              if (caretPos !== null && k !== 'AC' && k !== '⌫' && k !== '=' && k !== '+/-' && k !== '%') {
                // digit or dot tapped with cursor mid-expression — insert there
                setRawPreserveCaret(raw.slice(0, caretPos) + k + raw.slice(caretPos), caretPos + 1);
                bRefresh();
                return;
              }

              // detect if last char is an operator
              const lastIsOp = /[\+\-×÷]$/.test(raw);

              if (k === 'AC') {
                justCalculated = false;
                setRaw('0'); numEl.textContent = ''; return;
              }
              if (k === '⌫') {
                if (lastIsEq) { justCalculated = false; setRaw('0'); numEl.textContent = ''; return; }
                if (capturedCaret !== null) {
                  const pos = Math.max(0, Math.min(capturedCaret, raw.length));
                  const nextAtCursor = pos > 0 ? raw.slice(0, pos - 1) + raw.slice(pos) : raw;
                  setRawPreserveCaret(nextAtCursor || '0', nextAtCursor ? Math.max(0, pos - 1) : 1);
                  bRefresh(); return;
                }
                const next = raw.length > 1 ? raw.slice(0, -1) : '0';
                setRaw(next); bRefresh(); return;
              }
              if (k === '+/-') {
                // negate the last number in the expression
                const m = raw.match(/^(.*[\+\-×÷])?(-?)([0-9\.]+)$/);
                if (m) {
                  const prefix = m[1] || '';
                  const neg = m[2];
                  const num = m[3];
                  setRaw(prefix + (neg ? '' : '-') + num);
                  bRefresh();
                }
                return;
              }
              if (k === '%') {
                const relativePercent = raw.match(/^(.*)([\+\-])(-?[0-9\.]+)$/);
                if (relativePercent) {
                  const base = evalExpr(relativePercent[1]);
                  const percentage = parseFloat(relativePercent[3]);
                  if (base !== null && Number.isFinite(percentage)) {
                    const amount = Math.round((base * percentage / 100) * 1e10) / 1e10;
                    setRaw(relativePercent[1] + relativePercent[2] + amount);
                    bRefresh();
                    return;
                  }
                }
                const m = raw.match(/^(.*[\+\-×÷])?(-?[0-9\.]+)$/);
                if (m) {
                  const prefix = m[1] || '';
                  const num = parseFloat(m[2]) / 100;
                  setRaw(prefix + num);
                  bRefresh();
                }
                return;
              }
              if (['÷', '×', '-', '+'].includes(k)) {
                if (lastIsEq) {
                  justCalculated = false;
                  numEl.textContent = '';
                  setRaw(lastIsOp ? raw.slice(0, -1) + k : raw + k);
                } else if (lastIsOp) {
                  // replace last operator
                  setRaw(raw.slice(0, -1) + k);
                } else {
                  setRaw(raw + k);
                }
                bRefresh(); return;
              }
              if (k === '=') {
                doEquals(); return;
              }
              // digit or dot
              if (lastIsEq) {
                // start fresh
                justCalculated = false;
                numEl.textContent = '';
                setRaw(k === '.' ? '0.' : k);
              } else if (lastIsOp) {
                // after operator: start new number, no leading zero
                setRaw(raw + (k === '.' ? '0.' : k));
              } else {
                // normal digit append — avoid leading zero
                if (raw === '0' && k !== '.') { setRaw(k); }
                else if (k === '.' && /(?:^|[\+\-×÷])[0-9]*\.[0-9]*$/.test(raw)) { return; } // no double dot
                else { setRaw(raw + k); }
              }
              bRefresh();
            });
          });
          document.addEventListener('keydown', e => {
            // Only intercept keys when the calculator modal is actually visible
            const calcModal = document.getElementById('businessCalculatorModal');
            if (!calcModal || calcModal.style.display === 'none' || !calcModal.classList.contains('active')) return;

            const pg = document.getElementById('pg-basic');
            if (!pg.classList.contains('on')) return;

            // If user is focused on any input or textarea, let normal typing happen
            const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            // If focus/selection is inside the editable expression box, let normal typing happen
            const sel = window.getSelection();
            const focusedInsideExpr =
              document.activeElement === exprEl ||
              exprEl.contains(document.activeElement) ||
              (sel && sel.anchorNode && exprEl.contains(sel.anchorNode));
            if (focusedInsideExpr) return;
            const map = { 'Enter': '=', 'Backspace': '⌫', 'Escape': 'AC', '/': '÷', '*': '×', '+': '+', '-': '-' };
            const key = map[e.key] || e.key;
            const btn = document.querySelector('.bb[data-k="' + key + '"]');
            if (btn) { e.preventDefault(); btn.click(); }
          });
          let quickRecord = null;
          function qtSq() { const v = parseFloat(document.getElementById('qt-sq').value); if (!isNaN(v)) { const res = v * v; document.getElementById('qt-result').textContent = v + '² = ' + res; quickRecord = ['Square', String(res), ['Number: ' + v]]; } }
          function qtSqrt() { const v = parseFloat(document.getElementById('qt-sqrt').value); if (!isNaN(v) && v >= 0) { const res = Math.round(Math.sqrt(v) * 1e8) / 1e8; document.getElementById('qt-result').textContent = '√' + v + ' = ' + res; quickRecord = ['Square root', String(res), ['Number: ' + v]]; } }
          function qtPow() { const b = parseFloat(document.getElementById('qt-base').value), x = parseFloat(document.getElementById('qt-exp').value); if (!isNaN(b) && !isNaN(x)) { const res = Math.round(Math.pow(b, x) * 1e8) / 1e8; document.getElementById('qt-result').textContent = b + '^' + x + ' = ' + res; quickRecord = ['Power', String(res), ['Base: ' + b, 'Exponent: ' + x]]; } }
          function recordQuickTool() { if (quickRecord) pushHistory(quickRecord[0], quickRecord[1], quickRecord[2]); }

          /* ══ DISCOUNT ══ */
          let discType = 'pct';
          function setDiscType(t, btn) { discType = t; document.querySelectorAll('#disc-type-pills .pill').forEach(p => p.classList.remove('on')); btn.classList.add('on'); document.getElementById('d-pct-field').style.display = t === 'pct' ? '' : 'none'; document.getElementById('d-amt-field').style.display = t === 'amt' ? '' : 'none'; document.getElementById('d-sp-field').style.display = t === 'sp' ? '' : 'none'; calcDisc(); }
          function setPct(v) { document.getElementById('d-pct').value = v; calcDisc(); }
          function calcDisc() {
            const price = parseFloat(document.getElementById('d-price').value) || 0;
            const vat = document.getElementById('d-vat').checked;
            let discAmt = 0;
            if (discType === 'pct') { const p = parseFloat(document.getElementById('d-pct').value) || 0; discAmt = price * p / 100; }
            else if (discType === 'amt') { discAmt = parseFloat(document.getElementById('d-amt').value) || 0; }
            else { const sp = parseFloat(document.getElementById('d-sp').value) || 0; discAmt = price - sp; }
            const after = Math.max(0, price - discAmt);
            const vatAmt = vat ? after * 0.13 : 0;
            const pay = after + vatAmt;
            document.getElementById('dm-orig').textContent = calcFmt(price);
            document.getElementById('dm-disc').textContent = '− ' + calcFmt(discAmt);
            document.getElementById('dm-after').textContent = calcFmt(after);
            document.getElementById('dm-vat').textContent = '+ ' + calcFmt(vatAmt);
            document.getElementById('dm-pay').textContent = calcFmt(pay);
            document.getElementById('dm-save').textContent = calcFmt(discAmt) + ' (' + (price > 0 ? pct(discAmt / price * 100) : '0%') + ')';
          }
          function recordDisc() {
            calcDisc();
            const price = parseFloat(document.getElementById('d-price').value) || 0;
            const vat = document.getElementById('d-vat').checked;
            let discAmt = 0;
            if (discType === 'pct') { const p = parseFloat(document.getElementById('d-pct').value) || 0; discAmt = price * p / 100; }
            else if (discType === 'amt') { discAmt = parseFloat(document.getElementById('d-amt').value) || 0; }
            else { const sp = parseFloat(document.getElementById('d-sp').value) || 0; discAmt = price - sp; }
            const after = Math.max(0, price - discAmt);
            const vatAmt = vat ? after * 0.13 : 0;
            const pay = after + vatAmt;
            if (price > 0) pushHistory('Discount calculator', calcFmt(pay), ['Original: ' + calcFmt(price), 'Discount: ' + calcFmt(discAmt), 'After discount: ' + calcFmt(after), 'VAT: ' + calcFmt(vatAmt), 'Type: ' + discType]);
          }

          /* ══ CHANGE ══ */
          function setCash(v) { document.getElementById('ch-cash').value = v; calcChange(); }
          const DENOMS = [1000, 500, 100, 50, 20, 10, 5, 2, 1];
          function calcChange() {
            const bill = parseFloat(document.getElementById('ch-bill').value) || 0;
            const cash = parseFloat(document.getElementById('ch-cash').value) || 0;
            const change = Math.round((cash - bill) * 100) / 100;
            const el = document.getElementById('ch-result');
            const note = document.getElementById('ch-note');
            el.textContent = calcFmt(Math.abs(change));
            if (change > 0) { el.className = 'big-val green'; note.textContent = 'Return to customer'; }
            else if (change < 0) { el.className = 'big-val red'; note.textContent = 'Short — needs Rs. ' + Math.abs(change).toFixed(2) + ' more'; }
            else { el.className = 'big-val info'; note.textContent = 'Exact amount paid'; }
            let rem = Math.round(change);
            const dd = document.getElementById('ch-denoms');
            if (change <= 0) { dd.textContent = 'No change to return.'; return; }
            let html = '';
            DENOMS.forEach(d => { const cnt = Math.floor(rem / d); if (cnt > 0) { html += '<div class="res-row"><span class="lb">Rs. ' + d + '</span><span class="vl">× ' + cnt + ' = Rs. ' + (cnt * d).toLocaleString('en-NP') + '</span></div>'; rem -= cnt * d; } });
            dd.innerHTML = html || '<span style="color:var(--color-text-tertiary);">No breakdown available.</span>';
          }
          function recordChange() {
            calcChange();
            const bill = parseFloat(document.getElementById('ch-bill').value) || 0;
            const cash = parseFloat(document.getElementById('ch-cash').value) || 0;
            const change = Math.round((cash - bill) * 100) / 100;
            if (bill > 0 || cash > 0) pushHistory('Change calculator', calcFmt(change), ['Bill: ' + calcFmt(bill), 'Cash received: ' + calcFmt(cash)]);
          }

          /* ══ VAT ══ */
          let vatMode = 'add';
          let vatItems = [{ name: '', price: 0 }];
          function setVatMode(m, btn) { vatMode = m; document.querySelectorAll('#vat-mode-pills .pill').forEach(p => p.classList.remove('on')); btn.classList.add('on'); document.getElementById('vat-inp-label').textContent = m === 'add' ? 'Price before VAT (Rs.)' : 'Price including VAT (Rs.)'; calcVat(); }
          function calcVat() {
            const p = parseFloat(document.getElementById('vat-price').value) || 0;
            const r = (parseFloat(document.getElementById('vat-rate').value) || 13) / 100;
            let base, vatAmt, total;
            if (vatMode === 'add') { base = p; vatAmt = p * r; total = p + vatAmt; }
            else { total = p; base = p / (1 + r); vatAmt = p - base; }
            document.getElementById('vat-base').textContent = calcFmt(base);
            document.getElementById('vat-amt').textContent = calcFmt(vatAmt);
            document.getElementById('vat-total').textContent = calcFmt(total);
          }
          function recordVat() {
            calcVat();
            const p = parseFloat(document.getElementById('vat-price').value) || 0;
            const r = (parseFloat(document.getElementById('vat-rate').value) || 13) / 100;
            let base, vatAmt, total;
            if (vatMode === 'add') { base = p; vatAmt = p * r; total = p + vatAmt; }
            else { total = p; base = p / (1 + r); vatAmt = p - base; }
            if (p > 0) pushHistory('VAT calculator (' + vatMode + ')', calcFmt(total), ['Input: ' + calcFmt(p), 'Rate: ' + pct(r * 100), 'Base: ' + calcFmt(base), 'VAT: ' + calcFmt(vatAmt)]);
          }
          function addVatItem() { vatItems.push({ name: '', price: 0 }); renderVatItems(); }
          function removeVatItem(i) { if (vatItems.length === 1) return; vatItems.splice(i, 1); renderVatItems(); }
          function renderVatItems() {
            const list = document.getElementById('vat-items-list');
            list.innerHTML = vatItems.map((it, i) =>
              '<div style="display:grid;grid-template-columns:1fr 100px 24px;gap:6px;align-items:center;margin-bottom:8px;">' +
              '<input style="font-size:13px;" type="text" value="' + it.name + '" placeholder="Item name" oninput="vatItems[' + i + '].name=this.value;calcVatItems()">' +
              '<input style="font-size:13px;" type="number" value="' + (it.price || '') + '" placeholder="Rs." oninput="vatItems[' + i + '].price=parseFloat(this.value)||0;calcVatItems()">' +
              '<button class="rm" onclick="removeVatItem(' + i + ')" aria-label="Remove"><i class="ti ti-x" aria-hidden="true"></i></button></div>'
            ).join('');
            calcVatItems();
          }
          function calcVatItems() {
            const r = 0.13;
            let sub = 0; vatItems.forEach(it => sub += it.price);
            const vatAmt = sub * r; const total = sub + vatAmt;
            document.getElementById('vi-sub').textContent = calcFmt(sub);
            document.getElementById('vi-vat').textContent = calcFmt(vatAmt);
            document.getElementById('vi-total').textContent = calcFmt(total);
          }
          function recordVatItems() {
            calcVatItems();
            const r = 0.13;
            let sub = 0; vatItems.forEach(it => sub += it.price);
            const vatAmt = sub * r; const total = sub + vatAmt;
            if (sub > 0) pushHistory('Multi-item VAT', calcFmt(total), ['Sub-total: ' + calcFmt(sub), 'VAT: ' + calcFmt(vatAmt), ...vatItems.map(it => (it.name || 'Item') + ': ' + calcFmt(it.price || 0))]);
          }
          renderVatItems();

          /* ══ PROFIT ══ */
          function calcProfit() {
            const cost = parseFloat(document.getElementById('pr-cost').value) || 0;
            const sell = parseFloat(document.getElementById('pr-sell').value) || 0;
            const fixed = parseFloat(document.getElementById('pr-fixed').value) || 0;
            const units = parseFloat(document.getElementById('pr-units').value) || 1;
            const profit = sell - cost;
            const margin = sell > 0 ? (profit / sell) * 100 : 0;
            const markup = cost > 0 ? (profit / cost) * 100 : 0;
            const bep = profit > 0 ? Math.ceil(fixed / profit) : 0;
            document.getElementById('pr-profit').textContent = calcFmt(profit);
            document.getElementById('pr-profit').className = 'mv ' + (profit >= 0 ? 'green' : 'red');
            document.getElementById('pr-margin').textContent = pct(margin);
            document.getElementById('pr-margin').className = 'mv ' + (margin >= 0 ? 'green' : 'red');
            document.getElementById('pr-markup').textContent = pct(markup);
            document.getElementById('pr-bep').textContent = bep > 0 ? bep + ' units' : '—';
            const barPct = Math.min(100, Math.max(0, margin));
            const bar = document.getElementById('pr-bar');
            bar.style.width = barPct + '%';
            bar.style.background = margin < 0 ? 'var(--color-text-danger)' : margin < 10 ? 'var(--color-text-warning)' : 'var(--color-text-success)';
            let gaugeLabel = margin < 0 ? 'Loss' : margin < 5 ? 'Very low margin' : margin < 15 ? 'Low margin' : margin < 30 ? 'Healthy margin' : 'Excellent margin';
            document.getElementById('pr-gauge-label').textContent = gaugeLabel + ' (' + pct(margin) + ')';
            if (fixed > 0 && units > 0) { const fixedPerUnit = fixed / units; const netProfit = profit - fixedPerUnit; document.getElementById('pr-overhead-res').textContent = 'Fixed cost per unit: ' + calcFmt(fixedPerUnit) + ' · Net profit per unit: ' + calcFmt(netProfit); }
            else { document.getElementById('pr-overhead-res').textContent = 'Enter fixed overhead and units to see cost split.'; }
          }
          function recordProfit() {
            calcProfit();
            const cost = parseFloat(document.getElementById('pr-cost').value) || 0;
            const sell = parseFloat(document.getElementById('pr-sell').value) || 0;
            const fixed = parseFloat(document.getElementById('pr-fixed').value) || 0;
            const profit = sell - cost;
            const margin = sell > 0 ? (profit / sell) * 100 : 0;
            const markup = cost > 0 ? (profit / cost) * 100 : 0;
            const bep = profit > 0 ? Math.ceil(fixed / profit) : 0;
            if (sell > 0 || cost > 0) pushHistory('Profit calculator', calcFmt(profit) + ' (' + pct(margin) + ')', ['Cost: ' + calcFmt(cost), 'Selling price: ' + calcFmt(sell), 'Markup: ' + pct(markup), 'Break-even: ' + (bep > 0 ? bep + ' units' : '-')]);
          }
          function calcMarginTarget() {
            const cost = parseFloat(document.getElementById('pr-cost').value) || 0;
            const target = parseFloat(document.getElementById('pr-margin-target').value) || 0;
            if (cost > 0 && target > 0 && target < 100) { const sp = cost / (1 - target / 100); document.getElementById('pr-margin-hint').textContent = 'Sell at ' + calcFmt(sp) + ' to achieve ' + target + '% margin'; }
          }

          /* ══ SPLIT ══ */
          let splitPeople = [{ name: 'Person 1', share: 50 }, { name: 'Person 2', share: 50 }];
          function addSplitPerson() { splitPeople.push({ name: 'Person ' + (splitPeople.length + 1), share: 0 }); renderSplit(); }
          function removeSplitPerson(i) { if (splitPeople.length === 1) return; splitPeople.splice(i, 1); renderSplit(); }
          function renderSplit() {
            const list = document.getElementById('split-people');
            list.innerHTML = splitPeople.map((p, i) =>
              '<div style="display:grid;grid-template-columns:1fr 80px 80px 24px;gap:6px;align-items:center;margin-bottom:6px;">' +
              '<input style="font-size:13px;" type="text" value="' + p.name + '" oninput="splitPeople[' + i + '].name=this.value;calcSplit()">' +
              '<input style="font-size:13px;" type="number" value="' + p.share + '" min="0" max="100" oninput="splitPeople[' + i + '].share=parseFloat(this.value)||0;calcSplit()">' +
              '<div id="sp-amt-' + i + '" style="font-size:13px;font-weight:500;color:var(--color-text-primary);text-align:right;">Rs. 0</div>' +
              '<button class="rm" onclick="removeSplitPerson(' + i + ')" aria-label="Remove"><i class="ti ti-x" aria-hidden="true"></i></button></div>'
            ).join('');
            calcSplit();
          }
          function calcSplit() {
            const total = parseFloat(document.getElementById('sp-total').value) || 0;
            const svcPct = (parseFloat(document.getElementById('sp-svc').value) || 0) / 100;
            const addVat = document.getElementById('sp-vat').checked;
            const svcAmt = total * svcPct;
            const afterSvc = total + svcAmt;
            const vatAmt = addVat ? afterSvc * 0.13 : 0;
            const grand = afterSvc + vatAmt;
            document.getElementById('sp-sub').textContent = calcFmt(total);
            document.getElementById('sp-svc-amt').textContent = calcFmt(svcAmt);
            document.getElementById('sp-vat-amt').textContent = calcFmt(vatAmt);
            document.getElementById('sp-grand').textContent = calcFmt(grand);
            const totalShare = splitPeople.reduce((s, p) => s + p.share, 0) || 100;
            splitPeople.forEach((p, i) => {
              const el = document.getElementById('sp-amt-' + i);
              if (el) el.textContent = calcFmt(grand * (p.share / totalShare));
            });
          }
          function recordSplit() {
            calcSplit();
            const total = parseFloat(document.getElementById('sp-total').value) || 0;
            const svcPct = (parseFloat(document.getElementById('sp-svc').value) || 0) / 100;
            const addVat = document.getElementById('sp-vat').checked;
            const svcAmt = total * svcPct;
            const afterSvc = total + svcAmt;
            const vatAmt = addVat ? afterSvc * 0.13 : 0;
            const grand = afterSvc + vatAmt;
            if (total > 0) pushHistory('Split bill calculator', calcFmt(grand), ['Bill: ' + calcFmt(total), 'Service: ' + calcFmt(svcAmt), 'VAT: ' + calcFmt(vatAmt), ...splitPeople.map(p => p.name + ': ' + p.share + '%')]);
          }
          renderSplit();

          /* ══ UNIT PRICE ══ */
          let unitItems = [{ name: 'Option A', qty: 1, unit: 'kg', price: 100 }, { name: 'Option B', qty: 5, unit: 'kg', price: 450 }];
          function addUnitItem() { unitItems.push({ name: 'Option ' + (unitItems.length + 1), qty: 1, unit: 'kg', price: 0 }); renderUnitItems(); }
          function removeUnitItem(i) { if (unitItems.length === 1) return; unitItems.splice(i, 1); renderUnitItems(); }
          function renderUnitItems() {
            const list = document.getElementById('unit-items');
            list.innerHTML = unitItems.map((it, i) =>
              '<div style="display:grid;grid-template-columns:1fr 70px 60px 90px 24px;gap:6px;align-items:center;margin-bottom:8px;">' +
              '<input style="font-size:13px;" type="text" value="' + it.name + '" placeholder="Name" oninput="unitItems[' + i + '].name=this.value;calcUnit()">' +
              '<input style="font-size:13px;" type="number" value="' + it.qty + '" placeholder="Qty" min="0" oninput="unitItems[' + i + '].qty=parseFloat(this.value)||0;calcUnit()">' +
              '<input style="font-size:13px;" type="text" value="' + it.unit + '" placeholder="unit" oninput="unitItems[' + i + '].unit=this.value;calcUnit()">' +
              '<input style="font-size:13px;" type="number" value="' + (it.price || '') + '" placeholder="Rs. total" min="0" oninput="unitItems[' + i + '].price=parseFloat(this.value)||0;calcUnit()">' +
              '<button class="rm" onclick="removeUnitItem(' + i + ')" aria-label="Remove"><i class="ti ti-x" aria-hidden="true"></i></button></div>'
            ).join('');
            calcUnit();
          }
          function calcUnit() {
            const res = document.getElementById('unit-result');
            if (!unitItems.length) { res.innerHTML = ''; return; }
            const rated = unitItems.map(it => ({ ...it, perUnit: it.qty > 0 ? it.price / it.qty : Infinity }));
            const minRate = Math.min(...rated.map(r => r.perUnit));
            res.innerHTML = rated.map(it => {
              const isBest = it.perUnit === minRate;
              return '<div class="res-row"><span class="lb">' + it.name + ' (' + it.qty + ' ' + it.unit + ' @ ' + calcFmt(it.price) + ')' + (isBest ? ' <span style="font-size:11px;background:var(--color-background-success);color:var(--color-text-success);padding:1px 6px;border-radius:4px;margin-left:4px;">Best value</span>' : '') + '</span><span class="vl ' + (isBest ? 'green' : '') + '">' + calcFmt(it.perUnit) + ' / ' + it.unit + '</span></div>';
            }).join('');
          }
          function recordUnit() {
            calcUnit();
            const rated = unitItems.map(it => ({ ...it, perUnit: it.qty > 0 ? it.price / it.qty : Infinity })).filter(it => isFinite(it.perUnit));
            if (!rated.some(it => it.price > 0 && it.qty > 0)) return;
            const minRate = Math.min(...rated.map(r => r.perUnit));
            const best = rated.find(it => it.perUnit === minRate);
            pushHistory('Unit price calculator', calcFmt(best.perUnit) + ' / ' + best.unit, unitItems.map(it => it.name + ': ' + it.qty + ' ' + it.unit + ' @ ' + calcFmt(it.price || 0)));
          }
          renderUnitItems();
          restoreCalcState();
          calcHistoryReady = true;
          calcStateReady = true;
          attachCalcStateSaving();
          saveCalcState();
        
