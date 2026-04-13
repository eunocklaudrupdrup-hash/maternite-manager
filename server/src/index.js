import express from "express";
import cors from "cors";
import { createServerApp } from "./server.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

createServerApp(app);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API maternite disponible sur http://localhost:${port}`);
});
