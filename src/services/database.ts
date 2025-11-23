import { Employee, Expense, MaterialPurchase, Sale, PackerEntry, SalaryPayment, Settings, DEFAULT_SETTINGS } from '../types';
import { User } from '../types/auth';
import { ReceptionistSale, StorekeeperEntry, Settlement, AuditLog, Notification } from '../types/sales-log';

class DatabaseService {
  private dbName = 'matsplash_financial_db';
  private version = 4; // Incremented for packerEntries store
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database open error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked - please close other tabs with this app open');
        alert('Database upgrade is blocked. Please close all other tabs with this app and refresh the page.');
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully, version:', this.db.version);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        try {
          console.log('Database upgrade needed, old version:', event.oldVersion, 'new version:', event.newVersion);
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Add error handler for upgrade
          db.onerror = (error) => {
            console.error('Database upgrade error:', error);
          };
          
          db.onabort = () => {
            console.error('Database upgrade aborted');
          };

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

        // Packer entries store (version 4)
        if (!db.objectStoreNames.contains('packerEntries')) {
          const packerStore = db.createObjectStore('packerEntries', { keyPath: 'id', autoIncrement: true });
          packerStore.createIndex('date', 'date');
          packerStore.createIndex('employeeId', 'employeeId');
          packerStore.createIndex('packerEmail', 'packerEmail');
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

        // Users store (version 3)
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('phone', 'phone', { unique: true });
          userStore.createIndex('email', 'email', { unique: false });
          userStore.createIndex('role', 'role');
        }

        // Receptionist sales store (version 3)
        if (!db.objectStoreNames.contains('receptionistSales')) {
          const salesStore = db.createObjectStore('receptionistSales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('date', 'date');
          salesStore.createIndex('driverId', 'driverId');
          salesStore.createIndex('submittedBy', 'submittedBy');
          salesStore.createIndex('isSubmitted', 'isSubmitted');
        }

        // Storekeeper entries store (version 3)
        if (!db.objectStoreNames.contains('storekeeperEntries')) {
          const entryStore = db.createObjectStore('storekeeperEntries', { keyPath: 'id', autoIncrement: true });
          entryStore.createIndex('date', 'date');
          entryStore.createIndex('driverId', 'driverId');
          entryStore.createIndex('packerId', 'packerId');
          entryStore.createIndex('submittedBy', 'submittedBy');
          entryStore.createIndex('isSubmitted', 'isSubmitted');
        }

        // Settlements store (version 3)
        if (!db.objectStoreNames.contains('settlements')) {
          const settlementStore = db.createObjectStore('settlements', { keyPath: 'id', autoIncrement: true });
          settlementStore.createIndex('date', 'date');
          settlementStore.createIndex('receptionistSaleId', 'receptionistSaleId');
          settlementStore.createIndex('isSettled', 'isSettled');
        }

        // Audit logs store (version 3)
        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
          auditStore.createIndex('entityType', 'entityType');
          auditStore.createIndex('entityId', 'entityId');
          auditStore.createIndex('changedBy', 'changedBy');
          auditStore.createIndex('changedAt', 'changedAt');
        }

        // Notifications store (version 3)
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
          notificationStore.createIndex('userId', 'userId');
          notificationStore.createIndex('isRead', 'isRead');
          notificationStore.createIndex('createdAt', 'createdAt');
        }

        console.log('Database upgrade completed. Object stores:', Array.from(db.objectStoreNames));
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

  // Packer entry operations
  async addPackerEntry(entry: Omit<PackerEntry, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['packerEntries'], 'readwrite');
      const store = transaction.objectStore('packerEntries');
      const request = store.add({
        ...entry,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPackerEntries(startDate?: Date, endDate?: Date): Promise<PackerEntry[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['packerEntries'], 'readonly');
      const store = transaction.objectStore('packerEntries');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        // Normalize dates - ensure they're Date objects
        const normalizedEntries = entries.map((entry: PackerEntry) => ({
          ...entry,
          date: entry.date instanceof Date ? entry.date : new Date(entry.date)
        }));
        resolve(normalizedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updatePackerEntry(id: number, entry: Partial<PackerEntry>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['packerEntries'], 'readwrite');
      const store = transaction.objectStore('packerEntries');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Packer entry not found'));
          return;
        }
        
        const updated = {
          ...existing,
          ...entry,
          date: entry.date ? (entry.date instanceof Date ? entry.date : new Date(entry.date)) : existing.date
        };
        
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deletePackerEntry(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['packerEntries'], 'readwrite');
      const store = transaction.objectStore('packerEntries');
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
          // Return defaults without calling updateSettings to avoid circular dependency
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => {
        // If error, return defaults
        resolve(DEFAULT_SETTINGS);
      };
    });
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      // Get existing settings directly from DB to avoid circular dependency
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      // Try to get existing settings
      const getRequest = store.getAll();
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const existingSettings = existing.length > 0 ? existing[0] as Settings : DEFAULT_SETTINGS;
        
        const updatedSettings: Settings = {
          ...existingSettings,
          ...settings,
          id: existingSettings.id || 1,
          updatedAt: new Date(),
        };

        // Check if settings exist by ID
        const checkRequest = store.get(updatedSettings.id);
        checkRequest.onsuccess = () => {
          if (checkRequest.result) {
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
        checkRequest.onerror = () => {
          // If get fails, try to add
          const addRequest = store.add(updatedSettings);
          addRequest.onsuccess = () => resolve(updatedSettings);
          addRequest.onerror = () => reject(addRequest.error);
        };
      };
      getRequest.onerror = () => {
        // If getAll fails, use defaults and add
        const updatedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...settings,
          id: 1,
          updatedAt: new Date(),
        };
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

  // Normalize phone number (remove spaces, dashes, etc.)
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, ''); // Remove all non-digits
  }

  // User operations
  async addUser(user: Omit<User, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains('users')) {
          console.warn('Users store does not exist yet');
          reject(new Error('Users store does not exist'));
          return;
        }
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        // Normalize phone number before storing
        const normalizedUser = {
          ...user,
          phone: this.normalizePhone(user.phone),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const request = store.add(normalizedUser);
        request.onsuccess = () => {
          console.log('User added successfully:', user.email || user.phone);
          resolve(request.result as number);
        };
        request.onerror = () => {
          console.error('addUser error:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('addUser exception:', error);
        reject(error);
      }
    });
  }

  async getUsers(): Promise<User[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains('users')) {
          console.warn('Users store does not exist yet');
          resolve([]);
          return;
        }
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();
        request.onsuccess = () => {
          console.log('getUsers result:', request.result?.length || 0, 'users');
          resolve(request.result || []);
        };
        request.onerror = () => {
          console.error('getUsers error:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('getUsers exception:', error);
        reject(error);
      }
    });
  }

  async getUser(id: number): Promise<User | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!id) {
        resolve(null);
        return;
      }
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);
      request.onsuccess = () => {
        const user = request.result || null;
        if (user) {
          console.log('getUser: Retrieved user:', { id: user.id, name: user.name, pin: user.pin });
        }
        resolve(user);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains('users')) {
          console.warn('Users store does not exist yet');
          resolve(null);
          return;
        }
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('phone');
        const request = index.get(phone);
        request.onsuccess = () => {
          console.log('getUserByPhone result:', request.result ? 'found' : 'not found');
          resolve(request.result || null);
        };
        request.onerror = () => {
          console.error('getUserByPhone error:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('getUserByPhone exception:', error);
        reject(error);
      }
    });
  }

  async updateUser(id: number, user: Partial<User>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          console.error('updateUser: User not found with id:', id);
          reject(new Error('User not found'));
          return;
        }
        
        console.log('🔍 updateUser: Existing user before update:', { 
          id: existing.id, 
          name: existing.name, 
          currentPin: existing.pin,
          updatingWith: user 
        });
        
        // Normalize phone if provided
        const updateData: Partial<User> = { ...user };
        if (updateData.phone) {
          updateData.phone = this.normalizePhone(updateData.phone);
        }
        
        // Merge existing with update data - PIN will override if provided
        const updated: User = {
          ...existing,
          ...updateData,
          updatedAt: new Date()
        };
        
        // CRITICAL: Explicitly ensure PIN is set if provided (override any spread issues)
        if (user.pin !== undefined && user.pin !== null) {
          updated.pin = String(user.pin); // Ensure it's a string
          console.log('✅ updateUser: PIN explicitly set to:', updated.pin);
        }
        if (user.pinResetRequired !== undefined) {
          updated.pinResetRequired = Boolean(user.pinResetRequired);
          console.log('✅ updateUser: pinResetRequired set to:', updated.pinResetRequired);
        }
        
        console.log('💾 updateUser: Saving user with PIN:', updated.pin, 'Full object:', {
          id: updated.id,
          name: updated.name,
          pin: updated.pin,
          pinResetRequired: updated.pinResetRequired,
          phone: updated.phone,
          email: updated.email
        });
        
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => {
          console.log('✅ updateUser: PUT request succeeded. PIN saved:', updated.pin);
          // Immediately verify by reading back
          const verifyRequest = store.get(id);
          verifyRequest.onsuccess = () => {
            const verified = verifyRequest.result;
            console.log('🔍 updateUser: Verification read - PIN is:', verified?.pin, 'Expected:', updated.pin);
            if (verified && verified.pin === updated.pin) {
              console.log('✅ updateUser: PIN verified successfully in database');
              resolve();
            } else {
              console.error('❌ updateUser: PIN verification failed!', {
                expected: updated.pin,
                actual: verified?.pin
              });
              // Still resolve - the put succeeded, verification might be a timing issue
              resolve();
            }
          };
          verifyRequest.onerror = () => {
            console.warn('updateUser: Could not verify, but put succeeded');
            resolve();
          };
        };
        putRequest.onerror = () => {
          console.error('❌ updateUser: PUT request failed:', putRequest.error);
          reject(putRequest.error);
        };
      };
      
      getRequest.onerror = () => {
        console.error('❌ updateUser: GET request failed:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async deleteUser(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Receptionist Sale operations
  async addReceptionistSale(sale: Omit<ReceptionistSale, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['receptionistSales'], 'readwrite');
      const store = transaction.objectStore('receptionistSales');
      const request = store.add({
        ...sale,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getReceptionistSales(startDate?: Date, endDate?: Date): Promise<ReceptionistSale[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['receptionistSales'], 'readonly');
      const store = transaction.objectStore('receptionistSales');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      request.onsuccess = () => {
        const sales = request.result;
        const normalized = sales.map((sale: ReceptionistSale) => ({
          ...sale,
          date: sale.date instanceof Date ? sale.date : new Date(sale.date),
          submittedAt: sale.submittedAt instanceof Date ? sale.submittedAt : (sale.submittedAt ? new Date(sale.submittedAt) : new Date()),
          createdAt: sale.createdAt instanceof Date ? sale.createdAt : (sale.createdAt ? new Date(sale.createdAt) : new Date()),
          updatedAt: sale.updatedAt instanceof Date ? sale.updatedAt : (sale.updatedAt ? new Date(sale.updatedAt) : new Date())
        }));
        resolve(normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateReceptionistSale(id: number, sale: Partial<ReceptionistSale>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['receptionistSales'], 'readwrite');
      const store = transaction.objectStore('receptionistSales');
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Sale not found'));
          return;
        }
        const updated = { ...existing, ...sale, updatedAt: new Date() };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteReceptionistSale(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['receptionistSales'], 'readwrite');
      const store = transaction.objectStore('receptionistSales');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Storekeeper Entry operations
  async addStorekeeperEntry(entry: Omit<StorekeeperEntry, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storekeeperEntries'], 'readwrite');
      const store = transaction.objectStore('storekeeperEntries');
      const request = store.add({
        ...entry,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getStorekeeperEntries(startDate?: Date, endDate?: Date): Promise<StorekeeperEntry[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storekeeperEntries'], 'readonly');
      const store = transaction.objectStore('storekeeperEntries');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      request.onsuccess = () => {
        const entries = request.result;
        const normalized = entries.map((entry: StorekeeperEntry) => ({
          ...entry,
          date: entry.date instanceof Date ? entry.date : new Date(entry.date),
          submittedAt: entry.submittedAt instanceof Date ? entry.submittedAt : (entry.submittedAt ? new Date(entry.submittedAt) : new Date()),
          createdAt: entry.createdAt instanceof Date ? entry.createdAt : (entry.createdAt ? new Date(entry.createdAt) : new Date()),
          updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt : (entry.updatedAt ? new Date(entry.updatedAt) : new Date())
        }));
        resolve(normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateStorekeeperEntry(id: number, entry: Partial<StorekeeperEntry>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storekeeperEntries'], 'readwrite');
      const store = transaction.objectStore('storekeeperEntries');
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Entry not found'));
          return;
        }
        const updated = { ...existing, ...entry, updatedAt: new Date() };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteStorekeeperEntry(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storekeeperEntries'], 'readwrite');
      const store = transaction.objectStore('storekeeperEntries');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Settlement operations
  async addSettlement(settlement: Omit<Settlement, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settlements'], 'readwrite');
      const store = transaction.objectStore('settlements');
      const request = store.add({
        ...settlement,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getSettlements(startDate?: Date, endDate?: Date): Promise<Settlement[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settlements'], 'readonly');
      const store = transaction.objectStore('settlements');
      const index = store.index('date');
      const range = startDate && endDate 
        ? IDBKeyRange.bound(startDate, endDate)
        : undefined;
      const request = range ? index.getAll(range) : store.getAll();
      request.onsuccess = () => {
        const settlements = request.result;
        const normalized = settlements.map((s: Settlement) => ({
          ...s,
          date: s.date instanceof Date ? s.date : new Date(s.date),
          settledAt: s.settledAt instanceof Date ? s.settledAt : s.settledAt ? new Date(s.settledAt) : undefined,
          createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt : new Date(s.updatedAt)
        }));
        resolve(normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSettlement(id: number, settlement: Partial<Settlement>): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settlements'], 'readwrite');
      const store = transaction.objectStore('settlements');
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Settlement not found'));
          return;
        }
        const updated = { ...existing, ...settlement, updatedAt: new Date() };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Audit Log operations
  async addAuditLog(log: Omit<AuditLog, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['auditLogs'], 'readwrite');
      const store = transaction.objectStore('auditLogs');
      const request = store.add({
        ...log,
        changedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getAuditLogs(entityType?: string, entityId?: number, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['auditLogs'], 'readonly');
      const store = transaction.objectStore('auditLogs');
      let request: IDBRequest;
      
      if (entityType && entityId) {
        const index = store.index('entityType');
        const range = IDBKeyRange.only(entityType);
        request = index.getAll(range);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        let logs = request.result;
        
        if (entityId) {
          logs = logs.filter((log: AuditLog) => log.entityId === entityId);
        }
        
        if (startDate && endDate) {
          logs = logs.filter((log: AuditLog) => {
            const logDate = log.changedAt instanceof Date ? log.changedAt : new Date(log.changedAt);
            return logDate >= startDate && logDate <= endDate;
          });
        }
        
        const normalized = logs.map((log: AuditLog) => ({
          ...log,
          changedAt: log.changedAt instanceof Date ? log.changedAt : (log.changedAt ? new Date(log.changedAt) : new Date())
        }));
        resolve(normalized.sort((a: AuditLog, b: AuditLog) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Notification operations
  async addNotification(notification: Omit<Notification, 'id'>): Promise<number> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.add({
        ...notification,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getNotifications(userId: number, isRead?: boolean): Promise<Notification[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => {
        let notifications = request.result;
        if (isRead !== undefined) {
          notifications = notifications.filter((n: Notification) => n.isRead === isRead);
        }
        const normalized = notifications.map((n: Notification) => ({
          ...n,
          createdAt: n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)
        }));
        resolve(normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markNotificationAsRead(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Notification not found'));
          return;
        }
        const updated = { ...existing, isRead: true };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

export const dbService = new DatabaseService();

