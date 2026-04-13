export function createSeedData() {
  const clinicId = "cli_demo001";
  return {
    clinics: [
      {
        id: clinicId,
        name: "Clinique Maternite Espoir",
        address: "12 Avenue de la Sante, Cotonou",
        phone: "+229 01020304",
        email: "contact@espoir.demo",
        type: "Privee",
        logo: "",
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      }
    ],
    users: [
      {
        id: "usr_admin001",
        clinicId,
        fullName: "Aminata Kone",
        email: "admin@demo.maternite",
        password: "admin123",
        role: "admin",
        isActive: true,
        permissions: ["patients", "finance", "reports", "inventory", "staff"]
      },
      {
        id: "usr_recep001",
        clinicId,
        fullName: "Clarisse Mensah",
        email: "reception@demo.maternite",
        password: "welcome123",
        role: "receptionist",
        isActive: true,
        permissions: ["patients", "appointments", "invoices"]
      }
    ],
    staff: [
      {
        id: "sta_001",
        clinicId,
        fullName: "Dr. Mireille Akakpo",
        role: "Gynecologue",
        department: "Obstetrique",
        phone: "+229 90000001",
        schedule: "Lun-Ven 08:00-16:00",
        performanceScore: 94,
        createdAt: "2026-04-01T08:10:00.000Z",
        updatedAt: "2026-04-01T08:10:00.000Z"
      }
    ],
    patients: [
      {
        id: "pat_001",
        clinicId,
        fullName: "Nadia Hounkpe",
        age: 29,
        bloodGroup: "O+",
        phone: "+229 97000001",
        address: "Abomey-Calavi",
        pregnancyWeeks: 34,
        status: "Suivi prenatal",
        serviceStatusId: "svc_002",
        serviceStatusLabel: "Suivi Prenatal",
        servicePrice: 15000,
        paymentStatus: "Paiement effectue a la caisse",
        history: "G2P1, sans complication majeure",
        createdAt: "2026-04-05T09:00:00.000Z",
        updatedAt: "2026-04-05T09:00:00.000Z"
      }
    ],
    serviceStatuses: [
      {
        id: "svc_001",
        clinicId,
        label: "Consultation",
        price: 10000,
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      },
      {
        id: "svc_002",
        clinicId,
        label: "Suivi Prenatal",
        price: 15000,
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      },
      {
        id: "svc_003",
        clinicId,
        label: "Accouchement",
        price: 50000,
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      }
    ],
    appointments: [
      {
        id: "app_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        service: "Consultation prenatale",
        staffName: "Dr. Mireille Akakpo",
        date: "2026-04-15",
        time: "09:30",
        status: "Confirme",
        createdAt: "2026-04-10T08:00:00.000Z",
        updatedAt: "2026-04-10T08:00:00.000Z"
      }
    ],
    births: [
      {
        id: "bir_001",
        clinicId,
        motherName: "Sonia Adjovi",
        babyName: "Joel Adjovi",
        sex: "Masculin",
        weightKg: 3.2,
        heightCm: 50,
        deliveryType: "Naturel",
        complications: "",
        birthDate: "2026-04-09",
        birthTime: "14:20",
        motherStatus: "Stable",
        babyStatus: "Stable",
        createdAt: "2026-04-09T14:30:00.000Z",
        updatedAt: "2026-04-09T14:30:00.000Z"
      }
    ],
    inventory: [
      {
        id: "inv_001",
        clinicId,
        name: "Oxytocine",
        category: "Medicament",
        photo: "",
        quantity: 12,
        unit: "boites",
        lowStockThreshold: 10,
        price: 4500,
        createdAt: "2026-04-02T11:00:00.000Z",
        updatedAt: "2026-04-02T11:00:00.000Z"
      }
    ],
    invoices: [
      {
        id: "fac_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        item: "Consultation prenatale",
        amount: 15000,
        status: "Paye",
        paymentMethod: "Especes",
        createdAt: "2026-04-05T10:30:00.000Z",
        updatedAt: "2026-04-05T10:30:00.000Z"
      }
    ],
    expenses: [
      {
        id: "dep_001",
        clinicId,
        label: "Achat de gants steriles",
        amount: 9000,
        category: "Consommables",
        createdAt: "2026-04-04T13:00:00.000Z",
        updatedAt: "2026-04-04T13:00:00.000Z"
      }
    ],
    notifications: [
      {
        id: "not_001",
        clinicId,
        title: "Stock faible",
        message: "Le stock d'Oxytocine approche du seuil minimum.",
        createdAt: "2026-04-11T07:00:00.000Z",
        updatedAt: "2026-04-11T07:00:00.000Z"
      }
    ],
    logs: []
  };
}
