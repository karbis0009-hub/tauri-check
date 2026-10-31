const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check server DB
const serverDb = new sqlite3.Database(path.join(__dirname, 'pos_database.db'));
serverDb.all('SELECT name FROM sqlite_master WHERE type="table"', (e, r) => {
    console.log('Server DB tables:', JSON.stringify(r));
    serverDb.all('SELECT COUNT(*) as cnt FROM sales', (e2, r2) => {
        console.log('Server DB sales count:', r2, e2 ? e2.message : '');
        serverDb.close();
    });
});

// Check root DB
const rootDb = new sqlite3.Database(path.join(__dirname, '..', 'pos_database.db'));
rootDb.all('SELECT name FROM sqlite_master WHERE type="table"', (e, r) => {
    console.log('Root DB tables:', JSON.stringify(r));
    if (r && r.find(t => t.name === 'sales')) {
        rootDb.all('SELECT COUNT(*) as cnt FROM sales', (e2, r2) => {
            console.log('Root DB sales count:', r2, e2 ? e2.message : '');
            rootDb.close();
        });
    } else {
        console.log('Root DB has no sales table');
        rootDb.close();
    }
});
