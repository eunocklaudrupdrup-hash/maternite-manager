import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createSeedData } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dbPath = path.join(dataDir, "db.json");

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createSeedData(), null, 2));
  }
}

export function getDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCollection(name, clinicId) {
  const db = getDb();
  const items = db[name] || [];
  if (name === "clinics") {
    return items.filter((item) => item.id === clinicId || !clinicId);
  }
  return items.filter((item) => item.clinicId === clinicId);
}

export function addEntity(name, payload) {
  const db = getDb();
  const now = new Date().toISOString();
  const entity = {
    id: makeId(name.slice(0, 3)),
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  if (!db[name]) {
    db[name] = [];
  }

  db[name].unshift(entity);
  db.logs.unshift({
    id: makeId("log"),
    clinicId: payload.clinicId,
    action: `create:${name}`,
    actorId: payload.createdBy,
    createdAt: now,
    details: entity.id
  });
  saveDb(db);
  return entity;
}

export function updateEntity(name, id, clinicId, updates) {
  const db = getDb();
  const collection = db[name] || [];
  const index = collection.findIndex((item) => item.id === id && item.clinicId === clinicId);

  if (index === -1) {
    return null;
  }

  const next = {
    ...collection[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  collection[index] = next;
  saveDb(db);
  return next;
}

export function createClinicWithAdmins({ clinic, admins }) {
  const db = getDb();
  const now = new Date().toISOString();
  const clinicId = makeId("cli");

  const createdClinic = {
    id: clinicId,
    name: clinic.name,
    address: clinic.address || "",
    phone: clinic.phone || "",
    email: clinic.email || "",
    type: clinic.type || "Privee",
    logo: clinic.logo || "",
    createdAt: now,
    updatedAt: now
  };

  const createdAdmins = admins.map((admin) => ({
    id: makeId("usr"),
    clinicId,
    fullName: admin.fullName,
    email: admin.email,
    password: admin.password,
    role: "admin",
    isActive: true,
    permissions: ["patients", "finance", "reports", "inventory", "staff", "users", "appointments", "births", "invoices"],
    createdAt: now,
    updatedAt: now
  }));

  db.clinics.unshift(createdClinic);
  db.users.unshift(...createdAdmins);
  db.logs.unshift({
    id: makeId("log"),
    clinicId,
    action: "create:clinic",
    actorId: createdAdmins[0]?.id || "system",
    createdAt: now,
    details: createdClinic.name
  });
  saveDb(db);

  return {
    clinic: createdClinic,
    admins: createdAdmins
  };
}

function buildMonthlyTotals(invoices, expenses) {
  const months = {};
  for (const invoice of invoices) {
    const key = invoice.createdAt.slice(0, 7);
    if (!months[key]) {
      months[key] = { month: key, revenue: 0, expenses: 0 };
    }
    months[key].revenue += Number(invoice.amount || 0);
  }
  for (const expense of expenses) {
    const key = expense.createdAt.slice(0, 7);
    if (!months[key]) {
      months[key] = { month: key, revenue: 0, expenses: 0 };
    }
    months[key].expenses += Number(expense.amount || 0);
  }
  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

export function getDashboardData(clinicId) {
  const db = getDb();
  const patients = db.patients.filter((item) => item.clinicId === clinicId);
  const births = db.births.filter((item) => item.clinicId === clinicId);
  const appointments = db.appointments.filter((item) => item.clinicId === clinicId);
  const inventory = db.inventory.filter((item) => item.clinicId === clinicId);
  const invoices = db.invoices.filter((item) => item.clinicId === clinicId);
  const expenses = db.expenses.filter((item) => item.clinicId === clinicId);

  return {
    summary: {
      patients: patients.length,
      births: births.length,
      appointments: appointments.length,
      revenue: invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      expenses: expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      lowStockItems: inventory.filter((item) => Number(item.quantity || 0) <= Number(item.lowStockThreshold || 0)).length
    },
    upcomingAppointments: appointments.slice(0, 5),
    recentBirths: births.slice(0, 5),
    lowStockItems: inventory.filter((item) => Number(item.quantity || 0) <= Number(item.lowStockThreshold || 0)).slice(0, 5),
    financeTrend: buildMonthlyTotals(invoices, expenses)
  };
}

export function getMedicalReport(clinicId, filters = {}) {
  const db = getDb();
  const patients = db.patients.filter((item) => item.clinicId === clinicId);
  const births = filterByPeriod(
    db.births.filter((item) => item.clinicId === clinicId),
    (item) => item.birthDate || item.createdAt,
    filters
  );
  return {
    period: filters,
    totalPatients: patients.length,
    cSections: births.filter((item) => item.deliveryType === "Cesarienne").length,
    naturalBirths: births.filter((item) => item.deliveryType === "Naturel").length,
    complications: births.filter((item) => item.complications).length,
    birthsCount: births.length,
    births: births.slice(0, 100),
    recentPatients: patients.slice(0, 10)
  };
}

export function getFinancialReport(clinicId, filters = {}) {
  const db = getDb();
  const invoices = filterByPeriod(
    db.invoices.filter((item) => item.clinicId === clinicId),
    (item) => item.createdAt,
    filters
  );
  const expenses = filterByPeriod(
    db.expenses.filter((item) => item.clinicId === clinicId),
    (item) => item.createdAt,
    filters
  );
  return {
    period: filters,
    totalRevenue: invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    totalExpenses: expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    invoices: invoices.slice(0, 20),
    expenses: expenses.slice(0, 20)
  };
}

function filterByPeriod(items, getDateValue, filters) {
  const mode = filters.mode || "all";
  const date = filters.date || "";
  const month = filters.month || "";
  const year = filters.year || "";

  if (mode === "all") {
    return items;
  }

  return items.filter((item) => {
    const raw = String(getDateValue(item) || "");
    const normalized = raw.includes("T") ? raw.slice(0, 10) : raw;

    if (!normalized) {
      return false;
    }

    if (mode === "date") {
      return normalized === date;
    }

    if (mode === "month") {
      return normalized.slice(0, 7) === month;
    }

    if (mode === "year") {
      return normalized.slice(0, 4) === year;
    }

    return true;
  });
}
