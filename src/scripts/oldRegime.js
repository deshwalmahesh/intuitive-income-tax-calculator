/**
 * OLD REGIME TAX CALCULATOR
 * FY 2025-26 (AY 2026-27)
 * 
 * Class-based calculator with detailed logging for each calculation step.
 * 
 * Key Features:
 * - Age-based slabs (different for <60, 60-80, 80+)
 * - Full Chapter VI-A deductions (80C, 80D, 80E, 80G, etc.)
 * - HRA exemption (Section 10(13A))
 * - LTA exemption (Section 10(5))
 * - Home loan interest (Section 24b)
 * - ₹50,000 standard deduction
 * - 87A rebate up to ₹12,500 (if income ≤ ₹5L)
 * - Surcharge up to 37% for very high income
 * 
 * References:
 * - Income Tax Act, 1961
 * - Chapter VI-A Deductions
 * - incometaxindia.gov.in
 */

class OldRegimeCalculator {
    /**
     * Initialize calculator with configuration
     * @param {Object} config - TAX_CONFIG object
     */
    constructor(config) {
        this.config = config;
        this.regimeConfig = config.oldRegime;
        this.deductionConfig = config.deductions;
        this.exemptionConfig = config.exemptions;
        this.log = [];
    }

    /**
     * Main calculation method
     * @param {Object} userData - User input data
     * @returns {Object} Complete tax calculation result with log
     */
    calculate(userData) {
        // Reset log for fresh calculation
        this.log = [];
        
        // Get age category from user profile
        const ageCategory = userData.ageCategory || 'below60';
        const ageConfig = this.regimeConfig.ageCategories[ageCategory];
        
        // Step 1: Calculate Gross Total Income
        const grossIncome = this.calculateGrossIncome(userData);
        
        // Step 2: Calculate exemptions (HRA, LTA, etc.)
        const exemptions = this.calculateExemptions(userData);
        
        // Step 3: Calculate Chapter VI-A deductions
        const deductions = this.calculateDeductions(userData, ageCategory, grossIncome.total);
        
        // Step 4: Calculate Taxable Income
        const taxableIncome = Math.max(0, grossIncome.total - exemptions.total - deductions.total);
        
        this.addLog(
            'Taxable Income',
            'Net Taxable Income',
            taxableIncome,
            null,
            `Gross Income (${TaxUtils.formatCurrency(grossIncome.total)}) - Exemptions (${TaxUtils.formatCurrency(exemptions.total)}) - Deductions (${TaxUtils.formatCurrency(deductions.total)}) = ${TaxUtils.formatCurrency(taxableIncome)}`
        );

        // Step 5: Calculate tax using age-based slabs
        const slabTax = this.calculateSlabTax(taxableIncome, ageConfig.slabs);
        
        // Step 6: Apply 87A Rebate
        const rebate = this.calculateRebate(taxableIncome, slabTax.tax);
        const taxAfterRebate = Math.max(0, slabTax.tax - rebate.amount);
        
        // Step 7: Calculate Surcharge
        const surcharge = this.calculateSurcharge(grossIncome.total, taxAfterRebate);
        
        // Step 8: Calculate Cess
        const cess = this.calculateCess(taxAfterRebate + surcharge.amount);
        
        // Step 9: Calculate Capital Gains Tax separately
        const capitalGainsTax = this.calculateCapitalGainsTax(userData);
        
        // Step 10: Final Tax
        const finalTax = Math.max(0, taxAfterRebate + surcharge.amount + cess.amount + capitalGainsTax.total);

        this.addLog(
            'Final Tax',
            'Total Tax Payable',
            finalTax,
            null,
            `Tax after rebate (${TaxUtils.formatCurrency(taxAfterRebate)}) + Surcharge (${TaxUtils.formatCurrency(surcharge.amount)}) + Cess (${TaxUtils.formatCurrency(cess.amount)}) + Capital Gains Tax (${TaxUtils.formatCurrency(capitalGainsTax.total)})`
        );

        return {
            regime: 'old',
            regimeName: 'Old Tax Regime',
            ageCategory,
            grossIncome,
            exemptions,
            deductions,
            taxableIncome,
            slabTax,
            rebate,
            surcharge,
            cess,
            capitalGainsTax,
            finalTax: TaxUtils.roundToRupee(finalTax),
            effectiveRate: grossIncome.total > 0 ? (finalTax / grossIncome.total) : 0,
            log: this.log
        };
    }

    /**
     * Calculate Gross Total Income
     * Same as New Regime (income sources don't change)
     */
    calculateGrossIncome(userData) {
        const breakdown = {};
        
        // Salary Income (before any deductions)
        breakdown.salary = TaxUtils.validateNumber(userData.grossSalary);
        
        // Interest Income (will be partially deductible via 80TTA/80TTB)
        breakdown.savingsInterest = TaxUtils.validateNumber(userData.savingsInterest);
        breakdown.fdInterest = TaxUtils.validateNumber(userData.fdInterest);
        
        // Dividend Income
        breakdown.dividend = TaxUtils.validateNumber(userData.dividendIncome);
        
        // Rental Income (after 30% standard deduction) - Section 24(a)
        const grossRental = TaxUtils.validateNumber(userData.rentalIncome);
        const rentalStdDeduction = grossRental * 0.30;
        breakdown.rental = grossRental - rentalStdDeduction;
        
        if (grossRental > 0) {
            this.addLog(
                'Section 24(a)',
                'Rental Income - Standard Deduction',
                rentalStdDeduction,
                null,
                `30% standard deduction for repair and maintenance: ${TaxUtils.formatCurrency(grossRental)} × 30% = ${TaxUtils.formatCurrency(rentalStdDeduction)}`
            );
        }
        
        // Family Pension
        breakdown.familyPension = TaxUtils.validateNumber(userData.familyPension);
        
        // Gifts from non-relatives (taxable if > ₹50,000 aggregate)
        const gifts = TaxUtils.validateNumber(userData.nonRelativeGifts);
        breakdown.gifts = gifts > 50000 ? gifts : 0;
        
        if (gifts > 0 && gifts <= 50000) {
            this.addLog(
                'Section 56(2)(x)',
                'Gifts - Exempt',
                0,
                50000,
                `Gifts of ${TaxUtils.formatCurrency(gifts)} are exempt (aggregate ≤ ₹50,000 in FY)`
            );
        }
        
        // Other income
        breakdown.other = TaxUtils.validateNumber(userData.otherIncome);
        
        // Agricultural income is FULLY EXEMPT
        const agriculturalIncome = TaxUtils.validateNumber(userData.agriculturalIncome);
        if (agriculturalIncome > 0) {
            this.addLog(
                'Section 10(1)',
                'Agricultural Income',
                0,
                null,
                `Agricultural income of ${TaxUtils.formatCurrency(agriculturalIncome)} is 100% TAX-FREE. Constitutional exemption, unlimited.`,
                agriculturalIncome * 0.30  // Estimated tax saved at 30%
            );
        }
        
        // Calculate total
        breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        
        this.addLog(
            'Gross Income',
            'Total Gross Income',
            breakdown.total,
            null,
            'Sum of all taxable income sources before exemptions and deductions.'
        );
        
        return breakdown;
    }

    /**
     * Calculate Exemptions (Section 10)
     * HRA, LTA, and other salary exemptions
     */
    calculateExemptions(userData) {
        const breakdown = {};
        
        // Standard Deduction - ₹50,000 for salaried
        const salary = TaxUtils.validateNumber(userData.grossSalary);
        if (salary > 0) {
            breakdown.standardDeduction = this.regimeConfig.standardDeduction.salary;
            this.addLog(
                'Section 16(ia)',
                'Standard Deduction',
                breakdown.standardDeduction,
                50000,
                'Automatic ₹50,000 deduction for salaried individuals under Old Regime.',
                breakdown.standardDeduction * 0.30,
                'exemption'  // Blue - automatic benefit
            );
        } else {
            breakdown.standardDeduction = 0;
        }
        
        // Family Pension Deduction - ₹15,000 or 1/3rd (Old Regime)
        const familyPension = TaxUtils.validateNumber(userData.familyPension);
        if (familyPension > 0) {
            breakdown.familyPensionDeduction = TaxUtils.leastOf(
                this.regimeConfig.standardDeduction.familyPension,
                familyPension / 3
            );
            this.addLog(
                'Section 57(iia)',
                'Family Pension Deduction',
                breakdown.familyPensionDeduction,
                15000,
                `Least of ₹15,000 or 1/3rd of pension (${TaxUtils.formatCurrency(familyPension / 3)})`
            );
        } else {
            breakdown.familyPensionDeduction = 0;
        }
        
        // Professional Tax - Section 16(iii)
        const professionalTax = TaxUtils.validateNumber(userData.professionalTax);
        breakdown.professionalTax = professionalTax;
        if (professionalTax > 0) {
            this.addLog(
                'Section 16(iii)',
                'Professional Tax',
                professionalTax,
                null,
                'Actual professional tax paid to state government. Fully deductible.'
            );
        }
        
        // HRA Exemption - Section 10(13A) + Rule 2A
        const hraExemption = this.calculateHRAExemption(userData);
        breakdown.hraExemption = hraExemption.amount;  // Note: property name matches display expectation
        
        // LTA Exemption - Section 10(5)
        const ltaExemption = this.calculateLTAExemption(userData);
        breakdown.lta = ltaExemption.amount;
        
        // Entertainment Allowance - Section 16(ii) - Govt employees only
        if (userData.employerType === 'government') {
            const entertainmentAllowance = TaxUtils.validateNumber(userData.entertainmentAllowance);
            const basicSalary = TaxUtils.validateNumber(userData.basicSalary) || salary * 0.5;
            const entDeduction = TaxUtils.leastOf(
                entertainmentAllowance,
                basicSalary * 0.20,
                5000
            );
            breakdown.entertainmentAllowance = entDeduction;
            
            if (entDeduction > 0) {
                this.addLog(
                    'Section 16(ii)',
                    'Entertainment Allowance',
                    entDeduction,
                    5000,
                    'Government employees only. Least of: actual allowance, 20% of salary, or ₹5,000.'
                );
            }
        } else {
            breakdown.entertainmentAllowance = 0;
        }

        // Children Education Allowance - Section 10(14)
        const childrenEdu = this.calculateChildrenEducationExemption(userData);
        breakdown.childrenEducationAllowance = childrenEdu.amount;

        // Hostel Allowance - Section 10(14)
        const hostel = this.calculateHostelExemption(userData);
        breakdown.hostelAllowance = hostel.amount;

        // Transport Allowance (Divyang) - Section 10(14)
        const transport = this.calculateTransportDivyangExemption(userData);
        breakdown.transportAllowanceDivyang = transport.amount;

        // VRS Exemption - Section 10(10C)
        const vrs = this.calculateVRSExemption(userData);
        breakdown.vrs = vrs.amount;

        // Gratuity Exemption - Section 10(10)
        const gratuityReceived = TaxUtils.validateNumber(userData.gratuityReceived);
        if (gratuityReceived > 0) {
            const isGovt = userData.employerType === 'government';
            if (isGovt) {
                // Government employees - fully exempt
                breakdown.gratuity = gratuityReceived;
                this.addLog(
                    'Section 10(10)',
                    'Gratuity Exemption (Government)',
                    gratuityReceived,
                    null,
                    'Government employee gratuity is 100% TAX-FREE. No limit.'
                );
            } else {
                // Private employees - min of 3 values
                const limit = this.exemptionConfig.gratuity?.limit || 2000000;  // ₹20L
                const yearsOfService = TaxUtils.validateNumber(userData.yearsOfService) || 1;
                const lastSalary = TaxUtils.validateNumber(userData.lastDrawnSalary) || 
                                   (TaxUtils.validateNumber(userData.basicPlusDA) || 
                                    TaxUtils.validateNumber(userData.grossSalary) * 0.5) / 12;
                const formulaAmount = lastSalary * 15 * yearsOfService / 26;  // Covered employees formula
                
                const exemptAmount = Math.min(gratuityReceived, limit, formulaAmount);
                breakdown.gratuity = exemptAmount;
                
                this.addLog(
                    'Section 10(10)',
                    'Gratuity Exemption (Private)',
                    exemptAmount,
                    limit,
                    `Least of: (1) Actual: ${TaxUtils.formatCurrency(gratuityReceived)}, (2) Limit: ₹20L, (3) Formula: 15×${yearsOfService}yrs×salary/26 = ${TaxUtils.formatCurrency(formulaAmount)}`
                );
            }
        } else {
            breakdown.gratuity = 0;
        }

        // Leave Encashment - Section 10(10AA)
        const leaveEncashment = TaxUtils.validateNumber(userData.leaveEncashmentReceived);
        if (leaveEncashment > 0) {
            const isGovt = userData.employerType === 'government';
            if (isGovt) {
                // Government employees - fully exempt
                breakdown.leaveEncashment = leaveEncashment;
                this.addLog(
                    'Section 10(10AA)',
                    'Leave Encashment (Government)',
                    leaveEncashment,
                    null,
                    'Government employee leave encashment is 100% TAX-FREE. No limit.'
                );
            } else {
                // Private employees - max ₹25L
                const limit = this.exemptionConfig.leaveEncashment?.limit || 2500000;  // ₹25L
                const exemptAmount = Math.min(leaveEncashment, limit);
                breakdown.leaveEncashment = exemptAmount;
                
                this.addLog(
                    'Section 10(10AA)',
                    'Leave Encashment (Private)',
                    exemptAmount,
                    limit,
                    `Private employee limit: ₹25,00,000. Actual: ${TaxUtils.formatCurrency(leaveEncashment)}, Exempt: ${TaxUtils.formatCurrency(exemptAmount)}`
                );
            }
        } else {
            breakdown.leaveEncashment = 0;
        }
        
        // Calculate total exemptions
        breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        
        return breakdown;
    }

    /**
 * Calculate HRA Exemption - Section 10(13A) + Rule 2A
 * For multiple jobs: Calculate per employment period, then sum
 * Each period: Least of: (1) Actual HRA, (2) 50/40% of salary, (3) Rent - 10% salary
 */
    /**
     * Calculate HRA Exemption - Section 10(13A)
     * Monthly Calculation Method (Most Accurate)
     * Iterates through each month of FY 2025-26 to match Rent with Salary
     */
    calculateHRAExemption(userData) {
        const rentPayments = userData.rentPayments || [];
        const employmentPeriods = userData.employmentPeriods || [];
        const hraConfig = this.exemptionConfig.hra;
        
        
        // Debug summary (not per-month to reduce noise)
        console.log('[HRA] Input Summary:', {
            rentPeriods: rentPayments.length,
            employmentPeriods: employmentPeriods.length,
            totalHRAReceived: employmentPeriods.reduce((sum, p) => sum + (Number(p.hraReceived) || 0), 0)
        });
        
        // If no rent info, no exemption
        if (rentPayments.length === 0 && (!userData.rentPaid || userData.rentPaid === 0)) {
            this.addLog(
                'Section 10(13A)',
                'HRA Exemption',
                0,
                null,
                'No rent payments entered. Add rent details in the HRA section to claim exemption.',
                0
            );
            return { amount: 0, applicable: false, periodBreakdown: [] };
        }
        
        // If no employment periods with HRA, no exemption
        const totalHRAReceived = employmentPeriods.reduce((sum, p) => sum + (Number(p.hraReceived) || 0), 0);
        if (totalHRAReceived === 0 && (!userData.hraReceived || userData.hraReceived === 0)) {
            this.addLog(
                'Section 10(13A)',
                'HRA Exemption',
                0,
                null,
                'No HRA component in salary. Enter HRA received in Employment section to claim exemption.',
                0
            );
            return { amount: 0, applicable: false, periodBreakdown: [] };
        }
        
        let totalHRAExemption = 0;
        const monthlyBreakdown = [];
        
        // Financial Year Months: 4 (Apr'25) to 12 (Dec'25), then 1 (Jan'26) to 3 (Mar'26)
        const fyMonths = [
            { m: 4, y: 2025 }, { m: 5, y: 2025 }, { m: 6, y: 2025 }, 
            { m: 7, y: 2025 }, { m: 8, y: 2025 }, { m: 9, y: 2025 }, 
            { m: 10, y: 2025 }, { m: 11, y: 2025 }, { m: 12, y: 2025 },
            { m: 1, y: 2026 }, { m: 2, y: 2026 }, { m: 3, y: 2026 }
        ];
        
        const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Helper: Check if date is within range - ENSURE NUMERIC COMPARISON
        const isMonthInPeriod = (targetM, targetY, startM, startY, endM, endY) => {
            // Force all values to numbers
            const target = Number(targetY) * 100 + Number(targetM);
            const start = Number(startY) * 100 + Number(startM);
            const end = Number(endY) * 100 + Number(endM);
            return target >= start && target <= end;
        };
        
        for (const { m, y } of fyMonths) {
            // 1. Find ALL active employment periods for this month to handle overlaps/ghost entries
            const activeJobs = employmentPeriods.filter(job => 
                isMonthInPeriod(m, y, job.startMonth, job.startYear, job.endMonth, job.endYear)
            );
            
            // 2. Find active rent payment for this month
            const activeRent = rentPayments.find(rent => 
                isMonthInPeriod(m, y, rent.startMonth, rent.startYear, rent.endMonth, rent.endYear)
            );
            
            // If we have at least one Job and active Rent, calculate
            if (activeJobs.length > 0 && activeRent) {
                // Aggregate monthly values from all active jobs
                let monthlyBasic = 0;
                let monthlyHRA = 0;
                
                activeJobs.forEach(job => {
                    const jobStartNum = Number(job.startYear) * 12 + Number(job.startMonth);
                    const jobEndNum = Number(job.endYear) * 12 + Number(job.endMonth);
                    const jobDuration = Math.max(1, jobEndNum - jobStartNum + 1);
                    
                    monthlyBasic += (Number(job.basicPlusDA) || 0) / jobDuration;
                    monthlyHRA += (Number(job.hraReceived) || 0) / jobDuration;
                });
                // Calculate rent duration to derive monthly rent
                const rentStartNum = Number(activeRent.startYear) * 12 + Number(activeRent.startMonth);
                const rentEndNum = Number(activeRent.endYear) * 12 + Number(activeRent.endMonth);
                const rentDuration = Math.max(1, rentEndNum - rentStartNum + 1);
                
                const monthlyRent = (Number(activeRent.amount) || 0) / rentDuration;
                const isMetro = activeRent.isMetro === true || activeRent.isMetro === 'true';
                
                if (monthlyHRA > 0 && monthlyRent > 0) {
                    // The 3 Limits (Monthly)
                    const limit1 = monthlyHRA; // Actual HRA
                    const limit2 = monthlyBasic * (isMetro ? hraConfig.metroPercentage : hraConfig.nonMetroPercentage);
                    const limit3 = monthlyRent - (monthlyBasic * hraConfig.rentExcess);
                    
                    
                    const monthlyExemption = Math.max(0, TaxUtils.leastOf(limit1, limit2, Math.max(0, limit3)));
                    
                    totalHRAExemption += monthlyExemption;
                    
                    monthlyBreakdown.push({
                        month: `${monthNames[m]} '${y.toString().substr(2)}`,
                        hra: monthlyHRA,
                        rent: monthlyRent,
                        basic: monthlyBasic,
                        exemption: monthlyExemption,
                        city: isMetro ? 'Metro' : 'Non-Metro'
                    });
                }
            }
            // Removed per-month 'missing' logs - they clutter the console
        }
        
        // Summary log - kept for useful debugging
        console.log('[HRA] Calculation Result:', {
            monthsCalculated: monthlyBreakdown.length,
            totalExemption: totalHRAExemption
        });
        
        // ALWAYS log HRA calculation status
        if (totalHRAExemption > 0) {
            const distinctRegions = [...new Set(monthlyBreakdown.map(b => b.city))].join(', ');
            const totalRentPaidCalc = monthlyBreakdown.reduce((sum, b) => sum + b.rent, 0);
            const totalHRAReceivedCalc = monthlyBreakdown.reduce((sum, b) => sum + b.hra, 0);
            
            this.addLog(
                'Section 10(13A)',
                'HRA Exemption',
                totalHRAExemption,
                null,
                `Exemption = MIN(HRA received, ${monthlyBreakdown[0]?.city === 'Metro' ? '50%' : '40%'} of Basic, Rent-10% Basic) per month. ` +
                `Annual Rent: ${TaxUtils.formatCurrency(totalRentPaidCalc)} | ` +
                `Annual HRA: ${TaxUtils.formatCurrency(totalHRAReceivedCalc)} | ` +
                `Total Exemption: ${TaxUtils.formatCurrency(totalHRAExemption)}. ` +
                `City: ${distinctRegions}.`,
                totalHRAExemption * 0.30
            );
        } else {
            // Log why no exemption
            this.addLog(
                'Section 10(13A)',
                'HRA Exemption',
                0,
                null,
                `No HRA exemption calculated. Ensure: (1) HRA is entered in Employment section, (2) Rent is entered in HRA section, (3) Dates overlap correctly.`,
                0
            );
        }
        
        return {
            amount: totalHRAExemption,
            applicable: totalHRAExemption > 0,
            monthlyBreakdown
        };
    }    

    /**
     * Calculate Children Education Allowance Exemption
     * Section 10(14) - ₹100/month per child (max 2)
     */
    calculateChildrenEducationExemption(userData) {
        // ... implementation
        const received = TaxUtils.validateNumber(userData.childrenEducationAllowanceReceived);
        const children = Math.min(
            TaxUtils.validateNumber(userData.numberOfChildren), 
            this.exemptionConfig.childrenEducationAllowance.maxChildren
        );
        
        if (received === 0 || children === 0) {
            return { amount: 0, applicable: false };
        }
        
        const limitPerMonth = this.exemptionConfig.childrenEducationAllowance.limitPerChild;
        const exemptAmount = Math.min(received, limitPerMonth * 12 * children);
        
        if (exemptAmount > 0) {
            this.addLog(
                'Section 10(14)',
                'Children Education Allowance',
                exemptAmount,
                null,
                `Exemption of ₹${limitPerMonth}/month for ${children} child(ren). Total: ${TaxUtils.formatCurrency(exemptAmount)}`
            );
        }
        
        return { amount: exemptAmount, applicable: true };
    }

    /**
     * Calculate Hostel Expenditure Allowance Exemption
     * Section 10(14) - ₹300/month per child (max 2)
     */
    calculateHostelExemption(userData) {
        const received = TaxUtils.validateNumber(userData.hostelAllowanceReceived);
        const children = Math.min(
            TaxUtils.validateNumber(userData.numberOfChildren),
            this.exemptionConfig.hostelAllowance.maxChildren
        );
        
        if (received === 0 || children === 0) {
            return { amount: 0, applicable: false };
        }
        
        const limitPerMonth = this.exemptionConfig.hostelAllowance.limitPerChild;
        const exemptAmount = Math.min(received, limitPerMonth * 12 * children);
        
        if (exemptAmount > 0) {
            this.addLog(
                'Section 10(14)',
                'Hostel Allowance',
                exemptAmount,
                null,
                `Exemption of ₹${limitPerMonth}/month for ${children} child(ren). Total: ${TaxUtils.formatCurrency(exemptAmount)}`
            );
        }
        
        return { amount: exemptAmount, applicable: true };
    }

    /**
     * Calculate Transport Allowance (Divyang) Exemption
     * Section 10(14) - ₹3200/month for disabled employees
     */
    calculateTransportDivyangExemption(userData) {
        const received = TaxUtils.validateNumber(userData.transportAllowanceReceived);
        const isDivyang = userData.isDivyang === true; // Check box for disability
        
        // Exemption only if received AND is disabled (blind/deaf/orthpedic)
        if (received === 0 || !isDivyang) {
            return { amount: 0, applicable: false };
        }
        
        const limitPerMonth = this.exemptionConfig.transportAllowanceDivyang.limit;
        const exemptAmount = Math.min(received, limitPerMonth * 12);
        
        if (exemptAmount > 0) {
            this.addLog(
                'Section 10(14)',
                'Transport Allowance (Divyang)',
                exemptAmount,
                null,
                `Exemption of ₹${limitPerMonth}/month for Divyang employee. Total: ${TaxUtils.formatCurrency(exemptAmount)}`
            );
        }
        
        return { amount: exemptAmount, applicable: true };
    }

    /**
     * Calculate Voluntary Retirement Scheme (VRS) Exemption
     * Section 10(10C) - Max ₹5 Lakhs
     */
    calculateVRSExemption(userData) {
        const received = TaxUtils.validateNumber(userData.vrsCompensationReceived);
        
        if (received === 0) {
            return { amount: 0, applicable: false };
        }
        
        const limit = this.exemptionConfig.vrs.limit;
        const exemptAmount = Math.min(received, limit);
        
        if (exemptAmount > 0) {
            this.addLog(
                'Section 10(10C)',
                'VRS Exemption',
                exemptAmount,
                limit,
                `VRS compensation exempt up to ₹5,00,000. Exempt: ${TaxUtils.formatCurrency(exemptAmount)}`
            );
        }
        
        return { amount: exemptAmount, applicable: true };
    }

    /**
     * Calculate LTA Exemption - Section 10(5) + Rule 2B
     */
    calculateLTAExemption(userData) {
        const ltaReceived = TaxUtils.validateNumber(userData.ltaReceived);
        const ltaActualExpenses = TaxUtils.validateNumber(userData.ltaActualExpenses);
        
        if (ltaReceived === 0) {
            return { amount: 0, applicable: false };
        }
        
        // LTA exemption = lower of actual travel expenses or LTA received
        const ltaExemption = TaxUtils.leastOf(ltaReceived, ltaActualExpenses);
        
        this.addLog(
            'Section 10(5)',
            'Leave Travel Allowance',
            ltaExemption,
            null,
            `LTA exemption for domestic travel. Lower of: LTA received (${TaxUtils.formatCurrency(ltaReceived)}) or actual travel expenses (${TaxUtils.formatCurrency(ltaActualExpenses)}). Covers only fare, not hotels/food.`
        );
        
        return {
            amount: ltaExemption,
            applicable: true
        };
    }







    /**
     * Calculate tax using age-based slab rates
     */
    calculateSlabTax(taxableIncome, slabs) {
        let totalTax = 0;
        const breakdown = [];

        for (const slab of slabs) {
            if (taxableIncome > slab.min) {
                const incomeInSlab = Math.min(taxableIncome, slab.max) - slab.min;
                const slabTax = incomeInSlab * slab.rate;
                
                if (incomeInSlab > 0 && slab.rate > 0) {
                    breakdown.push({
                        range: slab.description,
                        income: incomeInSlab,
                        rate: slab.rate,
                        tax: TaxUtils.roundToRupee(slabTax)
                    });
                    
                    this.addLog(
                        'Tax Slabs',
                        slab.description,
                        TaxUtils.roundToRupee(slabTax),
                        null,
                        `${TaxUtils.formatCurrency(incomeInSlab)} × ${TaxUtils.formatPercent(slab.rate)} = ${TaxUtils.formatCurrency(slabTax)}`
                    );
                }
                
                totalTax += slabTax;
            }
        }

        return {
            tax: TaxUtils.roundToRupee(totalTax),
            breakdown
        };
    }

    /**
     * Calculate Section 87A Rebate - Old Regime
     */
    calculateRebate(taxableIncome, tax) {
        const rebateConfig = this.regimeConfig.rebate87A;
        
        if (taxableIncome <= rebateConfig.incomeLimit) {
            const rebateAmount = Math.min(tax, rebateConfig.maxRebate);
            
            this.addLog(
                'Section 87A',
                'Tax Rebate',
                rebateAmount,
                rebateConfig.maxRebate,
                `Taxable income (${TaxUtils.formatCurrency(taxableIncome)}) ≤ ₹5,00,000. Rebate of ${TaxUtils.formatCurrency(rebateAmount)} applied.`,
                rebateAmount
            );
            
            return {
                applicable: true,
                amount: rebateAmount
            };
        }
        
        return { applicable: false, amount: 0 };
    }



    /**
     * Calculate Surcharge - Old Regime has higher rates
     */
    calculateSurcharge(totalIncome, tax) {
        const surchargeRates = this.regimeConfig.surcharge;
        
        for (const slab of surchargeRates) {
            if (totalIncome > slab.min && totalIncome <= slab.max) {
                const surchargeAmount = TaxUtils.roundToRupee(tax * slab.rate);
                
                this.addLog(
                    'Surcharge',
                    slab.description,
                    surchargeAmount,
                    null,
                    `Old Regime: Income > ${TaxUtils.formatCurrency(slab.min)} attracts ${TaxUtils.formatPercent(slab.rate)} surcharge. Note: New Regime caps at 25%.`
                );
                
                return {
                    applicable: true,
                    rate: slab.rate,
                    amount: surchargeAmount
                };
            }
        }
        
        return { applicable: false, rate: 0, amount: 0 };
    }

    /**
     * Calculate Health & Education Cess (4%)
     */
    calculateCess(taxWithSurcharge) {
        const cessRate = this.config.cess.rate;
        const cessAmount = TaxUtils.roundToRupee(taxWithSurcharge * cessRate);
        
        if (cessAmount > 0) {
            this.addLog(
                'Cess',
                'Health & Education Cess',
                cessAmount,
                null,
                `4% cess on (Tax + Surcharge) = ${TaxUtils.formatCurrency(taxWithSurcharge)} × 4% = ${TaxUtils.formatCurrency(cessAmount)}`
            );
        }
        
        return { rate: cessRate, amount: cessAmount };
    }

    /**
     * Calculate Capital Gains Tax (same as New Regime)
     */
    calculateCapitalGainsTax(userData) {
        let totalTax = 0;
        let stcgTax = 0;
        let ltcgTax = 0;
        
        // 1. STCG Equity (20%)
        // -----------------------
        let stcgEquity = TaxUtils.validateNumber(userData.stcgEquity);
        let stcl = TaxUtils.validateNumber(userData.stclCarryForward);
        
        // Offset STCL against STCG
        if (stcgEquity > 0 && stcl > 0) {
            const offset = Math.min(stcgEquity, stcl);
            stcgEquity -= offset;
            stcl -= offset;
            this.addLog('Loss Setoff', 'STCL vs STCG', offset, null, `Offset ₹${TaxUtils.formatCurrency(offset)} STCL against STCG.`);
        }

        if (stcgEquity > 0) {
            const rate = this.config.capitalGains.equity.stcgRate;
            stcgTax = TaxUtils.roundToRupee(stcgEquity * rate);
            this.addLog(
                'Section 111A', 
                'STCG (Equity)', 
                stcgTax, 
                null, 
                `Tax on ₹${TaxUtils.formatCurrency(stcgEquity)} @ ${(rate*100).toFixed(0)}% = ${TaxUtils.formatCurrency(stcgTax)}`
            );
        }

        // 2. LTCG Equity (12.5% > 1.25L)
        // ------------------------------
        let ltcgEquity = TaxUtils.validateNumber(userData.ltcgEquity);
        let ltcl = TaxUtils.validateNumber(userData.ltclCarryForward);
        
        // Offset remaining STCL against LTCG
        if (ltcgEquity > 0 && stcl > 0) {
            const offset = Math.min(ltcgEquity, stcl);
            ltcgEquity -= offset;
            stcl -= offset;
            this.addLog('Loss Setoff', 'STCL vs LTCG', offset, null, `Offset remaining ₹${TaxUtils.formatCurrency(offset)} STCL against LTCG.`);
        }

        // Offset LTCL against LTCG
        if (ltcgEquity > 0 && ltcl > 0) {
            const offset = Math.min(ltcgEquity, ltcl);
            ltcgEquity -= offset;
            ltcl -= offset;
            this.addLog('Loss Setoff', 'LTCL vs LTCG', offset, null, `Offset ₹${TaxUtils.formatCurrency(offset)} LTCL against LTCG.`);
        }

        if (ltcgEquity > 0) {
            const limit = this.config.capitalGains.equity.ltcgExemptionLimit;
            const rate = this.config.capitalGains.equity.ltcgRate;
            const taxable = Math.max(0, ltcgEquity - limit);
            
            if (taxable > 0) {
                const tax = TaxUtils.roundToRupee(taxable * rate);
                ltcgTax += tax;
                this.addLog(
                    'Section 112A', 
                    'LTCG (Equity)', 
                    tax, 
                    null, 
                    `Tax on ₹${TaxUtils.formatCurrency(taxable)} (above ₹1.25L) @ ${(rate*100).toFixed(1)}%`
                );
            }
        }

        // 3. Real Estate LTCG (Complex Rules)
        // -----------------------------------
        const sale = TaxUtils.validateNumber(userData.realEstateSaleValue);
        const cost = TaxUtils.validateNumber(userData.realEstatePurchaseValue);
        
        if (sale > 0 && cost > 0) {
            const expenses = TaxUtils.validateNumber(userData.realEstateTransferExpenses);
            const purchaseDateStr = userData.realEstatePurchaseDate;
            
            // Raw Gain
            let rawGain = Math.max(0, sale - cost - expenses);
            
            // Apply Exemptions (54, 54EC) on Raw Gain first to find Taxable amount
            // NOTE: For 54F (Net Consideration ratio), it's complex. Simplified check here for direct deduction.
            // Caps
            const invest54 = Math.min(TaxUtils.validateNumber(userData.investmentSec54), 100000000); // 10Cr
            const invest54EC = Math.min(TaxUtils.validateNumber(userData.investmentSec54EC), 5000000); // 50L
            const deposit = TaxUtils.validateNumber(userData.capitalGainDeposit);
            
            const totalExemption = invest54 + invest54EC + deposit;
            
            if (totalExemption > 0) {
                this.addLog('Exemptions', 'Sec 54/54EC', totalExemption, null, `Total Claimed Exemptions (capped): ₹${TaxUtils.formatCurrency(totalExemption)}`);
            }

            // Determine Tax Logic (Grandfathering)
            let reTax = 0;
            const pDate = new Date(purchaseDateStr);
            const cutoffDate = new Date(this.config.capitalGains.realEstate.grandfatherDate);
            const isGrandfathered = pDate < cutoffDate;
            
            // We calculate taxable gain AFTER exemptions for both methods
            // Method 1: 12.5% No Indexation
            const gainNoIndex = Math.max(0, rawGain - totalExemption);
            const taxNoIndex = TaxUtils.roundToRupee(gainNoIndex * 0.125);
            
            if (isGrandfathered && !isNaN(pDate.getTime())) {
                // Method 2: 20% With Indexation
                const purchaseYear = pDate.getFullYear();
                const purchaseMonth = pDate.getMonth() + 1;
                // Simple FY logic for lookups
                const fyStart = purchaseMonth >= 4 ? purchaseYear : purchaseYear - 1;
                const fyKey = `${fyStart}-${(fyStart+1).toString().slice(-2)}`;
                
                // Lookup CII
                const ciiMap = this.config.capitalGains.cii;
                const purchaseCII = ciiMap[fyKey] || 100; // Default to 2001-02 base if older or not found
                const saleCII = 376; // FY 25-26
                
                const indexedCost = TaxUtils.roundToRupee(cost * (saleCII / purchaseCII));
                const gainIndex = Math.max(0, sale - indexedCost - expenses - totalExemption);
                const taxIndex = TaxUtils.roundToRupee(gainIndex * 0.20);
                
                if (taxIndex < taxNoIndex) {
                    reTax = taxIndex;
                    this.addLog(
                        'Section 112', 
                        'LTCG (Property)', 
                        reTax, 
                        null, 
                        `Grandfathered Benefit! 20% with Indexation is lower. Indexed Cost: ₹${TaxUtils.formatCurrency(indexedCost)}. Taxable Gain: ₹${TaxUtils.formatCurrency(gainIndex)}`
                    );
                } else {
                    reTax = taxNoIndex;
                    this.addLog(
                        'Section 112', 
                        'LTCG (Property)', 
                        reTax, 
                        null, 
                        `12.5% without Indexation is better/mandatory. Taxable Gain: ₹${TaxUtils.formatCurrency(gainNoIndex)}`
                    );
                }
            } else {
                // Non-Grandfathered
                reTax = taxNoIndex;
                if (gainNoIndex > 0) {
                     this.addLog(
                        'Section 112', 
                        'LTCG (Property)', 
                        reTax, 
                        null, 
                        `New Rule (Bought > Jul '24): Flat 12.5%. Taxable Gain: ₹${TaxUtils.formatCurrency(gainNoIndex)}`
                    );
                }
            }
            
            ltcgTax += reTax;
        }

        totalTax = stcgTax + ltcgTax;

        return {
            stcg: stcgTax,
            ltcg: ltcgTax,
            total: totalTax
        };
    }

    /**
     * Add entry to calculation log
     * @param {string} deductionType - 'investment', 'expense', 'exemption', or 'neutral'
     */
    addLog(section, item, amount, limit, explanation, taxSaved = null, deductionType = 'neutral') {
        this.log.push(TaxUtils.createLogEntry(section, item, amount, limit, explanation, taxSaved, deductionType));
    }
}

// Assign deduction methods from oldRegimeDeductions.js to prototype
// These methods use 'this' and work correctly when called via the class instance
if (typeof window !== 'undefined' && window.OldRegimeDeductionMethods) {
    Object.assign(OldRegimeCalculator.prototype, window.OldRegimeDeductionMethods);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OldRegimeCalculator;
}
