import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import marketRoutes from './routes/markets';
import marketOperationsRoutes from './routes/market-operations';
import setupRoutes from './routes/setup';
import factoryRoutes from './routes/factory';
import debugRoutes from './routes/debug';
import eventsRoutes from './routes/events';
import resolutionTestRoutes from './routes/resolution-test';
import resolutionFinalizeRoutes from './routes/resolution-finalize';
import disputeResolutionRoutes from './routes/dispute-resolution';
import positionRoutes from './routes/positions';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/markets', marketRoutes);
app.use('/api/markets', marketOperationsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/factory', factoryRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/resolution-test', resolutionTestRoutes);
app.use('/api/resolution', resolutionFinalizeRoutes);
app.use('/api/dispute', disputeResolutionRoutes);
app.use('/api/positions', positionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});