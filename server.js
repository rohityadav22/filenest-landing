const express = require('express');
const path = require('path');
const sql = require('mssql');

require('dotenv').config();

console.log('Starting server configuration...');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Azure SQL configuration
const config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true, // Add this for development
    },
};

console.log('Attempting database connection...');

// Create connection pool with async initialization
let pool;
async function initializeDatabase() {
    try {
        pool = await new sql.ConnectionPool(config).connect();
        console.log('Database connected successfully');
        return pool;
    } catch (error) {
        console.error('Database connection failed:', error);
        return null;
    }
}

// Initialize server after database connection
async function startServer() {
    try {
        // Initialize database
        pool = await initializeDatabase();
        console.log('Database pool initialized');

        // Middleware
        app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            next();
        });
        
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.static(path.join(__dirname, 'public')));
        console.log('Middleware configured');

        // Routes
        app.get('/', (req, res) => {
            console.log('Serving index.html');
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Filenest is running at http://localhost:${PORT}`);
            console.log(`Current directory: ${__dirname}`);
        });

        // Add error handler for server
        server.on('error', (error) => {
            console.error('Server error:', error);
        });

    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
}

app.post('/api/subscribe', async (req, res) => {
    try {
        console.log('Subscribe endpoint hit');
        console.log('Request body:', req.body);
        
        const { email } = req.body;
        
        if (!email) {
            console.log('Email missing in request');
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!pool) {
            console.error('Database pool not initialized');
            return res.status(500).json({ error: 'Database connection not available' });
        }

        // Create a new request with the pool
        const request = pool.request()
            .input('email', sql.NVarChar, email);
        
        console.log('Database request created');
        console.log(`Attempting to insert email: ${email}`);

        // Log database config (without sensitive info)
        console.log('Database config:', {
            server: config.server,
            database: config.database,
            encrypt: config.options.encrypt
        });

        // Check if email already exists
        const checkResult = await request
            .query('SELECT COUNT(*) as count FROM subscribers WHERE email = @email');
        
        console.log('Check result:', checkResult);

        if (checkResult.recordset[0].count > 0) {
            console.log(`Email ${email} already exists`);
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Insert new subscriber
        const insertResult = await request
            .query(`
                INSERT INTO subscribers (email) 
                VALUES (@email)
            `);
        
        console.log('Insert result:', insertResult);
        console.log(`Successfully inserted email: ${email}`);
        res.status(200).json({ message: 'Subscription successful' });
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            state: error.state
        });
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    if (pool) {
        await pool.close();
    }
    process.exit(0);
});

// Start the server
startServer();