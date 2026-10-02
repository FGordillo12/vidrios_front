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
let cotizacionClienteActual = {};
let catalogoCotizador = [];
let cotizacionPersistidaId = null;
let editingQuoteIndex = null;
let cotizacionPdfItems = null;
let cotizacionPdfConsecutivo = '';
let companySettings = null;

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
      descripcion.textContent = `Grosor: ${cot.grosor}${String(cot.grosor).includes('+') ? '' : ' mm'}, ${cot.anchoOriginal}${cot.unidad || 'm'} × ${cot.altoOriginal}${cot.unidad || 'm'}, Cant: ${cot.cantidad}, Total: ${formatCOP(cot.total)}${textoAcabadosEnListado(cot)}`;

      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button';
      btnEliminar.className = 'btn-eliminar-item';
      btnEliminar.dataset.index = String(indiceReal);
      btnEliminar.textContent = 'Eliminar';

      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'btn-editar-item';
      btnEditar.dataset.index = String(indiceReal);
      btnEditar.textContent = 'Editar';

      li.appendChild(descripcion);
      li.appendChild(btnEditar);
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
  cotizacionPersistidaId = null;
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

function textoAcabadosEnListado(cot) {
  const partes = [];
  if (cot.vidrioPulido) partes.push(`Pulido +${formatCOP(Number(cot.pulidoExtra) || 0)}`);
  if (cot.vidrioSandblasteado) partes.push(`Sandblast +${formatCOP(Number(cot.sandblastExtra) || 0)}`);
  return partes.length ? ` · ${partes.join(' · ')}` : '';
}

function configurarAcabadosCotizacion() {
  const chkPulido = document.getElementById('vidrio-pulido');
  const chkSand = document.getElementById('vidrio-sandblast');
  const panelSand = document.getElementById('sandblast-panel');
  const inputSand = document.getElementById('sandblast-valor');
  const inputSandModal = document.getElementById('sandblast-valor-modal');
  const btnModal = document.getElementById('btn-sandblast-modal');
  const modal = document.getElementById('modal-sandblast');
  const btnAceptarSand = document.getElementById('btn-aceptar-sandblast');
  const cerrarSand = document.querySelector('.cerrar-modal-sandblast');

  if (chkSand && panelSand) {
    chkSand.addEventListener('change', () => {
      panelSand.hidden = !chkSand.checked;
      if (!chkSand.checked && inputSand) inputSand.value = '';
    });
  }

  if (btnModal && modal && inputSand && inputSandModal) {
    btnModal.addEventListener('click', () => {
      inputSandModal.value = inputSand.value || '';
      modal.style.display = 'flex';
    });
  }

  if (btnAceptarSand && modal && inputSand && inputSandModal) {
    btnAceptarSand.addEventListener('click', () => {
      inputSand.value = inputSandModal.value || '';
      modal.style.display = 'none';
    });
  }

  if (cerrarSand && modal) {
    cerrarSand.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
}

// --- Eventos de Inicialización ---
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const companyResponse = await fetch(`${API_BASE}/api/configuracion/empresa`);
    if (companyResponse.ok) {
      companySettings = await companyResponse.json();
      const vigencia = document.getElementById('cliente_vigencia');
      const pago = document.getElementById('cliente_pago');
      if (vigencia && !vigencia.dataset.initialized) { vigencia.value = companySettings.vigenciaDias || 15; vigencia.dataset.initialized = '1'; }
      if (pago && !pago.value) pago.value = companySettings.condicionesPago || '';
    }
  } catch { /* El PDF mantiene la ficha comercial de respaldo. */ }
  const params = new URLSearchParams(window.location.search);
  const tipoUrl = normalizarTipo(params.get('tipo'));
  const tipoGuardado = normalizarTipo(localStorage.getItem('tipoSeleccionado'));
  const tipo = tipoUrl || tipoGuardado;

  const tipoInput = document.getElementById('tipo-input');
  const tipoTexto = document.getElementById('tipo-seleccionado');
  const grosorSelect = document.getElementById('grosor');

  const tipoSelect = document.getElementById('tipo-select');
  const varianteSelect = document.getElementById('variante-select');
  if (tipoInput && tipoTexto && grosorSelect && tipoSelect) {
    const botonCotizar = document.getElementById('boton-cotizar');
    try {
      const response = await fetch(`${API_BASE}/api/catalogo`);
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const friendly = response.status === 503
          ? 'El backend está activo, pero no consigue conectarse a MongoDB. Revisa la URI de Atlas en vidrios_back/.env y reinicia el backend.'
          : response.status === 401
            ? 'Tu sesión venció. Inicia sesión para cargar el catálogo.'
            : (detail.error || `El servidor respondió ${response.status}`);
        const error = new Error(detail.code ? detail.error : friendly);
        error.status = response.status;
        throw error;
      }
      catalogoCotizador = await response.json();
      if (!catalogoCotizador.length) throw new Error('La base respondió, pero el catálogo no tiene vidrios activos. Un administrador debe cargar o activar los productos.');
      const tipos = [...new Set(catalogoCotizador.map((g) => g.tipo))];
      tipoSelect.replaceChildren(...tipos.map((t) => { const option = document.createElement('option'); option.value = t; option.textContent = capitalizar(t); return option; }));
      if (tipo && tipos.includes(tipo)) tipoSelect.value = tipo;
      const refreshCatalogChoices = () => {
        const t = tipoSelect.value;
        tipoInput.value = t;
        tipoTexto.textContent = `Tipo seleccionado: ${capitalizar(t)}`;
        const variants = [...new Set(catalogoCotizador.filter((g) => g.tipo === t).map((g) => g.variante).filter(Boolean))];
        const hasStandard = catalogoCotizador.some((g) => g.tipo === t && !g.variante);
        varianteSelect.replaceChildren(...(hasStandard ? [new Option('Estándar', '')] : []), ...variants.map((v) => new Option(v === 'normal' ? 'Normal' : capitalizar(v), v)));
        if (variants.length) varianteSelect.value = variants.includes('normal') ? 'normal' : variants[0];
        refreshThickness();
        if (botonCotizar) botonCotizar.disabled = false;
      };
      const refreshThickness = () => {
        const rows = catalogoCotizador.filter((g) => g.tipo === tipoSelect.value && g.variante === (varianteSelect.value || '') && g.activo);
        const previousThickness = grosorSelect.value;
        const availableThicknesses = [...new Set(rows.map((g) => String(g.grosorMm)))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
        poblarSelectGrosores(grosorSelect, availableThicknesses);
        if (availableThicknesses.includes(previousThickness)) grosorSelect.value = previousThickness;
        updateSelectedGlassState();
      };
      const updateSelectedGlassState = () => {
        const selected = catalogoCotizador.find((g) => g.tipo === tipoSelect.value
          && g.variante === (varianteSelect.value || '')
          && String(g.grosorMm) === grosorSelect.value
          && g.activo);
        if (botonCotizar) botonCotizar.disabled = !selected || Number(selected.precioM2) <= 0;
      };
      tipoSelect.addEventListener('change', refreshCatalogChoices);
      varianteSelect.addEventListener('change', refreshThickness);
      grosorSelect.addEventListener('change', updateSelectedGlassState);
      refreshCatalogChoices();
    } catch (err) {
      tipoSelect.replaceChildren(new Option(err.message.startsWith('La base respondió') ? 'Catálogo vacío' : 'No disponible', ''));
      if (botonCotizar) botonCotizar.disabled = true;
      tipoTexto.textContent = err.status === 401
        ? 'Tu sesión venció. Inicia sesión para cargar el catálogo.'
        : `No se pudo cargar el catálogo: ${err.message}`;
    }
  }

  if (document.getElementById('lista-cotizaciones')) {
    actualizarListaCotizaciones();
  }

  const cotizacionFormEl = document.getElementById('cotizacion-form');
  bloquearRuedaEnInputsNumericos(cotizacionFormEl);
  bloquearRuedaEnInputsNumericos(document.getElementById('modal-sandblast'));

  configurarAcabadosCotizacion();

  const listaCotizaciones = document.getElementById('lista-cotizaciones');
  if (listaCotizaciones) {
    listaCotizaciones.addEventListener('click', (e) => {
      const boton = e.target.closest('.btn-eliminar-item');
      const botonEditar = e.target.closest('.btn-editar-item');
      if (botonEditar) {
        const item = cotizaciones[Number(botonEditar.dataset.index)];
        if (!item) return;
        editingQuoteIndex = Number(botonEditar.dataset.index);
        document.getElementById('tipo-select').value = item.tipo;
        document.getElementById('tipo-select').dispatchEvent(new Event('change'));
        if (item.variante) document.getElementById('variante-select').value = item.variante;
        document.getElementById('variante-select').dispatchEvent(new Event('change'));
        document.getElementById('grosor').value = item.grosor;
        document.getElementById('cotizacion-form').elements.ancho.value = item.anchoOriginal;
        document.getElementById('cotizacion-form').elements.alto.value = item.altoOriginal;
        document.getElementById('unidad-medida').value = item.unidad || 'm';
        document.getElementById('cotizacion-form').elements.cantidad.value = item.cantidad;
        document.getElementById('vidrio-pulido').checked = !!item.vidrioPulido;
        document.getElementById('vidrio-sandblast').checked = !!item.vidrioSandblasteado;
        document.getElementById('sandblast-valor').value = item.sandblastExtra || '';
        document.getElementById('sandblast-panel').hidden = !item.vidrioSandblasteado;
        document.getElementById('boton-cotizar').innerHTML = '<i class="fas fa-save"></i> Actualizar ítem';
        document.getElementById('cotizacion-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        cerrarPanel();
        return;
      }
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
    data.tipo = normalizarTipo(document.getElementById('tipo-select')?.value || data.tipo);

    const anchoOriginalTexto = String(data.ancho || '').trim();
    const altoOriginalTexto = String(data.alto || '').trim();
    const anchoOriginal = parseFloat(anchoOriginalTexto);
    const altoOriginal = parseFloat(altoOriginalTexto);

    const unidad = document.getElementById('unidad-medida')?.value || 'm';
    const factor = unidad === 'cm' ? 0.01 : unidad === 'mm' ? 0.001 : 1;
    data.ancho = anchoOriginal * factor;
    data.alto = altoOriginal * factor;
    data.cantidad = parseInt(data.cantidad, 10);

    const resultado = document.getElementById('resultado');

    const vidrioPulido = document.getElementById('vidrio-pulido')?.checked || false;
    const vidrioSandblasteado = document.getElementById('vidrio-sandblast')?.checked || false;
    let sandblastValor = 0;
    if (vidrioSandblasteado) {
      const rawSand = String(document.getElementById('sandblast-valor')?.value || '').trim();
      sandblastValor = parseFloat(rawSand);
      if (!Number.isFinite(sandblastValor) || sandblastValor <= 0) {
        resultado.textContent = '❌ Si marca sandblast, indique un valor adicional mayor a 0 (COP).';
        actualizarListaCotizaciones();
        return;
      }
    }

    const payload = {
      tipo: data.tipo,
      variante: document.getElementById('variante-select')?.value || '',
      ancho: data.ancho,
      alto: data.alto,
      cantidad: data.cantidad,
      grosor: data.grosor,
      vidrioPulido,
      vidrioSandblasteado,
      sandblastValor: vidrioSandblasteado ? sandblastValor : 0
    };

    try {
      const response = await fetch(`${API_BASE}/api/cotizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.error) {
        resultado.textContent = `❌ Error: ${result.error}`;
      } else {
        const partesTotal = [`Vidrio: ${formatCOP(Number(result.totalVidrio) || 0)}`];
        if (Number(result.pulidoExtra) > 0) partesTotal.push(`Pulido: ${formatCOP(result.pulidoExtra)}`);
        if (Number(result.sandblastExtra) > 0) partesTotal.push(`Sandblast: ${formatCOP(result.sandblastExtra)}`);
        resultado.textContent = `✅ Total: ${formatCOP(result.total)} (${partesTotal.join(' + ')}) — Tipo: ${data.tipo} — Grosor: ${result.grosor}${String(result.grosor).includes('+') ? '' : ' mm'} — Medidas: ${anchoOriginalTexto} ${unidad} × ${altoOriginalTexto} ${unidad}`;

        let cotizacionesGuardadas = JSON.parse(localStorage.getItem('cotizaciones')) || [];

        const nuevaCotizacion = {
          // Guardar el tipo tomado del formulario evita arrastrar
          // inconsistencias desde respuestas previas o datos viejos.
          tipo: normalizarTipo(data.tipo),
          variante: document.getElementById('variante-select')?.value || '',
          grosor: result.grosor,
          ancho: data.ancho,
          alto: data.alto,
          anchoOriginal: anchoOriginalTexto,
          altoOriginal: altoOriginalTexto,
          unidad,
          cantidad: data.cantidad,
          total: result.total,
          totalVidrio: result.totalVidrio ?? result.total,
          vidrioPulido: !!result.vidrioPulido,
          vidrioSandblasteado: !!result.vidrioSandblasteado,
          pulidoExtra: Number(result.pulidoExtra) || 0,
          sandblastExtra: Number(result.sandblastExtra) || 0
        };

        if (editingQuoteIndex !== null && cotizacionesGuardadas[editingQuoteIndex]) {
          cotizacionesGuardadas[editingQuoteIndex] = nuevaCotizacion;
          editingQuoteIndex = null;
          document.getElementById('boton-cotizar').innerHTML = '<i class="fas fa-calculator"></i> Generar Cotización';
          cotizacionPersistidaId = null;
        } else { cotizacionesGuardadas.push(nuevaCotizacion); cotizacionPersistidaId = null; }
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
      cotizacionPersistidaId = null;
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

    const cliente = cotizacionClienteActual;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = (val || '').toString();
    };
    setVal('cliente_nombre', cliente.nombre);
    setVal('cliente_documento', cliente.documento);
    setVal('cliente_celular', cliente.celular);
    setVal('cliente_email', cliente.email);
    setVal('cliente_direccion', cliente.direccion);
    setVal('cliente_ciudad', cliente.ciudad);
    setVal('cliente_notas', cliente.notas);
    setVal('cliente_vigencia', cliente.vigenciaDias || companySettings?.vigenciaDias || 15);
    setVal('cliente_pago', cliente.formaPago || companySettings?.condicionesPago);

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
      documento: getVal('cliente_documento'),
      celular: getVal('cliente_celular'),
      email: getVal('cliente_email'),
      direccion: getVal('cliente_direccion'),
      ciudad: getVal('cliente_ciudad'),
      notas: getVal('cliente_notas'),
      vigenciaDias: Number(getVal('cliente_vigencia')) || 15,
      formaPago: getVal('cliente_pago')
    };

    if (!clienteData.nombre) {
      alert('El nombre del solicitante es obligatorio.');
      return;
    } 

    cotizacionClienteActual = clienteData;

    const btnConfirmar = document.getElementById('btn-confirmar-generar-pdf');
    const btnContinuar = document.getElementById('btn-continuar-envio');

    try {
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
      }

      let quoteRecord;
      if (!cotizacionPersistidaId) {
        const saveResponse = await fetch(`${API_BASE}/api/cotizaciones`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente: { nombre: clienteData.nombre, documento: clienteData.documento, telefono: clienteData.celular, email: clienteData.email, direccion: clienteData.direccion, ciudad: clienteData.ciudad }, items: cotizacionesGuardadas.map((item) => ({ tipo: item.tipo, variante: item.variante || '', grosor: item.grosor, ancho: Number(item.anchoOriginal ?? item.ancho), alto: Number(item.altoOriginal ?? item.alto), unidad: item.unidad || 'm', cantidad: Number(item.cantidad), total: Number(item.total), subtotal: Number(item.totalVidrio), vidrioPulido: !!item.vidrioPulido, vidrioSandblasteado: !!item.vidrioSandblasteado, sandblastExtra: Number(item.sandblastExtra) || 0 })), vigenciaDias: clienteData.vigenciaDias, formaPago: clienteData.formaPago, observaciones: clienteData.notas })
        });
        const savedQuote = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(savedQuote.error || 'No se pudo guardar la cotización');
        cotizacionPersistidaId = savedQuote._id;
        quoteRecord = savedQuote;
      } else {
        const detailResponse = await fetch(`${API_BASE}/api/cotizaciones/${encodeURIComponent(cotizacionPersistidaId)}`);
        quoteRecord = await detailResponse.json();
        if (!detailResponse.ok) throw new Error(quoteRecord.error || 'No se pudo recuperar la cotización guardada');
      }

      // Se genera y se devuelve base64 para adjuntarlo al correo después
      const pdfData = await PDFGenerator.generarPDFBase64(quoteRecord.items, clienteData, quoteRecord, quoteRecord.company || companySettings || {});
      if (!pdfData || !pdfData.pdfBase64) throw new Error('PDF no disponible');
      resultado.textContent = `PDF generado para ${quoteRecord.consecutivo}.`;

      sessionStorage.setItem('cotizacion_pdf', JSON.stringify(pdfData));
      cotizacionPdfItems = quoteRecord.items;
      cotizacionPdfConsecutivo = quoteRecord.consecutivo;

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
    if (!contacto) { alert('Ingresa un correo o dato de contacto.'); return; }
    if (cotizacionesGuardadas.length === 0) { alert('No hay cotizaciones registradas para enviar.'); return; }

    try {
      const pdf = JSON.parse(sessionStorage.getItem('cotizacion_pdf') || '{}') || {};
      const pdfBase64 = pdf.pdfBase64;
      const pdfFilename = pdf.pdfFilename;
      const clienteData = cotizacionClienteActual;

      const res = await fetch(`${API_BASE}/api/enviar-cotizacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacto, cotizaciones: cotizacionPdfItems || cotizacionesGuardadas, pdfBase64, pdfFilename, consecutivo: cotizacionPdfConsecutivo, cliente: clienteData })
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
  ['modal-total', 'modal-envio-pdf', 'modal-cliente-pdf', 'modal-sandblast'].forEach(id => {
    const m = document.getElementById(id);
    if (m && e.target === m) m.style.display = 'none';
  });
});
