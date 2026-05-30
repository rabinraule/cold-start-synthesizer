const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors());
app.use(express.json());

// HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ==========================================
// 2. DATABASE CONNECTION (MongoDB)
// ==========================================
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[Database Error] Connection failed: ${error.message}`);
        // Do not crash the app immediately, allow health check to report failure
    }
};
connectDB();

// ==========================================
// 3. API ROUTES & HEALTH CHECK
// ==========================================


// IMPORT SCANNER & EXPORT CONTROLLERS
const { scanRepository, exportProjectWorkspace, getWorkspaceHistory } = require('./controllers/scannerController');

/**
 * @route   POST /api/scan
 * @desc    Scan a local directory route and save structural layout to MongoDB Atlas
 * @access  Public
 */
app.post('/api/scan', scanRepository);

/**
 * @route   POST /api/export
 * @desc    Export project workspace and disk engine endpoint
 * @access  Public
 */
app.post('/api/export', exportProjectWorkspace); // NEW EXPORT HOOK LINKED

app.get('/api/history', getWorkspaceHistory);
/**
 * @route   GET /api/health
 * @desc    Returns system status and database connection state
 * @access  Public
 */
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbStates = {
        0: "Disconnected",
        1: "Connected",
        2: "Connecting",
        3: "Disconnecting"
    };

    const statusReport = {
        status: "UP",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        services: {
            server: "Healthy",
            database: {
                state: dbStates[dbStatus] || "Unknown",
                connected: dbStatus === 1
            }
        }
    };

    if (dbStatus === 1) {
        return res.status(200).json(statusReport);
    } else {
        return res.status(503).json({
            ...statusReport,
            status: "DEGRADED",
            message: "Database connection is not fully established."
        });
    }
});

// ==========================================
// 4. GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================

// Catch-all unhandled routes
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

// Global error boundary
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        status: "ERROR",
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ==========================================
// 5. SERVER RUNTIME
// ==========================================
const server = app.listen(PORT, () => {
    console.log(`[Server] Cold Start Engine running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections outside of Express
process.on('unhandledRejection', (err, promise) => {
    console.error(`[Fatal Error] Unhandled Rejection: ${err.message}`);
    // Close server & exit process if critical
    server.close(() => process.exit(1));
});