// Script to clear all IndexedDB data
// Run this in the browser console or via Node.js with jsdom

const DB_NAME = 'matsplash_financial_db';
const DB_VERSION = 1;

async function clearAllData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onsuccess = () => {
      const db = request.result;
      const stores = ['employees', 'expenses', 'materialPurchases', 'sales', 'salaryPayments'];
      const transaction = db.transaction(stores, 'readwrite');
      let completed = 0;
      let hasError = false;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          completed++;
          console.log(`Cleared ${storeName}`);
          if (completed === stores.length && !hasError) {
            db.close();
            resolve();
          }
        };
        clearRequest.onerror = () => {
          hasError = true;
          console.error(`Error clearing ${storeName}:`, clearRequest.error);
          reject(clearRequest.error);
        };
      });
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// If running in browser
if (typeof window !== 'undefined' && window.indexedDB) {
  clearAllData()
    .then(() => {
      console.log('All data cleared successfully!');
      alert('All database data has been cleared. Please refresh the page.');
    })
    .catch((error) => {
      console.error('Error clearing data:', error);
      alert('Error clearing data: ' + error.message);
    });
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearAllData };
}

