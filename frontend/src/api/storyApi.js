import axiosInstance from "./axiosInstance";

export const storyApi = {
  // GET: List active 24-hour stories
  getStories: async () => {
    const response = await axiosInstance.get("stories/");
    return response.data;
  },

  // POST: Create a new 24-hour story
  createStory: async (imageFile, caption = "") => {
    const formData = new FormData();
    formData.append("image", imageFile);
    if (caption && caption.trim()) {
      formData.append("caption", caption.trim());
    }

    const response = await axiosInstance.post("stories/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // POST: Mark a story as viewed by the logged-in user
  markStoryViewed: async (storyId) => {
    const response = await axiosInstance.post(`stories/${storyId}/view/`);
    return response.data;
  },

  // GET: Retrieve viewer list for story owner
  getStoryViewers: async (storyId) => {
    const response = await axiosInstance.get(`stories/${storyId}/viewers/`);
    return response.data;
  },
};

export default storyApi;
