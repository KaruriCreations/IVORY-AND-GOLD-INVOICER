const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generateRoute');
const historyRoute = require('./routes/historyRoute');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', generateRoute);
app.use('/api/history', historyRoute);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: err.details || [],
  });
});

app.listen(PORT, () => {
  console.log(`[Invoice API] Running on http://localhost:${PORT}`);
});

module.exports = app;
