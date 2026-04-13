import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

const sections = [
  { key: "dashboard", label: "Dashboard" },
  { key: "patients", label: "Patientes" },
  { key: "appointments", label: "Rendez-vous" },
  { key: "births", label: "Naissances" },
  { key: "inventory", label: "Pharmacie" },
  { key: "finance", label: "Caisse" },
  { key: "staff", label: "Personnel" },
  { key: "users", label: "Utilisateurs" },
  { key: "reports", label: "Rapports" }
];

const initialForms = {
  patients: { fullName: "", age: "", phone: "", pregnancyWeeks: "", status: "Suivi prenatal", history: "" },
  appointments: { patientName: "", service: "", staffName: "", date: "", time: "", status: "Confirme" },
  births: { motherName: "", babyName: "", sex: "Feminin", weightKg: "", heightCm: "", deliveryType: "Naturel", complications: "", birthDate: "", birthTime: "", motherStatus: "Stable", babyStatus: "Stable" },
  inventory: { name: "", category: "Medicament", quantity: "", unit: "", lowStockThreshold: "", price: "" },
  invoices: { patientName: "", item: "", amount: "", status: "Paye", paymentMethod: "Especes" },
  expenses: { label: "", amount: "", category: "General" },
  staff: { fullName: "", role: "", department: "", phone: "", schedule: "", performanceScore: "" },
  users: { fullName: "", email: "", role: "receptionist", password: "", permissionsText: "patients,appointments,invoices", isActive: true }
};

const availablePermissions = ["patients", "appointments", "births", "inventory", "finance", "reports", "staff", "users", "invoices"];

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [data, setData] = useState({
    dashboard: null,
    patients: [],
    appointments: [],
    births: [],
    inventory: [],
    invoices: [],
    expenses: [],
    staff: [],
    users: [],
    reports: null
  });
  const [forms, setForms] = useState(initialForms);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const requests = [
        apiRequest("/dashboard"),
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
      }

      const [dashboard, patients, appointments, births, inventory, invoices, expenses, staff, users = []] =
        await Promise.all(requests);

      let reports = null;
      try {
        reports = {
          medical: await apiRequest("/reports/medical"),
          financial: await apiRequest("/reports/financial")
        };
      } catch {
        reports = null;
      }

      setData({ dashboard, patients, appointments, births, inventory, invoices, expenses, staff, users, reports });
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
        permissions: parsePermissions(forms.users.permissionsText)
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

  async function savePermissions(user, permissionsText, role) {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
          permissions: parsePermissions(permissionsText)
        })
      });
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
          <h2>Maternite Espoir</h2>
          <p className="muted">{session.fullName}</p>
          <p className="badge">{session.role}</p>
        </div>
        <nav className="menu">
          {sections.map((section) => (
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
          <div className="status-pill">{loading ? "Chargement..." : "Synchronise"}</div>
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

        {activeSection === "patients" && (
          <SectionLayout
            title="Patientes"
            form={
              <ResourceForm
                fields={[["fullName", "Nom complet"], ["age", "Age", "number"], ["phone", "Telephone"], ["pregnancyWeeks", "Semaines de grossesse", "number"], ["status", "Statut"], ["history", "Antecedents"]]}
                value={forms.patients}
                onChange={(value) => updateForm("patients", value, setForms)}
                onSubmit={() => submitResource("patients", "patients")}
              />
            }
          >
            <SimpleTable rows={data.patients} columns={["fullName", "age", "phone", "pregnancyWeeks", "status"]} />
          </SectionLayout>
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
              <ResourceForm
                fields={[["name", "Produit"], ["category", "Categorie"], ["quantity", "Quantite", "number"], ["unit", "Unite"], ["lowStockThreshold", "Seuil d'alerte", "number"], ["price", "Prix", "number"]]}
                value={forms.inventory}
                onChange={(value) => updateForm("inventory", value, setForms)}
                onSubmit={() => submitResource("inventory", "inventory")}
              />
            }
          >
            <SimpleTable rows={data.inventory} columns={["name", "category", "quantity", "unit", "price"]} />
          </SectionLayout>
        )}

        {activeSection === "finance" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Factures et paiements</h3>
              <ResourceForm
                fields={[["patientName", "Patiente"], ["item", "Prestation"], ["amount", "Montant", "number"], ["status", "Statut"], ["paymentMethod", "Mode de paiement"]]}
                value={forms.invoices}
                onChange={(value) => updateForm("invoices", value, setForms)}
                onSubmit={() => submitResource("invoices", "invoices")}
              />
              <SimpleTable rows={data.invoices} columns={["patientName", "item", "amount", "status", "paymentMethod"]} />
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
                  <label>
                    Permissions
                    <input value={forms.users.permissionsText} onChange={(event) => updateForm("users", { ...forms.users, permissionsText: event.target.value }, setForms)} />
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={forms.users.isActive} onChange={(event) => updateForm("users", { ...forms.users, isActive: event.target.checked }, setForms)} />
                    Compte actif
                  </label>
                  <p className="hint">Permissions disponibles: {availablePermissions.join(", ")}</p>
                  <button type="submit">Creer le compte</button>
                </form>
              )}
            </article>
          </section>
        )}

        {activeSection === "reports" && (
          <section className="grid two-columns">
            <article className="panel">
              <h3>Rapport medical</h3>
              {data.reports?.medical ? (
                <div className="report-list">
                  <p>Total patientes: {data.reports.medical.totalPatients}</p>
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

function UserCard({ user, onToggle, onResetPassword, onSave }) {
  const [role, setRole] = useState(user.role);
  const [permissionsText, setPermissionsText] = useState((user.permissions || []).join(","));

  useEffect(() => {
    setRole(user.role);
    setPermissionsText((user.permissions || []).join(","));
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
        Role
        <input value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>
        Permissions
        <input value={permissionsText} onChange={(event) => setPermissionsText(event.target.value)} />
      </label>
      <div className="user-actions">
        <button type="button" onClick={() => onSave(user, permissionsText, role)}>
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

function parsePermissions(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
