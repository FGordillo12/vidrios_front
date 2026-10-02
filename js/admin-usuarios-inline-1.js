const api = typeof window.API_BASE === 'string' ? window.API_BASE : (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '');
    const body = document.getElementById('users-list');
    const message = document.getElementById('users-message');
    const roleDialog = document.getElementById('role-confirm');
    const roleDialogText = document.getElementById('role-confirm-text');
    const roleDialogAccept = document.getElementById('role-confirm-accept');
    let pendingRoleChange = null;
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
          const originalRole = user.role;
          const saveRole = document.createElement('button');
          saveRole.className = 'user-action save-role'; saveRole.type = 'button'; saveRole.textContent = 'Guardar cambios'; saveRole.disabled = true;
          role.addEventListener('change', () => {
            saveRole.disabled = role.value === originalRole;
            showMessage(role.value === originalRole ? 'No hay cambios de rol pendientes.' : `Cambio de rol pendiente para ${user.username}. Pulsa «Guardar cambios» para continuar.`);
          });
          saveRole.addEventListener('click', () => {
            if (role.value === originalRole) return;
            const previousLabel = role.options[role.selectedIndex].text;
            const oldLabel = [...role.options].find((option) => option.value === originalRole)?.text || originalRole;
            roleDialogText.textContent = `¿Confirmas cambiar el rol de ${user.username} de ${oldLabel} a ${previousLabel}? El acceso se actualizará de inmediato.`;
            pendingRoleChange = { id: user._id, role: role.value };
            roleDialog.showModal();
          });
          roleCell.append(role);
          const statusCell = document.createElement('td');
          const isPending = user.approvalStatus === 'pending';
          const status = document.createElement('span'); status.className = `user-status${isPending ? ' pending' : user.active ? '' : ' inactive'}`;
          status.textContent = isPending ? 'Pendiente de aprobación' : user.active ? 'Activo' : 'Desactivado'; statusCell.append(status);
          const actionCell = document.createElement('td');
          const action = document.createElement('button'); action.className = 'user-action'; action.type = 'button'; action.textContent = user.active ? 'Desactivar' : isPending ? 'Aprobar cuenta' : 'Activar';
          action.addEventListener('click', () => updateUser(user._id, { active: !user.active }));
          const actionGroup = document.createElement('div'); actionGroup.className = 'user-actions'; actionGroup.append(saveRole, action); actionCell.append(actionGroup);
          row.append(name, email, roleCell, statusCell, actionCell); body.append(row);
        });
        if (!users.length) body.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
        const pendingCount = users.filter((user) => user.approvalStatus === 'pending').length;
        showMessage(`${users.length} cuenta${users.length === 1 ? '' : 's'} en el sistema. ${pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de aprobación.` : ''}`);
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

    document.getElementById('role-confirm-cancel').addEventListener('click', () => {
      roleDialog.close();
      pendingRoleChange = null;
    });
    roleDialog.addEventListener('click', (event) => {
      if (event.target === roleDialog) { roleDialog.close(); pendingRoleChange = null; }
    });
    roleDialogAccept.addEventListener('click', async () => {
      if (!pendingRoleChange) return;
      roleDialogAccept.disabled = true;
      const succeeded = await updateUser(pendingRoleChange.id, { role: pendingRoleChange.role });
      roleDialogAccept.disabled = false;
      if (succeeded) {
        roleDialog.close();
        pendingRoleChange = null;
      }
    });

    loadUsers();
