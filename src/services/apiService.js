// API Service - Replaces IndexedDB calls with HTTP requests
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001/api';
class ApiService {
    getAuthToken() {
        return localStorage.getItem('authToken');
    }
    async request(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
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
            // Only log error status, not sensitive data
            if (import.meta.env?.DEV) {
                console.error(`❌ API Error for ${endpoint}:`, response.status, response.statusText);
            }
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Handle both { success: true, data: [...] } and direct array responses
        const result = data.data || data;
        return result;
    }
    // Auth endpoints
    async login(identifier, passwordOrPin, twoFactorCode) {
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
                const error = new Error('2FA code required');
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
    async changePin(userId, newPin) {
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
        }
        catch (error) {
            console.error('Token verification error:', error);
            return { success: false };
        }
    }
    // 2FA endpoints
    async enable2FA(userId, secret) {
        return this.request('/auth/enable-2fa', {
            method: 'POST',
            body: JSON.stringify({ userId, secret }),
        });
    }
    async disable2FA(userId) {
        return this.request('/auth/disable-2fa', {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    }
    async verify2FACode(identifier, passwordOrPin, code) {
        const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, passwordOrPin, code }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify 2FA code');
        }
        return data;
    }
    // Verify 2FA code for authenticated user (for password reset in dashboard)
    async verify2FACodeAuthenticated(userId, code) {
        const token = this.getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        const response = await fetch(`${API_BASE_URL}/auth/verify-2fa-authenticated`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, code }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify 2FA code');
        }
        return data;
    }
    // Verify director password (for PIN reset operations)
    async verifyDirectorPassword(identifier, password) {
        const response = await fetch(`${API_BASE_URL}/auth/verify-director-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            return { success: false, isValid: false };
        }
        return data;
    }
    // Check if identifier belongs to a director (for showing PIN recovery option)
    async checkIfDirector(identifier) {
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
    async requestPinRecovery(directorIdentifier, password, targetUserIdentifier) {
        const response = await fetch(`${API_BASE_URL}/auth/request-pin-recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: directorIdentifier, password, targetUserIdentifier }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to request PIN recovery');
        }
        return data;
    }
    // Password Recovery endpoints (Director only - requires 2FA)
    async requestPasswordRecovery(identifier, twoFactorCode) {
        const response = await fetch(`${API_BASE_URL}/auth/request-password-recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, twoFactorCode }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to request password recovery');
        }
        return data;
    }
    async verifyPasswordRecovery(token, newPassword) {
        const response = await fetch(`${API_BASE_URL}/auth/verify-password-recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }
        return data;
    }
    async verifyPinRecovery(token, newPin) {
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
        return this.request('/users');
    }
    async getUser(id) {
        return this.request(`/users/${id}`);
    }
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }
    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }
    async resetUserPin(id) {
        return this.request(`/users/${id}/reset-pin`, {
            method: 'POST',
        });
    }
    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE',
        });
    }
    async cleanData(dataType) {
        return this.request('/users/clean-data', {
            method: 'POST',
            body: JSON.stringify({ dataType }),
        });
    }
    async cleanAllData() {
        return this.request('/users/clean-all-data', {
            method: 'POST',
        });
    }
    // Employee endpoints
    async getEmployees() {
        return this.request('/employees');
    }
    async getEmployee(id) {
        return this.request(`/employees/${id}`);
    }
    async createEmployee(employeeData) {
        return this.request('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData),
        });
    }
    async updateEmployee(id, employeeData) {
        return this.request(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData),
        });
    }
    async deleteEmployee(id) {
        return this.request(`/employees/${id}`, {
            method: 'DELETE',
        });
    }
    // Receptionist Sales endpoints
    async getReceptionistSales(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate.toISOString().split('T')[0]);
        if (endDate)
            params.append('endDate', endDate.toISOString().split('T')[0]);
        const queryString = params.toString();
        return this.request(`/receptionist-sales${queryString ? '?' + queryString : ''}`);
    }
    async getReceptionistSale(id) {
        return this.request(`/receptionist-sales/${id}`);
    }
    async createReceptionistSale(saleData) {
        return this.request('/receptionist-sales', {
            method: 'POST',
            body: JSON.stringify(saleData),
        });
    }
    async updateReceptionistSale(id, saleData) {
        return this.request(`/receptionist-sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(saleData),
        });
    }
    async deleteReceptionistSale(id) {
        return this.request(`/receptionist-sales/${id}`, {
            method: 'DELETE',
        });
    }
    // Storekeeper Entries endpoints
    async getStorekeeperEntries(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate.toISOString().split('T')[0]);
        if (endDate)
            params.append('endDate', endDate.toISOString().split('T')[0]);
        const queryString = params.toString();
        return this.request(`/storekeeper-entries${queryString ? '?' + queryString : ''}`);
    }
    async getStorekeeperEntry(id) {
        return this.request(`/storekeeper-entries/${id}`);
    }
    async createStorekeeperEntry(entryData) {
        return this.request('/storekeeper-entries', {
            method: 'POST',
            body: JSON.stringify(entryData),
        });
    }
    async updateStorekeeperEntry(id, entryData) {
        return this.request(`/storekeeper-entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entryData),
        });
    }
    async deleteStorekeeperEntry(id) {
        return this.request(`/storekeeper-entries/${id}`, {
            method: 'DELETE',
        });
    }
    // Settlement endpoints
    async getSettlements(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate.toISOString().split('T')[0]);
        if (endDate)
            params.append('endDate', endDate.toISOString().split('T')[0]);
        const queryString = params.toString();
        return this.request(`/settlements${queryString ? '?' + queryString : ''}`);
    }
    async getSettlement(id) {
        return this.request(`/settlements/${id}`);
    }
    async createSettlement(settlementData) {
        return this.request('/settlements', {
            method: 'POST',
            body: JSON.stringify(settlementData),
        });
    }
    async updateSettlement(id, settlementData) {
        return this.request(`/settlements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(settlementData),
        });
    }
    async deleteSettlement(id) {
        return this.request(`/settlements/${id}`, {
            method: 'DELETE',
        });
    }
    // Settlement Payment endpoints
    async getSettlementPayments(settlementId) {
        return this.request(`/settlement-payments/settlement/${settlementId}`);
    }
    async createSettlementPayment(paymentData) {
        return this.request('/settlement-payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }
    async deleteSettlementPayment(id) {
        return this.request(`/settlement-payments/${id}`, {
            method: 'DELETE',
        });
    }
    // Sales endpoints
    async getSales(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) {
            // Format date as YYYY-MM-DD to avoid timezone issues
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            params.append('startDate', `${year}-${month}-${day}`);
        }
        if (endDate) {
            // Format end date and add 1 day to make range inclusive
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            params.append('endDate', `${year}-${month}-${day}`);
        }
        const queryString = params.toString();
        return this.request(`/sales${queryString ? '?' + queryString : ''}`);
    }
    async createSale(saleData) {
        const response = await this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData),
        });
        return response.data || response;
    }
    async updateSale(id, saleData) {
        const response = await this.request(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(saleData),
        });
        return response.data || response;
    }
    async deleteSale(id) {
        return this.request(`/sales/${id}`, {
            method: 'DELETE',
        });
    }
    // Expenses endpoints
    async getExpenses(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) {
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            params.append('startDate', `${year}-${month}-${day}`);
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            params.append('endDate', `${year}-${month}-${day}`);
        }
        const queryString = params.toString();
        return this.request(`/expenses${queryString ? '?' + queryString : ''}`);
    }
    async createExpense(expenseData) {
        const response = await this.request('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData),
        });
        return response.data || response;
    }
    async updateExpense(id, expenseData) {
        const response = await this.request(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(expenseData),
        });
        return response.data || response;
    }
    async deleteExpense(id) {
        return this.request(`/expenses/${id}`, {
            method: 'DELETE',
        });
    }
    // Material Purchases endpoints
    async getMaterialPurchases(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) {
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            params.append('startDate', `${year}-${month}-${day}`);
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            params.append('endDate', `${year}-${month}-${day}`);
        }
        const queryString = params.toString();
        return this.request(`/material-purchases${queryString ? '?' + queryString : ''}`);
    }
    async createMaterialPurchase(purchaseData) {
        const response = await this.request('/material-purchases', {
            method: 'POST',
            body: JSON.stringify(purchaseData),
        });
        return response.data || response;
    }
    async updateMaterialPurchase(id, purchaseData) {
        const response = await this.request(`/material-purchases/${id}`, {
            method: 'PUT',
            body: JSON.stringify(purchaseData),
        });
        return response.data || response;
    }
    async deleteMaterialPurchase(id) {
        return this.request(`/material-purchases/${id}`, {
            method: 'DELETE',
        });
    }
    // Salary Payments endpoints
    async getSalaryPayments(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) {
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            params.append('startDate', `${year}-${month}-${day}`);
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            params.append('endDate', `${year}-${month}-${day}`);
        }
        const queryString = params.toString();
        return this.request(`/salary-payments${queryString ? '?' + queryString : ''}`);
    }
    async createSalaryPayment(paymentData) {
        const response = await this.request('/salary-payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
        return response.data || response;
    }
    async updateSalaryPayment(id, paymentData) {
        const response = await this.request(`/salary-payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(paymentData),
        });
        return response.data || response;
    }
    async deleteSalaryPayment(id) {
        return this.request(`/salary-payments/${id}`, {
            method: 'DELETE',
        });
    }
    // Settings endpoints
    async getSettings() {
        return this.request('/settings');
    }
    async updateSettings(settingsData) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData),
        });
    }
    // Bag Prices endpoints
    async getBagPrices(includeInactive = false) {
        const params = includeInactive ? '?includeInactive=true' : '';
        return this.request(`/bag-prices${params}`);
    }
    async getBagPrice(id) {
        return this.request(`/bag-prices/${id}`);
    }
    async createBagPrice(priceData) {
        return this.request('/bag-prices', {
            method: 'POST',
            body: JSON.stringify(priceData),
        });
    }
    // Material Prices endpoints
    async getMaterialPrices(type, includeInactive = false) {
        let params = includeInactive ? '?includeInactive=true' : '';
        if (type) {
            params += params ? `&type=${type}` : `?type=${type}`;
        }
        return this.request(`/material-prices${params}`);
    }
    async getMaterialPrice(id) {
        return this.request(`/material-prices/${id}`);
    }
    async createMaterialPrice(priceData) {
        return this.request('/material-prices', {
            method: 'POST',
            body: JSON.stringify(priceData),
        });
    }
    async updateMaterialPrice(id, priceData) {
        return this.request(`/material-prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(priceData),
        });
    }
    async deleteMaterialPrice(id) {
        return this.request(`/material-prices/${id}`, {
            method: 'DELETE',
        });
    }
    async updateBagPrice(id, priceData) {
        return this.request(`/bag-prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(priceData),
        });
    }
    async deleteBagPrice(id) {
        return this.request(`/bag-prices/${id}`, {
            method: 'DELETE',
        });
    }
    // Audit log endpoints
    async getAuditLogs(entityType, entityId, startDate, endDate) {
        let url = '/audit-logs?';
        if (entityType)
            url += `entityType=${entityType}&`;
        if (entityId)
            url += `entityId=${entityId}&`;
        if (startDate)
            url += `startDate=${startDate.toISOString()}&`;
        if (endDate)
            url += `endDate=${endDate.toISOString()}&`;
        return this.request(url);
    }
    async createAuditLog(logData) {
        return this.request('/audit-logs', {
            method: 'POST',
            body: JSON.stringify(logData),
        });
    }
    // Notifications endpoints (placeholder - to be implemented)
    async getNotifications(userId, isRead) {
        // Placeholder - return empty array for now
        return [];
    }
    async markNotificationAsRead(id) {
        // Placeholder
        return { success: true };
    }
    // Packer Entry endpoints
    async getPackerEntries(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate.toISOString().split('T')[0]);
        if (endDate)
            params.append('endDate', endDate.toISOString().split('T')[0]);
        const queryString = params.toString();
        return this.request(`/packer-entries${queryString ? '?' + queryString : ''}`);
    }
    async getPackerEntry(id) {
        return this.request(`/packer-entries/${id}`);
    }
    async createPackerEntry(entryData) {
        const response = await this.request('/packer-entries', {
            method: 'POST',
            body: JSON.stringify(entryData),
        });
        return response.data || response;
    }
    async updatePackerEntry(id, entryData) {
        const response = await this.request(`/packer-entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entryData),
        });
        return response.data || response;
    }
    async deletePackerEntry(id) {
        return this.request(`/packer-entries/${id}`, {
            method: 'DELETE',
        });
    }
}
export const apiService = new ApiService();
