document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tipo], [data-href]');
  if (!button) return;
  if (button.dataset.href) {
    location.assign(button.dataset.href);
    return;
  }
  const type = button.dataset.tipo;
  if (!type) return;
  localStorage.setItem('tipoSeleccionado', type);
  location.assign(`/cotizar.html?tipo=${encodeURIComponent(type)}`);
});
