document.addEventListener('DOMContentLoaded', () => {
    initializeForms();
});

const API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : 'http://localhost:3000';

// Inicialización de formularios
function initializeForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Manejo del login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const raw = await response.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch (_) {
            data = { error: raw || 'Respuesta inválida del servidor' };
        }

        if (response.ok) {
            const modal = document.getElementById('loadingModal');
            if (modal) {
                modal.style.display = 'flex';
            }

            setTimeout(() => {
                window.location.href = data.redirect || '/index.html';
            }, 1500);
        } else {
            showMessage(data.error || `Error al iniciar sesión (${response.status})`, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión con el servidor', 'error');
        console.error('Login error:', error);
    }
}

// Manejo del registro
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!username || !email || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }

    /*
        const dominioPermitido = '@vidriosalejo.com';
        if (!email.endsWith(dominioPermitido)) {
            showModal(`Solo se permiten correos del dominio de la empresa`);
            return;
        }
    */

    try {
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const raw = await response.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch (_) {
            data = { error: raw || 'Respuesta inválida del servidor' };
        }

        if (response.ok) {
            showMessage('Registro exitoso. Entrando al sistema...', 'success');
            setTimeout(() => {
                window.location.href = data.redirect || '/index.html';
            }, 900);
        } else {
            showMessage(data.error || `Error al registrar (${response.status})`, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión con el servidor', 'error');
        console.error('Registration error:', error);
    }
}

// Verificación de autenticación para páginas protegidas
function checkAuth() {
    window.vaSession?.guard();
}

// Mostrar mensajes al usuario
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type !== 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

function showModal(message) {
    const modal = document.getElementById('errorModal');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtn = document.getElementById('closeModalBtn');

    if (modal && modalMessage) {
        modalMessage.textContent = message;
        modal.style.display = 'flex';

        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}
