import express from "express";
import cors from "cors";
import { createServerApp } from "./server.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

createServerApp(app);

const port = process.env.PORT || 4000;

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception during startup:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection during startup:", error);
});

try {
  app.listen(port, () => {
    console.log(`API maternite disponible sur http://localhost:${port}`);
  });
} catch (error) {
  console.error("Server failed to start:", error);
  process.exit(1);
}
