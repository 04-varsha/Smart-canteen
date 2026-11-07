/* SmartCanteen frontend — talks to the Express/MongoDB backend through /api.
   The cart stays in localStorage (it is per-customer and temporary).
   Menu, orders and staff login live on the server. */

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = (value) => "₹" + Number(value).toFixed(0);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}


/* ---------- API helper ---------- */
async function api(url, options = {}) {
  const token = localStorage.getItem("sc_token");
  let res;
  try {
    res = await fetch("/api" + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- Cart (localStorage) ---------- */
const OBJECT_ID = /^[a-f0-9]{24}$/i;

function getCart() {
  // Drop old demo-cart entries that used numeric ids
  return read("sc_cart", []).filter((x) => typeof x.id === "string" && OBJECT_ID.test(x.id));
}
function setCart(cart) {
  save("sc_cart", cart);
  updateCartCount();
}
function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = getCart().reduce((sum, item) => sum + item.qty, 0);
}
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((x) => x.id === product._id);
  if (existing) existing.qty++;
  else cart.push({ id: product._id, name: product.name, price: product.price, emoji: product.emoji, qty: 1 });
  setCart(cart);
  alert(product.name + " added to cart.");
}
function changeQty(id, delta) {
  let cart = getCart();
  const item = cart.find((x) => x.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((x) => x.id !== id);
  }
  setCart(cart);
  renderCart();
}

/* ---------- Menu page ---------- */
async function renderMenu() {
  const grid = document.getElementById("menu-grid");
  if (!grid) return;
  const search = document.getElementById("search");
  let active = "All";
  let menu = [];

  grid.innerHTML = '<div class="empty">Loading menu…</div>';
  try {
    menu = await api("/menu");
  } catch (e) {
    grid.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
    return;
  }

  function draw() {
    const term = search.value.toLowerCase();
    const items = menu.filter(
      (x) => (active === "All" || x.category === active) && x.name.toLowerCase().includes(term)
    );
    grid.innerHTML = items.length
      ? items.map((x) => `
        <article class="food-card">
          <div class="food-visual">${escapeHTML(x.emoji || "🍽️")}</div>
          <div class="food-info">
            <div class="food-info-top">
              <div><h3>${escapeHTML(x.name)}</h3><p>${escapeHTML(x.category)}</p></div>
              <span class="price">${money(x.price)}</span>
            </div>
            <div class="food-actions">
              <small>Freshly prepared</small>
              <button class="small-btn" data-add="${x._id}">+ Add</button>
            </div>
          </div>
        </article>`).join("")
      : '<div class="empty">No menu items found. Try another search.</div>';

    grid.querySelectorAll("[data-add]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const product = menu.find((x) => x._id === btn.dataset.add);
        if (product) addToCart(product);
      })
    );
  }

  search.addEventListener("input", draw);
  document.querySelectorAll("[data-category]").forEach((btn) =>
    btn.addEventListener("click", () => {
      active = btn.dataset.category;
      document.querySelectorAll("[data-category]").forEach((b) => b.classList.toggle("selected", b === btn));
      draw();
    })
  );
  draw();
}

/* ---------- Cart page ---------- */
function renderCart() {
  const root = document.getElementById("cart-content");
  if (!root) return;
  const cart = getCart();
  if (!cart.length) {
    root.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p>Add something delicious from the menu.</p><a class="btn" href="menu.html">Browse menu →</a></div>';
    return;
  }
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);
  root.innerHTML = `<div class="panel">
    ${cart.map((x) => `
      <div class="cart-row">
        <div><h3>${escapeHTML(x.emoji || "🍽️")} ${escapeHTML(x.name)}</h3><small>${money(x.price)} each</small></div>
        <div class="qty">
          <button data-minus="${x.id}" aria-label="Decrease quantity">−</button>
          <strong>${x.qty}</strong>
          <button data-plus="${x.id}" aria-label="Increase quantity">+</button>
        </div>
        <strong>${money(x.price * x.qty)}</strong>
      </div>`).join("")}
    <div class="cart-bottom">
      <div>Total<br><span class="total">${money(total)}</span></div>
      <a class="btn" href="payment.html">Continue to checkout →</a>
    </div></div>`;
  root.querySelectorAll("[data-minus]").forEach((b) => (b.onclick = () => changeQty(b.dataset.minus, -1)));
  root.querySelectorAll("[data-plus]").forEach((b) => (b.onclick = () => changeQty(b.dataset.plus, 1)));
}

/* ---------- Checkout page ---------- */
async function renderCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) return;
  const cart = getCart();
  if (!cart.length) {
    form.innerHTML = '<div class="empty">Your cart is empty. <a href="menu.html">Browse the menu</a>.</div>';
    return;
  }
  document.getElementById("checkout-total").textContent = money(cart.reduce((s, x) => s + x.price * x.qty, 0));

  const button = form.querySelector("button[type=submit]");
  const errorBox = document.getElementById("checkout-error");
  const showError = (message) => { errorBox.textContent = message; };

  // Show the "Pay online" option only if the server has Razorpay keys
  try {
    const config = await api("/config");
    if (config.onlinePayment) document.getElementById("online-option").hidden = false;
  } catch {
    /* if this fails, only "Pay at counter" is offered */
  }

  function finish() {
    setCart([]);
    window.location.href = "confirmation.html";
  }

  // Opens the Razorpay payment window, then asks the server to verify the result
  function payOnline(data, customer) {
    if (typeof Razorpay === "undefined") {
      showError("Could not load the payment window. Check your internet connection and try again.");
      return;
    }
    const number = data.order.number;
    const checkout = new Razorpay({
      key: data.razorpay.keyId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      name: "SmartCanteen",
      description: "Order " + number,
      order_id: data.razorpay.orderId,
      prefill: { name: customer.name, email: customer.email },
      theme: { color: "#c2410c" },
      handler: async (response) => {
        try {
          await api("/orders/" + encodeURIComponent(number) + "/verify-payment", {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          finish();
        } catch (err) {
          showError(err.message + " Your order number is " + number + ". Please show it at the counter.");
          button.disabled = false;
        }
      },
      modal: {
        ondismiss: () => {
          showError("Payment was not completed. Order " + number + " is saved as unpaid, so you can try again or pay at the counter.");
          button.disabled = false;
          button.textContent = "Confirm order →";
        }
      }
    });
    checkout.on("payment.failed", (response) => {
      showError("Payment failed: " + (response.error && response.error.description ? response.error.description : "please try again."));
    });
    checkout.open();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("customer-name").value.trim();
    const email = document.getElementById("customer-email").value.trim();
    const payment = new FormData(form).get("payment");
    if (!name || !email) return;

    showError("");
    button.disabled = true;
    button.textContent = "Placing order…";

    try {
      // Only ids and quantities are sent. The server looks up the real prices.
      const data = await api("/orders", {
        method: "POST",
        body: JSON.stringify({ name, email, payment, items: cart.map((x) => ({ id: x.id, qty: x.qty })) })
      });
      save("sc_last_order_number", data.order.number);

      if (data.razorpay) {
        payOnline(data, { name, email });
      } else {
        finish();
      }
    } catch (err) {
      showError(err.message);
      button.disabled = false;
      button.textContent = "Confirm order →";
    }
  });
}

/* ---------- Confirmation page ---------- */
async function renderConfirmation() {
  const root = document.getElementById("confirmation");
  if (!root) return;
  const number = read("sc_last_order_number", null);
  if (!number) {
    root.innerHTML = '<h2>No recent order found</h2><p>Place an order to see confirmation here.</p><a class="btn" href="menu.html">Go to menu</a>';
    return;
  }
  root.innerHTML = "<p>Loading your order…</p>";
  try {
    const order = await api("/orders/" + encodeURIComponent(number));
    const paymentText = order.payment === "Pay online"
      ? `Pay online · <span class="badge ${order.paymentStatus === "Paid" ? "paid" : "unpaid"}">${escapeHTML(order.paymentStatus)}</span>`
      : "Pay at counter";
    root.innerHTML = `<div class="success-icon">✓</div>
      <span class="eyebrow">ORDER PLACED</span>
      <h1>Thank you, ${escapeHTML(order.name)}!</h1>
      <p>Your order has been saved. Show this number at the counter.</p>
      <div class="order-number">${escapeHTML(order.number)}</div>
      <p><strong>Order summary</strong></p>
      <p>${order.items.map((x) => `${escapeHTML(x.name)} × ${x.qty}`).join("<br>")}</p>
      <div class="summary-box">
        <div class="summary-line"><span>Total</span><strong>${money(order.total)}</strong></div>
        <div class="summary-line"><span>Payment</span><strong>${paymentText}</strong></div>
        <div class="summary-line"><span>Status</span><strong>${escapeHTML(order.status)}</strong></div>
      </div>
      <a class="btn" href="menu.html">Order again →</a>`;
  } catch (e) {
    root.innerHTML = `<h2>We could not load your order</h2><p>${escapeHTML(e.message)}</p><a class="btn" href="menu.html">Go to menu</a>`;
  }
}
/* ---------- Logo in the header (all pages) ---------- */
function addBrandLogo() {
  const brand = document.querySelector(".brand");
  if (!brand) return;
  const img = new Image();
  img.className = "brand-logo";
  img.alt = "RV University Bengaluru logo";
  img.onload = () => brand.prepend(img); // only shown if the file exists
  img.src = "images/rvu-logo.png";
}
/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", () => {
  addBrandLogo();
  updateCartCount();
  renderMenu();
  renderCart();
  renderCheckout();
  renderConfirmation();
});
