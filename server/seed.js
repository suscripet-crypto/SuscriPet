require("dotenv").config();
const connectDatabase = require("./config/database");
const mongoose = require("mongoose");
const {
  User,
  Plan,
  Product,
  Promotion,
  Service,
  Cost,
  Pet,
  Subscription,
} = require("./models");

async function seedData({ resetAdminPassword = true } = {}) {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@suscripet.co").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  let admin = await User.findOne({ email: adminEmail }).select("+password");
  if (!admin)
    admin = new User({
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });
  admin.name = "Administración SuscriPet";
  admin.role = "admin";
  if (resetAdminPassword) admin.password = adminPassword;
  await admin.save();
  const planData = [
    {
      name: "Básico",
      slug: "basico",
      description: "Lo esencial para cuidar cada día.",
      price: 39900,
      benefits: [
        "Snacks saludables",
        "Descuentos en productos",
        "Productos de higiene",
        "Acceso a promociones",
      ],
      color: "mint",
    },
    {
      name: "Premium",
      slug: "premium",
      description: "Más juego y bienestar para tu compañero.",
      price: 69900,
      benefits: [
        "Snacks saludables",
        "Descuentos en productos",
        "Productos de higiene",
        "Acceso a promociones",
        "Juguete mensual",
        "Descuentos en SPA",
        "Beneficios en guardería",
      ],
      featured: true,
      color: "leaf",
    },
    {
      name: "VIP",
      slug: "vip",
      description: "Una experiencia completa, todos los meses.",
      price: 89900,
      benefits: [
        "Juguete",
        "Snacks saludables",
        "Productos de higiene",
        "Accesorios",
        "Beneficios de SPA",
        "Beneficios de guardería",
        "Promociones especiales",
      ],
      color: "coral",
    },
  ];
  const plans = {};
  for (const data of planData)
    plans[data.slug] = await Plan.findOneAndUpdate(
      { slug: data.slug },
      { $set: data },
      { upsert: true, new: true },
    );
  const products = [
    [
      "Galletas de avena y pollo",
      "Snacks horneados con ingredientes seleccionados.",
      18900,
      "Snacks",
      24,
      "premium",
    ],
    [
      "Cuerda trenzada",
      "Juguete resistente para compartir y jugar.",
      25900,
      "Juguetes",
      12,
      "premium",
    ],
    [
      "Shampoo avena suave",
      "Limpieza delicada para piel sensible.",
      32900,
      "Higiene",
      9,
      "basico",
    ],
    [
      "Bandana bosque",
      "Accesorio cómodo para paseos especiales.",
      15900,
      "Accesorios",
      18,
      "vip",
    ],
  ];
  for (const [name, description, price, category, stock, slug] of products)
    await Product.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          description,
          price,
          category,
          stock,
          active: true,
          planBenefits: [plans[slug]._id],
        },
      },
      { upsert: true, new: true },
    );
  const promos = [
    ["Bienvenida peluda", "10% de descuento en tu primera caja.", "HOLA10", 10],
    [
      "Mes de spa",
      "Beneficio especial en servicios de bienestar.",
      "MIMO15",
      15,
    ],
  ];
  for (const [title, description, code, discount] of promos)
    await Promotion.findOneAndUpdate(
      { code },
      { $set: { title, description, code, discount, active: true } },
      { upsert: true },
    );
  const services = [
    ["SPA para mascotas", "Baño, cepillado y cuidado con cariño.", "SPA"],
    [
      "Guardería de día",
      "Un espacio seguro para jugar y socializar.",
      "Guardería",
    ],
    [
      "Entrega programada",
      "Tu caja mensual llega a la puerta de casa.",
      "Entrega",
    ],
  ];
  for (const [name, description, category] of services)
    await Service.findOneAndUpdate(
      { name },
      { $set: { name, description, category, active: true } },
      { upsert: true },
    );
  for (const [name, amount, kind] of [
    ["Internet y teléfono", 50000, "fixed"],
    ["Publicidad en redes", 100000, "fixed"],
    ["Hosting y mantenimiento", 50000, "fixed"],
    ["Transporte", 100000, "fixed"],
    ["Empaques y bolsas", 50000, "fixed"],
    ["Productos para planes", 300000, "variable"],
    ["Limpieza e higiene", 80000, "variable"],
    ["Inversión inicial", 680000, "initial"],
  ])
    await Cost.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          amount,
          kind,
          unit: kind === "initial" ? "once" : "monthly",
        },
      },
      { upsert: true },
    );
  const demoEmail = "cliente@suscripet.co";
  let user = await User.findOne({ email: demoEmail });
  if (!user)
    user = await User.create({
      name: "Valentina Ríos",
      email: demoEmail,
      password: "Cliente123!",
      phone: "3001234567",
    });
  let pet = await Pet.findOne({ user: user._id, name: "Luna" });
  if (!pet)
    pet = await Pet.create({
      user: user._id,
      name: "Luna",
      species: "Perro",
      breed: "Cocker spaniel",
      age: 3,
      size: "Mediano",
      weight: 12,
      needs: ["Piel sensible"],
    });
  if (!(await Subscription.exists({ user: user._id })))
    await Subscription.create({
      user: user._id,
      pet: pet._id,
      plan: plans.premium._id,
      status: "Activa",
      price: plans.premium.price,
      startedAt: new Date(),
      nextRenewal: new Date(Date.now() + 30 * 86400000),
      history: [
        {
          action: "activated",
          detail: "Suscripción activada con datos de prueba",
        },
      ],
    });
  return { adminEmail, demoEmail, plans: Object.keys(plans).length };
}

if (require.main === module) {
  (async () => {
    await connectDatabase();
    const result = await seedData();
    console.log(
      `Datos listos. Administrador actualizado: ${result.adminEmail}. Cuenta de cliente: ${result.demoEmail} / Cliente123!`,
    );
    await mongoose.disconnect();
  })().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = { seedData };
