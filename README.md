# POS System Backend Server

Backend server for the POS system with SQLite database.

## Features

- **SQLite Database**: Persistent storage for all POS data
- **Automatic Data Retention**: Automatically deletes records older than 1 year
- **REST API**: Complete API for sales, inventory, and settings
- **Analytics**: Built-in sales analytics and reporting

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### Sales
- `GET /api/sales` - Get all sales (with optional date filters)
- `GET /api/sales/today` - Get today's sales
- `POST /api/sales` - Create new sale
- `GET /api/sales/next-bill-number` - Get next bill number for today

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create or update item
- `PUT /api/inventory/stock` - Update stock for multiple items
- `DELETE /api/inventory/:id` - Delete item

### Settings
- `GET /api/settings` - Get all settings
- `POST /api/settings` - Update setting

### Analytics
- `GET /api/analytics/summary?period=today|week|month` - Get sales summary

### Health
- `GET /api/health` - Server health check

## Data Retention

The server automatically cleans up sales records older than 1 year:
- Cleanup runs daily at midnight
- Also runs 5 seconds after server startup
- Only affects sales data (inventory and settings are retained)

## Database

The SQLite database file is created at `./pos_database.db`

### Tables

1. **sales** - All transaction records
   - Automatic cleanup after 1 year
   
2. **inventory** - Product catalog
   - Persistent (no automatic cleanup)
   
3. **settings** - System settings
   - Persistent (no automatic cleanup)
