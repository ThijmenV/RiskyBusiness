function escapeHtml(value) { const el=document.createElement("span"); el.textContent=value; return el.innerHTML; }

      const authView = document.getElementById('auth-view');
      const appView = document.getElementById('app-view');
      const welcomeTitle = document.getElementById('welcome-title');
      const userEmailEl = document.getElementById('user-email');
      const groupsList = document.getElementById('groups-list');

      async function api(path, options = {}) {
        const response = await fetch(path, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      }

      async function loadSession() {
        try {
          const data = await api('/api/auth/me');
          showApp(data.user);
        } catch (error) {
          showAuth();
        }
      }

      function showAuth() {
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
      }

      function showApp(user) {
        authView.classList.add('hidden');
        appView.classList.remove('hidden');
        welcomeTitle.textContent = `Welcome, ${user.username}`;
        userEmailEl.textContent = user.email;
        loadGroups();
      }

      async function loadGroups() {
        try {
          const data = await api('/api/groups');
          groupsList.innerHTML = '';
          if (!data.groups || data.groups.length === 0) {
            groupsList.innerHTML = '<div class="item">No groups yet. Create one or join an invite code.</div>';
            return;
          }
          data.groups.forEach((group) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
              <strong>${escapeHtml(group.name)}</strong><br />
              Code: ${group.code}<br />
              <span class="muted">Members: ${group.member_count}</span><br />
              <a href="/groups/${group.id}/play" style="display:inline-block;margin-top:8px;color:#f59e0b;">Open game</a>
            `;
            groupsList.appendChild(item);
          });
        } catch (error) {
          alert(error.message);
        }
      }

      document.getElementById('signup-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
          form.reset();
          await loadSession();
        } catch (error) {
          alert(error.message);
        }
      });

      document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
          form.reset();
          await loadSession();
        } catch (error) {
          alert(error.message);
        }
      });

      document.getElementById('group-create-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          const data = await api('/api/groups', { method: 'POST', body: JSON.stringify(payload) });
          alert(`Group created. Share code ${data.group.code}`);
          form.reset();
          await loadGroups();
        } catch (error) {
          alert(error.message);
        }
      });

      document.getElementById('group-join-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          await api('/api/groups/join', { method: 'POST', body: JSON.stringify(payload) });
          alert('Joined group');
          form.reset();
          await loadGroups();
        } catch (error) {
          alert(error.message);
        }
      });

      document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
          await api('/api/auth/logout', { method: 'POST' });
          showAuth();
        } catch (error) {
          alert(error.message);
        }
      });

      loadSession();
