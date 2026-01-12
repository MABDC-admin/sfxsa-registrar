import express from 'express';
import pool from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const schoolYear = req.query.schoolYear || '2025-2026';
    const userId = req.user?.id;
    const role = req.query.role || 'admin';

    // 1. Common Stats
    const studentCountRes = await pool.query(
      'SELECT count(*) FROM student_records WHERE school_year = $1',
      [schoolYear]
    );
    
    const teacherCountRes = await pool.query(
      "SELECT count(*) FROM profiles WHERE role = 'teacher'"
    );

    const classesCountRes = await pool.query(
      'SELECT count(*) FROM classes WHERE school_year = $1 AND is_active = true',
      [schoolYear]
    );

    // 2. Gender Ratio
    const genderRatioRes = await pool.query(
      'SELECT gender, count(*) FROM student_records WHERE school_year = $1 GROUP BY gender',
      [schoolYear]
    );

    // 3. Upcoming Events
    const eventsRes = await pool.query(
      'SELECT * FROM events WHERE start_date >= NOW() ORDER BY start_date ASC LIMIT 5'
    );

    // 4. Birthdays this week
    const birthdaysRes = await pool.query(
      `SELECT student_name, birth_date, grade_level 
       FROM student_records 
       WHERE date_part('month', birth_date) = date_part('month', CURRENT_DATE)
       AND date_part('day', birth_date) >= date_part('day', CURRENT_DATE)
       AND date_part('day', birth_date) <= date_part('day', CURRENT_DATE) + 7
       LIMIT 5`
    );

    // 5. Finance Stats (if admin or finance)
    let financeStats = {};
    if (['admin', 'finance', 'accounting'].includes(role)) {
      const paymentsRes = await pool.query('SELECT SUM(amount) as total FROM payments');
      const expensesRes = await pool.query('SELECT SUM(amount) as total FROM expenses');
      financeStats = {
        totalCollected: parseFloat(paymentsRes.rows[0].total || 0),
        totalExpenses: parseFloat(expensesRes.rows[0].total || 0)
      };
    }

    // 6. Teacher Specific Stats
    let teacherStats = {};
    if (role === 'teacher' && userId) {
      const teacherKpisRes = await pool.query(
        'SELECT * FROM v_teacher_dashboard_stats WHERE teacher_id = $1',
        [userId]
      );
      teacherStats = teacherKpisRes.rows[0] || { my_classes: 0, submissions_to_check: 0 };
      
      const recentSubmissionsRes = await pool.query(
        `SELECT s.*, sr.student_name, a.title as assignment_title
         FROM submissions s
         JOIN student_records sr ON s.student_id = sr.id
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.teacher_id = $1
         ORDER BY s.submitted_at DESC
         LIMIT 5`,
        [userId]
      );
      teacherStats.recentSubmissions = recentSubmissionsRes.rows;
    }

    // 7. Student Specific Stats
    let studentStats = {};
    if (role === 'student' && userId) {
      const studentRecordRes = await pool.query(
        'SELECT id, grade_level FROM student_records WHERE user_id = $1',
        [userId]
      );
      const student = studentRecordRes.rows[0];
      
      if (student) {
        const enrolledSubjectsRes = await pool.query(
          'SELECT count(*) FROM class_students WHERE student_id = $1',
          [student.id]
        );
        
        const assignmentsRes = await pool.query(
          `SELECT count(*) as total, 
                  count(CASE WHEN s.status = 'graded' THEN 1 END) as completed
           FROM assignments a
           LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = $1
           WHERE a.class_id IN (SELECT class_id FROM class_students WHERE student_id = $1)`,
          [student.id]
        );

        const attendanceRes = await pool.query(
          `SELECT count(*) as total,
                  count(CASE WHEN status = 'present' THEN 1 END) as present
           FROM attendance
           WHERE student_id = $1`,
          [student.id]
        );

        studentStats = {
          enrolledSubjects: parseInt(enrolledSubjectsRes.rows[0].count),
          assignments: assignmentsRes.rows[0],
          attendance: attendanceRes.rows[0]
        };
      }
    }

    res.json({
      students: parseInt(studentCountRes.rows[0].count),
      teachers: parseInt(teacherCountRes.rows[0].count),
      classes: parseInt(classesCountRes.rows[0].count),
      genderRatio: genderRatioRes.rows,
      events: eventsRes.rows,
      birthdays: birthdaysRes.rows,
      finance: financeStats,
      teacher: teacherStats,
      student: studentStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
