document.addEventListener('DOMContentLoaded', function() {
  const adminPanel = document.getElementById('admin-panel');
  if (!adminPanel) {
    console.log('Not on admin page, skipping admin functions');
    return;
  }

  const userList = document.getElementById('userList');
  const userManagementError = document.getElementById('userManagementError');

  function fetchUsers() {
    fetch('/api/users')
      .then(response => response.json())
      .then(users => {
        userList.innerHTML = '';
        users.forEach(user => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
              <select class="form-select role-select" data-user-id="${user._id}">
                <option value="creator" ${user.role === 'creator' ? 'selected' : ''}>Creator</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>
              <button class="btn btn-danger btn-sm delete-user" data-user-id="${user._id}">Delete</button>
            </td>
          `;
          userList.appendChild(row);
        });

        document.querySelectorAll('.role-select').forEach(select => {
          select.addEventListener('change', function() {
            const userId = this.getAttribute('data-user-id');
            const newRole = this.value;
            updateUserRole(userId, newRole);
          });
        });

        document.querySelectorAll('.delete-user').forEach(button => {
          button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            deleteUser(userId);
          });
        });
      })
      .catch(error => {
        console.error('Error fetching users:', error);
        userManagementError.textContent = 'Error fetching users. Please try again.';
      });
  }

  function updateUserRole(userId, newRole) {
    fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: newRole }),
    })
    .then(response => response.json())
    .then(data => {
      console.log('User role updated:', data);
      fetchUsers(); // Refresh the user list
    })
    .catch(error => {
      console.error('Error updating user role:', error);
      userManagementError.textContent = 'Error updating user role. Please try again.';
    });
  }

  function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
      fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      .then(response => response.json())
      .then(data => {
        console.log('User deleted:', data);
        fetchUsers(); // Refresh the user list
      })
      .catch(error => {
        console.error('Error deleting user:', error);
        userManagementError.textContent = 'Error deleting user. Please try again.';
      });
    }
  }

  fetchUsers();
});