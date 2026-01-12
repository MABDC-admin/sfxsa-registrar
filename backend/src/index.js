import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import storageRoutes from './routes/storage.js';
import dashboardRoutes from './routes/dashboard.js';
import studentDocumentsRoutes from './routes/studentDocuments.js';
import teacherAssignmentsRoutes from './routes/teacherAssignments.js';
import { runMigrations } from '../run-migration-on-start.js';

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
app.use('/api/teacher-assignments', teacherAssignmentsRoutes);

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

// Bind to 0.0.0.0 for Railway compatibility
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run database migrations
  await runMigrations();
  
  // Test database connection on startup
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`Database: Connected successfully at ${result.rows[0].now}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Server will continue but database operations may fail');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});
