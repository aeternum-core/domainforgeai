import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

// Clerk token bridge: a registered getter attaches the session token to every request.
let _tokenGetter = null;
export function setTokenGetter(fn) { _tokenGetter = fn; }

http.interceptors.request.use(async (config) => {
  if (_tokenGetter) {
    try {
      const t = await _tokenGetter();
      if (t) config.headers.Authorization = `Bearer ${t}`;
    } catch { /* signed out */ }
  }
  return config;
});

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

  // Live streaming execution endpoints
  initRun: (id, payload) =>
    http.post(`/agents/${id}/runs`, payload).then((r) => r.data),
  getRun: (id, runId) =>
    http.get(`/agents/${id}/runs/${runId}`).then((r) => r.data),
  streamRun: (id, runId, { onProgress, onCompleted, onError }) => {
    const es = new EventSource(`${API}/agents/${id}/runs/${runId}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "step_progress") {
          onProgress?.(data.trace, data);
        } else if (data.event === "run_completed") {
          onCompleted?.(data);
          es.close();
        } else if (data.event === "run_failed" || data.event === "error") {
          onError?.(data);
          es.close();
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    es.onerror = (err) => {
      console.warn("SSE connection closed or error", err);
      onError?.(err);
      es.close();
    };
    return () => es.close();
  },

  feedback: (id, text) => http.post(`/agents/${id}/feedback`, { text }).then((r) => r.data),
  versions: (id) => http.get(`/agents/${id}/versions`).then((r) => r.data),

  prepublish: (id) => http.get(`/agents/${id}/prepublish`).then((r) => r.data),
  publish: (id) => http.post(`/agents/${id}/publish`).then((r) => r.data),
  unpublish: (id) => http.post(`/agents/${id}/unpublish`).then((r) => r.data),

  publicAgent: (slug) => http.get(`/public/agents/${slug}`).then((r) => r.data),

  resetDemo: () => http.post("/demo/reset").then((r) => r.data),
  stats: () => http.get("/stats").then((r) => r.data),
  me: () => http.get("/me").then((r) => r.data),
};

export const siteOrigin = () => window.location.origin;
