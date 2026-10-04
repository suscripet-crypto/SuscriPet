const API = {
  token: () => localStorage.getItem('suscripetToken'),
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token()) headers.Authorization = `Bearer ${this.token()}`;
    const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.message || 'Ocurrió un error.'); error.status = response.status; throw error; }
    return data;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(path) { return this.request(path, { method: 'DELETE' }); }
};
window.API = API;
