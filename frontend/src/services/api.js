const _rawApiBase = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL;
const API_BASE = _rawApiBase
  ? (_rawApiBase.endsWith('/api') ? _rawApiBase.replace(/\/+$/, '') : _rawApiBase.replace(/\/+$/, '') + '/api')
  : 'http://localhost:8080/api';

const api = {
  post: async (url, data) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  postFile: async (url, formData) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  get: async (url) => {
    const res = await fetch(`${API_BASE}${url}`);
    return res.json();
  }
};

export default api;

export { API_BASE };
