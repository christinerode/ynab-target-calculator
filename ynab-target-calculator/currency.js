/**
 * Currency parsing and calculation utilities
 * CSP-safe expression evaluator (no eval or Function)
 */

(function() {
  'use strict';

  // Cache for currency formatting (parsed from DOM)
  let cachedFormatting = null;
  
  // Currency formatting lookup table (for when we can't detect thousand separators)
  // Based on common formatting conventions for each currency
  const currencyFormattingLookup = {
    // Norwegian/Swedish/Danish Kroner
    'kr': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    'NOK': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    'SEK': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    'DKK': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    
    // Turkish Lira
    '₺': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    'TRY': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    'TL': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    
    // Euro
    '€': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    'EUR': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    
    // US Dollar
    '$': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    'USD': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // British Pound
    '£': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    'GBP': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // Japanese Yen (no decimals) - note: ¥ is also used for CNY, but JPY is more common to not use decimals
    'JPY': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: false },
    
    // Swiss Franc
    'CHF': { thousandSeparator: "'", decimalSeparator: '.', symbolSpace: true, useDecimals: true },
    
    // Indian Rupee
    '₹': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    'INR': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // Russian Ruble
    '₽': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    'RUB': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    
    // Polish Zloty
    'PLN': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    
    // Czech Koruna
    'CZK': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: true },
    
    // Hungarian Forint (no decimals)
    'HUF': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: true, useDecimals: false },
    
    // Brazilian Real
    'R$': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    'BRL': { thousandSeparator: '.', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    
    // Canadian Dollar
    'CAD': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // Australian Dollar
    'AUD': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // New Zealand Dollar
    'NZD': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // South African Rand
    'ZAR': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    'R': { thousandSeparator: ' ', decimalSeparator: ',', symbolSpace: false, useDecimals: true },
    
    // Mexican Peso
    'MXN': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    
    // Chinese Yuan (uses ¥ symbol but with decimals)
    'CNY': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true },
    // Note: ¥ symbol lookup will default to decimals=true (CNY style) unless explicitly detected as JPY
    
    // Default fallback (US-style)
    '': { thousandSeparator: ',', decimalSeparator: '.', symbolSpace: false, useDecimals: true }
  };
  
  // Get formatting from lookup table based on currency symbol
  function getFormattingFromLookup(symbol) {
    // Try exact match first
    if (currencyFormattingLookup[symbol]) {
      return currencyFormattingLookup[symbol];
    }
    
    // Try case-insensitive match
    const upperSymbol = symbol.toUpperCase();
    if (currencyFormattingLookup[upperSymbol]) {
      return currencyFormattingLookup[upperSymbol];
    }
    
    // Try to find by partial match (e.g., "kr" matches "NOK", "SEK", "DKK")
    // But be careful with symbols that might match multiple currencies
    for (const [key, value] of Object.entries(currencyFormattingLookup)) {
      if (key.includes(symbol) || symbol.includes(key)) {
        return value;
      }
    }
    
    // Special handling for ¥ symbol - check if number has decimals to determine JPY vs CNY
    // This is handled in parseCurrencyFormatting by checking the number itself
    
    // Default fallback
    return currencyFormattingLookup[''];
  }

  // Parse currency formatting from an example value in the DOM
  function parseCurrencyFormatting(exampleText) {
    if (!exampleText) return null;
    
    // Remove any leading/trailing whitespace
    const text = exampleText.trim();
    
    // Try to find a number pattern (with separators including spaces and /)
    // Match patterns like: 1,234.56 or 1.234,56 or 1 234,56 or 1234.56 or 1234,56 or 117,174/73
    const numberPattern = /(\d{1,3}(?:[\s.,]\d{3})*(?:[.,\/]\d{2})?|\d+[.,\/]\d{2}|\d+)/;
    const numberMatch = text.match(numberPattern);
    
    if (!numberMatch) return null;
    
    const numberPart = numberMatch[0];
    const numberIndex = text.indexOf(numberPart);
    
    // Determine decimal and thousand separators
    let decimalSeparator = '.';
    let thousandSeparator = ',';
    let detectedThousandSeparator = false;
    
    // Check for "/" as decimal separator first (Iranian currency)
    if (numberPart.includes('/') && /\/\d{2}$/.test(numberPart)) {
      decimalSeparator = '/';
      // Remove "/" and decimal part to check for thousand separators
      const slashIndex = numberPart.lastIndexOf('/');
      const integerPart = numberPart.substring(0, slashIndex);
      if (integerPart.includes(',')) {
        thousandSeparator = ',';
        detectedThousandSeparator = true;
      } else if (integerPart.includes('.')) {
        thousandSeparator = '.';
        detectedThousandSeparator = true;
      } else if (integerPart.includes(' ')) {
        thousandSeparator = ' ';
        detectedThousandSeparator = true;
      }
    }
    // Check for spaces as thousand separators (e.g., "117 174,73" or "1 234.56")
    // If there are spaces in the number part, they're likely thousand separators
    else if (numberPart.includes(' ')) {
      thousandSeparator = ' ';
      detectedThousandSeparator = true;
      // Determine decimal separator (comma or period, whichever appears after spaces)
      // Check which comes last - that's likely the decimal separator
      const lastSpace = numberPart.lastIndexOf(' ');
      const lastComma = numberPart.lastIndexOf(',');
      const lastDot = numberPart.lastIndexOf('.');
      
      if (lastComma > lastSpace && lastComma > lastDot) {
        // Comma comes after spaces, likely decimal
        decimalSeparator = ',';
      } else if (lastDot > lastSpace && lastDot > lastComma) {
        // Period comes after spaces, likely decimal
        decimalSeparator = '.';
      } else if (numberPart.includes(',')) {
        decimalSeparator = ',';
      } else if (numberPart.includes('.')) {
        decimalSeparator = '.';
      }
    }
    // Check if number has a decimal part with both . and , (no spaces)
    else if (numberPart.includes('.') && numberPart.includes(',')) {
      // Both present - determine which is which
      const lastDot = numberPart.lastIndexOf('.');
      const lastComma = numberPart.lastIndexOf(',');
      if (lastDot > lastComma) {
        // Period is decimal, comma is thousand
        decimalSeparator = '.';
        thousandSeparator = ',';
      } else {
        // Comma is decimal, period is thousand
        decimalSeparator = ',';
        thousandSeparator = '.';
      }
      detectedThousandSeparator = true;
    } else if (numberPart.includes('.')) {
      // Only period - could be decimal or thousand
      const parts = numberPart.split('.');
      if (parts[parts.length - 1].length === 2) {
        // Last part is 2 digits, likely decimal
        decimalSeparator = '.';
        thousandSeparator = ',';
        // Can't be sure if thousand separator is present if number is small
        detectedThousandSeparator = numberPart.length > 6; // Rough heuristic
      } else {
        // Could be thousand separator
        decimalSeparator = ',';
        thousandSeparator = '.';
        detectedThousandSeparator = true;
      }
    } else if (numberPart.includes(',')) {
      // Only comma - could be decimal or thousand
      const parts = numberPart.split(',');
      if (parts[parts.length - 1].length === 2) {
        // Last part is 2 digits, likely decimal
        decimalSeparator = ',';
        thousandSeparator = '.';
        // Can't be sure if thousand separator is present if number is small
        detectedThousandSeparator = numberPart.length > 6; // Rough heuristic
      } else {
        // Could be thousand separator
        decimalSeparator = '.';
        thousandSeparator = ',';
        detectedThousandSeparator = true;
      }
    } else if (numberPart.includes(' ')) {
      // Only space - likely thousand separator (though unusual without decimal)
      thousandSeparator = ' ';
      decimalSeparator = '.';
      detectedThousandSeparator = true;
    }
    
    // Extract currency symbol/text (everything except the number)
    const beforeNumber = text.substring(0, numberIndex).trim();
    const afterNumber = text.substring(numberIndex + numberPart.length).trim();
    
    // Determine if symbol is before or after
    const symbolFirst = beforeNumber.length > 0;
    const symbol = symbolFirst ? beforeNumber : afterNumber;
    
    // Check if there's a space between symbol and number in the original
    const hasSpaceAfterSymbol = symbolFirst && text[numberIndex - 1] === ' ';
    
    // If we couldn't detect thousand separator (number is < 1000), use lookup table
    let useDecimals = true; // Default to using decimals
    if (!detectedThousandSeparator && symbol) {
      const lookupFormatting = getFormattingFromLookup(symbol);
      if (lookupFormatting) {
        console.log('[Currency Debug] Using lookup table for currency:', symbol, '->', lookupFormatting);
        thousandSeparator = lookupFormatting.thousandSeparator;
        // Only override decimal separator if we didn't detect one from the number
        if (!numberPart.includes(',') && !numberPart.includes('.')) {
          decimalSeparator = lookupFormatting.decimalSeparator;
        }
        // Use lookup for symbol space if we didn't detect it from DOM
        const finalSymbolSpace = hasSpaceAfterSymbol !== undefined ? hasSpaceAfterSymbol : lookupFormatting.symbolSpace;
        useDecimals = lookupFormatting.useDecimals !== false; // Default to true if not specified
        return {
          symbol: symbol || '',
          symbolFirst: symbolFirst,
          symbolSpace: finalSymbolSpace,
          decimalSeparator: decimalSeparator,
          thousandSeparator: thousandSeparator,
          useDecimals: useDecimals
        };
      }
    }
    
    // Check if we detected decimals in the number
    // A decimal separator is followed by exactly 2 digits (e.g., ",95" or ".95" or "/95")
    // Check for: ",XX" or ".XX" or "/XX" (Iranian uses /)
    const hasDecimalPart = /[.,\/]\d{2}$/.test(numberPart);
    
    if (hasDecimalPart) {
      // Number has decimal part (separator followed by 2-3 digits), so currency uses decimals
      useDecimals = true;
      console.log('[Currency Debug] Detected decimals in number:', numberPart, '->', useDecimals);
    } else {
      // No decimal part detected in the number - don't show decimals
      console.log('[Currency Debug] No decimals detected in number:', numberPart, '->', useDecimals);
      useDecimals = false;
    }
    
    return {
      symbol: symbol || '',
      symbolFirst: symbolFirst,
      symbolSpace: hasSpaceAfterSymbol, // Track if there should be a space after symbol
      decimalSeparator: decimalSeparator,
      thousandSeparator: thousandSeparator,
      useDecimals: useDecimals
    };
  }
  
  // Get currency formatting info from DOM examples
  function getCurrencyFormatting() {
    // Try to find example currency values in the DOM
    const selectors = [
      '.user-data.currency',
      '[class*="currency"]',
      '.budget-inspector-available-balance .currency',
      '.budget-breakdown-available-balance .currency',
      '.target-inspector-card .currency'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = (element.textContent || element.innerText || '').trim();
        // Look for text that contains a number (likely a currency amount)
        if (text && /\d/.test(text)) {
          const formatting = parseCurrencyFormatting(text);
          if (formatting) {
            console.log('[Currency Debug] Found currency formatting from DOM:', text, '->', formatting);
            return formatting;
          }
        }
      }
    }
    
    // Fallback: try to find any currency-like text in the budget breakdown
    const breakdown = document.querySelector('.budget-breakdown');
    if (breakdown) {
      const allText = breakdown.textContent || breakdown.innerText || '';
      // Look for patterns like "$1,234.56" or "1,234.56 kr" etc.
      const currencyPattern = /([^\d]*)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+[.,]\d{2}|\d+)([^\d]*)/;
      const match = allText.match(currencyPattern);
      if (match) {
        const fullMatch = match[0];
        const formatting = parseCurrencyFormatting(fullMatch);
        if (formatting) {
          console.log('[Currency Debug] Found currency formatting from breakdown:', fullMatch, '->', formatting);
          return formatting;
        }
      }
    }
    
    // Final fallback
    console.log('[Currency Debug] Using default currency formatting');
    return {
      symbol: '',
      symbolFirst: true,
      decimalSeparator: '.',
      thousandSeparator: ',',
      useDecimals: true // Default to using decimals
    };
  }
  
  // Get currency symbol (for backward compatibility)
  function getCurrencySymbol() {
    if (!cachedFormatting) {
      cachedFormatting = getCurrencyFormatting();
    }
    return cachedFormatting.symbol || '£';
  }
  
  // Get currency formatting info from DOM
  function getCurrencyInfo() {
    if (!cachedFormatting) {
      cachedFormatting = getCurrencyFormatting();
    }
    
    // Default useDecimals to true if not explicitly set to false
    const useDecimals = cachedFormatting.useDecimals === undefined 
      ? true 
      : cachedFormatting.useDecimals;
    
    return {
      symbol: cachedFormatting.symbol,
      symbolFirst: cachedFormatting.symbolFirst,
      symbolSpace: cachedFormatting.symbolSpace || false,
      displaySymbol: cachedFormatting.symbol.length > 0,
      decimalSeparator: cachedFormatting.decimalSeparator,
      thousandSeparator: cachedFormatting.thousandSeparator,
      useDecimals: useDecimals
    };
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
      
      // Get currency formatting info to know decimal/thousand separators
      const currencyInfo = getCurrencyInfo();
      
      // Remove currency symbols and spaces, but keep numbers, operators, decimal/thousand separators, and parentheses
      // Build cleaned string character by character to avoid regex issues
      let cleaned = '';
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char >= '0' && char <= '9') || 
            char === '.' || 
            char === ',' ||
            char === '+' || 
            char === '-' || 
            char === '*' || 
            char === '/' || 
            char === '(' || 
            char === ')' ||
            char === ' ') {
          cleaned += char;
        }
      }
      
      if (!cleaned) return 0;
      
      // Normalize decimal separator: convert to period for JavaScript parsing
      // Need to distinguish between decimal and thousand separators
      // Also handle "/" for Iranian currency
      
      // Check for "/" as decimal separator first (Iranian currency)
      const lastSlashIndex = cleaned.lastIndexOf('/');
      if (lastSlashIndex !== -1 && /\/\d{2}$/.test(cleaned)) {
        // "/" followed by exactly 2 digits at the end is a decimal separator
        const integerPart = cleaned.substring(0, lastSlashIndex);
        const decimalPart = cleaned.substring(lastSlashIndex + 1);
        
        // Remove thousand separators from integer part
        let normalizedInteger = integerPart.replace(/[.,\s]/g, ''); // Remove periods, commas, spaces
        
        // Reconstruct with period as decimal separator
        cleaned = normalizedInteger + '.' + decimalPart;
      } else if (currencyInfo.decimalSeparator === ',') {
        // Comma is decimal separator
        // Find the last comma (it's the decimal separator)
        // Everything before it might have thousand separators (periods or spaces)
        const lastCommaIndex = cleaned.lastIndexOf(',');
        if (lastCommaIndex !== -1) {
          // Split into integer and decimal parts
          const integerPart = cleaned.substring(0, lastCommaIndex);
          const decimalPart = cleaned.substring(lastCommaIndex + 1);
          
          // Remove thousand separators from integer part
          let normalizedInteger = integerPart.replace(/\./g, ''); // Remove periods
          normalizedInteger = normalizedInteger.replace(/\s+/g, ''); // Remove spaces
          
          // Reconstruct with period as decimal separator
          cleaned = normalizedInteger + '.' + decimalPart;
        } else {
          // No comma found, might be integer or period as decimal (unlikely but handle it)
          // If period is thousand separator, remove it
          if (currencyInfo.thousandSeparator === '.') {
            cleaned = cleaned.replace(/\./g, '');
          } else if (currencyInfo.thousandSeparator === ' ') {
            cleaned = cleaned.replace(/\s+/g, '');
          }
        }
      } else {
        // Period is decimal separator
        // Find the last period (it's the decimal separator)
        // Everything before it might have thousand separators (commas or spaces)
        const lastPeriodIndex = cleaned.lastIndexOf('.');
        if (lastPeriodIndex !== -1) {
          // Split into integer and decimal parts
          const integerPart = cleaned.substring(0, lastPeriodIndex);
          const decimalPart = cleaned.substring(lastPeriodIndex + 1);
          
          // Remove thousand separators from integer part
          let normalizedInteger = integerPart.replace(/,/g, ''); // Remove commas
          normalizedInteger = normalizedInteger.replace(/\s+/g, ''); // Remove spaces
          
          // Reconstruct with period as decimal separator
          cleaned = normalizedInteger + '.' + decimalPart;
        } else {
          // No period found, might be integer or comma as decimal (unlikely but handle it)
          // If comma is thousand separator, remove it
          if (currencyInfo.thousandSeparator === ',') {
            cleaned = cleaned.replace(/,/g, '');
          } else if (currencyInfo.thousandSeparator === ' ') {
            cleaned = cleaned.replace(/\s+/g, '');
          }
        }
      }
      
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
      const currencyInfo = getCurrencyInfo();
      
      // Round to appropriate decimal places
      const roundedNum = currencyInfo.useDecimals 
        ? Math.round(Math.abs(num) * 100) / 100  // Round to 2 decimals
        : Math.round(Math.abs(num)); // Round to integer for currencies without decimals
      
      // Format number with proper decimal separator (or no decimals)
      let formatted = currencyInfo.useDecimals 
        ? roundedNum.toFixed(2)
        : roundedNum.toString();
      
      // Replace decimal separator if needed (only if using decimals)
      if (currencyInfo.useDecimals && currencyInfo.decimalSeparator !== '.') {
        if (currencyInfo.decimalSeparator === '/') {
          // Special handling for "/" separator (Iranian currency)
          formatted = formatted.replace('.', '/');
        } else {
          formatted = formatted.replace('.', currencyInfo.decimalSeparator);
        }
      }
      
      // Add thousand separators if the number is large enough
      if (Math.abs(roundedNum) >= 1000) {
        const parts = currencyInfo.useDecimals 
          ? formatted.split(currencyInfo.decimalSeparator)
          : [formatted];
        const integerPart = parts[0];
        const decimalPart = parts[1] || '';
        
        // Add thousand separators (works for comma, period, or space)
        let formattedInteger = '';
        for (let i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
          if (count > 0 && count % 3 === 0) {
            formattedInteger = currencyInfo.thousandSeparator + formattedInteger;
          }
          formattedInteger = integerPart[i] + formattedInteger;
        }
        
        formatted = (currencyInfo.useDecimals && decimalPart)
          ? `${formattedInteger}${currencyInfo.decimalSeparator}${decimalPart}`
          : formattedInteger;
      }
      
      // Handle negative numbers
      const isNegative = num < 0;
      const sign = isNegative ? '-' : '';
      
      // Add currency symbol
      if (currencyInfo.displaySymbol && currencyInfo.symbol) {
        const space = currencyInfo.symbolSpace ? ' ' : '';
        if (currencyInfo.symbolFirst) {
          return `${sign}${currencyInfo.symbol}${space}${formatted}`;
        } else {
          return `${sign}${formatted}${space}${currencyInfo.symbol}`.trim();
        }
      } else {
        return `${sign}${formatted}`;
      }
    }
  };
})();
