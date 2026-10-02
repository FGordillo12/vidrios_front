(() => {
  const root = document.documentElement;
  let saved;
  try { saved = localStorage.getItem('vidrios-theme'); } catch {}
  const initial = saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  root.dataset.theme = initial;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Cambiar tema');
  button.setAttribute('aria-pressed', String(initial === 'dark'));
  const paint = (theme) => {
    button.innerHTML = theme === 'dark' ? '<span aria-hidden="true">☀</span><span>Modo claro</span>' : '<span aria-hidden="true">☾</span><span>Modo oscuro</span>';
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  paint(initial);
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('vidrios-theme', next); } catch {}
    paint(next);
  });
  document.addEventListener('DOMContentLoaded', () => document.body.append(button), { once: true });
})();
