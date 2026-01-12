import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import storageRoutes from './routes/storage.js';
import dashboardRoutes from './routes/dashboard.js';
import studentDocumentsRoutes from './routes/studentDocuments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',  // Vite default
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8085',  // Add port 8085
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview/production domains
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow configured origins
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth', authRoutes);
app.use('/rest/v1', dataRoutes);
app.use('/storage/v1', storageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/student-documents', studentDocumentsRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
