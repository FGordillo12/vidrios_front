const api = typeof window.API_BASE === 'string' ? window.API_BASE : (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '');
    const list = document.getElementById('catalog-list');
    const message = document.getElementById('catalog-message');
    const form = document.getElementById('catalog-form');
    const settingsForm = document.getElementById('quote-settings-form');
    const companyForm = document.getElementById('company-settings-form');
    const searchInput = document.getElementById('catalog-search');
    const searchCount = document.getElementById('catalog-search-count');
    const summaryCount = document.getElementById('catalog-summary-count');
    const catalogDetails = document.getElementById('catalog-list-details');
    const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const say = (text) => { message.textContent = text; };
    const normalizeSearch = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

    function filterCatalogRows() {
      const query = normalizeSearch(searchInput.value);
      const rows = [...list.querySelectorAll('tr[data-search-text]')];
      let visible = 0;
      for (const row of rows) {
        const matches = !query || row.dataset.searchText.includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
      }
      searchCount.textContent = query ? `${visible} de ${rows.length} combinaciones` : `${rows.length} combinaciones`;
      summaryCount.textContent = query ? `${visible} coincidencias de ${rows.length}` : `${rows.length} combinaciones`;
      if (query) catalogDetails.open = true;
      const emptyRow = list.querySelector('tr:not([data-search-text])');
      if (emptyRow) emptyRow.hidden = Boolean(query && rows.length);
    }

    async function apiRequest(path, options = {}) {
      const response = await fetch(`${api}${path}`, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación');
      return data;
    }

    async function loadCatalog() {
      try {
        const records = await apiRequest('/api/catalogo?todos=1');
        list.replaceChildren();
        records.forEach((record) => {
          const row = document.createElement('tr');
          row.dataset.searchText = normalizeSearch([record.tipo, record.variante, record.grosorMm].join(' '));
          if (!record.activo) row.classList.add('catalog-inactive');
          const type = document.createElement('td');
          const variant = document.createElement('td');
          const thickness = document.createElement('td');
          const price = document.createElement('td');
          const state = document.createElement('td');
          const actions = document.createElement('td');
          const typeInput = document.createElement('input'); typeInput.value = record.tipo; typeInput.maxLength = 60; type.append(typeInput);
          const variantInput = document.createElement('input'); variantInput.value = record.variante || ''; variantInput.maxLength = 40; variant.append(variantInput);
          const thicknessInput = document.createElement('input'); thicknessInput.value = record.grosorMm; thicknessInput.maxLength = 5; thickness.append(thicknessInput);
          const priceInput = document.createElement('input'); priceInput.type = 'number'; priceInput.min = '0'; priceInput.max = '100000000'; priceInput.step = '1'; priceInput.value = record.precioM2; price.append(priceInput);
          state.textContent = record.activo ? 'Activo' : 'Inactivo';
          const save = document.createElement('button'); save.type = 'button'; save.className = 'catalog-btn'; save.textContent = 'Guardar';
          save.addEventListener('click', async () => {
            try {
              await apiRequest(`/api/admin/catalogo/${encodeURIComponent(record._id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: typeInput.value, variante: variantInput.value, grosorMm: thicknessInput.value, precioM2: Number(priceInput.value) }) });
              say('Cambios guardados.'); await loadCatalog();
            } catch (error) { say(error.message); }
          });
          const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'catalog-btn catalog-toggle'; toggle.textContent = record.activo ? 'Desactivar' : 'Activar';
          toggle.addEventListener('click', async () => {
            try { await apiRequest(`/api/admin/catalogo/${encodeURIComponent(record._id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !record.activo }) }); say('Estado actualizado.'); await loadCatalog(); }
            catch (error) { say(error.message); }
          });
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'catalog-btn catalog-delete'; remove.textContent = 'Eliminar';
          remove.addEventListener('click', async () => {
            if (!confirm(`¿Eliminar ${record.tipo} ${record.variante} ${record.grosorMm} mm?`)) return;
            try { await apiRequest(`/api/admin/catalogo/${encodeURIComponent(record._id)}`, { method: 'DELETE' }); say('Combinación eliminada.'); await loadCatalog(); }
            catch (error) { say(error.message); }
          });
          const group = document.createElement('div'); group.className = 'catalog-row-actions'; group.append(save, toggle, remove); actions.append(group);
          row.append(type, variant, thickness, price, state, actions); list.append(row);
        });
        if (!records.length) list.innerHTML = '<tr><td colspan="6">No hay combinaciones registradas.</td></tr>';
        say(`${records.length} combinaciones en el catálogo.`);
        filterCatalogRows();
      } catch (error) { say(error.message); }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      values.precioM2 = Number(values.precioM2);
      try {
        await apiRequest('/api/admin/catalogo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        form.reset(); form.elements.precioM2.value = '0'; say('Combinación agregada.'); await loadCatalog();
      } catch (error) { say(error.message); }
    });

    settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const minM2 = Number(new FormData(settingsForm).get('minM2'));
        const saved = await apiRequest('/api/admin/configuracion/cotizador', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minM2 }) });
        settingsForm.elements.minM2.value = saved.minM2;
        say(`Área mínima configurada en ${saved.minM2} m² por pieza.`);
      } catch (error) { say(error.message); }
    });

    apiRequest('/api/configuracion/cotizador').then((settings) => { settingsForm.elements.minM2.value = settings.minM2; }).catch(() => {});
    apiRequest('/api/configuracion/empresa').then((settings) => {
      for (const field of companyForm.elements) if (field.name && Object.hasOwn(settings, field.name)) field.value = settings[field.name];
    }).catch(() => {});
    companyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(companyForm).entries());
      values.vigenciaDias = Number(values.vigenciaDias);
      try {
        await apiRequest('/api/admin/configuracion/empresa', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        say('Datos comerciales guardados. Se usarán en los nuevos PDF.');
      } catch (error) { say(error.message); }
    });

    searchInput.addEventListener('input', filterCatalogRows);
    loadCatalog();
