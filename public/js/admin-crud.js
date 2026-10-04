(() => {
  const labels = {
    users: "usuario", pets: "mascota", plans: "plan", products: "producto",
    subscriptions: "suscripción", promotions: "promoción", services: "servicio",
    costs: "costo", orders: "pedido", notifications: "notificación"
  };
  const schemas = {
    users: [["name","Nombre","text"],["email","Correo","email"],["phone","Teléfono","text"],["role","Rol","select",["user","admin"]]],
    pets: [["user","Usuario propietario","relation","users"],["name","Nombre","text"],["species","Especie","select",["Perro","Gato","Otro"]],["breed","Raza","text"],["age","Edad","number"],["size","Tamaño","select",["Pequeño","Mediano","Grande"]],["weight","Peso (kg)","number"],["needs","Necesidades, separadas por coma","array"],["notes","Información adicional","textarea"],["photo","URL de foto","url"]],
    plans: [["name","Nombre","text"],["slug","Slug","text"],["description","Descripción","textarea"],["price","Precio mensual COP","number"],["benefits","Beneficios, uno por línea","lines"],["featured","Destacado","checkbox"],["active","Activo","checkbox"],["color","Color","text"]],
    products: [["name","Nombre","text"],["description","Descripción","textarea"],["price","Precio COP","number"],["category","Categoría","select",["Snacks","Juguetes","Higiene","Accesorios","Otros"]],["stock","Stock","number"],["active","Activo","checkbox"],["planBenefits","Planes que pueden comprar este producto","relations","plans"]],
    subscriptions: [["user","Usuario","relation","users"],["pet","Mascota","relation","pets"],["plan","Plan","relation","plans"],["status","Estado","select",["Activa","Pendiente","Cancelada","Expirada"]],["price","Precio COP","number"],["startedAt","Fecha de inicio","date"],["nextRenewal","Próxima renovación","date"],["history","Historial (JSON)","json"]],
    promotions: [["title","Título","text"],["description","Descripción","textarea"],["code","Código","text"],["discount","Descuento %","number"],["startsAt","Válida desde","date"],["endsAt","Válida hasta","date"],["active","Activa","checkbox"]],
    services: [["name","Nombre","text"],["description","Descripción","textarea"],["category","Categoría","select",["SPA","Guardería","Entrega","Otros"]],["price","Precio COP","number"],["active","Activo","checkbox"]],
    costs: [["name","Concepto","text"],["amount","Valor COP","number"],["kind","Tipo","select",["fixed","variable","initial"]],["unit","Unidad","select",["monthly","subscription","once"]]],
    orders: [["status","Estado","select",["Pendiente","Pagada","Enviada","Cancelada"]]],
    notifications: [["user","Usuario destino (vacío para todos)","relation","users"],["title","Título","text"],["message","Mensaje","textarea"],["read","Leída","checkbox"]]
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
  const resource = document.body.dataset.resource;
  if ((!resource || !schemas[resource]) && !document.querySelector("[data-admin-overview]")) return;

  const table = document.querySelector("[data-admin-table]");
  const adminHome = document.querySelector("[data-admin-overview]");
  let rows = [];
  let editingId = null;
  let observer;

  function ensureDialog() {
    if (document.querySelector("[data-crud-dialog]")) return;
    document.body.insertAdjacentHTML("beforeend", '<dialog class="w-[min(94vw,760px)] max-h-[90vh] overflow-y-auto rounded-3xl p-0 shadow-soft backdrop:bg-ink/40" data-crud-dialog><form class="surface border-0 p-7" data-crud-form><div class="flex items-start justify-between gap-4"><div><span class="eyebrow">Administración</span><h2 class="mt-2 text-2xl font-extrabold" data-crud-title></h2></div><button class="rounded-full bg-sand px-3 py-1" type="button" data-crud-close aria-label="Cerrar">✕</button></div><div class="mt-6 grid gap-4 sm:grid-cols-2" data-crud-fields></div><div class="mt-6 flex justify-end gap-3"><button class="btn-secondary" type="button" data-crud-close>Cancelar</button><button class="btn-primary" type="submit">Guardar cambios</button></div></form></dialog>');
    const dialog = document.querySelector("[data-crud-dialog]");
    dialog.querySelectorAll("[data-crud-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
    dialog.querySelector("[data-crud-form]").addEventListener("submit", save);
  }

  function fieldMarkup([name, label, type, options], value, relatedRows = []) {
    if (type === "checkbox") { const checked = value === undefined ? name === "active" : Boolean(value); return '<label class="flex items-center gap-3 rounded-xl bg-sand p-3 text-sm font-semibold"><input class="size-4 accent-leaf" type="checkbox" name="' + name + '"' + (checked ? " checked" : "") + '> ' + label + '</label>'; }
    if (type === "select") return '<label class="block text-sm font-bold">' + label + '<select class="field mt-2" name="' + name + '">' + options.map(option => '<option value="' + esc(option) + '"' + (String(value ?? "") === option ? " selected" : "") + '>' + esc(option) + '</option>').join("") + '</select></label>';
    if (type === "relation" || type === "relations") {
      const selectedIds = (Array.isArray(value) ? value : value ? [value] : []).map(item => String(typeof item === "object" ? item._id : item));
      const multiple = type === "relations";
      const optionsHTML = relatedRows.map(item => {
        const id = String(item._id);
        const labelText = item.name ? `${item.name}${item.email ? ` · ${item.email}` : ""}` : item.title || item.slug || id;
        return `<option value="${esc(id)}"${selectedIds.includes(id) ? " selected" : ""}>${esc(labelText)}</option>`;
      }).join("");
      const optional = name === "user" && resource === "notifications";
      return '<label class="block text-sm font-bold">' + label + '<select class="field mt-2" name="' + name + '"' + (multiple ? ' multiple size="5"' : '') + (optional ? '' : ' required') + '>' + (optional ? '<option value="">Todos los usuarios</option>' : '') + optionsHTML + '</select>' + (multiple ? '<span class="mt-1 block text-xs font-normal text-slate-500">Puedes seleccionar varios planes con Ctrl o Cmd.</span>' : '') + '</label>';
    }
    let shown = value ?? "";
    if (type === "array") shown = Array.isArray(value) ? value.map(item => typeof item === "object" ? item._id : item).join(", ") : value;
    if (type === "lines") shown = Array.isArray(value) ? value.join("\n") : value;
    if (type === "json") shown = value ? JSON.stringify(value, null, 2) : "";
    if (type === "date" && value) shown = new Date(value).toISOString().slice(0, 16);
    const required = ["name","email","price","amount","total","password"].includes(name) ? " required" : "";
    const isTextarea = ["array","lines","json","textarea"].includes(type);
    const control = isTextarea
      ? '<textarea class="field mt-2 min-h-24" name="' + name + '"' + required + '>' + esc(shown) + '</textarea>'
      : '<input class="field mt-2" type="' + (type === "date" ? "datetime-local" : type) + '" name="' + name + '" value="' + esc(shown) + '"' + (type === "number" ? ' min="0" step="any"' : "") + required + '>';
    return '<label class="block text-sm font-bold">' + label + control + '</label>';
  }

  async function openEditor(row) {
    ensureDialog();
    editingId = row?._id || null;
    const dialog = document.querySelector("[data-crud-dialog]");
    dialog.querySelector("[data-crud-title]").textContent = (row ? "Editar " : "Crear ") + labels[resource];
    let definitions = schemas[resource];
    if (resource === "users") definitions = definitions.concat(row ? [] : [["password","Contraseña inicial","password"]]);
    const relations = await Promise.all(definitions.map(async def => {
      if (!["relation", "relations"].includes(def[2])) return [];
      return API.get(`/admin/${def[3]}`);
    }));
    dialog.querySelector("[data-crud-fields]").innerHTML = definitions.map((def, index) => fieldMarkup(def, row?.[def[0]], relations[index])).join("");
    if (!row && resource === "subscriptions") {
      const status = dialog.querySelector('[name="status"]'); if (status) status.value = "Pendiente";
    }
    dialog.showModal();
  }

  function payloadFrom(form) {
    const data = {};
    for (const [name, , type] of schemas[resource].concat(resource === "users" && !editingId ? [["password","Contraseña","password"]] : [])) {
      const control = form.elements.namedItem(name); if (!control) continue;
      if (type === "checkbox") data[name] = control.checked;
      else if (type === "number") { if (control.value !== "") data[name] = Number(control.value); else if (editingId) data[name] = null; }
      else if (type === "relations") data[name] = [...control.selectedOptions].map(option => option.value);
      else if (type === "relation") { if (control.value) data[name] = control.value; else if (editingId) data[name] = null; }
      else if (type === "array") data[name] = control.value.split(",").map(item => item.trim()).filter(Boolean);
      else if (type === "lines") data[name] = control.value.split("\n").map(item => item.trim()).filter(Boolean);
      else if (type === "json") { try { data[name] = control.value.trim() ? JSON.parse(control.value) : []; } catch { throw new Error("Ingresa JSON válido en ese campo."); } }
      else if (type === "date") data[name] = control.value ? new Date(control.value).toISOString() : null;
      else if (control.value.trim() !== "") data[name] = control.value.trim();
      else if (editingId) data[name] = ["user","pet","plan"].includes(name) ? null : "";
    }
    return data;
  }

  async function save(event) {
    event.preventDefault();
    try {
      const data = payloadFrom(event.currentTarget);
      const path = "/admin/" + resource + (editingId ? "/" + editingId : "");
      if (editingId) await API.patch(path, data); else await API.post(path, data);
      document.querySelector("[data-crud-dialog]").close();
      toast(editingId ? "Cambios guardados." : "Registro creado.");
      document.querySelector("[data-crud-form]").reset();
      if (typeof loadAdmin === "function") await loadAdmin();
      await loadTable();
    } catch (error) { toast(error.message, "error"); }
  }

  function installControls() {
    if (!table) return;
    if (!table.previousElementSibling?.matches("[data-crud-toolbar]")) {
      const description = resource === "orders" ? "Revisa las compras registradas por los clientes y actualiza su estado." : "Crea, revisa y edita los registros de " + labels[resource] + ".";
      const createButton = resource === "orders" ? "" : '<button class="btn-primary" type="button" data-crud-create>Crear ' + labels[resource] + '</button>';
      table.insertAdjacentHTML("beforebegin", '<div class="mb-4 flex flex-wrap items-center justify-between gap-3" data-crud-toolbar><p class="text-sm text-slate-500">' + description + '</p>' + createButton + '</div>');
    }
    table.querySelectorAll("tbody tr").forEach(row => {
      const deleteButton = row.querySelector("[data-delete]");
      if (!deleteButton || row.querySelector("[data-crud-edit]")) return;
      const button = document.createElement("button");
      button.type = "button"; button.className = "mr-3 font-bold text-leaf"; button.textContent = "Editar";
      button.dataset.crudEdit = deleteButton.dataset.delete;
      deleteButton.before(button);
    });
  }

  async function loadTable() {
    if (!table) return;
    try { rows = await API.get("/admin/" + resource); installControls(); }
    catch (error) { toast(error.message, "error"); }
  }
  window.refreshAdminCrud = loadTable;

  if (table) {
    observer = new MutationObserver(() => installControls());
    observer.observe(table, { childList: true, subtree: true });
    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-crud-edit]");
      if (edit) { event.preventDefault(); event.stopImmediatePropagation(); openEditor(rows.find(row => String(row._id) === edit.dataset.crudEdit)); return; }
      if (event.target.closest("[data-crud-create]")) openEditor(null);
      const remove = event.target.closest("[data-delete]");
      if (remove) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) {
          API.delete("/admin/" + resource + "/" + remove.dataset.delete)
            .then(async () => { toast("Registro eliminado."); if (typeof loadAdmin === "function") await loadAdmin(); await loadTable(); })
            .catch(error => toast(error.message, "error"));
        }
      }
    }, true);
    loadTable();
  }

})();
