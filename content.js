/**
 * YNAB Target Calculator
 * Main orchestration file - coordinates UI, storage, and currency operations
 */

(function () {
  'use strict';

  const CARD_ID = 'target-calculator-card';
  let currentCategoryId = null;
  let isFormVisible = false;
  let editingExpenseId = null;

  // Setup currency input behavior
  function setupSimpleCurrencyInput() {
    const amountInput = document.getElementById('tc-amount-input');
    if (!amountInput) return;

    // When input is focused, show the raw number (strip currency formatting)
    amountInput.addEventListener('focus', () => {
      const value = amountInput.value.trim();
      if (value) {
        // If it's formatted (contains currency symbol), extract the number
        const parsed = Currency.parse(value);
        amountInput.value = parsed.toString();
      }
    });

    // When input is blurred, calculate the expression and format as currency
    amountInput.addEventListener('blur', () => {
      const value = amountInput.value.trim();
      if (value) {
        const parsed = Currency.parse(value);
        // Format as currency for display
        amountInput.value = Currency.format(parsed);
      }
    });

    // Also handle Enter key
    amountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = amountInput.value.trim();
        if (value) {
          const parsed = Currency.parse(value);
          // Format as currency for display
          amountInput.value = Currency.format(parsed);
        }
        amountInput.blur();
      }
    });
  }

  // Prevent YNAB's Cmd+A shortcut from triggering when our inputs are focused
  function setupInputKeyboardHandlers() {
    // Handle Cmd+A / Ctrl+A to select all text in our inputs
    document.addEventListener('keydown', (e) => {
      // Check if Cmd+A (Mac) or Ctrl+A (Windows/Linux) is pressed
      const isSelectAll = (e.metaKey || e.ctrlKey) && e.key === 'a' && !e.shiftKey && !e.altKey;
      
      if (isSelectAll) {
        // Check if the focused element is one of our input fields
        const activeElement = document.activeElement;
        const isOurInput = activeElement && (
          activeElement.id === 'tc-payee' ||
          activeElement.id === 'tc-notes' ||
          activeElement.id === 'tc-amount-input'
        );
        
        if (isOurInput) {
          // Prevent YNAB's handler from firing
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Let the default browser behavior select all text in the input
          // (we don't preventDefault, so the browser's native select-all works)
        }
      }
    }, true); // Use capture phase to intercept before YNAB's handlers
  }

  // Render the card
  async function render() {
    const categoryId = getCategoryId();
    if (!categoryId) return;

    currentCategoryId = categoryId;
    const data = await Storage.get(categoryId);

    // Find insertion point
    const breakdown = document.querySelector('.budget-breakdown');
    if (!breakdown) return;

    const hasHeader = breakdown.querySelector('.budget-inspector-category-header');
    if (!hasHeader) {
      removeCard();
      return;
    }

    // Find where to insert (after available balance, before target card)
    const availableBalance = breakdown.querySelector('section.budget-breakdown-available-balance');
    const targetCard = breakdown.querySelector('section.target-inspector-card');

    // Remove existing card
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();

    // Get the expense being edited if any
    const editingExpense = editingExpenseId 
      ? data.expenses?.find(e => e.id === editingExpenseId) 
      : null;

    // Get target amount and type from YNAB
    const targetAmount = getTargetAmount();
    const targetType = getTargetType();
    // Update last known target amount and type
    lastTargetAmount = targetAmount;
    lastTargetType = targetType;

    // Create and insert new card
    const wrapper = document.createElement('div');
    wrapper.innerHTML = UI.createCardHTML(data, isFormVisible, editingExpenseId, editingExpense, targetAmount);
    const card = wrapper.firstElementChild;

    if (targetCard) {
      targetCard.parentNode.insertBefore(card, targetCard);
    } else if (availableBalance) {
      availableBalance.parentNode.insertBefore(card, availableBalance.nextSibling);
    } else {
      breakdown.appendChild(card);
    }

    attachEventListeners(card);
    
    // Set up currency input behavior if form is visible (either add or edit)
    if (isFormVisible || editingExpenseId) {
      setTimeout(() => setupSimpleCurrencyInput(), 50);
    }
  }

  function removeCard() {
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();
  }

  // Event handlers
  function attachEventListeners(card) {
    // Collapse/expand toggle
    const rollUpBtn = card.querySelector('.card-roll-up');
    rollUpBtn?.addEventListener('click', async (e) => {
      // Don't toggle if clicking the add button
      if (e.target.closest('[data-action="add"]')) {
        e.stopPropagation();
        isFormVisible = true;
        editingExpenseId = null;
        render();
        return;
      }

      const data = await Storage.get(currentCategoryId);
      await ExpenseOperations.toggleCollapsed(currentCategoryId, !data.collapsed);
      render();
    });

    // Handle all button clicks
    card.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) {
        // Check if clicking on an expense item
        const expenseItem = e.target.closest('.tc-expense-item');
        if (expenseItem && !expenseItem.classList.contains('tc-expense-item-editing')) {
          editingExpenseId = expenseItem.dataset.id;
          isFormVisible = false; // Don't show the add form when editing
          render();
          // Focus the payee input after a short delay
          setTimeout(() => {
            const payeeInput = document.getElementById('tc-payee');
            if (payeeInput) payeeInput.focus();
          }, 50);
        }
        return;
      }

      switch (action) {
        case 'add':
          isFormVisible = true;
          editingExpenseId = null;
          render();
          setTimeout(() => document.getElementById('tc-payee')?.focus(), 50);
          break;

        case 'cancel':
          isFormVisible = false;
          editingExpenseId = null;
          render();
          break;

        case 'save':
          await saveExpense();
          break;

        case 'update':
          if (editingExpenseId) {
            await updateExpense(editingExpenseId);
          }
          break;

        case 'hide':
          if (editingExpenseId) {
            await hideExpense(editingExpenseId);
            editingExpenseId = null;
            render();
          }
          break;

        case 'delete':
          if (editingExpenseId) {
            await deleteExpense(editingExpenseId);
            isFormVisible = false;
            editingExpenseId = null;
            render();
          }
          break;
      }
    });
  }

  // Expense operations
  async function saveExpense() {
    const payee = document.getElementById('tc-payee')?.value.trim();
    const notes = document.getElementById('tc-notes')?.value.trim();
    const amountInput = document.getElementById('tc-amount-input');

    if (!payee) {
      document.getElementById('tc-payee')?.focus();
      return;
    }

    // Parse the amount (handles expressions if user didn't blur first)
    const rawAmount = amountInput?.value.trim() || '0';
    const amount = Currency.parse(rawAmount);

    await ExpenseOperations.saveExpense(currentCategoryId, {
      payee,
      notes,
      amount
    });

    isFormVisible = false;
    render();
  }

  async function updateExpense(expenseId) {
    const payee = document.getElementById('tc-payee')?.value.trim();
    const notes = document.getElementById('tc-notes')?.value.trim();
    const amountInput = document.getElementById('tc-amount-input');
    
    if (!payee) {
      document.getElementById('tc-payee')?.focus();
      return;
    }

    // Parse the amount (handles expressions if user didn't blur first)
    const rawAmount = amountInput?.value.trim() || '0';
    const amount = Currency.parse(rawAmount);

    await ExpenseOperations.updateExpense(currentCategoryId, expenseId, {
      payee,
      notes,
      amount
    });

    isFormVisible = false;
    editingExpenseId = null;
    render();
  }

  async function hideExpense(expenseId) {
    const data = await Storage.get(currentCategoryId);
    const expense = data.expenses?.find(e => e.id === expenseId);
    const isCurrentlyDisabled = expense?.disabled || false;
    
    await ExpenseOperations.updateExpense(currentCategoryId, expenseId, {
      payee: document.getElementById('tc-payee')?.value.trim() || '',
      notes: document.getElementById('tc-notes')?.value.trim() || '',
      amount: Currency.parse(document.getElementById('tc-amount-input')?.value.trim() || '0'),
      disabled: !isCurrentlyDisabled // Toggle disabled state
    });
  }

  async function deleteExpense(expenseId) {
    await ExpenseOperations.deleteExpense(currentCategoryId, expenseId);
    render();
  }

  async function openEditPopup(expenseId) {
    const data = await Storage.get(currentCategoryId);
    const expense = data.expenses?.find(e => e.id === expenseId);
    if (!expense) return;

    // Remove any existing popup
    document.querySelector('.tc-edit-popup')?.remove();

    // Add popup to body
    const wrapper = document.createElement('div');
    wrapper.innerHTML = UI.createEditPopupHTML(expense);
    const popup = wrapper.firstElementChild;
    document.body.appendChild(popup);

    // Attach popup event listeners
    popup.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      
      if (e.target === popup || action === 'close-popup') {
        popup.remove();
        return;
      }

      if (action === 'delete') {
        await ExpenseOperations.deleteExpense(currentCategoryId, expenseId);
        popup.remove();
        render();
        return;
      }

      if (action === 'save-edit') {
        await ExpenseOperations.updateExpense(currentCategoryId, expenseId, {
            payee: document.getElementById('tc-edit-payee').value.trim(),
            notes: document.getElementById('tc-edit-notes').value.trim(),
            amount: Currency.parse(document.getElementById('tc-edit-amount').value),
            disabled: !popup.querySelector('.tc-toggle-switch input').checked
        });
        popup.remove();
        render();
      }
    });
  }

  // Store last known target amount and type to detect changes
  let lastTargetAmount = null;
  let lastTargetType = null;

  // Watch for target amount changes
  function setupTargetWatcher() {
    // Watch for clicks on "Save Target" button
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button) {
        const buttonText = button.textContent?.trim() || '';
        if (buttonText === 'Save Target' || buttonText.includes('Save Target')) {
          // Wait a bit for YNAB to update the DOM, then refresh
          setTimeout(() => {
            const existingCard = document.getElementById(CARD_ID);
            if (existingCard) {
              render();
            }
          }, 500);
        }
      }
    }, true); // Use capture phase to catch events early

    // Watch for changes in the target amount display (more efficient)
    const targetObserver = new MutationObserver(() => {
      const currentTarget = getTargetAmount();
      const currentTargetType = getTargetType();
      // Only update if target amount or type actually changed and we have a card
      const targetChanged = currentTarget !== null && currentTarget !== lastTargetAmount;
      const typeChanged = currentTargetType !== lastTargetType;
      if ((targetChanged || typeChanged) && document.getElementById(CARD_ID)) {
        lastTargetAmount = currentTarget;
        lastTargetType = currentTargetType;
        render();
      }
    });

    // Function to start observing target elements
    const startObserving = () => {
      // Find target input or display
      const targetInput = Array.from(document.querySelectorAll('input')).find(
        input => input.title === 'Target Amount' || input.getAttribute('aria-label') === 'Target Amount'
      );
      
      const targetCard = document.querySelector('.target-inspector-card');
      
      if (targetInput) {
        const wrapper = targetInput.closest('.ynab-new-currency-input') || targetInput.parentElement;
        if (wrapper) {
          targetObserver.observe(wrapper, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      }
      
      if (targetCard) {
        targetObserver.observe(targetCard, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    };

    // Start observing initially
    setTimeout(startObserving, 1000);
    
    // Re-observe periodically in case YNAB recreates elements
    setInterval(() => {
      const existingCard = document.getElementById(CARD_ID);
      if (existingCard) {
        startObserving();
      }
    }, 2000);
  }

  // Watch for DOM changes to detect when YNAB navigates
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      // Check if budget breakdown exists and has the right content
      const breakdown = document.querySelector('.budget-breakdown');
      const hasHeader = breakdown?.querySelector('.budget-inspector-category-header');
      const existingCard = document.getElementById(CARD_ID);

      // Only re-render if conditions changed
      if (hasHeader && !existingCard) {
        render();
      } else if (!hasHeader && existingCard) {
        removeCard();
      } else if (hasHeader && existingCard) {
        // Check if category changed
        const newCategoryId = getCategoryId();
        if (newCategoryId !== currentCategoryId) {
          isFormVisible = false;
          editingExpenseId = null;
          render();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize
  function init() {
    console.log('YNAB Target Calculator: Initializing...');
    setupObserver();
    setupTargetWatcher();
    setupInputKeyboardHandlers();
    // Initial render attempt
    setTimeout(() => {
      render();
      // Store initial target amount and type
      lastTargetAmount = getTargetAmount();
      lastTargetType = getTargetType();
    }, 1000);
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
