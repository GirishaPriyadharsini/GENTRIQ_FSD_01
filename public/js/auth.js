// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Utility functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 5px;
        color: ${type === 'success' ? '#155724' : '#721c24'};
        background-color: ${type === 'success' ? '#d4edda' : '#f8d7da'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/check`, {
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth check error:', error);
        return { success: false, authenticated: false };
    }
}

// Student Registration
async function registerStudent(name, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: 'Registration failed. Please try again.' };
    }
}

// Student Login
async function loginStudent(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Login failed. Please try again.' };
    }
}

// Admin Login
async function loginAdmin(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Admin login error:', error);
        return { success: false, message: 'Admin login failed. Please try again.' };
    }
}

// Logout
async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
    // If on login page and already logged in, redirect to dashboard
    if (window.location.pathname.includes('login.html')) {
        const auth = await checkAuth();
        if (auth.authenticated) {
            if (auth.user.type === 'student') {
                window.location.href = '/dashboard.html';
            } else if (auth.user.type === 'admin') {
                // Redirect to admin dashboard when implemented
                showAlert('You are already logged in as admin', 'success');
            }
        }
    }
    
    // If on register page and already logged in, redirect to dashboard
    if (window.location.pathname.includes('register.html')) {
        const auth = await checkAuth();
        if (auth.authenticated) {
            window.location.href = '/dashboard.html';
        }
    }
    
    // If on dashboard and not logged in, redirect to login
    if (window.location.pathname.includes('dashboard.html')) {
        const auth = await checkAuth();
        if (!auth.authenticated || auth.user.type !== 'student') {
            window.location.href = '/login.html';
        }
    }
    
    // If on admin page and already logged in as admin, show message
    if (window.location.pathname.includes('admin.html')) {
        const auth = await checkAuth();
        if (auth.authenticated && auth.user.type === 'admin') {
            showAlert('You are already logged in as admin', 'success');
        }
    }
});