/* eslint-disable */

const login = async (email, password) => {
  try {
    const result = await axios({
      method: "POST",
      url: "http://127.0.0.1:3000/api/v1/users/login",
      data: { email, password }
    });

    // Reload the page if login was successful.
    if (result.data.status === "success") {
      alert("Logged in successfully!");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    alert(err.response.data.message);
  }
};

// Select based on class.
document.querySelector(".form").addEventListener("submit", e => {
  // Prevent event from loading other pages.
  e.preventDefault();

  // Get email and password.
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  login(email, password);
});
