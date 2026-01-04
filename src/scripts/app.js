/**
 * APP.JS - Main Orchestration
 * Tax Calculator FY 2025-26
 * 
 * Handles:
 * - UI interactions (section toggle, regime switch)
 * - Dynamic add/modify/remove for investments & donations
 * - Data collection from all inputs
 * - Calculation orchestration (New & Old regime)
 * - Report generation with detailed breakdown
 */

// ============================================
// GLOBAL STATE
// ============================================
let currentRegime = 'compare';
// Arrays and counters are declared in formManager.js and exposed on window
// Use getters to access them (formManager.js loads before app.js)
const getEmploymentPeriods = () => window.employmentPeriods || [];
const getInvestments80C = () => window.investments80C || [];
const getDonations = () => window.donations || [];
// Rent is not in formManager - keep here
let rentPayments = [];
let rentPaymentCounter = 0;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0); // Fix scroll to middle issue
    initializeApp();
});

function initializeApp() {
    // Set up regime toggle
    setupRegimeToggle();
    
    // Add initial entries
    addInvestment80C();  // Add one empty investment row
    addDonation();       // Add one empty donation row
    addRentPayment();    // Add one empty rent payment row
    
    // Update UI based on default selections
    updateUIForAge();
    updateUIForEmployment();
    updateNPSLimits();
    updateOldRegimeSections();
    
    // Calculate on input change (debounced)
    setupAutoCalculate();
    
    console.log('Tax Calculator initialized - FY 2025-26');
}

// ============================================
// DOCUMENT EXTRACTION INTEGRATION
// Called by taxDocumentUploader.js after Gemini extraction
// ============================================

/**
 * Create employment period from extracted data
 * @param {Object} extractedData - Data extracted by Gemini
 * @returns {Object} The created employment period entry
 */
function createEmploymentPeriodFromExtraction(extractedData) {
    // Add a new employment period
    addEmploymentPeriod();
    
    // Get the newly created period
    const newPeriod = window.employmentPeriods[window.employmentPeriods.length - 1];
    
    // Fields to populate from extraction (per-job fields)
    const fieldsMap = {
        // Core salary components
        grossSalary: 'grossSalary',
        basicPlusDA: 'basicPlusDA',
        hraReceived: 'hraReceived',
        epfContribution: 'epfContribution',
        employerNPSContribution: 'employerNPSContribution',
        // Variable components
        bonus: 'bonus',
        specialAllowance: 'specialAllowance',
        commission: 'commission',
        // Reimbursements
        ltaReceived: 'ltaReceived',
        telephoneReimb: 'telephoneReimb',
        booksReimb: 'booksReimb',
        conveyanceAllowance: 'conveyanceAllowance',
        driverAllowance: 'driverAllowance',
        // Allowances
        childrenEducationAllowance: 'childrenEducationAllowance',
        hostelAllowance: 'hostelAllowance',
        uniformAllowance: 'uniformAllowance',
        mealVouchers: 'mealVouchers',
        // Perquisites
        perquisitesValue: 'perquisitesValue',
        profitsInLieuOfSalary: 'profitsInLieuOfSalary'
    };
    
    // Populate numeric fields
    Object.entries(fieldsMap).forEach(([extractKey, formKey]) => {
        const value = extractedData[extractKey];
        if (value && value > 0) {
            updateEmploymentPeriod(newPeriod.id, formKey, value);
            const inputEl = document.getElementById(`${newPeriod.id}_${formKey}`);
            if (inputEl) inputEl.value = value;
        }
    });
    
    // Update name
    if (extractedData.employerName) {
        updateEmploymentPeriod(newPeriod.id, 'name', extractedData.employerName);
        const nameEl = document.getElementById(`${newPeriod.id}_name`);
        if (nameEl) nameEl.value = extractedData.employerName;
    }
    
    // Update dates
    const dateFields = [
        { extract: 'startMonth', form: 'startMonth' },
        { extract: 'startYear', form: 'startYear' },
        { extract: 'endMonth', form: 'endMonth' },
        { extract: 'endYear', form: 'endYear' }
    ];
    
    dateFields.forEach(({ extract, form }) => {
        const value = extractedData[extract];
        if (value) {
            updateEmploymentPeriod(newPeriod.id, form, value);
            const selectEl = document.getElementById(`${newPeriod.id}_${form}`);
            if (selectEl) selectEl.value = value;
        }
    });
    
    // Update months display
    const monthsEl = document.getElementById(`${newPeriod.id}_months`);
    if (monthsEl) {
        const months = calculatePeriodMonths(newPeriod);
        monthsEl.textContent = `${months} month${months !== 1 ? 's' : ''}`;
        monthsEl.style.color = months > 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    
    // Update summary
    updateEmploymentSummary();
    updateOldRegimeSections();
    
    // Comprehensive log
    const populatedFields = Object.entries(fieldsMap)
        .filter(([extractKey]) => extractedData[extractKey] && extractedData[extractKey] > 0)
        .map(([extractKey, formKey]) => `${formKey}: ₹${extractedData[extractKey]?.toLocaleString()}`)
        .join(', ');
    
    console.log(`[App] Created employment period: ${extractedData.employerName || 'Unknown'} (${newPeriod.id})`);
    console.log(`[App] Populated fields: ${populatedFields || 'None'}`);
    console.log(`[App] Period: ${extractedData.startMonth}/${extractedData.startYear} - ${extractedData.endMonth}/${extractedData.endYear}`);
    
    return newPeriod;
}

/**
 * Rent Payment Management
 */
function addRentPayment() {
    const container = document.getElementById('rentPaymentsContainer');
    const id = `rent_${rentPaymentCounter++}`;
    
    // Default to full FY
    const isFirst = rentPayments.length === 0;
    
    const entry = {
        id,
        startMonth: 4,
        startYear: 2025,
        endMonth: 3,
        endYear: 2026,
        amount: 0,
        isMetro: false,
        city: 'Non-Metro' 
    };
    rentPayments.push(entry);
    
    const html = `
        <div class="dynamic-entry" id="${id}" style="display: block; padding: 12px; margin-bottom: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div>
                    <label style="font-size: 11px; display: block; margin-bottom: 4px; font-weight: 500;">Start</label>
                    <div style="display: grid; grid-template-columns: 1fr 80px; gap: 4px;">
                        <select id="${id}_startMonth" oninput="updateRentPayment('${id}', 'startMonth', this.value)" style="padding: 6px 8px; font-size: 13px;">
                            ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${entry.startMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
                        </select>
                        <select id="${id}_startYear" oninput="updateRentPayment('${id}', 'startYear', this.value)" style="padding: 6px 8px; font-size: 13px;">
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label style="font-size: 11px; display: block; margin-bottom: 4px; font-weight: 500;">End</label>
                    <div style="display: grid; grid-template-columns: 1fr 80px; gap: 4px;">
                        <select id="${id}_endMonth" oninput="updateRentPayment('${id}', 'endMonth', this.value)" style="padding: 6px 8px; font-size: 13px;">
                            ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${entry.endMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
                        </select>
                        <select id="${id}_endYear" oninput="updateRentPayment('${id}', 'endYear', this.value)" style="padding: 6px 8px; font-size: 13px;">
                            <option value="2025" ${entry.endYear === 2025 ? 'selected' : ''}>2025</option>
                            <option value="2026" ${entry.endYear === 2026 ? 'selected' : ''}>2026</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: flex-end;">
                <div>
                    <label style="font-size: 11px; display: block; margin-bottom: 4px; font-weight: 500;">Total Rent Paid in Period (₹)</label>
                    <input type="number" id="${id}_amount" value="0" min="0" placeholder="₹"
                           oninput="updateRentPayment('${id}', 'amount', this.value)" style="width: 100%; padding: 6px 8px;">
                </div>
                <div>
                    <label style="font-size: 11px; display: block; margin-bottom: 4px; font-weight: 500;">City Type</label>
                    <select id="${id}_isMetro" oninput="updateRentPayment('${id}', 'isMetro', this.value)" style="width: 100%; padding: 6px 8px; font-size: 13px;">
                        <option value="false">Non-Metro</option>
                        <option value="true">Metro (Delhi/Mum/Kol/Chn)</option>
                    </select>
                </div>
                <button class="entry-remove-btn" onclick="removeRentPayment('${id}')" title="Remove" style="height: 32px; width: 32px; flex-shrink: 0;">✕</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
}

function updateRentPayment(id, field, value) {
    const entry = rentPayments.find(r => r.id === id);
    if (!entry) {
        console.warn(`[HRA] updateRentPayment: Entry ${id} not found`);
        return;
    }
    
    if (field === 'amount') {
        entry.amount = parseFloat(value) || 0;
    } else if (field === 'isMetro') {
        entry.isMetro = value === 'true';
    } else {
        entry[field] = parseInt(value);
    }
    console.log(`[HRA] Updated ${id}.${field} = ${entry[field]}`);
}

function removeRentPayment(id) {
    console.log(`[HRA] Removing rent payment: ${id}`);
    rentPayments = rentPayments.filter(r => r.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    
    if (rentPayments.length === 0) {
        addRentPayment();
    }
    console.log(`[HRA] Remaining rent payments: ${rentPayments.length}`);
}

// Expose rent functions
window.addRentPayment = addRentPayment;
window.updateRentPayment = updateRentPayment;
window.removeRentPayment = removeRentPayment;

/**
 * Populate global fields that aggregate across jobs
 * @param {Object} aggregatedData - Aggregated data from multiple job extractions
 */
function populateGlobalFieldsFromExtraction(aggregatedData) {
    // Helper to safely populate a field (logs if field not found)
    const setField = (id, value, fieldDescription = '') => {
        if (value && value > 0) {
            const input = document.getElementById(id);
            if (input) {
                input.value = value;
                // Trigger events for reactive updates
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            } else {
                console.warn(`[App] Field "${id}" not found in UI ${fieldDescription ? `(${fieldDescription})` : ''}`);
                return false;
            }
        }
        return false;
    };

    // === PROFESSIONAL TAX (capped at 2500) ===
    if (aggregatedData.totalProfessionalTax) {
        const ptValue = Math.min(aggregatedData.totalProfessionalTax, 2500);
        setField('professionalTax', ptValue, 'Professional Tax');
    }
    
    // === HEALTH INSURANCE (80D) ===
    setField('healthInsuranceSelf', aggregatedData.totalHealthInsuranceSelf, '80D Self');
    setField('healthInsuranceParents', aggregatedData.totalHealthInsuranceParents, '80D Parents');

    // === EDUCATION LOAN INTEREST (80E) - Unlimited ===
    setField('educationLoanInterest', aggregatedData.totalEducationLoanInterest, '80E');

    // === HOME LOAN (Section 24b + 80C Principal) ===
    setField('homeLoanInterest', aggregatedData.totalHomeLoanInterest, 'Home Loan Interest');
    setField('homeLoanPrincipal', aggregatedData.totalHomeLoanPrincipal, 'Home Loan Principal');
    
    // === LEGACY HOME LOAN (80EE / 80EEA / 80EEB) ===
    setField('section80EEInterest', aggregatedData.totalSection80EEInterest, '80EE Interest');
    setField('section80EEAInterest', aggregatedData.totalSection80EEAInterest, '80EEA Interest');
    setField('section80EEBInterest', aggregatedData.totalSection80EEBInterest, '80EEB EV Loan');

    // === SECTION 89 RELIEF ===
    setField('section89Relief', aggregatedData.totalSection89Relief, 'Section 89 Relief');

    // === AGNIVEER CORPUS (80CCH) ===
    setField('agniveerContribution', aggregatedData.totalAgniveerContribution, 'Agniveer');

    // === EMPLOYER NPS (80CCD(2)) - Global field ===
    if (aggregatedData.totalEmployerNPS && aggregatedData.totalEmployerNPS > 0) {
        setField('employerNPSContribution', aggregatedData.totalEmployerNPS, 'Employer NPS');
    }

    // === EMPLOYEE NPS (80CCD(1)) - Part of 80C ===
    // Note: UI field is 'npsContribution' not 'employeeNPSContribution'
    if (aggregatedData.totalEmployeeNPS && aggregatedData.totalEmployeeNPS > 0) {
        setField('npsContribution', aggregatedData.totalEmployeeNPS, 'Employee NPS');
    }

    // === DONATIONS (80G) ===
    if (aggregatedData.totalDonations80G && aggregatedData.totalDonations80G > 0) {
        // Create a donation entry if none exists
        if (window.donations.length === 0) {
            window.addDonation();
        }
        // Populate the first donation row
        if (window.donations.length > 0) {
            const entry = window.donations[0];
            const amountInput = document.getElementById(`${entry.id}_amount`);
            const categorySelect = document.getElementById(`${entry.id}_category`);
            if (amountInput) {
                amountInput.value = aggregatedData.totalDonations80G;
                amountInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Set to generic charity (80G 50%)
            if (categorySelect) {
                categorySelect.value = 'charityTrust';
                categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    // === RETIREMENT BENEFITS (Correct field ID mappings) ===
    setField('gratuityReceived', aggregatedData.totalGratuity, 'Gratuity');
    setField('leaveEncashmentReceived', aggregatedData.totalLeaveEncashment, 'Leave Encashment');
    setField('vrsCompensationReceived', aggregatedData.totalVRSCompensation, 'VRS Compensation');
    setField('retrenchmentCompensation', aggregatedData.totalRetrenchmentCompensation, 'Retrenchment');
    // Note: commutedPension doesn't have a UI field currently - could add later

    // === OTHER INCOME ===
    // Note: These fields may not exist in current UI - just log if missing
    setField('otherIncomeFromEmployer', aggregatedData.totalOtherIncomeFromEmployer, 'Other Income');
    setField('nonRelativeGifts', aggregatedData.totalGiftsFromNonRelatives, 'Non-Relative Gifts');

    // === 26AS SPECIFIC FIELDS (May not have UI fields) ===
    // TCS, Advance Tax, Self Assessment Tax - typically read-only info
    // Just log for now - could add display fields later
    if (aggregatedData.totalTCS > 0) {
        console.log(`[App] TCS Collected: ₹${aggregatedData.totalTCS}`);
    }
    if (aggregatedData.totalAdvanceTax > 0) {
        console.log(`[App] Advance Tax Paid: ₹${aggregatedData.totalAdvanceTax}`);
    }
    if (aggregatedData.totalSelfAssessmentTax > 0) {
        console.log(`[App] Self Assessment Tax Paid: ₹${aggregatedData.totalSelfAssessmentTax}`);
    }

    // === 80C DEDUCTIONS (Special Handling) ===
    if (aggregatedData.totalSection80CDeductions && aggregatedData.totalSection80CDeductions > 0) {
        // Ensure at least one investment row exists
        if (window.investments80C.length === 0) {
            window.addInvestment80C();
        }
        
        // Use the first investment row to show the extracted bulk 80C amount
        if (window.investments80C.length > 0) {
            const entry = window.investments80C[0];
            const amountInput = document.getElementById(`${entry.id}_amount`);
            const typeSelect = document.getElementById(`${entry.id}_type`);
            
            if (amountInput) {
                amountInput.value = aggregatedData.totalSection80CDeductions;
                amountInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Set to generic type
            if (typeSelect) {
                typeSelect.value = 'other80c';
                typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    // === HOME LOAN PRINCIPAL (add to 80C) ===
    if (aggregatedData.totalHomeLoanPrincipal && aggregatedData.totalHomeLoanPrincipal > 0) {
        setField('homeLoanPrincipal', aggregatedData.totalHomeLoanPrincipal, 'Home Loan Principal 80C');
    }
    
    console.log('[App] Populated global fields from extraction:', aggregatedData);
    
    // Trigger calculation update
    if (typeof debounceCalculate === 'function') debounceCalculate();
    
    // Update 80C totals
    if (typeof updateTotal80C === 'function') updateTotal80C();
}

// Expose functions globally for taxDocumentUploader.js
window.createEmploymentPeriodFromExtraction = createEmploymentPeriodFromExtraction;
window.populateGlobalFieldsFromExtraction = populateGlobalFieldsFromExtraction;
window.employmentPeriods = employmentPeriods;
window.rentPayments = rentPayments; // Expose
window.removeEmploymentPeriod = removeEmploymentPeriod;
window.calculateTax = calculateTax;
window.addRentPayment = addRentPayment; // Expose
window.removeRentPayment = removeRentPayment; // Expose
window.updateRentPayment = updateRentPayment; // Expose

// ============================================
// REGIME TOGGLE - REMOVED (Always compare both)
// ============================================
function setupRegimeToggle() {
    // No toggle buttons anymore - always compare both regimes
    // currentRegime is already set to 'compare' by default
}

function updateOldRegimeSections() {
    const oldRegimeSections = document.querySelectorAll('.old-regime-only');
    
    oldRegimeSections.forEach(section => {
        if (currentRegime === 'new') {
            section.style.opacity = '0.5';
            section.style.pointerEvents = 'none';
        } else {
            section.style.opacity = '1';
            section.style.pointerEvents = 'auto';
        }
    });
}

// ============================================
// SECTION TOGGLE
// ============================================
function toggleSection(sectionId) {
    const content = document.getElementById(`content-${sectionId}`);
    const toggle = document.getElementById(`toggle-${sectionId}`);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        toggle.classList.remove('collapsed');
    } else {
        content.classList.add('hidden');
        toggle.classList.add('collapsed');
    }
}

/**
 * Programmatically set section expanded/collapsed state
 * @param {string} sectionId - Section ID (without 'section-' prefix)
 * @param {boolean} expanded - True to expand, false to collapse
 */
function setSectionExpanded(sectionId, expanded) {
    const content = document.getElementById(`content-${sectionId}`);
    const toggle = document.getElementById(`toggle-${sectionId}`);
    
    if (!content || !toggle) return;
    
    if (expanded) {
        content.classList.remove('hidden');
        toggle.classList.remove('collapsed');
    } else {
        content.classList.add('hidden');
        toggle.classList.add('collapsed');
    }
}

/**
 * Check if a section has any non-default values in its fields
 * @param {string} sectionId - Section ID
 * @returns {boolean} True if section has data
 */
function checkSectionHasData(sectionId) {
    // Map of section IDs to their input field IDs
    const sectionFieldsMap = {
        'personal': ['ageCategory', 'employmentType', 'employerType'],
        '80c': [], // Check investments80C array
        'nps': ['npsContribution', 'npsExtraContribution', 'employerNPSContribution'],
        '80d': ['healthInsuranceSelf', 'healthInsuranceParents', 'preventiveCheckup'],
        'homeloan': ['homeLoanInterest', 'homeLoanPrincipal'],
        'legacy-home': ['section80EEInterest', 'section80EEAInterest'],
        '80e': ['educationLoanInterest'],
        '80eeb': ['section80EEBInterest'],
        'donations': [], // Check donations array
        'capitalgains': ['stcgEquity', 'ltcgEquity', 'realEstateSaleValue', 'realEstatePurchaseValue'],
        'otherincome': ['savingsInterest', 'fdInterest', 'dividendIncome', 'rentalIncome', 'agriculturalIncome', 'familyPension', 'nonRelativeGifts'],
        'disabilities': ['selfDisabilityLevel', 'dependentDisabilityLevel', 'specifiedDiseaseExpenses'],
        'agniveer': ['agniveerContribution'],
        'retirement': ['gratuityReceived', 'leaveEncashmentReceived', 'yearsOfService', 'lastDrawnSalary', 'vrsCompensationReceived', 'retrenchmentCompensation'],
        '80gga': ['scientificResearchDonation'],
        'reliefs': ['section89Relief']
    };
    
    const fields = sectionFieldsMap[sectionId];
    if (!fields) return false;
    
    // Special case: check dynamic arrays
    if (sectionId === '80c') {
        return window.investments80C.some(inv => inv.amount > 0);
    }
    if (sectionId === 'donations') {
        return window.donations.some(don => don.amount > 0);
    }
    
    // Check each field for non-default value
    for (const fieldId of fields) {
        const input = document.getElementById(fieldId);
        if (!input) continue;
        
        const value = input.value;
        const tagName = input.tagName.toLowerCase();
        
        if (tagName === 'select') {
            // For selects, check if not first option (except for ageCategory/employmentType which are expected defaults)
            if (!['ageCategory', 'employmentType', 'employerType', 'parentsAgeCategory'].includes(fieldId)) {
                if (input.selectedIndex > 0) return true;
            }
        } else if (tagName === 'input') {
            const numVal = parseFloat(value) || 0;
            if (numVal > 0) return true;
        }
    }
    
    return false;
}

/**
 * Update section visual indicator based on whether it has data
 * @param {string} sectionId - Section ID
 * @param {boolean} hasData - Whether section has data
 */
function updateSectionDataState(sectionId, hasData) {
    const section = document.getElementById(`section-${sectionId}`);
    if (!section) return;
    
    if (hasData) {
        section.classList.add('section--has-data');
    } else {
        section.classList.remove('section--has-data');
    }
}

/**
 * Expand all sections that have non-default data and add visual indicator
 * Call after data extraction or form population
 */
function expandSectionsWithData() {
    const allSections = [
        'personal', '80c', 'nps', '80d', 'homeloan', 'legacy-home', '80e', '80eeb',
        'donations', 'capitalgains', 'otherincome', 'disabilities', 'agniveer',
        'retirement', '80gga', 'reliefs'
    ];
    
    allSections.forEach(sectionId => {
        const hasData = checkSectionHasData(sectionId);
        updateSectionDataState(sectionId, hasData);
        
        if (hasData) {
            setSectionExpanded(sectionId, true);
        }
    });
    
    console.log('[App] Expanded sections with data');
}

// Expose section management functions
window.setSectionExpanded = setSectionExpanded;
window.expandSectionsWithData = expandSectionsWithData;

// ============================================
// UI UPDATE HANDLERS
// ============================================
function updateUIForAge() {
    const ageCategory = document.getElementById('ageCategory').value;
    
    // Update 80TTB vs 80TTA hint
    const savingsHelpText = document.querySelector('#savingsInterest').closest('.form-group').querySelector('.help-text');
    if (TaxUtils.isSeniorCitizen(ageCategory)) {
        savingsHelpText.innerHTML = `
            <span class="info-icon" style="background: var(--color-success);">✓</span>
            <strong>Senior benefit!</strong> 80TTB: ₹1,00,000 deduction on ALL interest (savings + FD). INCREASED in Budget 2025!
        `;
    } else {
        savingsHelpText.innerHTML = `
            <span class="info-icon">i</span>
            80TTA: ₹10K deduction (<60). 80TTB: ₹1L deduction (60+, includes FD). Old Regime only.
        `;
    }
}

function updateUIForEmployment() {
    const employmentType = document.getElementById('employmentType').value;
    const employmentSection = document.getElementById('section-employment');
    
    if (employmentType === 'unemployed') {
        employmentSection.style.display = 'none';
    } else {
        employmentSection.style.display = 'block';
        // Add one employment period if none exist
        if (window.employmentPeriods.length === 0) {
            addEmploymentPeriod();
        }
    }
}

function updateNPSLimits() {
    const employerType = document.getElementById('employerType').value;
    const npsHelpText = document.querySelector('#employerNPSContribution')?.closest('.form-group')?.querySelector('.help-text');
    
    if (npsHelpText) {
        const percentOld = employerType === 'private' ? '10%' : '14%';
        npsHelpText.innerHTML = `
            <span class="info-icon">i</span>
            80CCD(2): Available in BOTH regimes! Limit: 14% (New Regime), ${percentOld} (Old Regime) of Basic+DA.
        `;
    }
}

// ============================================
// EMPLOYMENT PERIODS MANAGEMENT
// ============================================


// ============================================
// AUTO-CALCULATE ON INPUT
// ============================================
function setupAutoCalculate() {
    // Debounced auto-calc on any input change (500ms delay to avoid excessive recalc)
    window.debounceCalculate = TaxUtils.debounce(() => {
        calculateTax();  // Auto-calculate on every change
    }, 500);
    
    const debouncedCalc = window.debounceCalculate;
    
    // Listen to all inputs via Event Delegation on the document
    // This catches existing AND dynamically added elements
    document.addEventListener('input', (e) => {
        if (e.target.matches('input') || e.target.matches('select')) {
             if (e.target.type === 'number') {
                 // Update totals immediately for UI feedback
                 updateTotal80C();
                 updateEmploymentSummary();
             }
             debouncedCalc();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.matches('input') || e.target.matches('select')) {
             updateTotal80C();
             updateEmploymentSummary();
             debouncedCalc();
        }
    });
}

// ============================================
// COLLECT ALL USER DATA
// ============================================
function collectUserData() {
    // Process employment periods - auto-compute Basic if not provided
    const processedPeriods = window.employmentPeriods.map(p => {
        const months = calculatePeriodMonths(p);
        return {
            ...p,
            monthsWorked: months,
            // Auto-compute Basic as 50% of gross if not provided
            basicPlusDA: p.basicPlusDA > 0 ? p.basicPlusDA : (p.grossSalary * 0.5)
        };
    });
    
    // Aggregate totals from all periods
    const totalGrossSalary = processedPeriods.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const totalBasicPlusDA = processedPeriods.reduce((sum, p) => sum + (p.basicPlusDA || 0), 0);
    const totalEPF = processedPeriods.reduce((sum, p) => sum + (p.epfContribution || 0), 0);
    const totalEmployerNPS = processedPeriods.reduce((sum, p) => sum + (p.employerNPSContribution || 0), 0);
    const totalHRA = processedPeriods.reduce((sum, p) => sum + (p.hraReceived || 0), 0);
    
    // Aggregate new salary components
    const totalBonus = processedPeriods.reduce((sum, p) => sum + (p.bonus || 0), 0);
    const totalSpecialAllowance = processedPeriods.reduce((sum, p) => sum + (p.specialAllowance || 0), 0);
    const totalCommission = processedPeriods.reduce((sum, p) => sum + (p.commission || 0), 0);
    const totalLTA = processedPeriods.reduce((sum, p) => sum + (p.ltaReceived || 0), 0);
    const totalTelephoneReimb = processedPeriods.reduce((sum, p) => sum + (p.telephoneReimb || 0), 0);
    const totalBooksReimb = processedPeriods.reduce((sum, p) => sum + (p.booksReimb || 0), 0);
    const totalConveyanceAllowance = processedPeriods.reduce((sum, p) => sum + (p.conveyanceAllowance || 0), 0);
    const totalDriverAllowance = processedPeriods.reduce((sum, p) => sum + (p.driverAllowance || 0), 0);
    // Additional allowances (no UI but extracted)
    const totalChildrenEdAllowance = processedPeriods.reduce((sum, p) => sum + (p.childrenEducationAllowance || 0), 0);
    const totalHostelAllowance = processedPeriods.reduce((sum, p) => sum + (p.hostelAllowance || 0), 0);
    const totalMealVouchers = processedPeriods.reduce((sum, p) => sum + (p.mealVouchers || 0), 0);
    const totalPerquisites = processedPeriods.reduce((sum, p) => sum + (p.perquisitesValue || 0), 0);
    const totalProfitsInLieu = processedPeriods.reduce((sum, p) => sum + (p.profitsInLieuOfSalary || 0), 0);
    
    return {
        // Personal Info
        ageCategory: TaxUtils.getSelectValue('ageCategory'),
        employmentType: TaxUtils.getSelectValue('employmentType'),
        employerType: TaxUtils.getSelectValue('employerType'),
        // City Type now comes from rentPayments
        
        // Employment Periods (NEW - for per-period HRA calculation)
        employmentPeriods: processedPeriods,
        
        // Aggregated Salary (for backward compatibility)
        grossSalary: totalGrossSalary,
        basicPlusDA: totalBasicPlusDA > 0 ? totalBasicPlusDA : totalGrossSalary * 0.5,
        professionalTax: TaxUtils.getInputValue('professionalTax'),
        epfContribution: totalEPF,
        
        // Rent Payments (Dynamic)
        // NOTE: r.amount = TOTAL rent paid for the period (not monthly)
        rentPayments: rentPayments.filter(r => r.amount > 0),
        // Sum of all rent period durations (for validation - should not exceed 12)
        totalRentMonths: rentPayments.reduce((sum, r) => sum + calculatePeriodMonths(r), 0),
        // Annual rent = sum of all period totals (amount is already total for period)
        annualRentPaid: rentPayments.reduce((sum, r) => sum + r.amount, 0),
        rentPaid: rentPayments.reduce((sum, r) => sum + r.amount, 0), // Aggregate for backward compatibility
        
        // Aggregated HRA for backward compatibility
        hraReceived: totalHRA,
        
        // New Salary Components (aggregated from periods)
        bonus: totalBonus,
        specialAllowance: totalSpecialAllowance,
        commission: totalCommission,
        ltaReceived: totalLTA,
        telephoneReimb: totalTelephoneReimb,
        booksReimb: totalBooksReimb,
        conveyanceAllowance: totalConveyanceAllowance,
        driverAllowance: totalDriverAllowance,
        // Additional extracted components (no UI but passed to calculators)
        childrenEducationAllowance: totalChildrenEdAllowance,
        hostelAllowance: totalHostelAllowance,
        mealVouchers: totalMealVouchers,
        perquisitesValue: totalPerquisites,
        profitsInLieuOfSalary: totalProfitsInLieu,
        
        // 80C Investments (from dynamic list)
        investments80C: window.investments80C.filter(i => i.amount > 0),
        
        // NPS - aggregated from periods + direct inputs
        npsContribution: TaxUtils.getInputValue('npsContribution'),
        npsExtraContribution: TaxUtils.getInputValue('npsExtraContribution'),
        employerNPSContribution: totalEmployerNPS > 0 ? totalEmployerNPS : TaxUtils.getInputValue('employerNPSContribution'),
        
        // Health Insurance
        healthInsuranceSelf: TaxUtils.getInputValue('healthInsuranceSelf'),
        healthInsuranceParents: TaxUtils.getInputValue('healthInsuranceParents'),
        parentsAgeCategory: TaxUtils.getSelectValue('parentsAgeCategory'),
        preventiveCheckup: TaxUtils.getInputValue('preventiveCheckup'),
        
        // Home Loan
        homeLoanInterest: TaxUtils.getInputValue('homeLoanInterest'),
        homeLoanPrincipal: TaxUtils.getInputValue('homeLoanPrincipal'),
        isPropertyLetOut: TaxUtils.getCheckboxValue('isPropertyLetOut'),
        
        // Education Loan
        educationLoanInterest: TaxUtils.getInputValue('educationLoanInterest'),
        
        // Legacy Home Loan (80EE / 80EEA)
        section80EEInterest: TaxUtils.getInputValue('section80EEInterest'),
        section80EEAInterest: TaxUtils.getInputValue('section80EEAInterest'),

        // EV Loan (Section 80EEB)
        section80EEBInterest: TaxUtils.getInputValue('section80EEBInterest'),
        
        // Donations (from dynamic list)
        // Passed RAW to calculator for internal categorization (80G vs 80GGC vs 80GGA)
        donations: window.donations.filter(d => d.amount > 0),
        
        // REMOVED: politicalPartyDonation (now calculated internally from donations list)
        
        // Capital Gains
        stcgEquity: TaxUtils.getInputValue('stcgEquity'),
        ltcgEquity: TaxUtils.getInputValue('ltcgEquity'),
        
        // Real Estate
        realEstateSaleValue: TaxUtils.getInputValue('realEstateSaleValue'),
        realEstatePurchaseValue: TaxUtils.getInputValue('realEstatePurchaseValue'),
        realEstatePurchaseDate: document.getElementById('realEstatePurchaseDate')?.value || '',
        realEstateTransferExpenses: TaxUtils.getInputValue('realEstateTransferExpenses'),
        
        // Exemptions
        investmentSec54: TaxUtils.getInputValue('investmentSec54'),
        investmentSec54EC: TaxUtils.getInputValue('investmentSec54EC'),
        capitalGainDeposit: TaxUtils.getInputValue('capitalGainDeposit'),
        
        stclCarryForward: TaxUtils.getInputValue('stclCarryForward'),
        ltclCarryForward: TaxUtils.getInputValue('ltclCarryForward'),
        
        // Other Income
        savingsInterest: TaxUtils.getInputValue('savingsInterest'),
        fdInterest: TaxUtils.getInputValue('fdInterest'),
        dividendIncome: TaxUtils.getInputValue('dividendIncome'),
        rentalIncome: TaxUtils.getInputValue('rentalIncome'),
        agriculturalIncome: TaxUtils.getInputValue('agriculturalIncome'),
        familyPension: TaxUtils.getInputValue('familyPension'),
        nonRelativeGifts: TaxUtils.getInputValue('nonRelativeGifts'),
        
        // Disabilities
        selfDisabilityLevel: TaxUtils.getSelectValue('selfDisabilityLevel') || null,
        dependentDisabilityLevel: TaxUtils.getSelectValue('dependentDisabilityLevel') || null,
        specifiedDiseaseExpenses: TaxUtils.getInputValue('specifiedDiseaseExpenses'),
        
        // Aggregate fields for calculators
        ppfContribution: window.investments80C.filter(i => i.type === 'ppf').reduce((s, i) => s + i.amount, 0),
        elssInvestment: window.investments80C.filter(i => i.type === 'elss').reduce((s, i) => s + i.amount, 0),
        lifeInsurancePremium: window.investments80C.filter(i => i.type === 'lifeInsurance').reduce((s, i) => s + i.amount, 0),
        nscInvestment: window.investments80C.filter(i => i.type === 'nsc').reduce((s, i) => s + i.amount, 0),
        scssInvestment: window.investments80C.filter(i => i.type === 'scss').reduce((s, i) => s + i.amount, 0),
        taxSaverFD: window.investments80C.filter(i => i.type === 'taxSaverFD').reduce((s, i) => s + i.amount, 0),
        sukanyaSamriddhi: window.investments80C.filter(i => i.type === 'sukanyaSamriddhi').reduce((s, i) => s + i.amount, 0),
        tuitionFees: window.investments80C.filter(i => i.type === 'tuitionFees').reduce((s, i) => s + i.amount, 0),
        stampDuty: window.investments80C.filter(i => i.type === 'stampDuty').reduce((s, i) => s + i.amount, 0),

        // Retirement Benefits (Section 10)
        gratuityReceived: TaxUtils.getInputValue('gratuityReceived'),
        leaveEncashmentReceived: TaxUtils.getInputValue('leaveEncashmentReceived'),
        yearsOfService: TaxUtils.getInputValue('yearsOfService'),
        lastDrawnSalary: TaxUtils.getInputValue('lastDrawnSalary'),
        vrsCompensationReceived: TaxUtils.getInputValue('vrsCompensationReceived'),
        retrenchmentCompensation: TaxUtils.getInputValue('retrenchmentCompensation'),

        // Section 89 Relief
        section89Relief: TaxUtils.getInputValue('section89Relief'),

        // Section 80GGA - Scientific Research
        scientificResearchDonation: TaxUtils.getInputValue('scientificResearchDonation'),
        scientificDonationPaymentMode: TaxUtils.getSelectValue('scientificDonationPaymentMode') || 'online',
        
        // Entertainment Allowance (Govt employees)
        entertainmentAllowance: TaxUtils.getInputValue('entertainmentAllowance'),
        
        // Additional allowances
        childrenEducationAllowanceReceived: TaxUtils.getInputValue('childrenEducationAllowanceReceived'),
        numberOfChildren: TaxUtils.getInputValue('numberOfChildren') || 0,
        hostelAllowanceReceived: TaxUtils.getInputValue('hostelAllowanceReceived'),
        transportAllowanceReceived: TaxUtils.getInputValue('transportAllowanceReceived'),
        isDivyang: TaxUtils.getCheckboxValue('isDivyang'),
        
        // LTA - already aggregated earlier from employment periods (line 1117)
        // ltaActualExpenses is for travel bills, currently not in UI
        ltaActualExpenses: TaxUtils.getInputValue('ltaActualExpenses')
    };
}

// ============================================
// INPUT VALIDATION & NORMALIZATION
// ============================================
function validateAndNormalizeInputs(userData) {
    const warnings = [];
    
    // 1. Auto-calculate Basic+DA if not provided (default to 50% of gross)
    if (!userData.basicPlusDA || userData.basicPlusDA === 0) {
        userData.basicPlusDA = userData.grossSalary * 0.5;
    }
    
    // 2. Basic+DA cannot exceed Gross Salary
    if (userData.basicPlusDA > userData.grossSalary && userData.grossSalary > 0) {
        userData.basicPlusDA = userData.grossSalary * 0.5;
        warnings.push('Basic+DA exceeded Gross Salary. Auto-adjusted to 50% of Gross.');
    }
    
    // 3. EPF cannot exceed Basic+DA or 12%
    const maxEPF = userData.basicPlusDA * 0.12;
    if (userData.epfContribution > maxEPF * 2 && maxEPF > 0) {
        warnings.push(`EPF contribution seems high (usually ~12% of Basic = ${TaxUtils.formatCurrency(maxEPF)}). Please verify.`);
    }
    
    // 4. HRA and 80GG are mutually exclusive
    if (userData.hraReceived > 0 && userData.rentPaid > 0) {
        // HRA is being claimed, 80GG won't apply - this is handled in oldRegime.js
    }
    
    // 5. NPS 80CCD(1B) capped at ₹50,000
    if (userData.npsExtraContribution > 50000) {
        userData.npsExtraContribution = 50000;
        warnings.push('80CCD(1B) contribution capped at ₹50,000.');
    }
    
    // 6. Employer NPS - check against limits
    const maxEmployerNPSPercent = userData.employerType === 'government' ? 0.14 : 0.10;
    const maxEmployerNPS = userData.basicPlusDA * maxEmployerNPSPercent;
    if (userData.employerNPSContribution > maxEmployerNPS && maxEmployerNPS > 0) {
        warnings.push(`Employer NPS exceeds ${maxEmployerNPSPercent * 100}% limit. Only ${TaxUtils.formatCurrency(maxEmployerNPS)} will be allowed.`);
    }
    
    // 7. Preventive health checkup capped at ₹5,000
    if (userData.preventiveCheckup > 5000) {
        userData.preventiveCheckup = 5000;
        warnings.push('Preventive health checkup capped at ₹5,000.');
    }
    
    // 8. Professional Tax capped at ₹2,500 (constitutional limit)
    if (userData.professionalTax > 2500) {
        userData.professionalTax = 2500;
        warnings.push('Professional tax capped at ₹2,500 (constitutional limit).');
    }
    
    // 9. Gifts from non-relatives - only taxable if > ₹50,000 aggregate
    // This is handled in calculation, no warning needed
    
    // 10. If years of service is 0 but gratuity is claimed, show warning
    if (userData.gratuityReceived > 0 && (!userData.yearsOfService || userData.yearsOfService === 0)) {
        warnings.push('Gratuity calculation requires years of service. Please enter for accurate formula.');
    }
    
    // 11. Agricultural income partial integration warning
    if (userData.agriculturalIncome > 5000 && userData.grossSalary > 0) {
        warnings.push('Note: Agricultural income > ₹5,000 may trigger partial integration, affecting tax rate.');
    }
    
    // 12. Rent Period Validation
    if (userData.totalRentMonths > 0) {
        if (userData.totalRentMonths > 12) {
            warnings.push(`⚠️ Rent periods sum to ${userData.totalRentMonths} months (exceeds 12). Please check for overlapping periods.`);
        } else if (userData.totalRentMonths < 12 && userData.hraReceived > 0) {
            warnings.push(`ℹ️ Rent entered for only ${userData.totalRentMonths} month(s). HRA exemption will be calculated ONLY for these months, not the full year.`);
        }
    }
    
    // === NEW SALARY COMPONENT VALIDATIONS ===
    const errors = [];  // Hard blocks
    
    // 12. Sum of salary components cannot exceed Gross Salary (HARD BLOCK)
    const sumOfComponents = (userData.basicPlusDA || 0) + 
                           (userData.hraReceived || 0) + 
                           (userData.bonus || 0) + 
                           (userData.specialAllowance || 0) +
                           (userData.ltaReceived || 0) +
                           (userData.telephoneReimb || 0) +
                           (userData.booksReimb || 0) +
                           (userData.fuelAllowance || 0);
    if (sumOfComponents > userData.grossSalary && userData.grossSalary > 0) {
        errors.push(`Total salary components (${TaxUtils.formatCurrency(sumOfComponents)}) exceed Gross Salary (${TaxUtils.formatCurrency(userData.grossSalary)}). Please correct.`);
    }
    
    // 13. Basic salary ratio warnings
    if (userData.grossSalary > 0) {
        const basicRatio = userData.basicPlusDA / userData.grossSalary;
        if (basicRatio < 0.40 && userData.basicPlusDA > 0) {
            warnings.push(`Basic salary is ${(basicRatio * 100).toFixed(0)}% of gross (typical: 40-50%). Please verify your salary slip.`);
        }
        if (basicRatio > 0.60) {
            warnings.push(`Basic salary is ${(basicRatio * 100).toFixed(0)}% of gross (typical: 40-50%). Please verify.`);
        }
    }
    
    // 14. HRA vs Basic ratio warning
    if (userData.hraReceived > 0 && userData.basicPlusDA > 0) {
        const hraRatio = userData.hraReceived / userData.basicPlusDA;
        if (hraRatio > 0.50) {
            warnings.push(`HRA (${(hraRatio * 100).toFixed(0)}% of Basic) seems high. Typical range: 40-50% of Basic.`);
        }
    }
    
    // 15. LTA in New Regime warning (no exemption available)
    if (userData.ltaReceived > 0) {
        warnings.push('LTA exemption is only available in Old Regime. In New Regime, LTA is fully taxable.');
    }
    
    // Display warnings and errors
    if (warnings.length > 0) {
        console.log('Validation Warnings:', warnings);
    }
    if (errors.length > 0) {
        console.error('Validation Errors (Hard Blocks):', errors);
    }
    
    return { data: userData, warnings, errors };
}

// ============================================
// MAIN CALCULATION
// ============================================
function calculateTax() {
    let userData = collectUserData();
    
    // Validate and normalize inputs
    const validation = validateAndNormalizeInputs(userData);
    userData = validation.data;
    
    // Check for hard block errors - show but still calculate
    const hasErrors = validation.errors && validation.errors.length > 0;
    
    // Initialize calculators
    const newCalc = new NewRegimeCalculator(TAX_CONFIG);
    const oldCalc = new OldRegimeCalculator(TAX_CONFIG);
    
    // Calculate both regimes
    const newResult = newCalc.calculate(userData);
    const oldResult = oldCalc.calculate(userData);
    
    // Generate and display report (pass warnings and errors)
    displayResults(newResult, oldResult, userData, validation.warnings, validation.errors);
}

// ============================================
// DISPLAY RESULTS
// ============================================
// Store last calculation results for modal access
let lastNewResult = null;
let lastOldResult = null;
let lastUserData = null;

function displayResults(newResult, oldResult, userData, warnings = [], errors = []) {
    const panel = document.getElementById('resultsPanel');
    const betterRegime = newResult.finalTax <= oldResult.finalTax ? 'new' : 'old';
    const savings = Math.abs(newResult.finalTax - oldResult.finalTax);
    
    // Store for modal access
    lastNewResult = newResult;
    lastOldResult = oldResult;
    lastUserData = userData;
    
    // Build errors HTML (Hard Blocks - Red)
    let errorsHtml = '';
    if (errors && errors.length > 0) {
        errorsHtml = `
            <div class="result-card" style="background: #fef2f2; border: 1px solid #ef4444; border-left: 4px solid #ef4444;">
                <h3 class="result-title" style="color: #dc2626;">⛔ Validation Errors (Please Fix)</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #991b1b;">
                    ${errors.map(e => `<li style="margin-bottom: 6px;">${e}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Build warnings HTML if any (Orange)
    let warningsHtml = '';
    if (warnings && warnings.length > 0) {
        warningsHtml = `
            <div class="result-card" style="background: #fff8e6; border: 1px solid #f59e0b; border-left: 4px solid #f59e0b;">
                <h3 class="result-title" style="color: #b45309;">⚠️ Auto-Corrections & Notes</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f;">
                    ${warnings.map(w => `<li style="margin-bottom: 6px;">${w}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Always use comparison view
    const html = generateComparisonReport(newResult, oldResult, betterRegime, savings, userData);
    
    // Prepend errors and warnings to the output
    panel.innerHTML = errorsHtml + warningsHtml + html;
}

function generateComparisonReport(newResult, oldResult, betterRegime, savings, userData) {
    return `
        <!-- Savings Banner -->
        ${savings > 0 ? `
        <div class="savings-banner">
            <div class="label">💰 TAX SAVINGS BY CHOOSING ${betterRegime.toUpperCase()} REGIME</div>
            <div class="amount">${TaxUtils.formatCurrency(savings)}</div>
            <div class="subtext">Per year savings!</div>
        </div>
        ` : ''}
        
        <!-- Comparison Grid -->
        <div class="result-card">
            <h3 class="result-title">⚖️ Regime Comparison</h3>
            <div class="comparison-grid">
                <div class="regime-result ${betterRegime === 'new' ? 'regime-result--better' : ''}">
                    <div class="label">New Regime</div>
                    <div class="amount">${TaxUtils.formatCurrency(newResult.finalTax)}</div>
                    ${betterRegime === 'new' ? '<span class="better-tag">✓ Better Choice</span>' : ''}
                </div>
                <div class="regime-result ${betterRegime === 'old' ? 'regime-result--better' : ''}">
                    <div class="label">Old Regime</div>
                    <div class="amount">${TaxUtils.formatCurrency(oldResult.finalTax)}</div>
                    ${betterRegime === 'old' ? '<span class="better-tag">✓ Better Choice</span>' : ''}
                </div>
            </div>
            <button onclick="openBreakdownModal()" style="width: 100%; margin-top: 16px; padding: 12px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                🔍 View Full Side-by-Side Breakdown
            </button>
        </div>
        
        <!-- Tax Calculation -->
        <div class="result-card">
            <h3 class="result-title">🧮 Tax Calculation</h3>
            <table style="width: 100%; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="text-align: left; padding: 8px;">Step</th>
                        <th style="text-align: right; padding: 8px;">New</th>
                        <th style="text-align: right; padding: 8px;">Old</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px;">Taxable Income</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.taxableIncome)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.taxableIncome)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;">Tax on Slabs</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.slabTax.tax)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.slabTax.tax)}</td>
                    </tr>
                    ${newResult.rebate.amount > 0 || oldResult.rebate.amount > 0 ? `
                    <tr style="color: var(--color-success);">
                        <td style="padding: 8px;">(-) Section 87A Rebate</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.rebate.amount)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.rebate.amount)}</td>
                    </tr>` : ''}
                    ${newResult.surcharge.amount > 0 || oldResult.surcharge.amount > 0 ? `
                    <tr>
                        <td style="padding: 8px;">(+) Surcharge</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.surcharge.amount)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.surcharge.amount)}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="padding: 8px;">(+) Health & Education Cess (4%)</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.cess.amount)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.cess.amount)}</td>
                    </tr>
                    ${newResult.capitalGainsTax.total > 0 || oldResult.capitalGainsTax.total > 0 ? `
                    <tr>
                        <td style="padding: 8px;">(+) Capital Gains Tax</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.capitalGainsTax.total)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.capitalGainsTax.total)}</td>
                    </tr>` : ''}
                    ${newResult.section89Relief > 0 || oldResult.section89Relief > 0 ? `
                    <tr style="color: var(--color-success);">
                        <td style="padding: 8px;">(-) Section 89 Relief</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.section89Relief)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.section89Relief)}</td>
                    </tr>` : ''}
                    <tr style="border-top: 2px solid var(--color-primary); font-weight: bold; font-size: 15px;">
                        <td style="padding: 12px 8px;">FINAL TAX</td>
                        <td style="text-align: right; padding: 12px 8px; color: ${betterRegime === 'new' ? 'var(--color-success)' : 'inherit'};">${TaxUtils.formatCurrency(newResult.finalTax)}</td>
                        <td style="text-align: right; padding: 12px 8px; color: ${betterRegime === 'old' ? 'var(--color-success)' : 'inherit'};">${TaxUtils.formatCurrency(oldResult.finalTax)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;">Effective Tax Rate</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatPercent(newResult.effectiveRate, 2)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatPercent(oldResult.effectiveRate, 2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- WHAT SAVED YOU MONEY - Dynamic based on better regime -->
        <div class="result-card" id="savingsCard" style="background: linear-gradient(to bottom right, #f0fff4, #e8f7f7); border: 2px solid var(--color-success);">
            <h3 class="result-title" style="color: var(--color-success); margin: 0 0 12px 0;">
                💚 What Saved You Money
            </h3>
            
            <!-- Regime Toggle Pills (side-by-side) -->
            <div class="regime-toggle-container" style="display: flex; gap: 8px; margin-bottom: 16px;">
                <div class="regime-pill ${betterRegime === 'new' ? 'regime-pill--active' : 'regime-pill--inactive'}" 
                     onclick="setDisplayedRegime('new')" data-regime="new" id="regimePillNew"
                     style="padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s;
                            ${betterRegime === 'new' ? 'background: #dcfce7; color: #166534; border: 2px solid #22c55e;' : 'background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; opacity: 0.7;'}">
                    New Regime ${betterRegime === 'new' ? '✓' : ''}
                </div>
                <div class="regime-pill ${betterRegime === 'old' ? 'regime-pill--active' : 'regime-pill--inactive'}" 
                     onclick="setDisplayedRegime('old')" data-regime="old" id="regimePillOld"
                     style="padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s;
                            ${betterRegime === 'old' ? 'background: #dcfce7; color: #166534; border: 2px solid #22c55e;' : 'background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; opacity: 0.7;'}">
                    Old Regime ${betterRegime === 'old' ? '✓' : ''}
                </div>
            </div>
            
            <p id="regimeDescription" style="color: var(--color-text-secondary); font-size: 13px; margin-bottom: 16px;">
                ${betterRegime === 'new' 
                    ? 'The New Regime has lower tax for you. It offers a higher standard deduction (₹75K) but no other deductions.'
                    : 'These deductions and exemptions reduced your taxable income, saving you tax at your marginal rate (~30%).'}
            </p>
            
            <!-- Savings breakdown container - will be updated by toggle -->
            <div id="savingsBreakdown">
                ${generateSavingsBreakdown(betterRegime === 'new' ? newResult : oldResult, betterRegime)}
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: var(--color-primary); color: white; border-radius: 6px; text-align: center;">
                <strong>Total Estimated Tax Saved in ${betterRegime === 'new' ? 'New' : 'Old'} Regime: ~${TaxUtils.formatCurrency(
                    (betterRegime === 'new' ? newResult : oldResult).log.filter(e => e.taxSaved).reduce((sum, e) => sum + (e.taxSaved || 0), 0)
                )}</strong>
            </div>
        </div>
        
        <!-- WHAT COULD SAVE MORE - Shows potential savings opportunities with regime toggle -->
        <div class="result-card" id="potentialCard" style="background: linear-gradient(to bottom right, #fffbeb, #fff7ed); border: 2px solid #f97316;">
            <h3 class="result-title" style="color: #ea580c; margin: 0 0 12px 0;">
                💡 What Could Save More Money
            </h3>
            
            <!-- Regime Toggle Pills for Potential Savings -->
            <div class="potential-regime-toggle" style="display: flex; gap: 8px; margin-bottom: 16px;">
                <div class="potential-pill" onclick="setPotentialRegime('${betterRegime}')" data-regime="${betterRegime}" id="potentialPillBetter"
                     style="padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s;
                            background: #dcfce7; color: #166534; border: 2px solid #22c55e;">
                    ${betterRegime === 'new' ? 'New' : 'Old'} Regime ✓ (Best)
                </div>
                <div class="potential-pill" onclick="setPotentialRegime('${betterRegime === 'new' ? 'old' : 'new'}')" data-regime="${betterRegime === 'new' ? 'old' : 'new'}" id="potentialPillOther"
                     style="padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s;
                            background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; opacity: 0.7;">
                    ${betterRegime === 'new' ? 'Old' : 'New'} Regime
                </div>
            </div>
            
            <div id="potentialContent" style="display: block;">
                ${generatePotentialSavings(betterRegime === 'new' ? newResult : oldResult, userData, betterRegime, betterRegime)}
            </div>
        </div>
        
        <!-- Detailed Log (collapsible) -->
        <div class="result-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="result-title" onclick="toggleLogSection()" style="cursor: pointer; margin: 0;">
                    📋 Detailed Calculation Log 
                    <span id="logToggle" style="font-size: 14px;">►</span>
                </h3>
            </div>
            <div id="logContent" class="log-section" style="display: none; max-height: 400px; overflow-y: auto;">
                
                <!-- Better Regime Log (shown by default) -->
                <div id="betterRegimeLog">
                    <h4 style="margin: 16px 0 8px; color: var(--color-success);">
                        ✅ ${betterRegime === 'new' ? 'New' : 'Old'} Regime Steps (RECOMMENDED):
                    </h4>
                    ${(betterRegime === 'new' ? newResult : oldResult).log.map(entry => `
                        <div class="log-entry">
                            <div class="section-name">${entry.section} - ${entry.item}</div>
                            <div class="amount">${TaxUtils.formatCurrency(entry.amount)}${entry.limit ? ` (Limit: ${TaxUtils.formatCurrency(entry.limit)})` : ''}</div>
                            <div class="explanation">${entry.explanation}</div>
                            ${entry.taxSaved ? `<span class="tax-saved">Tax Saved: ~${TaxUtils.formatCurrency(entry.taxSaved)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <!-- Other Regime Log (collapsible) -->
                <div style="margin-top: 16px; border-top: 2px solid var(--color-border); padding-top: 16px;">
                    <h4 onclick="toggleOtherRegimeLog()" style="cursor: pointer; color: var(--color-warning); display: flex; align-items: center; gap: 8px;">
                        <span id="otherRegimeToggle" style="font-size: 12px;">►</span>
                        ${betterRegime === 'new' ? 'Old' : 'New'} Regime Steps (Alternative):
                    </h4>
                    <div id="otherRegimeLogContent" style="display: none;">
                        ${(betterRegime === 'new' ? oldResult : newResult).log.map(entry => `
                            <div class="log-entry">
                                <div class="section-name">${entry.section} - ${entry.item}</div>
                                <div class="amount">${TaxUtils.formatCurrency(entry.amount)}${entry.limit ? ` (Limit: ${TaxUtils.formatCurrency(entry.limit)})` : ''}</div>
                                <div class="explanation">${entry.explanation}</div>
                                ${entry.taxSaved ? `<span class="tax-saved">Tax Saved: ~${TaxUtils.formatCurrency(entry.taxSaved)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to generate savings breakdown HTML
function generateSavingsBreakdown(result, regimeName) {
    const entries = result.log
        .filter(entry => entry.taxSaved && entry.taxSaved > 0)
        .sort((a, b) => {
            // Priority: wealth_building (GREEN) > expense_based (BLUE) > pure_donation (ORANGE) > neutral
            const priority = { wealth_building: 0, expense_based: 1, pure_donation: 2, neutral: 3 };
            const priorityDiff = (priority[a.deductionType] || 3) - (priority[b.deductionType] || 3);
            if (priorityDiff !== 0) return priorityDiff;
            return b.taxSaved - a.taxSaved; // Then by tax saved
        })
        .slice(0, 10);
    
    if (entries.length === 0) {
        if (regimeName === 'new') {
            return `<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">
                New Regime doesn't allow deductions beyond the ₹75,000 standard deduction. 
                Your lower tax is due to the simplified slab structure.
            </p>`;
        }
        return `<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">
            No deductions claimed. Add investments (80C, NPS) or health insurance (80D) to save tax!
        </p>`;
    }
    
    // Helper to get color scheme based on deduction type
    // GREEN = Wealth Building, BLUE = Expense-Based, ORANGE = Donation
    const getTypeStyles = (type) => {
        switch(type) {
            case 'wealth_building':  // GREEN - investments that grow your wealth
                return { border: '#22c55e', bg: '#dcfce7', icon: '💰', label: 'Builds wealth' };
            case 'expense_based':    // BLUE - expenses you'd pay anyway
                return { border: '#3b82f6', bg: '#dbeafe', icon: '🏠', label: 'Expense-based saving' };
            case 'pure_donation':    // ORANGE - money given away
                return { border: '#f97316', bg: '#ffedd5', icon: '🎁', label: 'Donation benefit' };
            default:
                return { border: '#6b7280', bg: '#f3f4f6', icon: '📋', label: '' };
        }
    };
    
    return `<div style="display: flex; flex-direction: column; gap: 12px;">
        ${entries.map(entry => {
            const styles = getTypeStyles(entry.deductionType);
            return `
            <div style="background: ${styles.bg}; padding: 12px; border-radius: 6px; border-left: 4px solid ${styles.border};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--color-text-primary);">${styles.icon} ${entry.item}</strong>
                    <span style="color: ${styles.border}; font-weight: 600;">~${TaxUtils.formatCurrency(entry.taxSaved)} saved</span>
                </div>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 6px;">
                    <strong>Amount claimed:</strong> ${TaxUtils.formatCurrency(entry.amount)}${entry.limit ? ` (Limit: ${TaxUtils.formatCurrency(entry.limit)})` : ''}
                </div>
                ${styles.label ? `<div style="font-size: 11px; color: ${styles.border}; margin-top: 4px; font-style: italic;">
                    💡 ${styles.label}
                </div>` : ''}
            </div>
        `}).join('')}
    </div>`;
}

// Generate "What Could Save More" suggestions based on unexhausted limits
// displayedRegime = which regime's potential savings to show
function generatePotentialSavings(result, userData, betterRegime, displayedRegime = null) {
    const suggestions = [];
    const marginalRate = 0.30; // Assume 30% marginal tax rate
    const regimeToShow = displayedRegime || betterRegime;
    
    // Use the appropriate result based on displayed regime
    const regimeResult = regimeToShow === 'new' ? lastNewResult : lastOldResult;
    if (!regimeResult) return '<p style="color: var(--color-text-secondary);">Calculate tax first to see suggestions.</p>';
    
    // Complete list of all deduction sections
    const potentialDeductions = [
        // GREEN - Wealth Building (show amounts)
        {
            section: 'Section 80C',
            limit: 150000,
            used: regimeResult.deductions?.section80C || 0,
            type: 'wealth_building',
            suggestion: 'Invest in PPF, ELSS, EPF, LIC, or NPS',
            applicableRegime: 'old'
        },
        {
            section: '80CCD(1B) - Extra NPS',
            limit: 50000,
            used: regimeResult.deductions?.section80CCD1B || 0,
            type: 'wealth_building',
            suggestion: 'Additional NPS contribution beyond 80C',
            applicableRegime: 'old'
        },
        {
            section: '80CCD(2) - Employer NPS',
            limit: null, // % of salary
            used: regimeResult.deductions?.section80CCD2 || regimeResult.deductions?.employerNPS || 0,
            type: 'wealth_building',
            suggestion: 'Ask employer to contribute to NPS (up to 14% of salary)',
            applicableRegime: 'both',
            showIfZero: true
        },
        
        // BLUE - Expense Based (show amounts)
        {
            section: 'Section 80D - Health Insurance',
            limit: 75000, // Self 25K + Parents 50K if senior
            used: regimeResult.deductions?.section80D || 0,
            type: 'expense_based',
            suggestion: 'Health insurance for self & parents',
            applicableRegime: 'old'
        },
        {
            section: 'HRA Exemption',
            limit: null,
            used: regimeResult.exemptions?.hraExemption || 0,
            type: 'expense_based',
            suggestion: 'Submit rent receipts if paying rent',
            applicableRegime: 'old',
            showIfZero: (userData.rentPayments?.length > 0 || userData.hraReceived > 0)
        },
        {
            section: '24(b) - Home Loan Interest',
            limit: 200000,
            used: regimeResult.deductions?.section24b || 0,
            type: 'expense_based',
            suggestion: 'Home loan interest for self-occupied property',
            applicableRegime: 'old'
        },
        {
            section: '80E - Education Loan',
            limit: null, // No limit
            used: regimeResult.deductions?.section80E || 0,
            type: 'expense_based',
            suggestion: 'Interest on education loan (no limit!)',
            applicableRegime: 'old',
            showIfZero: false
        },
        {
            section: '80EEB - EV Loan Interest',
            limit: 150000,
            used: regimeResult.deductions?.section80EEB || 0,
            type: 'expense_based',
            suggestion: 'Electric vehicle loan interest',
            applicableRegime: 'old'
        },
        {
            section: '80DD - Dependent Disability',
            limit: 125000, // Severe
            used: regimeResult.deductions?.section80DD || 0,
            type: 'expense_based',
            suggestion: 'Care for dependent with disability',
            applicableRegime: 'old',
            showIfZero: false
        },
        {
            section: '80U - Self Disability',
            limit: 125000,
            used: regimeResult.deductions?.section80U || 0,
            type: 'expense_based',
            suggestion: 'Claim if you have certified disability',
            applicableRegime: 'old',
            showIfZero: false
        },
        
        // ORANGE - Donation (just suggest, no amounts)
        {
            section: '80G - Charitable Donations',
            limit: null,
            used: regimeResult.deductions?.section80G || 0,
            type: 'pure_donation',
            suggestion: 'Consider donating to approved charities',
            applicableRegime: 'old',
            showIfZero: true,
            noAmountSuggestion: true
        },
        {
            section: '80GGC - Political Donations',
            limit: null,
            used: regimeResult.deductions?.section80GGC || 0,
            type: 'pure_donation',
            suggestion: 'Consider supporting political parties (non-cash)',
            applicableRegime: 'old',
            showIfZero: true,
            noAmountSuggestion: true
        },
        {
            section: '80GGA - Research Donations',
            limit: null,
            used: regimeResult.deductions?.section80GGA || 0,
            type: 'pure_donation',
            suggestion: 'Consider scientific research donations',
            applicableRegime: 'old',
            showIfZero: true,
            noAmountSuggestion: true
        }
    ];
    
    // Filter and process deductions
    for (const deduction of potentialDeductions) {
        // Skip if not applicable for displayed regime
        if (deduction.applicableRegime === 'old' && regimeToShow === 'new') continue;
        
        const remaining = deduction.limit ? deduction.limit - deduction.used : 0;
        
        // For items with limits - show if not fully utilized
        if (deduction.limit && remaining > 5000) {
            const potentialSavings = remaining * marginalRate;
            suggestions.push({
                ...deduction,
                remaining,
                potentialSavings,
                priority: deduction.type === 'wealth_building' ? 0 : (deduction.type === 'expense_based' ? 1 : 2)
            });
        } 
        // For items without limit - show if zero and showIfZero is true
        else if (!deduction.limit && deduction.used === 0 && deduction.showIfZero) {
            suggestions.push({
                ...deduction,
                remaining: 0,
                potentialSavings: 0,
                isUnused: true,
                priority: deduction.type === 'wealth_building' ? 0 : (deduction.type === 'expense_based' ? 1 : 2)
            });
        }
    }
    
    // Sort by priority (GREEN first, then BLUE, then ORANGE)
    suggestions.sort((a, b) => a.priority - b.priority);
    
    // Generate HTML
    if (suggestions.length === 0) {
        if (regimeToShow === 'new') {
            return `<p style="text-align: center; color: var(--color-text-secondary); padding: 12px;">
                🎉 <strong>New Regime doesn't have many deductions.</strong> Only Standard Deduction (₹75K) and Employer NPS.
            </p>`;
        }
        return `<p style="text-align: center; color: var(--color-text-secondary); padding: 12px;">
            ✅ Great job! You've maximized your available deductions.
        </p>`;
    }
    
    const getTypeStyles = (type) => {
        switch(type) {
            case 'wealth_building': return { border: '#22c55e', bg: '#dcfce7', icon: '💰' };
            case 'expense_based': return { border: '#3b82f6', bg: '#dbeafe', icon: '🏠' };
            case 'pure_donation': return { border: '#f97316', bg: '#ffedd5', icon: '🎁' };
            default: return { border: '#6b7280', bg: '#f3f4f6', icon: '📋' };
        }
    };
    
    return `<div style="display: flex; flex-direction: column; gap: 10px;">
        ${suggestions.slice(0, 8).map(s => {
            const styles = getTypeStyles(s.type);
            return `
            <div style="background: ${styles.bg}; padding: 10px 12px; border-radius: 6px; border-left: 4px solid ${styles.border};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--color-text-primary);">${styles.icon} ${s.section}</strong>
                    ${s.remaining > 0 && !s.noAmountSuggestion ? `<span style="color: ${styles.border}; font-weight: 600; font-size: 13px;">
                        ~${TaxUtils.formatCurrency(s.potentialSavings)} potential
                    </span>` : ''}
                </div>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                    ${s.noAmountSuggestion 
                        ? `💡 ${s.suggestion}`
                        : (s.isUnused 
                            ? `⚠️ Not claimed - ${s.suggestion}` 
                            : `Add ${TaxUtils.formatCurrency(s.remaining)} more → ${s.suggestion}`)}
                </div>
            </div>
        `}).join('')}
    </div>`;
}

// Set displayed regime for "What Could Save More" section
function setPotentialRegime(regime) {
    if (!lastNewResult || !lastOldResult || !lastUserData) return;
    
    const betterRegime = lastNewResult.finalTax <= lastOldResult.finalTax ? 'new' : 'old';
    const result = regime === 'new' ? lastNewResult : lastOldResult;
    
    // Update potential savings content
    document.getElementById('potentialContent').innerHTML = generatePotentialSavings(result, lastUserData, betterRegime, regime);
    
    // Update pill styles
    const betterPill = document.getElementById('potentialPillBetter');
    const otherPill = document.getElementById('potentialPillOther');
    
    if (betterPill && otherPill) {
        const activeStyle = 'background: #dcfce7; color: #166534; border: 2px solid #22c55e; opacity: 1;';
        const inactiveStyle = 'background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; opacity: 0.7;';
        const baseStyle = 'padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s; ';
        
        if (regime === betterRegime) {
            betterPill.style.cssText = baseStyle + activeStyle;
            otherPill.style.cssText = baseStyle + inactiveStyle;
            betterPill.innerHTML = `${betterRegime === 'new' ? 'New' : 'Old'} Regime ✓ (Best)`;
            otherPill.innerHTML = `${betterRegime === 'new' ? 'Old' : 'New'} Regime`;
        } else {
            betterPill.style.cssText = baseStyle + inactiveStyle;
            otherPill.style.cssText = baseStyle + activeStyle;
            betterPill.innerHTML = `${betterRegime === 'new' ? 'New' : 'Old'} Regime (Best)`;
            otherPill.innerHTML = `${betterRegime === 'new' ? 'Old' : 'New'} Regime ✓`;
        }
    }
}

// Set displayed regime based on pill click (for "What Saved You Money" section)
function setDisplayedRegime(regime) {
    if (!lastNewResult || !lastOldResult) return;
    
    const betterRegime = lastNewResult.finalTax <= lastOldResult.finalTax ? 'new' : 'old';
    const result = regime === 'new' ? lastNewResult : lastOldResult;
    
    // Update savings breakdown content
    document.getElementById('savingsBreakdown').innerHTML = generateSavingsBreakdown(result, regime);
    
    // Update description based on selected regime
    const descEl = document.getElementById('regimeDescription');
    if (descEl) {
        descEl.textContent = regime === 'new' 
            ? 'The New Regime has lower tax for you. It offers a higher standard deduction (₹75K) but no other deductions.'
            : 'These deductions and exemptions reduced your taxable income, saving you tax at your marginal rate (~30%).';
    }
    
    // Update pill styles
    const newPill = document.getElementById('regimePillNew');
    const oldPill = document.getElementById('regimePillOld');
    
    if (newPill && oldPill) {
        // Active pill (selected one) - green with checkmark
        const activeStyle = 'background: #dcfce7; color: #166534; border: 2px solid #22c55e; opacity: 1;';
        // Inactive pill - muted red
        const inactiveStyle = 'background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; opacity: 0.7;';
        
        if (regime === 'new') {
            newPill.style.cssText = 'padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s; ' + activeStyle;
            oldPill.style.cssText = 'padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s; ' + inactiveStyle;
            newPill.innerHTML = 'New Regime ✓';
            oldPill.innerHTML = 'Old Regime';
        } else {
            newPill.style.cssText = 'padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s; ' + inactiveStyle;
            oldPill.style.cssText = 'padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1; text-align: center; transition: all 0.2s; ' + activeStyle;
            newPill.innerHTML = 'New Regime';
            oldPill.innerHTML = 'Old Regime ✓';
        }
    }
}

// Toggle other regime log visibility
function toggleOtherRegimeLog() {
    const content = document.getElementById('otherRegimeLogContent');
    const toggle = document.getElementById('otherRegimeToggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '►';
    }
}

// generateSingleRegimeReport removed - always use comparison mode

function toggleLogSection() {
    const content = document.getElementById('logContent');
    const toggle = document.getElementById('logToggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
    }
}

// ============================================
// BREAKDOWN MODAL FUNCTIONS
// ============================================
function openBreakdownModal() {
    if (!lastNewResult || !lastOldResult) {
        alert('Please calculate tax first!');
        return;
    }
    
    const modal = document.getElementById('breakdownModal');
    const content = document.getElementById('modalBreakdownContent');
    
    content.innerHTML = generateDetailedModalComparison(lastNewResult, lastOldResult, lastUserData);
    modal.classList.add('show');
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeBreakdownModal(event) {
    // Only close if clicking the backdrop or close button
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('breakdownModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBreakdownModal();
    }
});

function generateDetailedModalComparison(newResult, oldResult, userData) {
    const betterRegime = newResult.finalTax <= oldResult.finalTax ? 'new' : 'old';
    const savings = Math.abs(newResult.finalTax - oldResult.finalTax);
    
    // Helper to determine which value is better (lower = better for tax, higher = better for deductions)
    const getBetterClass = (newVal, oldVal, higherIsBetter = true) => {
        if (newVal === oldVal || (newVal === 0 && oldVal === 0)) return '';
        if (higherIsBetter) {
            return newVal > oldVal ? 'better-value' : '';
        } else {
            return newVal < oldVal ? 'better-value' : '';
        }
    };
    
    return `
        <h2 style="text-align: center; margin-bottom: 24px; color: var(--color-primary);">
            📊 Detailed Tax Comparison - FY 2025-26
        </h2>
        
        ${savings > 0 ? `
        <div class="savings-banner" style="margin-bottom: 24px;">
            <div class="label">💰 YOU SAVE BY CHOOSING ${betterRegime.toUpperCase()} REGIME</div>
            <div class="amount">${TaxUtils.formatCurrency(savings)}</div>
        </div>
        ` : ''}
        
        <div class="modal-comparison-grid">
            <!-- NEW REGIME COLUMN -->
            <div class="modal-regime-column ${betterRegime === 'new' ? 'better' : ''}">
                <div class="modal-regime-header">
                    <h3>🆕 New Regime</h3>
                    <div class="modal-tax-amount">${TaxUtils.formatCurrency(newResult.finalTax)}</div>
                    ${betterRegime === 'new' ? '<span class="better-tag" style="margin-top: 8px;">✓ Recommended</span>' : ''}
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-primary);">Income</h4>
                <div class="modal-item">
                    <span>Gross Salary</span>
                    <span class="value">${TaxUtils.formatCurrency(userData.grossSalary)}</span>
                </div>
                <div class="modal-item">
                    <span>Other Income</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.grossIncome.total - userData.grossSalary)}</span>
                </div>
                <div class="modal-item" style="font-weight: 600;">
                    <span>Gross Total</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.grossIncome.total)}</span>
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-success);">Deductions</h4>
                <div class="modal-item ${getBetterClass(75000, 50000)}">
                    <span>Standard Deduction</span>
                    <span class="value">₹75,000</span>
                </div>
                <div class="modal-item">
                    <span>Employer NPS (80CCD2)</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.deductions.employerNPS || 0)}</span>
                </div>
                <div class="modal-item" style="font-weight: 600; border-top: 2px solid var(--color-border);">
                    <span>Total Deductions</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.deductions.total)}</span>
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-warning);">Tax Calculation</h4>
                <div class="modal-item ${getBetterClass(newResult.taxableIncome, oldResult.taxableIncome, false)}">
                    <span>Taxable Income</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.taxableIncome)}</span>
                </div>
                <div class="modal-item">
                    <span>Tax on Slabs</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.slabTax.tax)}</span>
                </div>
                ${newResult.rebate.amount > 0 ? `
                <div class="modal-item" style="color: var(--color-success);">
                    <span>(-) Section 87A Rebate</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.rebate.amount)}</span>
                </div>
                ` : ''}
                ${newResult.surcharge.amount > 0 ? `
                <div class="modal-item">
                    <span>(+) Surcharge</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.surcharge.amount)}</span>
                </div>
                ` : ''}
                <div class="modal-item">
                    <span>(+) Health & Ed. Cess (4%)</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.cess.amount)}</span>
                </div>
                ${newResult.capitalGainsTax.total > 0 ? `
                <div class="modal-item">
                    <span>(+) Capital Gains Tax</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.capitalGainsTax.total)}</span>
                </div>
                ` : ''}
                <div class="modal-item ${getBetterClass(newResult.finalTax, oldResult.finalTax, false)}" style="font-weight: 700; font-size: 15px; border-top: 2px solid var(--color-primary); padding-top: 12px;">
                    <span>FINAL TAX</span>
                    <span class="value">${TaxUtils.formatCurrency(newResult.finalTax)}</span>
                </div>
                <div class="modal-item">
                    <span>Effective Rate</span>
                    <span class="value">${TaxUtils.formatPercent(newResult.effectiveRate, 2)}</span>
                </div>
            </div>
            
            <!-- OLD REGIME COLUMN -->
            <div class="modal-regime-column ${betterRegime === 'old' ? 'better' : ''}">
                <div class="modal-regime-header">
                    <h3>📜 Old Regime</h3>
                    <div class="modal-tax-amount">${TaxUtils.formatCurrency(oldResult.finalTax)}</div>
                    ${betterRegime === 'old' ? '<span class="better-tag" style="margin-top: 8px;">✓ Recommended</span>' : ''}
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-primary);">Income</h4>
                <div class="modal-item">
                    <span>Gross Salary</span>
                    <span class="value">${TaxUtils.formatCurrency(userData.grossSalary)}</span>
                </div>
                <div class="modal-item">
                    <span>Other Income</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.grossIncome.total - userData.grossSalary)}</span>
                </div>
                <div class="modal-item" style="font-weight: 600;">
                    <span>Gross Total</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.grossIncome.total)}</span>
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-success);">Deductions & Exemptions</h4>
                <div class="modal-item">
                    <span>Standard Deduction</span>
                    <span class="value">₹50,000</span>
                </div>
                ${oldResult.deductions.section80C > 0 ? `
                <div class="modal-item ${getBetterClass(oldResult.deductions.section80C, 0)}">
                    <span>Section 80C</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.section80C)}</span>
                </div>
                ` : ''}
                ${oldResult.deductions.section80CCD1B > 0 ? `
                <div class="modal-item ${getBetterClass(oldResult.deductions.section80CCD1B, 0)}">
                    <span>80CCD(1B) - Extra NPS</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.section80CCD1B)}</span>
                </div>
                ` : ''}
                ${oldResult.deductions.section80CCD2 > 0 ? `
                <div class="modal-item">
                    <span>80CCD(2) - Employer NPS</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.section80CCD2)}</span>
                </div>
                ` : ''}
                ${oldResult.deductions.section80D > 0 ? `
                <div class="modal-item ${getBetterClass(oldResult.deductions.section80D, 0)}">
                    <span>80D - Health Insurance</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.section80D)}</span>
                </div>
                ` : ''}
                ${oldResult.deductions.section24b > 0 ? `
                <div class="modal-item ${getBetterClass(oldResult.deductions.section24b, 0)}">
                    <span>Section 24(b) - Home Loan</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.section24b)}</span>
                </div>
                ` : ''}
                ${oldResult.exemptions.hraExemption > 0 ? `
                <div class="modal-item ${getBetterClass(oldResult.exemptions.hraExemption, 0)}">
                    <span>HRA Exemption</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.exemptions.hraExemption)}</span>
                </div>
                ` : ''}
                <div class="modal-item ${getBetterClass(oldResult.deductions.total + oldResult.exemptions.total, newResult.deductions.total)}" style="font-weight: 600; border-top: 2px solid var(--color-border);">
                    <span>Total Deductions</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.deductions.total + oldResult.exemptions.total)}</span>
                </div>
                
                <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--color-warning);">Tax Calculation</h4>
                <div class="modal-item ${getBetterClass(oldResult.taxableIncome, newResult.taxableIncome, false)}">
                    <span>Taxable Income</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.taxableIncome)}</span>
                </div>
                <div class="modal-item">
                    <span>Tax on Slabs</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.slabTax.tax)}</span>
                </div>
                ${oldResult.rebate.amount > 0 ? `
                <div class="modal-item" style="color: var(--color-success);">
                    <span>(-) Section 87A Rebate</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.rebate.amount)}</span>
                </div>
                ` : ''}
                ${oldResult.surcharge.amount > 0 ? `
                <div class="modal-item">
                    <span>(+) Surcharge</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.surcharge.amount)}</span>
                </div>
                ` : ''}
                <div class="modal-item">
                    <span>(+) Health & Ed. Cess (4%)</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.cess.amount)}</span>
                </div>
                ${oldResult.capitalGainsTax.total > 0 ? `
                <div class="modal-item">
                    <span>(+) Capital Gains Tax</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.capitalGainsTax.total)}</span>
                </div>
                ` : ''}
                <div class="modal-item ${getBetterClass(oldResult.finalTax, newResult.finalTax, false)}" style="font-weight: 700; font-size: 15px; border-top: 2px solid var(--color-primary); padding-top: 12px;">
                    <span>FINAL TAX</span>
                    <span class="value">${TaxUtils.formatCurrency(oldResult.finalTax)}</span>
                </div>
                <div class="modal-item">
                    <span>Effective Rate</span>
                    <span class="value">${TaxUtils.formatPercent(oldResult.effectiveRate, 2)}</span>
                </div>
            </div>
        </div>
        
        <!-- Tax Savings Summary -->
        <div style="margin-top: 24px; padding: 16px; background: var(--color-success-bg); border: 2px solid var(--color-success); border-radius: 8px; text-align: center;">
            <h3 style="color: var(--color-success); margin-bottom: 8px;">💚 Key Deductions Saving Tax in Old Regime</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px;">
                ${oldResult.log
                    .filter(entry => entry.taxSaved && entry.taxSaved > 0)
                    .sort((a, b) => b.taxSaved - a.taxSaved)
                    .slice(0, 5)
                    .map(entry => `
                        <span style="background: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; border: 1px solid var(--color-success);">
                            ${entry.item}: <strong>~${TaxUtils.formatCurrency(entry.taxSaved)}</strong>
                        </span>
                    `).join('')}
            </div>
        </div>
    `;
}

// Expose modal functions globally
window.openBreakdownModal = openBreakdownModal;
window.closeBreakdownModal = closeBreakdownModal;

// Expose toggle functions globally
window.toggleLogSection = toggleLogSection;
window.setDisplayedRegime = setDisplayedRegime;
window.toggleOtherRegimeLog = toggleOtherRegimeLog;
window.setPotentialRegime = setPotentialRegime;
window.generateSavingsBreakdown = generateSavingsBreakdown;

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error:', msg, 'at', url, lineNo, columnNo);
    return false;
};
