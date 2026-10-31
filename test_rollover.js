const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
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
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Fetching current settings...');
        const settings = await get('http://localhost:3000/api/settings');
        console.log('Current settings:', settings);

        console.log('\nRunning rollover...');
        const res = await post('http://localhost:3000/api/settings/rollover', {
            newBSYear: 2083,
            newFiscalYearStr: '083/84'
        });
        console.log('Rollover response:', res);

        console.log('\nFetching updated settings...');
        const updatedSettings = await get('http://localhost:3000/api/settings');
        console.log('Updated settings:', updatedSettings);

        console.log('\nTesting next bill number...');
        const nextBill = await get('http://localhost:3000/api/sales/next-bill-number');
        console.log('Next bill number info:', nextBill);
    } catch (e) {
        console.error('Test failed:', e);
    }
}

run();
