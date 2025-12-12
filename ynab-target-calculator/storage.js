/**
 * Storage and expense management operations
 */

(function() {
  'use strict';

  // Storage helpers
  window.Storage = {
    async get(categoryId) {
      return new Promise((resolve) => {
        chrome.storage.local.get([`tc_${categoryId}`], (result) => {
          resolve(result[`tc_${categoryId}`] || { expenses: [], collapsed: false });
        });
      });
    },
    
    async set(categoryId, data) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [`tc_${categoryId}`]: data }, resolve);
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

