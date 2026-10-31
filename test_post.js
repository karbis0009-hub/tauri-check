const http = require('http');

const item = {
    id: 'test-item-' + Date.now(),
    name: 'Test Post Product',
    category: 'Seeds',
    sku: 'TEST-SKU',
    barcode: '123456789',
    brand: 'TestBrand',
    hsCode: '1234',
    unit: 'kg',
    description: 'Test Description',
    costPrice: 100,
    price: 150,
    vatRate: 13,
    stock: 10,
    lowStockAlert: 5,
    supplier: 'Test Supplier',
    expiry: '2026-12-31',
    expiryNote: 'Test note',
    barcodeWeight: '1 kg',
    barcodeMfg: 'Test Mfg'
};

const data = JSON.stringify(item);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/inventory',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response Body:', body);
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e.message);
});

req.write(data);
req.end();
