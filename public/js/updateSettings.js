import axios from "axios";
import { showAlert } from "./alerts";

export const updateData = async (name, email) => {
  try {
    const result = await axios({
      method: "PATCH",
      url: "http://127.0.0.1:3000/api/v1/users/updateMe",
      data: { name, email }
    });

    // Reload page if settings are successfully updated.
    if (result.data.status === "success") {
      showAlert("success", "Data updated successfully.");
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
