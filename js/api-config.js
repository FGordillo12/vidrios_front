window.API_BASE = typeof window.API_BASE === 'string'
  ? window.API_BASE
  : (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3000' : '');
