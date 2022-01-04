import "@babel/polyfill";
import { displayMap } from "./mapbox";
import { login } from "./login";

// DOM ELEMENTS
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form");

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

// Select based on class.
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    // Prevent event from loading other pages.
    e.preventDefault();

    // Get email and password.
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    login(email, password);
  });
}
