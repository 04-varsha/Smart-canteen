// ================= MENU DATA =================

const defaultMenu = [

    {
        name: "Masala Dosa",
        category: "Breakfast",
        price: 60,
        description: "Crispy dosa served with chutney and sambar.",
        image: "🥞",
        availability: "Available"
    },

    {
        name: "Veg Sandwich",
        category: "Snacks",
        price: 50,
        description: "Fresh sandwich filled with vegetables.",
        image: "🥪",
        availability: "Available"
    },

    {
        name: "Veg Meals",
        category: "Meals",
        price: 100,
        description: "Complete vegetarian meal.",
        image: "🍛",
        availability: "Available"
    },

    {
        name: "Veg Burger",
        category: "Snacks",
        price: 70,
        description: "Crispy vegetable burger.",
        image: "🍔",
        availability: "Available"
    },

    {
        name: "Coffee",
        category: "Beverages",
        price: 30,
        description: "Hot and refreshing coffee.",
        image: "☕",
        availability: "Available"
    },

    {
        name: "Fresh Juice",
        category: "Beverages",
        price: 45,
        description: "Freshly prepared fruit juice.",
        image: "🧃",
        availability: "Available"
    },

    {
        name: "Chocolate Cake",
        category: "Desserts",
        price: 60,
        description: "Soft and delicious chocolate cake.",
        image: "🍰",
        availability: "Available"
    }

];


// ================= GET MENU =================

function getMenu() {

    let menu = localStorage.getItem("smartMenu");

    if (!menu) {

        localStorage.setItem(
            "smartMenu",
            JSON.stringify(defaultMenu)
        );

        return defaultMenu;
    }

    return JSON.parse(menu);
}


// ================= DISPLAY MENU =================

function displayMenu() {

    const container =
        document.getElementById("menuContainer");

    if (!container) return;

    const search =
        document.getElementById("searchBox")
        .value
        .toLowerCase();

    const category =
        document.getElementById("categoryFilter")
        .value;

    const menu = getMenu();

    const filteredMenu = menu.filter(item => {

        const matchesSearch =
            item.name.toLowerCase().includes(search);

        const matchesCategory =
            category === "All" ||
            item.category === category;

        return matchesSearch && matchesCategory;

    });


    container.innerHTML = "";


    if (filteredMenu.length === 0) {

        container.innerHTML = `
            <div class="empty-message">
                <h2>No food items found</h2>
                <p>Try another search.</p>
            </div>
        `;

        return;
    }


    filteredMenu.forEach((item, index) => {

        const originalIndex =
            menu.indexOf(item);

        const card = document.createElement("div");

        card.className = "menu-card";


        card.innerHTML = `

            <div class="menu-image">
                ${item.image}
            </div>

            <span class="category">
                ${item.category}
            </span>

            <h3>${item.name}</h3>

            <p>${item.description}</p>

            <div class="menu-bottom">

                <strong>₹${item.price}</strong>

                ${
                    item.availability === "Available"

                    ?

                    `<button
                        class="add-btn"
                        onclick="addToCart(${originalIndex})"
                    >
                        Add +
                    </button>`

                    :

                    `<button
                        class="unavailable-btn"
                        disabled
                    >
                        Unavailable
                    </button>`
                }

            </div>

        `;


        container.appendChild(card);

    });

}


// ================= CART =================

function getCart() {

    return JSON.parse(
        localStorage.getItem("smartCart")
    ) || [];

}


function saveCart(cart) {

    localStorage.setItem(
        "smartCart",
        JSON.stringify(cart)
    );

}


function addToCart(index) {

    const menu = getMenu();

    const item = menu[index];

    let cart = getCart();

    const existing =
        cart.find(
            cartItem =>
                cartItem.name === item.name
        );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({
            ...item,
            quantity: 1
        });

    }


    saveCart(cart);

    updateCartCount();

    alert(item.name + " added to cart!");

}


function updateCartCount() {

    const count =
        document.getElementById("cartCount");

    if (!count) return;

    const cart = getCart();

    const total =
        cart.reduce(
            (sum, item) =>
                sum + item.quantity,
            0
        );

    count.textContent = total;

}


// ================= DISPLAY CART =================

function displayCart() {

    const container =
        document.getElementById("cartItems");

    if (!container) return;

    const cart = getCart();

    container.innerHTML = "";


    if (cart.length === 0) {

        container.innerHTML = `

            <div class="empty-cart">

                <h2>Your cart is empty</h2>

                <p>Add some delicious food!</p>

                <a
                    href="menu.html"
                    class="primary-btn"
                >
                    Browse Menu
                </a>

            </div>

        `;

        updateCartTotal();

        return;

    }


    cart.forEach((item, index) => {

        const div =
            document.createElement("div");

        div.className = "cart-item";


        div.innerHTML = `

            <div class="cart-food">
                <div class="cart-image">
                    ${item.image}
                </div>

                <div>
                    <h3>${item.name}</h3>
                    <p>${item.category}</p>
                </div>
            </div>


            <div class="quantity">

                <button
                    onclick="changeQuantity(${index}, -1)"
                >
                    −
                </button>

                <span>${item.quantity}</span>

                <button
                    onclick="changeQuantity(${index}, 1)"
                >
                    +
                </button>

            </div>


            <strong>
                ₹${item.price * item.quantity}
            </strong>


            <button
                class="remove-btn"
                onclick="removeFromCart(${index})"
            >
                ✕
            </button>

        `;


        container.appendChild(div);

    });


    updateCartTotal();

}


function changeQuantity(index, change) {

    let cart = getCart();

    cart[index].quantity += change;


    if (cart[index].quantity <= 0) {

        cart.splice(index, 1);

    }


    saveCart(cart);

    displayCart();

    updateCartCount();

}


function removeFromCart(index) {

    let cart = getCart();

    cart.splice(index, 1);

    saveCart(cart);

    displayCart();

    updateCartCount();

}


function updateCartTotal() {

    const cart = getCart();

    const subtotal =
        cart.reduce(
            (sum, item) =>
                sum + item.price * item.quantity,
            0
        );


    const tax =
        Math.round(subtotal * 0.05);


    const total =
        subtotal + tax;


    const subtotalElement =
        document.getElementById("subtotal");

    const taxElement =
        document.getElementById("tax");

    const totalElement =
        document.getElementById("total");


    if (subtotalElement)
        subtotalElement.textContent =
            "₹" + subtotal;

    if (taxElement)
        taxElement.textContent =
            "₹" + tax;

    if (totalElement)
        totalElement.textContent =
            "₹" + total;

}


function goToPayment() {

    const cart = getCart();

    if (cart.length === 0) {

        alert("Your cart is empty!");

        return;

    }

    window.location.href =
        "payment.html";

}


// ================= PAYMENT =================

function displayPayment() {

    const container =
        document.getElementById("paymentItems");

    if (!container) return;

    const cart = getCart();

    let subtotal = 0;


    container.innerHTML = "";


    cart.forEach(item => {

        const amount =
            item.price * item.quantity;

        subtotal += amount;


        container.innerHTML += `

            <div class="summary-row">

                <span>
                    ${item.name} × ${item.quantity}
                </span>

                <span>
                    ₹${amount}
                </span>

            </div>

        `;

    });


    const tax =
        Math.round(subtotal * 0.05);

    const total =
        subtotal + tax;


    document.getElementById(
        "paymentTotal"
    ).textContent = "₹" + total;


    document.getElementById(
        "paymentAmount"
    ).textContent = "₹" + total;

}


function makePayment() {

    const cart = getCart();

    if (cart.length === 0) {

        alert("Your cart is empty!");

        return;

    }


    const method =
        document.querySelector(
            'input[name="payment"]:checked'
        ).value;


    alert(
        "Payment successful using " +
        method
    );


    localStorage.removeItem("smartCart");


    document.getElementById(
        "successModal"
    ).style.display = "flex";

}


// ================= PAGE LOAD =================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        displayMenu();

        displayCart();

        displayPayment();

        updateCartCount();

    }
);