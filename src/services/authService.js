import API_URL from '../config/api.js';

const AUTH_API_URL = `${API_URL}/auth`;

function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'dev_' + crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export const authService = {
  async login(email, password) {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, deviceId: getDeviceId() })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      return data;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  },

  async register(name, email, password) {
    const response = await fetch(`${AUTH_API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, deviceId: getDeviceId() })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      return data;
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  },

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${AUTH_API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        localStorage.removeItem('token');
        return null;
      }
    } catch (error) {
      localStorage.removeItem('token');
      return null;
    }
  },

  async logout() {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${AUTH_API_URL}/logout`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('rememberMe');
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};
