async function loadPlans() {
  const target = document.querySelector('[data-plans]'); if (!target) return;
  target.setAttribute('aria-busy', 'true');
  try {
    const plans = await API.get('/plans');
    if (!plans.length) { target.innerHTML = '<p class="text-slate-500">Pronto tendremos planes disponibles.</p>'; return; }
    target.innerHTML = plans.map(plan => `<article class="surface flex flex-col p-7 ${plan.featured ? 'ring-2 ring-leaf' : ''}"><div class="flex items-center justify-between"><span class="eyebrow">Plan ${escapeHTML(plan.name)}</span>${plan.featured ? '<span class="rounded-full bg-mint px-3 py-1 text-xs font-bold text-leaf">Más elegido</span>' : ''}</div><h2 class="mt-5 text-3xl font-extrabold">${money(plan.price)}<span class="text-sm font-medium text-slate-500"> / mes</span></h2><p class="mt-3 min-h-12 text-slate-600">${escapeHTML(plan.description || '')}</p><ul class="my-6 flex-1 space-y-3">${plan.benefits.map(item => `<li class="flex gap-2 text-sm text-slate-700"><span class="text-leaf">✓</span>${escapeHTML(item)}</li>`).join('')}</ul><button class="btn-primary w-full" type="button" data-select-plan="${escapeHTML(plan._id)}">Elegir ${escapeHTML(plan.name)}</button></article>`).join('');
    target.addEventListener('click', async event => {
      const button = event.target.closest('[data-select-plan]'); if (!button) return;
      const planId = button.dataset.selectPlan;
      if (!API.token()) { localStorage.setItem('suscripetPendingPlan', planId); location.href = '/login.html'; return; }
      try {
        const pets = await API.get('/pets');
        if (!pets.length) { localStorage.setItem('suscripetPendingPlan', planId); location.href = '/mascotas.html'; return; }
        const select = document.querySelector('[data-plan-pet]');
        select.innerHTML = pets.map(pet => `<option value="${escapeHTML(pet._id)}">${escapeHTML(pet.name)} · ${escapeHTML(pet.species)}</option>`).join('');
        const dialog = document.querySelector('[data-plan-dialog]'); dialog.dataset.plan = planId; dialog.showModal();
      } catch (error) { toast(error.message, 'error'); if (error.status === 401) { localStorage.removeItem('suscripetToken'); location.href = '/login.html'; } }
    });
  } catch (error) { target.innerHTML = `<p class="text-red-700">${escapeHTML(error.message)}</p>`; }
  finally { target.removeAttribute('aria-busy'); }
}
loadPlans();
document.querySelector('[data-confirm-plan]')?.addEventListener('click', async event => {
  const dialog = document.querySelector('[data-plan-dialog]'); const pet = document.querySelector('[data-plan-pet]').value;
  const button = event.currentTarget; button.disabled = true;
  try { await API.post('/subscriptions', { plan: dialog.dataset.plan, pet }); localStorage.removeItem('suscripetPendingPlan'); location.href = '/mi-suscripcion.html'; }
  catch (error) { toast(error.message, 'error'); if (error.status === 409) location.href = '/mi-suscripcion.html'; }
  finally { button.disabled = false; }
});
