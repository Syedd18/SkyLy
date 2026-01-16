// ==================== AUTHENTICATION MODULE ====================
// API_BASE_URL is defined in script.js

let currentUser = null;
let authToken = null;

// Load auth state from localStorage
function initAuth() {
    authToken = localStorage.getItem('auth_token');
    const userDataStr = localStorage.getItem('user_data');
    
    if (authToken && userDataStr) {
        currentUser = JSON.parse(userDataStr);
        updateUIForAuth(true);
    } else {
        updateUIForAuth(false);
    }
}

// Update UI based on auth state
function updateUIForAuth(isAuthenticated) {
    const guestMenu = document.getElementById('guest-menu');
    const authMenu = document.getElementById('auth-menu');
    const userName = document.getElementById('user-name');
    const dashboardLink = document.querySelector('[data-section="dashboard"]');
    const dashboardSection = document.getElementById('dashboard');
    
    console.log('updateUIForAuth called, isAuthenticated:', isAuthenticated);
    console.log('dashboardLink found:', dashboardLink);
    
    if (isAuthenticated && currentUser) {
        guestMenu.classList.add('hidden');
        authMenu.classList.remove('hidden');
        userName.textContent = currentUser.name;
        if (dashboardLink) {
            dashboardLink.classList.remove('hidden');
            console.log('Dashboard link should now be visible');
        }
        // Load dashboard data
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    } else {
        guestMenu.classList.remove('hidden');
        authMenu.classList.add('hidden');
        if (dashboardLink) {
            dashboardLink.classList.add('hidden');
            console.log('Dashboard link hidden');
        }
        // Hide dashboard section and navigate to live if currently on dashboard
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            navigateToSection('live');
        }
    }
}

// Make API request with auth header
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        logout();
        throw new Error('Authentication required');
    }
    
    return response;
}

// Login function
async function login(email, password) {
    console.log('Login attempt for:', email);
    console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'UNDEFINED');
    
    try {
        const url = `${API_BASE_URL}/api/auth/login`;
        console.log('Login URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Login error:', error);
            throw new Error(error.detail || 'Login failed');
        }
        
        const data = await response.json();
        console.log('Login successful, user:', data.user);
        authToken = data.access_token;
        currentUser = data.user;
        
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        
        updateUIForAuth(true);
        closeModal('login-modal');
        showNotification('Welcome back, ' + currentUser.name + '!', 'success');
        
        // Navigate to dashboard after login
        if (typeof navigateToSection === 'function') {
            navigateToSection('dashboard');
        }
        
        return true;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

// Register function
async function register(name, email, password) {
    console.log('Register attempt for:', email);
    console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'UNDEFINED');
    
    try {
        const url = `${API_BASE_URL}/api/auth/register`;
        console.log('Register URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('Register response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Register error:', error);
            throw new Error(error.detail || 'Registration failed');
        }
        
        const data = await response.json();
        console.log('Registration successful, user:', data.user);
        authToken = data.access_token;
        currentUser = data.user;
        
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        
        updateUIForAuth(true);
        closeModal('register-modal');
        showNotification('Account created successfully! Welcome, ' + currentUser.name + '!', 'success');
        
        // Navigate to dashboard after registration
        if (typeof navigateToSection === 'function') {
            navigateToSection('dashboard');
        }
        
        return true;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

// Logout function
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    updateUIForAuth(false);
    showNotification('Logged out successfully', 'info');
    
    // Navigate to live section
    navigateToSection('live');
}

// Favorites management
async function addFavorite(cityName) {
    if (!authToken) {
        showNotification('Please login to add favorites', 'warning');
        return false;
    }
    
    try {
        const response = await apiRequest(`${API_BASE_URL}/api/favorites/${encodeURIComponent(cityName)}`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to add favorite');
        
        showNotification(`${cityName} added to favorites`, 'success');
        return true;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

async function removeFavorite(cityName) {
    if (!authToken) return false;
    
    try {
        const response = await apiRequest(`${API_BASE_URL}/api/favorites/${encodeURIComponent(cityName)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove favorite');
        
        showNotification(`${cityName} removed from favorites`, 'info');
        return true;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

async function getFavorites() {
    if (!authToken) return [];
    
    try {
        const response = await apiRequest(`${API_BASE_URL}/api/favorites`);
        
        if (!response.ok) throw new Error('Failed to fetch favorites');
        
        const data = await response.json();
        return data.favorites || [];
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
    }
}

// Modal controls
function openModal(modalId) {
    console.log('openModal called with:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('Modal opened:', modalId);
    } else {
        console.error('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    console.log('closeModal called with:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        console.log('Modal closed:', modalId);
    } else {
        console.error('Modal not found:', modalId);
    }
}

// Simple notification system
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js DOMContentLoaded fired');
    
    initAuth();
    
    // User menu toggle
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userMenu = document.getElementById('user-menu');
    
    console.log('userMenuToggle:', userMenuToggle);
    console.log('userMenu:', userMenu);
    
    if (userMenuToggle) {
        userMenuToggle.addEventListener('click', (e) => {
            console.log('User menu toggle clicked');
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
    } else {
        console.error('User menu toggle not found');
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.contains(e.target) && e.target !== userMenuToggle) {
            userMenu.classList.add('hidden');
        }
    });
    
    // Login button
    const loginBtn = document.getElementById('login-btn');
    console.log('loginBtn:', loginBtn);
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            userMenu.classList.add('hidden');
            openModal('login-modal');
        });
    } else {
        console.error('Login button not found');
    }
    
    // Register button
    const registerBtn = document.getElementById('register-btn');
    console.log('registerBtn:', registerBtn);
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('Register button clicked');
            userMenu.classList.add('hidden');
            openModal('register-modal');
        });
    } else {
        console.error('Register button not found');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            userMenu.classList.add('hidden');
            logout();
        });
    }
    
    // Go to dashboard
    const gotoDashboard = document.getElementById('goto-dashboard');
    if (gotoDashboard) {
        gotoDashboard.addEventListener('click', () => {
            userMenu.classList.add('hidden');
            navigateToSection('dashboard');
        });
    }
    
    // Switch between login and register
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('login-modal');
            openModal('register-modal');
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('register-modal');
            openModal('login-modal');
        });
    }
    
    // Modal close buttons
    const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    console.log('Found modal close buttons:', modalCloseButtons.length);
    
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Modal close button clicked');
            const modal = btn.closest('.modal');
            if (modal) {
                console.log('Closing modal:', modal.id);
                closeModal(modal.id);
            }
        });
    });
    
    // Close modals on outside click
    const modals = document.querySelectorAll('.modal');
    console.log('Found modals:', modals.length);
    
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Modal outside click');
                closeModal(modal.id);
            }
        });
    });
    
    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            console.log('ESC key pressed');
            document.querySelectorAll('.modal').forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    closeModal(modal.id);
                }
            });
        }
    });
    
    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await login(email, password);
        });
    }
    
    // Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            await register(name, email, password);
        });
    }
});
