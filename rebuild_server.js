/**
 * rebuild_server.js
 * Reconstructs a clean server.js by:
 * 1. Extracting the seedData array from the current (corrupt) server.js
 * 2. Extracting the API route handlers (which are clean)
 * 3. Writing a new server.js with proper structure
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
const backupPath = path.join(__dirname, 'server.js.bak');
const content = fs.readFileSync(serverPath, 'utf8');

// ─── 1. Back up the current corrupt file ─────────────────────────────────────
fs.writeFileSync(backupPath, content, 'utf8');
console.log('Backed up corrupt server.js to server.js.bak');

// ─── 2. Extract seedData JSON array ──────────────────────────────────────────
const seedStart = content.indexOf('"id": "default-1"');
if (seedStart === -1) { console.error('Cannot find seedData start'); process.exit(1); }

// Walk backwards to the opening [
let arrayStart = seedStart;
while (arrayStart > 0 && content[arrayStart] !== '[') arrayStart--;

// Walk forward to find the matching ]
let depth = 1, arrayEnd = arrayStart + 1;
while (depth > 0 && arrayEnd < content.length) {
    if (content[arrayEnd] === '[') depth++;
    else if (content[arrayEnd] === ']') depth--;
    arrayEnd++;
}
const seedDataArrayText = content.substring(arrayStart, arrayEnd);
console.log('Extracted seedData array, length:', seedDataArrayText.length);

// ─── 3. Extract API route handlers (from first app.use/get/post after line 1000 onwards) ──
// Find start of API routes - look for "// ============ INVENTORY API"
// In the corrupt file, API routes start around character position after "Graceful shutdown"
// More reliable: find "app.get('/api/inventory'" which is a fixed marker
const apiRoutesStart = content.indexOf("app.get('/api/inventory'");
if (apiRoutesStart === -1) { console.error('Cannot find API routes start'); process.exit(1); }
const apiRoutesStartLine = content.substring(0, apiRoutesStart).split('\n').length;
console.log('API routes start at line:', apiRoutesStartLine);

// Find the graceful shutdown - end of file
const appListenIdx = content.lastIndexOf("app.listen(PORT");
if (appListenIdx === -1) { console.error('Cannot find app.listen'); process.exit(1); }
const shutdownIdx = content.lastIndexOf("process.on('SIGINT'");
if (shutdownIdx === -1) { console.error('Cannot find SIGINT handler'); process.exit(1); }

// Find the end of the SIGINT handler
let siEnd = shutdownIdx;
let brCount = 0;
let started = false;
while (siEnd < content.length) {
    if (content[siEnd] === '{') { brCount++; started = true; }
    if (content[siEnd] === '}') brCount--;
    if (started && brCount === 0) { siEnd++; break; }
    siEnd++;
}
// Include the closing `);` and any trailing newline
while (siEnd < content.length && (content[siEnd] === ')' || content[siEnd] === ';' || content[siEnd] === '\n' || content[siEnd] === '\r')) siEnd++;

const apiRoutesSection = content.substring(apiRoutesStart, siEnd);
console.log('Extracted API routes section, length:', apiRoutesSection.length);

// ─── 4. Build the clean server.js ────────────────────────────────────────────
const newServer = `const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files (HTML, JS, CSS) from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Database setup
const dbPath = path.join(__dirname, 'pos_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Sales table
        db.run(\`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                billNo INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                customer TEXT,
                customerPhone TEXT,
                paymentMode TEXT,
                total REAL NOT NULL,
                items TEXT NOT NULL,
                status TEXT DEFAULT 'PAID',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);

        // Migration: Add status column if it doesn't exist
        db.serialize(() => {
            db.run("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'PAID'", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.warn('Migration warning:', err.message);
                    db.run("UPDATE sales SET status = 'PAID' WHERE paymentMode != 'CREDIT'");
                    db.all("SELECT customerName FROM credit_accounts", (err, accounts) => {
                        if (accounts) {
                            accounts.forEach(acc => settleCustomerBills(acc.customerName, () => {}));
                        }
                    });
                }
            });
        });

        // Migration: Add Sales Invoice detail columns to sales table
        db.serialize(() => {
            db.run("ALTER TABLE sales ADD COLUMN address TEXT", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN vatNo TEXT", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN remarks TEXT", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN totalQty REAL", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN gross REAL", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN discount REAL", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN taxable REAL", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN nonTaxable REAL", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN vat REAL", (err) => {});
            // Migration: Add extended inventory columns (safe - ignores if already exists)
            db.run("ALTER TABLE inventory ADD COLUMN unit TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN sku TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN brand TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN hsCode TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN description TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN costPrice REAL", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN vatRate REAL DEFAULT 13", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN lowStockAlert INTEGER DEFAULT 5", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN supplier TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN expiry TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN expiryNote TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeWeight TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeMfg TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeNote TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeBatchNo TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeLabelShopName TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeLabelLayout TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN barcodeType TEXT", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN sortOrder INTEGER DEFAULT 0", (err) => {});
        });

        // Inventory table
        db.run(\`
            CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL,
                barcode TEXT,
                unit TEXT,
                sku TEXT,
                brand TEXT,
                hsCode TEXT,
                description TEXT,
                costPrice REAL,
                vatRate REAL DEFAULT 13,
                lowStockAlert INTEGER DEFAULT 5,
                supplier TEXT,
                expiry TEXT,
                expiryNote TEXT,
                barcodeWeight TEXT,
                barcodeMfg TEXT,
                barcodeNote TEXT,
                barcodeBatchNo TEXT,
                barcodeLabelShopName TEXT,
                barcodeLabelLayout TEXT,
                barcodeType TEXT,
                sortOrder INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);

        // Settings table
        db.run(\`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);

        // Credit Accounts (AR) table
        db.run(\`
            CREATE TABLE IF NOT EXISTS credit_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT UNIQUE NOT NULL,
                customerPhone TEXT,
                totalBalance REAL DEFAULT 0,
                lastTransactionAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);

        // Credit Transactions table
        db.run(\`
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                billNo INTEGER,
                timestamp TEXT NOT NULL,
                notes TEXT
            )
        \`);

        // Credit Notes (Returns) table
        db.run(\`
            CREATE TABLE IF NOT EXISTS credit_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cnNo TEXT UNIQUE NOT NULL,
                originalBillNo TEXT NOT NULL,
                customerName TEXT,
                totalAmount REAL NOT NULL,
                items TEXT NOT NULL,
                reason TEXT,
                timestamp TEXT NOT NULL
            )
        \`);

        // Debit Notes (Purchase Returns) table
        db.run(\`
            CREATE TABLE IF NOT EXISTS debit_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dnNo TEXT UNIQUE NOT NULL,
                originalPINo TEXT NOT NULL,
                supplierName TEXT,
                totalAmount REAL NOT NULL,
                items TEXT NOT NULL,
                reason TEXT,
                timestamp TEXT NOT NULL
            )
        \`);

        // Purchase Invoices table
        db.run(\`
            CREATE TABLE IF NOT EXISTS purchase_invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                piNo TEXT UNIQUE NOT NULL,
                entryDate TEXT NOT NULL,
                invoiceNo TEXT,
                invoiceDate TEXT,
                purchaseType TEXT,
                paymentTerms TEXT,
                account TEXT,
                chequeNo TEXT,
                godown TEXT,
                supplier TEXT,
                address TEXT,
                vatNo TEXT,
                remarks TEXT,
                items TEXT NOT NULL,
                totalQty REAL,
                gross REAL,
                discount REAL,
                taxable REAL,
                nonTaxable REAL,
                vat REAL,
                netAmount REAL,
                timestamp TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);

        db.run(\`CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp)\`);
        db.run(\`CREATE INDEX IF NOT EXISTS idx_sales_customer_ar ON sales(customer, paymentMode, status)\`);

        console.log('Database tables initialized');
        seedInventory(db);

        // Cleanup: Fix negative balances
        db.all("SELECT customerName, totalBalance FROM credit_accounts WHERE totalBalance < 0", (err, rows) => {
            if (err) return console.error('Error finding negative balances:', err);
            rows.forEach(row => {
                db.run("UPDATE credit_accounts SET totalBalance = 0 WHERE customerName = ?", [row.customerName]);
                db.all(
                    "SELECT id, amount FROM credit_transactions WHERE customerName = ? AND type = 'PAYMENT' ORDER BY timestamp DESC",
                    [row.customerName],
                    (err, payments) => {
                        if (payments && payments.length > 0) {
                            let toRemove = Math.abs(row.totalBalance);
                            for (const p of payments) {
                                if (toRemove > 0) {
                                    db.run("DELETE FROM credit_transactions WHERE id = ?", [p.id]);
                                    toRemove -= p.amount;
                                } else break;
                            }
                        }
                    }
                );
            });
        });
    });
}

// Seed Inventory Data
const seedData = ${seedDataArrayText};

function seedInventory(db) {
    db.get("SELECT COUNT(*) as count FROM inventory", (err, row) => {
        if (err) return console.error('Error counting inventory:', err.message);

        const doSeed = () => {
            const stmt = db.prepare("INSERT OR REPLACE INTO inventory (id, name, category, price, stock, barcode, unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
            seedData.forEach(item => {
                stmt.run(item.id, item.name, item.category, item.price, item.stock, item.barcode, item.unit);
            });
            stmt.finalize();
            console.log('Database seeded with default products successfully');
        };

        if (row.count === 0) {
            doSeed();
        } else {
            // Clean up old numeric demo IDs (1-100) if present
            db.run("DELETE FROM inventory WHERE CAST(id AS INTEGER) >= 1 AND CAST(id AS INTEGER) <= 100 AND id = CAST(id AS INTEGER)", (err) => {
                if (!err) console.log('Cleaned up old numeric default IDs.');
            });

            db.get("SELECT id FROM inventory WHERE name = 'Basmati Rice 25kg' LIMIT 1", (err2, oldRow) => {
                if (!err2 && oldRow) {
                    console.log('Old demo data detected, re-seeding...');
                    db.run("DELETE FROM inventory", (err3) => {
                        if (!err3) doSeed();
                    });
                }
            });
        }
    });
}

function settleCustomerBills(customerName, callback) {
    if (!customerName || customerName === 'Walk-in') return callback(null);
    db.get('SELECT totalBalance FROM credit_accounts WHERE customerName = ?', [customerName], (err, acc) => {
        if (err) return callback(err);
        if (!acc) return callback(null);
        const balance = acc.totalBalance;
        db.all(
            "SELECT id, total FROM sales WHERE customer = ? AND paymentMode = 'CREDIT' ORDER BY timestamp DESC",
            [customerName],
            (err, rows) => {
                if (err) return callback(err);
                let debt = balance;
                const updates = [];
                rows.forEach(sale => {
                    const status = debt > 0.01 ? 'UNPAID' : 'PAID';
                    updates.push(new Promise((resolve, reject) => {
                        db.run("UPDATE sales SET status = ? WHERE id = ?", [status, sale.id], (e) => e ? reject(e) : resolve());
                    }));
                    debt -= sale.total;
                });
                Promise.all(updates).then(() => callback(null)).catch(e => callback(e));
            }
        );
    });
}

function repairNegativeBalance(customerName, callback) {
    db.get('SELECT totalBalance FROM credit_accounts WHERE customerName = ?', [customerName], (err, acc) => {
        if (err || !acc || acc.totalBalance >= -0.01) return callback && callback(err);
        const overpaid = Math.abs(acc.totalBalance);
        console.log(\`Repairing \${customerName}: Overpaid by \${overpaid}\`);
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.all(
                "SELECT id, amount FROM credit_transactions WHERE customerName = ? AND type = 'PAYMENT' ORDER BY timestamp DESC",
                [customerName],
                (err, payments) => {
                    if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                    let toRemove = overpaid;
                    const idsToRemove = [];
                    for (const p of payments) {
                        if (toRemove > 0) { idsToRemove.push(p.id); toRemove -= p.amount; } else break;
                    }
                    if (idsToRemove.length > 0) {
                        const placeholders = idsToRemove.map(() => '?').join(',');
                        db.run(\`DELETE FROM credit_transactions WHERE id IN (\${placeholders})\`, idsToRemove, (err) => {
                            if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                            db.run("UPDATE credit_accounts SET totalBalance = 0 WHERE customerName = ?", [customerName], (err) => {
                                if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                                settleCustomerBills(customerName, (err) => {
                                    if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                                    db.run('COMMIT');
                                    console.log(\`Repair completed for \${customerName}\`);
                                    if (callback) callback(null);
                                });
                            });
                        });
                    } else {
                        db.run('ROLLBACK');
                        if (callback) callback(null);
                    }
                }
            );
        });
    });
}

// Rule 2: Block the DELETE command for the Invoices table
function cleanupOldRecords() {
    console.log('Automatic cleanup of sales records is disabled to comply with No-Delete rule.');
}

// Run cleanup daily
setInterval(cleanupOldRecords, 24 * 60 * 60 * 1000);
// Run cleanup on startup
setTimeout(cleanupOldRecords, 5000);

// ============ API ROUTES ============

${apiRoutesSection}
`;

fs.writeFileSync(serverPath, newServer, 'utf8');
console.log('Successfully rebuilt server.js!');
