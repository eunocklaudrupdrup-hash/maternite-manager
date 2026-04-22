import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createToken, parseToken } from "./auth.js";
import { makeId, nowIso, readDb, writeDb } from "./data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "../../web");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(webDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "NumRapidePro" });
});

app.post("/api/auth/request-code", (req, res) => {
  const { phone, fullName, mode } = req.body ?? {};
  const db = readDb();
  const normalizedPhone = String(phone || "").trim();
  const normalizedMode = mode === "signup" ? "signup" : "login";
  const existing = db.users.find((item) => item.phone === normalizedPhone);

  if (!normalizedPhone.startsWith("+")) {
    return res.status(400).json({ message: "Numero invalide." });
  }

  if (normalizedMode === "login" && !existing) {
    return res.status(404).json({ message: "Aucun compte pour ce numero." });
  }

  if (normalizedMode === "signup" && existing) {
    return res.status(409).json({ message: "Ce numero existe deja." });
  }

  if (normalizedMode === "signup" && !String(fullName || "").trim()) {
    return res.status(400).json({ message: "Le nom complet est obligatoire." });
  }

  const otp = {
    id: makeId("otp"),
    phone: normalizedPhone,
    fullName: String(fullName || "").trim(),
    mode: normalizedMode,
    code: String(Math.floor(100000 + Math.random() * 900000)),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdAt: nowIso()
  };

  db.otpCodes = db.otpCodes.filter((item) => item.phone !== normalizedPhone);
  db.otpCodes.unshift(otp);
  writeDb(db);

  res.status(201).json({
    message: "Code OTP genere en mode demo.",
    debugCode: otp.code,
    expiresAt: otp.expiresAt
  });
});

app.post("/api/auth/verify-code", (req, res) => {
  const { phone, code } = req.body ?? {};
  const db = readDb();
  const otp = db.otpCodes.find((item) => item.phone === phone && item.code === String(code || "").trim());

  if (!otp) {
    return res.status(400).json({ message: "Code invalide." });
  }

  if (new Date(otp.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: "Code expire." });
  }

  let user = db.users.find((item) => item.phone === phone);
  if (!user && otp.mode === "signup") {
    user = {
      id: makeId("usr"),
      fullName: otp.fullName,
      phone: otp.phone,
      role: "user",
      balance: 0,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    db.users.unshift(user);
  }

  db.otpCodes = db.otpCodes.filter((item) => item.id !== otp.id);
  writeDb(db);

  res.json({
    token: createToken({ id: user.id, phone: user.phone, fullName: user.fullName, role: user.role }),
    user
  });
});

app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/health") || req.path.startsWith("/auth/")) {
    return next();
  }

  const session = parseToken(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ message: "Session invalide." });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === session.id);
  if (!user) {
    return res.status(401).json({ message: "Utilisateur introuvable." });
  }

  req.db = db;
  req.user = user;
  next();
});

app.get("/api/bootstrap", (req, res) => {
  const { settings, users, deposits, purchases } = req.db;
  const userDeposits = deposits.filter((item) => item.userId === req.user.id);
  const userPurchases = purchases.filter((item) => item.userId === req.user.id);
  const adminData = req.user.role === "admin"
    ? buildAdminData(req.db, req.query)
    : null;

  res.json({
    appName: settings.appName,
    currency: settings.currency,
    providerMode: settings.providerMode,
    paymentMethods: settings.paymentMethods,
    countries: settings.countries,
    currentUser: req.user,
    userData: {
      deposits: userDeposits,
      purchases: userPurchases
    },
    adminData,
    safeNotice: "Aucun code externe n'est recupere depuis un site tiers dans cette application."
  });
});

app.post("/api/deposits", (req, res) => {
  const { method, amount, reference } = req.body ?? {};
  const numericAmount = Number(amount || 0);

  if (!req.db.settings.paymentMethods.includes(method)) {
    return res.status(400).json({ message: "Methode non supportee." });
  }

  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: "Montant invalide." });
  }

  const deposit = {
    id: makeId("dep"),
    userId: req.user.id,
    userName: req.user.fullName,
    userPhone: req.user.phone,
    method,
    amount: numericAmount,
    reference: String(reference || "").trim(),
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  req.db.deposits.unshift(deposit);
  writeDb(req.db);
  res.status(201).json(deposit);
});

app.post("/api/purchases", (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Action reservee aux clients." });
  }

  const country = req.db.settings.countries.find((item) => item.code === String(req.body?.countryCode || "").toUpperCase());
  if (!country || !country.active) {
    return res.status(400).json({ message: "Pays indisponible." });
  }

  if (country.available <= 0) {
    return res.status(400).json({ message: "Aucun numero disponible pour ce pays." });
  }

  if (Number(req.user.balance || 0) < Number(country.price || 0)) {
    return res.status(400).json({ message: "Solde insuffisant. Faites un depot avant achat." });
  }

  req.user.balance = Number(req.user.balance || 0) - Number(country.price || 0);
  req.user.updatedAt = nowIso();
  country.available -= 1;

  const purchase = {
    id: makeId("pur"),
    userId: req.user.id,
    userPhone: req.user.phone,
    countryCode: country.code,
    countryName: country.name,
    phoneNumber: makeDemoNumber(country.dialCode),
    amount: country.price,
    activationCode: String(Math.floor(100000 + Math.random() * 900000)),
    createdAt: nowIso()
  };

  req.db.purchases.unshift(purchase);
  writeDb(req.db);
  res.status(201).json(purchase);
});

app.get("/api/admin/overview", (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acces admin requis." });
  }

  res.json(buildAdminData(req.db, req.query));
});

app.patch("/api/admin/countries/:code", (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acces admin requis." });
  }

  const country = req.db.settings.countries.find((item) => item.code === String(req.params.code || "").toUpperCase());
  if (!country) {
    return res.status(404).json({ message: "Pays introuvable." });
  }

  country.price = Number(req.body?.price ?? country.price);
  country.available = Number(req.body?.available ?? country.available);
  country.active = Boolean(req.body?.active);
  writeDb(req.db);
  res.json(country);
});

app.post("/api/admin/deposits/:id/approve", (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acces admin requis." });
  }

  const deposit = req.db.deposits.find((item) => item.id === req.params.id);
  if (!deposit) {
    return res.status(404).json({ message: "Depot introuvable." });
  }

  if (deposit.status !== "pending") {
    return res.status(400).json({ message: "Depot deja traite." });
  }

  const user = req.db.users.find((item) => item.id === deposit.userId);
  if (!user) {
    return res.status(404).json({ message: "Utilisateur introuvable." });
  }

  deposit.status = "approved";
  deposit.updatedAt = nowIso();
  user.balance = Number(user.balance || 0) + Number(deposit.amount || 0);
  user.updatedAt = nowIso();
  writeDb(req.db);

  res.json({ deposit, user });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(webDir, "index.html"));
});

app.listen(4010, () => {
  console.log("NumRapidePro disponible sur http://localhost:4010");
});

function makeDemoNumber(dialCode) {
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
  return `${dialCode}${digits}`;
}

function buildAdminData(db, query) {
  const deposits = filterByPeriod(db.deposits, query);
  const purchases = filterByPeriod(db.purchases, query);
  const users = db.users
    .filter((item) => item.role === "user")
    .map((item) => ({
      id: item.id,
      fullName: item.fullName,
      phone: item.phone,
      balance: item.balance
    }));

  return {
    totals: {
      walletBalances: users.reduce((sum, item) => sum + Number(item.balance || 0), 0),
      approvedDeposits: deposits.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.amount || 0), 0),
      purchasesCount: purchases.length,
      purchaseRevenue: purchases.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    },
    deposits,
    purchases,
    users
  };
}

function filterByPeriod(items, query) {
  const mode = query.mode || "all";
  return items.filter((item) => {
    const value = String(item.createdAt || "").slice(0, 10);
    if (mode === "date" && query.date) {
      return value === query.date;
    }
    if (mode === "month" && query.month) {
      return value.slice(0, 7) === query.month;
    }
    if (mode === "year" && query.year) {
      return value.slice(0, 4) === query.year;
    }
    return true;
  });
}
