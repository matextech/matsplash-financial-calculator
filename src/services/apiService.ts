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
  async login(identifier: string, passwordOrPin: string, twoFactorCode?: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, passwordOrPin, twoFactorCode }),
    });

    const data = await response.json();
    
    // Check if response was successful
    if (!response.ok) {
      // If 2FA is required, throw specific error
      if (data.requires2FA) {
        const error: any = new Error('2FA code required');
        error.requires2FA = true;
        throw error;
      }
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

  async verifyToken(): Promise<{ success: boolean; user?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        return { success: false };
      }

      const data = await response.json();
      return { success: data.success || false, user: data.user };
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false };
    }
  }

  // 2FA endpoints
  async enable2FA(userId: number, secret: string): Promise<{ success: boolean; message?: string }> {
    return this.request('/auth/enable-2fa', {
      method: 'POST',
      body: JSON.stringify({ userId, secret }),
    });
  }

  async disable2FA(userId: number): Promise<{ success: boolean; message?: string }> {
    return this.request('/auth/disable-2fa', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async verify2FACode(identifier: string, passwordOrPin: string, code: string): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, passwordOrPin, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '2FA verification failed');
    }

    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    return data;
  }

  // Check if identifier belongs to a director (for showing PIN recovery option)
  async checkIfDirector(identifier: string): Promise<{ success: boolean; isDirector: boolean }> {
    const response = await fetch(`${API_BASE_URL}/auth/check-director`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, isDirector: false };
    }

    return data;
  }

  // PIN Recovery endpoints (Director only - can reset PINs for any user)
  async requestPinRecovery(directorIdentifier: string, targetUserIdentifier?: string): Promise<{ success: boolean; message?: string; recoveryToken?: string; expiresAt?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/request-pin-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: directorIdentifier, targetUserIdentifier }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to request PIN recovery');
    }

    return data;
  }

  async verifyPinRecovery(token: string, newPin: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-pin-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPin }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset PIN');
    }

    return data;
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

  // Receptionist Sales endpoints
  async getReceptionistSales(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    
    const queryString = params.toString();
    return this.request<any[]>(`/receptionist-sales${queryString ? '?' + queryString : ''}`);
  }

  async getReceptionistSale(id: number) {
    return this.request<any>(`/receptionist-sales/${id}`);
  }

  async createReceptionistSale(saleData: any) {
    return this.request('/receptionist-sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async updateReceptionistSale(id: number, saleData: any) {
    return this.request(`/receptionist-sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData),
    });
  }

  async deleteReceptionistSale(id: number) {
    return this.request(`/receptionist-sales/${id}`, {
      method: 'DELETE',
    });
  }

  // Storekeeper Entries endpoints
  async getStorekeeperEntries(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    
    const queryString = params.toString();
    return this.request<any[]>(`/storekeeper-entries${queryString ? '?' + queryString : ''}`);
  }

  async getStorekeeperEntry(id: number) {
    return this.request<any>(`/storekeeper-entries/${id}`);
  }

  async createStorekeeperEntry(entryData: any) {
    return this.request('/storekeeper-entries', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateStorekeeperEntry(id: number, entryData: any) {
    return this.request(`/storekeeper-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  async deleteStorekeeperEntry(id: number) {
    return this.request(`/storekeeper-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Settlement endpoints
  async getSettlements(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    
    const queryString = params.toString();
    return this.request<any[]>(`/settlements${queryString ? '?' + queryString : ''}`);
  }

  async getSettlement(id: number) {
    return this.request<any>(`/settlements/${id}`);
  }

  async createSettlement(settlementData: any) {
    return this.request('/settlements', {
      method: 'POST',
      body: JSON.stringify(settlementData),
    });
  }

  async updateSettlement(id: number, settlementData: any) {
    return this.request(`/settlements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(settlementData),
    });
  }

  async deleteSettlement(id: number) {
    return this.request(`/settlements/${id}`, {
      method: 'DELETE',
    });
  }

  // Settlement Payment endpoints
  async getSettlementPayments(settlementId: number) {
    return this.request<any[]>(`/settlement-payments/settlement/${settlementId}`);
  }

  async createSettlementPayment(paymentData: any) {
    return this.request('/settlement-payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async deleteSettlementPayment(id: number) {
    return this.request(`/settlement-payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings endpoints
  async getSettings() {
    return this.request<any>('/settings');
  }

  async updateSettings(settingsData: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Bag Prices endpoints
  async getBagPrices(includeInactive = false) {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.request<any[]>(`/bag-prices${params}`);
  }

  async getBagPrice(id: number) {
    return this.request<any>(`/bag-prices/${id}`);
  }

  async createBagPrice(priceData: any) {
    return this.request('/bag-prices', {
      method: 'POST',
      body: JSON.stringify(priceData),
    });
  }

  // Material Prices endpoints
  async getMaterialPrices(type?: 'sachet_roll' | 'packing_nylon', includeInactive = false) {
    let params = includeInactive ? '?includeInactive=true' : '';
    if (type) {
      params += params ? `&type=${type}` : `?type=${type}`;
    }
    return this.request<any[]>(`/material-prices${params}`);
  }

  async getMaterialPrice(id: number) {
    return this.request<any>(`/material-prices/${id}`);
  }

  async createMaterialPrice(priceData: any) {
    return this.request('/material-prices', {
      method: 'POST',
      body: JSON.stringify(priceData),
    });
  }

  async updateMaterialPrice(id: number, priceData: any) {
    return this.request(`/material-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(priceData),
    });
  }

  async deleteMaterialPrice(id: number) {
    return this.request(`/material-prices/${id}`, {
      method: 'DELETE',
    });
  }

  async updateBagPrice(id: number, priceData: any) {
    return this.request(`/bag-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(priceData),
    });
  }

  async deleteBagPrice(id: number) {
    return this.request(`/bag-prices/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit log endpoints
  async getAuditLogs(entityType?: string, entityId?: number, startDate?: Date, endDate?: Date) {
    let url = '/audit-logs?';
    if (entityType) url += `entityType=${entityType}&`;
    if (entityId) url += `entityId=${entityId}&`;
    if (startDate) url += `startDate=${startDate.toISOString()}&`;
    if (endDate) url += `endDate=${endDate.toISOString()}&`;
    return this.request<any[]>(url);
  }

  async createAuditLog(logData: any) {
    return this.request('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  }

  // Notifications endpoints (placeholder - to be implemented)
  async getNotifications(userId: number, isRead?: boolean) {
    // Placeholder - return empty array for now
    return [];
  }

  async markNotificationAsRead(id: number) {
    // Placeholder
    return { success: true };
  }
}

export const apiService = new ApiService();

