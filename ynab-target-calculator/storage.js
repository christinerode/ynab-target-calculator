/**
 * Storage and expense management operations
 */

(function() {
  'use strict';

  // Migration: Copy data from local storage to sync storage (runs once)
  async function migrateLocalToSync() {
    return new Promise((resolve) => {
      // Check if migration has already been done
      chrome.storage.sync.get(['tc_migration_complete'], (syncResult) => {
        if (syncResult.tc_migration_complete) {
          // Migration already completed
          resolve();
          return;
        }

        // Get all data from local storage
        chrome.storage.local.get(null, (localResult) => {
          if (chrome.runtime.lastError) {
            console.warn('Error reading local storage:', chrome.runtime.lastError);
            resolve();
            return;
          }

          // Filter to only get our extension's data (keys starting with 'tc_')
          const migrationData = {};
          let hasData = false;
          
          for (const key in localResult) {
            if (key.startsWith('tc_')) {
              migrationData[key] = localResult[key];
              hasData = true;
            }
          }

          if (!hasData) {
            // No data to migrate, mark migration as complete
            chrome.storage.sync.set({ tc_migration_complete: true }, resolve);
            return;
          }

          // Copy all data to sync storage
          chrome.storage.sync.set(migrationData, () => {
            if (chrome.runtime.lastError) {
              console.warn('Error migrating to sync storage:', chrome.runtime.lastError);
              resolve();
              return;
            }

            // Mark migration as complete
            chrome.storage.sync.set({ tc_migration_complete: true }, () => {
              console.log('[Storage] Migration from local to sync storage completed');
              resolve();
            });
          });
        });
      });
    });
  }

  // Run migration on initialization
  migrateLocalToSync();

  // Storage helpers
  // Using chrome.storage.sync to sync data across Chrome browsers
  // Note: Chrome sync has limits (100KB total, 8KB per item)
  window.Storage = {
    async get(categoryId) {
      return new Promise((resolve) => {
        chrome.storage.sync.get([`tc_${categoryId}`], (result) => {
          resolve(result[`tc_${categoryId}`] || { expenses: [], collapsed: false });
        });
      });
    },
    
    async set(categoryId, data) {
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [`tc_${categoryId}`]: data }, resolve);
      });
    }
  };

  // Generate unique IDs
  window.generateId = function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Expense operations
  window.ExpenseOperations = {
    async saveExpense(categoryId, expenseData) {
      const data = await Storage.get(categoryId);
      data.expenses = data.expenses || [];
      data.expenses.push({
        id: generateId(),
        payee: expenseData.payee,
        notes: expenseData.notes,
        amount: expenseData.amount,
        disabled: false
      });
      await Storage.set(categoryId, data);
      return data;
    },

    async updateExpense(categoryId, expenseId, expenseData) {
      const data = await Storage.get(categoryId);
      const idx = data.expenses.findIndex(ex => ex.id === expenseId);
      if (idx !== -1) {
        data.expenses[idx] = {
          ...data.expenses[idx],
          payee: expenseData.payee,
          notes: expenseData.notes,
          amount: expenseData.amount,
          disabled: expenseData.disabled !== undefined ? expenseData.disabled : data.expenses[idx].disabled
        };
        await Storage.set(categoryId, data);
      }
      return data;
    },

    async deleteExpense(categoryId, expenseId) {
      const data = await Storage.get(categoryId);
      data.expenses = data.expenses.filter(ex => ex.id !== expenseId);
      await Storage.set(categoryId, data);
      return data;
    },

    async toggleCollapsed(categoryId, collapsed) {
      const data = await Storage.get(categoryId);
      data.collapsed = collapsed;
      await Storage.set(categoryId, data);
      return data;
    }
  };
})();

