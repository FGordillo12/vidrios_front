/** Base URL del API (mismo origen por defecto). Sobrescribir antes de cargar otros scripts si el API está en otro host. */


//URL LOCALHOST// window.API_BASE = typeof window.API_BASE !== 'undefined' && window.API_BASE ? window.API_BASE : 'http://localhost:3000';

window.API_BASE = typeof window.API_BASE !== 'undefined' && window.API_BASE ? window.API_BASE : 'https://vidrios-back.vercel.app';
