import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

const sections = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clinic", label: "Clinique" },
  { key: "serviceStatuses", label: "Statuts" },
  { key: "patients", label: "Patientes" },
  { key: "appointments", label: "Rendez-vous" },
  { key: "births", label: "Naissances" },
  { key: "inventory", label: "Pharmacie" },
  { key: "finance", label: "Caisse" },
  { key: "staff", label: "Personnel" },
  { key: "users", label: "Utilisateurs" },
  { key: "activity", label: "Activite" },
  { key: "reports", label: "Rapports" }
];

const initialForms = {
  patients: { fullName: "", age: "", phone: "", pregnancyWeeks: "", serviceStatusId: "", history: "" },
  appointments: { patientName: "", service: "", staffName: "", date: "", time: "", status: "Confirme" },
  births: { motherName: "", babyName: "", sex: "Feminin", weightKg: "", heightCm: "", deliveryType: "Naturel", complications: "", birthDate: "", birthTime: "", motherStatus: "Stable", babyStatus: "Stable" },
  inventory: { name: "", category: "Medicament", photo: "", quantity: "", unit: "", lowStockThreshold: "", price: "" },
  pharmacySale: {
    productId: "",
    quantity: "1",
    customerType: "existing",
    patientId: "",
    customerName: "",
    customerAge: "",
    customerPhone: "",
    paymentMethod: "Especes"
  },
  invoices: { patientName: "", item: "", amount: "", status: "Paye", paymentMethod: "Especes" },
  expenses: { label: "", amount: "", category: "General" },
  staff: { fullName: "", role: "", department: "", phone: "", schedule: "", performanceScore: "" },
  users: { fullName: "", email: "", role: "receptionist", password: "", permissions: ["patients", "appointments", "invoices"], isActive: true },
  serviceStatuses: { label: "", price: "" }
};

const availablePermissions = [
  { key: "clinic", label: "Clinique" },
  { key: "serviceStatuses", label: "Statuts" },
  { key: "patients", label: "Patientes" },
  { key: "appointments", label: "Rendez-vous" },
  { key: "births", label: "Naissances" },
  { key: "inventory", label: "Pharmacie" },
  { key: "finance", label: "Caisse" },
  { key: "staff", label: "Personnel" },
  { key: "users", label: "Utilisateurs" },
  { key: "activity", label: "Activite" },
  { key: "reports", label: "Rapports" },
  { key: "invoices", label: "Facturation" }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [data, setData] = useState({
    dashboard: null,
    clinic: null,
    patients: [],
    serviceStatuses: [],
    appointments: [],
    births: [],
    inventory: [],
    invoices: [],
    expenses: [],
    staff: [],
    users: [],
    logs: [],
    sales: [],
    reports: null
  });
  const [forms, setForms] = useState(initialForms);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState({
    mode: "all",
    date: "",
    month: "",
    year: new Date().getFullYear().toString()
  });
  const [clinicForm, setClinicForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    type: "",
    logo: ""
  });
  const [clinicSignup, setClinicSignup] = useState({
    clinic: {
      name: "",
      address: "",
      phone: "",
      email: "",
      type: "Privee"
    },
    admins: [
      { fullName: "", email: "", password: "" }
    ]
  });

  useEffect(() => {
    const token = localStorage.getItem("maternite_token");
    const user = localStorage.getItem("maternite_user");
    if (token && user) {
      setSession(JSON.parse(user));
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadAll();
    }
  }, [session]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (session && !canAccessSection(session, activeSection)) {
      setActiveSection("dashboard");
    }
  }, [session, activeSection]);

  const visibleSections = sections.filter((section) => canAccessSection(session, section.key));

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const requests = [
        apiRequest("/dashboard"),
        apiRequest("/clinic"),
        apiRequest("/serviceStatuses"),
        apiRequest("/patients"),
        apiRequest("/appointments"),
        apiRequest("/births"),
        apiRequest("/inventory"),
        apiRequest("/invoices"),
        apiRequest("/expenses"),
        apiRequest("/staff")
      ];

      if (session.role === "admin") {
        requests.push(apiRequest("/users"));
        requests.push(apiRequest("/admin/logs"));
        requests.push(apiRequest("/admin/sales"));
      }

      const [
        dashboard,
        clinic,
        serviceStatuses,
        patients,
        appointments,
        births,
        inventory,
        invoices,
        expenses,
        staff,
        users = [],
        logs = [],
        sales = []
      ] =
        await Promise.all(requests);

      let reports = null;
      try {
        const query = buildReportQuery(reportFilter);
        reports = {
          medical: await apiRequest(`/reports/medical${query}`),
          financial: await apiRequest(`/reports/financial${query}`)
        };
      } catch {
        reports = null;
      }

      setData({ dashboard, clinic, serviceStatuses, patients, appointments, births, inventory, invoices, expenses, staff, users, logs, sales, reports });
      setClinicForm({
        name: clinic?.name || "",
        address: clinic?.address || "",
        phone: clinic?.phone || "",
        email: clinic?.email || "",
        type: clinic?.type || "",
        logo: clinic?.logo || ""
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      localStorage.setItem("maternite_token", response.token);
      localStorage.setItem("maternite_user", JSON.stringify(response.user));
      setSession(response.user);
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  async function handleClinicSignup(event) {
    event.preventDefault();
    setError("");
    try {
      const cleanedAdmins = clinicSignup.admins.filter(
        (admin) => admin.fullName || admin.email || admin.password
      );

      const response = await apiRequest("/onboarding/clinic", {
        method: "POST",
        body: JSON.stringify({
          clinic: clinicSignup.clinic,
          admins: cleanedAdmins
        })
      });

      localStorage.setItem("maternite_token", response.token);
      localStorage.setItem("maternite_user", JSON.stringify(response.user));
      setSession(response.user);
    } catch (signupError) {
      setError(signupError.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("maternite_token");
    localStorage.removeItem("maternite_user");
    setSession(null);
  }

  async function submitResource(resourceKey, endpoint) {
    setError("");
    try {
      await apiRequest(`/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(forms[resourceKey])
      });
      setForms((current) => ({ ...current, [resourceKey]: initialForms[resourceKey] }));
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function createUser() {
    setError("");
    try {
      const payload = {
        fullName: forms.users.fullName,
        email: forms.users.email,
        role: forms.users.role,
        password: forms.users.password,
        isActive: forms.users.isActive,
        permissions: forms.users.permissions
      };
      const response = await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setForms((current) => ({
        ...current,
        users: initialForms.users
      }));
      await loadAll();
      window.alert(`Utilisateur cree. Mot de passe temporaire: ${response.temporaryPassword}`);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function toggleUserActivation(user) {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive })
      });
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function resetPassword(user) {
    const nextPassword = window.prompt(`Nouveau mot de passe pour ${user.fullName}`, "Temp1234!");
    if (!nextPassword) {
      return;
    }
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: nextPassword })
      });
      window.alert("Mot de passe reinitialise.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function savePermissions(user, permissions, role) {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
          permissions
        })
      });
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function updateUser(userId, payload) {
    try {
      await apiRequest(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function saveClinic(event) {
    event.preventDefault();
    try {
      await apiRequest("/clinic", {
        method: "PATCH",
        body: JSON.stringify(clinicForm)
      });
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function assignPatientStatus(patientId, serviceStatusId) {
    if (!serviceStatusId) {
      return;
    }
    try {
      await apiRequest(`/patients/${patientId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ serviceStatusId })
      });
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function payPatientStatus(patientId) {
    try {
      const response = await apiRequest("/cashier/pay-status", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          paymentMethod: "Especes"
        })
      });
      downloadReceipt(response.receipt);
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleClinicLogoUpload(file, mode) {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);

      if (mode === "signup") {
        setClinicSignup((current) => ({
          ...current,
          clinic: { ...current.clinic, logo: dataUrl }
        }));
        return;
      }

      setClinicForm((current) => ({ ...current, logo: dataUrl }));
    } catch {
      setError("Impossible de charger ce logo.");
    }
  }

  async function handleInventoryPhotoUpload(file) {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForms((current) => ({
        ...current,
        inventory: {
          ...current.inventory,
          photo: dataUrl
        }
      }));
    } catch {
      setError("Impossible de charger l'image du produit.");
    }
  }

  async function handleInstallApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function submitPharmacySale(event) {
    event.preventDefault();
    try {
      const response = await apiRequest("/pharmacy/sales", {
        method: "POST",
        body: JSON.stringify(forms.pharmacySale)
      });
      downloadReceipt(response.receipt);
      setForms((current) => ({
        ...current,
        pharmacySale: initialForms.pharmacySale
      }));
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div>
            <p className="eyebrow">Gestion complete de maternite</p>
            <h1>Maternite Manager</h1>
            <p className="lead">
              Une interface moderne pour piloter les soins, l&apos;administration, la pharmacie et la caisse d&apos;une clinique d&apos;accouchement.
            </p>
          </div>
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "tab-button active-tab" : "tab-button"}
              onClick={() => setAuthMode("login")}
            >
              Connexion
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "tab-button active-tab" : "tab-button"}
              onClick={() => setAuthMode("signup")}
            >
              Creer une clinique
            </button>
          </div>
          {authMode === "login" ? (
            <>
              <form className="stack" onSubmit={handleLogin}>
                <label>
                  Email
                  <input name="email" type="email" defaultValue="admin@demo.maternite" required />
                </label>
                <label>
                  Mot de passe
                  <input name="password" type="password" defaultValue="admin123" required />
                </label>
                <button type="submit">Se connecter</button>
              </form>
              <p className="hint">Demo admin: admin@demo.maternite / admin123</p>
            </>
          ) : (
            <form className="stack" onSubmit={handleClinicSignup}>
              <h3>Nouvelle clinique d&apos;accouchement</h3>
              <label>
                Nom de la clinique
                <input
                  value={clinicSignup.clinic.name}
                  onChange={(event) => setClinicSignup({
                    ...clinicSignup,
                    clinic: { ...clinicSignup.clinic, name: event.target.value }
                  })}
                  required
                />
              </label>
              <label>
                Adresse
                <input
                  value={clinicSignup.clinic.address}
                  onChange={(event) => setClinicSignup({
                    ...clinicSignup,
                    clinic: { ...clinicSignup.clinic, address: event.target.value }
                  })}
                />
              </label>
              <label>
                Telephone
                <input
                  value={clinicSignup.clinic.phone}
                  onChange={(event) => setClinicSignup({
                    ...clinicSignup,
                    clinic: { ...clinicSignup.clinic, phone: event.target.value }
                  })}
                />
              </label>
              <label>
                Email clinique
                <input
                  type="email"
                  value={clinicSignup.clinic.email}
                  onChange={(event) => setClinicSignup({
                    ...clinicSignup,
                    clinic: { ...clinicSignup.clinic, email: event.target.value }
                  })}
                />
              </label>
              <label>
                Type
                <input
                  value={clinicSignup.clinic.type}
                  onChange={(event) => setClinicSignup({
                    ...clinicSignup,
                    clinic: { ...clinicSignup.clinic, type: event.target.value }
                  })}
                />
              </label>
              <label>
                Logo de la clinique
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleClinicLogoUpload(event.target.files?.[0], "signup")}
                />
              </label>
              {clinicSignup.clinic.logo ? (
                <img className="clinic-logo" src={clinicSignup.clinic.logo} alt="Apercu du logo" />
              ) : null}

              {clinicSignup.admins.map((admin, index) => (
                <div key={index} className="subpanel">
                  <h4>Administrateur {index + 1}</h4>
                  <label>
                    Nom complet
                    <input
                      value={admin.fullName}
                      onChange={(event) => {
                        const admins = [...clinicSignup.admins];
                        admins[index] = { ...admins[index], fullName: event.target.value };
                        setClinicSignup({ ...clinicSignup, admins });
                      }}
                      required={index === 0}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={admin.email}
                      onChange={(event) => {
                        const admins = [...clinicSignup.admins];
                        admins[index] = { ...admins[index], email: event.target.value };
                        setClinicSignup({ ...clinicSignup, admins });
                      }}
                      required={index === 0}
                    />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      type="password"
                      value={admin.password}
                      onChange={(event) => {
                        const admins = [...clinicSignup.admins];
                        admins[index] = { ...admins[index], password: event.target.value };
                        setClinicSignup({ ...clinicSignup, admins });
                      }}
                      required={index === 0}
                    />
                  </label>
                </div>
              ))}

              {clinicSignup.admins.length < 2 ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setClinicSignup({
                      ...clinicSignup,
                      admins: [...clinicSignup.admins, { fullName: "", email: "", password: "" }]
                    })
                  }
                >
                  Ajouter un second administrateur
                </button>
              ) : null}

              <button type="submit">Creer la clinique</button>
            </form>
          )}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Patientes", value: data.dashboard?.summary?.patients ?? 0 },
    { label: "Accouchements", value: data.dashboard?.summary?.births ?? 0 },
    { label: "Revenus", value: `${data.dashboard?.summary?.revenue ?? 0} FCFA` },
    { label: "Depenses", value: `${data.dashboard?.summary?.expenses ?? 0} FCFA` }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Clinique active</p>
          <h2>{data.clinic?.name || "Clinique"}</h2>
          <p className="muted">{session.fullName}</p>
          <p className="badge">{session.role}</p>
        </div>
        <nav className="menu">
          {visibleSections.map((section) => (
            <button
              key={section.key}
              className={section.key === activeSection ? "menu-item active" : "menu-item"}
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <button className="secondary" onClick={handleLogout}>
          Deconnexion
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme multi-utilisateurs</p>
            <h1>Tableau de bord de la clinique</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="secondary" onClick={loadAll}>
              Actualiser
            </button>
            {installPrompt ? (
              <button type="button" className="secondary" onClick={handleInstallApp}>
                Installer l'application
              </button>
            ) : null}
            <div className="status-pill">{loading ? "Chargement..." : "Synchronise"}</div>
          </div>
        </header>

        {error ? <p className="error">{error}</p> : null}

        {activeSection === "dashboard" && (
          <section className="stack">
            <div className="grid cards">
              {cards.map((card) => (
                <article key={card.label} className="panel stat-card">
                  <p className="muted">{card.label}</p>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>
            <div className="grid two-columns">
              <article className="panel">
                <h3>Rendez-vous a venir</h3>
                <SimpleTable rows={data.dashboard?.upcomingAppointments ?? []} columns={["patientName", "service", "date", "time", "status"]} />
              </article>
              <article className="panel">
                <h3>Stock critique</h3>
                <SimpleTable rows={data.dashboard?.lowStockItems ?? []} columns={["name", "quantity", "unit", "lowStockThreshold"]} />
              </article>
            </div>
          </section>
        )}

        {activeSection === "clinic" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Informations de la clinique</h3>
              {data.clinic ? (
                <div className="stack">
                  {data.clinic.logo ? <img className="clinic-logo" src={data.clinic.logo} alt="Logo clinique" /> : null}
                  <p><strong>Nom :</strong> {data.clinic.name}</p>
                  <p><strong>Adresse :</strong> {data.clinic.address || "-"}</p>
                  <p><strong>Telephone :</strong> {data.clinic.phone || "-"}</p>
                  <p><strong>Email :</strong> {data.clinic.email || "-"}</p>
                  <p><strong>Type :</strong> {data.clinic.type || "-"}</p>
                </div>
              ) : (
                <p className="muted">Clinique introuvable.</p>
              )}
            </article>
            <article className="panel">
              <h3>Modifier la clinique</h3>
              {session.role !== "admin" ? (
                <p className="muted">Seul l'administrateur peut modifier la clinique.</p>
              ) : (
                <form className="stack compact" onSubmit={saveClinic}>
                  <label>
                    Nom
                    <input value={clinicForm.name} onChange={(event) => setClinicForm({ ...clinicForm, name: event.target.value })} />
                  </label>
                  <label>
                    Adresse
                    <input value={clinicForm.address} onChange={(event) => setClinicForm({ ...clinicForm, address: event.target.value })} />
                  </label>
                  <label>
                    Telephone
                    <input value={clinicForm.phone} onChange={(event) => setClinicForm({ ...clinicForm, phone: event.target.value })} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={clinicForm.email} onChange={(event) => setClinicForm({ ...clinicForm, email: event.target.value })} />
                  </label>
                  <label>
                    Type
                    <input value={clinicForm.type} onChange={(event) => setClinicForm({ ...clinicForm, type: event.target.value })} />
                  </label>
                  <label>
                    Logo de la clinique
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleClinicLogoUpload(event.target.files?.[0], "edit")}
                    />
                  </label>
                  {clinicForm.logo ? <img className="clinic-logo" src={clinicForm.logo} alt="Logo clinique" /> : null}
                  <button type="submit">Enregistrer la clinique</button>
                </form>
              )}
            </article>
          </section>
        )}

        {activeSection === "patients" && (
          <SectionLayout
            title="Patientes"
            form={
              <form
                className="stack compact"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitResource("patients", "patients");
                }}
              >
                <label>
                  Nom complet
                  <input value={forms.patients.fullName} onChange={(event) => updateForm("patients", { ...forms.patients, fullName: event.target.value }, setForms)} />
                </label>
                <label>
                  Age
                  <input type="number" value={forms.patients.age} onChange={(event) => updateForm("patients", { ...forms.patients, age: event.target.value }, setForms)} />
                </label>
                <label>
                  Telephone
                  <input value={forms.patients.phone} onChange={(event) => updateForm("patients", { ...forms.patients, phone: event.target.value }, setForms)} />
                </label>
                <label>
                  Semaines de grossesse
                  <input type="number" value={forms.patients.pregnancyWeeks} onChange={(event) => updateForm("patients", { ...forms.patients, pregnancyWeeks: event.target.value }, setForms)} />
                </label>
                <label>
                  Statut
                  <select
                    value={forms.patients.serviceStatusId}
                    onChange={(event) => updateForm("patients", { ...forms.patients, serviceStatusId: event.target.value }, setForms)}
                  >
                    <option value="">Selectionner un statut</option>
                    {data.serviceStatuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="hint">
                  Prix automatique: {getSelectedStatusPrice(data.serviceStatuses, forms.patients.serviceStatusId)} FCFA
                </p>
                <label>
                  Antecedents
                  <input value={forms.patients.history} onChange={(event) => updateForm("patients", { ...forms.patients, history: event.target.value }, setForms)} />
                </label>
                <button type="submit">Enregistrer</button>
              </form>
            }
          >
            <PatientList rows={data.patients} serviceStatuses={data.serviceStatuses} onAssignStatus={assignPatientStatus} />
          </SectionLayout>
        )}

        {activeSection === "serviceStatuses" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Statuts et tarifs</h3>
              {session.role !== "admin" ? (
                <p className="muted">Seul l'administrateur peut gerer les statuts.</p>
              ) : (
                <ServiceStatusList rows={data.serviceStatuses} onSave={(id, payload) => apiRequest(`/service-statuses/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then(loadAll).catch((e) => setError(e.message))} />
              )}
            </article>
            <article className="panel">
              <h3>Ajouter un statut</h3>
              {session.role !== "admin" ? (
                <p className="muted">Seul l'administrateur peut ajouter des statuts.</p>
              ) : (
                <ResourceForm
                  fields={[["label", "Libelle"], ["price", "Prix", "number"]]}
                  value={forms.serviceStatuses}
                  onChange={(value) => updateForm("serviceStatuses", value, setForms)}
                  onSubmit={() => submitResource("serviceStatuses", "serviceStatuses")}
                />
              )}
            </article>
          </section>
        )}

        {activeSection === "appointments" && (
          <SectionLayout
            title="Rendez-vous"
            form={
              <ResourceForm
                fields={[["patientName", "Patiente"], ["service", "Service"], ["staffName", "Responsable"], ["date", "Date", "date"], ["time", "Heure", "time"], ["status", "Statut"]]}
                value={forms.appointments}
                onChange={(value) => updateForm("appointments", value, setForms)}
                onSubmit={() => submitResource("appointments", "appointments")}
              />
            }
          >
            <SimpleTable rows={data.appointments} columns={["patientName", "service", "staffName", "date", "time", "status"]} />
          </SectionLayout>
        )}

        {activeSection === "births" && (
          <SectionLayout
            title="Naissances"
            form={
              <ResourceForm
                fields={[["motherName", "Mere"], ["babyName", "Bebe"], ["sex", "Sexe"], ["weightKg", "Poids (kg)", "number"], ["heightCm", "Taille (cm)", "number"], ["deliveryType", "Type d'accouchement"], ["complications", "Complications"], ["birthDate", "Date", "date"], ["birthTime", "Heure", "time"], ["motherStatus", "Etat de la mere"], ["babyStatus", "Etat du bebe"]]}
                value={forms.births}
                onChange={(value) => updateForm("births", value, setForms)}
                onSubmit={() => submitResource("births", "births")}
              />
            }
          >
            <SimpleTable rows={data.births} columns={["motherName", "babyName", "deliveryType", "birthDate", "motherStatus", "babyStatus"]} />
          </SectionLayout>
        )}

        {activeSection === "inventory" && (
          <SectionLayout
            title="Pharmacie"
            form={
              <div className="stack">
                <form
                  className="stack compact"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitResource("inventory", "inventory");
                  }}
                >
                  <label>
                    Produit
                    <input value={forms.inventory.name} onChange={(event) => updateForm("inventory", { ...forms.inventory, name: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Categorie
                    <input value={forms.inventory.category} onChange={(event) => updateForm("inventory", { ...forms.inventory, category: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Photo du produit
                    <input type="file" accept="image/*" onChange={(event) => handleInventoryPhotoUpload(event.target.files?.[0])} />
                  </label>
                  {forms.inventory.photo ? <img className="product-photo" src={forms.inventory.photo} alt="Apercu produit" /> : null}
                  <label>
                    Quantite
                    <input type="number" value={forms.inventory.quantity} onChange={(event) => updateForm("inventory", { ...forms.inventory, quantity: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Unite
                    <input value={forms.inventory.unit} onChange={(event) => updateForm("inventory", { ...forms.inventory, unit: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Seuil d'alerte
                    <input type="number" value={forms.inventory.lowStockThreshold} onChange={(event) => updateForm("inventory", { ...forms.inventory, lowStockThreshold: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Prix
                    <input type="number" value={forms.inventory.price} onChange={(event) => updateForm("inventory", { ...forms.inventory, price: event.target.value }, setForms)} />
                  </label>
                  <button type="submit">Enregistrer</button>
                </form>

                <form className="stack compact top-divider" onSubmit={submitPharmacySale}>
                  <h3>Vendre un produit</h3>
                  <label>
                    Produit
                    <select
                      value={forms.pharmacySale.productId}
                      onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, productId: event.target.value }, setForms)}
                    >
                      <option value="">Selectionner un produit</option>
                      {data.inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.price} FCFA - stock {item.quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantite
                    <input
                      type="number"
                      min="1"
                      value={forms.pharmacySale.quantity}
                      onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, quantity: event.target.value }, setForms)}
                    />
                  </label>
                  <label>
                    Client
                    <select
                      value={forms.pharmacySale.customerType}
                      onChange={(event) =>
                        updateForm(
                          "pharmacySale",
                          {
                            ...forms.pharmacySale,
                            customerType: event.target.value
                          },
                          setForms
                        )
                      }
                    >
                      <option value="existing">Patiente existante</option>
                      <option value="new">Nouveau client</option>
                    </select>
                  </label>
                  {forms.pharmacySale.customerType === "existing" ? (
                    <label>
                      Patiente
                      <select
                        value={forms.pharmacySale.patientId}
                        onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, patientId: event.target.value }, setForms)}
                      >
                        <option value="">Selectionner une patiente</option>
                        {data.patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.fullName} - {patient.phone || "-"}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        Nom du client
                        <input
                          value={forms.pharmacySale.customerName}
                          onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, customerName: event.target.value }, setForms)}
                        />
                      </label>
                      <label>
                        Age
                        <input
                          value={forms.pharmacySale.customerAge}
                          onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, customerAge: event.target.value }, setForms)}
                        />
                      </label>
                      <label>
                        Telephone
                        <input
                          value={forms.pharmacySale.customerPhone}
                          onChange={(event) => updateForm("pharmacySale", { ...forms.pharmacySale, customerPhone: event.target.value }, setForms)}
                        />
                      </label>
                    </>
                  )}
                  <p className="hint">
                    Montant total: {getPharmacySaleTotal(data.inventory, forms.pharmacySale.productId, forms.pharmacySale.quantity)} FCFA
                  </p>
                  <button type="submit">Valider la vente et generer le recu</button>
                </form>
              </div>
            }
          >
            <InventoryList rows={data.inventory} />
          </SectionLayout>
        )}

        {activeSection === "finance" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Patientes en attente de paiement</h3>
              <PendingPaymentsList rows={data.patients.filter((item) => item.paymentStatus !== "Paiement effectue a la caisse" && item.serviceStatusLabel)} onPay={payPatientStatus} />
            </article>
            <article className="panel">
              <h3>Factures et paiements</h3>
              <ResourceForm
                fields={[["patientName", "Patiente"], ["item", "Prestation"], ["amount", "Montant", "number"], ["status", "Statut"], ["paymentMethod", "Mode de paiement"]]}
                value={forms.invoices}
                onChange={(value) => updateForm("invoices", value, setForms)}
                onSubmit={() => submitResource("invoices", "invoices")}
              />
              <InvoicesList rows={data.invoices} />
            </article>
            <article className="panel">
              <h3>Depenses</h3>
              <ResourceForm
                fields={[["label", "Libelle"], ["amount", "Montant", "number"], ["category", "Categorie"]]}
                value={forms.expenses}
                onChange={(value) => updateForm("expenses", value, setForms)}
                onSubmit={() => submitResource("expenses", "expenses")}
              />
              <SimpleTable rows={data.expenses} columns={["label", "amount", "category", "createdAt"]} />
            </article>
          </section>
        )}

        {activeSection === "staff" && (
          <SectionLayout
            title="Personnel"
            form={
              <ResourceForm
                fields={[["fullName", "Nom complet"], ["role", "Role"], ["department", "Service"], ["phone", "Telephone"], ["schedule", "Planning"], ["performanceScore", "Performance", "number"]]}
                value={forms.staff}
                onChange={(value) => updateForm("staff", value, setForms)}
                onSubmit={() => submitResource("staff", "staff")}
              />
            }
          >
            <SimpleTable rows={data.staff} columns={["fullName", "role", "department", "phone", "schedule", "performanceScore"]} />
          </SectionLayout>
        )}

        {activeSection === "users" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Gestion des utilisateurs</h3>
              {session.role !== "admin" ? (
                <p className="muted">Acces reserve a l'administrateur.</p>
              ) : (
                <div className="stack">
                  {data.users.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onToggle={() => toggleUserActivation(user)}
                      onResetPassword={() => resetPassword(user)}
                      onSave={savePermissions}
                      onUpdate={updateUser}
                    />
                  ))}
                </div>
              )}
            </article>
            <article className="panel">
              <h3>Creer un utilisateur</h3>
              {session.role !== "admin" ? (
                <p className="muted">Seul l'administrateur peut creer des comptes.</p>
              ) : (
                <form
                  className="stack compact"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createUser();
                  }}
                >
                  <label>
                    Nom complet
                    <input value={forms.users.fullName} onChange={(event) => updateForm("users", { ...forms.users, fullName: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={forms.users.email} onChange={(event) => updateForm("users", { ...forms.users, email: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Role
                    <input value={forms.users.role} onChange={(event) => updateForm("users", { ...forms.users, role: event.target.value }, setForms)} />
                  </label>
                  <label>
                    Mot de passe initial
                    <input value={forms.users.password} onChange={(event) => updateForm("users", { ...forms.users, password: event.target.value }, setForms)} />
                  </label>
                  <PermissionSelector
                    selected={forms.users.permissions}
                    onChange={(permissions) => updateForm("users", { ...forms.users, permissions }, setForms)}
                  />
                  <label className="checkbox-row">
                    <input type="checkbox" checked={forms.users.isActive} onChange={(event) => updateForm("users", { ...forms.users, isActive: event.target.checked }, setForms)} />
                    Compte actif
                  </label>
                  <button type="submit">Creer le compte</button>
                </form>
              )}
            </article>
          </section>
        )}

        {activeSection === "activity" && (
          <section className="stack">
            <article className="panel">
              <h3>Connexions et actions des utilisateurs</h3>
              {session.role !== "admin" ? (
                <p className="muted">Acces reserve a l'administrateur.</p>
              ) : (
                <AuditTable rows={data.logs} />
              )}
            </article>
            <article className="panel">
              <h3>Ventes en caisse</h3>
              {session.role !== "admin" ? (
                <p className="muted">Acces reserve a l'administrateur.</p>
              ) : (
                <SalesTable rows={data.sales} />
              )}
            </article>
          </section>
        )}

        {activeSection === "reports" && (
          <section className="stack">
            <article className="panel">
              <h3>Filtrer les rapports</h3>
              <form
                className="report-filter"
                onSubmit={(event) => {
                  event.preventDefault();
                  loadAll();
                }}
              >
                <label>
                  Type de periode
                  <select
                    value={reportFilter.mode}
                    onChange={(event) => setReportFilter({ ...reportFilter, mode: event.target.value })}
                  >
                    <option value="all">Tout</option>
                    <option value="date">Par date</option>
                    <option value="month">Par mois</option>
                    <option value="year">Par annee</option>
                  </select>
                </label>
                {reportFilter.mode === "date" ? (
                  <label>
                    Date
                    <input
                      type="date"
                      value={reportFilter.date}
                      onChange={(event) => setReportFilter({ ...reportFilter, date: event.target.value })}
                    />
                  </label>
                ) : null}
                {reportFilter.mode === "month" ? (
                  <label>
                    Mois
                    <input
                      type="month"
                      value={reportFilter.month}
                      onChange={(event) => setReportFilter({ ...reportFilter, month: event.target.value })}
                    />
                  </label>
                ) : null}
                {reportFilter.mode === "year" ? (
                  <label>
                    Annee
                    <input
                      type="number"
                      value={reportFilter.year}
                      onChange={(event) => setReportFilter({ ...reportFilter, year: event.target.value })}
                    />
                  </label>
                ) : null}
                <button type="submit">Voir le rapport</button>
              </form>
            </article>

            <div className="grid two-columns">
              <article className="panel">
                <h3>Rapport medical</h3>
                {data.reports?.medical ? (
                  <div className="report-list">
                    <p>Total patientes: {data.reports.medical.totalPatients}</p>
                    <p>Accouchements sur la periode: {data.reports.medical.birthsCount}</p>
                    <p>Accouchements naturels: {data.reports.medical.naturalBirths}</p>
                    <p>Cesariennes: {data.reports.medical.cSections}</p>
                    <p>Cas avec complications: {data.reports.medical.complications}</p>
                  </div>
                ) : (
                  <p className="muted">Acces reserve aux profils medicaux et administratifs.</p>
                )}
              </article>
              <article className="panel">
                <h3>Rapport financier</h3>
                {data.reports?.financial ? (
                  <div className="report-list">
                    <p>Revenus totaux: {data.reports.financial.totalRevenue} FCFA</p>
                    <p>Depenses totales: {data.reports.financial.totalExpenses} FCFA</p>
                    <p>Nombre de factures: {data.reports.financial.invoiceCount}</p>
                    <p>Nombre de depenses: {data.reports.financial.expenseCount}</p>
                  </div>
                ) : (
                  <p className="muted">Acces reserve aux profils financiers et administratifs.</p>
                )}
              </article>
            </div>

            <article className="panel">
              <h3>Liste des accouchements sur la periode</h3>
              {data.reports?.medical ? (
                <SimpleTable
                  rows={data.reports.medical.births || []}
                  columns={["motherName", "babyName", "deliveryType", "birthDate", "birthTime", "motherStatus", "babyStatus"]}
                />
              ) : (
                <p className="muted">Acces reserve aux profils medicaux et administratifs.</p>
              )}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

function updateForm(key, value, setForms) {
  setForms((current) => ({ ...current, [key]: value }));
}

function SectionLayout({ title, form, children }) {
  return (
    <section className="grid two-columns">
      <article className="panel">
        <h3>{title}</h3>
        {children}
      </article>
      <article className="panel">
        <h3>Ajouter</h3>
        {form}
      </article>
    </section>
  );
}

function ResourceForm({ fields, value, onChange, onSubmit }) {
  return (
    <form
      className="stack compact"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {fields.map(([name, label, type = "text"]) => (
        <label key={name}>
          {label}
          <input type={type} value={value[name] ?? ""} onChange={(event) => onChange({ ...value, [name]: event.target.value })} />
        </label>
      ))}
      <button type="submit">Enregistrer</button>
    </form>
  );
}

function SimpleTable({ rows, columns }) {
  if (!rows?.length) {
    return <p className="muted">Aucune donnee disponible.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? "-")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryList({ rows }) {
  if (!rows?.length) {
    return <p className="muted">Aucune donnee disponible.</p>;
  }

  return (
    <div className="inventory-grid">
      {rows.map((row) => (
        <article key={row.id} className="inventory-card">
          {row.photo ? <img className="product-photo" src={row.photo} alt={row.name} /> : null}
          <strong>{row.name}</strong>
          <p className="muted">{row.category}</p>
          <p>Stock: {row.quantity} {row.unit}</p>
          <p>Prix: {row.price} FCFA</p>
          <p>Seuil: {row.lowStockThreshold}</p>
        </article>
      ))}
    </div>
  );
}

function PatientList({ rows, serviceStatuses, onAssignStatus }) {
  if (!rows?.length) {
    return <p className="muted">Aucune donnee disponible.</p>;
  }

  return (
    <div className="stack">
      {rows.map((row) => (
        <PatientCard key={row.id} patient={row} serviceStatuses={serviceStatuses} onAssignStatus={onAssignStatus} />
      ))}
    </div>
  );
}

function PatientCard({ patient, serviceStatuses, onAssignStatus }) {
  const [nextStatusId, setNextStatusId] = useState("");

  return (
    <article className="user-card">
      <div className="user-card-head">
        <div>
          <strong>{patient.fullName}</strong>
          <p className="muted">{patient.phone || "-"}</p>
        </div>
        <span className={patient.paymentStatus === "Paiement effectue a la caisse" ? "status-active" : "status-inactive"}>
          {patient.paymentStatus || "En attente"}
        </span>
      </div>
      <p><strong>Statut actif :</strong> {patient.serviceStatusLabel || patient.status || "-"}</p>
      <p><strong>Prix :</strong> {patient.servicePrice || 0} FCFA</p>
      <p><strong>Grossesse :</strong> {patient.pregnancyWeeks || "-"} semaines</p>
      <label>
        Continuer avec un autre statut
        <select value={nextStatusId} onChange={(event) => setNextStatusId(event.target.value)}>
          <option value="">Selectionner un statut</option>
          {serviceStatuses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} - {item.price} FCFA
            </option>
          ))}
        </select>
      </label>
      <div className="user-actions">
        <button type="button" onClick={() => onAssignStatus(patient.id, nextStatusId)}>
          Affecter le statut
        </button>
      </div>
    </article>
  );
}

function ServiceStatusList({ rows, onSave }) {
  if (!rows?.length) {
    return <p className="muted">Aucun statut configure.</p>;
  }

  return (
    <div className="stack">
      {rows.map((row) => (
        <ServiceStatusCard key={row.id} item={row} onSave={onSave} />
      ))}
    </div>
  );
}

function ServiceStatusCard({ item, onSave }) {
  const [label, setLabel] = useState(item.label);
  const [price, setPrice] = useState(item.price);

  useEffect(() => {
    setLabel(item.label);
    setPrice(item.price);
  }, [item]);

  return (
    <article className="user-card">
      <label>
        Libelle
        <input value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <label>
        Prix
        <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
      </label>
      <div className="user-actions">
        <button type="button" onClick={() => onSave(item.id, { label, price })}>
          Enregistrer
        </button>
      </div>
    </article>
  );
}

function PendingPaymentsList({ rows, onPay }) {
  if (!rows?.length) {
    return <p className="muted">Aucune patiente en attente de paiement.</p>;
  }

  return (
    <div className="stack">
      {rows.map((row) => (
        <article key={row.id} className="user-card">
          <strong>{row.fullName}</strong>
          <p className="muted">{row.serviceStatusLabel || "-"}</p>
          <p>Montant a payer: {row.servicePrice || 0} FCFA</p>
          <p>Etat: {row.paymentStatus || "En attente"}</p>
          <div className="user-actions">
            <button type="button" onClick={() => onPay(row.id)}>
              Valider le paiement a la caisse
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function InvoicesList({ rows }) {
  if (!rows?.length) {
    return <p className="muted">Aucune donnee disponible.</p>;
  }

  return (
    <div className="stack">
      {rows.map((row) => (
        <article key={row.id} className="user-card">
          <div className="user-card-head">
            <div>
              <strong>{row.patientName || "-"}</strong>
              <p className="muted">{row.item || "-"}</p>
            </div>
            <span className="status-active">{row.status || "-"}</span>
          </div>
          <p>Montant: {row.amount || 0} FCFA</p>
          <p>Mode de paiement: {row.paymentMethod || "-"}</p>
          <div className="user-actions">
            <button
              type="button"
              onClick={() =>
                downloadReceipt({
                  clinicName: row.clinicName || "",
                  clinicLogo: row.clinicLogo || "",
                  patientName: row.patientName || "",
                  patientAge: row.patientAge || "",
                  patientPhone: row.patientPhone || "",
                  status: row.item || "",
                  amount: row.amount || 0,
                  paidAt: row.paidAt || row.createdAt,
                  cashierName: row.createdByName || ""
                })
              }
            >
              Telecharger le recu
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AuditTable({ rows }) {
  if (!rows?.length) {
    return <p className="muted">Aucune activite enregistree.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>Date</th>
            <th>Heure</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { date, time } = formatLogDate(row.createdAt);
            return (
              <tr key={row.id}>
                <td>{row.actorName || "-"}</td>
                <td>{humanizeAction(row.action)}</td>
                <td>{date}</td>
                <td>{time}</td>
                <td>{buildLogDetails(row)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SalesTable({ rows }) {
  if (!rows?.length) {
    return <p className="muted">Aucune vente enregistree.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Vendeur</th>
            <th>Patiente</th>
            <th>Article</th>
            <th>Montant</th>
            <th>Date</th>
            <th>Heure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { date, time } = formatLogDate(row.createdAt);
            return (
              <tr key={row.id}>
                <td>{row.actorName || "-"}</td>
                <td>{row.metadata?.patientName || "-"}</td>
                <td>{row.metadata?.item || "-"}</td>
                <td>{row.metadata?.amount || 0} FCFA</td>
                <td>{date}</td>
                <td>{time}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserCard({ user, onToggle, onResetPassword, onSave, onUpdate }) {
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState(user.permissions || []);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);

  useEffect(() => {
    setRole(user.role);
    setPermissions(user.permissions || []);
    setFullName(user.fullName);
    setEmail(user.email);
  }, [user]);

  return (
    <article className="user-card">
      <div className="user-card-head">
        <div>
          <strong>{user.fullName}</strong>
          <p className="muted">{user.email}</p>
        </div>
        <span className={user.isActive ? "status-active" : "status-inactive"}>
          {user.isActive ? "Actif" : "Inactif"}
        </span>
      </div>
      <label>
        Nom complet
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Role
        <input value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <PermissionSelector selected={permissions} onChange={setPermissions} />
      <div className="user-actions">
        <button
          type="button"
          onClick={() => onUpdate(user.id, { fullName, email, role })}
        >
          Modifier profil
        </button>
        <button type="button" onClick={() => onSave(user, permissions, role)}>
          Enregistrer les droits
        </button>
        <button type="button" className="secondary" onClick={onToggle}>
          {user.isActive ? "Desactiver" : "Activer"}
        </button>
        <button type="button" className="secondary" onClick={onResetPassword}>
          Reinitialiser mot de passe
        </button>
      </div>
    </article>
  );
}

function PermissionSelector({ selected, onChange }) {
  return (
    <fieldset className="permission-box">
      <legend>Permissions</legend>
      <div className="permission-grid">
        {availablePermissions.map((permission) => (
          <label key={permission.key} className="checkbox-row">
            <input
              type="checkbox"
              checked={selected.includes(permission.key)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...selected, permission.key]);
                } else {
                  onChange(selected.filter((item) => item !== permission.key));
                }
              }}
            />
            {permission.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function canAccessSection(session, sectionKey) {
  if (!session) {
    return false;
  }

  if (sectionKey === "dashboard") {
    return true;
  }

  if (session.role === "admin") {
    return true;
  }

  return Array.isArray(session.permissions) && session.permissions.includes(sectionKey);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildReportQuery(filter) {
  const params = new URLSearchParams();
  params.set("mode", filter.mode || "all");

  if (filter.mode === "date" && filter.date) {
    params.set("date", filter.date);
  }

  if (filter.mode === "month" && filter.month) {
    params.set("month", filter.month);
  }

  if (filter.mode === "year" && filter.year) {
    params.set("year", filter.year);
  }

  return `?${params.toString()}`;
}

function formatLogDate(value) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("fr-FR"),
    time: date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

function humanizeAction(action) {
  const map = {
    "auth:login": "Connexion",
    "create:patients": "Creation patiente",
    "create:serviceStatuses": "Creation statut",
    "create:appointments": "Creation rendez-vous",
    "create:births": "Enregistrement accouchement",
    "create:inventory": "Ajout produit pharmacie",
    "create:invoices": "Vente / facture",
    "pharmacy:sale": "Vente pharmacie",
    "create:expenses": "Enregistrement depense",
    "create:users": "Creation utilisateur",
    "update:user": "Modification utilisateur",
    "update:serviceStatus": "Modification statut",
    "assign:patientStatus": "Affectation statut patiente",
    "cashier:paymentCompleted": "Paiement effectue a la caisse",
    "update:clinic": "Modification clinique",
    "create:clinic": "Creation clinique"
  };

  return map[action] || action;
}

function buildLogDetails(row) {
  if (row.action === "auth:login") {
    return `${row.metadata?.email || ""} (${row.metadata?.role || ""})`;
  }

  if (row.action === "create:invoices") {
    return `${row.metadata?.item || "-"} / ${row.metadata?.amount || 0} FCFA`;
  }

  if (row.action === "update:user") {
    return `${row.details || "-"} / ${row.metadata?.role || ""}`;
  }

  if (row.action === "assign:patientStatus") {
    return `${row.metadata?.serviceStatusLabel || "-"} / ${row.metadata?.servicePrice || 0} FCFA`;
  }

  if (row.action === "cashier:paymentCompleted") {
    return `${row.metadata?.amount || 0} FCFA / ${row.metadata?.paymentMethod || "-"}`;
  }

  if (row.action === "pharmacy:sale") {
    return `${row.metadata?.customerName || "-"} / ${row.metadata?.amount || 0} FCFA`;
  }

  return row.details || "-";
}

function getSelectedStatusPrice(serviceStatuses, serviceStatusId) {
  const item = serviceStatuses.find((status) => status.id === serviceStatusId);
  return item ? item.price : 0;
}

function getPharmacySaleTotal(inventory, productId, quantity) {
  const item = inventory.find((product) => product.id === productId);
  return item ? Number(item.price || 0) * Number(quantity || 0) : 0;
}

function downloadReceipt(receipt) {
  if (!receipt) {
    return;
  }

  const paidDate = new Date(receipt.paidAt || Date.now());
  const dateText = paidDate.toLocaleDateString("fr-FR");
  const timeText = paidDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Recu de paiement</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #143126; }
      .card { max-width: 720px; margin: 0 auto; border: 1px solid #d9e5de; border-radius: 18px; padding: 24px; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
      .logo { width: 84px; height: 84px; object-fit: cover; border-radius: 16px; border: 1px solid #d9e5de; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 6px 0; }
      .row { padding: 10px 0; border-bottom: 1px solid #eef4f0; }
      .strong { font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="head">
        <div>
          <h1>${escapeHtml(receipt.clinicName || "Clinique")}</h1>
          <p>Recu de paiement</p>
        </div>
        ${receipt.clinicLogo ? `<img class="logo" src="${receipt.clinicLogo}" alt="Logo clinique" />` : ""}
      </div>
      <div class="row"><span class="strong">Date :</span> ${dateText}</div>
      <div class="row"><span class="strong">Heure :</span> ${timeText}</div>
      <div class="row"><span class="strong">Patiente :</span> ${escapeHtml(receipt.patientName || "-")}</div>
      <div class="row"><span class="strong">Age :</span> ${escapeHtml(String(receipt.patientAge || "-"))}</div>
      <div class="row"><span class="strong">Telephone :</span> ${escapeHtml(receipt.patientPhone || "-")}</div>
      <div class="row"><span class="strong">Statut :</span> ${escapeHtml(receipt.status || "-")}</div>
      <div class="row"><span class="strong">Montant paye :</span> ${escapeHtml(String(receipt.amount || 0))} FCFA</div>
      <div class="row"><span class="strong">Caisse :</span> ${escapeHtml(receipt.cashierName || "-")}</div>
    </div>
  </body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `recu-${slugify(receipt.patientName || "patiente")}-${paidDate.toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
