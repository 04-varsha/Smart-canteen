/* staff.js - staff page only. Needs script.js loaded first (api, money, escapeHTML). */

// Online orders show a Paid / Unpaid badge; counter orders are paid at the counter
function paymentLabel(o) {
  if (o.payment !== "Pay online") return "Pay at counter";
  const cls = o.paymentStatus === "Paid" ? "paid" : "unpaid";
  return `Online <span class="badge ${cls}">${escapeHTML(o.paymentStatus)}</span>`;
}

/* ---------- Staff page ---------- */
function renderAdmin() {
  const form = document.getElementById("item-form");
  if (!form) return;

  const loginBox = document.getElementById("login-box");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const staffArea = document.getElementById("staff-area");
  const list = document.getElementById("admin-items");
  const ordersBox = document.getElementById("admin-orders");
  const idField = document.getElementById("item-id");
  const nameField = document.getElementById("item-name");
  const priceField = document.getElementById("item-price");
  const catField = document.getElementById("item-category");
  const emojiField = document.getElementById("item-emoji");
  const formError = document.getElementById("form-error");
  let menu = [];

  const STATUSES = ["Placed", "Preparing", "Ready", "Completed"];

  function showLogin(message) {
    localStorage.removeItem("sc_token");
    staffArea.hidden = true;
    loginBox.hidden = false;
    loginError.textContent = message || "";
  }
  function showStaff() {
    loginBox.hidden = true;
    staffArea.hidden = false;
    loadMenu();
    loadOrders();
  }
  // If a call fails because the token expired, go back to the login form
  function handleError(e, target) {
    if (e.status === 401) showLogin("Session expired. Please log in again.");
    else if (target) target.textContent = e.message;
  }

  async function loadMenu() {
    try {
      menu = await api("/menu");
      drawMenu();
    } catch (e) {
      handleError(e, list);
    }
  }
  function drawMenu() {
    list.innerHTML = menu.length
      ? menu.map((x) => `
        <div class="admin-item">
          <span class="admin-emoji">${escapeHTML(x.emoji || "🍽️")}</span>
          <div class="admin-item-info"><strong>${escapeHTML(x.name)}</strong><small>${escapeHTML(x.category)} · ${money(x.price)}</small></div>
          <div class="admin-actions">
            <button data-edit="${x._id}">Edit</button>
            <button class="delete" data-delete="${x._id}">Delete</button>
          </div>
        </div>`).join("")
      : '<p class="empty">No menu items yet.</p>';

    list.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const x = menu.find((i) => i._id === b.dataset.edit);
      if (!x) return;
      idField.value = x._id;
      nameField.value = x.name;
      priceField.value = x.price;
      catField.value = x.category;
      emojiField.value = x.emoji || "";
      document.getElementById("form-heading").textContent = "Edit menu item";
      document.getElementById("cancel-edit").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));

    list.querySelectorAll("[data-delete]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Remove this item from the menu?")) return;
      try {
        await api("/menu/" + b.dataset.delete, { method: "DELETE" });
        loadMenu();
      } catch (e) {
        handleError(e, formError);
      }
    }));
  }

  async function loadOrders() {
    ordersBox.innerHTML = "<p>Loading orders…</p>";
    try {
      const orders = await api("/orders");
      ordersBox.innerHTML = orders.length
        ? orders.map((o) => `
          <div class="admin-item order-row">
            <div class="admin-item-info">
              <strong>${escapeHTML(o.number)} · ${escapeHTML(o.name)}</strong>
              <small>${o.items.map((i) => `${escapeHTML(i.name)} × ${i.qty}`).join(", ")}</small>
              <small>${money(o.total)} · ${paymentLabel(o)} · ${new Date(o.createdAt).toLocaleString()}</small>
            </div>
            <select data-status="${o._id}" aria-label="Order status">
              ${STATUSES.map((s) => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>`).join("")
        : '<p class="empty">No orders yet.</p>';

      ordersBox.querySelectorAll("[data-status]").forEach((sel) =>
        sel.addEventListener("change", async () => {
          try {
            await api(`/orders/${sel.dataset.status}/status`, {
              method: "PATCH",
              body: JSON.stringify({ status: sel.value })
            });
          } catch (e) {
            handleError(e);
            loadOrders();
          }
        })
      );
    } catch (e) {
      handleError(e, ordersBox);
    }
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    formError.textContent = "";
    document.getElementById("form-heading").textContent = "Add a menu item";
    document.getElementById("cancel-edit").hidden = true;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    try {
      const { token } = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.getElementById("login-user").value.trim(),
          password: document.getElementById("login-pass").value
        })
      });
      localStorage.setItem("sc_token", token);
      loginForm.reset();
      showStaff();
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => showLogin());
  document.getElementById("refresh-orders").addEventListener("click", loadOrders);
  document.getElementById("cancel-edit").addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    const body = {
      name: nameField.value.trim(),
      price: Number(priceField.value),
      category: catField.value,
      emoji: emojiField.value.trim() || "🍽️"
    };
    if (!body.name || !Number.isFinite(body.price) || body.price <= 0) return;
    try {
      if (idField.value) {
        await api("/menu/" + idField.value, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/menu", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      loadMenu();
    } catch (err) {
      handleError(err, formError);
    }
  });

  // Start: show the dashboard if a token exists (the server rejects it if it has expired)
  if (localStorage.getItem("sc_token")) showStaff();
  else showLogin();
}

document.addEventListener("DOMContentLoaded", renderAdmin);