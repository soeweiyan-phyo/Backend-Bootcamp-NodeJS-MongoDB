import axios from 'axios';
import { showAlert } from './alerts';

// Type is either 'password' or 'data'.
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';

    const result = await axios({
      method: 'PATCH',
      url,
      data,
    });

    // Reload page if settings are successfully updated.
    if (result.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
