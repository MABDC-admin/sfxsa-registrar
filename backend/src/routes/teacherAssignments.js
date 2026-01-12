import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all teacher assignments for a specific grade level and academic year
router.get('/grade/:gradeLevelId/year/:academicYearId', authenticateToken, async (req, res) => {
  try {
    const { gradeLevelId, academicYearId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        tsga.id,
        tsga.teacher_id,
        tsga.subject_id,
        tsga.grade_level_id,
        tsga.academic_year_id,
        tsga.created_at,
        p.full_name as teacher_name,
        p.email as teacher_email,
        p.avatar_url as teacher_avatar,
        s.name as subject_name,
        s.icon as subject_icon,
        s.color as subject_color,
        gl.name as grade_level_name,
        ay.name as academic_year_name,
        assigned_by_user.full_name as assigned_by_name
      FROM teacher_subject_grade_assignments tsga
      LEFT JOIN profiles p ON tsga.teacher_id = p.id
      LEFT JOIN subjects s ON tsga.subject_id = s.id
      LEFT JOIN grade_levels gl ON tsga.grade_level_id = gl.id
      LEFT JOIN academic_years ay ON tsga.academic_year_id = ay.id
      LEFT JOIN profiles assigned_by_user ON tsga.assigned_by = assigned_by_user.id
      WHERE tsga.grade_level_id = $1 AND tsga.academic_year_id = $2
      ORDER BY s.name, p.full_name
    `, [gradeLevelId, academicYearId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get all assignments for a specific subject within a grade level and year
router.get('/subject/:subjectId/grade/:gradeLevelId/year/:academicYearId', authenticateToken, async (req, res) => {
  try {
    const { subjectId, gradeLevelId, academicYearId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        tsga.id,
        tsga.teacher_id,
        p.full_name as teacher_name,
        p.email as teacher_email,
        p.avatar_url as teacher_avatar,
        tsga.created_at
      FROM teacher_subject_grade_assignments tsga
      LEFT JOIN profiles p ON tsga.teacher_id = p.id
      WHERE tsga.subject_id = $1 
        AND tsga.grade_level_id = $2 
        AND tsga.academic_year_id = $3
    `, [subjectId, gradeLevelId, academicYearId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching subject teacher assignments:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get all available teachers for assignment (teachers who can teach the subject)
router.get('/available-teachers/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    // Get teachers who have this subject in their assigned subjects
    const result = await pool.query(`
      SELECT DISTINCT
        p.id,
        p.full_name,
        p.email,
        p.avatar_url
      FROM profiles p
      INNER JOIN teacher_subjects ts ON p.id = ts.teacher_id
      WHERE p.role = 'teacher' 
        AND p.is_active = true
        AND ts.subject_id = $1
      ORDER BY p.full_name
    `, [subjectId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Create a new teacher assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { teacher_id, subject_id, grade_level_id, academic_year_id } = req.body;
    const assigned_by = req.user?.id;
    
    if (!teacher_id || !subject_id || !grade_level_id || !academic_year_id) {
      return res.status(400).json({ 
        data: null, 
        error: { message: 'Missing required fields: teacher_id, subject_id, grade_level_id, academic_year_id' } 
      });
    }
    
    // Check if assignment already exists
    const existingCheck = await pool.query(
      `SELECT id FROM teacher_subject_grade_assignments 
       WHERE teacher_id = $1 AND subject_id = $2 AND grade_level_id = $3 AND academic_year_id = $4`,
      [teacher_id, subject_id, grade_level_id, academic_year_id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        data: null, 
        error: { message: 'This teacher is already assigned to this subject for this grade level and academic year' } 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO teacher_subject_grade_assignments 
        (teacher_id, subject_id, grade_level_id, academic_year_id, assigned_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, teacher_id, subject_id, grade_level_id, academic_year_id, created_at
    `, [teacher_id, subject_id, grade_level_id, academic_year_id, assigned_by]);
    
    // Get full details of the created assignment
    const fullDetails = await pool.query(`
      SELECT 
        tsga.id,
        tsga.teacher_id,
        tsga.subject_id,
        tsga.grade_level_id,
        tsga.academic_year_id,
        tsga.created_at,
        p.full_name as teacher_name,
        p.email as teacher_email,
        p.avatar_url as teacher_avatar,
        s.name as subject_name,
        s.icon as subject_icon,
        s.color as subject_color
      FROM teacher_subject_grade_assignments tsga
      LEFT JOIN profiles p ON tsga.teacher_id = p.id
      LEFT JOIN subjects s ON tsga.subject_id = s.id
      WHERE tsga.id = $1
    `, [result.rows[0].id]);
    
    res.json({ data: fullDetails.rows[0], error: null });
  } catch (error) {
    console.error('Error creating teacher assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete a teacher assignment
router.delete('/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM teacher_subject_grade_assignments WHERE id = $1 RETURNING id',
      [assignmentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Assignment not found' } });
    }
    
    res.json({ data: { id: assignmentId }, error: null });
  } catch (error) {
    console.error('Error deleting teacher assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get teacher's assigned subjects for a specific academic year
router.get('/teacher/:teacherId/year/:academicYearId', authenticateToken, async (req, res) => {
  try {
    const { teacherId, academicYearId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        tsga.id,
        s.name as subject_name,
        s.icon as subject_icon,
        s.color as subject_color,
        gl.name as grade_level_name,
        ay.name as academic_year_name
      FROM teacher_subject_grade_assignments tsga
      LEFT JOIN subjects s ON tsga.subject_id = s.id
      LEFT JOIN grade_levels gl ON tsga.grade_level_id = gl.id
      LEFT JOIN academic_years ay ON tsga.academic_year_id = ay.id
      WHERE tsga.teacher_id = $1 AND tsga.academic_year_id = $2
      ORDER BY gl.order_index, s.name
    `, [teacherId, academicYearId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

export default router;
