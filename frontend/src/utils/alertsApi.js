import axios from "axios";

import API_URL from "../config";
const API_BASE = API_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const alertsApi = {
  // Get all alerts for the current user
  getAlerts: async (status = null) => {
    const params = status ? { status } : {};
    return api.get("/alerts", { params });
  },

  // Get alert statistics
  getStats: async () => {
    return api.get("/alerts/stats");
  },

  // Create a new price alert
  createAlert: async (alertData) => {
    return api.post("/alerts", alertData);
  },

  // Update alert status
  updateStatus: async (alertId, status) => {
    return api.patch(`/alerts/${alertId}`, { status });
  },

  // Reactivate a triggered alert
  reactivateAlert: async (alertId) => {
    return api.post(`/alerts/${alertId}/reactivate`);
  },

  // Delete an alert
  deleteAlert: async (alertId) => {
    return api.delete(`/alerts/${alertId}`);
  },
};

export default alertsApi;
