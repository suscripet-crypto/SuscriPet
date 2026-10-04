async function loadSubscriptions() {
  const card = document.querySelector('[data-subscription-card]');
  const historyNodes = [...document.querySelectorAll('[data-sub-history]')];
  const ordersNode = document.querySelector('[data-order-history]');
  try {
    const [subscriptions, orders] = await Promise.all([API.get('/subscriptions/me'), ordersNode ? API.get('/orders') : Promise.resolve([])]);
    const sub = subscriptions[0];
    if (card) {
      if (!sub) { card.innerHTML = '<div class="py-5 text-center"><span class="text-5xl">🐾</span><h2 class="mt-4 text-2xl font-extrabold">Aún no tienes un plan</h2><p class="mt-2 text-slate-500">Elige el cuidado que mejor se ajusta a tu mascota.</p><a class="btn-primary mt-5" href="/planes.html">Ver planes →</a></div>'; }
      else {
        card.querySelector('[data-plan-name]').textContent = sub.plan?.name || 'Plan';
        card.querySelector('[data-status]').textContent = sub.status === 'Pendiente' ? 'En revisión' : sub.status;
        card.querySelector('[data-price]').textContent = `${money(sub.price)} / mes`;
        card.querySelector('[data-renewal]').textContent = sub.status === 'Pendiente' ? 'Tu solicitud está en revisión. Los beneficios aparecerán cuando administración la apruebe.' : sub.nextRenewal ? `Próxima renovación: ${new Date(sub.nextRenewal).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin fecha de renovación.';
        card.querySelector('[data-benefits]').innerHTML = sub.status === 'Activa' ? ((sub.plan?.benefits || []).map(item => `<li>✓ &nbsp;${escapeHTML(item)}</li>`).join('') || '<li>Consulta los beneficios con nuestro equipo.</li>') : '<li>Beneficios bloqueados hasta la aprobación de tu suscripción.</li>';
        const pet = card.parentElement.querySelector('[data-pet]'); pet.innerHTML = sub.pet ? `<div class="rounded-2xl bg-mint p-4"><span class="text-3xl">${sub.pet.species === 'Gato' ? '🐱' : '🐶'}</span><p class="mt-2 font-bold">${sub.pet.name}</p><p class="text-sm text-slate-500">${sub.pet.breed || sub.pet.species}</p></div>` : 'Sin mascota asociada';
        const cancel = card.querySelector('[data-cancel]'); if (['Activa', 'Pendiente'].includes(sub.status)) { cancel.hidden = false; cancel.addEventListener('click', async () => { if (!confirm('¿Cancelar esta suscripción?')) return; try { await API.post(`/subscriptions/${sub._id}/cancel`, {}); toast('Suscripción cancelada.'); loadSubscriptions(); } catch(e) { toast(e.message, 'error'); } }); }
        const change = document.createElement('div'); change.className = 'mt-5'; change.innerHTML = '<label class="mb-2 block text-sm font-bold" for="new-plan">Cambiar plan</label><div class="flex flex-wrap gap-2"><select class="field max-w-xs" id="new-plan"><option value="">Seleccionar plan</option></select><button class="btn-secondary" type="button" data-change-plan>Cambiar</button></div>';
        if (sub.status === 'Activa') { card.append(change); const plans = await API.get('/plans'); const select = change.querySelector('select'); select.innerHTML += plans.map(p => `<option value="${p._id}" ${p._id === sub.plan?._id ? 'disabled' : ''}>${p.name} · ${money(p.price)}</option>`).join(''); change.querySelector('[data-change-plan]').addEventListener('click', async () => { if (!select.value) return toast('Selecciona un plan.', 'error'); try { await API.patch(`/subscriptions/${sub._id}/plan`, { plan: select.value }); toast('Plan actualizado.'); loadSubscriptions(); } catch(e) { toast(e.message, 'error'); } }); }
      }
    }
    const history = subscriptions.flatMap(item => (item.history || []).map(entry => ({...entry, plan: item.plan?.name}))).sort((a,b) => new Date(b.date)-new Date(a.date));
    for (const node of historyNodes) node.innerHTML = history.length ? history.map(h => `<div class="flex gap-3 rounded-xl bg-sand p-4"><span class="mt-1 size-2 shrink-0 rounded-full bg-leaf"></span><div><p class="text-sm font-semibold">${h.detail || h.action}</p><p class="mt-1 text-xs text-slate-500">${new Date(h.date).toLocaleDateString('es-CO')} · ${h.plan || 'Suscripción'}</p></div></div>`).join('') : '<p class="text-sm text-slate-500">Todavía no hay actividad de suscripción.</p>';
    if (ordersNode) ordersNode.innerHTML = orders.length ? orders.map(o => `<div class="flex justify-between gap-3 rounded-xl bg-sand p-4"><div><p class="font-semibold">Pedido del ${new Date(o.createdAt).toLocaleDateString('es-CO')}</p><p class="mt-1 text-sm text-slate-600">${(o.items || []).map(item => `${escapeHTML(item.product?.name || 'Producto')} × ${item.quantity}`).join(', ')}</p><p class="mt-1 text-xs font-semibold text-leaf">${escapeHTML(o.status)}</p></div><strong>${money(o.total)}</strong></div>`).join('') : '<p class="text-sm text-slate-500">Aún no tienes pedidos.</p>';
  } catch(error) { for (const node of [...historyNodes, ...(ordersNode ? [ordersNode] : [])]) node.innerHTML = `<p role="alert">${error.message}</p>`; toast(error.message, 'error'); if (error.status === 401) location.href='/login.html'; }
}
loadSubscriptions();
