const TOKEN_KEY = "numrapidepro_token";
const USER_KEY = "numrapidepro_user";

const state = {
  session: loadUser(),
  data: null,
  feedback: "",
  error: "",
  authMode: "login",
  pendingPhone: "",
  pendingCode: ""
};

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Erreur reseau.");
  }
  return data;
}

async function loadApp() {
  if (!state.session) {
    return;
  }
  try {
    state.data = await api("/api/bootstrap");
    state.error = "";
  } catch (error) {
    state.error = error.message;
  }
  render();
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  state.feedback = "";
  state.error = "";

  try {
    if (form.dataset.form === "request-otp") {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.pendingPhone = payload.phone;
      state.feedback = `Code demo: ${result.debugCode}`;
    }

    if (form.dataset.form === "verify-otp") {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      state.session = result.user;
      state.pendingCode = "";
      await loadApp();
      return;
    }

    if (form.dataset.form === "deposit") {
      const payload = Object.fromEntries(new FormData(form).entries());
      await api("/api/deposits", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.feedback = "Demande de depot envoyee.";
      await loadApp();
      return;
    }

    if (form.dataset.form === "filter-admin") {
      const params = new URLSearchParams(Object.fromEntries(new FormData(form).entries()));
      state.data.adminData = await api(`/api/admin/overview?${params.toString()}`);
      state.feedback = "Filtre applique.";
      render();
      return;
    }
  } catch (error) {
    state.error = error.message;
  }

  render();
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  state.feedback = "";
  state.error = "";

  try {
    if (action === "set-mode") {
      state.authMode = target.dataset.mode;
    }

    if (action === "logout") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      state.session = null;
      state.data = null;
    }

    if (action === "buy-country") {
      await api("/api/purchases", {
        method: "POST",
        body: JSON.stringify({ countryCode: target.dataset.code })
      });
      state.feedback = "Numero attribue avec code demo genere localement.";
      await loadApp();
      return;
    }

    if (action === "approve-deposit") {
      await api(`/api/admin/deposits/${target.dataset.id}/approve`, {
        method: "POST"
      });
      state.feedback = "Depot approuve.";
      await loadApp();
      return;
    }

    if (action === "save-country") {
      const card = target.closest(".country-editor");
      const payload = {
        price: Number(card.querySelector("[name='price']").value),
        available: Number(card.querySelector("[name='available']").value),
        active: card.querySelector("[name='active']").checked
      };
      await api(`/api/admin/countries/${target.dataset.code}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      state.feedback = "Pays mis a jour.";
      await loadApp();
      return;
    }
  } catch (error) {
    state.error = error.message;
  }

  render();
});

function render() {
  const root = document.getElementById("app");
  root.innerHTML = state.session ? renderDashboard() : renderAuth();
}

function renderAuth() {
  return `
    <div class="auth-shell">
      <section class="card auth-card">
        <p class="eyebrow">Application separee</p>
        <h1>NumRapidePro</h1>
        <p class="lead">Connexion par numero de telephone, wallet, achats par pays et panneau admin.</p>
        <div class="notice">Cette app n'utilise pas les API ni le scraping de temp-number.com. Le fournisseur est simule en mode demo-safe.</div>
        <div class="switch-row">
          <button class="${state.authMode === "login" ? "chip active" : "chip"}" data-action="set-mode" data-mode="login" type="button">Connexion</button>
          <button class="${state.authMode === "signup" ? "chip active" : "chip"}" data-action="set-mode" data-mode="signup" type="button">Creer un compte</button>
        </div>
        <form class="stack" data-form="request-otp">
          <input type="hidden" name="mode" value="${state.authMode}" />
          ${state.authMode === "signup" ? '<label>Nom complet<input name="fullName" required /></label>' : ""}
          <label>Numero de telephone<input name="phone" placeholder="+22997000000" required /></label>
          <button type="submit">Recevoir un code</button>
        </form>
        <form class="stack top-space" data-form="verify-otp">
          <label>Numero de telephone<input name="phone" value="${state.pendingPhone}" placeholder="+22997000000" required /></label>
          <label>Code OTP<input name="code" placeholder="123456" required /></label>
          <button type="submit">Valider</button>
        </form>
        <div class="demo-box">
          <strong>Comptes demo</strong>
          <p>Admin: +22997000000</p>
          <p>Client: +22996000001</p>
        </div>
        ${state.feedback ? `<p class="success">${state.feedback}</p>` : ""}
        ${state.error ? `<p class="error">${state.error}</p>` : ""}
      </section>
    </div>
  `;
}

function renderDashboard() {
  if (!state.data) {
    loadApp();
    return `<div class="loading">Chargement...</div>`;
  }

  return `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Tableau de bord</p>
          <h1>${state.data.appName}</h1>
          <p class="muted">${state.data.currentUser.fullName} - ${state.data.currentUser.phone} - ${state.data.currentUser.role}</p>
        </div>
        <div class="topbar-actions">
          <span class="pill">Solde: ${money(state.data.currentUser.balance, state.data.currency)}</span>
          <button data-action="logout" type="button">Se deconnecter</button>
        </div>
      </header>
      <section class="card hero">
        <div>
          <p class="eyebrow">Mode fournisseur</p>
          <h2>${state.data.providerMode}</h2>
          <p>${state.data.safeNotice}</p>
        </div>
      </section>
      ${state.feedback ? `<p class="card success">${state.feedback}</p>` : ""}
      ${state.error ? `<p class="card error">${state.error}</p>` : ""}
      ${state.data.currentUser.role === "admin" ? renderAdmin() : renderUser()}
    </div>
  `;
}

function renderUser() {
  return `
    <section class="grid metrics">
      <article class="card metric"><span>Solde</span><strong>${money(state.data.currentUser.balance, state.data.currency)}</strong></article>
      <article class="card metric"><span>Depots</span><strong>${state.data.userData.deposits.length}</strong></article>
      <article class="card metric"><span>Achats</span><strong>${state.data.userData.purchases.length}</strong></article>
    </section>
    <section class="grid two">
      <article class="card">
        <h3>Faire un depot</h3>
        <form class="stack" data-form="deposit">
          <label>Moyen de paiement
            <select name="method">${state.data.paymentMethods.map((item) => `<option value="${item}">${item}</option>`).join("")}</select>
          </label>
          <label>Montant<input name="amount" type="number" min="1" value="5000" required /></label>
          <label>Reference<input name="reference" placeholder="MTN-TRX-001" /></label>
          <button type="submit">Envoyer</button>
        </form>
      </article>
      <article class="card">
        <h3>Acheter un numero</h3>
        <div class="country-grid">
          ${state.data.countries.filter((item) => item.active).map((country) => `
            <button class="country-card" data-action="buy-country" data-code="${country.code}" type="button">
              <strong>${country.name}</strong>
              <span>${country.dialCode}</span>
              <span>${money(country.price, state.data.currency)}</span>
              <span>${country.available} disponibles</span>
            </button>
          `).join("")}
        </div>
      </article>
    </section>
    <section class="grid two">
      <article class="card">
        <h3>Mes depots</h3>
        ${table(state.data.userData.deposits, ["createdAt", "method", "amount", "status"], state.data.currency)}
      </article>
      <article class="card">
        <h3>Mes numeros</h3>
        ${table(state.data.userData.purchases, ["createdAt", "countryName", "phoneNumber", "activationCode"], state.data.currency)}
      </article>
    </section>
  `;
}

function renderAdmin() {
  const admin = state.data.adminData;
  return `
    <section class="grid metrics">
      <article class="card metric"><span>Soldes clients</span><strong>${money(admin.totals.walletBalances, state.data.currency)}</strong></article>
      <article class="card metric"><span>Depots approuves</span><strong>${money(admin.totals.approvedDeposits, state.data.currency)}</strong></article>
      <article class="card metric"><span>Achats</span><strong>${admin.totals.purchasesCount}</strong></article>
      <article class="card metric"><span>Revenus</span><strong>${money(admin.totals.purchaseRevenue, state.data.currency)}</strong></article>
    </section>
    <article class="card">
      <h3>Filtrer par jour, mois, annee</h3>
      <form class="filter-grid" data-form="filter-admin">
        <label>Mode
          <select name="mode">
            <option value="all">Tout</option>
            <option value="date">Jour</option>
            <option value="month">Mois</option>
            <option value="year">Annee</option>
          </select>
        </label>
        <label>Date<input type="date" name="date" /></label>
        <label>Mois<input type="month" name="month" /></label>
        <label>Annee<input name="year" value="2026" /></label>
        <button type="submit">Filtrer</button>
      </form>
    </article>
    <section class="grid two">
      <article class="card">
        <h3>Configuration des pays</h3>
        <div class="stack">
          ${state.data.countries.map((country) => `
            <div class="country-editor">
              <strong>${country.name}</strong>
              <label>Prix<input name="price" type="number" value="${country.price}" /></label>
              <label>Disponibles<input name="available" type="number" value="${country.available}" /></label>
              <label class="toggle"><input name="active" type="checkbox" ${country.active ? "checked" : ""} /> Actif</label>
              <button data-action="save-country" data-code="${country.code}" type="button">Enregistrer</button>
            </div>
          `).join("")}
        </div>
      </article>
      <article class="card">
        <h3>Depots en attente</h3>
        <div class="stack">
          ${admin.deposits.filter((item) => item.status === "pending").map((item) => `
            <div class="deposit-card">
              <strong>${item.userName}</strong>
              <p>${item.userPhone}</p>
              <p>${item.method} - ${money(item.amount, state.data.currency)}</p>
              <button data-action="approve-deposit" data-id="${item.id}" type="button">Approuver</button>
            </div>
          `).join("") || '<p class="muted">Aucun depot en attente.</p>'}
        </div>
      </article>
    </section>
    <section class="grid two">
      <article class="card">
        <h3>Achats des utilisateurs</h3>
        ${table(admin.purchases, ["createdAt", "userPhone", "countryName", "phoneNumber", "amount"], state.data.currency)}
      </article>
      <article class="card">
        <h3>Soldes utilisateurs</h3>
        ${table(admin.users, ["fullName", "phone", "balance"], state.data.currency)}
      </article>
    </section>
  `;
}

function table(rows, keys, currency) {
  if (!rows.length) {
    return '<p class="muted">Aucune donnee.</p>';
  }
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${keys.map((key) => `<th>${key}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${keys.map((key) => `<td>${formatValue(key, row[key], currency)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatValue(key, value, currency) {
  if (key === "amount" || key === "balance") {
    return money(value, currency);
  }
  if (key === "createdAt") {
    return new Date(value).toLocaleString("fr-FR");
  }
  return value ?? "-";
}

function money(value, currency) {
  return `${Number(value || 0).toLocaleString("fr-FR")} ${currency}`;
}

function loadUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
