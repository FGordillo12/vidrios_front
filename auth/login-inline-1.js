document.addEventListener('DOMContentLoaded', () => {
      const toggleBtn = document.getElementById('togglePassword');
      const passwordInput = document.getElementById('password');
      const icon = document.getElementById('togglePasswordIcon');
      if (toggleBtn && passwordInput && icon) {
        toggleBtn.addEventListener('click', () => {
          const show = passwordInput.type === 'password';
          passwordInput.type = show ? 'text' : 'password';
          icon.classList.toggle('fa-eye', !show);
          icon.classList.toggle('fa-eye-slash', show);
        });
      }
    });