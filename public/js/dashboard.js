async function loadDashboard() {
  const root = document.querySelector('[data-dashboard]'); if (!root) return;
  try { const [user, pets, subs] = await Promise.all([API.get('/auth/me'), API.get('/pets'), API.get('/subscriptions/me')]);
    root.querySelector('[data-user-name]').textContent = user.user.name.split(' ')[0];
    root.querySelector('[data-pet-count]').textContent = pets.length;
    const current = subs.find(item => ['Activa', 'Pendiente'].includes(item.status));
    root.querySelector('[data-plan-name]').textContent = current?.plan?.name || 'Sin plan';
    root.querySelector('[data-sub-status]').textContent = current?.status || 'Invitado';
    root.querySelector('[data-plan-price]').textContent = current ? money(current.price) : 'Elige tu plan';
    root.querySelector('[data-renewal]').textContent = current?.nextRenewal ? new Date(current.nextRenewal).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'Cuando actives tu plan';
    const petArea = root.querySelector('[data-pets]'); petArea.innerHTML = pets.length ? pets.map(pet => `<article class="rounded-2xl bg-sand p-5"><span class="text-3xl">${pet.species === 'Gato' ? '🐱' : '🐶'}</span><h3 class="mt-3 font-bold">${escapeHTML(pet.name)}</h3><p class="text-sm text-slate-500">${escapeHTML(pet.breed || pet.species)} · ${escapeHTML(pet.size || 'Tamaño por definir')}</p></article>`).join('') : '<div class="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-600">Aún no registras mascotas. <a class="font-bold text-leaf" href="/mascotas.html">Agregar la primera →</a></div>';
    const promoTarget = root.querySelector('[data-promotions]'); const promos = await API.get('/promotions'); promoTarget.innerHTML = promos.length ? promos.map(p => `<article class="rounded-2xl bg-mint p-5"><span class="text-xs font-bold uppercase tracking-widest text-leaf">${escapeHTML(p.code || 'Beneficio')}</span><h3 class="mt-2 font-bold">${escapeHTML(p.title)}</h3><p class="mt-1 text-sm text-slate-600">${escapeHTML(p.description || '')}</p></article>`).join('') : '<p class="text-sm text-slate-500">Nuevas promociones aparecerán aquí.</p>';
  } catch (error) { toast(error.message, 'error'); if (error.status === 401) location.href = '/login.html'; }
}
loadDashboard();
