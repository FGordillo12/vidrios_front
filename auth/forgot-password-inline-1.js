const API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : 'http://localhost:3000';
    const form = document.getElementById('forgotPasswordForm');
    const modal = document.getElementById('modal-recuperacion-loading');
    const modalMsg = document.getElementById('modal-recuperacion-message');
    const modalSpinner = document.getElementById('modal-spinner');
    const messageEl = document.getElementById('message');
    const closeModalBtn = document.getElementById('close-modal-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;

      // Mostrar modal con spinner
      modal.style.display = 'flex';
      modalSpinner.style.display = 'block';
      modalMsg.textContent = 'Enviando correo de recuperación...';
      messageEl.textContent = '';
      messageEl.className = 'message';

      try {
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();

        // Mostrar mensaje, quitar spinner
        modalSpinner.style.display = 'none';
        modalMsg.textContent = data.message || data.error || 'Respuesta recibida';
        if (data.error) {
          messageEl.classList.add('error');
        }

      } catch (error) {
        modalSpinner.style.display = 'none';
        modalMsg.textContent = '❌ Error al enviar la solicitud.';
        messageEl.classList.add('error');
      }
    });

    // Cerrar modal al hacer clic en la "X"
    closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });