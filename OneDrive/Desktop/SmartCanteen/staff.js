function getStaffMenu() {

    return JSON.parse(
        localStorage.getItem("smartMenu")
    ) || [];

}


function saveStaffMenu(menu) {

    localStorage.setItem(
        "smartMenu",
        JSON.stringify(menu)
    );

}


// ================= DISPLAY STAFF MENU =================

function displayStaffMenu() {

    const container =
        document.getElementById(
            "staffMenuContainer"
        );

    if (!container) return;


    const menu = getStaffMenu();

    container.innerHTML = "";


    if (menu.length === 0) {

        container.innerHTML = `
            <p class="empty-message">
                No menu items available.
            </p>
        `;

        return;

    }


    menu.forEach((item, index) => {

        const row =
            document.createElement("div");

        row.className = "staff-item";


        row.innerHTML = `

            <div class="staff-food">

                <span class="staff-image">
                    ${item.image}
                </span>

                <div>

                    <h3>${item.name}</h3>

                    <p>
                        ${item.category}
                        • ₹${item.price}
                    </p>

                </div>

            </div>


            <span class="${
                item.availability === "Available"
                ? "available"
                : "not-available"
            }">

                ${item.availability}

            </span>


            <div class="staff-actions">

                <button
                    onclick="editFood(${index})"
                >
                    Edit
                </button>

                <button
                    onclick="toggleAvailability(${index})"
                >
                    ${
                        item.availability === "Available"
                        ? "Disable"
                        : "Enable"
                    }
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteFood(${index})"
                >
                    Delete
                </button>

            </div>

        `;


        container.appendChild(row);

    });

}


// ================= ADD / EDIT FOOD =================

function saveFood() {

    const name =
        document.getElementById(
            "foodName"
        ).value.trim();


    const category =
        document.getElementById(
            "foodCategory"
        ).value;


    const price =
        Number(
            document.getElementById(
                "foodPrice"
            ).value
        );


    const description =
        document.getElementById(
            "foodDescription"
        ).value.trim();


    const image =
        document.getElementById(
            "foodImage"
        ).value.trim();


    const availability =
        document.getElementById(
            "foodAvailability"
        ).value;


    const editIndex =
        Number(
            document.getElementById(
                "editIndex"
            ).value
        );


    if (!name || !price) {

        alert(
            "Please enter food name and price."
        );

        return;

    }


    const item = {

        name: name,

        category: category,

        price: price,

        description:
            description ||
            "Delicious canteen food.",

        image:
            image || "🍽️",

        availability:
            availability

    };


    const menu = getStaffMenu();


    if (editIndex === -1) {

        menu.push(item);

        alert(
            "Food item added successfully!"
        );

    } else {

        menu[editIndex] = item;

        alert(
            "Food item updated successfully!"
        );

    }


    saveStaffMenu(menu);

    clearForm();

    displayStaffMenu();

}


// ================= EDIT =================

function editFood(index) {

    const menu = getStaffMenu();

    const item = menu[index];


    document.getElementById(
        "foodName"
    ).value = item.name;


    document.getElementById(
        "foodCategory"
    ).value = item.category;


    document.getElementById(
        "foodPrice"
    ).value = item.price;


    document.getElementById(
        "foodDescription"
    ).value = item.description;


    document.getElementById(
        "foodImage"
    ).value = item.image;


    document.getElementById(
        "foodAvailability"
    ).value = item.availability;


    document.getElementById(
        "editIndex"
    ).value = index;


    document.getElementById(
        "formTitle"
    ).textContent =
        "Edit Food Item";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ================= DELETE =================

function deleteFood(index) {

    const menu = getStaffMenu();


    if (
        confirm(
            "Are you sure you want to delete this item?"
        )
    ) {

        menu.splice(index, 1);

        saveStaffMenu(menu);

        displayStaffMenu();

    }

}


// ================= AVAILABILITY =================

function toggleAvailability(index) {

    const menu = getStaffMenu();


    if (
        menu[index].availability ===
        "Available"
    ) {

        menu[index].availability =
            "Unavailable";

    } else {

        menu[index].availability =
            "Available";

    }


    saveStaffMenu(menu);

    displayStaffMenu();

}


// ================= CLEAR FORM =================

function clearForm() {

    document.getElementById(
        "foodName"
    ).value = "";


    document.getElementById(
        "foodPrice"
    ).value = "";


    document.getElementById(
        "foodDescription"
    ).value = "";


    document.getElementById(
        "foodImage"
    ).value = "";


    document.getElementById(
        "editIndex"
    ).value = "-1";


    document.getElementById(
        "formTitle"
    ).textContent =
        "Add New Food Item";

}


// ================= LOAD =================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        displayStaffMenu();

    }
);