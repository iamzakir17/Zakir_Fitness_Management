require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./db');

const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Database Health Check Route
app.get('/api/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.status(dbStatus.success ? 200 : 503).json({
        status: dbStatus.success ? 'healthy' : 'database_unavailable',
        timestamp: new Date().toISOString(),
        database: dbStatus
    });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Clean URL Aliases for HTML Pages
app.get('/insert', (req, res) => res.sendFile(path.join(__dirname, 'public', 'insert.html')));
app.get('/list', (req, res) => res.sendFile(path.join(__dirname, 'public', 'list.html')));
app.get('/search', (req, res) => res.sendFile(path.join(__dirname, 'public', 'search.html')));
app.get('/update', (req, res) => res.sendFile(path.join(__dirname, 'public', 'update.html')));
app.get('/delete', (req, res) => res.sendFile(path.join(__dirname, 'public', 'delete.html')));
app.get('/low-stock', (req, res) => res.sendFile(path.join(__dirname, 'public', 'low-stock.html')));

// Catch-all 404 for API endpoints
app.all('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint '${req.originalUrl}' not found.`
    });
});

// Fallback to index.html for page navigation
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]:', err.message);

    // MySQL specific error codes
    if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({
            success: false,
            message: 'Database table "products" does not exist in MySQL. Please run "npm run db:init" or run database/schema.sql in MySQL Workbench.',
            code: err.code
        });
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
        return res.status(503).json({
            success: false,
            message: `MySQL Database Connection Failed (${err.code}). Please verify your .env credentials and ensure MySQL is running in MySQL Workbench.`,
            code: err.code
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
});

// Start Express Server
app.listen(PORT, async () => {
    console.log('============================================================');
    console.log('Zakir Fitness Management - Inventory System');
    console.log(`Open in browser : http://localhost:${PORT}`);
    console.log(`Health check    : http://localhost:${PORT}/api/health`);
    console.log('============================================================');

    const check = await testConnection();
    if (check.success) {
        console.log(' MySQL Database: Connected & Operational (zakir_sports_db)');
    } else {
        console.warn('MySQL Database: NOT CONNECTED');
        console.warn(`   Reason: ${check.message}`);
        console.warn('   To fix: Check .env file and run "npm run db:init" or import database/schema.sql in MySQL Workbench');
    }
    console.log('============================================================\n');
});
