import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ==================== SCHOOL INFO CRUD ====================

// Get school information
router.get('/info', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'School information not found' } });
    }
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error fetching school info:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update school information
router.patch('/info', authenticateToken, async (req, res) => {
  try {
    const {
      name, address, city, state, country, postal_code,
      phone, fax, email, website, principal_name, principal_email,
      founded_year, mission_statement, vision_statement, motto,
      accreditation, curriculum_type, school_colors
    } = req.body;
    
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can update school information' } });
    }
    
    const result = await pool.query(`
      UPDATE school_settings
      SET name = COALESCE($1, name),
          address = COALESCE($2, address),
          city = COALESCE($3, city),
          state = COALESCE($4, state),
          country = COALESCE($5, country),
          postal_code = COALESCE($6, postal_code),
          phone = COALESCE($7, phone),
          fax = COALESCE($8, fax),
          email = COALESCE($9, email),
          website = COALESCE($10, website),
          principal_name = COALESCE($11, principal_name),
          principal_email = COALESCE($12, principal_email),
          founded_year = COALESCE($13, founded_year),
          mission_statement = COALESCE($14, mission_statement),
          vision_statement = COALESCE($15, vision_statement),
          motto = COALESCE($16, motto),
          accreditation = COALESCE($17, accreditation),
          curriculum_type = COALESCE($18, curriculum_type),
          school_colors = COALESCE($19, school_colors),
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [
      name, address, city, state, country, postal_code,
      phone, fax, email, website, principal_name, principal_email,
      founded_year, mission_statement, vision_statement, motto,
      accreditation, curriculum_type, school_colors
    ]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating school info:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== BRANDING IMAGE UPLOADS ====================

// Upload logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can upload branding' } });
    }
    
    if (!req.file) {
      return res.status(400).json({ data: null, error: { message: 'No file uploaded' } });
    }
    
    // Store in storage_blobs
    const blobResult = await pool.query(`
      INSERT INTO storage_blobs (name, mime_type, content, size)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]);
    
    const blobId = blobResult.rows[0].id;
    
    // Update school_settings with blob reference
    const updateResult = await pool.query(`
      UPDATE school_settings
      SET logo_blob_id = $1,
          logo_url = $2,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [blobId, `/api/school-info/logo/view`]);
    
    res.json({ data: updateResult.rows[0], error: null });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Upload crest
router.post('/crest', authenticateToken, upload.single('crest'), async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can upload branding' } });
    }
    
    if (!req.file) {
      return res.status(400).json({ data: null, error: { message: 'No file uploaded' } });
    }
    
    // Store in storage_blobs
    const blobResult = await pool.query(`
      INSERT INTO storage_blobs (name, mime_type, content, size)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]);
    
    const blobId = blobResult.rows[0].id;
    
    // Update school_settings with blob reference
    const updateResult = await pool.query(`
      UPDATE school_settings
      SET crest_blob_id = $1,
          crest_url = $2,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [blobId, `/api/school-info/crest/view`]);
    
    res.json({ data: updateResult.rows[0], error: null });
  } catch (error) {
    console.error('Error uploading crest:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Upload banner
router.post('/banner', authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can upload branding' } });
    }
    
    if (!req.file) {
      return res.status(400).json({ data: null, error: { message: 'No file uploaded' } });
    }
    
    // Store in storage_blobs
    const blobResult = await pool.query(`
      INSERT INTO storage_blobs (name, mime_type, content, size)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]);
    
    const blobId = blobResult.rows[0].id;
    
    // Update school_settings with blob reference
    const updateResult = await pool.query(`
      UPDATE school_settings
      SET banner_blob_id = $1,
          banner_url = $2,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [blobId, `/api/school-info/banner/view`]);
    
    res.json({ data: updateResult.rows[0], error: null });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== VIEW BRANDING IMAGES ====================

// View logo
router.get('/logo/view', async (req, res) => {
  try {
    const schoolResult = await pool.query('SELECT logo_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows.length === 0 || !schoolResult.rows[0].logo_blob_id) {
      return res.status(404).json({ error: 'Logo not found' });
    }
    
    const blobResult = await pool.query('SELECT content, mime_type FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].logo_blob_id]);
    
    if (blobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Logo blob not found' });
    }
    
    res.set('Content-Type', blobResult.rows[0].mime_type);
    res.send(blobResult.rows[0].content);
  } catch (error) {
    console.error('Error viewing logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// View crest
router.get('/crest/view', async (req, res) => {
  try {
    const schoolResult = await pool.query('SELECT crest_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows.length === 0 || !schoolResult.rows[0].crest_blob_id) {
      return res.status(404).json({ error: 'Crest not found' });
    }
    
    const blobResult = await pool.query('SELECT content, mime_type FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].crest_blob_id]);
    
    if (blobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Crest blob not found' });
    }
    
    res.set('Content-Type', blobResult.rows[0].mime_type);
    res.send(blobResult.rows[0].content);
  } catch (error) {
    console.error('Error viewing crest:', error);
    res.status(500).json({ error: error.message });
  }
});

// View banner
router.get('/banner/view', async (req, res) => {
  try {
    const schoolResult = await pool.query('SELECT banner_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows.length === 0 || !schoolResult.rows[0].banner_blob_id) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const blobResult = await pool.query('SELECT content, mime_type FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].banner_blob_id]);
    
    if (blobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Banner blob not found' });
    }
    
    res.set('Content-Type', blobResult.rows[0].mime_type);
    res.send(blobResult.rows[0].content);
  } catch (error) {
    console.error('Error viewing banner:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DELETE BRANDING IMAGES ====================

// Delete logo
router.delete('/logo', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can delete branding' } });
    }
    
    const schoolResult = await pool.query('SELECT logo_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows[0].logo_blob_id) {
      await pool.query('DELETE FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].logo_blob_id]);
    }
    
    await pool.query(`
      UPDATE school_settings
      SET logo_blob_id = NULL,
          logo_url = '',
          updated_at = NOW()
      WHERE id = 1
    `);
    
    res.json({ data: { message: 'Logo deleted successfully' }, error: null });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete crest
router.delete('/crest', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can delete branding' } });
    }
    
    const schoolResult = await pool.query('SELECT crest_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows[0].crest_blob_id) {
      await pool.query('DELETE FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].crest_blob_id]);
    }
    
    await pool.query(`
      UPDATE school_settings
      SET crest_blob_id = NULL,
          crest_url = '',
          updated_at = NOW()
      WHERE id = 1
    `);
    
    res.json({ data: { message: 'Crest deleted successfully' }, error: null });
  } catch (error) {
    console.error('Error deleting crest:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete banner
router.delete('/banner', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ data: null, error: { message: 'Only administrators can delete branding' } });
    }
    
    const schoolResult = await pool.query('SELECT banner_blob_id FROM school_settings WHERE id = 1');
    
    if (schoolResult.rows[0].banner_blob_id) {
      await pool.query('DELETE FROM storage_blobs WHERE id = $1', [schoolResult.rows[0].banner_blob_id]);
    }
    
    await pool.query(`
      UPDATE school_settings
      SET banner_blob_id = NULL,
          banner_url = '',
          updated_at = NOW()
      WHERE id = 1
    `);
    
    res.json({ data: { message: 'Banner deleted successfully' }, error: null });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

export default router;
