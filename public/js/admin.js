document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const auth = await checkAuth();
    if (!auth.authenticated || auth.user.type !== 'admin') {
        // Not logged in as admin, show login form
        setupAdminLogin();
        return;
    }
    
    // Already logged in as admin
    showAdminDashboard();
    await loadAdminCourses();
    await loadAllRegistrations();
    
    // Setup logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
});

// Setup admin login form
function setupAdminLogin() {
    const adminForm = document.getElementById('adminLoginForm');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (adminForm) {
        adminForm.style.display = 'block';
        if (adminDashboard) adminDashboard.style.display = 'none';
        
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showAlert('Please enter email and password', 'error');
                return;
            }
            
            const result = await loginAdmin(email, password);
            
            if (result.success) {
                showAlert('Admin login successful!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showAlert(result.message, 'error');
            }
        });
    }
}

// Show admin dashboard
function showAdminDashboard() {
    const adminForm = document.getElementById('adminLoginForm');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (adminForm) adminForm.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
}

// Load all courses for admin
async function loadAdminCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayAdminCourses(data.courses);
        } else {
            showAlert('Failed to load courses', 'error');
        }
    } catch (error) {
        console.error('Load admin courses error:', error);
        showAlert('Failed to load courses', 'error');
    }
}

// Display courses with admin actions
function displayAdminCourses(courses) {
    const container = document.getElementById('adminCoursesContainer');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: #666;">No courses available. Add your first course!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="card" data-course-id="${course.id}">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div class="course-meta">
                <span><i class="fas fa-calendar"></i> Created: ${new Date(course.created_at).toLocaleDateString()}</span>
            </div>
            <div class="course-actions">
                <button class="btn btn-edit" onclick="editCourse(${course.id}, '${course.title.replace(/'/g, "\\'")}', '${course.description.replace(/'/g, "\\'")}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteCourse(${course.id})">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Load all registrations for admin
async function loadAllRegistrations() {
    try {
        const response = await fetch(`${API_BASE_URL}/registrations/all`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayAllRegistrations(data.registrations);
        } else {
            showAlert('Failed to load registrations', 'error');
        }
    } catch (error) {
        console.error('Load registrations error:', error);
        showAlert('Failed to load registrations', 'error');
    }
}

// Display all registrations
function displayAllRegistrations(registrations) {
    const container = document.getElementById('allRegistrationsContainer');
    if (!container) return;
    
    if (registrations.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: #666;">No registrations yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="registrations-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Course</th>
                        <th>Registered On</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(reg => `
                        <tr>
                            <td>${reg.student_name}</td>
                            <td>${reg.student_email}</td>
                            <td>${reg.course_title}</td>
                            <td>${new Date(reg.registered_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Add new course
async function addCourse() {
    const title = prompt('Enter course title:');
    if (!title) return;
    
    const description = prompt('Enter course description:');
    if (!description) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ title, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Course added successfully!');
            await loadAdminCourses();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Add course error:', error);
        showAlert('Failed to add course', 'error');
    }
}

// Edit course
async function editCourse(courseId, currentTitle, currentDescription) {
    const title = prompt('Enter new course title:', currentTitle);
    if (title === null) return;
    
    const description = prompt('Enter new course description:', currentDescription);
    if (description === null) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ title, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Course updated successfully!');
            await loadAdminCourses();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Edit course error:', error);
        showAlert('Failed to update course', 'error');
    }
}

// Delete course
async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course? This will also delete all registrations for this course.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Course deleted successfully!');
            await loadAdminCourses();
            await loadAllRegistrations();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Delete course error:', error);
        showAlert('Failed to delete course', 'error');
    }
}