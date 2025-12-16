const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-change-this-in-production';

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'course_registration'
});

// Student Registration (Alternative endpoint)
router.post('/register', async (req, res) => {
    try {
        const { full_name, username, email, password } = req.body;
        
        // Validation
        if (!full_name || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Check if email already exists
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
        db.query(checkEmailQuery, [email], async (err, results) => {
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
                    message: 'Email already registered'
                });
            }
            
            // Check if username already exists
            const checkUsernameQuery = 'SELECT id FROM users WHERE username = ?';
            db.query(checkUsernameQuery, [username], async (err, usernameResults) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Database error'
                    });
                }
                
                if (usernameResults.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username already taken'
                    });
                }
                
                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                // Insert student
                const insertQuery = 'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, "student")';
                db.query(insertQuery, [username, email, hashedPassword, full_name], (err, result) => {
                    if (err) {
                        console.error('Insert error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to create account'
                        });
                    }
                    
                    // Create student progress
                    const progressQuery = 'INSERT INTO student_progress (student_id) VALUES (?)';
                    db.query(progressQuery, [result.insertId]);
                    
                    // Create notification
                    const notificationQuery = 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)';
                    db.query(notificationQuery, [
                        result.insertId,
                        'Welcome to Student Registration System!',
                        'Your account has been successfully created.',
                        'success'
                    ]);
                    
                    res.json({
                        success: true,
                        message: 'Registration successful',
                        userId: result.insertId
                    });
                });
            });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Student Login (Alternative endpoint)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Check if user exists
        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            const user = results[0];
            
            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role,
                    full_name: user.full_name,
                    username: user.username
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            // Remove password from response
            delete user.password;
            
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Check if admin exists
        const query = 'SELECT * FROM users WHERE email = ? AND role = "admin"';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            const admin = results[0];
            
            // Check password
            const isValidPassword = await bcrypt.compare(password, admin.password);
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Generate JWT token for admin
            const token = jwt.sign(
                { 
                    id: admin.id, 
                    email: admin.email, 
                    role: admin.role,
                    full_name: admin.full_name,
                    username: admin.username
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Admin login successful',
                token
            });
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;