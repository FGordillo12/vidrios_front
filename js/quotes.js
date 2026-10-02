const quoteApi = window.API_BASE || '';
const quoteContainer = document.getElementById('quotes');
const quoteFilters = ['search','state','from','to'].map((id) => document.getElementById(id));
let quoteIsAdmin = false;
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(value) { return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0); }
async function loadQuotes() {
  quoteContainer.textContent = 'Cargando cotizaciones…';
  const [buscar, estado, desde, hasta] = quoteFilters.map((input) => input.value);
  const params = new URLSearchParams({buscar,estado,desde,hasta});
  try {
    const response = await fetch(`${quoteApi}/api/cotizaciones?${params}`);
    if (!response.ok) throw new Error('No se pudo cargar el historial. Inicia sesión e inténtalo de nuevo.');
    const quotes = await response.json();
    quoteContainer.innerHTML = quotes.length ? quotes.map((q) => `<article class="quote-card"><div class="quote-head"><div><h3>${esc(q.consecutivo)} <span class="pill">${esc(q.estado)}</span></h3><div class="quote-meta">${esc(q.customer?.nombre)} · ${new Date(q.createdAt).toLocaleDateString('es-CO')} · ${q.items.length} ítem(s)</div></div><strong>${money(q.total)}</strong></div><details><summary>Ver detalle</summary><p>${esc(q.customer?.documento || '')} ${esc(q.customer?.email || '')} ${esc(q.customer?.telefono || '')}</p><ul>${q.items.map((i) => `<li>${esc(i.tipo)} ${esc(i.variante)} · ${esc(i.grosor)} mm · ${esc(i.ancho)} ${esc(i.unidad)} × ${esc(i.alto)} ${esc(i.unidad)} · ${esc(i.cantidad)} und · ${money(i.total)}</li>`).join('')}</ul><p>Vigencia: ${esc(q.vigenciaDias)} días · Forma de pago: ${esc(q.formaPago || 'Por definir')}</p>${quoteIsAdmin ? `<label>Estado <select class="quote-status" data-id="${esc(q._id)}"><option ${q.estado==='borrador'?'selected':''}>borrador</option><option ${q.estado==='enviada'?'selected':''}>enviada</option><option ${q.estado==='aprobada'?'selected':''}>aprobada</option><option ${q.estado==='rechazada'?'selected':''}>rechazada</option></select></label>` : `<p class="quote-meta">El estado lo actualiza el equipo comercial.</p>`}</details></article>`).join('') : '<p>No hay cotizaciones para estos filtros.</p>';
  } catch (error) { quoteContainer.textContent = error.message; }
}
let timer; quoteFilters.forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadQuotes, 250); }));
quoteContainer.addEventListener('change', async (event) => {
  const select = event.target.closest('.quote-status'); if (!select) return;
  const response = await fetch(`${quoteApi}/api/cotizaciones/${encodeURIComponent(select.dataset.id)}/estado`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado:select.value})});
  if (!response.ok) { alert('No se pudo actualizar el estado.'); loadQuotes(); }
});
(async () => {
  try { const response = await fetch(`${quoteApi}/api/me`); if (response.ok) quoteIsAdmin = (await response.json()).role === 'admin'; } catch { /* La API del historial mostrará el aviso de sesión si es necesario. */ }
  loadQuotes();
})();
