import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const api = {
  templates: () => http.get("/templates").then((r) => r.data),
  instantiate: (templateId) =>
    http.post(`/templates/${templateId}/instantiate`).then((r) => r.data),

  generate: (payload) => http.post("/agents/generate", payload).then((r) => r.data),
  createAgent: (payload) => http.post("/agents", payload).then((r) => r.data),
  listAgents: () => http.get("/agents").then((r) => r.data),
  getAgent: (id) => http.get(`/agents/${id}`).then((r) => r.data),
  updateAgent: (id, updates) => http.put(`/agents/${id}`, updates).then((r) => r.data),
  deleteAgent: (id) => http.delete(`/agents/${id}`).then((r) => r.data),

  runOwner: (id, payload) =>
    http.post(`/agents/${id}/run?mode=owner`, payload).then((r) => r.data),
  runPublic: (slug, payload) =>
    http.post(`/agents/${slug}/run`, payload).then((r) => r.data),
  getRuns: (id) => http.get(`/agents/${id}/runs`).then((r) => r.data),

  feedback: (id, text) => http.post(`/agents/${id}/feedback`, { text }).then((r) => r.data),
  versions: (id) => http.get(`/agents/${id}/versions`).then((r) => r.data),

  prepublish: (id) => http.get(`/agents/${id}/prepublish`).then((r) => r.data),
  publish: (id) => http.post(`/agents/${id}/publish`).then((r) => r.data),
  unpublish: (id) => http.post(`/agents/${id}/unpublish`).then((r) => r.data),

  publicAgent: (slug) => http.get(`/public/agents/${slug}`).then((r) => r.data),

  resetDemo: () => http.post("/demo/reset").then((r) => r.data),
  stats: () => http.get("/stats").then((r) => r.data),
};

export const siteOrigin = () => window.location.origin;
