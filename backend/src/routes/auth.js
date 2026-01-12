import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, options } = req.body;
    const metadata = options?.data || {};

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM auth_users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: { message: 'User already exists' } });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    await pool.query(
      `INSERT INTO auth_users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [userId, email, hashedPassword, JSON.stringify(metadata)]
    );

    // Generate token
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        user: { id: userId, email, user_metadata: metadata },
        session: { access_token: token, token_type: 'bearer', expires_in: 604800 }
      },
      error: null
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Sign in with password
router.post('/token', async (req, res) => {
  try {
    const { email, password, grant_type } = req.body;

    if (grant_type !== 'password') {
      return res.status(400).json({ error: { message: 'Invalid grant type' } });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, encrypted_password, raw_user_meta_data FROM auth_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: { message: 'Invalid credentials' } });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.encrypted_password);
    if (!validPassword) {
      return res.status(400).json({ error: { message: 'Invalid credentials' } });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Get profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [user.id]
    );
    const profile = profileResult.rows[0] || null;

    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.raw_user_meta_data || {},
        profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get current user/session
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, raw_user_meta_data FROM auth_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const user = result.rows[0];

    // Get profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [user.id]
    );

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.raw_user_meta_data || {},
          profile: profileResult.rows[0] || null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Sign out
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  res.json({ error: null });
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, email: req.user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: 604800
  });
});

export default router;
