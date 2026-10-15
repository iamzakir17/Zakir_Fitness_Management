require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
    console.log('----------------------------------------------------');
    console.log('Zakir Fitness Management - Database Setup');
    console.log('----------------------------------------------------');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    console.log(`Connecting to MySQL host: ${config.host}:${config.port} as user '${config.user}'...`);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log(' Connected to MySQL server successfully.');

        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }

        const sql = fs.readFileSync(schemaPath, 'utf8');
        console.log(' Executing schema.sql script...');

        await connection.query(sql);

        console.log(' Database "zakir_sports_db" and table "products" created/verified successfully!');
        console.log(' Seed sample products loaded successfully.');
        console.log('----------------------------------------------------');
        console.log(' You are ready to start the server: npm start');
        console.log('----------------------------------------------------');
    } catch (err) {
        console.error('\nDatabase setup failed:', err.message);
        console.error('\nThings to check:');
        console.error('1. Verify MySQL service is running in Windows Services (MySQL80).');
        console.error('2. Check DB_PASSWORD in your .env file matches your MySQL root password.');
        console.error('3. You can also run the SQL script directly via MySQL command line:');
        console.error('   mysql -u root -p < database/schema.sql\n');
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();
