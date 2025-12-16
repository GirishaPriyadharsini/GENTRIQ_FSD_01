document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const auth = await checkAuth();
    if (!auth.authenticated || auth.user.type !== 'student') {
        window.location.href = '/login.html';
        return;
    }
    
    // Set user info
    document.getElementById('userName').textContent = auth.user.name;
    
    // Load courses and registrations
    await loadCourses();
    await loadMyCourses();
    
    // Setup logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Setup search functionality
    document.getElementById('searchInput')?.addEventListener('input', filterCourses);
});

// Load all available courses
async function loadCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayCourses(data.courses);
        } else {
            showAlert('Failed to load courses', 'error');
        }
    } catch (error) {
        console.error('Load courses error:', error);
        showAlert('Failed to load courses', 'error');
    }
}

// Load student's registered courses
async function loadMyCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/registrations/my-courses`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayMyCourses(data.registrations);
        } else {
            showAlert('Failed to load your courses', 'error');
        }
    } catch (error) {
        console.error('Load my courses error:', error);
        showAlert('Failed to load your courses', 'error');
    }
}

// Display available courses
function displayCourses(courses) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: #666;">No courses available at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="card" data-course-id="${course.id}">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div class="course-meta">
                <span><i class="fas fa-calendar"></i> ${new Date(course.created_at).toLocaleDateString()}</span>
            </div>
            <div class="course-actions">
                <button class="btn btn-register" onclick="registerForCourse(${course.id})">
                    <i class="fas fa-plus-circle"></i> Register
                </button>
            </div>
        </div>
    `).join('');
}

// Display student's registered courses
function displayMyCourses(registrations) {
    const container = document.getElementById('myCoursesContainer');
    if (!container) return;
    
    if (registrations.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p style="text-align: center; color: #666;">You haven't registered for any courses yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = registrations.map(reg => `
        <div class="card" data-registration-id="${reg.id}">
            <h3>${reg.title}</h3>
            <p>${reg.description}</p>
            <div class="course-meta">
                <span><i class="fas fa-calendar"></i> Registered: ${new Date(reg.registered_at).toLocaleDateString()}</span>
                <span><i class="fas fa-book"></i> Course Created: ${new Date(reg.course_created).toLocaleDateString()}</span>
            </div>
            <div class="course-actions">
                <button class="btn btn-danger" onclick="unregisterFromCourse(${reg.course_id})">
                    <i class="fas fa-trash-alt"></i> Unregister
                </button>
            </div>
        </div>
    `).join('');
}

// Register for a course
async function registerForCourse(courseId) {
    if (!confirm('Are you sure you want to register for this course?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/registrations/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ courseId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Successfully registered for the course!');
            // Reload both lists
            await loadCourses();
            await loadMyCourses();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showAlert('Failed to register for course', 'error');
    }
}

// Unregister from a course
async function unregisterFromCourse(courseId) {
    if (!confirm('Are you sure you want to unregister from this course?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/registrations/unregister/${courseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Successfully unregistered from the course!');
            // Reload both lists
            await loadCourses();
            await loadMyCourses();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Unregister error:', error);
        showAlert('Failed to unregister from course', 'error');
    }
}

// Filter courses based on search input
function filterCourses() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const courseCards = document.querySelectorAll('#coursesContainer .card');
    
    courseCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}