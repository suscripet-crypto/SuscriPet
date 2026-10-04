(() => {
  if (!location.pathname.startsWith('/admin/')) return;
  const links = [
    ['Resumen', '/admin/index.html'], ['Usuarios', '/admin/usuarios.html'], ['Mascotas', '/admin/mascotas.html'],
    ['Planes', '/admin/planes.html'], ['Suscripciones', '/admin/suscripciones.html'], ['Productos', '/admin/productos.html'],
    ['Inventario', '/admin/inventario.html'], ['Servicios', '/admin/servicios.html'], ['Promociones', '/admin/promociones.html'],
    ['Pedidos', '/admin/pedidos.html'], ['Costos', '/admin/costos.html'], ['Notificaciones', '/admin/notificaciones.html'],
    ['Configuración', '/admin/configuracion.html'],
  ];
  const current = location.pathname;
  let sidebar = document.querySelector('[data-admin-sidebar]');
  if (sidebar) {
    sidebar.querySelectorAll('nav a').forEach((a) => {
      const active = a.getAttribute('href') === current;
      a.classList.toggle('bg-mint', active);
      a.classList.toggle('text-leaf', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });
    return;
  }
  const main = document.querySelector('main');
  if (!main) return;
  sidebar = document.createElement('aside');
  sidebar.dataset.adminSidebar = '';
  sidebar.className = 'border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-6';
  sidebar.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3"><a href="/admin/index.html" class="text-xl font-black text-ink">🐾 SuscriPet</a><span class="text-xs font-bold uppercase tracking-widest text-leaf">Administración</span></div><nav class="mt-5 flex max-h-36 flex-wrap gap-1 overflow-y-auto text-sm font-semibold md:max-h-[calc(100vh-150px)] md:flex-col md:flex-nowrap md:overflow-y-auto">${links.map(([label, href]) => `<a class="rounded-xl px-3 py-2 hover:bg-sand ${href === current ? 'bg-mint text-leaf' : ''}" href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav><button class="mt-4 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-sand" type="button" data-logout>Cerrar sesión</button>`;
  const layout = document.createElement('div');
  layout.className = 'min-h-screen md:grid md:grid-cols-[245px_minmax(0,1fr)]';
  const content = document.createElement('div');
  content.className = 'min-w-0';
  main.classList.remove('container-wide');
  main.classList.add('mx-auto', 'w-full', 'max-w-[1550px]', 'px-5', 'py-8', 'md:px-10');
  document.body.insertBefore(layout, main);
  layout.append(sidebar, content);
  content.append(main);
})();
