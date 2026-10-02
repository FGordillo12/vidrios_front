const api = typeof window.API_BASE === 'string' ? window.API_BASE : (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '');
    const body = document.getElementById('users-list');
    const message = document.getElementById('users-message');
    const roleDialog = document.getElementById('role-confirm');
    const roleDialogText = document.getElementById('role-confirm-text');
    const roleDialogAccept = document.getElementById('role-confirm-accept');
    const saveRolesButton = document.getElementById('save-role-changes');
    const pendingRoleChanges = new Map();
    const showMessage = (text) => { message.textContent = text; };
    const roleLabel = (role) => role === 'admin' ? 'Administrador' : 'Usuario';

    function refreshRoleSaveButton() {
      const count = pendingRoleChanges.size;
      saveRolesButton.disabled = count === 0;
      saveRolesButton.textContent = count ? `Guardar cambios (${count})` : 'Guardar cambios';
    }

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
          const pendingChange = pendingRoleChanges.get(user._id);
          role.value = pendingChange?.role || user.role;
          const originalRole = user.role;
          role.addEventListener('change', () => {
            if (role.value === originalRole) pendingRoleChanges.delete(user._id);
            else pendingRoleChanges.set(user._id, { id: user._id, username: user.username, originalRole, role: role.value });
            refreshRoleSaveButton();
            showMessage(pendingRoleChanges.size ? `${pendingRoleChanges.size} cambio${pendingRoleChanges.size === 1 ? '' : 's'} de rol pendiente${pendingRoleChanges.size === 1 ? '' : 's'}.` : 'No hay cambios de rol pendientes.');
          });
          roleCell.append(role);
          const statusCell = document.createElement('td');
          const isPending = user.approvalStatus === 'pending';
          const status = document.createElement('span'); status.className = `user-status${isPending ? ' pending' : user.active ? '' : ' inactive'}`;
          status.textContent = isPending ? 'Pendiente de aprobación' : user.active ? 'Activo' : 'Desactivado'; statusCell.append(status);
          const actionCell = document.createElement('td');
          const action = document.createElement('button'); action.className = 'user-action'; action.type = 'button'; action.textContent = user.active ? 'Desactivar' : isPending ? 'Aprobar cuenta' : 'Activar';
          action.addEventListener('click', () => updateUser(user._id, { active: !user.active }));
          const actionGroup = document.createElement('div'); actionGroup.className = 'user-actions'; actionGroup.append(action); actionCell.append(actionGroup);
          row.append(name, email, roleCell, statusCell, actionCell); body.append(row);
        });
        if (!users.length) body.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
        const pendingCount = users.filter((user) => user.approvalStatus === 'pending').length;
        showMessage(`${users.length} cuenta${users.length === 1 ? '' : 's'} en el sistema. ${pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de aprobación.` : ''}`);
        refreshRoleSaveButton();
      } catch (error) { showMessage(error.message); }
    }

    async function updateUser(id, changes) {
      try {
        const response = await fetch(`${api}/api/admin/users/${encodeURIComponent(id)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar la cuenta');
        await loadUsers();
        showMessage('Cambios guardados.');
        return true;
      } catch (error) {
        await loadUsers();
        showMessage(error.message);
        return false;
      }
    }

    document.getElementById('role-confirm-cancel').addEventListener('click', () => roleDialog.close());
    roleDialog.addEventListener('click', (event) => {
      if (event.target === roleDialog) roleDialog.close();
    });
    saveRolesButton.addEventListener('click', () => {
      if (!pendingRoleChanges.size) return;
      const changes = [...pendingRoleChanges.values()];
      const summary = changes.map((change) => `• ${change.username}: ${roleLabel(change.originalRole)} → ${roleLabel(change.role)}`).join('\n');
      roleDialogText.textContent = `¿Confirmas guardar estos ${changes.length} cambio${changes.length === 1 ? '' : 's'} de rol?\n\n${summary}`;
      roleDialog.showModal();
    });
    roleDialogAccept.addEventListener('click', async () => {
      const changes = [...pendingRoleChanges.values()];
      if (!changes.length) return;
      roleDialogAccept.disabled = true;
      saveRolesButton.disabled = true;
      const outcomes = await Promise.all(changes.map(async (change) => {
        try {
          const response = await fetch(`${api}/api/admin/users/${encodeURIComponent(change.id)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: change.role })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el rol');
          pendingRoleChanges.delete(change.id);
          return { username: change.username, error: null };
        } catch (error) { return { username: change.username, error: error.message }; }
      }));
      await loadUsers();
      roleDialogAccept.disabled = false;
      roleDialog.close();
      const failed = outcomes.filter((outcome) => outcome.error);
      showMessage(failed.length
        ? `Se guardaron ${outcomes.length - failed.length} cambio(s). No se pudieron guardar: ${failed.map((outcome) => outcome.username).join(', ')}. Los fallidos siguen pendientes.`
        : `Se guardaron ${outcomes.length} cambio${outcomes.length === 1 ? '' : 's'} de rol.`);
    });

    loadUsers();
