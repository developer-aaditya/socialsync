import axiosInstance from "./axiosInstance";

export const userApi = {
  // GET: Search users by username or name
  searchUsers: async (query) => {
    const response = await axiosInstance.get(`search/?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // GET: Get public user profile by username
  getUserProfile: async (username) => {
    const response = await axiosInstance.get(`profile/user/${encodeURIComponent(username)}/`);
    return response.data;
  },

  // POST: Toggle follow/unfollow for a target user
  toggleFollow: async (username) => {
    const response = await axiosInstance.post(`profile/user/${encodeURIComponent(username)}/follow/`);
    return response.data;
  },

  // GET: Get list of followers for a user
  getFollowers: async (username) => {
    const response = await axiosInstance.get(`profile/user/${encodeURIComponent(username)}/followers/`);
    return response.data;
  },

  // GET: Get list of following for a user
  getFollowing: async (username) => {
    const response = await axiosInstance.get(`profile/user/${encodeURIComponent(username)}/following/`);
    return response.data;
  },

  // GET: Check username availability
  checkUsernameAvailability: async (username) => {
    const response = await axiosInstance.get(`username-check/?username=${encodeURIComponent(username)}`);
    return response.data;
  },
};

export default userApi;
