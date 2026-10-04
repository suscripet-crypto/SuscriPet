const labels = { users: 'Usuarios', pets: 'Mascotas', plans: 'Planes', products: 'Productos', subscriptions: 'Suscripciones', promotions: 'Promociones', services: 'Servicios', costs: 'Costos', orders: 'Pedidos', notifications: 'Notificaciones' };
async function loadAdmin() {
  const overview = document.querySelector('[data-admin-overview]');
  const table = document.querySelector('[data-admin-table]');
  const resource = document.body.dataset.resource;
  if (overview) {
    try {
      const d = await API.get('/admin/overview');
      const cards = [['Usuarios', d.users], ['Suscripciones activas', d.activeSubs], ['Ingresos mensuales estimados', money(d.revenue)], ['Productos activos', d.products], ['Stock bajo', d.lowStock], ['Plan más elegido', d.popularPlan || '—'], ['Costos mensuales', money(d.costs.filter(c => c.kind !== 'initial').reduce((s, c) => s + c.amount, 0))], ['Punto de equilibrio', d.breakEven ? `${d.breakEven} suscripciones` : 'Configura costos']];
      overview.innerHTML = cards.map(([name, value]) => `<article class="surface p-5"><p class="text-sm text-slate-500">${name}</p><p class="mt-3 text-2xl font-black">${value}</p></article>`).join('');
    } catch (error) { overview.innerHTML = `<p role="alert">${escapeHTML(error.message)}</p>`; }
  }
  if (!table || !resource) return;
  try {
    const rows = await API.get(`/admin/${resource}`);
    const columns = resource === 'users' ? ['name', 'email', 'role']
      : resource === 'pets' ? ['user', 'name', 'species', 'breed', 'size']
      : resource === 'plans' ? ['name', 'price', 'active']
      : resource === 'products' ? ['name', 'category', 'price', 'stock', 'planBenefits', 'active']
      : resource === 'subscriptions' ? ['user', 'pet', 'plan', 'status', 'price', 'createdAt']
      : resource === 'orders' ? ['user', 'items', 'total', 'status', 'createdAt']
      : resource === 'costs' ? ['name', 'amount', 'kind', 'unit']
      : resource === 'notifications' ? ['title', 'message', 'user', 'read']
      : ['title', 'name', 'code', 'active'];
    const valueFor = (row, key) => {
      const value = row[key];
      if (value == null || value === '') return '—';
      if (key === 'createdAt' || key === 'startedAt' || key === 'nextRenewal') return new Date(value).toLocaleString('es-CO');
      if (key === 'price' || key === 'amount' || key === 'total') return money(value);
      if (key === 'active' || key === 'read') return value ? 'Sí' : 'No';
      if (key === 'user' || key === 'pet' || key === 'plan') return value.name || value.email || '—';
      if (key === 'planBenefits') return value.map(plan => plan.name || 'Plan').join(', ') || 'Todos los planes';
      if (key === 'items') return value.map(item => `${item.product?.name || 'Producto'} × ${item.quantity}`).join(', ');
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    };
    table.innerHTML = rows.length ? `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr>${columns.map(key => `<th class="border-b p-3 font-bold text-slate-500">${escapeHTML(key)}</th>`).join('')}<th class="border-b p-3">Acciones</th></tr></thead><tbody>${rows.map(row => `<tr>${columns.map(key => `<td class="border-b border-slate-100 p-3">${escapeHTML(valueFor(row, key))}</td>`).join('')}<td class="border-b border-slate-100 p-3"><button class="text-red-700" data-delete="${escapeHTML(row._id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="p-12 text-center text-slate-500">No hay registros todavía.</div>';
  } catch (error) { table.innerHTML = `<p role="alert">${escapeHTML(error.message)}</p>`; }
}
window.loadAdmin = loadAdmin;
const createForm = document.querySelector('[data-admin-create]');
if (createForm) createForm.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(createForm));
  for (const key of ['price', 'stock', 'amount', 'discount']) if (data[key] !== undefined && data[key] !== '') data[key] = Number(data[key]);
  if (data.benefits) data.benefits = data.benefits.split('\n').map(value => value.trim()).filter(Boolean);
  try { await API.post(`/admin/${document.body.dataset.resource}`, data); toast('Registro creado.'); createForm.reset(); await loadAdmin(); }
  catch (error) { toast(error.message, 'error'); }
});
loadAdmin();
setInterval(async () => { if (!document.hidden && !document.querySelector('[data-crud-dialog][open]')) { await loadAdmin(); if (window.refreshAdminCrud) await window.refreshAdminCrud(); } }, 8000);
