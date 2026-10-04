(() => {
  window.money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  window.toast = (message, type = 'success') => { const node = document.createElement('div'); node.className = `toast ${type === 'error' ? 'error' : ''}`; node.setAttribute('role', 'status'); node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 3600); };
  document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', async () => { try { await API.post('/auth/logout', {}); } finally { localStorage.removeItem('suscripetToken'); location.href = '/login.html'; } }));
  document.querySelectorAll('[data-menu-button]').forEach(button => button.addEventListener('click', () => { const menu = document.querySelector('[data-mobile-menu]'); const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); menu?.classList.toggle('hidden', expanded); menu?.classList.toggle('flex', !expanded); }));
  document.querySelectorAll('[data-year]').forEach(node => node.textContent = new Date().getFullYear());
})();
