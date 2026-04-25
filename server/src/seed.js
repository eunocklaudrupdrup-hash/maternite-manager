export function createSeedData() {
  const clinicId = "cli_demo001";
  return {
    clinics: [
      {
        id: clinicId,
        name: "Clinique Maternité Espoir",
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
        permissions: ["patients", "finance", "reports", "inventory", "staff", "clinic", "serviceStatuses", "users", "activity", "consultations", "emergencies", "admissions", "surgeries", "labOrders", "imagingOrders", "prescriptions", "insuranceProviders", "insuranceClaims", "departments", "beds", "documents"]
      },
      {
        id: "usr_recep001",
        clinicId,
        fullName: "Clarisse Mensah",
        email: "reception@demo.maternite",
        password: "welcome123",
        role: "receptionist",
        isActive: true,
        permissions: ["patients", "appointments", "invoices", "consultations"]
      }
    ],
    departments: [
      {
        id: "dep_srv_001",
        clinicId,
        name: "Consultation générale",
        head: "Dr. Mireille Akakpo",
        location: "Batiment A",
        phone: "+229 90000010",
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      },
      {
        id: "dep_srv_002",
        clinicId,
        name: "Maternité",
        head: "Soeur Clarisse",
        location: "Batiment B",
        phone: "+229 90000011",
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
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
        status: "Suivi prénatal",
        serviceStatusId: "svc_002",
        serviceStatusLabel: "Suivi prénatal",
        servicePrice: 15000,
        paymentStatus: "Paiement effectué à la caisse",
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
        label: "Suivi prénatal",
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
    consultations: [
      {
        id: "con_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        department: "Consultation générale",
        doctorName: "Dr. Mireille Akakpo",
        complaint: "Douleurs pelviennes",
        diagnosis: "Surveillance clinique",
        consultationDate: "2026-04-12",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z"
      }
    ],
    emergencies: [
      {
        id: "urg_001",
        clinicId,
        patientName: "Kossi Dossou",
        severity: "Modérée",
        arrivalDate: "2026-04-13",
        arrivalTime: "18:10",
        notes: "Douleur abdominale aigue",
        status: "Stabilise",
        createdAt: "2026-04-13T18:10:00.000Z",
        updatedAt: "2026-04-13T18:10:00.000Z"
      }
    ],
    beds: [
      {
        id: "bed_001",
        clinicId,
        ward: "Hospitalisation",
        room: "H1",
        bedNumber: "01",
        category: "Standard",
        status: "Disponible",
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      }
    ],
    admissions: [
      {
        id: "adm_001",
        clinicId,
        patientName: "Afi Mensah",
        department: "Hospitalisation",
        room: "H1",
        bedNumber: "01",
        admissionDate: "2026-04-14",
        dischargeDate: "",
        status: "En cours",
        createdAt: "2026-04-14T09:00:00.000Z",
        updatedAt: "2026-04-14T09:00:00.000Z"
      }
    ],
    surgeries: [
      {
        id: "sur_001",
        clinicId,
        patientName: "Afi Mensah",
        procedureName: "Césarienne programmée",
        surgeon: "Dr. Kodjo Mensah",
        anesthetist: "Dr. Akossiwa",
        surgeryDate: "2026-04-15",
        status: "Planifiee",
        createdAt: "2026-04-14T12:00:00.000Z",
        updatedAt: "2026-04-14T12:00:00.000Z"
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
    labOrders: [
      {
        id: "lab_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        examType: "NFS",
        requestedBy: "Dr. Mireille Akakpo",
        result: "Hb 11.2 g/dL",
        status: "Validé",
        createdAt: "2026-04-10T08:00:00.000Z",
        updatedAt: "2026-04-10T08:00:00.000Z"
      }
    ],
    imagingOrders: [
      {
        id: "img_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        imagingType: "Echographie obstetricale",
        requestedBy: "Dr. Mireille Akakpo",
        report: "Foetus unique evolutif",
        status: "Réalisé",
        createdAt: "2026-04-11T08:00:00.000Z",
        updatedAt: "2026-04-11T08:00:00.000Z"
      }
    ],
    prescriptions: [
      {
        id: "pre_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        medication: "Fer + acide folique",
        dosage: "1 comprime par jour",
        duration: "30 jours",
        prescribedBy: "Dr. Mireille Akakpo",
        createdAt: "2026-04-10T08:30:00.000Z",
        updatedAt: "2026-04-10T08:30:00.000Z"
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
    insuranceProviders: [
      {
        id: "ins_001",
        clinicId,
        name: "Mutuelle Santé Plus",
        coverageRate: 80,
        phone: "+229 91000010",
        email: "contact@mutuelle.demo",
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z"
      }
    ],
    insuranceClaims: [
      {
        id: "cla_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        providerName: "Mutuelle Santé Plus",
        claimAmount: 12000,
        coveredAmount: 9600,
        status: "En attente",
        createdAt: "2026-04-12T09:00:00.000Z",
        updatedAt: "2026-04-12T09:00:00.000Z"
      }
    ],
    documents: [
      {
        id: "doc_001",
        clinicId,
        patientName: "Nadia Hounkpe",
        documentType: "Compte rendu",
        title: "Consultation prénatale avril",
        fileName: "compte-rendu-avril.pdf",
        createdAt: "2026-04-12T09:30:00.000Z",
        updatedAt: "2026-04-12T09:30:00.000Z"
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
