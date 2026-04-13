import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  addEntity,
  getCollection,
  getDashboardData,
  getDb,
  getFinancialReport,
  getMedicalReport,
  updateEntity
} from "./store.js";
import { createToken, getUserFromAuthHeader, requireRole } from "./utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

export function createServerApp(app) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    const db = getDb();
    const user = db.users.find((item) => item.email.toLowerCase() === String(email || "").toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Ce compte est desactive." });
    }

    const token = createToken({
      id: user.id,
      clinicId: user.clinicId,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions
    });

    return res.json({
      token,
      user: {
        id: user.id,
        clinicId: user.clinicId,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions
      }
    });
  });

  app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/auth/login") {
      return next();
    }
    const user = getUserFromAuthHeader(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: "Session invalide ou expiree." });
    }
    req.user = user;
    next();
  });

  app.get("/api/me", (req, res) => {
    res.json(req.user);
  });

  app.get("/api/dashboard", (req, res) => {
    res.json(getDashboardData(req.user.clinicId));
  });

  registerCrud(app, "clinics", { readRoles: ["admin"], writeRoles: ["admin"] });
  registerCrud(app, "staff", { readRoles: ["admin", "accountant", "receptionist"], writeRoles: ["admin"] });
  registerCrud(app, "patients", {
    readRoles: ["admin", "doctor", "midwife", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "midwife", "receptionist"]
  });
  registerCrud(app, "appointments", {
    readRoles: ["admin", "doctor", "midwife", "receptionist"],
    writeRoles: ["admin", "doctor", "midwife", "receptionist"]
  });
  registerCrud(app, "births", {
    readRoles: ["admin", "doctor", "midwife", "nurse"],
    writeRoles: ["admin", "doctor", "midwife"]
  });
  registerCrud(app, "inventory", {
    readRoles: ["admin", "pharmacist", "accountant"],
    writeRoles: ["admin", "pharmacist"]
  });
  registerCrud(app, "invoices", {
    readRoles: ["admin", "accountant", "receptionist"],
    writeRoles: ["admin", "accountant", "receptionist"]
  });
  registerCrud(app, "expenses", {
    readRoles: ["admin", "accountant"],
    writeRoles: ["admin", "accountant"]
  });
  registerCrud(app, "notifications", {
    readRoles: ["admin", "doctor", "midwife", "nurse", "pharmacist", "accountant", "receptionist"],
    writeRoles: ["admin", "doctor", "midwife", "nurse", "pharmacist", "accountant", "receptionist"]
  });

  app.get("/api/users", requireRole(["admin"]), (req, res) => {
    const db = getDb();
    res.json(
      db.users
        .filter((item) => item.clinicId === req.user.clinicId)
        .map(sanitizeUser)
    );
  });

  app.post("/api/users", requireRole(["admin"]), (req, res) => {
    const payload = req.body ?? {};
    const db = getDb();
    const exists = db.users.some(
      (item) => item.email.toLowerCase() === String(payload.email || "").toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ message: "Un utilisateur avec cet email existe deja." });
    }

    const created = addEntity("users", {
      clinicId: req.user.clinicId,
      createdBy: req.user.id,
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password || "ChangeMe123!",
      role: payload.role || "receptionist",
      isActive: payload.isActive !== false,
      permissions: normalizePermissions(payload.role || "receptionist", payload.permissions)
    });

    res.status(201).json({
      user: sanitizeUser(created),
      temporaryPassword: created.password
    });
  });

  app.patch("/api/users/:id", requireRole(["admin"]), (req, res) => {
    const db = getDb();
    const current = db.users.find(
      (item) => item.id === req.params.id && item.clinicId === req.user.clinicId
    );

    if (!current) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const updates = {};
    if (typeof req.body.fullName === "string") {
      updates.fullName = req.body.fullName;
    }
    if (typeof req.body.role === "string") {
      updates.role = req.body.role;
    }
    if (typeof req.body.isActive === "boolean") {
      updates.isActive = req.body.isActive;
    }
    if (Array.isArray(req.body.permissions)) {
      updates.permissions = normalizePermissions(req.body.role || current.role, req.body.permissions);
    }
    if (typeof req.body.password === "string" && req.body.password.trim()) {
      updates.password = req.body.password;
    }

    const updated = updateEntity("users", req.params.id, req.user.clinicId, updates);
    res.json(sanitizeUser(updated));
  });

  app.get("/api/reports/medical", requireRole(["admin", "doctor", "midwife"]), (req, res) => {
    res.json(getMedicalReport(req.user.clinicId));
  });

  app.get("/api/reports/financial", requireRole(["admin", "accountant"]), (req, res) => {
    res.json(getFinancialReport(req.user.clinicId));
  });

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }
}

function registerCrud(app, name, access) {
  app.get(`/api/${name}`, requireRole(access.readRoles), (req, res) => {
    res.json(getCollection(name, req.user.clinicId));
  });

  app.post(`/api/${name}`, requireRole(access.writeRoles), (req, res) => {
    const created = addEntity(name, {
      ...req.body,
      clinicId: req.body?.clinicId || req.user.clinicId,
      createdBy: req.user.id
    });
    res.status(201).json(created);
  });
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function normalizePermissions(role, permissions) {
  const defaults = {
    admin: ["patients", "finance", "reports", "inventory", "staff", "users"],
    doctor: ["patients", "reports", "appointments"],
    midwife: ["patients", "births", "appointments"],
    nurse: ["patients", "births"],
    pharmacist: ["inventory"],
    accountant: ["finance", "reports"],
    receptionist: ["patients", "appointments", "invoices"]
  };

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return defaults[role] || [];
  }

  return Array.from(new Set(permissions));
}
