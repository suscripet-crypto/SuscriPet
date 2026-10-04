const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI no está configurada");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(process.env.MONGODB_URI);

  console.log(`MongoDB conectado: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
