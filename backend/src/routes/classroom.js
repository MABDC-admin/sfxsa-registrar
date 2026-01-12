import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// ==================== CLASSES CRUD ====================

// Generate unique class code
function generateClassCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Create a new class
router.post('/classes', authenticateToken, async (req, res) => {
  try {
    const { name, subject_name, grade_level, section, section_id, description, room, schedule, max_students, academic_year_id } = req.body;
    const teacher_id = req.user.id;
    const class_code = generateClassCode();
    
    const result = await pool.query(`
      INSERT INTO classes (
        name, subject_name, grade_level, section, section_id, school_year, 
        academic_year_id, teacher_id, class_code, description, room, 
        schedule, max_students, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name, subject_name, grade_level, section, section_id, '2025-2026',
      academic_year_id, teacher_id, class_code, description, room,
      schedule, max_students || 40, teacher_id
    ]);
    
    // Auto-add teacher as member
    await pool.query(`
      INSERT INTO class_memberships (class_id, user_id, role)
      VALUES ($1, $2, 'teacher')
      ON CONFLICT DO NOTHING
    `, [result.rows[0].id, teacher_id]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get all classes for a user
router.get('/classes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT DISTINCT
        c.*,
        p.full_name as teacher_name,
        p.avatar_url as teacher_avatar,
        (SELECT COUNT(*) FROM class_memberships WHERE class_id = c.id AND role = 'student') as student_count
      FROM classes c
      INNER JOIN class_memberships cm ON c.id = cm.class_id
      LEFT JOIN profiles p ON c.teacher_id = p.id
      WHERE cm.user_id = $1 AND c.is_active = true
      ORDER BY c.created_at DESC
    `, [userId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get single class details
router.get('/classes/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        p.full_name as teacher_name,
        p.email as teacher_email,
        p.avatar_url as teacher_avatar,
        (SELECT COUNT(*) FROM class_memberships WHERE class_id = c.id AND role = 'student') as student_count
      FROM classes c
      LEFT JOIN profiles p ON c.teacher_id = p.id
      WHERE c.id = $1
    `, [classId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Class not found' } });
    }
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update class
router.patch('/classes/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, subject_name, description, room, schedule, max_students } = req.body;
    
    const result = await pool.query(`
      UPDATE classes
      SET name = COALESCE($1, name),
          subject_name = COALESCE($2, subject_name),
          description = COALESCE($3, description),
          room = COALESCE($4, room),
          schedule = COALESCE($5, schedule),
          max_students = COALESCE($6, max_students),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, subject_name, description, room, schedule, max_students, classId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete class
router.delete('/classes/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    await pool.query('DELETE FROM classes WHERE id = $1', [classId]);
    
    res.json({ data: { id: classId }, error: null });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Join class with code
router.post('/classes/join', authenticateToken, async (req, res) => {
  try {
    const { class_code } = req.body;
    const userId = req.user.id;
    
    // Find class
    const classResult = await pool.query('SELECT * FROM classes WHERE class_code = $1', [class_code]);
    
    if (classResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Invalid class code' } });
    }
    
    const classData = classResult.rows[0];
    
    // Add student to class
    await pool.query(`
      INSERT INTO class_memberships (class_id, user_id, role)
      VALUES ($1, $2, 'student')
      ON CONFLICT (class_id, user_id) DO NOTHING
    `, [classData.id, userId]);
    
    res.json({ data: classData, error: null });
  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== CLASS MEMBERSHIPS ====================

// Get class members
router.get('/classes/:classId/members', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        cm.id,
        cm.role,
        cm.joined_at,
        p.id as user_id,
        p.full_name,
        p.email,
        p.avatar_url
      FROM class_memberships cm
      INNER JOIN profiles p ON cm.user_id = p.id
      WHERE cm.class_id = $1
      ORDER BY cm.role, p.full_name
    `, [classId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Remove member from class
router.delete('/classes/:classId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { classId, userId } = req.params;
    
    await pool.query('DELETE FROM class_memberships WHERE class_id = $1 AND user_id = $2', [classId, userId]);
    
    res.json({ data: { userId }, error: null });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== TOPICS CRUD ====================

// Create topic
router.post('/classes/:classId/topics', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, order_index } = req.body;
    
    const result = await pool.query(`
      INSERT INTO topics (class_id, title, description, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [classId, title, description, order_index || 0]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get topics for a class
router.get('/classes/:classId/topics', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM topics
      WHERE class_id = $1
      ORDER BY order_index, created_at
    `, [classId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update topic
router.patch('/topics/:topicId', authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, order_index } = req.body;
    
    const result = await pool.query(`
      UPDATE topics
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          order_index = COALESCE($3, order_index),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [title, description, order_index, topicId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete topic
router.delete('/topics/:topicId', authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    
    await pool.query('DELETE FROM topics WHERE id = $1', [topicId]);
    
    res.json({ data: { id: topicId }, error: null });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== LESSONS CRUD ====================

// Create lesson
router.post('/topics/:topicId/lessons', authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, class_id, order_index } = req.body;
    
    const result = await pool.query(`
      INSERT INTO lessons (topic_id, class_id, title, description, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [topicId, class_id, title, description, order_index || 0]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get lessons for a topic
router.get('/topics/:topicId/lessons', authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM lessons
      WHERE topic_id = $1
      ORDER BY order_index, created_at
    `, [topicId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update lesson
router.patch('/lessons/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, order_index } = req.body;
    
    const result = await pool.query(`
      UPDATE lessons
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          order_index = COALESCE($3, order_index),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [title, description, order_index, lessonId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete lesson
router.delete('/lessons/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    await pool.query('DELETE FROM lessons WHERE id = $1', [lessonId]);
    
    res.json({ data: { id: lessonId }, error: null });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== MATERIALS CRUD ====================

// Create material
router.post('/materials', authenticateToken, async (req, res) => {
  try {
    const { lesson_id, topic_id, class_id, title, description, type, file_path, file_url } = req.body;
    const created_by = req.user.id;
    
    const result = await pool.query(`
      INSERT INTO materials (
        lesson_id, topic_id, class_id, title, description,
        type, file_path, file_url, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [lesson_id, topic_id, class_id, title, description, type, file_path, file_url, created_by]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get materials
router.get('/classes/:classId/materials', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { lesson_id, topic_id } = req.query;
    
    let query = `
      SELECT m.*, p.full_name as creator_name
      FROM materials m
      LEFT JOIN profiles p ON m.created_by = p.id
      WHERE m.class_id = $1
    `;
    const params = [classId];
    
    if (lesson_id) {
      query += ` AND m.lesson_id = $${params.length + 1}`;
      params.push(lesson_id);
    }
    
    if (topic_id) {
      query += ` AND m.topic_id = $${params.length + 1}`;
      params.push(topic_id);
    }
    
    query += ' ORDER BY m.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update material
router.patch('/materials/:materialId', authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.params;
    const { title, description, file_url } = req.body;
    
    const result = await pool.query(`
      UPDATE materials
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          file_url = COALESCE($3, file_url),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [title, description, file_url, materialId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete material
router.delete('/materials/:materialId', authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.params;
    
    await pool.query('DELETE FROM materials WHERE id = $1', [materialId]);
    
    res.json({ data: { id: materialId }, error: null });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== ASSIGNMENTS CRUD ====================

// Create assignment
router.post('/classes/:classId/assignments', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { topic_id, lesson_id, title, description, instructions, due_date, points_possible, allow_late_submission } = req.body;
    const teacher_id = req.user.id;
    
    const result = await pool.query(`
      INSERT INTO assignments (
        class_id, topic_id, lesson_id, teacher_id, title, description,
        instructions, due_date, points_possible, allow_late_submission
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [classId, topic_id, lesson_id, teacher_id, title, description, instructions, due_date, points_possible, allow_late_submission]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get assignments
router.get('/classes/:classId/assignments', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        t.title as topic_title,
        p.full_name as teacher_name,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
      FROM assignments a
      LEFT JOIN topics t ON a.topic_id = t.id
      LEFT JOIN profiles p ON a.teacher_id = p.id
      WHERE a.class_id = $1
      ORDER BY a.due_date DESC NULLS LAST, a.created_at DESC
    `, [classId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get single assignment
router.get('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        t.title as topic_title,
        p.full_name as teacher_name,
        p.email as teacher_email
      FROM assignments a
      LEFT JOIN topics t ON a.topic_id = t.id
      LEFT JOIN profiles p ON a.teacher_id = p.id
      WHERE a.id = $1
    `, [assignmentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: { message: 'Assignment not found' } });
    }
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Update assignment
router.patch('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, instructions, due_date, points_possible, allow_late_submission } = req.body;
    
    const result = await pool.query(`
      UPDATE assignments
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          instructions = COALESCE($3, instructions),
          due_date = COALESCE($4, due_date),
          points_possible = COALESCE($5, points_possible),
          allow_late_submission = COALESCE($6, allow_late_submission),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [title, description, instructions, due_date, points_possible, allow_late_submission, assignmentId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete assignment
router.delete('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    
    res.json({ data: { id: assignmentId }, error: null });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== SUBMISSIONS CRUD ====================

// Submit assignment
router.post('/assignments/:assignmentId/submit', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { content, file_path, file_url } = req.body;
    const student_id = req.user.id;
    
    // Check if already submitted
    const existing = await pool.query('SELECT id FROM submissions WHERE assignment_id = $1 AND student_id = $2', [assignmentId, student_id]);
    
    if (existing.rows.length > 0) {
      // Update existing submission
      const result = await pool.query(`
        UPDATE submissions
        SET content = $1,
            file_path = $2,
            file_url = $3,
            submitted_at = NOW(),
            status = 'submitted',
            updated_at = NOW()
        WHERE assignment_id = $4 AND student_id = $5
        RETURNING *
      `, [content, file_path, file_url, assignmentId, student_id]);
      
      return res.json({ data: result.rows[0], error: null });
    }
    
    // Create new submission
    const result = await pool.query(`
      INSERT INTO submissions (assignment_id, student_id, content, file_path, file_url, status)
      VALUES ($1, $2, $3, $4, $5, 'submitted')
      RETURNING *
    `, [assignmentId, student_id, content, file_path, file_url]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get submissions for an assignment
router.get('/assignments/:assignmentId/submissions', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.*,
        p.full_name as student_name,
        p.email as student_email,
        p.avatar_url as student_avatar
      FROM submissions s
      INNER JOIN profiles p ON s.student_id = p.id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Get student's submission for an assignment
router.get('/assignments/:assignmentId/my-submission', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const student_id = req.user.id;
    
    const result = await pool.query(`
      SELECT * FROM submissions
      WHERE assignment_id = $1 AND student_id = $2
    `, [assignmentId, student_id]);
    
    res.json({ data: result.rows[0] || null, error: null });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Grade submission
router.patch('/submissions/:submissionId/grade', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const graded_by = req.user.id;
    
    const result = await pool.query(`
      UPDATE submissions
      SET grade = $1,
          feedback = $2,
          graded_by = $3,
          graded_at = NOW(),
          status = 'graded',
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [grade, feedback, graded_by, submissionId]);
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// Delete submission
router.delete('/submissions/:submissionId', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    await pool.query('DELETE FROM submissions WHERE id = $1', [submissionId]);
    
    res.json({ data: { id: submissionId }, error: null });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// ==================== GRADES ====================

// Get grades for a class
router.get('/classes/:classId/grades', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Get all assignments and submissions for the class
    const result = await pool.query(`
      SELECT 
        p.id as student_id,
        p.full_name as student_name,
        p.email as student_email,
        a.id as assignment_id,
        a.title as assignment_title,
        a.points_possible,
        s.grade,
        s.status as submission_status
      FROM class_memberships cm
      INNER JOIN profiles p ON cm.user_id = p.id
      CROSS JOIN assignments a
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = p.id
      WHERE cm.class_id = $1 AND cm.role = 'student' AND a.class_id = $1
      ORDER BY p.full_name, a.due_date
    `, [classId]);
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

export default router;
