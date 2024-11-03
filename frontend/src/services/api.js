import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "x-api-key": import.meta.env.VITE_API_KEY,
    "Content-Type": "application/json",
  },
});

const apiService = {
  // Points
  getPoints: ({ offset = 0, limit = 10 } = {}) =>
    api.get("/points", {
      params: {
        offset,
        limit,
      },
    }),
  createPoint: (data) => api.post("/points", data),
  getPointInfo: (pointId) => api.get(`/points/${pointId}`),
  getPointEvents: (pointId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.userId) params.append("userId", filters.userId);
    if (filters.type) params.append("type", filters.type);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.limit) params.append("limit", filters.limit);
    if (filters.offset) params.append("offset", filters.offset);

    return api.get(`/points/${pointId}/events?${params.toString()}`);
  },
  // Add these methods to your api service
  getEvents: (params) => api.get("/events", { params }),
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),
  updateEvent: async (eventId, eventData) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update event");
    }

    return response.json();
  },
  addEvent: (data) => api.post("/events", data),
  getPointLeaderboard: (pointId, limit, offset, order) =>
    api.get(`/points/${pointId}/leaderboard?limit=${limit}&offset=${offset}&order=${order}`),
  deletePoint: (pointId) => api.delete(`/points/${pointId}`),

  // Users
  getUsers: ({ offset = 0, limit = 10 } = {}) =>
    api.get("/users", {
      params: {
        offset,
        limit,
      },
    }),
  createUser: (data) => api.post("/users", data),
  getUserPoints: (userId) => api.get(`/users/${userId}`),
  getUserEvents: (userId) => api.get(`/users/${userId}/events`),

  // Feed
  getFeed: () => api.get("/feed"),
  getStats: () => api.get("/stats"),

  createEventSource: () => {
    const headers = {
      "x-api-key": import.meta.env.VITE_API_KEY, // Add API key if needed
    };

    // Convert headers to URL query parameters for EventSource
    const queryString = Object.entries(headers)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    return new EventSource(`${baseURL}/feed?${queryString}`);
  },
};

export default apiService;
