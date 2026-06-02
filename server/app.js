// Third party modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Configs
const connectDB = require('./config/db.config');

// Custom middlewares
const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/appError.util');

// Routers
const authRouter = require('./routers/auth.router');

// Env config (load before anything reads process.env)
dotenv.config();

// Express app init
const app = express();

// --- Global middlewares ---

// CORS — credentials:true is required so the browser sends/stores the auth cookie.
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

// Body & cookie parsing
app.use(express.json());
app.use(cookieParser()); // populates req.cookies (used by protect middleware)

// --- Routers ---
app.use('/api/v1/auth', authRouter);

// 404 — any unmatched route falls through to here.
// Express 5 changed the wildcard syntax; use a named splat ("/*splat").
app.all('/*splat', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralised error handler (must be the LAST middleware)
app.use(globalErrorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);

    connectDB();
});
