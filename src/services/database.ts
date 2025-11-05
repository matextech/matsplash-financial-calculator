import { Employee, Expense, MaterialPurchase, Sale, SalaryPayment } from '../types';

class DatabaseService {
  private dbName = 'matsplash_financial_db';
  private version = 1;
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
      request.onsuccess = () => resolve(request.result);
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
        resolve(expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
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
        resolve(purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
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
        resolve(sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
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
        resolve(payments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DatabaseService();

