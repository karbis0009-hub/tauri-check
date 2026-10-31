const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./pos_database.db');

const testItem = {
    id: 'test-user-prod-' + Date.now(),
    name: 'Test Persistent Product',
    category: 'Oil',
    price: 150,
    stock: 10,
    barcode: '999999999',
    unit: 'kg'
};

db.run(
    `INSERT OR REPLACE INTO inventory
     (id, name, category, price, stock, barcode, unit, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
        testItem.id, testItem.name, testItem.category, testItem.price, testItem.stock, testItem.barcode, testItem.unit
    ],
    function (err) {
        if (err) {
            console.error('SQL Error:', err.message);
        } else {
            console.log('Successfully inserted item!', this.changes);
        }
        db.close();
    }
);
