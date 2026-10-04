const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const {
  User,
  Pet,
  Plan,
  Subscription,
  Product,
  Promotion,
  Service,
  Cost,
  Order,
  Notification,
} = require("../models");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const signToken = (user) =>
  jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

router.post("/auth/register", loginLimit, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (
    !name?.trim() ||
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !password ||
    password.length < 8
  )
    return res
      .status(400)
      .json({
        message:
          "Ingresa nombre, correo válido y contraseña de al menos 8 caracteres.",
      });
  const user = await User.create({ name, email, password, phone });
  const token = signToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
  });
  res.status(201).json({ user: publicUser(user), token });
});
router.post("/auth/login", loginLimit, async (req, res) => {
  const user = await User.findOne({
    email: String(req.body.email || "").toLowerCase(),
  }).select("+password");
  if (!user || !(await user.checkPassword(req.body.password || "")))
    return res
      .status(401)
      .json({ message: "Correo o contraseña incorrectos." });
  const token = signToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
  });
  res.json({ user: publicUser(user), token });
});
router.post("/auth/logout", (req, res) =>
  res
    .clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    .json({ message: "Sesión cerrada." }),
);
router.get("/auth/me", protect, async (req, res) =>
  res.json({ user: publicUser(await User.findById(req.user.id)) }),
);
router.get("/plans", async (req, res) =>
  res.json(await Plan.find({ active: true }).sort("price")),
);
router.get("/products", async (req, res) =>
  res.json(
    await Product.find({ active: true }).populate("planBenefits", "name slug"),
  ),
);
router.get("/promotions", async (req, res) =>
  res.json(
    await Promotion.find({
      active: true,
      $or: [{ endsAt: null }, { endsAt: { $gte: new Date() } }],
    }),
  ),
);
router.get("/services", async (req, res) =>
  res.json(await Service.find({ active: true })),
);

router.use(protect);
router.get("/users/me", async (req, res) =>
  res.json(publicUser(await User.findById(req.user.id))),
);
router.patch("/users/me", async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true },
  );
  res.json(publicUser(user));
});
router.patch("/users/me/password", async (req, res) => {
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.checkPassword(req.body.currentPassword || "")))
    return res
      .status(400)
      .json({ message: "La contraseña actual no coincide." });
  if (!req.body.password || req.body.password.length < 8)
    return res
      .status(400)
      .json({
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
  user.password = req.body.password;
  await user.save();
  res.json({ message: "Contraseña actualizada." });
});
router.get("/pets", async (req, res) =>
  res.json(await Pet.find({ user: req.user.id }).sort("-createdAt")),
);
router.post("/pets", async (req, res) => {
  const data = { ...req.body, user: req.user.id };
  if (typeof data.needs === "string")
    data.needs = data.needs
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  const pet = await Pet.create(data);
  res.status(201).json(pet);
});
router.patch("/pets/:id", async (req, res) => {
  const pet = await Pet.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { new: true, runValidators: true },
  );
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada." });
  res.json(pet);
});
router.delete("/pets/:id", async (req, res) => {
  const pet = await Pet.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada." });
  res.json({ message: "Mascota eliminada." });
});

router.get("/subscriptions/me", async (req, res) =>
  res.json(
    await Subscription.find({ user: req.user.id })
      .populate("plan")
      .populate("pet")
      .sort("-createdAt"),
  ),
);
router.post("/subscriptions", async (req, res) => {
  const [plan, pet] = await Promise.all([
    Plan.findOne({ _id: req.body.plan, active: true }),
    Pet.findOne({ _id: req.body.pet, user: req.user.id }),
  ]);
  if (!plan) return res.status(404).json({ message: "Plan no disponible." });
  if (!pet)
    return res
      .status(400)
      .json({ message: "Selecciona una mascota de tu cuenta." });
  const active = await Subscription.findOne({
    user: req.user.id,
    status: { $in: ["Activa", "Pendiente"] },
  });
  const startedAt = new Date();
  const nextRenewal = new Date(startedAt);
  nextRenewal.setDate(nextRenewal.getDate() + 30);
  if (active) {
    if (active.status === "Pendiente") {
      active.plan = plan._id;
      active.pet = pet._id;
      active.price = plan.price;
      active.status = "Pendiente";
      active.startedAt = null;
      active.nextRenewal = null;
      active.history.push({
        action: "purchase_requested",
        detail: `Solicitud del plan ${plan.name} enviada para revisión del administrador`,
      });
      await active.save();
      return res.status(200).json(await active.populate(["plan", "pet"]));
    }
    return res
      .status(409)
      .json({ message: "Ya tienes una suscripción activa. Puedes cambiarla desde Mi suscripción." });
  }
  const sub = await Subscription.create({
    user: req.user.id,
    pet: pet._id,
    plan: plan._id,
    price: plan.price,
    status: "Pendiente",
    startedAt: null,
    nextRenewal: null,
    history: [
      {
        action: "purchase_requested",
        detail: `Solicitud del plan ${plan.name} enviada para revisión del administrador`,
      },
    ],
  });
  res.status(201).json(await sub.populate(["plan", "pet"]));
});
router.patch("/subscriptions/:id/plan", async (req, res) => {
  const sub = await Subscription.findOne({
    _id: req.params.id,
    user: req.user.id,
    status: "Activa",
  });
  const plan = await Plan.findOne({ _id: req.body.plan, active: true });
  if (!sub || !plan)
    return res
      .status(404)
      .json({ message: "Suscripción activa o plan no encontrado." });
  const previous = sub.price;
  sub.plan = plan._id;
  sub.price = plan.price;
  sub.history.push({
    action: "plan_changed",
    detail: `Cambio de $${previous} a ${plan.name} ($${plan.price})`,
  });
  await sub.save();
  res.json(await sub.populate(["plan", "pet"]));
});
router.post("/subscriptions/:id/cancel", async (req, res) => {
  const sub = await Subscription.findOne({
    _id: req.params.id,
    user: req.user.id,
    status: { $in: ["Activa", "Pendiente"] },
  });
  if (!sub)
    return res.status(404).json({ message: "Suscripción no encontrada." });
  sub.status = "Cancelada";
  sub.history.push({ action: "cancelled", detail: "Cancelada por el usuario" });
  await sub.save();
  res.json(sub);
});
router.get("/orders", async (req, res) =>
  res.json(
    await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort("-createdAt"),
  ),
);
router.post("/orders", async (req, res) => {
  if (!Array.isArray(req.body.items) || !req.body.items.length)
    return res.status(400).json({ message: "Agrega al menos un producto." });
  const activeSubscription = await Subscription.findOne({
    user: req.user.id,
    status: "Activa",
  }).populate("plan", "name");
  const items = [];
  for (const row of req.body.items) {
    const product = await Product.findOne({ _id: row.product, active: true }).populate("planBenefits", "name");
    const quantity = Number(row.quantity);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      product.stock < quantity
    )
      return res
        .status(400)
        .json({ message: "Producto inválido o inventario insuficiente." });
    const eligiblePlans = product.planBenefits || [];
    if (eligiblePlans.length && (!activeSubscription || !eligiblePlans.some((plan) => String(plan._id) === String(activeSubscription.plan?._id))))
      return res.status(403).json({ message: activeSubscription
        ? `Este producto requiere uno de estos planes: ${eligiblePlans.map((plan) => plan.name).join(", ")}.`
        : "Necesitas una suscripción activa para comprar este producto." });
    items.push({ product: product._id, quantity, price: product.price });
  }
  for (const item of items)
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: -item.quantity } },
    );
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  res.status(201).json(await Order.create({ user: req.user.id, items, total }));
});

router.use("/admin", adminOnly);
router.patch("/admin/subscriptions/:id/approve", async (req, res) => {
  const sub = await Subscription.findById(req.params.id).populate("plan", "name");
  if (!sub) return res.status(404).json({ message: "Suscripción no encontrada." });
  if (sub.status !== "Pendiente") return res.status(409).json({ message: "Solo se pueden aprobar suscripciones pendientes." });
  const startedAt = new Date();
  const nextRenewal = new Date(startedAt);
  nextRenewal.setDate(nextRenewal.getDate() + 30);
  sub.status = "Activa";
  sub.startedAt = startedAt;
  sub.nextRenewal = nextRenewal;
  sub.history.push({ action: "approved", detail: `Suscripción ${sub.plan?.name || ""} aprobada por administración` });
  await sub.save();
  res.json(await sub.populate(["user", "plan", "pet"]));
});
async function buildCustomerReport() {
  const [users, subscriptions, orders] = await Promise.all([
    User.find({ role: "user" }).select("name email phone createdAt").sort("name"),
    Subscription.find().populate("user", "name email").populate("plan", "name price").populate("pet", "name").sort("-createdAt"),
    Order.find().populate("user", "name email").populate("items.product", "name category").sort("-createdAt"),
  ]);
  const detail = (order) => (order.items || []).map((item) => `${item.product?.name || "Producto eliminado"} × ${item.quantity}`).join(", ");
  return {
    users: users.map((user) => {
      const userSubs = subscriptions.filter((sub) => String(sub.user?._id) === String(user._id));
      const userOrders = orders.filter((order) => String(order.user?._id) === String(user._id));
      const activeSub = userSubs.find((sub) => sub.status === "Activa") || userSubs.find((sub) => sub.status === "Pendiente");
      const orderedTotal = userOrders.filter((order) => order.status !== "Cancelada").reduce((sum, order) => sum + (order.total || 0), 0);
      const paidTotal = userOrders.filter((order) => ["Pagada", "Enviada"].includes(order.status)).reduce((sum, order) => sum + (order.total || 0), 0);
      return {
        id: String(user._id), name: user.name, email: user.email, phone: user.phone || "",
        registeredAt: user.createdAt, plan: activeSub?.plan?.name || "Sin plan activo", planStatus: activeSub?.status === "Pendiente" ? "En revisión" : activeSub?.status || "Sin suscripción activa",
        planPrice: activeSub?.price ?? "", pet: activeSub?.pet?.name || "", planStartedAt: activeSub?.startedAt || "", nextRenewal: activeSub?.nextRenewal || "",
        orderCount: userOrders.length, orderedTotal, paidTotal,
        purchasedProducts: userOrders.filter((order) => order.status !== "Cancelada").map((order) => `${new Date(order.createdAt).toLocaleDateString("es-CO")} · ${detail(order)} · ${order.status}`).join(" | "),
        orders: userOrders.map((order) => ({ id: String(order._id), date: order.createdAt, status: order.status, products: detail(order), total: order.total })),
        subscriptions: userSubs.map((sub) => ({ plan: sub.plan?.name || "Plan eliminado", price: sub.price, status: sub.status, pet: sub.pet?.name || "", startedAt: sub.startedAt, nextRenewal: sub.nextRenewal })),
      };
    }),
    orders: orders.map((order) => ({ id: String(order._id), name: order.user?.name || "Usuario eliminado", email: order.user?.email || "", date: order.createdAt, status: order.status, products: detail(order), total: order.total })),
    subscriptions: subscriptions.map((sub) => ({ name: sub.user?.name || "Usuario eliminado", email: sub.user?.email || "", plan: sub.plan?.name || "Plan eliminado", pet: sub.pet?.name || "", status: sub.status, price: sub.price, startedAt: sub.startedAt, nextRenewal: sub.nextRenewal })),
  };
}
router.get("/admin/reports/users", async (_req, res) => res.json(await buildCustomerReport()));
router.get("/admin/subscriptions/review", async (_req, res) =>
  res.json(await Subscription.find().populate("user", "name email").populate("plan", "name price").populate("pet", "name").sort("-createdAt")),
);
router.get("/admin/activity", async (_req, res) => {
  const [subscriptions, orders] = await Promise.all([
    Subscription.find().populate("user", "name email").populate("plan", "name").sort("-updatedAt").limit(12),
    Order.find().populate("user", "name email").populate("items.product", "name").sort("-createdAt").limit(12),
  ]);
  const events = [
    ...subscriptions.map((sub) => ({ id: `subscription-${sub._id}`, kind: "Suscripción", customer: sub.user?.name || sub.user?.email || "Usuario", detail: `${sub.plan?.name || "Plan eliminado"} · ${sub.status === "Pendiente" ? "En revisión" : sub.status}`, status: sub.status, amount: sub.price, date: sub.updatedAt || sub.createdAt })),
    ...orders.map((order) => ({ id: `order-${order._id}`, kind: "Compra de tienda", customer: order.user?.name || order.user?.email || "Usuario", detail: (order.items || []).map((item) => `${item.product?.name || "Producto eliminado"} × ${item.quantity}`).join(", "), status: order.status, amount: order.total, date: order.createdAt })),
  ];
  res.json(events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15));
});
router.get("/admin/reports/users.xlsx", async (_req, res) => {
  const ExcelJS = require("exceljs");
  const report = await buildCustomerReport();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SuscriPet";
  workbook.created = new Date();
  const sheets = [
    { name: "Resumen de usuarios", title: "SuscriPet · Resumen de clientes", note: "Planes activos o pendientes y actividad de compra por cliente", headers: ["ID", "Nombre", "Correo", "Teléfono", "Plan actual o solicitado", "Estado de plan", "Precio plan (COP)", "Mascota", "Inicio plan", "Próxima renovación", "Pedidos", "Total pedido (COP)", "Total pagado (COP)", "Compras y productos"], rows: report.users.map((u) => [u.id,u.name,u.email,u.phone,u.plan,u.planStatus,u.planPrice,u.pet,u.planStartedAt,u.nextRenewal,u.orderCount,u.orderedTotal,u.paidTotal,u.purchasedProducts]) },
    { name: "Pedidos", title: "SuscriPet · Detalle de pedidos", note: "Un renglón por pedido; los valores son los registrados en el sistema", headers: ["Pedido", "Fecha", "Nombre", "Correo", "Estado", "Productos y cantidades", "Total (COP)"], rows: report.orders.map((o) => [o.id,o.date,o.name,o.email,o.status,o.products,o.total]) },
    { name: "Suscripciones", title: "SuscriPet · Historial de suscripciones", note: "Una fila por suscripción registrada", headers: ["Nombre", "Correo", "Plan", "Mascota", "Estado", "Precio (COP)", "Inicio", "Próxima renovación"], rows: report.subscriptions.map((s) => [s.name,s.email,s.plan,s.pet,s.status,s.price,s.startedAt,s.nextRenewal]) },
  ];
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name, { views: [{ state: "frozen", ySplit: 3 }] });
    sheet.mergeCells(1, 1, 1, spec.headers.length);
    sheet.getCell(1, 1).value = spec.title;
    sheet.getCell(1, 1).font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF183B35" } };
    sheet.getCell(1, 1).alignment = { vertical: "middle" };
    sheet.getRow(1).height = 32;
    sheet.mergeCells(2, 1, 2, spec.headers.length);
    sheet.getCell(2, 1).value = `${spec.note} · Generado ${new Date().toLocaleString("es-CO")}`;
    sheet.getCell(2, 1).font = { italic: true, color: { argb: "FF52665F" }, size: 10 };
    sheet.getRow(3).values = spec.headers;
    sheet.getRow(3).height = 30;
    sheet.getRow(3).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF287A65" } }; cell.alignment = { vertical: "middle", wrapText: true }; });
    for (const values of spec.rows) sheet.addRow(values);
    const widths = spec.headers.map((h, i) => Math.min(42, Math.max(15, h.length + 3, ...spec.rows.slice(0, 150).map((r) => String(r[i] ?? "").length > 42 ? 42 : String(r[i] ?? "").length + 2))));
    widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    const currencyColumns = spec.headers.map((h, i) => /\(COP\)/.test(h) ? i + 1 : null).filter(Boolean);
    for (let rowIndex = 4; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = { bottom: { style: "hair", color: { argb: "FFD9E5DF" } } };
        cell.alignment = { vertical: "middle", wrapText: colNumber === spec.headers.length };
        if (rowIndex % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F7F3" } };
      });
      currencyColumns.forEach((col) => { row.getCell(col).numFmt = '"$"#,##0;[Red]("$"#,##0);–'; });
    }
    if (sheet.rowCount >= 3) sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: sheet.rowCount, column: spec.headers.length } };
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="suscripet-clientes-${new Date().toISOString().slice(0,10)}.xlsx"`);
  res.send(Buffer.from(buffer));
});
router.get("/admin/overview", async (req, res) => {
  const [users, pets, activeSubs, products, revenue, plans, costs, lowStock] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Pet.countDocuments(),
      Subscription.countDocuments({ status: "Activa" }),
      Product.countDocuments({ active: true }),
      Subscription.aggregate([
        { $match: { status: "Activa" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      Subscription.aggregate([
        { $match: { status: "Activa" } },
        { $group: { _id: "$plan", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "plans",
            localField: "_id",
            foreignField: "_id",
            as: "plan",
          },
        },
      ]),
      Cost.find(),
      Product.countDocuments({ stock: { $lte: 5 }, active: true }),
    ]);
  const fixed = costs
    .filter((c) => c.kind === "fixed")
    .reduce((s, c) => s + c.amount, 0);
  const variable = costs
    .filter((c) => c.kind === "variable")
    .reduce((s, c) => s + c.amount, 0);
  res.json({
    users,
    pets,
    activeSubs,
    products,
    revenue: revenue[0]?.total || 0,
    popularPlan: plans[0]?.plan[0]?.name || null,
    lowStock,
    costs,
    breakEven:
      variable && activeSubs
        ? Math.ceil(
            fixed /
              Math.max(1, (revenue[0]?.total || 0) / activeSubs - variable),
          )
        : null,
  });
});
for (const [path, Model] of [
  ["users", User],
  ["pets", Pet],
  ["plans", Plan],
  ["products", Product],
  ["subscriptions", Subscription],
  ["promotions", Promotion],
  ["services", Service],
  ["costs", Cost],
  ["orders", Order],
  ["notifications", Notification],
]) {
  router.get(`/admin/${path}`, async (req, res) => {
    let query = Model.find().sort("-createdAt");
    if (Model === Pet) query = query.populate("user", "name email");
    if (Model === Subscription) query = query.populate("user", "name email").populate("plan", "name price").populate("pet", "name");
    if (Model === Product) query = query.populate("planBenefits", "name");
    if (Model === Order) query = query.populate("user", "name email").populate("items.product", "name category");
    if (Model === Notification) query = query.populate("user", "name email");
    res.json(await query);
  });
  router.post(`/admin/${path}`, async (req, res) => {
    const item = await Model.create(req.body);
    res.status(201).json(Model === User ? publicUser(item) : item);
  });
  router.patch(`/admin/${path}/:id`, async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item)
      return res.status(404).json({ message: "Registro no encontrado." });
    res.json(item);
  });
  router.delete(`/admin/${path}/:id`, async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item)
      return res.status(404).json({ message: "Registro no encontrado." });
    res.json({ message: "Registro eliminado." });
  });
}
module.exports = router;
