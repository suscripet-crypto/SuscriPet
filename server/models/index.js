const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    resetToken: String,
    resetExpires: Date,
  },
  { timestamps: true },
);
userSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.checkPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const petSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    photo: String,
    species: {
      type: String,
      enum: ["Perro", "Gato", "Otro"],
      default: "Perro",
    },
    breed: String,
    age: { type: Number, min: 0, max: 50 },
    size: {
      type: String,
      enum: ["Pequeño", "Mediano", "Grande"],
      default: "Mediano",
    },
    weight: { type: Number, min: 0 },
    needs: [String],
    notes: String,
  },
  { timestamps: true },
);
const planSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    benefits: [String],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    color: String,
  },
  { timestamps: true },
);
const subscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pet: { type: Schema.Types.ObjectId, ref: "Pet", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["Activa", "Pendiente", "Cancelada", "Expirada"],
      default: "Pendiente",
    },
    price: { type: Number, required: true },
    startedAt: Date,
    nextRenewal: Date,
    history: [
      {
        action: String,
        detail: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["Snacks", "Juguetes", "Higiene", "Accesorios", "Otros"],
      required: true,
    },
    image: String,
    stock: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    planBenefits: [{ type: Schema.Types.ObjectId, ref: "Plan" }],
  },
  { timestamps: true },
);
const promotionSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    code: String,
    discount: { type: Number, min: 0, max: 100 },
    startsAt: Date,
    endsAt: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const serviceSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: String,
    price: Number,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const costSchema = new Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    kind: {
      type: String,
      enum: ["fixed", "variable", "initial"],
      default: "fixed",
    },
    unit: { type: String, default: "monthly" },
  },
  { timestamps: true },
);
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pendiente", "Pagada", "Enviada", "Cancelada"],
      default: "Pendiente",
    },
  },
  { timestamps: true },
);

module.exports = {
  User: mongoose.model("User", userSchema),
  Pet: mongoose.model("Pet", petSchema),
  Plan: mongoose.model("Plan", planSchema),
  Subscription: mongoose.model("Subscription", subscriptionSchema),
  Product: mongoose.model("Product", productSchema),
  Promotion: mongoose.model("Promotion", promotionSchema),
  Service: mongoose.model("Service", serviceSchema),
  Cost: mongoose.model("Cost", costSchema),
  Notification: mongoose.model("Notification", notificationSchema),
  Order: mongoose.model("Order", orderSchema),
};
