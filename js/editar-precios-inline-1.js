const API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : 'http://localhost:3000';
    const form = document.getElementById('preciosForm');
    const selector = document.getElementById('selectorTipo');
    let agrupado = {};

    axios.get(`${API_BASE}/api/precios`, {
      withCredentials: true
    })
    .then(response => {
      const precios = response.data;

      precios.forEach(p => {
        const { tipo, grosor, valor } = p;
        if (!agrupado[tipo]) agrupado[tipo] = {};
        agrupado[tipo][grosor] = valor;
      });

      Object.keys(agrupado).forEach(tipo => {
        const opt = document.createElement('option');
        opt.value = tipo;
        opt.textContent = tipo.toUpperCase();
        selector.appendChild(opt);
      });
    })
    .catch(error => {
      console.error('❌ Error al obtener precios:', error);
      alert('No se pudieron cargar los precios.');
    });

    selector.addEventListener('change', () => {
      form.innerHTML = '';
      const tipoSeleccionado = selector.value;
      const datos = agrupado[tipoSeleccionado];
      form.classList.remove('oculto');

      const contenedor = document.createElement('div');
      contenedor.classList.add('tarjeta-tipo');
      contenedor.innerHTML = `<h3>${tipoSeleccionado.toUpperCase()}</h3>`;

      for (const grosor in datos) {
        const label = document.createElement('label');
        label.innerText = grosor.includes('+') ? `Laminado ${grosor}:` : `Grosor ${grosor} mm:`;
        label.classList.add('input-label');

        const input = document.createElement('input');
        input.type = 'number';
        input.name = `${tipoSeleccionado}__${grosor}`;
        input.value = datos[grosor];
        input.placeholder = `Precio para grosor ${grosor}`;
        input.step = 'any';
        input.required = true;
        input.classList.add('input-precio');

        contenedor.appendChild(label);
        contenedor.appendChild(input);
      }

      form.appendChild(contenedor);
    });

    function guardarCambios() {
      const data = {};
      const inputs = document.querySelectorAll('#preciosForm input');

      inputs.forEach(input => {
        const [tipo, grosorRaw] = input.name.split('__');
        const grosor = grosorRaw.toString();
        if (!data[tipo]) data[tipo] = {};
        data[tipo][grosor] = parseFloat(input.value);
      });

      console.log('➡ Enviando datos:', data);

      axios.post(`${API_BASE}/api/editar-precios`, data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('va_csrf='))?.split('=').slice(1).join('=') || '') }
      })
      .then(() => alert('✅ Precios actualizados correctamente'))
      .catch(err => {
        console.error('❌ Error al guardar precios:', err);
        alert('Error al guardar los precios');
      });
    }
    document.getElementById('btn-guardar-precios')?.addEventListener('click', guardarCambios);
