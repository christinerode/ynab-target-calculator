/**
 * UI rendering functions
 */

(function() {
  'use strict';

  // SVG Icons
  window.Icons = {
    plus: `<svg class="ynab-new-icon" width="16" height="16"><use href="#icon_sprite_plus_circle_fill"></use></svg>`,
    chevronDown: `<svg class="ynab-new-icon card-chevron" width="12" height="12"><use href="#icon_sprite_chevron_down"></use></svg>`,
    chevronRight: `<svg class="ynab-new-icon card-chevron" width="12" height="12"><use href="#icon_sprite_chevron_right"></use></svg>`,
    eye: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>`,
    checkmark: `<svg class="ynab-new-icon" width="12" height="12"><use href="#icon_sprite_check"></use></svg>`,
    visibility: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-312q70 0 119-49t49-119q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Zm0-72q-40 0-68-28t-28-68q0-40 28-68t68-28q40 0 68 28t28 68q0 40-28 68t-68 28Zm0 192q-130 0-239-69.5T68-445q-5-8-7-16.77t-2-18Q59-489 61-498t7-17q64-114 173-183.5T480-768q130 0 239 69.5T892-515q5 8 7 16.77t2 18q0 9.23-2 18.23t-7 17q-64 114-173 183.5T480-192Zm0-288Zm0 216q112 0 207-58t146-158q-51-100-146-158t-207-58q-112 0-207 58T127-480q51 100 146 158t207 58Z"/></svg>`,
    visibilityOff: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M599-599q21 21 34 50.5t15 61.5q0 15-10.7 25.5Q626.59-451 612-451q-15.42 0-26.21-10.5Q575-472 575-487q2-20-4.5-37T552-553.5Q540-566 523.5-572t-36.5-4q-15 0-25.5-10.7Q451-597.41 451-612q0-15 10.5-25.5T487-648q32 2 61 14.5t51 34.5Zm-119-97q-16.68 0-32.48 1.05-15.8 1.05-31.6 3.85-14.92 2.1-28.42-5.4-13.5-7.5-17.5-22t3.5-27.5q7.5-13 22.27-15.25Q417-765 437.85-766.5 458.7-768 480-768q134 0 246.5 68.5t170.63 188.62q3.87 7.88 5.37 15.4 1.5 7.52 1.5 15.48 0 7.96-1.5 15.48Q901-457 898-449q-17.75 37.82-43.87 70.91Q828-345 797-316q-11 10-25.5 9T747-320.16q-10-12.17-8.5-26.5Q740-361 751-372q26-23 46.36-50 20.37-27 35.64-58-49-101-144.5-158.5T480-696Zm0 504q-131 0-241-69.5T65.93-446.19Q61-454 59.5-462.53q-1.5-8.52-1.5-17.5 0-8.97 1.5-17.47Q61-506 66-514q23-45 53.76-83.98Q150.53-636.96 190-669l-75-75q-11-11-11-25t11-25q11-11 25.5-11t25.5 11l628 628q11 11 11 25t-11 25q-11 11-25.5 11T743-116L638-220q-38.4 14-77.9 21-39.5 7-80.1 7ZM241-617q-35 28-65 61.5T127-480q49 101 144.5 158.5T480-264q26.21 0 51.1-3.5Q556-271 581-277l-45-45q-14 5-28 7.5t-28 2.5q-70 0-119-49t-49-119q0-14 3.5-28t6.5-28l-81-81Zm287 89Zm-96 96Z"/></svg>`
  };

  // Utility function
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Get current category ID from YNAB's URL or DOM
  window.getCategoryId = function() {
    // Try to get from the inspector header
    const header = document.querySelector('.budget-inspector-category-header');
    if (header) {
      // Use the category name as a fallback identifier
      const nameEl = header.querySelector('.inspector-category-name');
      if (nameEl) {
        return nameEl.textContent.trim().toLowerCase().replace(/\s+/g, '-');
      }
    }
    // Fallback to URL hash
    const match = window.location.hash.match(/categories\/([^/]+)/);
    return match ? match[1] : null;
  };

  // Get target amount from YNAB
  window.getTargetAmount = function() {
    // Try to find input with title "Target Amount"
    const targetInput = Array.from(document.querySelectorAll('input')).find(
      input => input.title === 'Target Amount' || input.getAttribute('aria-label') === 'Target Amount'
    );
    
    if (targetInput) {
      // Try to get value from input
      const value = targetInput.value;
      if (value) {
        return Currency.parse(value);
      }
      
      // Try to get from the formatted display button next to the input
      const wrapper = targetInput.closest('.ynab-new-currency-input');
      if (wrapper) {
        const displayButton = wrapper.querySelector('.user-data.currency');
        if (displayButton) {
          const text = displayButton.textContent || displayButton.innerText;
          return Currency.parse(text);
        }
      }
    }
    
    // Try to find in target inspector card
    const targetCard = document.querySelector('.target-inspector-card');
    if (targetCard) {
      const currencyElement = targetCard.querySelector('.user-data.currency, [class*="currency"]');
      if (currencyElement) {
        const text = currencyElement.textContent || currencyElement.innerText;
        return Currency.parse(text);
      }
    }
    
    return null;
  };

  // Get target type (monthly or yearly) from YNAB
  window.getTargetType = function() {
    // Look for target inspector card
    const targetCard = document.querySelector('.target-inspector-card');
    if (!targetCard) return 'monthly'; // Default to monthly
    
    // Search for text indicating "per year" or "yearly"
    const cardText = targetCard.textContent || targetCard.innerText || '';
    
    // Check for various indicators of yearly target
    const yearlyIndicators = [
      'each year',
      'per year',
      'per annum',
      'yearly',
      'annual',
      '/year',
      '/yr'
    ];
    
    const isYearly = yearlyIndicators.some(indicator => 
      cardText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    return isYearly ? 'yearly' : 'monthly';
  };

  // UI rendering functions
  window.UI = {
    escapeHTML,

    createCardHTML(data, isFormVisible, editingExpenseId, editingExpense, targetAmount) {
      const { expenses, collapsed } = data;
      const hasExpenses = expenses && expenses.length > 0;
      const enabledExpenses = expenses?.filter(e => !e.disabled) || [];
      const total = enabledExpenses.reduce((sum, e) => sum + Currency.parse(e.amount), 0);
      const targetType = getTargetType();

      return `
        <section id="target-calculator-card" class="card target-calculator-card ${collapsed ? 'is-collapsed' : ''}">
          <button class="card-roll-up" aria-expanded="${!collapsed}" type="button" style="padding: 10px 8px 10px 16px;">
            <h2>
              <svg class=" " width="16" height="16" viewBox="0 0 16 16" style="margin-right: 8px;">
                <rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1"/>
                <line x1="6" y1="7" x2="6" y2="13" stroke="currentColor" stroke-width="1"/>
              </svg>
              Estimate Expenses
              ${collapsed ? Icons.chevronRight : Icons.chevronDown}
            </h2>
            ${hasExpenses ? `<span class="tc-add-row-btn ghost-button primary type-body" data-action="add">${Icons.plus} Add Expense</span>` : ''}
          </button>
          <div class="card-body" aria-hidden="${collapsed}" style="${collapsed ? 'display: none;' : ''}">
          ${isFormVisible && !editingExpenseId ? this.createFormHTML() : ''}
            ${hasExpenses || (isFormVisible && !editingExpenseId) ? this.createExpenseListHTML(expenses || [], total, editingExpenseId, editingExpense, targetAmount, targetType) : this.createEmptyStateHTML()}
          </div>
        </section>
      `;
    },

    createEmptyStateHTML() {
      return `
        <div class="tc-empty-state">
          <p>Add your estimated expenses to calculate your expected monthly spend.</p>
          <button data-action="add" class="ynab-button secondary" style="margin: 0 auto;">+ Add Expense</button>
        </div>
      `;
    },

    createExpenseListHTML(expenses, total, editingExpenseId, editingExpense, targetAmount, targetType = 'monthly') {
      const totalLabel = targetType === 'yearly' ? 'Yearly Total' : 'Monthly Total';
      const expensesList = expenses || [];
      const hasExpenses = expensesList.length > 0;
      
      return `
        <ul class="tc-expense-list">
          ${expensesList.map(expense => {
            const isEditing = editingExpenseId === expense.id;
            if (isEditing) {
              // Show form instead of list item when editing
              return `<li class="tc-expense-item tc-expense-item-editing" data-id="${expense.id}">${this.createFormHTML(editingExpense || expense)}</li>`;
            } else {
              // Show normal list item
              return `
                <li class="tc-expense-item ${expense.disabled ? 'is-disabled' : ''}" data-id="${expense.id}">
                  <div class="tc-expense-details">
                    <div class="tc-expense-payee">${escapeHTML(expense.payee)}</div>
                    ${expense.notes ? `<div class="tc-expense-notes">${escapeHTML(expense.notes)}</div>` : ''}
                  </div>
                  <div class="tc-expense-amount">${Currency.format(expense.amount)}</div>
                </li>
              `;
            }
          }).join('')}
        </ul>
        ${hasExpenses ? `
          <div class="tc-total-row">
            <span class="tc-total-label">${totalLabel}</span>
            <span class="tc-total-amount">${Currency.format(total)}</span>
          </div>
          ${targetAmount !== null ? this.createTargetComparisonMessage(total, targetAmount, targetType) : ''}
        ` : ''}
      `;
    },

    createTargetComparisonMessage(total, targetAmount, targetType = 'monthly') {
      const matchesTarget = Math.abs(total - targetAmount) < 0.01;
      const isOver = total > targetAmount;
      const isUnder = total < targetAmount;
      
      // Format messages differently for yearly vs monthly
      const totalLabel = targetType === 'yearly' ? 'yearly total' : 'estimated total';
      const totalDisplay = Currency.format(total);
      
      if (matchesTarget) {
        // Exact match
        return `
          <div class="impact-message positive">
            <div class="impact-message-content">
              ${Icons.checkmark} Your ${totalLabel} <span class="highlighted">${totalDisplay}</span> matches your target exactly!
            </div>
          </div>
        `;
      } else if (isUnder) {
        // Total is less than target
        return `
          <div class="impact-message positive">
            <div class="impact-message-content">
              Your ${totalLabel} <span class="highlighted">${totalDisplay}</span> is less than your target <span class="highlighted">${Currency.format(targetAmount)}</span>.
            </div>
          </div>
        `;
      } else {
        // Total is more than target
        return `
          <div class="impact-message warning">
            <div class="impact-message-content">
              Your ${totalLabel} <span class="highlighted">${totalDisplay}</span> is more than your target of <span class="highlighted">${Currency.format(targetAmount)}</span>. You may want to increase your target.
            </div>
          </div>
        `;
      }
    },

    createFormHTML(expense = null) {
      const isEdit = !!expense;
      const amountValue = expense ? expense.amount : '';
      const currencySymbol = Currency.getSymbol();
      const placeholder = `${currencySymbol}0.00`;
      // Format amount as currency when editing, otherwise show empty
      const displayAmount = amountValue ? Currency.format(amountValue) : '';
      const targetType = getTargetType();
      const costLabel = targetType === 'yearly' ? 'Yearly Cost' : 'Monthly Cost';
      const amountTitle = targetType === 'yearly' ? 'Yearly Amount' : 'Monthly Amount';
      
      return `
        <div class="tc-expense-form">
          <div class="tc-form-grid">
            <div class="tc-form-column tc-form-column-payee">
              <label for="tc-payee" class="type-body-bold">Expense</label>
              <input class="ember-text-field ember-view" type="text" id="tc-payee" placeholder="e.g. 🎬 Netflix" value="${escapeHTML(expense?.payee || '')}" autocomplete="off" />
            </div>
            <div class="tc-form-column tc-form-column-notes">
              <label for="tc-notes" class="type-body-bold">Notes</label>
              <input class="ember-text-field ember-view" type="text" id="tc-notes" placeholder="e.g. 31st of every month" value="${escapeHTML(expense?.notes || '')}" autocomplete="off" />
            </div>
            <div class="tc-form-column tc-form-column-amount">
              <label for="tc-amount-input" class="type-body-bold">${costLabel}</label>
              <input id="tc-amount-input" class="ember-text-field ember-view" type="text" title="${amountTitle}" aria-label="${amountTitle}" placeholder="${placeholder}" value="${displayAmount}" autocomplete="off" />
            </div>
          </div>
          <div class="actions">
            <div class="actions-left">
              ${isEdit ? `
                <button class="ynab-button secondary button-hide" type="button" data-action="hide" title="${expense?.disabled ? 'Show' : 'Hide'}" aria-label="${expense?.disabled ? 'Show' : 'Hide'}">
                  ${expense?.disabled ? Icons.visibilityOff : Icons.visibility}
                </button>
                <button class="ynab-button destructive button-delete" type="button" data-action="delete">
                  Delete
                </button>
              ` : ''} 
              
            </div>
            <div class="actions-right">
              <button class="ynab-button secondary button-cancel" type="button" data-action="cancel">
                Cancel
              </button>
              <button class="ynab-button primary" type="button" data-action="${isEdit ? 'update' : 'save'}">
                ${isEdit ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      `;
    },

    createEditPopupHTML(expense) {
      return `
        <div class="tc-edit-popup" data-expense-id="${expense.id}">
          <div class="tc-edit-popup-content">
            <div class="tc-edit-popup-header">
              <h3>Edit Expense</h3>
              <button class="tc-edit-popup-close" data-action="close-popup">&times;</button>
            </div>
            <div class="tc-edit-popup-body">
              <div class="tc-form-field">
                <label for="tc-edit-payee">Payee</label>
                <input type="text" id="tc-edit-payee" value="${escapeHTML(expense.payee)}">
              </div>
              <div class="tc-form-field">
                <label for="tc-edit-notes">Notes</label>
                <input type="text" id="tc-edit-notes" value="${escapeHTML(expense.notes || '')}">
              </div>
              <div class="tc-form-field">
                <label for="tc-edit-amount">Amount</label>
                <input type="text" id="tc-edit-amount" value="${expense.amount}">
              </div>
              <div class="tc-toggle-row">
                <span class="tc-toggle-label">
                  ${Icons.eye}
                  Include in total
                </span>
                <label class="tc-toggle-switch">
                  <input type="checkbox" ${!expense.disabled ? 'checked' : ''}>
                  <span class="tc-toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="tc-edit-popup-footer">
              <button class="tc-btn-delete" data-action="delete">Delete</button>
              <button class="tc-btn-primary" data-action="save-edit">Save</button>
            </div>
          </div>
        </div>
      `;
    }
  };
})();

