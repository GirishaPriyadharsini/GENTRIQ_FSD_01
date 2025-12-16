const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Register for a course
router.post('/', (req, res) => {
    const studentId = req.session.userId;
    const { courseId } = req.body;
    
    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: 'Course ID is required'
        });
    }
    
    // Check if already registered
    const checkQuery = 'SELECT * FROM registrations WHERE student_id = ? AND course_id = ?';
    db.query(checkQuery, [studentId, courseId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        if (results.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Already registered for this course'
            });
        }
        
        // Register for course
        const insertQuery = 'INSERT INTO registrations (student_id, course_id, registered_at) VALUES (?, ?, NOW())';
        db.query(insertQuery, [studentId, courseId], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to register for course'
                });
            }
            
            res.json({
                success: true,
                message: 'Successfully registered for course',
                registrationId: result.insertId
            });
        });
    });
});

// Get student's registered courses
router.get('/student/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    const query = `
        SELECT r.*, c.title, c.description 
        FROM registrations r
        JOIN courses c ON r.course_id = c.id
        WHERE r.student_id = ?
        ORDER BY r.registered_at DESC
    `;
    
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        res.json({
            success: true,
            registrations: results
        });
    });
});

// Drop a course
router.delete('/:studentId/:courseId', (req, res) => {
    const { studentId, courseId } = req.params;
    
    const query = 'DELETE FROM registrations WHERE student_id = ? AND course_id = ?';
    db.query(query, [studentId, courseId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to drop course'
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Successfully dropped course'
        });
    });
});

// Get all registrations (Admin only)
router.get('/', (req, res) => {
    const query = `
        SELECT r.*, s.name as student_name, s.email as student_email, c.title as course_title
        FROM registrations r
        JOIN students s ON r.student_id = s.id
        JOIN courses c ON r.course_id = c.id
        ORDER BY r.registered_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        res.json({
            success: true,
            registrations: results
        });
    });
});

module.exports = router;