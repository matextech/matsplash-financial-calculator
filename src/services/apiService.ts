// API Service - Replaces IndexedDB calls with HTTP requests
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  // Auth endpoints
  async login(identifier: string, passwordOrPin: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, passwordOrPin }),
    });

    const data = await response.json();
    
    // Check if response was successful
    if (!response.ok) {
      throw new Error(data.message || 'Invalid credentials');
    }
    
    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    return data;
  }

  async changePin(userId: number, newPin: string) {
    const response = await fetch(`${API_BASE_URL}/auth/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPin }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to change PIN');
    }

    return data;
  }

  async verifyToken() {
    return this.request<{ success: boolean; user: any }>('/auth/verify');
  }

  async logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    return this.request('/auth/logout', { method: 'POST' });
  }

  // User endpoints
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async getUser(id: number) {
    return this.request<any>(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPin(id: number) {
    return this.request<{ newPin: string }>(`/users/${id}/reset-pin`, {
      method: 'POST',
    });
  }

  async deleteUser(id: number) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Employee endpoints
  async getEmployees() {
    return this.request<any[]>('/employees');
  }

  async getEmployee(id: number) {
    return this.request<any>(`/employees/${id}`);
  }

  async createEmployee(employeeData: any) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(id: number, employeeData: any) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(id: number) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Sales endpoints (placeholder)
  async getReceptionistSales(startDate: Date, endDate: Date) {
    // Placeholder - return empty array for now
    return [];
  }

  // Storekeeper endpoints (placeholder)
  async getStorekeeperEntries(startDate: Date, endDate: Date) {
    // Placeholder - return empty array for now
    return [];
  }

  // Settlement endpoints (placeholder)
  async getSettlements(startDate: Date, endDate: Date) {
    // Placeholder - return empty array for now
    return [];
  }

  // Audit log endpoints (placeholder)
  async getAuditLogs(entityType?: string, entityId?: number, startDate?: Date, endDate?: Date) {
    // Placeholder - return empty array for now
    return [];
  }
}

export const apiService = new ApiService();

