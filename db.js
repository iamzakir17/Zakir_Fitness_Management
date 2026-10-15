require('dotenv').config();
const mysql = require('mysql2');

// Create MySQL connection pool with promise wrapper
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zakir_sports_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

// Helper to check connection status
async function testConnection() {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
        return { success: true, message: 'Database connection established successfully.' };
    } catch (error) {
        return { 
            success: false, 
            message: error.message,
            code: error.code || 'DB_ERROR'
        };
    }
}

module.exports = {
    pool: promisePool,
    testConnection
};
