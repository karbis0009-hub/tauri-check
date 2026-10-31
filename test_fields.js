const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

async function run() {
    const testItem = {
        id: 'test-item-001',
        name: 'Test Product',
        category: 'Seeds',
        price: 150,
        stock: 50,
        barcode: '200000000001',
        unit: 'kg',
        sku: 'TST-001',
        brand: 'TestBrand',
        hsCode: 'HS1234',
        description: 'A test product with all fields',
        costPrice: 100,
        vatRate: 0,
        lowStockAlert: 10,
        supplier: 'Test Supplier Co.',
        expiry: '2027-01-01',
        expiryNote: 'Best before 2027',
        barcodeWeight: '500g',
        barcodeMfg: 'Kathmandu, Nepal',
        barcodeNote: 'Handle with care',
        sortOrder: 1
    };

    console.log('1. Saving item with all fields...');
    const saveRes = await post('http://localhost:3000/api/inventory', testItem);
    console.log('   Save result:', saveRes);

    console.log('\n2. Fetching item back by ID...');
    const fetched = await get('http://localhost:3000/api/inventory/test-item-001');
    console.log('   Fetched item:', JSON.stringify(fetched, null, 2));

    const missingFields = ['sku', 'brand', 'hsCode', 'description', 'costPrice', 'vatRate', 'lowStockAlert', 'supplier', 'expiry', 'expiryNote', 'barcodeWeight', 'barcodeMfg', 'barcodeNote'].filter(f => fetched[f] == null || fetched[f] === '');
    if (missingFields.length === 0) {
        console.log('\n✅ All fields saved and retrieved correctly!');
    } else {
        console.log('\n❌ Missing fields:', missingFields.join(', '));
    }
}

run().catch(console.error);
