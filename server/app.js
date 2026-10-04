require("dotenv").config();
require("express-async-errors");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDatabase = require("./config/database");
const api = require("./routes");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));
app.use("/api", api);
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    extensions: ["html"],
  }),
);
app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "SuscriPet" }),
);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
connectDatabase()
  .then(() =>
    app.listen(port, () =>
      console.log(`SuscriPet disponible en http://localhost:${port}`),
    ),
  )
  .catch((error) => {
    console.error("No fue posible iniciar la aplicación:", error.message);
    process.exit(1);
  });
