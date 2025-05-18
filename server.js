const express = require('express');
const path = require('path');
const sql = require('mssql');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Azure SQL configuration
const config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    options: {
        encrypt: true,
    },
};

// Create connection pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

// Middleware
// ...existing code...

// Middleware - make sure these come BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
// ...existing code...

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/subscribe', async (req, res) => {
    try {
        await poolConnect; // Ensures that the pool has been created
        
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Store in Azure SQL database
        const request = pool.request()
            .input('email', sql.VarChar, email)
            .input('dateAdded', sql.DateTime, new Date());
            
        await request.query(`
            INSERT INTO subscribers (email) 
            VALUES (@email)
        `);

        res.status(200).json({ message: 'Subscription successful' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    pool.close();
});

app.listen(PORT, () => {
    console.log(`🚀 Filenest is running at http://localhost:${PORT}`);
});