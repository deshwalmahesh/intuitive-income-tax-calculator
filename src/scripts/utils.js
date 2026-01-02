/**
 * UTILITY FUNCTIONS - Tax Calculator
 * 
 * Common helper functions used across the application.
 * Includes formatting, validation, storage, and calculation helpers.
 */

const TaxUtils = {
    // ============================================
    // FORMATTING FUNCTIONS
    // ============================================

    /**
     * Format number as Indian currency with ₹ symbol
     * @param {number} num - Amount to format
     * @param {boolean} showDecimals - Whether to show decimal places
     * @returns {string} Formatted currency string (e.g., "₹1,50,000")
     */
    formatCurrency(num, showDecimals = false) {
        if (num === null || num === undefined || isNaN(num)) return '₹0';
        
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        
        // Indian number system: lakhs and crores
        const formatted = absNum.toLocaleString('en-IN', {
            minimumFractionDigits: showDecimals ? 2 : 0,
            maximumFractionDigits: showDecimals ? 2 : 0
        });
        
        return sign + '₹' + formatted;
    },

    /**
     * Format number without currency symbol (for inputs)
     * @param {number} num - Amount to format
     * @returns {string} Formatted number string
     */
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Math.round(num).toLocaleString('en-IN');
    },

    /**
     * Format percentage
     * @param {number} rate - Rate as decimal (e.g., 0.30 for 30%)
     * @param {number} decimals - Decimal places to show
     * @returns {string} Formatted percentage string (e.g., "30%")
     */
    formatPercent(rate, decimals = 0) {
        if (rate === null || rate === undefined || isNaN(rate)) return '0%';
        return (rate * 100).toFixed(decimals) + '%';
    },

    /**
     * Format large amounts in Lakhs/Crores for readability
     * @param {number} num - Amount to format
     * @returns {string} Short format (e.g., "15L", "1.2Cr")
     */
    formatShortCurrency(num) {
        if (num === null || num === undefined || isNaN(num)) return '₹0';
        
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        
        if (absNum >= 10000000) {
            return sign + '₹' + (absNum / 10000000).toFixed(2) + ' Cr';
        } else if (absNum >= 100000) {
            return sign + '₹' + (absNum / 100000).toFixed(2) + ' L';
        } else if (absNum >= 1000) {
            return sign + '₹' + (absNum / 1000).toFixed(1) + ' K';
        }
        return sign + '₹' + absNum.toFixed(0);
    },

    // ============================================
    // VALIDATION FUNCTIONS
    // ============================================

    /**
     * Validate and parse numeric input
     * @param {any} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default if invalid
     * @returns {number} Validated number
     */
    validateNumber(value, min = 0, max = Infinity, defaultValue = 0) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        if (num < min) return min;
        if (num > max) return max;
        return num;
    },

    /**
     * Validate age and return category
     * @param {number} age - Age in years
     * @returns {string} Age category ID
     */
    getAgeCategory(age) {
        age = this.validateNumber(age, 0, 150, 30);
        if (age >= 80) return 'above80';
        if (age >= 60) return '60to80';
        return 'below60';
    },

    /**
     * Check if user is senior citizen
     * @param {string} ageCategory - Age category ID
     * @returns {boolean} True if senior (60+)
     */
    isSeniorCitizen(ageCategory) {
        return ageCategory === '60to80' || ageCategory === 'above80';
    },

    /**
     * Check if user is super senior citizen
     * @param {string} ageCategory - Age category ID
     * @returns {boolean} True if super senior (80+)
     */
    isSuperSenior(ageCategory) {
        return ageCategory === 'above80';
    },

    // ============================================
    // CALCULATION HELPERS
    // ============================================

    /**
     * Calculate minimum of multiple values (for "least of" rules)
     * @param {...number} values - Values to compare
     * @returns {number} Minimum value
     */
    leastOf(...values) {
        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        return validValues.length > 0 ? Math.min(...validValues) : 0;
    },

    /**
     * Calculate amount within a cap
     * @param {number} amount - Amount claimed
     * @param {number} cap - Maximum allowed
     * @returns {number} Capped amount
     */
    capAmount(amount, cap) {
        if (cap === null || cap === undefined) return amount;
        return Math.min(amount, cap);
    },

    /**
     * Calculate percentage of a value
     * @param {number} value - Base value
     * @param {number} percentage - Percentage as decimal (0.10 for 10%)
     * @returns {number} Calculated percentage
     */
    percentOf(value, percentage) {
        return value * percentage;
    },

    /**
     * Round to nearest rupee
     * @param {number} amount - Amount to round
     * @returns {number} Rounded amount
     */
    roundToRupee(amount) {
        return Math.round(amount);
    },

    /**
     * Calculate tax for a slab-based system
     * @param {number} taxableIncome - Income to calculate tax on
     * @param {Array} slabs - Array of slab objects with {min, max, rate}
     * @returns {Object} {tax, breakdown}
     */
    calculateSlabTax(taxableIncome, slabs) {
        let tax = 0;
        const breakdown = [];

        for (const slab of slabs) {
            if (taxableIncome > slab.min) {
                const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
                const slabTax = taxableInSlab * slab.rate;
                
                if (taxableInSlab > 0) {
                    breakdown.push({
                        slab: slab.description || `${this.formatCurrency(slab.min)} - ${slab.max === Infinity ? 'Above' : this.formatCurrency(slab.max)}`,
                        income: taxableInSlab,
                        rate: slab.rate,
                        tax: slabTax
                    });
                }
                
                tax += slabTax;
            }
        }

        return { tax: this.roundToRupee(tax), breakdown };
    },

    // ============================================
    // LOCAL STORAGE HELPERS
    // ============================================

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {Object} data - Data to save
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    },

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {Object} defaultValue - Default if not found
     * @returns {Object} Loaded data or default
     */
    loadFromStorage(key, defaultValue = {}) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
            return defaultValue;
        }
    },

    /**
     * Clear stored data
     * @param {string} key - Storage key to clear
     */
    clearStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Could not clear localStorage:', e);
        }
    },

    // ============================================
    // DEBOUNCE / THROTTLE
    // ============================================

    /**
     * Debounce function for input handling
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // ============================================
    // DOM HELPERS
    // ============================================

    /**
     * Get element by ID with validation
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    getElement(id) {
        return document.getElementById(id);
    },

    /**
     * Get numeric value from input element
     * @param {string} id - Input element ID
     * @param {number} defaultValue - Default if invalid
     * @returns {number} Parsed value
     */
    getInputValue(id, defaultValue = 0) {
        const element = this.getElement(id);
        if (!element) return defaultValue;
        return this.validateNumber(element.value, 0, Infinity, defaultValue);
    },

    /**
     * Get selected value from dropdown
     * @param {string} id - Select element ID
     * @returns {string} Selected value
     */
    getSelectValue(id) {
        const element = this.getElement(id);
        return element ? element.value : '';
    },

    /**
     * Get checkbox state
     * @param {string} id - Checkbox element ID
     * @returns {boolean} Checked state
     */
    getCheckboxValue(id) {
        const element = this.getElement(id);
        return element ? element.checked : false;
    },

    /**
     * Set element content safely
     * @param {string} id - Element ID
     * @param {string} content - HTML content to set
     */
    setContent(id, content) {
        const element = this.getElement(id);
        if (element) {
            element.innerHTML = content;
        }
    },

    /**
     * Show/hide element
     * @param {string} id - Element ID
     * @param {boolean} show - Whether to show
     */
    toggleVisibility(id, show) {
        const element = this.getElement(id);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    },

    /**
     * Add CSS class to element
     * @param {string} id - Element ID
     * @param {string} className - Class to add
     */
    addClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.add(className);
        }
    },

    /**
     * Remove CSS class from element
     * @param {string} id - Element ID
     * @param {string} className - Class to remove
     */
    removeClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.remove(className);
        }
    },

    // ============================================
    // LOGGING HELPERS (for detailed report)
    // ============================================

    /**
     * Create a log entry for the detailed report
     * @param {string} section - Tax section (e.g., "80C", "HRA")
     * @param {string} item - Specific item
     * @param {number} amount - Amount claimed/applied
     * @param {number} limit - Limit applied (if any)
     * @param {string} explanation - Human-readable explanation
     * @param {number} taxSaved - Estimated tax saved (optional)
     * @returns {Object} Log entry object
     */
    createLogEntry(section, item, amount, limit, explanation, taxSaved = null, deductionType = 'neutral') {
        return {
            section,
            item,
            amount,
            limit,
            explanation,
            taxSaved,
            deductionType,  // 'investment' (green), 'expense' (orange), 'exemption' (blue), 'neutral'
            timestamp: Date.now()
        };
    },

    /**
     * Format log entry for display
     * @param {Object} entry - Log entry object
     * @returns {string} Formatted HTML string
     */
    formatLogEntry(entry) {
        let html = `<div class="log-entry">`;
        html += `<strong>${entry.section}</strong>`;
        if (entry.item) html += ` - ${entry.item}`;
        html += `<br>`;
        html += `Amount: ${this.formatCurrency(entry.amount)}`;
        if (entry.limit !== null && entry.limit !== undefined) {
            html += ` (Limit: ${this.formatCurrency(entry.limit)})`;
        }
        if (entry.taxSaved) {
            html += `<br><span class="tax-saved">Tax Saved: ${this.formatCurrency(entry.taxSaved)}</span>`;
        }
        html += `<p class="explanation">${entry.explanation}</p>`;
        html += `</div>`;
        return html;
    },

    // ============================================
    // UNIQUE ID GENERATOR
    // ============================================

    /**
     * Generate unique ID for dynamic entries
     * @param {string} prefix - Prefix for the ID
     * @returns {string} Unique ID
     */
    generateId(prefix = 'item') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Freeze to prevent modifications
Object.freeze(TaxUtils);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaxUtils;
}
