import axiosInstance from "./axiosInstance";

export const notificationApi = {
  // Fetch user notifications
  getNotifications: async () => {
    const response = await axiosInstance.get("notifications/");
    return response.data;
  },

  // Mark a single notification as read
  markAsRead: async (notificationId) => {
    const response = await axiosInstance.patch(`notifications/${notificationId}/read/`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await axiosInstance.post("notifications/read-all/");
    return response.data;
  },
};

export default notificationApi;
