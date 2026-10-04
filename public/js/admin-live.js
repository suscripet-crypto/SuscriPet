(() => {
  const root = document.querySelector('[data-admin-activity]');
  if (!root) return;
  let loading = false;
  async function refresh() {
    if (loading || document.hidden) return;
    loading = true;
    try {
      const events = await API.get('/admin/activity');
      root.innerHTML = events.length ? events.map((item) => `<article class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"><div><span class="rounded-full bg-mint px-2 py-1 text-xs font-bold text-leaf">${escapeHTML(item.kind)}</span><p class="mt-2 font-bold">${escapeHTML(item.customer)}</p><p class="text-sm text-slate-500">${escapeHTML(item.detail || 'Sin detalle')}</p></div><div class="text-right"><p class="font-bold">${money(item.amount)}</p><p class="text-xs text-slate-500">${new Date(item.date).toLocaleString('es-CO')}</p></div></article>`).join('') : '<p class="rounded-xl bg-sand p-4 text-sm text-slate-500">Todavía no hay compras ni solicitudes.</p>';
    } catch (error) { root.innerHTML = `<p role="alert">${escapeHTML(error.message)}</p>`; }
    finally { loading = false; }
  }
  refresh();
  setInterval(refresh, 5000);
})();
