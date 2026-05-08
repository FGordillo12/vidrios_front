/**
 * MAIN.JS - Lógica de Interfaz y Negocio
 */

const API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : '';

const grosoresPorTipo = {
  transparente: [4, 5, 6, 8, 10],
  azul: [4, 5],
  'azul lake': [4, 5],
  'azul dark reflectivo': [4, 5],
  'azul dark': [4, 5],
  bronce: [4, 5],
  'bronce normal': [4, 5],
  'bronce reflectivo': [4, 5],
  verde: [4, 5],
  'verde automotriz': [4, 5],
  'verde botella': [4, 5],
  'verde botella reflectivo': [4, 5],
  gris: [5],
  grabado: [4],
  espejo: [3, 4],
  laminado: ['3+3', '4+4']
};

let cotizaciones = JSON.parse(localStorage.getItem('cotizaciones')) || [];

// --- Utilidades ---
function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor);
}

function labelGrosor(g) {
  const s = String(g);
  return s.includes('+') ? `${s} (laminado)` : `${s} mm`;
}

function capitalizar(texto) {
  if (!texto) return '';
  return texto.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function aproximarMedida(medida) {
  return Math.ceil(medida * 10) / 10;
}

function normalizarTipo(tipo) {
  return String(tipo || '')
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function poblarSelectGrosores(grosorSelect, grosores) {
  grosorSelect.innerHTML = '';
  if (!Array.isArray(grosores) || grosores.length === 0) {
    grosorSelect.innerHTML = '<option value="">No disponible</option>';
    return;
  }

  grosores.forEach((g) => {
    const option = document.createElement('option');
    option.value = g;
    option.textContent = labelGrosor(g);
    grosorSelect.appendChild(option);
  });
}

async function obtenerGrosoresDisponibles(tipo) {
  const tipoNormalizado = normalizarTipo(tipo);

  try {
    const response = await fetch(`${API_BASE}/api/obtener-precios`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const precios = await response.json();
    const porTipo = precios?.[tipoNormalizado];

    if (porTipo && typeof porTipo === 'object') {
      return Object.keys(porTipo);
    }
  } catch (err) {
    console.warn('No se pudieron cargar grosores desde API, usando fallback local.', err);
  }

  return grosoresPorTipo[tipoNormalizado] || [];
}

// --- Gestión de la UI ---
function actualizarListaCotizaciones() {
  const contenedor = document.getElementById('lista-cotizaciones');
  if (!contenedor) return;

  cotizaciones = JSON.parse(localStorage.getItem('cotizaciones')) || [];
  contenedor.innerHTML = '';

  if (cotizaciones.length === 0) {
    contenedor.innerHTML = '<p>No hay cotizaciones aún.</p>';
    return;
  }

  const porTipo = {};
  cotizaciones.forEach((cot, indiceReal) => {
    const tipoCotizacion = normalizarTipo(cot.tipo) || 'sin tipo';
    if (!porTipo[tipoCotizacion]) porTipo[tipoCotizacion] = [];
    porTipo[tipoCotizacion].push({ cot, indiceReal });
  });

  for (const tipo in porTipo) {
    const detalles = document.createElement('details');
    const resumen = document.createElement('summary');
    resumen.textContent = capitalizar(tipo);
    detalles.appendChild(resumen);

    const ul = document.createElement('ul');
    porTipo[tipo].forEach(({ cot, indiceReal }) => {
      const li = document.createElement('li');
      li.className = 'cotizacion-item';

      const descripcion = document.createElement('span');
      descripcion.className = 'cotizacion-item-texto';
      descripcion.textContent = `Grosor: ${cot.grosor}${String(cot.grosor).includes('+') ? '' : ' mm'}, ${cot.anchoOriginal}m × ${cot.altoOriginal}m, Cant: ${cot.cantidad}, Total: ${formatCOP(cot.total)}`;

      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button';
      btnEliminar.className = 'btn-eliminar-item';
      btnEliminar.dataset.index = String(indiceReal);
      btnEliminar.textContent = 'Eliminar';

      li.appendChild(descripcion);
      li.appendChild(btnEliminar);
      ul.appendChild(li);
    });

    detalles.appendChild(ul);
    contenedor.appendChild(detalles);
  }
}

function eliminarCotizacionPorIndice(indice) {
  const indiceNumero = Number(indice);
  if (!Number.isInteger(indiceNumero) || indiceNumero < 0) return;

  const cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];
  if (indiceNumero >= cotizacionesGuardadas.length) return;

  cotizacionesGuardadas.splice(indiceNumero, 1);
  localStorage.setItem('cotizaciones', JSON.stringify(cotizacionesGuardadas));
  cotizaciones = cotizacionesGuardadas;
  actualizarListaCotizaciones();

  const resultado = document.getElementById('resultado');
  if (resultado) {
    resultado.textContent = 'Ítem eliminado de la cotización.';
  }
}

function cerrarPanel() {
  const panel = document.getElementById('panel-lista');
  if (panel) panel.classList.remove('open');
}

function bloquearRuedaEnInputsNumericos(contenedor) {
  if (!contenedor) return;
  const inputsNumericos = contenedor.querySelectorAll('input[type="number"]');
  inputsNumericos.forEach((input) => {
    input.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false });
  });
}

// --- Eventos de Inicialización ---
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const tipoUrl = normalizarTipo(params.get('tipo'));
  const tipoGuardado = normalizarTipo(localStorage.getItem('tipoSeleccionado'));
  const tipo = tipoUrl || tipoGuardado;

  const tipoInput = document.getElementById('tipo-input');
  const tipoTexto = document.getElementById('tipo-seleccionado');
  const grosorSelect = document.getElementById('grosor');

  if (tipoInput && tipoTexto && grosorSelect) {
    const botonCotizar = document.getElementById('boton-cotizar');
    tipoInput.value = tipo;
    tipoTexto.textContent = `Tipo seleccionado: ${capitalizar(tipo) || 'No definido'}`;

    if (!tipo) {
      grosorSelect.innerHTML = '<option value="">Seleccione un tipo desde el menú</option>';
      if (botonCotizar) botonCotizar.disabled = true;
      return;
    }
    localStorage.setItem('tipoSeleccionado', tipo);
    if (botonCotizar) botonCotizar.disabled = false;

    // Carga inmediata con fallback local para evitar el select vacío
    // si el endpoint tarda o falla en responder.
    const grosoresFallback = grosoresPorTipo[tipo] || [];
    poblarSelectGrosores(grosorSelect, grosoresFallback);

    const grosoresDesdeApi = await obtenerGrosoresDisponibles(tipo);
    if (Array.isArray(grosoresDesdeApi) && grosoresDesdeApi.length > 0) {
      poblarSelectGrosores(grosorSelect, grosoresDesdeApi);
    }
  }

  if (document.getElementById('lista-cotizaciones')) {
    actualizarListaCotizaciones();
  }

  const cotizacionFormEl = document.getElementById('cotizacion-form');
  bloquearRuedaEnInputsNumericos(cotizacionFormEl);

  const listaCotizaciones = document.getElementById('lista-cotizaciones');
  if (listaCotizaciones) {
    listaCotizaciones.addEventListener('click', (e) => {
      const boton = e.target.closest('.btn-eliminar-item');
      if (!boton) return;

      const indice = boton.dataset.index;
      if (confirm('¿Eliminar este vidrio de la lista?')) {
        eliminarCotizacionPorIndice(indice);
      }
    });
  }

  const cerrarPanelBtn = document.querySelector('.cerrar-panel');
  if (cerrarPanelBtn) {
    cerrarPanelBtn.addEventListener('click', cerrarPanel);
  }
});

// --- Lógica del Formulario de Cotización ---
const cotizacionForm = document.getElementById('cotizacion-form');
if (cotizacionForm) {
  cotizacionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.tipo = normalizarTipo(document.getElementById('tipo-input')?.value || data.tipo);

    const anchoOriginalTexto = String(data.ancho || '').trim();
    const altoOriginalTexto = String(data.alto || '').trim();
    const anchoOriginal = parseFloat(anchoOriginalTexto);
    const altoOriginal = parseFloat(altoOriginalTexto);

    data.ancho = aproximarMedida(anchoOriginal);
    data.alto = aproximarMedida(altoOriginal);
    data.cantidad = parseInt(data.cantidad, 10);

    const resultado = document.getElementById('resultado');

    try {
      const response = await fetch(`${API_BASE}/api/cotizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.error) {
        resultado.textContent = `❌ Error: ${result.error}`;
      } else {
        resultado.textContent = `✅ Total: ${formatCOP(result.total)} — Tipo: ${data.tipo} — Grosor: ${result.grosor}${String(result.grosor).includes('+') ? '' : ' mm'} — Medidas: ${anchoOriginalTexto}m × ${altoOriginalTexto}m`;

        let cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];

        const nuevaCotizacion = {
          // Guardar el tipo tomado del formulario evita arrastrar
          // inconsistencias desde respuestas previas o datos viejos.
          tipo: normalizarTipo(data.tipo),
          grosor: result.grosor,
          ancho: data.ancho,
          alto: data.alto,
          anchoOriginal: anchoOriginalTexto,
          altoOriginal: altoOriginalTexto,
          cantidad: data.cantidad,
          total: result.total
        };

        cotizacionesGuardadas.push(nuevaCotizacion);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizacionesGuardadas));
        cotizaciones = cotizacionesGuardadas;
      }
    } catch (err) {
      console.error(err);
      resultado.textContent = '❌ Error de conexión con el servidor';
    }

    actualizarListaCotizaciones();
  });
}

// --- Botones de Acción y Modales ---
const togglePanel = document.getElementById('toggle-panel');
if (togglePanel) {
  togglePanel.addEventListener('click', () => {
    const panel = document.getElementById('panel-lista');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      actualizarListaCotizaciones();
    }
  });
}

const botonFinalizar = document.getElementById('boton-finalizar');
if (botonFinalizar) {
  botonFinalizar.addEventListener('click', () => {
    if (confirm('¿Estás seguro de finalizar y borrar todas las cotizaciones?')) {
      localStorage.removeItem('cotizaciones');
      cotizaciones = [];
      actualizarListaCotizaciones();
      const resultado = document.getElementById('resultado');
      if (resultado) resultado.textContent = 'Cotizaciones finalizadas y eliminadas.';
    }
  });
}

const botonTotal = document.getElementById('boton-total');
if (botonTotal) {
  botonTotal.addEventListener('click', () => {
    const cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];
    const modalTexto = document.getElementById('total-modal-texto');

    if (cotizacionesGuardadas.length === 0) {
      modalTexto.textContent = 'No hay cotizaciones registradas.';
    } else {
      const totalDinero = cotizacionesGuardadas.reduce((acc, cot) => acc + cot.total, 0);
      const totalVidrios = cotizacionesGuardadas.reduce((acc, cot) => acc + cot.cantidad, 0);

      modalTexto.innerHTML = `
      <strong>Total acumulado:</strong> ${formatCOP(totalDinero)}<br>
      <strong>Total de vidrios:</strong> ${totalVidrios}
    `;
    }

    const modalTotal = document.getElementById('modal-total');
    if (modalTotal) modalTotal.style.display = 'flex';
  });
}

// --- Lógica del PDF (Llamando al nuevo módulo) ---
const btnGenerarPdf = document.getElementById('btn-generar-pdf');
if (btnGenerarPdf) {
  btnGenerarPdf.addEventListener('click', () => {
    const cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];
    if (cotizacionesGuardadas.length === 0) {
      alert('Agrega al menos un ítem para poder generar el PDF.');
      return;
    }

    const modalCliente = document.getElementById('modal-cliente-pdf');
    if (!modalCliente) return;

    // Prefill desde la última vez (si existe)
    const cliente = JSON.parse(localStorage.getItem('cotizacion_cliente') || '{}') || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = (val || '').toString();
    };
    setVal('cliente_nombre', cliente.nombre);
    setVal('cliente_celular', cliente.celular);
    setVal('cliente_email', cliente.email);
    setVal('cliente_direccion', cliente.direccion);
    setVal('cliente_ciudad', cliente.ciudad);
    setVal('cliente_notas', cliente.notas);

    // Reset de la UI del modal (step)
    const btnConfirmar = document.getElementById('btn-confirmar-generar-pdf');
    const btnContinuar = document.getElementById('btn-continuar-envio');
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
    }
    if (btnContinuar) btnContinuar.style.display = 'none';

    modalCliente.style.display = 'flex';
  });
}

const btnConfirmarGenerarPdf = document.getElementById('btn-confirmar-generar-pdf');
if (btnConfirmarGenerarPdf) {
  btnConfirmarGenerarPdf.addEventListener('click', async () => {
    const cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];
    if (cotizacionesGuardadas.length === 0) {
      alert('Agrega al menos un ítem para poder generar el PDF.');
      return;
    }

    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const clienteData = {
      nombre: getVal('cliente_nombre'),
      celular: getVal('cliente_celular'),
      email: getVal('cliente_email'),
      direccion: getVal('cliente_direccion'),
      ciudad: getVal('cliente_ciudad'),
      notas: getVal('cliente_notas')
    };

    if (!clienteData.nombre || !clienteData.celular || !clienteData.email || !clienteData.direccion) {
      alert('Completa los datos obligatorios del solicitante.');
      return;
    }

    localStorage.setItem('cotizacion_cliente', JSON.stringify(clienteData));

    const btnConfirmar = document.getElementById('btn-confirmar-generar-pdf');
    const btnContinuar = document.getElementById('btn-continuar-envio');

    try {
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
      }

      // Se genera y se devuelve base64 para adjuntarlo al correo después
      const pdfData = await PDFGenerator.generarPDFBase64(cotizacionesGuardadas, clienteData);
      if (!pdfData || !pdfData.pdfBase64) throw new Error('PDF no disponible');

      sessionStorage.setItem('cotizacion_pdf', JSON.stringify(pdfData));

      // Descargar el PDF inmediatamente (para que "se guarde" como archivo),
      // y luego permitir el envío por correo con el mismo contenido.
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${pdfData.pdfBase64}`;
      a.download = pdfData.pdfFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Habilitar botón de envío dentro del modal de resumen
      const btnAbrirEnvioCorreo = document.getElementById('btn-abrir-envio-correo');
      if (btnAbrirEnvioCorreo) btnAbrirEnvioCorreo.disabled = false;

      // Step visual dentro del modal cliente
      if (btnContinuar) btnContinuar.style.display = 'block';
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF.');
    } finally {
      if (btnConfirmar) btnConfirmar.disabled = false;
      if (btnConfirmar) btnConfirmar.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
    }
  });
}

const btnContinuarEnvio = document.getElementById('btn-continuar-envio');
if (btnContinuarEnvio) {
  btnContinuarEnvio.addEventListener('click', () => {
    const modalCliente = document.getElementById('modal-cliente-pdf');
    if (modalCliente) modalCliente.style.display = 'none';
    const modalEnvio = document.getElementById('modal-envio-pdf');
    if (modalEnvio) modalEnvio.style.display = 'flex';
  });
}

// --- Envío por Correo ---
const btnEnviarCotizacion = document.getElementById('btn-enviar-cotizacion');
if (btnEnviarCotizacion) {
  btnEnviarCotizacion.addEventListener('click', async () => {
    const contactoInput = document.getElementById('contacto-envio');
    const contacto = contactoInput ? contactoInput.value.trim() : '';
    const cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Debes iniciar sesión para enviar la cotización.');
      window.location.href = '/auth/login.html';
      return;
    }

    if (!contacto) { alert('Ingresa un correo o dato de contacto.'); return; }
    if (cotizacionesGuardadas.length === 0) { alert('No hay cotizaciones registradas para enviar.'); return; }

    try {
      const pdf = JSON.parse(sessionStorage.getItem('cotizacion_pdf') || '{}') || {};
      const pdfBase64 = pdf.pdfBase64;
      const pdfFilename = pdf.pdfFilename;
      const clienteData = JSON.parse(localStorage.getItem('cotizacion_cliente') || '{}') || {};

      const res = await fetch(`${API_BASE}/api/enviar-cotizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ contacto, cotizaciones: cotizacionesGuardadas, pdfBase64, pdfFilename, cliente: clienteData })
      });

      const data = await res.json();
      if (!res.ok) { alert(data.error || 'No se pudo enviar.'); return; }
      alert(data.message || 'Enviado.');
      document.getElementById('modal-envio-pdf').style.display = 'none';
      if (contactoInput) contactoInput.value = '';
      sessionStorage.removeItem('cotizacion_pdf');
      const btnAbrirEnvioCorreo = document.getElementById('btn-abrir-envio-correo');
      if (btnAbrirEnvioCorreo) btnAbrirEnvioCorreo.disabled = true;
    } catch (err) {
      console.error(err);
      alert('Error de conexión al enviar.');
    }
  });
}

// --- Cierre de Modales Genérico ---
const setupModalClose = (modalId, triggerClass) => {
  const trigger = document.querySelector(triggerClass);
  if (trigger) {
    trigger.addEventListener('click', () => {
      document.getElementById(modalId).style.display = 'none';
    });
  }
};

setupModalClose('modal-total', '.cerrar-modal');
setupModalClose('modal-total', '.btn-aceptar-modal');
setupModalClose('modal-envio-pdf', '.cerrar-modal-envio');
setupModalClose('modal-cliente-pdf', '.cerrar-modal-cliente-pdf');

const btnAbrirEnvioCorreo = document.getElementById('btn-abrir-envio-correo');
if (btnAbrirEnvioCorreo) {
  btnAbrirEnvioCorreo.addEventListener('click', () => {
    document.getElementById('modal-envio-pdf').style.display = 'flex';
  });
}

window.addEventListener('click', (e) => {
  ['modal-total', 'modal-envio-pdf', 'modal-cliente-pdf'].forEach(id => {
    const m = document.getElementById(id);
    if (m && e.target === m) m.style.display = 'none';
  });
});