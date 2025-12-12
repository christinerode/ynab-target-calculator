/**
 * Currency parsing and calculation utilities
 * CSP-safe expression evaluator (no eval or Function)
 */

(function() {
  'use strict';

  // Get currency symbol from YNAB
  function getCurrencySymbol() {
    // Try to find currency symbol from existing YNAB elements
    // Check multiple common places where currency is displayed
    const selectors = [
      '.currency',
      '[class*="currency"]',
      '.user-data.currency',
      '.budget-inspector-available-balance',
      '.budget-breakdown-available-balance'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        const match = text.match(/[£$€¥₹₽₩₪₫₨₦₡₵₴₸₼₾₿]/);
        if (match) return match[0];
      }
    }
    
    // Fallback to £
    return '£';
  }

  // Currency helpers
  window.Currency = {
    getSymbol() {
      return getCurrencySymbol();
    },
    
    parse(value) {
      if (typeof value === 'number') return value;
      const str = String(value).trim();
      if (!str) return 0;
      
      // Remove everything except numbers, operators, decimal points, and parentheses
      // Build cleaned string character by character to avoid regex issues
      let cleaned = '';
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char >= '0' && char <= '9') || 
            char === '.' || 
            char === '+' || 
            char === '-' || 
            char === '*' || 
            char === '/' || 
            char === '(' || 
            char === ')') {
          cleaned += char;
        }
      }
      
      if (!cleaned) return 0;
      
      // Check if it looks like an expression (has operators)
      const hasOperators = /[+\-*/]/.test(cleaned);
      
      if (hasOperators) {
        // Evaluate expression without using eval() or Function() (CSP safe)
        try {
          const result = this.evaluateExpression(cleaned);
          if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            // Round to 2 decimal places to handle cases like 8.99999999999
            return Math.round(result * 100) / 100;
          }
        } catch (e) {
          // If evaluation fails, log and fall through to parseFloat
          console.warn('Currency.parse: Expression evaluation failed', e, 'for value:', cleaned);
        }
      }
      
      // Fallback to parseFloat (for simple numbers or if expression evaluation failed)
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    },
    
    // CSP-safe expression evaluator (no eval or Function)
    evaluateExpression(expr) {
      // Remove spaces
      expr = expr.replace(/\s+/g, '');
      
      // Handle parentheses recursively
      while (expr.includes('(')) {
        const start = expr.lastIndexOf('(');
        const end = expr.indexOf(')', start);
        if (end === -1) throw new Error('Mismatched parentheses');
        const subExpr = expr.substring(start + 1, end);
        const subResult = this.evaluateExpression(subExpr);
        expr = expr.substring(0, start) + subResult.toString() + expr.substring(end + 1);
      }
      
      // Parse the expression into tokens (numbers and operators)
      const tokens = [];
      let current = '';
      for (let i = 0; i < expr.length; i++) {
        const char = expr[i];
        if (char === '+' || char === '-' || char === '*' || char === '/') {
          if (current) {
            tokens.push(parseFloat(current));
            current = '';
          }
          // Handle unary minus
          if (char === '-' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string')) {
            current = '-';
          } else {
            tokens.push(char);
          }
        } else {
          current += char;
        }
      }
      if (current) {
        tokens.push(parseFloat(current));
      }
      
      // Handle multiplication and division (left to right)
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '*' || tokens[i] === '/') {
          const left = tokens[i - 1];
          const op = tokens[i];
          const right = tokens[i + 1];
          const result = op === '*' ? left * right : left / right;
          tokens.splice(i - 1, 3, result);
          i -= 2; // Adjust index after removal
        }
      }
      
      // Handle addition and subtraction (left to right)
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '+' || tokens[i] === '-') {
          const left = tokens[i - 1];
          const op = tokens[i];
          const right = tokens[i + 1];
          const result = op === '+' ? left + right : left - right;
          tokens.splice(i - 1, 3, result);
          i -= 2; // Adjust index after removal
        }
      }
      
      return tokens[0];
    },
    
    format(value) {
      const num = typeof value === 'number' ? value : this.parse(value);
      const symbol = this.getSymbol();
      return `${symbol}${num.toFixed(2)}`;
    }
  };
})();

