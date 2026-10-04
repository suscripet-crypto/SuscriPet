const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token =
      req.cookies?.token ||
      (header.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token)
      return res.status(401).json({ message: "Inicia sesión para continuar." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select("_id name email role");
    if (!req.user)
      return res.status(401).json({ message: "La sesión ya no es válida." });
    next();
  } catch {
    res.status(401).json({ message: "La sesión expiró o no es válida." });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin")
    return res
      .status(403)
      .json({ message: "Acceso exclusivo para administración." });
  next();
}
module.exports = { protect, adminOnly };
