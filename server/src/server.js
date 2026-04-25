import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  addEntity,
  appendLog,
  createClinicWithAdmins,
  getCollection,
  getDashboardData,
  getDb,
  getFinancialReport,
  getLogs,
  getMedicalReport,
  updateEntity
} from "./store.js";
import { createToken, getUserFromAuthHeader, requireRole } from "./utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const CLINIC_CREATION_CODE = "BOOMASSAA";

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

    appendLog({
      clinicId: user.clinicId,
      action: "auth:login",
      actorId: user.id,
      actorName: user.fullName,
      entityType: "users",
      entityId: user.id,
      details: `${user.fullName} connected`,
      metadata: {
        email: user.email,
        role: user.role
      }
    });

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

  app.post("/api/onboarding/clinic", (req, res) => {
    const payload = req.body ?? {};
    const clinic = payload.clinic ?? {};
    const admins = Array.isArray(payload.admins) ? payload.admins : [];
    const creationCode = String(payload.creationCode || "").trim();

    if (creationCode !== CLINIC_CREATION_CODE) {
      return res.status(403).json({ message: "Code identique invalide." });
    }

    if (!clinic.name?.trim()) {
      return res.status(400).json({ message: "Le nom de la clinique est obligatoire." });
    }

    if (admins.length === 0) {
      return res.status(400).json({ message: "Au moins un administrateur est obligatoire." });
    }

    const invalidAdmin = admins.find(
      (admin) => !admin.fullName?.trim() || !admin.email?.trim() || !admin.password?.trim()
    );

    if (invalidAdmin) {
      return res.status(400).json({ message: "Chaque administrateur doit avoir un nom, un email et un mot de passe." });
    }

    const db = getDb();
    const normalizedEmails = admins.map((admin) => String(admin.email).toLowerCase());
    const duplicateExisting = db.users.some((user) =>
      normalizedEmails.includes(String(user.email).toLowerCase())
    );
    const duplicateRequest = new Set(normalizedEmails).size !== normalizedEmails.length;

    if (duplicateExisting || duplicateRequest) {
      return res.status(409).json({ message: "Un email administrateur existe deja." });
    }

    const created = createClinicWithAdmins({ clinic, admins });
    const primaryAdmin = created.admins[0];
    const token = createToken({
      id: primaryAdmin.id,
      clinicId: primaryAdmin.clinicId,
      fullName: primaryAdmin.fullName,
      role: primaryAdmin.role,
      permissions: primaryAdmin.permissions
    });

    return res.status(201).json({
      clinic: created.clinic,
      admins: created.admins.map(sanitizeUser),
      token,
      user: sanitizeUser(primaryAdmin)
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

  app.get("/api/clinic", (req, res) => {
    const db = getDb();
    const clinic = db.clinics.find((item) => item.id === req.user.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinique introuvable." });
    }
    res.json(clinic);
  });

  app.patch("/api/clinic", requireRole(["admin"]), (req, res) => {
    const updates = {};
    const editableFields = ["name", "address", "phone", "email", "type", "logo"];

    for (const field of editableFields) {
      if (typeof req.body?.[field] === "string") {
        updates[field] = req.body[field];
      }
    }

    const updated = updateEntity("clinics", req.user.clinicId, req.user.clinicId, updates);
    if (!updated) {
      return res.status(404).json({ message: "Clinique introuvable." });
    }
    appendLog({
      clinicId: req.user.clinicId,
      action: "update:clinic",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "clinics",
      entityId: updated.id,
      details: updated.name,
      metadata: {
        name: updated.name
      }
    });
    res.json(updated);
  });

  app.get("/api/dashboard", (req, res) => {
    res.json(getDashboardData(req.user.clinicId));
  });

  app.get("/api/admin/logs", requireRole(["admin"]), (req, res) => {
    const logs = getLogs(req.user.clinicId);
    res.json(logs);
  });

  app.get("/api/admin/sales", requireRole(["admin"]), (req, res) => {
    const logs = getLogs(req.user.clinicId).filter(
      (item) => item.action === "create:invoices"
    );
    res.json(logs);
  });

  registerCrud(app, "clinics", { readRoles: ["admin"], writeRoles: ["admin"] });
  registerCrud(app, "staff", { readRoles: ["admin", "accountant", "receptionist"], writeRoles: ["admin"] });
  registerCrud(app, "departments", {
    readRoles: ["admin", "doctor", "midwife", "nurse", "accountant", "receptionist"],
    writeRoles: ["admin"]
  });
  registerCrud(app, "serviceStatuses", {
    readRoles: ["admin", "doctor", "midwife", "nurse", "accountant", "receptionist"],
    writeRoles: ["admin"]
  });
  registerCrud(app, "patients", {
    readRoles: ["admin", "doctor", "midwife", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "midwife", "receptionist"]
  });
  registerCrud(app, "appointments", {
    readRoles: ["admin", "doctor", "midwife", "receptionist"],
    writeRoles: ["admin", "doctor", "midwife", "receptionist"]
  });
  registerCrud(app, "consultations", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse", "receptionist"]
  });
  registerCrud(app, "emergencies", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse", "receptionist"]
  });
  registerCrud(app, "admissions", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse", "receptionist"]
  });
  registerCrud(app, "beds", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "nurse", "receptionist"]
  });
  registerCrud(app, "surgeries", {
    readRoles: ["admin", "doctor", "nurse"],
    writeRoles: ["admin", "doctor"]
  });
  registerCrud(app, "births", {
    readRoles: ["admin", "doctor", "midwife", "nurse"],
    writeRoles: ["admin", "doctor", "midwife"]
  });
  registerCrud(app, "labOrders", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse"]
  });
  registerCrud(app, "imagingOrders", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse"]
  });
  registerCrud(app, "prescriptions", {
    readRoles: ["admin", "doctor", "nurse", "pharmacist"],
    writeRoles: ["admin", "doctor"]
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
  registerCrud(app, "insuranceProviders", {
    readRoles: ["admin", "accountant", "receptionist"],
    writeRoles: ["admin", "accountant"]
  });
  registerCrud(app, "insuranceClaims", {
    readRoles: ["admin", "accountant", "receptionist"],
    writeRoles: ["admin", "accountant", "receptionist"]
  });
  registerCrud(app, "documents", {
    readRoles: ["admin", "doctor", "nurse", "receptionist"],
    writeRoles: ["admin", "doctor", "nurse", "receptionist"]
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
      createdByName: req.user.fullName,
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

  app.patch("/api/service-statuses/:id", requireRole(["admin"]), (req, res) => {
    const updated = updateEntity("serviceStatuses", req.params.id, req.user.clinicId, {
      label: req.body?.label,
      price: Number(req.body?.price || 0)
    });

    if (!updated) {
      return res.status(404).json({ message: "Statut introuvable." });
    }

    appendLog({
      clinicId: req.user.clinicId,
      action: "update:serviceStatus",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "serviceStatuses",
      entityId: updated.id,
      details: updated.label,
      metadata: { price: updated.price }
    });

    res.json(updated);
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
    if (typeof req.body.email === "string" && req.body.email.trim()) {
      const duplicateEmail = db.users.some(
        (item) =>
          item.id !== current.id &&
          item.clinicId === req.user.clinicId &&
          item.email.toLowerCase() === req.body.email.toLowerCase()
      );
      if (duplicateEmail) {
        return res.status(409).json({ message: "Cet email est deja utilise." });
      }
      updates.email = req.body.email;
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
    appendLog({
      clinicId: req.user.clinicId,
      action: "update:user",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "users",
      entityId: updated.id,
      details: updated.fullName,
      metadata: {
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive
      }
    });
    res.json(sanitizeUser(updated));
  });

  app.patch("/api/patients/:id/status", requireRole(["admin", "doctor", "midwife", "receptionist"]), (req, res) => {
    const db = getDb();
    const patient = db.patients.find(
      (item) => item.id === req.params.id && item.clinicId === req.user.clinicId
    );

    if (!patient) {
      return res.status(404).json({ message: "Patiente introuvable." });
    }

    const serviceStatus = db.serviceStatuses.find(
      (item) => item.id === req.body?.serviceStatusId && item.clinicId === req.user.clinicId
    );

    if (!serviceStatus) {
      return res.status(404).json({ message: "Statut introuvable." });
    }

    const updated = updateEntity("patients", req.params.id, req.user.clinicId, {
      status: serviceStatus.label,
      serviceStatusId: serviceStatus.id,
      serviceStatusLabel: serviceStatus.label,
      servicePrice: Number(serviceStatus.price || 0),
      paymentStatus: "En attente de paiement caisse"
    });

    appendLog({
      clinicId: req.user.clinicId,
      action: "assign:patientStatus",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "patients",
      entityId: updated.id,
      details: `${updated.fullName} - ${serviceStatus.label}`,
      metadata: {
        serviceStatusLabel: serviceStatus.label,
        servicePrice: serviceStatus.price
      }
    });

    res.json(updated);
  });

  app.post("/api/cashier/pay-status", requireRole(["admin", "accountant", "receptionist"]), (req, res) => {
    const db = getDb();
    const patient = db.patients.find(
      (item) => item.id === req.body?.patientId && item.clinicId === req.user.clinicId
    );
    const clinic = db.clinics.find((item) => item.id === req.user.clinicId);

    if (!patient) {
      return res.status(404).json({ message: "Patiente introuvable." });
    }

    if (!patient.serviceStatusLabel || !patient.servicePrice) {
      return res.status(400).json({ message: "Aucun statut facture pour cette patiente." });
    }

    if (patient.paymentStatus === "Paiement effectue a la caisse") {
      return res.status(400).json({ message: "Ce statut est deja paye." });
    }

    const invoice = addEntity("invoices", {
      clinicId: req.user.clinicId,
      createdBy: req.user.id,
      createdByName: req.user.fullName,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAge: patient.age || "",
      patientPhone: patient.phone || "",
      item: patient.serviceStatusLabel,
      amount: Number(patient.servicePrice || 0),
      status: "Paye",
      paymentMethod: req.body?.paymentMethod || "Especes",
      clinicName: clinic?.name || "",
      clinicLogo: clinic?.logo || "",
      paidAt: new Date().toISOString()
    });

    const updatedPatient = updateEntity("patients", patient.id, req.user.clinicId, {
      paymentStatus: "Paiement effectue a la caisse"
    });

    appendLog({
      clinicId: req.user.clinicId,
      action: "cashier:paymentCompleted",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "patients",
      entityId: patient.id,
      details: `${patient.fullName} - ${patient.serviceStatusLabel}`,
      metadata: {
        amount: patient.servicePrice,
        paymentMethod: req.body?.paymentMethod || "Especes"
      }
    });

    res.status(201).json({
      invoice,
      patient: updatedPatient,
      receipt: {
        clinicName: clinic?.name || "",
        clinicLogo: clinic?.logo || "",
        patientName: patient.fullName,
        patientAge: patient.age || "",
        patientPhone: patient.phone || "",
        status: patient.serviceStatusLabel,
        amount: Number(patient.servicePrice || 0),
        paidAt: invoice.paidAt,
        cashierName: req.user.fullName
      }
    });
  });

  app.post("/api/pharmacy/sales", requireRole(["admin", "pharmacist", "accountant", "receptionist"]), (req, res) => {
    const db = getDb();
    const product = db.inventory.find(
      (item) => item.id === req.body?.productId && item.clinicId === req.user.clinicId
    );
    const clinic = db.clinics.find((item) => item.id === req.user.clinicId);

    if (!product) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const quantity = Number(req.body?.quantity || 0);
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Quantite invalide." });
    }

    if (Number(product.quantity || 0) < quantity) {
      return res.status(400).json({ message: "Stock insuffisant pour cette vente." });
    }

    const customerType = req.body?.customerType === "existing" ? "existing" : "new";
    let customerName = "";
    let customerAge = "";
    let customerPhone = "";

    if (customerType === "existing") {
      const patient = db.patients.find(
        (item) => item.id === req.body?.patientId && item.clinicId === req.user.clinicId
      );

      if (!patient) {
        return res.status(404).json({ message: "Patiente introuvable." });
      }

      customerName = patient.fullName;
      customerAge = patient.age || "";
      customerPhone = patient.phone || "";
    } else {
      customerName = String(req.body?.customerName || "").trim();
      customerAge = String(req.body?.customerAge || "").trim();
      customerPhone = String(req.body?.customerPhone || "").trim();

      if (!customerName) {
        return res.status(400).json({ message: "Le nom du client est obligatoire." });
      }
    }

    const unitPrice = Number(product.price || 0);
    const totalAmount = unitPrice * quantity;

    const updatedProduct = updateEntity("inventory", product.id, req.user.clinicId, {
      quantity: Number(product.quantity || 0) - quantity
    });

    const invoice = addEntity("invoices", {
      clinicId: req.user.clinicId,
      createdBy: req.user.id,
      createdByName: req.user.fullName,
      patientName: customerName,
      patientAge: customerAge,
      patientPhone: customerPhone,
      item: `${product.name} x${quantity}`,
      amount: totalAmount,
      status: "Paye",
      paymentMethod: req.body?.paymentMethod || "Especes",
      clinicName: clinic?.name || "",
      clinicLogo: clinic?.logo || "",
      paidAt: new Date().toISOString(),
      invoiceType: "pharmacy-sale",
      productId: product.id,
      quantity,
      unitPrice
    });

    appendLog({
      clinicId: req.user.clinicId,
      action: "pharmacy:sale",
      actorId: req.user.id,
      actorName: req.user.fullName,
      entityType: "inventory",
      entityId: product.id,
      details: `${product.name} x${quantity}`,
      metadata: {
        customerName,
        amount: totalAmount,
        quantity
      }
    });

    res.status(201).json({
      product: updatedProduct,
      invoice,
      receipt: {
        clinicName: clinic?.name || "",
        clinicLogo: clinic?.logo || "",
        patientName: customerName,
        patientAge: customerAge,
        patientPhone: customerPhone,
        status: `Vente pharmacie - ${product.name} x${quantity}`,
        amount: totalAmount,
        paidAt: invoice.paidAt,
        cashierName: req.user.fullName
      }
    });
  });

  app.get("/api/reports/medical", requireRole(["admin", "doctor", "midwife"]), (req, res) => {
    res.json(
      getMedicalReport(req.user.clinicId, {
        mode: req.query.mode,
        date: req.query.date,
        month: req.query.month,
        year: req.query.year
      })
    );
  });

  app.get("/api/reports/financial", requireRole(["admin", "accountant"]), (req, res) => {
    res.json(
      getFinancialReport(req.user.clinicId, {
        mode: req.query.mode,
        date: req.query.date,
        month: req.query.month,
        year: req.query.year
      })
    );
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
    let payload = {
      ...req.body,
      clinicId: req.body?.clinicId || req.user.clinicId,
      createdBy: req.user.id,
      createdByName: req.user.fullName
    };

    if (name === "patients") {
      const db = getDb();
      const serviceStatus = db.serviceStatuses.find(
        (item) => item.id === req.body?.serviceStatusId && item.clinicId === req.user.clinicId
      );

      if (!serviceStatus) {
        return res.status(400).json({ message: "Veuillez selectionner un statut valide." });
      }

      payload = {
        ...payload,
        status: serviceStatus.label,
        serviceStatusId: serviceStatus.id,
        serviceStatusLabel: serviceStatus.label,
        servicePrice: Number(serviceStatus.price || 0),
        paymentStatus: "En attente de paiement caisse"
      };
    }

    if (name === "serviceStatuses") {
      payload = {
        ...payload,
        price: Number(req.body?.price || 0)
      };
    }

    const created = addEntity(name, payload);
    res.status(201).json(created);
  });
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function normalizePermissions(role, permissions) {
  const defaults = {
    admin: ["patients", "finance", "reports", "inventory", "staff", "users", "clinic", "serviceStatuses", "activity", "consultations", "emergencies", "admissions", "surgeries", "labOrders", "imagingOrders", "prescriptions", "insuranceProviders", "insuranceClaims", "departments", "beds", "documents"],
    doctor: ["patients", "reports", "appointments", "consultations", "surgeries", "labOrders", "imagingOrders", "prescriptions", "documents"],
    midwife: ["patients", "births", "appointments", "consultations", "documents"],
    nurse: ["patients", "births", "emergencies", "admissions", "beds", "labOrders", "documents"],
    pharmacist: ["inventory", "prescriptions"],
    accountant: ["finance", "reports", "insuranceProviders", "insuranceClaims", "invoices"],
    receptionist: ["patients", "appointments", "invoices", "consultations", "admissions", "departments"]
  };

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return defaults[role] || [];
  }

  return Array.from(new Set(permissions));
}
