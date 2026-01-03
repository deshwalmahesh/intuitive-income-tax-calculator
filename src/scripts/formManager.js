/**
 * FORM MANAGER MODULE
 * Handles dynamic form management for Employment Periods, Investments, and Donations
 * Extracted from app.js for maintainability
 */

// State arrays (shared with app.js via window object)
let employmentPeriods = [];
let investments80C = [];
let donations = [];

// Counters for unique IDs (needed by add functions)
let employmentPeriodCounter = 0;
let investment80CCounter = 0;
let donationCounter = 0;

/**
 * Add a new employment period (job)
 * Each period has: dates, salary, basic, HRA, EPF, employer NPS
 */
function addEmploymentPeriod() {
    const container = document.getElementById('employmentPeriodsContainer');
    const id = `emp_${employmentPeriodCounter++}`;
    
    // Default to full FY if first period
    const isFirstPeriod = employmentPeriods.length === 0;
    
    const entry = {
        id,
        name: `Job ${employmentPeriods.length + 1}`,
        startMonth: isFirstPeriod ? 4 : 4,   // April (FY start)
        startYear: 2025,
        endMonth: isFirstPeriod ? 3 : 3,     // March (FY end)
        endYear: isFirstPeriod ? 2026 : 2026,
        grossSalary: 0,
        basicPlusDA: 0,
        hraReceived: 0,
        epfContribution: 0,
        employerNPSContribution: 0,
        // New salary components
        bonus: 0,
        specialAllowance: 0,
        ltaReceived: 0,
        telephoneReimb: 0,
        booksReimb: 0,
        conveyanceAllowance: 0,
        driverAllowance: 0
    };
    employmentPeriods.push(entry);
    
    const html = `
        <div class="employment-period-card" id="${id}" style="border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; margin-bottom: 16px; background: var(--color-bg-secondary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <input type="text" id="${id}_name" value="${entry.name}" 
                       oninput="updateEmploymentPeriod('${id}', 'name', this.value)"
                       style="font-weight: 600; font-size: 15px; border: none; background: transparent; color: var(--color-primary); width: 200px;">
                <button class="entry-remove-btn" onclick="removeEmploymentPeriod('${id}')" title="Remove Period">✕</button>
            </div>
            
            <!-- Date Range -->
            <div class="form-row" style="margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Start Month/Year</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="${id}_startMonth" oninput="updateEmploymentPeriod('${id}', 'startMonth', this.value)" style="flex: 1;">
                            ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${entry.startMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
                        </select>
                        <select id="${id}_startYear" oninput="updateEmploymentPeriod('${id}', 'startYear', this.value)" style="width: 80px;">
                            <option value="2025" ${entry.startYear === 2025 ? 'selected' : ''}>2025</option>
                            <option value="2026" ${entry.startYear === 2026 ? 'selected' : ''}>2026</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">End Month/Year</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="${id}_endMonth" oninput="updateEmploymentPeriod('${id}', 'endMonth', this.value)" style="flex: 1;">
                            ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${entry.endMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
                        </select>
                        <select id="${id}_endYear" oninput="updateEmploymentPeriod('${id}', 'endYear', this.value)" style="width: 80px;">
                            <option value="2025" ${entry.endYear === 2025 ? 'selected' : ''}>2025</option>
                            <option value="2026" ${entry.endYear === 2026 ? 'selected' : ''}>2026</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Duration</label>
                    <div id="${id}_months" style="padding: 8px; background: var(--color-bg-tertiary); border-radius: 4px; text-align: center; font-weight: 600;">
                        12 months
                    </div>
                </div>
            </div>
            
            <!-- Salary Details -->
            <div class="form-row">
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-size: 12px;">Gross Salary for this Period (₹)</label>
                    <input type="number" id="${id}_grossSalary" placeholder="e.g., 600000" value="0" min="0"
                           oninput="updateEmploymentPeriod('${id}', 'grossSalary', this.value)">
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-size: 12px;">Basic + DA for this Period (₹)</label>
                    <input type="number" id="${id}_basicPlusDA" placeholder="Leave 0 to auto-compute (50%)" value="0" min="0"
                           oninput="updateEmploymentPeriod('${id}', 'basicPlusDA', this.value)">
                    <p class="help-text" style="font-size: 11px; margin-top: 4px;">
                        <span class="info-icon" style="width: 14px; height: 14px; font-size: 10px;">i</span>
                        Check your salary slip. If left blank, we'll use 50% of gross. Usually 40-50%.
                    </p>
                </div>
            </div>
            
            <!-- HRA & EPF -->
            <div class="form-row old-regime-only">
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-size: 12px;">HRA Received (₹) - This Period</label>
                    <input type="number" id="${id}_hraReceived" placeholder="e.g., 120000" value="0" min="0"
                           oninput="updateEmploymentPeriod('${id}', 'hraReceived', this.value)">
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-size: 12px;">Your EPF Contribution (₹) - This Period</label>
                    <input type="number" id="${id}_epfContribution" placeholder="Usually 12% of Basic" value="0" min="0"
                           oninput="updateEmploymentPeriod('${id}', 'epfContribution', this.value)">
                </div>
            </div>
            
            <!-- Employer NPS -->
            <div class="form-row">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Employer NPS Contribution (₹) - This Period</label>
                    <input type="number" id="${id}_employerNPSContribution" placeholder="80CCD(2)" value="0" min="0"
                           oninput="updateEmploymentPeriod('${id}', 'employerNPSContribution', this.value)">
                </div>
            </div>
            
            <!-- Optional Salary Components (Collapsible) -->
            <details style="margin-top: 12px; border-top: 1px dashed var(--color-border); padding-top: 12px;">
                <summary style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--color-primary);">
                    ➕ Add More Salary Components (Bonus, LTA, Reimbursements)
                </summary>
                <div style="margin-top: 12px;">
                    <!-- Variable Components -->
                    <div class="form-row">
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size: 12px;">Bonus / Variable Pay (₹)</label>
                            <input type="number" id="${id}_bonus" placeholder="Fully taxable" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'bonus', this.value)">
                            <p class="help-text" style="font-size: 10px; margin-top: 2px;">Performance bonus, incentives. Taxable in both regimes.</p>
                        </div>
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size: 12px;">Special Allowance (₹)</label>
                            <input type="number" id="${id}_specialAllowance" placeholder="Fully taxable" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'specialAllowance', this.value)">
                            <p class="help-text" style="font-size: 10px; margin-top: 2px;">Catch-all allowance. Fully taxable.</p>
                        </div>
                    </div>
                    
                    <!-- Exemptions & Reimbursements -->
                    <div class="form-row old-regime-only">
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size: 12px;">LTA Received (₹) <span style="color: var(--color-warning); font-size: 10px;">Old Regime</span></label>
                            <input type="number" id="${id}_ltaReceived" placeholder="Leave Travel Allowance" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'ltaReceived', this.value)">
                            <p class="help-text" style="font-size: 10px; margin-top: 2px;">Sec 10(5). Exempt with travel bills. Old Regime only.</p>
                        </div>
                    </div>
                    
                    <!-- Reimbursements (Both Regimes) -->
                    <div class="form-row">
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size: 12px;">Telephone/Internet Reimb. (₹) <span style="color: var(--color-success); font-size: 10px;">Both</span></label>
                            <input type="number" id="${id}_telephoneReimb" placeholder="With bills" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'telephoneReimb', this.value)">
                        </div>
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size: 12px;">Books/Periodicals Reimb. (₹) <span style="color: var(--color-success); font-size: 10px;">Both</span></label>
                            <input type="number" id="${id}_booksReimb" placeholder="With bills" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'booksReimb', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 12px;">Conveyance / Fuel Reimb. (₹) <span style="color: var(--color-success); font-size: 10px;">Exempt (Bills)</span></label>
                            <input type="number" id="${id}_conveyanceAllowance" placeholder="With bills" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'conveyanceAllowance', this.value)">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 12px;">Driver Salary / Allowance (₹) <span style="color: var(--color-warning); font-size: 10px;">Taxable</span></label>
                            <input type="number" id="${id}_driverAllowance" placeholder="Taxable" value="0" min="0"
                                   oninput="updateEmploymentPeriod('${id}', 'driverAllowance', this.value)">
                        </div>
                    </div>
                </div>
            </details>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    updateEmploymentSummary();
    // updateOldRegimeSections is defined in app.js (loads after) - check if exists
    if (typeof updateOldRegimeSections === 'function') {
        updateOldRegimeSections();
    }
}

/**
 * Update a specific field in an employment period
 */
function updateEmploymentPeriod(id, field, value) {
    const entry = employmentPeriods.find(p => p.id === id);
    if (!entry) return;
    
    // Parse numeric fields
    const numericFields = [
        'grossSalary', 'basicPlusDA', 'hraReceived', 'epfContribution', 'employerNPSContribution',
        'startMonth', 'endMonth', 'startYear', 'endYear',
        'bonus', 'specialAllowance', 'ltaReceived', 'telephoneReimb', 'booksReimb', 'conveyanceAllowance', 'driverAllowance'
    ];
    if (numericFields.includes(field)) {
        value = parseFloat(value) || 0;
    }
    
    entry[field] = value;
    
    // Update months display
    const monthsEl = document.getElementById(`${id}_months`);
    if (monthsEl) {
        const months = calculatePeriodMonths(entry);
        monthsEl.textContent = `${months} month${months !== 1 ? 's' : ''}`;
        monthsEl.style.color = months > 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    
    updateEmploymentSummary();
}

/**
 * Remove an employment period
 */
function removeEmploymentPeriod(id) {
    employmentPeriods = employmentPeriods.filter(p => p.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    
    updateEmploymentSummary();
    
    // Ensure at least one period exists for salaried users
    if (employmentPeriods.length === 0 && document.getElementById('employmentType').value !== 'unemployed') {
        addEmploymentPeriod();
    }
}

/**
 * Calculate months worked in a period (within FY 2025-26: Apr 2025 - Mar 2026)
 */
function calculatePeriodMonths(period) {
    // Convert to FY-relative months (April 2025 = 1, March 2026 = 12)
    const startFYMonth = period.startYear === 2025 ? period.startMonth - 3 : period.startMonth + 9;
    const endFYMonth = period.endYear === 2025 ? period.endMonth - 3 : period.endMonth + 9;
    
    // Clamp to valid FY range (1-12)
    const clampedStart = Math.max(1, Math.min(12, startFYMonth));
    const clampedEnd = Math.max(1, Math.min(12, endFYMonth));
    
    if (clampedEnd < clampedStart) return 0;
    return clampedEnd - clampedStart + 1;
}

/**
 * Update the aggregated salary summary
 */
function updateEmploymentSummary() {
    const summaryDiv = document.getElementById('totalSalaryInfo');
    const totalSalarySpan = document.getElementById('totalSalaryAmount');
    const totalMonthsSpan = document.getElementById('totalMonthsWorked');
    const calculateBtn = document.getElementById('calculateBtn');
    const calculateBtnHint = document.getElementById('calculateBtnHint');
    
    if (!summaryDiv) return;
    
    const totalGross = employmentPeriods.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const totalMonths = employmentPeriods.reduce((sum, p) => sum + calculatePeriodMonths(p), 0);
    
    if (employmentPeriods.length > 0 && totalGross > 0) {
        summaryDiv.style.display = 'block';
        totalSalarySpan.textContent = TaxUtils.formatCurrency(totalGross);
        totalMonthsSpan.textContent = Math.min(totalMonths, 12);
        totalMonthsSpan.style.color = totalMonths > 12 ? 'var(--color-warning)' : 'inherit';
        
        // Enable calculate button when salary is entered
        if (calculateBtn) {
            calculateBtn.disabled = false;
            calculateBtn.title = 'Calculate tax for both Old and New regimes';
        }
        if (calculateBtnHint) {
            calculateBtnHint.style.display = 'none';
        }
    } else {
        summaryDiv.style.display = 'none';
        
        // Disable calculate button when no salary
        if (calculateBtn) {
            calculateBtn.disabled = true;
            calculateBtn.title = 'Add salary details above to enable calculation';
        }
        if (calculateBtnHint) {
            calculateBtnHint.style.display = 'block';
        }
    }
}

/**
 * Get month name helper
 */
function getMonthName(monthNum) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1];
}

// ============================================
// DYNAMIC 80C INVESTMENTS
// ============================================
const investment80CTypes = [
    { id: 'ppf', name: 'PPF (Public Provident Fund)' },
    { id: 'elss', name: 'ELSS Mutual Funds' },
    { id: 'lifeInsurance', name: 'Life Insurance Premium' },
    { id: 'nsc', name: 'NSC (National Savings Certificate)' },
    { id: 'scss', name: 'Senior Citizens Savings Scheme' },
    { id: 'taxSaverFD', name: 'Tax Saver FD (5-year)' },
    { id: 'sukanyaSamriddhi', name: 'Sukanya Samriddhi Yojana' },
    { id: 'tuitionFees', name: 'Tuition Fees (max 2 children)' },
    { id: 'stampDuty', name: 'Stamp Duty & Registration' },
    { id: 'other80c', name: 'Other 80C Investment' }
];

function addInvestment80C() {
    const container = document.getElementById('investments80c');
    const id = `inv80c_${investment80CCounter++}`;
    
    const entry = {
        id,
        type: 'ppf',
        amount: 0
    };
    investments80C.push(entry);
    
    const html = `
        <div class="dynamic-entry" id="${id}">
            <div class="form-group" style="margin-bottom: 0;">
                <select id="${id}_type" oninput="updateInvestment80C('${id}', 'type', this.value)">
                    ${investment80CTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <input type="number" id="${id}_amount" placeholder="Amount ₹" value="0" min="0" 
                       oninput="updateInvestment80C('${id}', 'amount', this.value)">
            </div>
            <button class="entry-remove-btn" onclick="removeInvestment80C('${id}')" title="Remove">✕</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    updateTotal80C();
}

function updateInvestment80C(id, field, value) {
    const entry = investments80C.find(i => i.id === id);
    if (entry) {
        entry[field] = field === 'amount' ? parseFloat(value) || 0 : value;
        updateTotal80C();
    }
}

function removeInvestment80C(id) {
    investments80C = investments80C.filter(i => i.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    updateTotal80C();
    
    // Ensure at least one row exists
    if (investments80C.length === 0) {
        addInvestment80C();
    }
}

function updateTotal80C() {
    // Aggregate EPF from employment periods
    const totalEPF = employmentPeriods.reduce((sum, p) => sum + (p.epfContribution || 0), 0);
    const homeLoanPrincipal = TaxUtils.getInputValue('homeLoanPrincipal');
    const nps = TaxUtils.getInputValue('npsContribution');
    
    const investmentsTotal = investments80C.reduce((sum, inv) => sum + inv.amount, 0);
    const total = totalEPF + homeLoanPrincipal + nps + investmentsTotal;
    const capped = Math.min(total, 150000);
    const remaining = Math.max(0, 150000 - total);
    
    document.getElementById('total80cAmount').textContent = TaxUtils.formatCurrency(capped);
    document.getElementById('remaining80c').innerHTML = total > 150000 
        ? `<span style="color: var(--color-warning);">⚠️ Exceeds limit by ${TaxUtils.formatCurrency(total - 150000)}</span>`
        : `Remaining limit: ${TaxUtils.formatCurrency(remaining)}`;

    // Update EPF Display Row
    const epfRow = document.getElementById('epf80cRow');
    const epfAmountSpan = document.getElementById('epf80cAmount');
    if (epfRow && epfAmountSpan) {
        if (totalEPF > 0) {
            epfRow.style.display = 'block';
            epfAmountSpan.textContent = TaxUtils.formatCurrency(totalEPF);
        } else {
            epfRow.style.display = 'none';
        }
    }
}

// ============================================
// DYNAMIC DONATIONS
// ============================================
const donationTypes = [
    { id: 'politicalParty', name: '80GGC: Political Party (100%, Old Regime)', percent: 1.0 },
    { id: 'pmReliefFund', name: 'PM National Relief Fund (100%)', percent: 1.0 },
    { id: 'cmReliefFund', name: 'CM Relief Fund (100%)', percent: 1.0 },
    { id: 'nationalDefenceFund', name: 'National Defence Fund (100%)', percent: 1.0 },
    { id: 'charityTrust', name: 'Charitable Trust/NGO (50%)', percent: 0.5 },
    { id: 'temple', name: 'Religious Institution (50%)', percent: 0.5 },
    { id: 'approvedResearch', name: 'Scientific Research (100%)', percent: 1.0 },
    { id: 'other', name: 'Other Donation (50%)', percent: 0.5 }
];

function addDonation() {
    const container = document.getElementById('donationsList');
    const id = `donation_${donationCounter++}`;
    
    const entry = {
        id,
        category: 'politicalParty',
        amount: 0,
        paymentMode: 'online'
    };
    donations.push(entry);
    
    const html = `
        <div class="dynamic-entry" id="${id}" style="grid-template-columns: 1fr 100px 100px auto;">
            <div class="form-group" style="margin-bottom: 0;">
                <select id="${id}_category" oninput="updateDonation('${id}', 'category', this.value)">
                    ${donationTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <input type="number" id="${id}_amount" placeholder="₹" value="0" min="0" 
                       oninput="updateDonation('${id}', 'amount', this.value)">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <select id="${id}_mode" oninput="updateDonation('${id}', 'paymentMode', this.value)">
                    <option value="online">Online</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                </select>
            </div>
            <button class="entry-remove-btn" onclick="removeDonation('${id}')" title="Remove">✕</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
}

function updateDonation(id, field, value) {
    const entry = donations.find(d => d.id === id);
    if (entry) {
        entry[field] = field === 'amount' ? parseFloat(value) || 0 : value;
    }
}

function removeDonation(id) {
    donations = donations.filter(d => d.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    
    // Ensure at least one row exists
    if (donations.length === 0) {
        addDonation();
    }
}

// Expose to window for app.js and HTML onclick handlers
window.employmentPeriods = employmentPeriods;
window.investments80C = investments80C;
window.donations = donations;
window.addEmploymentPeriod = addEmploymentPeriod;
window.updateEmploymentPeriod = updateEmploymentPeriod;
window.removeEmploymentPeriod = removeEmploymentPeriod;
window.calculatePeriodMonths = calculatePeriodMonths;
window.updateEmploymentSummary = updateEmploymentSummary;
window.getMonthName = getMonthName;
window.addInvestment80C = addInvestment80C;
window.updateInvestment80C = updateInvestment80C;
window.removeInvestment80C = removeInvestment80C;
window.updateTotal80C = updateTotal80C;
window.addDonation = addDonation;
window.updateDonation = updateDonation;
window.removeDonation = removeDonation;

