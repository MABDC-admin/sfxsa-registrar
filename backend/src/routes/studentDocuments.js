import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all documents for a student
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        sd.id,
        sd.name,
        sd.category,
        sd.file_path,
        sd.file_type,
        sd.file_size,
        sd.blob_id,
        sd.created_at,
        sd.uploaded_by,
        p.full_name as uploaded_by_name
      FROM student_documents sd
      LEFT JOIN profiles p ON sd.uploaded_by = p.id
      WHERE sd.student_id = $1
      ORDER BY sd.created_at DESC
    `, [studentId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching student documents:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Create/add a new student document
router.post('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, category, file_path, file_type, file_size, blob_id } = req.body;
    const userId = req.user?.id;
    
    if (!name || !file_path || !file_type) {
      return res.status(400).json({ 
        data: null, 
        error: { message: 'Missing required fields: name, file_path, file_type' } 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO student_documents 
        (student_id, name, category, file_path, file_type, file_size, blob_id, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, category, file_path, file_type, file_size, blob_id, created_at
    `, [studentId, name, category || 'general', file_path, file_type, file_size || 0, blob_id, userId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating student document:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update document metadata
router.patch('/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { name, category } = req.body;
    
    const result = await pool.query(`
      UPDATE student_documents 
      SET 
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [name, category, documentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Document not found' } });
    }
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete a document
router.delete('/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get blob_id before deletion
    const docResult = await pool.query(
      'SELECT blob_id FROM student_documents WHERE id = $1',
      [documentId]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Document not found' } });
    }
    
    const blobId = docResult.rows[0].blob_id;
    
    // Delete document record (this will cascade delete if needed)
    await pool.query('DELETE FROM student_documents WHERE id = $1', [documentId]);
    
    // Optionally delete the blob if no other documents reference it
    if (blobId) {
      const blobCheck = await pool.query(
        'SELECT COUNT(*) FROM student_documents WHERE blob_id = $1',
        [blobId]
      );
      
      if (parseInt(blobCheck.rows[0].count) === 0) {
        await pool.query('DELETE FROM storage_blobs WHERE id = $1', [blobId]);
      }
    }
    
    res.json({ data: { id: documentId }, error: null });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get document statistics for a student
router.get('/student/:studentId/stats', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(file_size) as total_size,
        COUNT(DISTINCT category) as categories_count,
        json_agg(DISTINCT category) as categories
      FROM student_documents
      WHERE student_id = $1
    `, [studentId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

export default router;
