import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../data/db.json");

const seed = {
  settings: {
    appName: "NumRapidePro",
    currency: "FCFA",
    providerMode: "demo-safe",
    paymentMethods: ["MTN", "MOOV", "Celtis", "Visa"],
    countries: [
      { code: "US", name: "Etats-Unis", dialCode: "+1", price: 3500, active: true, available: 10 },
      { code: "CA", name: "Canada", dialCode: "+1", price: 4000, active: true, available: 8 },
      { code: "FR", name: "France", dialCode: "+33", price: 4500, active: true, available: 9 },
      { code: "GB", name: "Royaume-Uni", dialCode: "+44", price: 5000, active: true, available: 7 },
      { code: "NG", name: "Nigeria", dialCode: "+234", price: 2800, active: true, available: 12 }
    ]
  },
  users: [
    {
      id: "usr_admin_001",
      fullName: "Admin NumRapidePro",
      phone: "+22997000000",
      role: "admin",
      balance: 0,
      createdAt: "2026-04-22T08:00:00.000Z",
      updatedAt: "2026-04-22T08:00:00.000Z"
    },
    {
      id: "usr_user_001",
      fullName: "Client Demo",
      phone: "+22996000001",
      role: "user",
      balance: 14000,
      createdAt: "2026-04-22T09:00:00.000Z",
      updatedAt: "2026-04-22T09:00:00.000Z"
    }
  ],
  otpCodes: [],
  deposits: [
    {
      id: "dep_001",
      userId: "usr_user_001",
      userName: "Client Demo",
      userPhone: "+22996000001",
      method: "MTN",
      amount: 10000,
      reference: "MTN-1001",
      status: "approved",
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:10:00.000Z"
    }
  ],
  purchases: [
    {
      id: "pur_001",
      userId: "usr_user_001",
      userPhone: "+22996000001",
      countryCode: "US",
      countryName: "Etats-Unis",
      phoneNumber: "+14385550101",
      amount: 3500,
      activationCode: "482913",
      createdAt: "2026-04-22T11:00:00.000Z"
    }
  ]
};

function ensureDb() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(seed, null, 2));
  }
}

export function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

export function writeDb(db) {
  fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
}

export function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
