import axiosInstance from "./axiosInstance";

const buildFormData = (data) => {
  const formData = new FormData();

  // Required fields
  if (data.email) formData.append("email", data.email);
  if (data.password) formData.append("password", data.password);

  // Confirm password (support both keys)
  if (data.confirm_password) {
    formData.append("confirm_password", data.confirm_password);
  } else if (data.password_confirm) {
    formData.append("confirm_password", data.password_confirm);
  }

  if (data.full_name) formData.append("full_name", data.full_name);
  if (data.date_of_birth) formData.append("date_of_birth", data.date_of_birth);

  // Optional fields
  if (data.college) formData.append("college", data.college);

  // Profile picture
  if (data.profile_picture instanceof File) {
    formData.append("profile_picture", data.profile_picture);
  }

  return formData;
};

// Authentication API calls
export const authApi = {
  // Register a new user
  signup: async (
    arg1,
    password,
    confirmPassword,
    fullName,
    dateOfBirth,
    profilePicture
  ) => {
    try {
      let formData;

      // Case 1: Provided a FormData instance directly
      if (typeof FormData !== "undefined" && arg1 instanceof FormData) {
        formData = arg1;
      } else if (arg1 && typeof arg1 === "object") {
        // Case 2: Provided a plain object of fields
        formData = buildFormData(arg1);
      } else {
        // Case 3: Legacy positional arguments
        const data = {
          email: arg1,
          password,
          confirm_password: confirmPassword,
          full_name: fullName,
          date_of_birth: dateOfBirth,
          profile_picture: profilePicture,
        };
        formData = buildFormData(data);
      }

      const response = await axiosInstance.post("signup/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    const response = await axiosInstance.post("login/", {
      email,
      password,
    });
    return response.data;
  },

  // Fetch user profile
  getProfile: async () => {
    const response = await axiosInstance.get("profile/");
    return response.data;
  },

  // Update user profile
  updateProfile: async (data) => {
    if (data.profile_picture instanceof File) {
      const formData = new FormData();
      if (data.full_name) {
        formData.append("full_name", data.full_name);
      }
      if (data.date_of_birth) {
        formData.append("date_of_birth", data.date_of_birth);
      }
      if (data.college) {
        formData.append("college", data.college);
      }
      if (data.profile_picture) {
        formData.append("profile_picture", data.profile_picture);
      }
      const response = await axiosInstance.patch("profile/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    }

    // Otherwise use JSON
    const response = await axiosInstance.patch("profile/", data);
    return response.data;
  },
};

export default authApi;
