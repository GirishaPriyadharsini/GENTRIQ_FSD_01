const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all courses
router.get('/', (req, res) => {
    const query = 'SELECT * FROM courses ORDER BY created_at DESC';
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
            courses: results
        });
    });
});

// Get course by ID
router.get('/:id', (req, res) => {
    const courseId = req.params.id;
    
    const query = 'SELECT * FROM courses WHERE id = ?';
    db.query(query, [courseId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }
        
        res.json({
            success: true,
            course: results[0]
        });
    });
});

// Create course (Admin only)
router.post('/', (req, res) => {
    const { title, description } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({
            success: false,
            message: 'Title and description are required'
        });
    }
    
    const query = 'INSERT INTO courses (title, description, created_at) VALUES (?, ?, NOW())';
    db.query(query, [title, description], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to create course'
            });
        }
        
        res.json({
            success: true,
            message: 'Course created successfully',
            courseId: result.insertId
        });
    });
});

// Update course (Admin only)
router.put('/:id', (req, res) => {
    const courseId = req.params.id;
    const { title, description } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({
            success: false,
            message: 'Title and description are required'
        });
    }
    
    const query = 'UPDATE courses SET title = ?, description = ? WHERE id = ?';
    db.query(query, [title, description, courseId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update course'
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Course updated successfully'
        });
    });
});

// Delete course (Admin only)
router.delete('/:id', (req, res) => {
    const courseId = req.params.id;
    
    const query = 'DELETE FROM courses WHERE id = ?';
    db.query(query, [courseId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete course'
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    });
});

module.exports = router;