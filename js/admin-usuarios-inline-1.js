const api = typeof window.API_BASE === 'string' ? window.API_BASE : (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '');
    const body = document.getElementById('users-list');
    const message = document.getElementById('users-message');
    const showMessage = (text) => { message.textContent = text; };

    async function loadUsers() {
      try {
        const response = await fetch(`${api}/api/admin/users`);
        const users = await response.json();
        if (!response.ok) throw new Error(users.error || 'No se pudieron cargar las cuentas');
        body.replaceChildren();
        users.forEach((user) => {
          const row = document.createElement('tr');
          const name = document.createElement('td'); name.textContent = user.username;
          const email = document.createElement('td'); email.textContent = user.email;
          const roleCell = document.createElement('td');
          const role = document.createElement('select'); role.setAttribute('aria-label', `Rol de ${user.username}`);
          [['user', 'Usuario'], ['admin', 'Administrador']].forEach(([value, label]) => {
            const option = document.createElement('option'); option.value = value; option.textContent = label; role.append(option);
          });
          role.value = user.role;
          role.addEventListener('change', () => updateUser(user._id, { role: role.value }));
          roleCell.append(role);
          const statusCell = document.createElement('td');
          const status = document.createElement('span'); status.className = `user-status${user.active ? '' : ' inactive'}`;
          status.textContent = user.active ? 'Activo' : 'Inactivo'; statusCell.append(status);
          const actionCell = document.createElement('td');
          const action = document.createElement('button'); action.className = 'user-action'; action.type = 'button'; action.textContent = user.active ? 'Desactivar' : 'Activar';
          action.addEventListener('click', () => updateUser(user._id, { active: !user.active })); actionCell.append(action);
          row.append(name, email, roleCell, statusCell, actionCell); body.append(row);
        });
        if (!users.length) body.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
        showMessage(`${users.length} cuenta${users.length === 1 ? '' : 's'} en el sistema.`);
      } catch (error) { showMessage(error.message); }
    }

    async function updateUser(id, changes) {
      try {
        const response = await fetch(`${api}/api/admin/users/${encodeURIComponent(id)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar la cuenta');
        showMessage('Cambios guardados.'); await loadUsers();
      } catch (error) { showMessage(error.message); await loadUsers(); }
    }

    loadUsers();