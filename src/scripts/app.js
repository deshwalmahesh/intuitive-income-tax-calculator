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
    
    console.log(`[App] Created employment period from extraction: ${extractedData.employerName || 'Unknown'}`);
    
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
    // Helper to safely populate a field
    const setField = (id, value) => {
        if (value && value > 0) {
            const input = document.getElementById(id);
            if (input) input.value = value;
        }
    };

    // === PROFESSIONAL TAX (capped at 2500) ===
    if (aggregatedData.totalProfessionalTax) {
        const ptValue = Math.min(aggregatedData.totalProfessionalTax, 2500);
        setField('professionalTax', ptValue);
    }
    
    // === HEALTH INSURANCE (80D) ===
    setField('healthInsuranceSelf', aggregatedData.totalHealthInsuranceSelf);
    setField('healthInsuranceParents', aggregatedData.totalHealthInsuranceParents);

    // === EDUCATION LOAN INTEREST (80E) - Unlimited ===
    setField('educationLoanInterest', aggregatedData.totalEducationLoanInterest);

    // === HOME LOAN (Section 24b + 80C Principal) ===
    setField('homeLoanInterest', aggregatedData.totalHomeLoanInterest);
    // Home loan principal goes into 80C - handled separately if UI supports
    
    // === LEGACY HOME LOAN (80EE / 80EEA / 80EEB) ===
    setField('section80EEInterest', aggregatedData.totalSection80EEInterest);
    setField('section80EEAInterest', aggregatedData.totalSection80EEAInterest);
    setField('section80EEBInterest', aggregatedData.totalSection80EEBInterest);

    // === SECTION 89 RELIEF ===
    setField('section89Relief', aggregatedData.totalSection89Relief);

    // === AGNIVEER CORPUS (80CCH) ===
    setField('agniveerContribution', aggregatedData.totalAgniveerContribution);

    // === EMPLOYER NPS (80CCD(2)) ===
    if (aggregatedData.totalEmployerNPS && aggregatedData.totalEmployerNPS > 0) {
        const npsInput = document.getElementById('employerNPSContribution');
        // Fallback if not already set by per-job logic
        if (npsInput && (!npsInput.value || npsInput.value == 0)) {
            npsInput.value = aggregatedData.totalEmployerNPS;
        }
    }

    // === EMPLOYEE NPS (80CCD(1)) - Part of 80C ===
    setField('employeeNPSContribution', aggregatedData.totalEmployeeNPS);

    // === DONATIONS (80G) ===
    setField('donations80G', aggregatedData.totalDonations80G);

    // === RETIREMENT BENEFITS ===
    setField('gratuityReceived', aggregatedData.totalGratuity);
    setField('leaveEncashmentReceived', aggregatedData.totalLeaveEncashment);
    setField('vrsCompensation', aggregatedData.totalVRSCompensation);
    setField('retrenchmentCompensation', aggregatedData.totalRetrenchmentCompensation);
    setField('commutedPension', aggregatedData.totalCommutedPension);

    // === OTHER INCOME ===
    setField('otherIncomeFromEmployer', aggregatedData.totalOtherIncomeFromEmployer);
    setField('giftsFromNonRelatives', aggregatedData.totalGiftsFromNonRelatives);

    // === 26AS SPECIFIC FIELDS ===
    setField('tcsCollected', aggregatedData.totalTCS);
    setField('advanceTaxPaid', aggregatedData.totalAdvanceTax);
    setField('selfAssessmentTaxPaid', aggregatedData.totalSelfAssessmentTax);
    // Refund is info only, typically not input

    // === 80C DEDUCTIONS (Special Handling) ===
    if (aggregatedData.totalSection80CDeductions && aggregatedData.totalSection80CDeductions > 0) {
        // Ensure at least one investment row exists
        if (window.investments80C.length === 0) {
            addInvestment80C();
        }
        
        // Use the first investment row to show the extracted bulk 80C amount
        if (window.investments80C.length > 0) {
            const entry = window.investments80C[0];
            const amountInput = document.getElementById(`${entry.id}_amount`);
            
            if (amountInput) {
                amountInput.value = aggregatedData.totalSection80CDeductions;
                amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                amountInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
    
    console.log('[App] Populated global fields from extraction:', aggregatedData);
    
    // Trigger calculation update
    if (typeof debounceCalculate === 'function') debounceCalculate();
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
    const totalLTA = processedPeriods.reduce((sum, p) => sum + (p.ltaReceived || 0), 0);
    const totalTelephoneReimb = processedPeriods.reduce((sum, p) => sum + (p.telephoneReimb || 0), 0);
    const totalBooksReimb = processedPeriods.reduce((sum, p) => sum + (p.booksReimb || 0), 0);
    const totalConveyanceAllowance = processedPeriods.reduce((sum, p) => sum + (p.conveyanceAllowance || 0), 0);
    const totalDriverAllowance = processedPeriods.reduce((sum, p) => sum + (p.driverAllowance || 0), 0);
    
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
        ltaReceived: totalLTA,
        telephoneReimb: totalTelephoneReimb,
        booksReimb: totalBooksReimb,
        conveyanceAllowance: totalConveyanceAllowance,
        driverAllowance: totalDriverAllowance,
        
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
        
        <!-- Income Breakdown -->
        <div class="result-card">
            <h3 class="result-title">💵 Income Breakdown</h3>
            <div class="breakdown-item">
                <span>Gross Salary</span>
                <span>${TaxUtils.formatCurrency(userData.grossSalary)}</span>
            </div>
            ${userData.savingsInterest > 0 ? `
            <div class="breakdown-item">
                <span>+ Savings Interest</span>
                <span>${TaxUtils.formatCurrency(userData.savingsInterest)}</span>
            </div>` : ''}
            ${userData.fdInterest > 0 ? `
            <div class="breakdown-item">
                <span>+ FD Interest</span>
                <span>${TaxUtils.formatCurrency(userData.fdInterest)}</span>
            </div>` : ''}
            ${userData.dividendIncome > 0 ? `
            <div class="breakdown-item">
                <span>+ Dividend Income</span>
                <span>${TaxUtils.formatCurrency(userData.dividendIncome)}</span>
            </div>` : ''}
            ${userData.rentalIncome > 0 ? `
            <div class="breakdown-item">
                <span>+ Rental Income (Net)</span>
                <span>${TaxUtils.formatCurrency(userData.rentalIncome * 0.7)}</span>
            </div>` : ''}
            ${userData.agriculturalIncome > 0 ? `
            <div class="breakdown-item" style="background: var(--color-success-bg); padding: 8px; border-radius: 4px;">
                <span style="color: var(--color-success);">🌾 Agricultural (100% TAX-FREE)</span>
                <span style="color: var(--color-success);">${TaxUtils.formatCurrency(userData.agriculturalIncome)}</span>
            </div>` : ''}
            <div class="breakdown-item breakdown-item--total">
                <span>Gross Total Income</span>
                <span>${TaxUtils.formatCurrency(newResult.grossIncome.total)}</span>
            </div>
        </div>
        
        <!-- Deductions Comparison -->
        <div class="result-card">
            <h3 class="result-title">📝 Deductions Comparison</h3>
            <table style="width: 100%; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="text-align: left; padding: 8px;">Item</th>
                        <th style="text-align: right; padding: 8px;">New</th>
                        <th style="text-align: right; padding: 8px;">Old</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px;">Standard Deduction</td>
                        <td style="text-align: right; padding: 8px;">₹75,000</td>
                        <td style="text-align: right; padding: 8px;">₹50,000</td>
                    </tr>
                    ${oldResult.exemptions.hraExemption > 0 ? `
                    <tr style="background: #fef3c7;">
                        <td style="padding: 8px;">🏠 HRA Exemption (Sec 10(13A))</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px; color: #b45309; font-weight: 600;">${TaxUtils.formatCurrency(oldResult.exemptions.hraExemption)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80C > 0 ? `
                    <tr>
                        <td style="padding: 8px;">Section 80C</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80C)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80CCD1B > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80CCD(1B) - Extra NPS</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80CCD1B)}</td>
                    </tr>` : ''}
                    ${newResult.deductions.employerNPS > 0 || oldResult.deductions.section80CCD2 > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80CCD(2) - Employer NPS</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(newResult.deductions.employerNPS || 0)}</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80CCD2 || 0)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80D > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80D - Health Insurance</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80D)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section24b > 0 ? `
                    <tr>
                        <td style="padding: 8px;">Section 24(b) - Home Loan Interest</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section24b)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80E > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80E - Education Loan</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80E)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80EE > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80EE - Home Loan (Legacy)</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80EE)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80EEA > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80EEA - Affordable Housing</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80EEA)}</td>
                    </tr>` : ''}
                    ${oldResult.deductions.section80EEB > 0 ? `
                    <tr>
                        <td style="padding: 8px;">80EEB - EV Loan Interest</td>
                        <td style="text-align: right; padding: 8px; color: var(--color-text-muted);">-</td>
                        <td style="text-align: right; padding: 8px;">${TaxUtils.formatCurrency(oldResult.deductions.section80EEB)}</td>
                    </tr>` : ''}
                    <tr style="border-top: 2px solid var(--color-primary); font-weight: bold;">
                        <td style="padding: 12px 8px;">Total Deductions</td>
                        <td style="text-align: right; padding: 12px 8px;">${TaxUtils.formatCurrency(newResult.deductions.total)}</td>
                        <td style="text-align: right; padding: 12px 8px;">${TaxUtils.formatCurrency(oldResult.deductions.total + oldResult.exemptions.total)}</td>
                    </tr>
                </tbody>
            </table>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 class="result-title" style="color: var(--color-success); margin: 0;">
                    💚 What Saved You Money (<span id="displayedRegimeName">${betterRegime === 'new' ? 'New' : 'Old'}</span> Regime)
                </h3>
                <button id="toggleRegimeBtn" onclick="toggleDisplayedRegime()" style="
                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    🔄 View ${betterRegime === 'new' ? 'Old' : 'New'} Regime
                </button>
            </div>
            <p style="color: var(--color-text-secondary); font-size: 13px; margin-bottom: 16px;">
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
        
        <!-- Detailed Log - Shows better regime by default, toggle for other -->
        <div class="result-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="result-title" onclick="toggleLogSection()" style="cursor: pointer; margin: 0;">
                    📋 Detailed Calculation Log 
                    <span id="logToggle" style="font-size: 14px;">▼</span>
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
        .sort((a, b) => b.taxSaved - a.taxSaved)
        .slice(0, 8);
    
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
    const getTypeStyles = (type) => {
        switch(type) {
            case 'investment':  // Green - you keep/grow this money
                return { border: '#22c55e', bg: '#dcfce7', icon: '💰' };
            case 'expense':     // Orange - you spent this money
                return { border: '#f59e0b', bg: '#fef3c7', icon: '📤' };
            case 'exemption':   // Blue - automatic benefit
                return { border: '#3b82f6', bg: '#dbeafe', icon: '🎁' };
            default:
                return { border: 'var(--color-success)', bg: 'white', icon: '✓' };
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
                <div style="font-size: 12px; color: #374151; margin-top: 4px;">
                    ${entry.deductionType === 'investment' ? '💡 <em>This builds your wealth!</em>' : 
                      entry.deductionType === 'expense' ? '💡 <em>Expense that reduces taxable income</em>' :
                      entry.deductionType === 'exemption' ? '💡 <em>Automatic tax benefit</em>' : ''}
                </div>
            </div>
        `}).join('')}
    </div>`;
}

// Toggle to show OTHER regime's savings (swap view)
function toggleDisplayedRegime() {
    if (!lastNewResult || !lastOldResult) return;
    
    const currentRegime = document.getElementById('displayedRegimeName').textContent;
    const betterRegime = lastNewResult.finalTax <= lastOldResult.finalTax ? 'new' : 'old';
    
    // Determine which regime to show
    const showingBetter = (currentRegime === 'New' && betterRegime === 'new') || 
                          (currentRegime === 'Old' && betterRegime === 'old');
    const newRegimeToShow = showingBetter ? (betterRegime === 'new' ? 'old' : 'new') : betterRegime;
    const result = newRegimeToShow === 'new' ? lastNewResult : lastOldResult;
    
    // Update display
    document.getElementById('displayedRegimeName').textContent = newRegimeToShow === 'new' ? 'New' : 'Old';
    document.getElementById('savingsBreakdown').innerHTML = generateSavingsBreakdown(result, newRegimeToShow);
    document.getElementById('toggleRegimeBtn').innerHTML = `🔄 View ${newRegimeToShow === 'new' ? 'Old' : 'New'} Regime`;
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
window.toggleDisplayedRegime = toggleDisplayedRegime;
window.toggleOtherRegimeLog = toggleOtherRegimeLog;
window.generateSavingsBreakdown = generateSavingsBreakdown;

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error:', msg, 'at', url, lineNo, columnNo);
    return false;
};
