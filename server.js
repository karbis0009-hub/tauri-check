const express = require('express');
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
const dbPath = path.join(__dirname, '..', 'pos_database.db');
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
        db.run(`
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
        `);

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
            db.run("ALTER TABLE sales ADD COLUMN storeSettings TEXT", (err) => {
                // Populate default snapshot for old records that don't have storeSettings
                db.all("SELECT * FROM settings", (sErr, sRows) => {
                    if (!sErr && sRows && sRows.length > 0) {
                        const defaultSettings = {};
                        sRows.forEach(r => {
                            try { defaultSettings[r.key] = JSON.parse(r.value); } catch(e) { defaultSettings[r.key] = r.value; }
                        });
                        const defaultSettingsStr = JSON.stringify(defaultSettings);
                        db.run("UPDATE sales SET storeSettings = ? WHERE storeSettings IS NULL", [defaultSettingsStr]);
                    }
                });
            });
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
            db.run("ALTER TABLE inventory ADD COLUMN status TEXT DEFAULT 'active'", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN business_id TEXT DEFAULT 'biz_1'", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN business_id TEXT DEFAULT 'biz_1'", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN businessType TEXT", (err) => {});
            db.run("ALTER TABLE sales ADD COLUMN isVatInvoice INTEGER DEFAULT 0", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN business_id TEXT DEFAULT 'biz_1'", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN pan TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN address TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN totalSpent REAL DEFAULT 0", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN visitCount INTEGER DEFAULT 0", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN firstVisit TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN lastVisit TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN notes TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN tags TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN creditLimit REAL DEFAULT 0", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN loyaltyPoints REAL DEFAULT 0", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN isActive INTEGER DEFAULT 1", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN createdAt TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN promiseDate TEXT", (err) => {});
            db.run("ALTER TABLE credit_accounts ADD COLUMN timeline TEXT", (err) => {});
            db.run("ALTER TABLE credit_notes ADD COLUMN business_id TEXT DEFAULT 'biz_1'", (err) => {});
            db.run("ALTER TABLE purchase_invoices ADD COLUMN business_id TEXT DEFAULT 'biz_1'", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN enable_tiered_pricing INTEGER DEFAULT 0", (err) => {});
            db.run("ALTER TABLE inventory ADD COLUMN price_tiers TEXT", (err) => {});

            // Auto one-time rebuild of customer CRM stats on startup
            setTimeout(() => {
                rebuildAllCustomerStats();
            }, 1000);
        });

        // Inventory table
        db.run(`
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
                status TEXT DEFAULT 'active',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Settings table
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Credit Accounts (AR) table
        db.run(`
            CREATE TABLE IF NOT EXISTS credit_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT UNIQUE NOT NULL,
                customerPhone TEXT,
                totalBalance REAL DEFAULT 0,
                lastTransactionAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                business_id TEXT DEFAULT 'biz_1',
                pan TEXT,
                address TEXT,
                totalSpent REAL DEFAULT 0,
                visitCount INTEGER DEFAULT 0,
                firstVisit TEXT,
                lastVisit TEXT,
                notes TEXT,
                tags TEXT,
                creditLimit REAL DEFAULT 0,
                loyaltyPoints REAL DEFAULT 0,
                isActive INTEGER DEFAULT 1,
                createdAt TEXT,
                promiseDate TEXT,
                timeline TEXT
            )
        `);

        // Credit Transactions table
        db.run(`
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                billNo INTEGER,
                timestamp TEXT NOT NULL,
                notes TEXT
            )
        `);

        // Credit Notes (Returns) table
        db.run(`
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
        `);

        // Debit Notes (Purchase Returns) table
        db.run(`
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
        `);

        // Purchase Invoices table
        db.run(`
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
        `);

        // Price Tiers table (Quantity-based pricing)
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
        `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_sales_customer_ar ON sales(customer, paymentMode, status)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_price_tiers_productId ON price_tiers(productId)`);

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
const seedData = [
    {
        "id": "default-1",
        "name": "Tori Oil",
        "category": "Oil",
        "price": 350,
        "stock": 999,
        "barcode": null,
        "unit": "Liter"
    },
    {
        "id": "default-2",
        "name": "Sarso oil",
        "category": "Oil",
        "price": 400,
        "stock": 999,
        "barcode": null,
        "unit": "Liter"
    },
    {
        "id": "default-3",
        "name": "Aalas Oil",
        "category": "Oil",
        "price": 600,
        "stock": 999,
        "barcode": null,
        "unit": "Liter"
    },
    {
        "id": "default-4",
        "name": "Til Oil",
        "category": "Oil",
        "price": 750,
        "stock": 999,
        "barcode": null,
        "unit": "Liter"
    },
    {
        "id": "default-5",
        "name": "Bottle 2.5 Liter",
        "category": "Oil",
        "price": 90,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-6",
        "name": "Bottle 5 Liter",
        "category": "Oil",
        "price": 120,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-7",
        "name": "Bottle 10 Liter",
        "category": "Oil",
        "price": 220,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-8",
        "name": "Bottle 20 Liter",
        "category": "Oil",
        "price": 350,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-9",
        "name": "Tori phalako",
        "category": "Oil",
        "price": 20,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-10",
        "name": "Local Maas Dal",
        "category": "Dal",
        "price": 260,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-11",
        "name": "Maas Dal",
        "category": "Dal",
        "price": 230,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-12",
        "name": "Local Musuro",
        "category": "Dal",
        "price": 220,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-13",
        "name": "Musuro",
        "category": "Dal",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-14",
        "name": "Local Moong Dal",
        "category": "Dal",
        "price": 220,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-15",
        "name": "Moong Dal",
        "category": "Dal",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-16",
        "name": "Moong Geda",
        "category": "Dal",
        "price": 220,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-17",
        "name": "Moong Chata Dal",
        "category": "Dal",
        "price": 180,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-18",
        "name": "Mix Dal",
        "category": "Dal",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-19",
        "name": "Rahar",
        "category": "Dal",
        "price": 240,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-20",
        "name": "Chana Dal",
        "category": "Dal",
        "price": 170,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-21",
        "name": "Chana",
        "category": "Simi",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-22",
        "name": "Local Chana",
        "category": "Simi",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-23",
        "name": "Kabuli Chana",
        "category": "Simi",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-24",
        "name": "Green kerau",
        "category": "Simi",
        "price": 160,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-25",
        "name": "Seto Kerau",
        "category": "Simi",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-26",
        "name": "Sano Kerau",
        "category": "Simi",
        "price": 270,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-27",
        "name": "Sano Kerau",
        "category": "Simi",
        "price": 60,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-28",
        "name": "Palpali Simi",
        "category": "Simi",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-29",
        "name": "Rajma",
        "category": "Simi",
        "price": 280,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-30",
        "name": "Rajma",
        "category": "Simi",
        "price": 60,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-31",
        "name": "Bodi",
        "category": "Simi",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-32",
        "name": "Mashang",
        "category": "Simi",
        "price": 170,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-33",
        "name": "Kwati",
        "category": "Simi",
        "price": 190,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-34",
        "name": "Gahat",
        "category": "Simi",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-35",
        "name": "Lukla Simi",
        "category": "Simi",
        "price": 250,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-36",
        "name": "Lukla Simi",
        "category": "Simi",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-37",
        "name": "Kalo Simi",
        "category": "Simi",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-38",
        "name": "Phapar Pitho",
        "category": "Pitho/Chyakhla",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-39",
        "name": "Phapar",
        "category": "Pitho/Chyakhla",
        "price": 190,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-40",
        "name": "Kodo Pitho",
        "category": "Pitho/Chyakhla",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-41",
        "name": "Kodo",
        "category": "Pitho/Chyakhla",
        "price": 90,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-42",
        "name": "Gahun Pitho",
        "category": "Pitho/Chyakhla",
        "price": 90,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-43",
        "name": "Gahun",
        "category": "Pitho/Chyakhla",
        "price": 80,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-44",
        "name": "Makai Pitho",
        "category": "Pitho/Chyakhla",
        "price": 70,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-45",
        "name": "Popcon Makai",
        "category": "Pitho/Chyakhla",
        "price": 130,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-46",
        "name": "Local Makai",
        "category": "Pitho/Chyakhla",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-47",
        "name": "Makai Chyakhla",
        "category": "Pitho/Chyakhla",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-48",
        "name": "Phito Phidako",
        "category": "Pitho/Chyakhla",
        "price": 20,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-49",
        "name": "Mix Sattu",
        "category": "Pitho/Chyakhla",
        "price": 250,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-50",
        "name": "Chana Sattu",
        "category": "Pitho/Chyakhla",
        "price": 250,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-51",
        "name": "Junalo",
        "category": "Pitho/Chyakhla",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-52",
        "name": "Jeera",
        "category": "Species",
        "price": 550,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-53",
        "name": "Dhaniya",
        "category": "Species",
        "price": 140,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-54",
        "name": "Jeera Powder",
        "category": "Species",
        "price": 600,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-55",
        "name": "Jeera Powder",
        "category": "Species",
        "price": 130,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-56",
        "name": "Jeera Pidhako",
        "category": "Species",
        "price": 30,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-57",
        "name": "Besar Powder",
        "category": "Species",
        "price": 500,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-58",
        "name": "Besar Powder",
        "category": "Species",
        "price": 110,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-59",
        "name": "Jwano",
        "category": "Species",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-60",
        "name": "Jwano",
        "category": "Species",
        "price": 50,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-61",
        "name": "Lwang",
        "category": "Species",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-62",
        "name": "Timur",
        "category": "Species",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-63",
        "name": "Khairo Til",
        "category": "Seeds",
        "price": 400,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-64",
        "name": "Khairo Til",
        "category": "Seeds",
        "price": 90,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-65",
        "name": "Seto Til",
        "category": "Seeds",
        "price": 400,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-66",
        "name": "Seto Til",
        "category": "Seeds",
        "price": 90,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-67",
        "name": "Aalas",
        "category": "Seeds",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-68",
        "name": "Aalas",
        "category": "Seeds",
        "price": 70,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-69",
        "name": "Silam",
        "category": "Seeds",
        "price": 750,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-70",
        "name": "Silam",
        "category": "Seeds",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-71",
        "name": "Methi",
        "category": "Seeds",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-72",
        "name": "Methi",
        "category": "Seeds",
        "price": 40,
        "stock": 999,
        "barcode": null,
        "unit": "gram"
    },
    {
        "id": "default-73",
        "name": "Kalo Bhatmas",
        "category": "Seeds",
        "price": 260,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-74",
        "name": "Khairo Bhatmas",
        "category": "Seeds",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-75",
        "name": "Thulo Seto Bhatmas",
        "category": "Seeds",
        "price": 250,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-76",
        "name": "Seto Bhatmas",
        "category": "Seeds",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-77",
        "name": "Hariyo Bhatmas",
        "category": "Seeds",
        "price": 500,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-78",
        "name": "Ban Silam",
        "category": "Seeds",
        "price": 600,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-79",
        "name": "Tori",
        "category": "Seeds",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-80",
        "name": "Surso",
        "category": "Seeds",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-81",
        "name": "Local Pokhrali",
        "category": "Chamal",
        "price": 120,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-82",
        "name": "Local Pokhrali 30kg",
        "category": "Chamal",
        "price": 3000,
        "stock": 999,
        "barcode": null,
        "unit": "bag"
    },
    {
        "id": "default-83",
        "name": "Local Jeera",
        "category": "Chamal",
        "price": 150,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-84",
        "name": "Local Jeera 30kg",
        "category": "Chamal",
        "price": 4300,
        "stock": 999,
        "barcode": null,
        "unit": "bag"
    },
    {
        "id": "default-85",
        "name": "Local Basmati",
        "category": "Chamal",
        "price": 200,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-86",
        "name": "Local Basmati 30kg",
        "category": "Chamal",
        "price": 5700,
        "stock": 999,
        "barcode": null,
        "unit": "bag"
    },
    {
        "id": "default-87",
        "name": "Taichin Chamal",
        "category": "Chamal",
        "price": 180,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-88",
        "name": "Khata Chamal",
        "category": "Chamal",
        "price": 140,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-89",
        "name": "Chamal Phidako",
        "category": "Chamal",
        "price": 10,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-90",
        "name": "Pina",
        "category": "Pina",
        "price": 50,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-91",
        "name": "Pina",
        "category": "Pina",
        "price": 45,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-92",
        "name": "Pina 40 kg",
        "category": "Pina",
        "price": 1800,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-93",
        "name": "Dhulo Pina",
        "category": "Pina",
        "price": 60,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-94",
        "name": "Local Taichin Chiura",
        "category": "Chiura",
        "price": 160,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-95",
        "name": "Rato chiura",
        "category": "Chiura",
        "price": 140,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-96",
        "name": "Mechi chiya",
        "category": "Chiya Pati",
        "price": 275,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-97",
        "name": "Mechi Masala",
        "category": "Chiya Pati",
        "price": 290,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-98",
        "name": "Maiti Ghar",
        "category": "Chiya Pati",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-99",
        "name": "Shakar",
        "category": "Seasonal",
        "price": 300,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    },
    {
        "id": "default-100",
        "name": "Janai",
        "category": "Seasonal",
        "price": 25,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-101",
        "name": "Battai Egg",
        "category": "Seasonal",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "pcs"
    },
    {
        "id": "default-102",
        "name": "Chakku",
        "category": "Seasonal",
        "price": 100,
        "stock": 999,
        "barcode": null,
        "unit": "kg"
    }
];

function seedInventory(db) {
    // 1. Clean up legacy categories, old test items, and old numeric demo IDs
    db.run("DELETE FROM inventory WHERE category IN ('Grocery', 'Snacks', 'Dairy', 'Beverage', 'Household', 'Personal Care', 'Other') OR name LIKE '%Test%' OR id LIKE 'test%'", (err) => {
        if (!err) console.log('Cleaned up legacy categories & test products from DB.');
    });
    db.run("DELETE FROM inventory WHERE CAST(id AS INTEGER) >= 1 AND CAST(id AS INTEGER) <= 100 AND id = CAST(id AS INTEGER)", (err) => {
        if (!err) console.log('Cleaned up old numeric default IDs.');
    });

    // 2. Insert default seed items if not already existing (preserves user edited names, prices, categories)
    const stmt = db.prepare("INSERT OR IGNORE INTO inventory (id, name, category, price, stock, barcode, unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
    seedData.forEach(item => {
        stmt.run(item.id, item.name, item.category, item.price, item.stock, item.barcode, item.unit);
    });
    stmt.finalize();
    console.log('Database synced with canonical default products successfully');
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
        console.log(`Repairing ${customerName}: Overpaid by ${overpaid}`);
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
                        db.run(`DELETE FROM credit_transactions WHERE id IN (${placeholders})`, idsToRemove, (err) => {
                            if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                            db.run("UPDATE credit_accounts SET totalBalance = 0 WHERE customerName = ?", [customerName], (err) => {
                                if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                                settleCustomerBills(customerName, (err) => {
                                    if (err) { db.run('ROLLBACK'); return callback && callback(err); }
                                    db.run('COMMIT');
                                    console.log(`Repair completed for ${customerName}`);
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

// Universal Customer AR Sync Helper for Sales (Cash, QR, Credit, etc.)
function recordCustomerSaleInDB(details, callback) {
    const {
        customer,
        customerPhone,
        total,
        paymentMode,
        billNo,
        timestamp,
        business_id,
        address,
        vatNo
    } = details;

    const bizId = business_id || 'biz_1';
    const netTotal = parseFloat(total) || 0;
    const now = timestamp || new Date().toISOString();
    const isCredit = (paymentMode === 'CREDIT');
    const creditAdd = isCredit ? netTotal : 0;

    const rawName = (customer || '').trim();
    const rawPhone = String(customerPhone || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').trim();
    const rawPan = (vatNo || '').trim();
    const rawAddr = (address || '').trim();

    const isWalkInName = !rawName ||
        rawName.toLowerCase() === 'walk-in' ||
        rawName.toLowerCase() === 'walkin' ||
        rawName.toLowerCase() === 'customer' ||
        rawName.toLowerCase() === 'anonymous';

    const hasPhone = cleanPhone.length >= 6;
    const hasName = !isWalkInName;
    const hasPan = rawPan.length >= 3;
    const hasAddr = rawAddr.length >= 2;

    // If no identifying customer information at all, skip AR recording
    if (!hasName && !hasPhone && !hasPan && !hasAddr) {
        if (callback) callback(null, { skipped: true, reason: 'Pure walk-in' });
        return;
    }

    // Determine canonical customer name
    let targetName = rawName;
    if (isWalkInName) {
        if (hasPhone) {
            targetName = 'Customer ' + (cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone);
        } else if (hasPan) {
            targetName = 'Customer PAN-' + rawPan;
        } else {
            targetName = 'Customer ' + (rawAddr ? rawAddr.slice(0, 15) : 'Walk-in');
        }
    }

    // Lookup existing account in this business
    db.all(
        `SELECT id, customerName, customerPhone, pan, address, totalBalance, totalSpent, visitCount, firstVisit
         FROM credit_accounts
         WHERE (business_id = ? OR (business_id IS NULL AND ? = 'biz_1'))`,
        [bizId, bizId],
        (err, rows) => {
            if (err) {
                console.error('Error querying credit_accounts for sale sync:', err);
                if (callback) callback(err);
                return;
            }

            const accounts = rows || [];
            let existing = null;

            // Match priority:
            // 1. Exact Name match (if hasName)
            if (hasName) {
                existing = accounts.find(a => (a.customerName || '').trim().toLowerCase() === targetName.toLowerCase());
            }

            // 2. Phone match (if hasPhone and not yet matched)
            if (!existing && hasPhone) {
                existing = accounts.find(a => {
                    const aPhone = String(a.customerPhone || '').replace(/\D/g, '').trim();
                    return aPhone && aPhone === cleanPhone;
                });
            }

            // 3. PAN match (if hasPan and not yet matched)
            if (!existing && hasPan) {
                existing = accounts.find(a => (a.pan || '').trim() === rawPan);
            }

            const afterAccountAction = (accCustName) => {
                if (isCredit) {
                    db.run(
                        'INSERT INTO credit_transactions (customerName, type, amount, billNo, timestamp) VALUES (?, ?, ?, ?, ?)',
                        [accCustName, 'CREDIT', netTotal, billNo || null, now],
                        (tErr) => {
                            if (tErr) console.error('Error inserting credit transaction:', tErr);
                            settleCustomerBills(accCustName, () => {
                                if (callback) callback(null, { success: true, customerName: accCustName, credit: true });
                            });
                        }
                    );
                } else {
                    if (callback) callback(null, { success: true, customerName: accCustName, credit: false });
                }
            };

            if (existing) {
                // Update existing account with any new details provided on this bill
                const updatedPhone = cleanPhone || rawPhone || existing.customerPhone || '';
                const updatedPan = rawPan || existing.pan || null;
                const updatedAddr = rawAddr || existing.address || null;

                db.run(
                    `UPDATE credit_accounts SET
                        customerPhone = CASE WHEN ? != '' THEN ? ELSE customerPhone END,
                        pan = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE pan END,
                        address = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE address END,
                        totalBalance = COALESCE(totalBalance, 0) + ?,
                        totalSpent = COALESCE(totalSpent, 0) + ?,
                        visitCount = COALESCE(visitCount, 0) + 1,
                        lastVisit = ?,
                        lastTransactionAt = ?
                     WHERE id = ?`,
                    [
                        updatedPhone, updatedPhone,
                        updatedPan, updatedPan, updatedPan,
                        updatedAddr, updatedAddr, updatedAddr,
                        creditAdd,
                        netTotal,
                        now,
                        now,
                        existing.id
                    ],
                    (uErr) => {
                        if (uErr) {
                            console.error('Error updating customer credit account:', uErr);
                            if (callback) callback(uErr);
                            return;
                        }
                        afterAccountAction(existing.customerName);
                    }
                );
            } else {
                // Insert brand new customer account into credit_accounts
                const phoneToSave = cleanPhone || rawPhone || '';
                db.run(
                    `INSERT INTO credit_accounts
                     (customerName, customerPhone, totalBalance, totalSpent, visitCount, firstVisit, lastVisit, lastTransactionAt, pan, address, business_id, isActive, createdAt)
                     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?)`,
                    [
                        targetName,
                        phoneToSave,
                        creditAdd,
                        netTotal,
                        now,
                        now,
                        now,
                        rawPan || null,
                        rawAddr || null,
                        bizId,
                        now
                    ],
                    function(iErr) {
                        if (iErr) {
                            console.warn('Customer insert conflict, updating existing record instead:', iErr.message);
                            db.run(
                                `UPDATE credit_accounts SET
                                    customerPhone = CASE WHEN ? != '' THEN ? ELSE customerPhone END,
                                    pan = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE pan END,
                                    address = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE address END,
                                    totalBalance = COALESCE(totalBalance, 0) + ?,
                                    totalSpent = COALESCE(totalSpent, 0) + ?,
                                    visitCount = COALESCE(visitCount, 0) + 1,
                                    lastVisit = ?,
                                    lastTransactionAt = ?
                                 WHERE customerName = ?`,
                                [
                                    phoneToSave, phoneToSave,
                                    rawPan, rawPan, rawPan,
                                    rawAddr, rawAddr, rawAddr,
                                    creditAdd,
                                    netTotal,
                                    now,
                                    now,
                                    targetName
                                ],
                                () => afterAccountAction(targetName)
                            );
                            return;
                        }
                        afterAccountAction(targetName);
                    }
                );
            }
        }
    );
}

// ============ SALES ENDPOINTS ============

// Get all sales (with optional startDate/endDate query params)
app.get('/api/sales', (req, res) => {
    const { startDate, endDate } = req.query;
    const businessId = req.headers['x-business-id'] || req.query.business_id;
    let query = 'SELECT * FROM sales';
    const conditions = [];
    const params = [];
    if (businessId) {
        conditions.push("(business_id = ? OR (business_id IS NULL AND ? = 'biz_1'))");
        params.push(businessId, businessId);
    }
    if (startDate) { conditions.push("date(timestamp) >= ?"); params.push(startDate); }
    if (endDate)   { conditions.push("date(timestamp) <= ?"); params.push(endDate); }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse items JSON string back to array
        const sales = (rows || []).map(r => {
            let parsedSettings = null;
            if (r.storeSettings) {
                try { parsedSettings = typeof r.storeSettings === 'string' ? JSON.parse(r.storeSettings) : r.storeSettings; } catch(e) {}
            }
            const bType = r.businessType || (parsedSettings && parsedSettings.businessType) || (r.status === 'PAID_PAN' ? 'pan_only' : 'vat_registered');
            return {
                ...r,
                customerPAN: r.vatNo || (parsedSettings && parsedSettings.customerPAN) || '',
                customerAddress: r.address || (parsedSettings && parsedSettings.customerAddress) || '',
                cashier: (parsedSettings && parsedSettings.cashier) || r.cashier || 'Admin',
                tendered: (parsedSettings && parsedSettings.tendered != null) ? parsedSettings.tendered : (r.tendered != null ? r.tendered : null),
                change: (parsedSettings && parsedSettings.change != null) ? parsedSettings.change : (r.change != null ? r.change : null),
                businessType: bType,
                isVatInvoice: r.isVatInvoice != null ? Boolean(r.isVatInvoice) : (parsedSettings && parsedSettings.isVatInvoice != null ? Boolean(parsedSettings.isVatInvoice) : false),
                items: (() => { try { return JSON.parse(r.items); } catch(e) { return []; } })(),
                storeSettings: parsedSettings
            };
        });
        res.json(sales);
    });
});

// Get today's sales
app.get('/api/sales/today', (req, res) => {
    const businessId = req.headers['x-business-id'] || req.query.business_id;
    let query = "SELECT * FROM sales WHERE date(timestamp) = date('now')";
    const params = [];
    if (businessId) {
        query += " AND (business_id = ? OR (business_id IS NULL AND ? = 'biz_1'))";
        params.push(businessId, businessId);
    }
    query += " ORDER BY id DESC";

    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const sales = (rows || []).map(r => {
                let parsedSettings = null;
                if (r.storeSettings) {
                    try { parsedSettings = typeof r.storeSettings === 'string' ? JSON.parse(r.storeSettings) : r.storeSettings; } catch(e) {}
                }
                const bType = r.businessType || (parsedSettings && parsedSettings.businessType) || (r.status === 'PAID_PAN' ? 'pan_only' : 'vat_registered');
                return {
                    ...r,
                    customerPAN: r.vatNo || (parsedSettings && parsedSettings.customerPAN) || '',
                    customerAddress: r.address || (parsedSettings && parsedSettings.customerAddress) || '',
                    cashier: (parsedSettings && parsedSettings.cashier) || r.cashier || 'Admin',
                    tendered: (parsedSettings && parsedSettings.tendered != null) ? parsedSettings.tendered : (r.tendered != null ? r.tendered : null),
                    change: (parsedSettings && parsedSettings.change != null) ? parsedSettings.change : (r.change != null ? r.change : null),
                    businessType: bType,
                    isVatInvoice: r.isVatInvoice != null ? Boolean(r.isVatInvoice) : (parsedSettings && parsedSettings.isVatInvoice != null ? Boolean(parsedSettings.isVatInvoice) : false),
                    items: (() => { try { return JSON.parse(r.items); } catch(e) { return []; } })(),
                    storeSettings: parsedSettings
                };
            });
            res.json(sales);
        }
    );
});

// Create a new sale
app.post('/api/sales', (req, res) => {
    const {
        billNo, timestamp, customer, customerPhone, paymentMode,
        total, items, status,
        address, customerAddress, vatNo, customerPAN, remarks, totalQty, gross, discount, taxable, nonTaxable, vat, storeSettings,
        business_id, businessType, isVatInvoice,
        cashier, tendered, change
    } = req.body;
    const bizId = business_id || req.headers['x-business-id'] || 'biz_1';

    let parsedSettings = null;
    try {
        parsedSettings = typeof storeSettings === 'string' ? JSON.parse(storeSettings) : (storeSettings || {});
    } catch(e) {
        parsedSettings = {};
    }
    if (cashier) parsedSettings.cashier = cashier;
    if (tendered != null) parsedSettings.tendered = tendered;
    if (change != null) parsedSettings.change = change;
    if (customerPAN) parsedSettings.customerPAN = customerPAN;
    if (customerAddress) parsedSettings.customerAddress = customerAddress;

    const effBusinessType = businessType || (parsedSettings && parsedSettings.businessType) || (status === 'PAID_PAN' ? 'pan_only' : 'vat_registered');
    const effIsVatInvoice = isVatInvoice ? 1 : 0;
    const effAddress = address || customerAddress || null;
    const effVatNo = vatNo || customerPAN || null;
    const storeSettingsStr = JSON.stringify(parsedSettings);

    db.run(
        `INSERT INTO sales
         (billNo, timestamp, customer, customerPhone, paymentMode, total, items, status,
          address, vatNo, remarks, totalQty, gross, discount, taxable, nonTaxable, vat, storeSettings, business_id, businessType, isVatInvoice)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            billNo, timestamp || new Date().toISOString(),
            customer || 'Walk-in', customerPhone || '',
            paymentMode || 'CASH', total,
            JSON.stringify(items || []), status || 'PAID',
            effAddress, effVatNo, remarks || null,
            totalQty || null, gross || null, discount || null,
            taxable || null, nonTaxable || null, vat || null,
            storeSettingsStr,
            bizId,
            effBusinessType,
            effIsVatInvoice
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const saleId = this.lastID;
            recordCustomerSaleInDB({
                customer: customer || (parsedSettings && parsedSettings.customer) || null,
                customerPhone: customerPhone || (parsedSettings && parsedSettings.customerPhone) || null,
                total: total,
                paymentMode: paymentMode || 'CASH',
                billNo: billNo,
                timestamp: timestamp || new Date().toISOString(),
                business_id: bizId,
                address: effAddress,
                vatNo: effVatNo
            }, (cErr) => {
                if (cErr) console.warn('Customer AR sync warning in /api/sales:', cErr.message);
                res.json({ id: saleId, message: 'Sale recorded successfully' });
            });
        }
    );
});

// Delete a sale by billNo
app.delete('/api/sales/:billNo', (req, res) => {
    db.run('DELETE FROM sales WHERE billNo = ?', [req.params.billNo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Sale deleted', changes: this.changes });
    });
});

// ============ API ROUTES ============

app.get('/api/inventory', (req, res) => {
    const businessId = req.headers['x-business-id'] || req.query.business_id;
    let query = 'SELECT * FROM inventory';
    const params = [];
    if (businessId) {
        query += " WHERE (business_id = ? OR (business_id IS NULL AND ? = 'biz_1'))";
        params.push(businessId, businessId);
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const formatted = (rows || []).map(row => {
                let tiers = [];
                if (row.price_tiers) {
                    try {
                        tiers = typeof row.price_tiers === 'string' ? JSON.parse(row.price_tiers) : row.price_tiers;
                    } catch(e) { tiers = []; }
                }
                const cleanStock = typeof row.stock === 'number' ? parseFloat(row.stock.toFixed(3)) : (parseFloat(row.stock) || 0);
                return {
                    ...row,
                    stock: cleanStock,
                    enable_tiered_pricing: Boolean(row.enable_tiered_pricing),
                    price_tiers: Array.isArray(tiers) ? tiers : []
                };
            });
            res.json(formatted);
        }
    });
});

// Get single inventory item
app.get('/api/inventory/:id', (req, res) => {
    db.get('SELECT * FROM inventory WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Item not found' });
        } else {
            let tiers = [];
            if (row.price_tiers) {
                try {
                    tiers = typeof row.price_tiers === 'string' ? JSON.parse(row.price_tiers) : row.price_tiers;
                } catch(e) { tiers = []; }
            }
            const cleanStock = typeof row.stock === 'number' ? parseFloat(row.stock.toFixed(3)) : (parseFloat(row.stock) || 0);
            res.json({
                ...row,
                stock: cleanStock,
                enable_tiered_pricing: Boolean(row.enable_tiered_pricing),
                price_tiers: Array.isArray(tiers) ? tiers : []
            });
        }
    });
});

// Get price tiers for product
app.get('/api/price_tiers/:productId', (req, res) => {
    db.all('SELECT * FROM price_tiers WHERE productId = ? ORDER BY minQty ASC', [req.params.productId], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows || []);
    });
});

// Create or update inventory item
app.post('/api/inventory', (req, res) => {
    const {
        id, name, category, price, stock, barcode, unit,
        sku, brand, hsCode, description, costPrice, vatRate,
        lowStockAlert, supplier, expiry, expiryNote,
        barcodeWeight, barcodeMfg, barcodeNote, barcodeBatchNo,
        barcodeLabelShopName, barcodeLabelLayout, barcodeType, sortOrder, status,
        business_id, enable_tiered_pricing, price_tiers
    } = req.body;
    const bizId = business_id || req.headers['x-business-id'] || 'biz_1';
    const enableTiered = (enable_tiered_pricing === true || enable_tiered_pricing === 1 || enable_tiered_pricing === '1' || enable_tiered_pricing === 'true') ? 1 : 0;
    const tiersArr = Array.isArray(price_tiers) ? price_tiers : [];
    const tiersJson = JSON.stringify(tiersArr);

    db.run(
        `INSERT OR REPLACE INTO inventory
         (id, name, category, price, stock, barcode, unit,
          sku, brand, hsCode, description, costPrice, vatRate,
          lowStockAlert, supplier, expiry, expiryNote,
          barcodeWeight, barcodeMfg, barcodeNote, barcodeBatchNo,
          barcodeLabelShopName, barcodeLabelLayout, barcodeType, sortOrder, status, business_id,
          enable_tiered_pricing, price_tiers, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
            id, name, category, price, stock, barcode, unit,
            sku || null, brand || null, hsCode || null, description || null,
            costPrice != null ? costPrice : null,
            vatRate != null ? vatRate : 13,
            lowStockAlert != null ? lowStockAlert : 5,
            supplier || null, expiry || null, expiryNote || null,
            barcodeWeight || null, barcodeMfg || null, barcodeNote || null, barcodeBatchNo || null,
            barcodeLabelShopName || null, barcodeLabelLayout ? JSON.stringify(barcodeLabelLayout) : null,
            barcodeType || null,
            sortOrder != null ? sortOrder : 0,
            status || 'active',
            bizId,
            enableTiered,
            tiersJson
        ],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Sync with price_tiers table
            db.run('DELETE FROM price_tiers WHERE productId = ?', [id], (delErr) => {
                if (tiersArr.length > 0 && enableTiered) {
                    const stmt = db.prepare('INSERT INTO price_tiers (productId, tierId, minQty, maxQty, ratePerUnit) VALUES (?, ?, ?, ?, ?)');
                    tiersArr.forEach((t, idx) => {
                        const tierId = t.tierId || `tier_${Date.now()}_${idx}`;
                        const minQty = parseFloat(t.minQty) || 0;
                        const maxQty = (t.maxQty === null || t.maxQty === undefined || t.maxQty === '' || t.maxQty === 999999 || String(t.maxQty).toLowerCase() === 'no limit' || String(t.maxQty).toLowerCase() === '∞') ? null : parseFloat(t.maxQty);
                        const rate = parseFloat(t.ratePerUnit) || 0;
                        stmt.run([id, tierId, minQty, maxQty, rate]);
                    });
                    stmt.finalize();
                }
                res.json({ id, message: 'Inventory updated successfully' });
            });
        }
    );
});

// Update inventory stock (for multiple items)
app.put('/api/inventory/stock', (req, res) => {
    const items = req.body.items; // Array of {id, quantity}

    const updatePromises = items.map(item => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE inventory SET stock = ROUND(stock - ?, 3), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [item.quantity, item.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updatePromises)
        .then(() => res.json({ message: 'Stock updated successfully' }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            db.run('DELETE FROM price_tiers WHERE productId = ?', [req.params.id], () => {});
            res.json({ message: 'Item deleted successfully', changes: this.changes });
        }
    });
});

// ============ SETTINGS ENDPOINTS ============

// Get all settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const settings = {};
            rows.forEach(row => {
                try {
                    settings[row.key] = JSON.parse(row.value);
                } catch {
                    settings[row.key] = row.value;
                }
            });
            res.json(settings);
        }
    });
});

// Update setting
app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;

    db.run(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [key, JSON.stringify(value)],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ message: 'Setting updated successfully' });
            }
        }
    );
});

// POST /api/settings/rollover
app.post('/api/settings/rollover', (req, res) => {
    const { newBSYear, newFiscalYearStr } = req.body;
    if (!newBSYear || !newFiscalYearStr) {
        return res.status(400).json({ error: 'Missing newBSYear or newFiscalYearStr' });
    }

    const dbPath = path.join(__dirname, 'pos_database.db');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `pos_database_backup_${Date.now()}.db`);

    // Copy SQLite database file as backup
    fs.copyFile(dbPath, backupPath, (err) => {
        if (err) {
            console.error('Failed to create DB backup:', err);
            // Fallback: try copy relative path if __dirname doesn't locate the file correctly
            fs.copyFile('./pos_database.db', `./backups/pos_database_backup_${Date.now()}.db`, (err2) => {
                if (err2) {
                    console.error('Fallback DB backup also failed:', err2);
                    return res.status(500).json({ error: 'Failed to create database backup' });
                }
                proceedRollover(res, newBSYear, newFiscalYearStr, `./backups/pos_database_backup_${Date.now()}.db`);
            });
        } else {
            proceedRollover(res, newBSYear, newFiscalYearStr, backupPath);
        }
    });
});

function proceedRollover(res, newBSYear, newFiscalYearStr, backupPath) {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Create sales_archive table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS sales_archive (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                billNo TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                customer TEXT,
                customerPhone TEXT,
                paymentMode TEXT,
                total REAL NOT NULL,
                items TEXT NOT NULL,
                status TEXT DEFAULT 'PAID',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                address TEXT,
                vatNo TEXT,
                remarks TEXT,
                totalQty REAL,
                gross REAL,
                discount REAL,
                taxable REAL,
                nonTaxable REAL,
                vat REAL
            )
        `);

        // Archive active bills to sales_archive
        db.run(`
            INSERT INTO sales_archive (
                billNo, timestamp, customer, customerPhone, paymentMode, total, items, status, created_at,
                address, vatNo, remarks, totalQty, gross, discount, taxable, nonTaxable, vat
            )
            SELECT 
                billNo, timestamp, customer, customerPhone, paymentMode, total, items, status, created_at,
                address, vatNo, remarks, totalQty, gross, discount, taxable, nonTaxable, vat
            FROM sales
        `, [], (err) => {
            if (err) {
                db.run('ROLLBACK');
                console.error('Archive insertion failed:', err);
                return res.status(500).json({ error: 'Archive insertion failed: ' + err.message });
            }

            // Clear active sales to reset count
            db.run('DELETE FROM sales', [], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Failed to clear active sales:', err);
                    return res.status(500).json({ error: 'Failed to clear active sales: ' + err.message });
                }

                // Update settings
                db.run(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('fiscalYear', ?, CURRENT_TIMESTAMP)",
                    [JSON.stringify(newFiscalYearStr)],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('Failed to save fiscalYear:', err);
                            return res.status(500).json({ error: 'Failed to save fiscalYear: ' + err.message });
                        }

                        db.run(
                            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('fiscal_year_bs_year', ?, CURRENT_TIMESTAMP)",
                            [JSON.stringify(newBSYear)],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    console.error('Failed to save fiscal_year_bs_year:', err);
                                    return res.status(500).json({ error: 'Failed to save fiscal_year_bs_year: ' + err.message });
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Transaction commit failed:', err);
                                        return res.status(500).json({ error: 'Transaction commit failed: ' + err.message });
                                    }
                                    res.json({ message: 'Rollover completed successfully', backupPath });
                                });
                            }
                        );
                    }
                );
            });
        });
    });
}

// ============ ANALYTICS ENDPOINTS ============

// Get sales summary
app.get('/api/analytics/summary', (req, res) => {
    const { period } = req.query; // 'today', 'week', 'month'

    let dateFilter = '';
    if (period === 'today') {
        dateFilter = `WHERE date(timestamp) = date('now')`;
    } else if (period === 'week') {
        dateFilter = `WHERE date(timestamp) >= date('now', '-7 days')`;
    } else if (period === 'month') {
        dateFilter = `WHERE date(timestamp) >= date('now', '-1 month')`;
    }

    db.get(
        `SELECT 
            COUNT(*) as totalOrders,
            SUM(total) as totalRevenue,
            AVG(total) as averageOrder
         FROM sales 
         ${dateFilter ? dateFilter + " AND " : " WHERE "} status NOT IN ('CANCELLED', 'RETURNED')`,
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(row);
            }
        }
    );
});

// Get next bill number for today (partitioned by businessType)
app.get('/api/sales/next-bill-number', (req, res) => {
    const businessType = req.query.businessType || 'vat_registered';
    const businessId = req.headers['x-business-id'] || req.query.business_id || 'biz_1';

    db.all(`SELECT billNo, businessType, storeSettings, status FROM sales WHERE (business_id = ? OR (business_id IS NULL AND ? = 'biz_1'))`, [businessId, businessId], (err, rows) => {
        if (err || !rows || rows.length === 0) {
            return res.json({ nextBillNo: 1 });
        }
        let maxNo = 0;
        rows.forEach(r => {
            let sType = r.businessType;
            if (!sType && r.storeSettings) {
                try {
                    const parsed = typeof r.storeSettings === 'string' ? JSON.parse(r.storeSettings) : r.storeSettings;
                    sType = parsed ? parsed.businessType : null;
                } catch(e) {}
            }
            if (!sType) {
                sType = r.status === 'PAID_PAN' ? 'pan_only' : 'vat_registered';
            }
            if (sType === businessType && r.billNo) {
                const match = String(r.billNo).match(/(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNo) maxNo = num;
                }
            }
        });
        res.json({ nextBillNo: maxNo + 1 });
    });
});

// Admin migration: Resequence all bills (call this via /api/admin/resequence)
app.get('/api/admin/resequence', (req, res) => {
    db.serialize(() => {
        db.all("SELECT id, billNo, timestamp FROM sales ORDER BY timestamp ASC", (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            let counter = 1;
            const updates = [];

            rows.forEach((row) => {
                const newBillNo = counter++;
                const oldBillNo = row.billNo;

                // Add migration suffix if appropriate, or just number?
                // User asked for "continuous", usually implies 1, 2, 3... 
                // We'll use the numeric format and the frontend will add the suffix if configured there.
                // However, since we store the suffix in DB currently, we'll keep the logic consistent.
                const formattedBillNo = `${newBillNo}-082/83`;

                updates.push(new Promise((resolve, reject) => {
                    db.run("UPDATE sales SET billNo = ? WHERE id = ?", [formattedBillNo, row.id], (e) => {
                        if (e) return reject(e);
                        // Also update credit transactions
                        db.run("UPDATE credit_transactions SET billNo = ? WHERE billNo = ?", [formattedBillNo, oldBillNo], (e2) => {
                            if (e2) return reject(e2);
                            resolve();
                        });
                    });
                }));
            });

            Promise.all(updates)
                .then(() => res.json({ message: `Successfully resequenced ${rows.length} sales.` }))
                .catch(e => res.status(500).json({ error: e.message }));
        });
    });
});

// ============ ACCOUNTS RECEIVABLE (AR) ENDPOINTS ============

// Get all credit accounts
app.get('/api/ar/accounts', (req, res) => {
    const bizId = req.query.business_id || req.headers['x-business-id'] || 'biz_1';
    db.all('SELECT * FROM credit_accounts WHERE business_id = ? OR business_id IS NULL ORDER BY customerName', [bizId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Check for negative balances and trigger silent repair for next time
            rows.forEach(acc => {
                if (acc.totalBalance < -0.01) {
                    repairNegativeBalance(acc.customerName);
                }
            });
            res.json(rows);
        }
    });
});

// Record customer sale / CRM sync
app.post('/api/ar/customer-sale', (req, res) => {
    const { customer, customerPhone, total, timestamp, paymentMode, business_id, address, vatNo, billNo } = req.body;
    recordCustomerSaleInDB({
        customer,
        customerPhone,
        total,
        paymentMode: paymentMode || 'CASH',
        billNo,
        timestamp,
        business_id,
        address,
        vatNo
    }, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Customer sale recorded', result });
    });
});

// Save or update Customer CRM details
app.post('/api/ar/customer', (req, res) => {
    const {
        id, customerName, name, customerPhone, phone, customerPAN, pan, customerAddress, address,
        notes, tags, creditLimit, loyaltyPoints, isActive, promiseDate, timeline, business_id
    } = req.body;

    const effName = (customerName || name || '').trim();
    const effPhone = String(customerPhone || phone || '').trim();
    const effPan = (customerPAN || pan || '').trim();
    const effAddress = (customerAddress || address || '').trim();
    const bizId = business_id || req.headers['x-business-id'] || 'biz_1';
    const effTags = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : '[]');
    const effTimeline = Array.isArray(timeline) ? JSON.stringify(timeline) : (typeof timeline === 'string' ? timeline : '[]');
    const effLimit = parseFloat(creditLimit) || 0;
    const effPoints = parseFloat(loyaltyPoints) || 0;
    const effActive = (isActive === false || isActive === 0 || isActive === '0' || isActive === 'false') ? 0 : 1;
    const now = new Date().toISOString();

    if (!effName && !effPhone) {
        return res.status(400).json({ error: 'Customer name or phone is required' });
    }

    db.run(
        `INSERT INTO credit_accounts
         (customerName, customerPhone, pan, address, notes, tags, creditLimit, loyaltyPoints, isActive, promiseDate, timeline, business_id, createdAt, totalBalance, totalSpent, visitCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
         ON CONFLICT(customerName) DO UPDATE SET
            customerPhone = CASE WHEN excluded.customerPhone != '' THEN excluded.customerPhone ELSE credit_accounts.customerPhone END,
            pan = excluded.pan,
            address = excluded.address,
            notes = excluded.notes,
            tags = excluded.tags,
            creditLimit = excluded.creditLimit,
            loyaltyPoints = excluded.loyaltyPoints,
            isActive = excluded.isActive,
            promiseDate = excluded.promiseDate,
            timeline = excluded.timeline`,
        [
            effName || effPhone, effPhone, effPan || null, effAddress || null,
            notes || '', effTags, effLimit, effPoints, effActive, promiseDate || null, effTimeline, bizId, now
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Customer saved successfully', id: this.lastID });
        }
    );
});

// Toggle Customer Active/Inactive
app.post('/api/ar/customer/toggle-active', (req, res) => {
    const { customerName, isActive } = req.body;
    const activeVal = (isActive === false || isActive === 0 || isActive === '0' || isActive === 'false') ? 0 : 1;
    db.run('UPDATE credit_accounts SET isActive = ? WHERE customerName = ?', [activeVal, customerName], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Customer status updated', changes: this.changes });
    });
});

// Append Timeline Event
app.post('/api/ar/customer/timeline', (req, res) => {
    const { customerName, event } = req.body;
    if (!customerName || !event) return res.status(400).json({ error: 'Missing customerName or event' });

    db.get('SELECT timeline FROM credit_accounts WHERE customerName = ?', [customerName], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        let list = [];
        if (row && row.timeline) {
            try { list = JSON.parse(row.timeline); } catch(e) { list = []; }
        }
        list.unshift({ ...event, timestamp: event.timestamp || new Date().toISOString() });
        db.run('UPDATE credit_accounts SET timeline = ? WHERE customerName = ?', [JSON.stringify(list), customerName], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            res.json({ message: 'Timeline updated', timeline: list });
        });
    });
});

// Rebuild customer CRM stats endpoint
app.post('/api/ar/rebuild-stats', (req, res) => {
    rebuildAllCustomerStats((err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result || { message: 'Customer stats rebuilt successfully' });
    });
});

function rebuildAllCustomerStats(callback) {
    db.all("SELECT * FROM sales WHERE status NOT IN ('CANCELLED', 'RETURNED')", (err, sales) => {
        if (err || !sales) {
            if (callback) callback(err);
            return;
        }

        db.all("SELECT * FROM credit_transactions", (tErr, transactions) => {
            const transList = transactions || [];
            const customerSalesMap = {};

            sales.forEach(sale => {
                const phone = String(sale.customerPhone || '').replace(/\D/g, '').trim();
                const name = (sale.customer || '').trim();
                const bizId = sale.business_id || 'biz_1';

                if (!phone && (!name || name.toLowerCase() === 'walk-in' || name.toLowerCase() === 'customer')) {
                    return;
                }

                const isRealName = name && name.toLowerCase() !== 'walk-in' && name.toLowerCase() !== 'customer' && name.toLowerCase() !== 'anonymous';
                const key = isRealName ? `${bizId}_name_${name.toLowerCase()}` : (phone ? `${bizId}_phone_${phone}` : `${bizId}_pan_${sale.vatNo || ''}`);
                if (!customerSalesMap[key]) {
                    customerSalesMap[key] = {
                        business_id: bizId,
                        customerName: isRealName ? name : (phone ? 'Customer ' + (phone.length >= 4 ? phone.slice(-4) : phone) : 'Customer'),
                        customerPhone: phone || sale.customerPhone || '',
                        pan: sale.vatNo || '',
                        address: sale.address || '',
                        sales: []
                    };
                }
                if (name && name.toLowerCase() !== 'walk-in' && (!customerSalesMap[key].customerName || customerSalesMap[key].customerName === 'Customer')) {
                    customerSalesMap[key].customerName = name;
                }
                if (sale.vatNo && !customerSalesMap[key].pan) customerSalesMap[key].pan = sale.vatNo;
                if (sale.address && !customerSalesMap[key].address) customerSalesMap[key].address = sale.address;
                customerSalesMap[key].sales.push(sale);
            });

            const updates = Object.values(customerSalesMap).map(group => {
                return new Promise((resolve) => {
                    const sList = group.sales;
                    sList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    const totalSpent = sList.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
                    const visitCount = sList.length;
                    const firstVisit = sList[0].timestamp;
                    const lastVisit = sList[sList.length - 1].timestamp;

                    const creditSalesTotal = sList
                        .filter(s => s.paymentMode === 'CREDIT')
                        .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

                    const custName = group.customerName;
                    const custPayments = transList
                        .filter(t => t.type === 'PAYMENT' && t.customerName && t.customerName.trim().toLowerCase() === custName.trim().toLowerCase())
                        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

                    const creditDue = Math.max(0, creditSalesTotal - custPayments);

                    db.run(
                        `INSERT INTO credit_accounts (customerName, customerPhone, totalBalance, totalSpent, visitCount, firstVisit, lastVisit, lastTransactionAt, pan, address, business_id, isActive)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                         ON CONFLICT(customerName) DO UPDATE SET
                            totalSpent = excluded.totalSpent,
                            visitCount = excluded.visitCount,
                            firstVisit = COALESCE(credit_accounts.firstVisit, excluded.firstVisit),
                            lastVisit = excluded.lastVisit,
                            lastTransactionAt = excluded.lastTransactionAt,
                            customerPhone = CASE WHEN excluded.customerPhone != '' THEN excluded.customerPhone ELSE credit_accounts.customerPhone END,
                            pan = COALESCE(excluded.pan, credit_accounts.pan),
                            address = COALESCE(excluded.address, credit_accounts.address)`,
                        [
                            custName, group.customerPhone, creditDue, totalSpent, visitCount,
                            firstVisit, lastVisit, lastVisit, group.pan || null, group.address || null, group.business_id
                        ],
                        () => resolve()
                    );
                });
            });

            Promise.all(updates).then(() => {
                if (callback) callback(null, { message: 'Customer stats rebuilt successfully' });
            });
        });
    });
}

// Repair endpoint
app.post('/api/ar/repair/:name', (req, res) => {
    repairNegativeBalance(req.params.name, (err) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'Repair triggered' });
    });
});

// Get single credit account by customer name
app.get('/api/ar/accounts/:name', (req, res) => {
    db.get('SELECT * FROM credit_accounts WHERE customerName = ?', [req.params.name], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(row || null);
        }
    });
});

// Record a payment to a credit account
app.post('/api/ar/payment', (req, res) => {
    const { customerName, amount, notes, timestamp } = req.body;

    db.serialize(() => {
        // 1. First check if payment exceeds current balance
        db.get('SELECT totalBalance FROM credit_accounts WHERE customerName = ?', [customerName], (err, acc) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!acc) return res.status(404).json({ error: 'Customer account not found' });

            if (amount > acc.totalBalance + 0.01) { // 0.01 buffer for float issues
                return res.status(400).json({ error: `Payment (Rs. ${amount}) exceeds outstanding balance (Rs. ${acc.totalBalance.toFixed(2)})` });
            }

            db.run('BEGIN TRANSACTION');

            // 2. Update account balance
            db.run(
                'UPDATE credit_accounts SET totalBalance = totalBalance - ?, lastTransactionAt = ? WHERE customerName = ?',
                [amount, timestamp, customerName],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    // 3. Record transaction
                    db.run(
                        'INSERT INTO credit_transactions (customerName, type, amount, timestamp, notes) VALUES (?, ?, ?, ?, ?)',
                        [customerName, 'PAYMENT', amount, timestamp, notes],
                        function (err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }

                            // 4. Robust Settlement
                            settleCustomerBills(customerName, (sErr) => {
                                if (sErr) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: sErr.message });
                                }
                                db.run('COMMIT');
                                res.json({ message: 'Payment recorded and bills settled' });
                            });
                        }
                    );
                }
            );
        });
    });
});

// Get transactions for a customer
app.get('/api/ar/transactions/:name', (req, res) => {
    db.all(
        'SELECT * FROM credit_transactions WHERE customerName = ? ORDER BY timestamp DESC',
        [req.params.name],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// Specialized sale endpoint for credit
app.post('/api/sales/credit', (req, res) => {
    const {
        billNo, timestamp, customer, customerPhone, total, items, storeSettings,
        business_id, businessType, isVatInvoice, address, vatNo, remarks, totalQty, gross, discount, taxable, nonTaxable, vat
    } = req.body;
    const bizId = business_id || req.headers['x-business-id'] || 'biz_1';
    let parsedSettings = null;
    try {
        parsedSettings = typeof storeSettings === 'string' ? JSON.parse(storeSettings) : (storeSettings || {});
    } catch(e) {
        parsedSettings = {};
    }
    const effBusinessType = businessType || (parsedSettings && parsedSettings.businessType) || 'vat_registered';
    const effIsVatInvoice = isVatInvoice ? 1 : 0;
    const storeSettingsStr = storeSettings ? (typeof storeSettings === 'string' ? storeSettings : JSON.stringify(storeSettings)) : null;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Record the sale
        db.run(
            `INSERT INTO sales (billNo, timestamp, customer, customerPhone, paymentMode, total, items, status, storeSettings, business_id, businessType, isVatInvoice, address, vatNo, remarks, totalQty, gross, discount, taxable, nonTaxable, vat) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                billNo, timestamp || new Date().toISOString(), customer || 'Walk-in', customerPhone || '', 'CREDIT', total, JSON.stringify(items || []),
                storeSettingsStr, bizId, effBusinessType, effIsVatInvoice,
                address || null, vatNo || null, remarks || null, totalQty || null, gross || null, discount || null, taxable || null, nonTaxable || null, vat || null
            ],
            function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                const saleId = this.lastID;
                recordCustomerSaleInDB({
                    customer: customer,
                    customerPhone: customerPhone,
                    total: total,
                    paymentMode: 'CREDIT',
                    billNo: billNo,
                    timestamp: timestamp || new Date().toISOString(),
                    business_id: bizId,
                    address: address,
                    vatNo: vatNo
                }, (cErr) => {
                    if (cErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: cErr.message });
                    }
                    db.run('COMMIT');
                    res.json({ id: saleId, message: 'Credit sale recorded successfully' });
                });
            }
        );
    });
});

// ============ CREDIT NOTES (RETURNS) ENDPOINTS ============

// Create new Credit Note
app.post('/api/credit-notes', (req, res) => {
    const { cnNo, originalBillNo, customerName, totalAmount, items, reason, timestamp } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Record the Credit Note
        db.run(
            `INSERT INTO credit_notes (cnNo, originalBillNo, customerName, totalAmount, items, reason, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cnNo, originalBillNo, customerName, totalAmount, JSON.stringify(items), reason, timestamp],
            function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // 2. Restore Stock for returned items
                const stockPromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        db.run('UPDATE inventory SET stock = ROUND(stock + ?, 3) WHERE id = ?', [item.qty, item.id], (err) => {
                            if (err) reject(err); else resolve();
                        });
                    });
                });

                Promise.all(stockPromises)
                    .then(() => {
                        // 3. Mark the original sale as 'RETURNED' if fully returned, 
                        // or keep tracking via status. For now, simple mark as RETURNED.
                        db.run("UPDATE sales SET status = 'RETURNED' WHERE billNo = ?", [originalBillNo], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            db.run('COMMIT');
                            res.json({ id: this.lastID, message: 'Credit Note issued and stock restored' });
                        });
                    })
                    .catch(e => {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: e.message });
                    });
            }
        );
    });
});

// Get all credit notes
app.get('/api/credit-notes', (req, res) => {
    db.all('SELECT * FROM credit_notes ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const notes = rows.map(row => ({
                ...row,
                items: JSON.parse(row.items)
            }));
            res.json(notes);
        }
    });
});

// Get next credit note number
app.get('/api/credit-notes/next-number', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM credit_notes', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const nextNo = `CN-${String((row.count || 0) + 1).padStart(4, '0')}`;
            res.json({ nextNo });
        }
    });
});

// ============ PURCHASE INVOICE ENDPOINTS ============

// Get all purchase invoices
app.get('/api/purchases', (req, res) => {
    db.all('SELECT * FROM purchase_invoices ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const purchases = rows.map(row => ({
                ...row,
                items: JSON.parse(row.items)
            }));
            res.json(purchases);
        }
    });
});

// Create new purchase invoice
app.post('/api/purchases', (req, res) => {
    const {
        piNo, entryDate, invoiceNo, invoiceDate, purchaseType,
        paymentTerms, account, chequeNo, godown, supplier,
        address, vatNo, remarks, items, totalQty, gross,
        discount, taxable, nonTaxable, vat, netAmount, timestamp
    } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            `INSERT INTO purchase_invoices (
                piNo, entryDate, invoiceNo, invoiceDate, purchaseType,
                paymentTerms, account, chequeNo, godown, supplier,
                address, vatNo, remarks, items, totalQty, gross,
                discount, taxable, nonTaxable, vat, netAmount, timestamp
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                piNo, entryDate, invoiceNo || '', invoiceDate || '', purchaseType || '',
                paymentTerms || '', account || '', chequeNo || '', godown || '', supplier || '',
                address || '', vatNo || '', remarks || '', JSON.stringify(items), totalQty, gross,
                discount, taxable, nonTaxable, vat, netAmount, timestamp
            ],
            function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // Update stock in inventory table (Increase stock)
                const stockPromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        db.run(
                            'UPDATE inventory SET stock = ROUND(stock + ?, 3), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [item.qty, item.id],
                            (err) => {
                                if (err) reject(err); else resolve();
                            }
                        );
                    });
                });

                Promise.all(stockPromises)
                    .then(() => {
                        db.run('COMMIT');
                        res.json({ id: this.lastID, message: 'Purchase Invoice recorded successfully and stock updated' });
                    })
                    .catch(e => {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: e.message });
                    });
            }
        );
    });
});

// Get next purchase invoice number
app.get('/api/purchases/next-pi-number', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM purchase_invoices', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const count = (row.count || 0) + 1;
            
            // Try to find fiscal year from settings in sqlite or default
            db.get("SELECT value FROM settings WHERE key = 'fiscalYear'", (sErr, sRow) => {
                let fiscalYear = '082/83';
                if (!sErr && sRow) {
                    try {
                        fiscalYear = JSON.parse(sRow.value);
                    } catch (e) {}
                }
                const formattedFY = fiscalYear.replace('/', '');
                res.json({ nextNo: `PI${count}-MUL-${formattedFY}` });
            });
        }
    });
});

// ============ DEBIT NOTES (PURCHASE RETURNS) ENDPOINTS ============

// Create new Debit Note
app.post('/api/debit-notes', (req, res) => {
    const { dnNo, originalPINo, supplierName, totalAmount, items, reason, timestamp } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Record the Debit Note
        db.run(
            `INSERT INTO debit_notes (dnNo, originalPINo, supplierName, totalAmount, items, reason, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dnNo, originalPINo, supplierName, totalAmount, JSON.stringify(items), reason, timestamp],
            function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                // 2. Reduce Stock for returned items
                const stockPromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        db.run('UPDATE inventory SET stock = ROUND(stock - ?, 3) WHERE id = ?', [item.qty, item.id], (err) => {
                            if (err) reject(err); else resolve();
                        });
                    });
                });

                Promise.all(stockPromises)
                    .then(() => {
                        // 3. Mark the original purchase invoice as 'RETURNED' or similar
                        db.run("UPDATE purchase_invoices SET remarks = 'RETURNED' WHERE piNo = ?", [originalPINo], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            db.run('COMMIT');
                            res.json({ id: this.lastID, message: 'Debit Note issued and stock adjusted' });
                        });
                    })
                    .catch(e => {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: e.message });
                    });
            }
        );
    });
});

// Get all debit notes
app.get('/api/debit-notes', (req, res) => {
    db.all('SELECT * FROM debit_notes ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const notes = rows.map(row => ({
                ...row,
                items: JSON.parse(row.items)
            }));
            res.json(notes);
        }
    });
});

// Get next debit note number
app.get('/api/debit-notes/next-number', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM debit_notes', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Try to find fiscal year from settings
            db.get("SELECT value FROM settings WHERE key = 'fiscalYear'", (sErr, sRow) => {
                let fiscalYear = '082/83';
                if (!sErr && sRow) {
                    try {
                        fiscalYear = JSON.parse(sRow.value);
                    } catch (e) {}
                }
                const formattedFY = fiscalYear.replace('/', '');
                const nextNo = `DN-${String((row.count || 0) + 1).padStart(4, '0')}-${formattedFY}`;
                res.json({ nextNo });
            });
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'POS Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`POS Server running on http://localhost:${PORT}`);
    console.log(`Database: ${path.resolve('./pos_database.db')}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
