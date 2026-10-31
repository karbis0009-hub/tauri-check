const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('billing.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

dom.window.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
};
dom.window.print = () => { console.log("Print called!"); };

const appJs = fs.readFileSync('js/app.js', 'utf8');

try {
    dom.window.eval(appJs);
    
    setTimeout(() => {
        const panInput = dom.window.document.getElementById('customerPAN');
        if (!panInput) {
            console.error("PAN input not found!");
            return;
        }
        
        panInput.value = "987654321";
        panInput.dispatchEvent(new dom.window.Event('input'));
        
        console.log("After input, cart state:", dom.window.localStorage.getItem('pos_billing_cart_state'));
        
        dom.window.addToCart('1', 1);
        dom.window.checkout().then(() => {
            dom.window.finalizeSale().then(() => {
                const sales = JSON.parse(dom.window.localStorage.getItem('pos_sales') || '[]');
                console.log("Recorded Sales:", sales);
                process.exit(0);
            });
        });
        
    }, 100);
} catch (e) {
    console.error(e);
}
