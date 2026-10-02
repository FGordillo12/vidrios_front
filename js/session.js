(() => {
  const apiBase = typeof window.API_BASE === 'string'
    ? window.API_BASE
    : (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '');
  const rawFetch = window.fetch.bind(window);
  const csrfToken = () => document.cookie.split('; ').find((item) => item.startsWith('va_csrf='))?.split('=').slice(1).join('=') || '';
  const isUnsafe = (method) => !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  const isApiUrl = (input) => {
    try { return new URL(typeof input === 'string' ? input : input.url, location.href).origin === new URL(apiBase, location.href).origin; }
    catch { return false; }
  };

  async function send(input, init = {}, allowRefresh = true) {
    const options = { ...init, credentials: 'include', headers: new Headers(init.headers || (input instanceof Request ? input.headers : undefined)) };
    const method = options.method || (input instanceof Request ? input.method : 'GET');
    if (isUnsafe(method)) {
      const csrf = csrfToken();
      if (csrf) options.headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    }
    const response = await rawFetch(input, options);
    if (response.status !== 401 || !allowRefresh || !isApiUrl(input)) return response;
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (/\/(login|register|refresh|forgot-password|reset-password)$/.test(url.pathname)) return response;
    const csrf = csrfToken();
    const refresh = await rawFetch(`${apiBase}/api/refresh`, {
      method: 'POST', credentials: 'include',
      headers: csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}
    });
    if (!refresh.ok) return response;
    return send(input, init, false);
  }

  window.fetch = (input, init) => send(input, init);
  window.vaSession = {
    async currentUser() {
      const response = await send(`${apiBase}/api/me`);
      return response.ok ? response.json() : null;
    },
    async guard() {
      const path = location.pathname;
      const isAuth = path.startsWith('/auth/');
      const isRecovery = /forgot-password|reset-password/.test(path);
      const isProtected = !isAuth && path.endsWith('.html');
      if (!isProtected && (!isAuth || isRecovery)) return null;
      const user = await this.currentUser();
      if (isProtected && !user) {
        location.replace('/auth/login.html');
        return null;
      }
      if ((path.endsWith('/editar-precios.html') || path.endsWith('/catalogo.html')) && user?.role !== 'admin') {
        location.replace('/index.html');
        return null;
      }
      if (path.endsWith('/admin-usuarios.html') && user?.role !== 'admin') {
        location.replace('/index.html');
        return null;
      }
      if (isAuth && !isRecovery && user) location.replace('/index.html');
      const adminLink = document.getElementById('users-admin-link');
      if (adminLink) adminLink.hidden = user?.role !== 'admin';
      const pricesLink = document.querySelector('.btn-edit-precios');
      if (pricesLink) pricesLink.hidden = user?.role !== 'admin';
      return user;
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('cotizacion_cliente');
      await window.vaSession.guard();
    } catch {
      if (!location.pathname.startsWith('/auth/')) location.replace('/auth/login.html');
    }
    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', async () => {
      const confirmResult = window.Swal ? await Swal.fire({
        title: '¿Cerrar sesión?', text: '¿Deseas salir de tu cuenta?', icon: 'question',
        showCancelButton: true, confirmButtonText: 'Cerrar sesión', cancelButtonText: 'Cancelar'
      }) : { isConfirmed: confirm('¿Cerrar sesión?') };
      if (!confirmResult.isConfirmed) return;
      await send(`${apiBase}/api/logout`, { method: 'POST' });
      location.replace('/auth/login.html');
    });
  }, { once: true });
})();
