(() => {
  const root = document.querySelector('[data-subscription-review]');
  if (!root) return;
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function load() {
    try {
      const subscriptions = await API.get('/admin/subscriptions/review');
      const pending = subscriptions.filter((sub) => sub.status === 'Pendiente');
      document.querySelector('[data-pending-count]').textContent = `${pending.length} pendiente${pending.length === 1 ? '' : 's'}`;
      root.innerHTML = pending.length ? `<table class="min-w-[850px] w-full text-left text-sm"><thead class="bg-ink text-white"><tr>${['Cliente','Correo','Mascota','Plan solicitado','Precio mensual','Solicitada','Acción'].map((title) => `<th class="p-3">${title}</th>`).join('')}</tr></thead><tbody>${pending.map((sub) => `<tr class="odd:bg-white even:bg-mint/50"><td class="border-b border-slate-100 p-3 font-semibold">${safe(sub.user?.name || 'Usuario')}</td><td class="border-b border-slate-100 p-3">${safe(sub.user?.email || '—')}</td><td class="border-b border-slate-100 p-3">${safe(sub.pet?.name || '—')}</td><td class="border-b border-slate-100 p-3">${safe(sub.plan?.name || 'Plan')}</td><td class="border-b border-slate-100 p-3">${money(sub.price)}</td><td class="border-b border-slate-100 p-3">${new Date(sub.createdAt).toLocaleDateString('es-CO')}</td><td class="border-b border-slate-100 p-3"><button class="btn-primary whitespace-nowrap" type="button" data-approve-subscription="${safe(sub._id)}">Aprobar y activar</button></td></tr>`).join('')}</tbody></table>` : '<div class="rounded-xl bg-mint p-5 text-sm text-ink">No hay solicitudes pendientes. Cuando un cliente compre un plan, aparecerá aquí para revisión.</div>';
    } catch (error) {
      root.innerHTML = `<p role="alert">${safe(error.message)}</p>`;
      document.querySelector('[data-pending-count]').textContent = 'No disponible';
    }
  }
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-approve-subscription]');
    if (!button) return;
    button.disabled = true;
    try {
      await API.patch(`/admin/subscriptions/${button.dataset.approveSubscription}/approve`, {});
      toast('Suscripción aprobada. El cliente ya tiene acceso a sus beneficios.');
      await load();
      if (typeof loadAdmin === 'function') await loadAdmin();
    } catch (error) { toast(error.message, 'error'); button.disabled = false; }
  });
  load();
  setInterval(() => { if (!document.hidden) load(); }, 8000);
})();
