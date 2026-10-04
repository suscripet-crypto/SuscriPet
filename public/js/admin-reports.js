(() => {
  const root = document.querySelector('[data-user-report]');
  if (!root) return;
  let report;
  const csvFields = {
    users: [['ID','id'],['Nombre','name'],['Correo','email'],['Teléfono','phone'],['Plan activo o solicitado','plan'],['Estado del plan','planStatus'],['Precio del plan COP','planPrice'],['Mascota','pet'],['Inicio del plan','planStartedAt'],['Próxima renovación','nextRenewal'],['Número de pedidos','orderCount'],['Total pedido COP','orderedTotal'],['Total pagado COP','paidTotal'],['Productos comprados','purchasedProducts']],
    orders: [['ID pedido','id'],['Nombre','name'],['Correo','email'],['Fecha','date'],['Estado','status'],['Productos y cantidades','products'],['Total COP','total']],
    subscriptions: [['Nombre','name'],['Correo','email'],['Plan','plan'],['Mascota','pet'],['Estado','status'],['Precio COP','price'],['Inicio','startedAt'],['Próxima renovación','nextRenewal']],
  };
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csvCell = (value) => {
    let text = value instanceof Date ? value.toLocaleString('es-CO') : String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function render() {
    const paid = report.users.reduce((sum, u) => sum + Number(u.paidTotal || 0), 0);
    document.querySelector('[data-report-summary]').innerHTML = [
      ['Clientes', report.users.length], ['Pedidos registrados', report.orders.length], ['Total pagado en pedidos', money(paid)],
    ].map(([label, value]) => `<article class="rounded-2xl bg-sand p-4"><p class="text-sm text-slate-500">${label}</p><p class="mt-2 text-xl font-black text-ink">${value}</p></article>`).join('');
    root.innerHTML = report.users.length ? `<table class="min-w-[1100px] w-full text-left text-sm"><thead class="bg-ink text-white"><tr>${['Cliente','Correo','Plan o solicitud','Mascota','Pedidos','Pagado','Compras recientes'].map((h) => `<th class="p-3 font-bold">${h}</th>`).join('')}</tr></thead><tbody>${report.users.map((u) => `<tr class="odd:bg-white even:bg-mint/50"><td class="border-b border-slate-100 p-3 font-semibold">${safe(u.name)}</td><td class="border-b border-slate-100 p-3">${safe(u.email)}</td><td class="border-b border-slate-100 p-3">${safe(u.plan)}<br><span class="text-xs text-slate-500">${safe(u.planStatus)}</span></td><td class="border-b border-slate-100 p-3">${safe(u.pet || '—')}</td><td class="border-b border-slate-100 p-3">${u.orderCount}</td><td class="border-b border-slate-100 p-3 font-semibold">${money(u.paidTotal)}</td><td class="max-w-[360px] border-b border-slate-100 p-3">${safe(u.purchasedProducts || 'Sin compras')}</td></tr>`).join('')}</tbody></table>` : '<p class="p-8 text-center text-slate-500">No hay usuarios registrados todavía.</p>';
  }
  async function load() {
    try { report = await API.get('/admin/reports/users'); render(); }
    catch (error) { root.innerHTML = `<p role="alert">${safe(error.message)}</p>`; }
  }
  document.addEventListener('click', async (event) => {
    const csv = event.target.closest('[data-export-csv]');
    const xlsx = event.target.closest('[data-export-xlsx]');
    if (!csv && !xlsx) return;
    const button = csv || xlsx; button.disabled = true;
    try {
      if (!report) report = await API.get('/admin/reports/users');
      const date = new Date().toISOString().slice(0,10);
      if (csv) {
        const kind = csv.dataset.exportCsv;
        const rows = kind === 'users' ? report.users : report[kind];
        const headers = csvFields[kind];
        const content = '\ufeff' + [headers.map(([label]) => csvCell(label)).join(','), ...rows.map((row) => headers.map(([, key]) => csvCell(row[key])).join(','))].join('\r\n');
        download(`suscripet-${kind}-${date}.csv`, content, 'text/csv;charset=utf-8');
      } else {
        const response = await fetch('/api/admin/reports/users.xlsx', { headers: API.token() ? { Authorization: `Bearer ${API.token()}` } : {}, credentials: 'same-origin' });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'No se pudo generar el Excel.'); }
        download(`suscripet-clientes-${date}.xlsx`, await response.blob(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
    } catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; }
  });
  load();
  setInterval(() => { if (!document.hidden) load(); }, 15000);
})();
