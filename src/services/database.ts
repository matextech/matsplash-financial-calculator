import { Employee, Expense, MaterialPurchase, Sale, SalaryPayment, Settings, DEFAULT_SETTINGS } from '../types';

class DatabaseService {
  private dbName = 'matsplash_financial_db';
  private version = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Employees store
        if (!db.objectStoreNames.contains('employees')) {
          const employeeStore = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
          employeeStore.createIndex('email', 'email', { unique: true });
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          expenseStore.createIndex('date', 'date');
          expenseStore.createIndex('type', 'type');
        }

        // Material purchases store
        if (!db.objectStoreNames.contains('materialPurchases')) {
          const materialStore = db.createObjectStore('materialPurchases', { keyPath: 'id', autoIncrement: true });
          materialStore.createIndex('date', 'date');
          materialStore.createIndex('type', 'type');
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('date', 'date');
          salesStore.createIndex('driverEmail', 'driverEmail');
        }

        // Salary payments store
        if (!db.objectStoreNames.contains('salaryPayments')) {
          const salaryStore = db.createObjectStore('salaryPayments', { keyPath: 'id', autoIncrement: true });
          salaryStore.createIndex('employeeId', 'employeeId');
          salaryStore.createIndex('periodStart', 'periodStart');
          salaryStore.createIndex('paidDate', 'paidDate');
        }

        // Settings store (version 2)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Employee operations
  async addEmployee(employee: Omit<Employee, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['employees'], 'readwrite');
      const store = transaction.objectStore('employees');
      const request = store.add({
        ...employee,
        role: employee.role || 'General', // Default to 'General' if not specified
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getEmployees(): Promise<Employee[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['employees'], 'readonly');
      const store = transaction.objectStore('employees');
      const request = store.getAll();
      request.onsuccess = () => {
        const employees = request.result;
        // Ensure all employees have a role (default to 'General' for existing employees)
        const employeesWithRoles = employees.map((emp: Employee) => ({
          ...emp,
          role: emp.role || 'General'
        }));
        resolve(employeesWithRoles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['employees'], 'readwrite');
      const store = transaction.objectStore('employees');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Employee not found'));
          return;
        }
        
        const updated = {
          ...existing,
          ...employee,
          role: employee.role || existing.role || 'General', // Preserve existing role or default to 'General'
          updatedAt: new Date()
        };
        
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteEmployee(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['employees'], 'readwrite');
      const store = transaction.objectStore('employees');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Expense operations
  async addExpense(expense: Omit<Expense, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readwrite');
      const store = transaction.objectStore('expenses');
      const request = store.add({
        ...expense,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getExpenses(startDate?: Date, endDate?: Date): Promise<Expense[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readonly');
      const store = transaction.objectStore('expenses');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      
      request.onsuccess = () => {
        const expenses = request.result;
        // Normalize dates - ensure they're Date objects
        const normalizedExpenses = expenses.map((expense: Expense) => ({
          ...expense,
          date: expense.date instanceof Date ? expense.date : new Date(expense.date)
        }));
        resolve(normalizedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateExpense(id: number, expense: Partial<Expense>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readwrite');
      const store = transaction.objectStore('expenses');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Expense not found'));
          return;
        }
        
        // Ensure date is a Date object if provided
        const updated = { 
          ...existing, 
          ...expense,
          date: expense.date ? (expense.date instanceof Date ? expense.date : new Date(expense.date)) : existing.date
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteExpense(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readwrite');
      const store = transaction.objectStore('expenses');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Material purchase operations
  async addMaterialPurchase(purchase: Omit<MaterialPurchase, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['materialPurchases'], 'readwrite');
      const store = transaction.objectStore('materialPurchases');
      const request = store.add({
        ...purchase,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getMaterialPurchases(startDate?: Date, endDate?: Date): Promise<MaterialPurchase[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['materialPurchases'], 'readonly');
      const store = transaction.objectStore('materialPurchases');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      
      request.onsuccess = () => {
        const purchases = request.result;
        // Normalize dates - ensure they're Date objects
        const normalizedPurchases = purchases.map((purchase: MaterialPurchase) => ({
          ...purchase,
          date: purchase.date instanceof Date ? purchase.date : new Date(purchase.date)
        }));
        resolve(normalizedPurchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateMaterialPurchase(id: number, purchase: Partial<MaterialPurchase>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['materialPurchases'], 'readwrite');
      const store = transaction.objectStore('materialPurchases');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Material purchase not found'));
          return;
        }
        
        // Ensure date is a Date object if provided
        const updated = { 
          ...existing, 
          ...purchase,
          date: purchase.date ? (purchase.date instanceof Date ? purchase.date : new Date(purchase.date)) : existing.date
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteMaterialPurchase(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['materialPurchases'], 'readwrite');
      const store = transaction.objectStore('materialPurchases');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sale operations
  async addSale(sale: Omit<Sale, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');
      const request = store.add({
        ...sale,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getSales(startDate?: Date, endDate?: Date): Promise<Sale[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readonly');
      const store = transaction.objectStore('sales');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      
      request.onsuccess = () => {
        const sales = request.result;
        // Normalize dates - ensure they're Date objects
        const normalizedSales = sales.map((sale: Sale) => ({
          ...sale,
          date: sale.date instanceof Date ? sale.date : new Date(sale.date)
        }));
        resolve(normalizedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSale(id: number, sale: Partial<Sale>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Sale not found'));
          return;
        }
        
        // Ensure date is a Date object if provided
        const updated = { 
          ...existing, 
          ...sale,
          date: sale.date ? (sale.date instanceof Date ? sale.date : new Date(sale.date)) : existing.date
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteSale(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Salary payment operations
  async addSalaryPayment(payment: Omit<SalaryPayment, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['salaryPayments'], 'readwrite');
      const store = transaction.objectStore('salaryPayments');
      const request = store.add({
        ...payment,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getSalaryPayments(startDate?: Date, endDate?: Date): Promise<SalaryPayment[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['salaryPayments'], 'readonly');
      const store = transaction.objectStore('salaryPayments');
      const index = store.index('paidDate');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      
      request.onsuccess = () => {
        const payments = request.result;
        // Normalize dates - ensure they're Date objects
        const normalizedPayments = payments.map((payment: SalaryPayment) => ({
          ...payment,
          periodStart: payment.periodStart instanceof Date ? payment.periodStart : new Date(payment.periodStart),
          periodEnd: payment.periodEnd instanceof Date ? payment.periodEnd : new Date(payment.periodEnd),
          paidDate: payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate)
        }));
        resolve(normalizedPayments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSalaryPayment(id: number, payment: Partial<SalaryPayment>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['salaryPayments'], 'readwrite');
      const store = transaction.objectStore('salaryPayments');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Salary payment not found'));
          return;
        }
        
        // Ensure dates are Date objects if provided
        const updated = { 
          ...existing, 
          ...payment,
          periodStart: payment.periodStart ? (payment.periodStart instanceof Date ? payment.periodStart : new Date(payment.periodStart)) : existing.periodStart,
          periodEnd: payment.periodEnd ? (payment.periodEnd instanceof Date ? payment.periodEnd : new Date(payment.periodEnd)) : existing.periodEnd,
          paidDate: payment.paidDate ? (payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate)) : existing.paidDate
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteSalaryPayment(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['salaryPayments'], 'readwrite');
      const store = transaction.objectStore('salaryPayments');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Settings operations
  async getSettings(): Promise<Settings> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();
      request.onsuccess = () => {
        const settings = request.result;
        if (settings.length > 0) {
          resolve(settings[0] as Settings);
        } else {
          // Initialize with default settings
          this.updateSettings(DEFAULT_SETTINGS).then(resolve).catch(reject);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      // First, get existing settings or use defaults
      const existing = await this.getSettings().catch(() => DEFAULT_SETTINGS);
      
      const updatedSettings: Settings = {
        ...existing,
        ...settings,
        id: existing.id || 1,
        updatedAt: new Date(),
      };

      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      // Check if settings exist
      const getRequest = store.get(updatedSettings.id);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          // Update existing
          const updateRequest = store.put(updatedSettings);
          updateRequest.onsuccess = () => resolve(updatedSettings);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // Add new
          const addRequest = store.add(updatedSettings);
          addRequest.onsuccess = () => resolve(updatedSettings);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };
      getRequest.onerror = () => {
        // If get fails, try to add
        const addRequest = store.add(updatedSettings);
        addRequest.onsuccess = () => resolve(updatedSettings);
        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  // Clear all data from all stores
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const stores = ['employees', 'expenses', 'materialPurchases', 'sales', 'salaryPayments'];
      const transaction = db.transaction(stores, 'readwrite');
      let completed = 0;
      let hasError = false;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          hasError = true;
          reject(request.error);
        };
      });
    });
  }
}

export const dbService = new DatabaseService();

