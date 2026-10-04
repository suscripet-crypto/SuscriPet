async function loadProducts() {
  const target = document.querySelector('[data-products]');
  if (!target) return;
  try {
    const products = await API.get('/products');
    let planId = null;
    try {
      await API.get('/auth/me');
      const subscriptions = await API.get('/subscriptions/me');
      const active = subscriptions.find((sub) => sub.status === 'Activa');
      planId = active?.plan?._id || active?.plan || null;
      const status = document.querySelector('[data-shop-plan]');
      if (status) status.textContent = active ? `Tu plan activo: ${active.plan.name}` : 'Activa una suscripción para acceder a los productos reservados.';
    } catch {
      const status = document.querySelector('[data-shop-plan]');
      if (status) status.textContent = 'Inicia sesión y activa una suscripción para comprar productos reservados por plan.';
    }
    target.innerHTML = products.length ? products.map((p) => {
      const allowedPlans = p.planBenefits || [];
      const eligible = !allowedPlans.length || allowedPlans.some((plan) => String(plan._id || plan) === String(planId));
      const planNames = allowedPlans.map((plan) => plan.name).filter(Boolean).join(', ');
      const canBuy = eligible && p.stock > 0;
      const restriction = allowedPlans.length ? (eligible ? `Disponible para tu plan${planNames ? `: ${escapeHTML(planNames)}` : ''}` : `Requiere: ${escapeHTML(planNames || 'un plan específico')}`) : 'Disponible para todos';
      return `<article class="surface overflow-hidden"><div class="grid h-36 place-items-center bg-mint text-5xl">${({ Snacks:'🥨',Juguetes:'🧸',Higiene:'🫧',Accesorios:'🎀' })[p.category] || '🐾'}</div><div class="p-5"><span class="eyebrow">${escapeHTML(p.category)}</span><h2 class="mt-2 font-bold">${escapeHTML(p.name)}</h2><p class="mt-2 min-h-10 text-sm text-slate-500">${escapeHTML(p.description || '')}</p><p class="mt-3 text-xs font-semibold ${eligible ? 'text-leaf' : 'text-coral'}">${restriction}</p><div class="mt-5 flex items-center justify-between"><strong>${money(p.price)}</strong><span class="text-xs text-slate-500">${p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}</span></div><button class="btn-primary mt-4 w-full" type="button" data-buy-product="${escapeHTML(p._id)}" ${canBuy ? '' : 'disabled'}>${canBuy ? 'Comprar ahora' : eligible ? 'Sin inventario' : 'No disponible para tu plan'}</button></div></article>`;
    }).join('') : '<p class="text-slate-500">Estamos preparando el catálogo.</p>';
    target.onclick = async (event) => {
      const button = event.target.closest('[data-buy-product]');
      if (!button) return;
      if (!API.token()) { location.href = '/login.html?next=' + encodeURIComponent('/productos.html'); return; }
      if (!confirm('¿Confirmas el pedido? Se registrará en tu cuenta y el pago quedará pendiente de coordinación.')) return;
      button.disabled = true;
      try {
        await API.post('/orders', { items: [{ product: button.dataset.buyProduct, quantity: 1 }] });
        toast('Pedido registrado. Puedes consultar su estado en tu historial.');
        await loadProducts();
      } catch (error) { toast(error.message, 'error'); button.disabled = false; }
    };
  } catch (e) { target.innerHTML = `<p role="alert">${escapeHTML(e.message)}</p>`; }
}
loadProducts();
