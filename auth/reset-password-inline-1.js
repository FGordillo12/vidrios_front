const API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : 'http://localhost:3000';
  document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const messageEl = document.getElementById('message');
    const button = document.querySelector('button[type="submit"]');
    const modal = document.getElementById('modal-reset-loading');

    messageEl.textContent = '';
    messageEl.className = 'message';
    button.disabled = true;

    if (!token) {
      messageEl.textContent = 'Token no proporcionado';
      messageEl.classList.add('error');
      button.disabled = false;
      return;
    }

    // Mostrar modal de carga
    modal.style.display = 'flex';

    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        messageEl.textContent = '✅ Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...';
        messageEl.classList.add('success');

        setTimeout(() => {
          modal.style.display = 'none'; // Ocultar modal antes de redirigir
          window.location.href = '/auth/login.html';
        }, 1500); // ⏳ Tiempo opcional para dejar ver el mensaje
      } else {
        modal.style.display = 'none'; // Ocultar modal si hay error
        messageEl.textContent = data.error || 'Error al restablecer contraseña';
        messageEl.classList.add('error');
        button.disabled = false;
      }
    } catch (err) {
      modal.style.display = 'none';
      messageEl.textContent = 'Error de red o del servidor';
      messageEl.classList.add('error');
      button.disabled = false;
    }
  });