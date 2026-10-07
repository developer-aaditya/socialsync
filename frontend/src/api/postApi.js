import axiosInstance from "./axiosInstance";

export const postApi = {
  // Fetch all posts with support for feed_type ('latest' | 'for_you') and cursor/url pagination
  getAllPosts: async (feedType = "latest", customUrl = null) => {
    if (customUrl) {
      // Fetch next cursor page using the full cursor URL
      const response = await axiosInstance.get(customUrl);
      return response.data;
    }
    const response = await axiosInstance.get(`posts/all/?feed_type=${feedType}`);
    return response.data;
  },

  // Fetch single post by ID
  getPost: async (postId) => {
    const response = await axiosInstance.get(`posts/${postId}/`);
    return response.data;
  },

  // Create a new post
  createPost: async (description, image) => {
    const formData = new FormData();
    formData.append("description", description);
    if (image) {
      formData.append("image", image);
    }

    const response = await axiosInstance.post("posts/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Delete a post by ID
  deletePost: async (postId) => {
    const response = await axiosInstance.delete(`posts/${postId}/`);
    return response.data;
  },

  // Like a post by ID
  likePost: async (postId) => {
    const response = await axiosInstance.post(`posts/${postId}/like/`);
    return response.data;
  },

  // Dislike a post by ID
  dislikePost: async (postId) => {
    const response = await axiosInstance.post(`posts/${postId}/dislike/`);
    return response.data;
  },

  // --- COMMENTS API ---
  getComments: async (postId) => {
    const response = await axiosInstance.get(`posts/${postId}/comments/`);
    return response.data;
  },

  addComment: async (postId, text, parentCommentId = null) => {
    const payload = { text };
    if (parentCommentId) {
      payload.parent_comment = parentCommentId;
    }
    const response = await axiosInstance.post(`posts/${postId}/comments/`, payload);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await axiosInstance.delete(`comments/${commentId}/`);
    return response.data;
  },

  likeComment: async (commentId) => {
    const response = await axiosInstance.post(`comments/${commentId}/like/`);
    return response.data;
  },

  dislikeComment: async (commentId) => {
    const response = await axiosInstance.post(`comments/${commentId}/dislike/`);
    return response.data;
  },
};

export default postApi;
