document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('newPassword');
    const icon = document.getElementById('togglePassword');
    const isPassword = passwordInput.type === 'password';
    
    passwordInput.type = isPassword ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });