const path = require('path');
const sqlite3 = require(path.join(__dirname, '../server/node_modules/sqlite3')).verbose();

const dbPath = path.join(__dirname, '../pos_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening DB:', err);
        process.exit(1);
    }
    
    // Check if price_tiers table exists or create
    db.run(`
        CREATE TABLE IF NOT EXISTS price_tiers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId TEXT NOT NULL,
            tierId TEXT NOT NULL,
            minQty REAL NOT NULL,
            maxQty REAL,
            ratePerUnit REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='price_tiers'", (err, rows) => {
            console.log('price_tiers table verification:', rows);
            
            const productId = 'test_tier_prod_1';
            db.run("INSERT OR REPLACE INTO inventory (id, name, category, price, stock, enable_tiered_pricing, price_tiers) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [productId, 'Test Dal Tiered', 'Dal', 190, 100, 1, JSON.stringify([
                    { tierId: 't1', minQty: 0, maxQty: 0.499, ratePerUnit: 190 },
                    { tierId: 't2', minQty: 0.5, maxQty: 0.999, ratePerUnit: 180 },
                    { tierId: 't3', minQty: 1, maxQty: null, ratePerUnit: 170 }
                ])],
                function(err) {
                    if (err) console.error('Insert error:', err);
                    else {
                        console.log('Inserted test tiered product into DB');
                        
                        db.get("SELECT * FROM inventory WHERE id = ?", [productId], (err, row) => {
                            console.log('Fetched product:', row.id, row.name, 'enable_tiered_pricing:', row.enable_tiered_pricing);
                            console.log('Tiers JSON:', row.price_tiers);
                            
                            // Clean up test product
                            db.run("DELETE FROM inventory WHERE id = ?", [productId], () => {
                                db.close();
                                console.log('Cleaned up test product. DB test passed!');
                            });
                        });
                    }
                }
            );
        });
    });
});
