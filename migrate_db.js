const path = require('path');
const sqlite3 = require(path.join(__dirname, '../server/node_modules/sqlite3')).verbose();

const dbPath = path.join(__dirname, '../pos_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening DB:', err);
        process.exit(1);
    }
    
    db.serialize(() => {
        db.run("ALTER TABLE inventory ADD COLUMN enable_tiered_pricing INTEGER DEFAULT 0", (err) => {
            if (err) console.log('enable_tiered_pricing column notice:', err.message);
            else console.log('Added enable_tiered_pricing column to inventory');
        });
        
        db.run("ALTER TABLE inventory ADD COLUMN price_tiers TEXT", (err) => {
            if (err) console.log('price_tiers column notice:', err.message);
            else console.log('Added price_tiers column to inventory');
        });

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
            if (err) console.error('price_tiers table error:', err);
            else console.log('price_tiers table ready');
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_price_tiers_productId ON price_tiers(productId)`, () => {
            db.close();
            console.log('Migration complete!');
        });
    });
});
