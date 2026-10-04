document.querySelectorAll('[data-auth-form]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault(); const button = form.querySelector('[type="submit"]'); const original = button.textContent; button.disabled = true; button.textContent = 'Un momento…';
  try {
    const data = await API.post(form.dataset.authForm, Object.fromEntries(new FormData(form)));
    if (data.token) localStorage.setItem('suscripetToken', data.token);
    const plan = new URLSearchParams(location.search).get('plan');
    if (plan) localStorage.setItem('suscripetPendingPlan', plan);
    if (data.user?.role === 'admin') { location.href = '/admin/index.html'; return; }
    const pendingPlan = localStorage.getItem('suscripetPendingPlan');
    if (pendingPlan && form.dataset.authForm === '/auth/login') {
      const pets = await API.get('/pets');
      if (!pets.length) { location.href = '/mascotas.html'; return; }
      await API.post('/subscriptions', { plan: pendingPlan, pet: pets[0]._id });
      localStorage.removeItem('suscripetPendingPlan'); location.href = '/mi-suscripcion.html'; return;
    }
    location.href = pendingPlan ? '/mascotas.html' : '/dashboard.html';
  }
  catch (error) { if (error.status === 409 && localStorage.getItem('suscripetPendingPlan')) { location.href = '/mi-suscripcion.html'; return; } toast(error.message, 'error'); } finally { button.disabled = false; button.textContent = original; }
}));
