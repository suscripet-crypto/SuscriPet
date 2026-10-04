function notFound(req, res) {
  res
    .status(404)
    .json({ message: `No existe la ruta ${req.method} ${req.path}` });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status =
    err.name === "ValidationError" || err.name === "CastError"
      ? 400
      : err.code === 11000
        ? 409
        : err.status || 500;
  const message =
    err.code === 11000
      ? "Ya existe un registro con esos datos."
      : err.message || "Error interno del servidor.";
  if (status === 500) console.error(err);
  res.status(status).json({ message });
}
module.exports = { notFound, errorHandler };
