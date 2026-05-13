/**
 * Módulo de Generación de PDFs — Vidrios Alejo SAS
 * Versión Corporativa Premium v2.1 (Fix Layout)
 */

window.PDFGenerator = {
    escapeHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    nl2br(texto) {
        return this.escapeHtml(texto).replace(/\n/g, '<br/>');
    },

    formatCOP(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(valor);
    },

    capitalizar(texto) {
        if (!texto) return '';
        return texto.split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    },

    lineaAcabados(item) {
        const partes = [];
        if (item.vidrioPulido) {
            partes.push(`Pulido`);
        }
        if (item.vidrioSandblasteado) {
            partes.push(`Sandblast`);
        }
        if (!partes.length) return '';
        return `<div style="margin-top:6px;font-size:10px;color:#1a5276;font-weight:600;line-height:1.35;">${partes.join(' · ')}</div>`;
    },

    async getBase64Image(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    },

    generarHTML(cotizacionesList, refId, logoBase64, clienteData) {
        const total = cotizacionesList.reduce((sum, item) => sum + item.total, 0);

        const cliente = clienteData || {};
        const nombreCliente = this.escapeHtml(cliente.nombre || '—');
        const celularCliente = this.escapeHtml(cliente.celular || '—');
        const emailCliente = this.escapeHtml(cliente.email || '—');
        const direccionCliente = this.nl2br(cliente.direccion || '—');
        const ciudadCliente = this.escapeHtml(cliente.ciudad || '');
        const notasCliente = this.nl2br(cliente.notas || '');

        const fechaEmision = new Intl.DateTimeFormat('es-CO', {
            day: '2-digit', month: 'long', year: 'numeric'
        }).format(new Date());

        const fechaVence = new Intl.DateTimeFormat('es-CO', {
            day: '2-digit', month: 'long', year: 'numeric'
        }).format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000));

        const logoTag = logoBase64
            ? `<img src="${logoBase64}" style="height:64px;width:auto;display:block;" alt="Logo">`
            : `<div style="width:64px;height:64px;background:#1B3A6B;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:900;">VA</div>`;

        const rows = cotizacionesList.map((item) => `
            <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #EEF0F4;vertical-align:top;">
                    <div style="font-weight:700;font-size:12px;color:#0F1D35;margin-bottom:3px;">${this.capitalizar(item.tipo)}</div>
                    <div style="font-size:10px;color:#8A93A6;">Vidrio ${item.tipo} — ${item.grosor}${String(item.grosor).includes('+') ? '' : 'mm'} espesor</div>
                    ${this.lineaAcabados(item)}
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid #EEF0F4;text-align:center;font-size:12px;color:#3D5280;font-weight:600;vertical-align:middle;">
                    ${item.grosor}${String(item.grosor).includes('+') ? '' : 'mm'}
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid #EEF0F4;text-align:center;font-size:12px;color:#3D5280;font-weight:600;vertical-align:middle;">
                    ${item.anchoOriginal}m × ${item.altoOriginal}m
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid #EEF0F4;text-align:center;font-size:12px;font-weight:700;color:#0F1D35;vertical-align:middle;">
                    ${item.cantidad}
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid #EEF0F4;text-align:right;font-size:12px;font-weight:800;color:#0F1D35;vertical-align:middle;">
                    ${this.formatCOP(item.total)}
                </td>
            </tr>`
        ).join('');

        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
  body { background: white; font-family: 'Sora', sans-serif; }
  
  /* Ancho A4 fijo (sin altura fija) para que html2pdf pueda paginar */
  .page { 
    background: white; 
    width: 794px; /* Ancho exacto A4 en px */
    position: relative; 
    margin: 0 auto;
  }

  .accent-bar { position: absolute; left: 0; top: 0; width: 6px; height: 100%; background: linear-gradient(180deg, #1B3A6B 0%, #2D6BB5 100%); }
  /* Posición cerca del encabezado para evitar "flotar" en páginas posteriores */
  .watermark { position: absolute; top: 220px; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.04; pointer-events: none; z-index: 0; width: 450px; }

  .header { padding: 40px 52px 30px 60px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand-name { font-size: 24px; font-weight: 800; color: #0F1D35; letter-spacing: -0.5px; }
  .brand-sub { font-size: 10px; font-weight: 600; color: #2D6BB5; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
  .brand-nit { font-size: 11px; color: #8A93A6; }

  .doc-id { text-align: right; }
  .doc-label { font-size: 32px; font-weight: 800; color: #F0F3F7; text-transform: uppercase; line-height: 0.8; margin-bottom: 10px; }
  .doc-ref-box { background: #1B3A6B; color: white; padding: 10px 20px; border-radius: 8px; }

  .disclaimer { background: #FFF8E6; border-left: 4px solid #E6A817; padding: 12px 18px; margin: 0 52px 20px 60px; border-radius: 0 6px 6px 0; font-size: 11px; color: #7A5500; font-weight: 600; }

  .info-section { padding: 0 52px 18px 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
  .info-card { background: #F8FAFB; border: 1px solid #E4E9F2; border-radius: 10px; padding: 15px; }
  .info-label { font-size: 9px; text-transform: uppercase; color: #8A93A6; font-weight: 700; margin-bottom: 5px; }
  .info-value { font-size: 13px; font-weight: 700; color: #0F1D35; }
  .badge { background: #E8F4EC; color: #1A7A3C; border-radius: 20px; padding: 4px 12px; font-size: 10px; font-weight: 700; }

  .client-section { padding: 0 52px 16px 60px; }
  .client-title { font-size: 11px; font-weight: 800; color: #1B3A6B; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
  .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .client-item { background: #F8FAFB; border: 1px solid #E4E9F2; border-radius: 10px; padding: 10px 12px; }
  .client-label { font-size: 9px; text-transform: uppercase; color: #8A93A6; font-weight: 700; margin-bottom: 4px; }
  .client-value { font-size: 12px; font-weight: 800; color: #0F1D35; word-break: break-word; }
  .client-value-small { font-size: 11px; font-weight: 700; color: #5C6B82; }

  .table-section { padding: 0 52px 0 60px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead th { background: #0F1D35; color: white; padding: 14px 18px; font-size: 10px; text-transform: uppercase; text-align: left; }
  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
  tbody tr:nth-child(even) { background: #FBFCFD; }
  th, td { word-wrap: break-word; overflow-wrap: break-word; }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }

  .summary-section { padding: 30px 52px 0 60px; display: flex; justify-content: flex-end; }
  .summary-box { width: 280px; background: #1B3A6B; border-radius: 10px; padding: 20px; color: white; }
  .sum-total-val { font-size: 22px; font-weight: 800; display: block; margin-top: 5px; }

  .notes-section { padding: 40px 52px 40px 60px; }
  .notes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .note-item { display: flex; gap: 8px; font-size: 10px; color: #5C6B82; }
  .note-num { background: #EEF2F8; color: #1B3A6B; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }

  .footer { background: #0F1D35; padding: 30px 52px 30px 60px; color: white; display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 24px; }
  .footer-contact { font-size: 10px; opacity: 0.8; text-align: right; line-height: 1.6; }
</style>
</head>
<body>
<div class="page" id="pdf-content">
    <div class="accent-bar"></div>
    ${logoBase64 ? `<img src="${logoBase64}" class="watermark">` : ''}

    <header class="header">
        <div style="display:flex;align-items:center;gap:20px;">
            ${logoTag}
            <div>
                <div class="brand-sub">Calidad y Transparencia</div>
                <div class="brand-name">Vidrios Alejo SAS</div>
                <div class="brand-nit">NIT: 901.452.128-4</div>
            </div>
        </div>
        <div class="doc-id">
            <span class="doc-label">Cotización</span>
            <div class="doc-ref-box">
                <div style="font-size:9px;opacity:0.7;">REFERENCIA</div>
                <div style="font-size:16px;font-weight:800;">${refId}</div>
            </div>
        </div>
    </header>

    <div class="disclaimer">
        ⚠️ <strong>Este documento es una cotización comercial, no una factura.</strong> No tiene validez fiscal.
    </div>

    <div class="info-section">
        <div class="info-card">
            <div class="info-label">Emisión</div>
            <div class="info-value">${fechaEmision}</div>
        </div>
        <div class="info-card">
            <div class="info-label">Vencimiento</div>
            <div class="info-value" style="color:#1B6BB5">${fechaVence}</div>
        </div>
        <div class="info-card">
            <div class="info-label">Estado</div>
            <div style="margin-top:4px;"><span class="badge">Vigente</span></div>
        </div>
    </div>

    <div class="client-section">
        <div class="client-title">Datos del solicitante</div>
        <div class="client-grid">
            <div class="client-item">
                <div class="client-label">Nombre</div>
                <div class="client-value">${nombreCliente}</div>
            </div>
            <div class="client-item">
                <div class="client-label">Celular</div>
                <div class="client-value">${celularCliente}</div>
            </div>
            <div class="client-item">
                <div class="client-label">Correo</div>
                <div class="client-value">${emailCliente}</div>
            </div>
            <div class="client-item">
                <div class="client-label">Dirección</div>
                <div class="client-value client-value-small">${direccionCliente}</div>
                ${ciudadCliente ? `<div class="client-label" style="margin-top:8px;">Ciudad</div><div class="client-value client-value-small">${ciudadCliente}</div>` : ''}
            </div>
        </div>

        ${notasCliente ? `
        <div style="margin-top:10px;background:#fff;border:1px solid #E4E9F2;border-radius:10px;padding:10px 12px;">
            <div style="font-size:9px;text-transform:uppercase;color:#8A93A6;font-weight:800;margin-bottom:4px;">Notas</div>
            <div style="font-size:12px;font-weight:700;color:#5C6B82;line-height:1.35;">${notasCliente}</div>
        </div>` : ''}
    </div>

    <div class="table-section">
        <table>
            <thead>
                <tr>
                    <th style="width:40%;">Producto</th>
                    <th style="width:10%;text-align:center;">Grosor</th>
                    <th style="width:20%;text-align:center;">Medidas</th>
                    <th style="width:10%;text-align:center;">Cant.</th>
                    <th style="width:20%;text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>

    <div class="summary-section">
        <div class="summary-box">
            <div style="font-size:11px;opacity:0.8;text-transform:uppercase;">Total Estimado</div>
            <span class="sum-total-val">${this.formatCOP(total)}</span>
        </div>
    </div>

    <div class="notes-section">
        <div style="font-size:11px;font-weight:800;color:#1B3A6B;margin-bottom:15px;text-transform:uppercase;">Condiciones Comerciales</div>
        <div class="notes-grid">
            <div class="note-item"><span class="note-num">1</span><span>Válido por 15 días calendario.</span></div>
            <div class="note-item"><span class="note-num">2</span><span>Sujeto a rectificación de medidas en obra.</span></div>
            <div class="note-item"><span class="note-num">3</span><span>Templados no admiten cambios tras fabricación.</span></div>
            <div class="note-item"><span class="note-num">4</span><span>Precio incluye entrega en zona urbana.</span></div>
        </div>
    </div>

    <footer class="footer">
        <div style="font-size:11px;">
            <strong>Vidrios Alejo SAS</strong><br>
            Calle 12 #8-62, Ubaté - Cundinamarca<br>
            @vidrios_alejo_sas
        </div>
        <div class="footer-contact">
            +57 322 934 0900<br>
            contacto@vidriosalejo.com<br>
            Lun – Sáb · 7:30 AM – 5:00 PM
        </div>
    </footer>
</div>
</body>
</html>`;
    },

    async generarPDFBase64(cotizacionesGuardadas, clienteData) {
        if (!cotizacionesGuardadas || cotizacionesGuardadas.length === 0) {
            throw new Error('Agrega al menos un ítem.');
        }

        let container = null;

        try {
            const logoBase64 = await this.getBase64Image('/img/vidrioslogo.png');
            const refId = `VA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
            const cliente = clienteData || JSON.parse(localStorage.getItem('cotizacion_cliente') || '{}');
            const htmlString = this.generarHTML(cotizacionesGuardadas, refId, logoBase64, cliente);

            // Contenedor temporal (fuera de la vista)
            container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-10000px';
            container.style.top = '0';
            container.style.width = '794px';
            container.style.background = 'white';
            container.style.zIndex = '-1';
            container.innerHTML = htmlString;
            document.body.appendChild(container);

            const element = container.querySelector('#pdf-content');
            if (!element) throw new Error('No se pudo preparar el contenido del PDF.');

            const pdfFilename = `Cotizacion_${refId}.pdf`;
            const opciones = {
                margin: 0,
                filename: pdfFilename,
                // Paginación estable para tablas largas sin "descuadre" visual.
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.info-card', '.client-item', '.summary-box', '.note-item'] },
                // Ligeramente menos calidad y escala para evitar desbordes de canvas
                image: { type: 'jpeg', quality: 0.92 },
                html2canvas: { 
                    scale: 1.6,
                    useCORS: true, 
                    logging: false,
                    scrollX: 0,
                    scrollY: 0
                },
                // Usamos PX para que el tamaño coincida con el HTML A4 en px.
                jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
            };

            const dataUri = await html2pdf().set(opciones).from(element).output('datauristring');
            const base64 = (dataUri || '').split('base64,')[1] || (dataUri || '').split(',')[1] || '';

            if (!base64) throw new Error('No se pudo obtener el base64 del PDF.');

            return { refId, pdfFilename, pdfBase64: base64 };
        } finally {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    },

    async descargar(cotizacionesGuardadas, clienteData) {
        if (!cotizacionesGuardadas || cotizacionesGuardadas.length === 0) {
            alert('Agrega al menos un ítem.');
            return;
        }

        const btn = document.getElementById('btn-generar-pdf');
        const originalHtml = btn ? btn.innerHTML : '';

        try {
            if (btn) btn.innerHTML = 'Generando...';
            const pdfData = await this.generarPDFBase64(cotizacionesGuardadas, clienteData);
            const a = document.createElement('a');
            a.href = `data:application/pdf;base64,${pdfData.pdfBase64}`;
            a.download = pdfData.pdfFilename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            if (btn) btn.innerHTML = originalHtml;
        }
    }
};