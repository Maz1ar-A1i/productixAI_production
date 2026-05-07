import axios from 'axios';
import { jwtDecode } from "jwt-decode";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  signup: async (userData) => {
    const payload = {
      user_in: { 
        name: userData.name, 
        email: userData.email, 
        password: userData.password 
      },
      org_in: { 
        name: `${userData.name}'s Organization`, 
        subscription_plan: "free" 
      }
    };
    const response = await api.post('/auth/register', payload);
    return response.data;
  },



  login: async (credentials) => {
    const response = await api.post("/login/login", credentials);
    if (response.data.access_token) {
      const token = response.data.access_token;
      localStorage.setItem("token", token);

      // decode token to get role
      const decoded = jwtDecode(token);
      localStorage.setItem("role", decoded.role);
    }
    return response.data;
  },


  logout: () => {
    localStorage.removeItem('token');
  },

  getRole: () => {
    return localStorage.getItem('role');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

// Productivity calculation services
export const productivityService = {
  calculate: async (data) => {
    
    const response = await api.post('/productivity/calculate', data);
    console.log(response.data);
    return response.data;

  },
  getAnalysisCount: async () => {
    try {
      const response = await api.get('/analysis-count'); // use api instance!
      return response.data; // { analysis_count: 5 }
    } catch (error) {
      console.error('Error fetching analysis count:', error);
      return { analysis_count: 0 };
    }
  }
  ,

  getRecords: async () => {
    try {
      const response = await api.get('/analytics/productivity-records');
      return response.data;
    } catch (error) {
      // Return empty array if endpoint doesn't exist yet
      console.warn('Productivity records endpoint not available:', error.message);
      return [];
    }
  }
};

// AI Analysis services
export const analysisService = {
  analyze: async (data) => {
    const response = await api.post('/ai/analyze', data);
    return response.data;
  }
};

// Chatbot services
export const chatbotService = {
  sendMessage: async (data) => {
    const response = await api.post('/chatbot/rag', data);
    return response.data;
  }
};

// AI Agent services
export const agentService = {
  generateReport: async (data) => {
    const response = await api.post('/agent', data);
    return response.data;
  },
  downloadReport: (reportId) => {
    return `${import.meta.env.VITE_API_URL}/agent/${reportId}/download`;
  },
};

export const ragChatbotService = {
  sendMessage: async (data) => {
    const response = await api.post("/rag_chat", data);
    return response.data; // ✅ returns plain string
  },
};


// Product and Data services
export const productService = {
  getProducts: () => api.get('/products/'),
  createProduct: (data) => api.post('/products/', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),

  uploadExcel: (formData) => api.post('/api/v1/uploads/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadTemplate: () => `${API_BASE_URL}/api/v1/uploads/template`,
};

// Data Record services (flat model: Tower + Month + metrics)
export const dataRecordService = {
  getRecords: (productId) =>
    api.get('/data-records/', { params: productId ? { product_id: productId } : {} }),
  createRecord: (data) => api.post('/data-records/', data),
  updateRecord: (id, data) => api.put(`/data-records/${id}`, data),
  deleteRecord: (id) => api.delete(`/data-records/${id}`),
};

// Formula Builder services
export const formulaService = {
  // Get fixed column list
  getColumns: () => api.get('/api/formulas/columns'),

  // Get formula templates
  getTemplates: () => api.get('/api/formulas/templates'),

  // Preview expression (no save)
  preview: (template, columns) =>
    api.post('/api/formulas/preview', null, { params: { template, columns } }),

  // CRUD
  list: () => api.get('/api/formulas/'),
  get: (id) => api.get(`/api/formulas/${id}`),
  create: (data) => api.post('/api/formulas/', data),
  update: (id, data) => api.put(`/api/formulas/${id}`, data),
  delete: (id) => api.delete(`/api/formulas/${id}`),
  duplicate: (id) => api.post(`/api/formulas/duplicate/${id}`),

  // Evaluate a single formula against data
  evaluate: (payload) => api.post('/api/formulas/evaluate', payload),

  // Evaluate all formulas for dashboard widget
  evaluateAll: (filters = {}) => {
    const params = {};
    if (filters.tower_id) params.tower_id = filters.tower_id;
    if (filters.city) params.city = filters.city;
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    return api.post('/api/formulas/evaluate-all', null, { params });
  },
};

export default api;
