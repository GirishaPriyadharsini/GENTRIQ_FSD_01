const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});


db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// JWT Secret
const JWT_SECRET = process.env.SESSION_SECRET;

// ========== MIDDLEWARE ==========

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ========== AUTH ENDPOINTS ==========

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { full_name, username, email, password } = req.body;
    
    try {
        // Check if email already exists
        const [existingEmail] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const [existingUsername] = await db.promise().query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const [result] = await db.promise().query(
            'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, "student")',
            [username, email, hashedPassword, full_name]
        );
        
        res.json({
            success: true,
            message: 'Registration successful',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
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
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== ADMIN ENDPOINTS ==========

// Get dashboard statistics (Admin only)
app.get('/api/admin/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Execute all queries in parallel
        const [
            userCountResult,
            courseCountResult,
            registrationCountResult,
            recentRegistrationsResult
        ] = await Promise.all([
            db.promise().query('SELECT COUNT(*) as count FROM users WHERE role = "student"'),
            db.promise().query('SELECT COUNT(*) as count FROM courses'),
            db.promise().query('SELECT COUNT(*) as count FROM registrations WHERE status = "registered"'),
            db.promise().query(`
                SELECT r.*, u.full_name, u.email, c.course_code, c.title 
                FROM registrations r
                JOIN users u ON r.student_id = u.id
                JOIN courses c ON r.course_id = c.id
                WHERE r.status = 'registered'
                ORDER BY r.registration_date DESC
                LIMIT 5
            `)
        ]);

        // Extract the actual results from each query
        // Each query result is an array where [0] contains rows and [1] contains fields
        const userCount = userCountResult[0][0].count;
        const courseCount = courseCountResult[0][0].count;
        const registrationCount = registrationCountResult[0][0].count;
        const recentRegistrations = recentRegistrationsResult[0];

        res.json({
            success: true,
            stats: {
                totalStudents: userCount,
                totalCourses: courseCount,
                activeRegistrations: registrationCount,
                recentRegistrations: recentRegistrations || []  
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error loading dashboard data' 
        });
    }
});

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.promise().query(`
            SELECT id, username, email, full_name, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new user (Admin only)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, email, password, full_name, role } = req.body;
    
    try {
        // Check if email exists
        const [existingEmail] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Check if username exists
        const [existingUsername] = await db.promise().query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.promise().query(
            'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, role]
        );
        
        res.json({
            success: true,
            message: 'User created successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user (Admin only)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { full_name, email, role } = req.body;
    
    try {
        await db.promise().query(
            'UPDATE users SET full_name = ?, email = ?, role = ? WHERE id = ?',
            [full_name, email, role, userId]
        );
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    
    try {
        // Check if user exists
        const [user] = await db.promise().query('SELECT id FROM users WHERE id = ?', [userId]);
        
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Delete user (cascade will handle related records)
        await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== COURSE MANAGEMENT ENDPOINTS ==========

// Get all courses
app.get('/api/courses', async (req, res) => {
    try {
        const [courses] = await db.promise().query(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM registrations r 
                    WHERE r.course_id = c.id AND r.status = 'registered') as enrolled_count
            FROM courses c
            ORDER BY c.created_at DESC
        `);
        res.json({
            success: true,
            courses
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single course
app.get('/api/courses/:id', async (req, res) => {
    try {
        const [courses] = await db.promise().query(
            'SELECT * FROM courses WHERE id = ?',
            [req.params.id]
        );
        
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        // Get course schedule
        const [schedule] = await db.promise().query(
            'SELECT * FROM class_schedule WHERE course_id = ?',
            [req.params.id]
        );
        
        // Get enrolled students
        const [students] = await db.promise().query(`
            SELECT u.id, u.full_name, u.email, r.registration_date
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            WHERE r.course_id = ? AND r.status = 'registered'
            ORDER BY r.registration_date DESC
        `, [req.params.id]);
        
        res.json({
            success: true,
            course: {
                ...courses[0],
                schedule,
                students,
                enrolled_count: students.length
            }
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create course (Admin only)
app.post('/api/admin/courses', authenticateToken, requireAdmin, async (req, res) => {
    const {
        course_code,
        title,
        description,
        instructor,
        department,
        credits,
        schedule,
        max_students
    } = req.body;
    
    try {
        // Check if course code exists
        const [existingCourse] = await db.promise().query(
            'SELECT id FROM courses WHERE course_code = ?',
            [course_code]
        );
        
        if (existingCourse.length > 0) {
            return res.status(400).json({ error: 'Course code already exists' });
        }
        
        const [result] = await db.promise().query(
            `INSERT INTO courses (
                course_code, title, description, instructor, 
                department, credits, schedule, max_students
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [course_code, title, description, instructor, department, credits, schedule, max_students]
        );
        
        res.json({
            success: true,
            message: 'Course created successfully',
            courseId: result.insertId
        });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update course (Admin only)
app.put('/api/admin/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
    const courseId = req.params.id;
    const {
        course_code,
        title,
        description,
        instructor,
        department,
        credits,
        schedule,
        max_students
    } = req.body;
    
    try {
        // Check if course exists
        const [course] = await db.promise().query('SELECT id FROM courses WHERE id = ?', [courseId]);
        
        if (course.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        // Check if new course code conflicts with other courses
        if (course_code) {
            const [existingCourse] = await db.promise().query(
                'SELECT id FROM courses WHERE course_code = ? AND id != ?',
                [course_code, courseId]
            );
            
            if (existingCourse.length > 0) {
                return res.status(400).json({ error: 'Course code already exists' });
            }
        }
        
        await db.promise().query(
            `UPDATE courses SET 
                course_code = ?, title = ?, description = ?, instructor = ?,
                department = ?, credits = ?, schedule = ?, max_students = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [course_code, title, description, instructor, department, credits, schedule, max_students, courseId]
        );
        
        res.json({
            success: true,
            message: 'Course updated successfully'
        });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete course (Admin only)
app.delete('/api/admin/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
    const courseId = req.params.id;
    
    try {
        // Check if course exists
        const [course] = await db.promise().query('SELECT id FROM courses WHERE id = ?', [courseId]);
        
        if (course.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        // Check if course has registrations
        const [registrations] = await db.promise().query(
            'SELECT COUNT(*) as count FROM registrations WHERE course_id = ? AND status = "registered"',
            [courseId]
        );
        
        if (registrations[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete course with active registrations' 
            });
        }
        
        await db.promise().query('DELETE FROM courses WHERE id = ?', [courseId]);
        
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== REGISTRATION MANAGEMENT ENDPOINTS ==========

// Get all registrations (Admin only) - including the dropped once.
app.get('/api/admin/registrations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [registrations] = await db.promise().query(`
            SELECT r.*, u.full_name as student_name, u.email as student_email,
                   c.course_code, c.title as course_title, c.instructor,
                   DATE_FORMAT(r.registration_date, '%Y-%m-%d %H:%i:%s') as formatted_date
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            JOIN courses c ON r.course_id = c.id
            ORDER BY r.registration_date DESC
        `);
        
        res.json({
            success: true,
            registrations
        });
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get recent registrations (last 5, including dropped) - for dashboard
app.get('/api/admin/recent-registrations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [registrations] = await db.promise().query(`
            SELECT r.*, u.full_name as student_name, u.email as student_email,
                   c.course_code, c.title as course_title, c.instructor,
                   DATE_FORMAT(r.registration_date, '%Y-%m-%d %H:%i') as formatted_date
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            JOIN courses c ON r.course_id = c.id
            ORDER BY r.registration_date DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            registrations: registrations || []
        });
    } catch (error) {
        console.error('Get recent registrations error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error loading recent registrations' 
        });
    }
});

// Update registration status (Admin only)
app.put('/api/admin/registrations/:id', authenticateToken, requireAdmin, async (req, res) => {
    const registrationId = req.params.id;
    const { status } = req.body;
    
    try {
        // Get registration details
        const [registrations] = await db.promise().query(`
            SELECT r.*, c.credits 
            FROM registrations r
            JOIN courses c ON r.course_id = c.id
            WHERE r.id = ?
        `, [registrationId]);
        
        if (registrations.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        
        const registration = registrations[0];
        
        // Update registration status
        await db.promise().query(
            'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, registrationId]
        );
        
        res.json({
            success: true,
            message: 'Registration status updated successfully'
        });
    } catch (error) {
        console.error('Update registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== STUDENT REGISTRATION ENDPOINTS ==========

// Register for a course (Student)
app.post('/api/registrations', authenticateToken, async (req, res) => {
    const { course_id } = req.body;
    const student_id = req.user.id;
    
    try {
        // Check if course exists and has available seats
        const [courses] = await db.promise().query(
            'SELECT * FROM courses WHERE id = ?',
            [course_id]
        );
        
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        const course = courses[0];

        const [countResult] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM registrations WHERE course_id = ? AND status = "registered"',
        [course_id]
        );

        if (countResult[0].count >= course.max_students) {
        return res.status(400).json({ error: 'Course is full' });
        }

        
        // Check if student is already registered
        const [existingReg] = await db.promise().query(
            'SELECT * FROM registrations WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );
        
        if (existingReg.length > 0) {
            if (existingReg[0].status === 'registered') {
                return res.status(400).json({ error: 'Already registered for this course' });
            } else {
                // Update dropped registration to registered
                await db.promise().query(
                    'UPDATE registrations SET status = "registered", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [existingReg[0].id]
                );
                
                return res.json({
                    success: true,
                    message: 'Course registration restored successfully',
                    registrationId: existingReg[0].id
                });
            }
        }
        
        // Create new registration
        const [result] = await db.promise().query(
            'INSERT INTO registrations (student_id, course_id, status) VALUES (?, ?, "registered")',
            [student_id, course_id]
        );
        
        res.json({
            success: true,
            message: 'Successfully registered for the course',
            registrationId: result.insertId
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Get student registrations
app.get('/api/registrations/student/:studentId', authenticateToken, async (req, res) => {
    const { studentId } = req.params;
    
    // Check if student is accessing their own data or admin is accessing
    if (req.user.role !== 'admin' && req.user.id != studentId) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        const [registrations] = await db.promise().query(`
            SELECT r.*, c.course_code, c.title, c.instructor, c.credits,
                   DATE_FORMAT(r.registration_date, '%Y-%m-%d %H:%i') as formatted_date
            FROM registrations r
            JOIN courses c ON r.course_id = c.id
            WHERE r.student_id = ?
            ORDER BY r.registration_date DESC
        `, [studentId]);
        
        res.json({
            success: true,
            registrations
        });
    } catch (error) {
        console.error('Get student registrations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Drop a course (Student)
app.delete('/api/registrations/:registrationId', authenticateToken, async (req, res) => {
    const { registrationId } = req.params;
    
    try {
        // Get registration details
        const [registrations] = await db.promise().query(
            'SELECT * FROM registrations WHERE id = ?',
            [registrationId]
        );
        
        if (registrations.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        
        const registration = registrations[0];
        
        // Check if student owns this registration or is admin
        if (req.user.role !== 'admin' && req.user.id != registration.student_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Update registration status to dropped
        await db.promise().query(
            'UPDATE registrations SET status = "dropped", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [registrationId]
        );
        
        res.json({
            success: true,
            message: 'Course dropped successfully'
        });
    } catch (error) {
        console.error('Drop course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get student schedule
app.get('/api/schedule/student/:studentId', authenticateToken, async (req, res) => {
    const { studentId } = req.params;
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id != studentId) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        const [schedule] = await db.promise().query(`
            SELECT cs.*, c.course_code, c.title
            FROM class_schedule cs
            JOIN courses c ON cs.course_id = c.id
            WHERE c.id IN (
                SELECT course_id 
                FROM registrations 
                WHERE student_id = ? AND status = 'registered'
            )
            ORDER BY 
                FIELD(cs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
                cs.start_time
        `, [studentId]);
        
        res.json({
            success: true,
            schedule
        });
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ========== START SERVER ==========

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


