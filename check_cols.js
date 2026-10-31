const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./pos_database.db');
db.all("PRAGMA table_info(inventory)", (err, rows) => {
  if (err) { console.error(err); } 
  else { console.log('inventory columns:', rows.map(r => r.name).join(', ')); }
  db.close();
});
