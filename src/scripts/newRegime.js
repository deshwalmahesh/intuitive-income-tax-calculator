/**
 * NEW REGIME TAX CALCULATOR - Section 115BAC
 * FY 2025-26 (AY 2026-27)
 * 
 * Class-based calculator with detailed logging for each calculation step.
 * 
 * Key Features:
 * - Same slabs for all ages
 * - Limited deductions (only 80CCD(2), standard deduction, professional tax)
 * - ₹75,000 standard deduction
 * - 87A rebate up to ₹60,000 (if income ≤ ₹12L)
 * - Marginal relief for income slightly above ₹12L
 * - Surcharge capped at 25%
 * 
 * References:
 * - Finance Act 2025, Section 115BAC
 * - incometaxindia.gov.in
 */

class NewRegimeCalculator {
    /**
     * Initialize calculator with configuration
     * @param {Object} config - TAX_CONFIG object
     */
    constructor(config) {
        this.config = config;
        this.regimeConfig = config.newRegime;
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
        
        // Step 1: Calculate Gross Total Income
        const grossIncome = this.calculateGrossIncome(userData);
        
        // Step 2: Calculate allowable deductions (very limited in new regime)
        const deductions = this.calculateDeductions(userData);
        
        // Step 3: Calculate Taxable Income
        const taxableIncome = Math.max(0, grossIncome.total - deductions.total);
        
        this.addLog(
            'Taxable Income',
            'Net Taxable Income',
            taxableIncome,
            null,
            `Gross Income (${TaxUtils.formatCurrency(grossIncome.total)}) - Total Deductions (${TaxUtils.formatCurrency(deductions.total)}) = ${TaxUtils.formatCurrency(taxableIncome)}`
        );

        // Step 4: Calculate tax using slabs
        const slabTax = this.calculateSlabTax(taxableIncome);
        
        // Step 5: Apply 87A Rebate
        const rebate = this.calculateRebate(taxableIncome, slabTax.tax);
        
        // Step 6: Apply Marginal Relief (if applicable)
        const afterMarginalRelief = this.applyMarginalRelief(taxableIncome, slabTax.tax, rebate);
        
        // Step 7: Calculate Surcharge
        const surcharge = this.calculateSurcharge(grossIncome.total, afterMarginalRelief.tax);
        
        // Step 8: Calculate Cess
        const cess = this.calculateCess(afterMarginalRelief.tax + surcharge.amount);
        
        // Step 9: Calculate Capital Gains Tax separately
        const capitalGainsTax = this.calculateCapitalGainsTax(userData);
        
        // Step 10: Section 89 Relief
        const section89Relief = TaxUtils.validateNumber(userData.section89Relief);
        if (section89Relief > 0) {
            this.addLog(
                'Section 89',
                'Relief for Arrears',
                section89Relief,
                null,
                `Relief u/s 89 reduced from tax liability. Ensure Form 10E is filed.`,
                section89Relief
            );
        }

        // Step 11: Final Tax
        let finalTax = afterMarginalRelief.tax + surcharge.amount + cess.amount + capitalGainsTax.total;
        finalTax = Math.max(0, finalTax - section89Relief);

        this.addLog(
            'Final Tax',
            'Total Tax Payable',
            finalTax,
            null,
            `Tax after rebate (${TaxUtils.formatCurrency(afterMarginalRelief.tax)}) + Surcharge (${TaxUtils.formatCurrency(surcharge.amount)}) + Cess (${TaxUtils.formatCurrency(cess.amount)}) + Capital Gains Tax (${TaxUtils.formatCurrency(capitalGainsTax.total)})`
        );

        return {
            regime: 'new',
            regimeName: 'New Tax Regime (Section 115BAC)',
            grossIncome,
            deductions,
            taxableIncome,
            slabTax,
            rebate,
            marginalRelief: afterMarginalRelief.marginalRelief,
            surcharge,
            cess,
            capitalGainsTax,
            section89Relief: section89Relief > 0 ? section89Relief : 0,
            finalTax: TaxUtils.roundToRupee(finalTax),
            effectiveRate: grossIncome.total > 0 ? (finalTax / grossIncome.total) : 0,
            log: this.log
        };
    }

    /**
     * Calculate Gross Total Income
     * @param {Object} userData - User input data
     * @returns {Object} Income breakdown
     */
    calculateGrossIncome(userData) {
        const breakdown = {};
        
        // Salary Income
        breakdown.salary = TaxUtils.validateNumber(userData.grossSalary);
        
        // Interest Income (not deductible in new regime)
        breakdown.savingsInterest = TaxUtils.validateNumber(userData.savingsInterest);
        breakdown.fdInterest = TaxUtils.validateNumber(userData.fdInterest);
        
        // Dividend Income
        breakdown.dividend = TaxUtils.validateNumber(userData.dividendIncome);
        
        // Rental Income (after 30% standard deduction AND Interest for Let-Out)
        const grossRental = TaxUtils.validateNumber(userData.rentalIncome);
        const isLetOut = userData.isPropertyLetOut === true;
        const homeLoanInterest = TaxUtils.validateNumber(userData.homeLoanInterest);
        
        // Standard Deduction @ 30%
        let netRental = grossRental * 0.70;
        
        // Interest Deduction (ONLY if Let-Out property in New Regime)
        // Self-occupied interest is NOT deductible in New Regime
        if (isLetOut && homeLoanInterest > 0) {
            netRental -= homeLoanInterest;
        }
        
        // New Regime: Loss from House Property CANNOT be set off against other heads
        // So we floor the income at 0
        breakdown.rental = Math.max(0, netRental);
        
        if (grossRental > 0 || (isLetOut && homeLoanInterest > 0)) {
            this.addLog(
                'House Property',
                'Rental Income',
                breakdown.rental,
                null,
                isLetOut 
                    ? `Gross Rent (${TaxUtils.formatCurrency(grossRental)}) - 30% Std Ded - Interest (${TaxUtils.formatCurrency(homeLoanInterest)}) = ${TaxUtils.formatCurrency(netRental)}. (Loss set-off NOT allowed in New Regime, so floored at 0)`
                    : `Gross Rent: ${TaxUtils.formatCurrency(grossRental)} - 30% Standard Deduction. Self-occupied interest NOT deductible.`
            );
        }
        
        // Family Pension (if any)
        const familyPension = TaxUtils.validateNumber(userData.familyPension);
        breakdown.familyPension = familyPension;
        
        // Gifts from non-relatives (taxable if > ₹50,000 aggregate)
        const gifts = TaxUtils.validateNumber(userData.nonRelativeGifts);
        breakdown.gifts = gifts > 50000 ? gifts : 0;
        
        if (gifts > 0 && gifts <= 50000) {
            this.addLog(
                'Gifts',
                'Non-Relative Gifts',
                0,
                50000,
                `Gifts of ${TaxUtils.formatCurrency(gifts)} are exempt (aggregate ≤ ₹50,000)`
            );
        }
        
        // Other income
        breakdown.other = TaxUtils.validateNumber(userData.otherIncome);
        
        // NOTE: Agricultural income is FULLY EXEMPT - not added to total
        const agriculturalIncome = TaxUtils.validateNumber(userData.agriculturalIncome);
        if (agriculturalIncome > 0) {
            this.addLog(
                'Section 10(1)',
                'Agricultural Income',
                0,
                null,
                `Agricultural income of ${TaxUtils.formatCurrency(agriculturalIncome)} is 100% TAX-FREE. Not included in taxable income.`,
                this.estimateTaxSaved(agriculturalIncome, 0.30)  // Assume 30% marginal rate
            );
        }
        
        // Calculate total
        breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        
        this.addLog(
            'Gross Income',
            'Total Gross Income',
            breakdown.total,
            null,
            `Sum of all income sources (Salary, Interest, Dividend, Rental, etc.)`
        );
        
        return breakdown;
    }

    /**
     * Calculate deductions (very limited in New Regime)
     * @param {Object} userData - User input data
     * @returns {Object} Deductions breakdown
     */
    calculateDeductions(userData) {
        const breakdown = {};
        
        // Standard Deduction - ₹75,000 for salaried
        const salary = TaxUtils.validateNumber(userData.grossSalary);
        if (salary > 0) {
            breakdown.standardDeduction = this.regimeConfig.standardDeduction.salary;
            this.addLog(
                'Section 16(ia)',
                'Standard Deduction',
                breakdown.standardDeduction,
                75000,
                'Automatic ₹75,000 deduction for salaried individuals under New Regime (Budget 2025).',
                this.estimateTaxSaved(breakdown.standardDeduction, 0.30)
            );
        } else {
            breakdown.standardDeduction = 0;
        }
        
        // Family Pension Deduction - ₹25,000 or 1/3rd
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
                25000,
                `Least of ₹25,000 or 1/3rd of pension (${TaxUtils.formatCurrency(familyPension / 3)})`
            );
        } else {
            breakdown.familyPensionDeduction = 0;
        }
        
        // NOTE: Professional Tax (Section 16(iii)) is NOT available in New Regime
        // Verified via multiple web sources - cleartax.in, policybazaar.com
        breakdown.professionalTax = 0;
        
        // 80CCD(2) - Employer NPS Contribution
        // Available in BOTH regimes - 14% of salary for ALL employees in new regime
        const employerNPS = TaxUtils.validateNumber(userData.employerNPSContribution);
        const basicDA = TaxUtils.validateNumber(userData.basicPlusDA) || salary * 0.5;  // Default 50% as basic+DA
        const maxEmployerNPS = basicDA * this.config.deductions.section80CCD2.limits.newRegime.private;
        
        if (employerNPS > 0) {
            breakdown.employerNPS = Math.min(employerNPS, maxEmployerNPS);
            this.addLog(
                'Section 80CCD(2)',
                'Employer NPS Contribution',
                breakdown.employerNPS,
                maxEmployerNPS,
                `Employer's NPS contribution up to 14% of Basic+DA (${TaxUtils.formatCurrency(basicDA)}). This is the ONLY major deduction in New Regime!`,
                this.estimateTaxSaved(breakdown.employerNPS, 0.30)
            );
        } else {
            breakdown.employerNPS = 0;
        }
        
        // Agniveer Corpus - 80CCH (if applicable)
        const agniveerCorpus = TaxUtils.validateNumber(userData.agniveerContribution);
        if (agniveerCorpus > 0) {
            breakdown.agniveerCorpus = agniveerCorpus;
            this.addLog(
                'Section 80CCH',
                'Agniveer Corpus Contribution',
                agniveerCorpus,
                null,
                'Full amount contributed to Agniveer Corpus Fund is deductible in New Regime.'
            );
        } else {
            breakdown.agniveerCorpus = 0;
        }

        // Transport Allowance (Divyang) - Section 10(14)
        // Allowed in New Regime for disabled employees
        const transportReceived = TaxUtils.validateNumber(userData.transportAllowanceReceived);
        const isDivyang = userData.isDivyang === true;
        
        if (transportReceived > 0 && isDivyang) {
             const limitPerMonth = 3200; // Hardcoded or fetch from config
             // Better to fetch from config if possible, but safe to use verified value
             const exemptAmount = Math.min(transportReceived, limitPerMonth * 12);
             
             breakdown.transportAllowanceDivyang = exemptAmount;
             this.addLog(
                'Section 10(14)',
                'Transport Allowance (Divyang)',
                exemptAmount,
                null,
                `Exemption of ₹3200/month for Divyang employee. Total: ${TaxUtils.formatCurrency(exemptAmount)}`
             );
        } else {
            breakdown.transportAllowanceDivyang = 0;
        }
        
        // NOTE: Political donations (80GGC) are NOT allowed in New Regime
        // Verified via cleartax.in, policybazaar.com - 80GGC is OLD REGIME ONLY
        breakdown.politicalDonations = 0;
        
        // Calculate total deductions
        breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        
        this.addLog(
            'Total Deductions',
            'Sum of Allowed Deductions',
            breakdown.total,
            null,
            'New Regime allows very few deductions: Standard Deduction, Employer NPS (80CCD(2)), and Agniveer (80CCH). NO Professional Tax, 80C, 80D, HRA, or 80GGC.'
        );
        
        return breakdown;
    }

    /**
     * Calculate tax using slab rates
     * @param {number} taxableIncome - Taxable income after deductions
     * @returns {Object} Slab-wise tax breakdown
     */
    calculateSlabTax(taxableIncome) {
        const slabs = this.regimeConfig.slabs;
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
     * Calculate Section 87A Rebate
     * @param {number} taxableIncome - Taxable income
     * @param {number} tax - Calculated tax before rebate
     * @returns {Object} Rebate details
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
                `Taxable income (${TaxUtils.formatCurrency(taxableIncome)}) ≤ ₹12,00,000. Full rebate of ${TaxUtils.formatCurrency(rebateAmount)} applied. You pay ₹0 tax!`,
                rebateAmount
            );
            
            return {
                applicable: true,
                amount: rebateAmount,
                reason: `Income ≤ ₹12L qualifies for 87A rebate`
            };
        }
        
        return {
            applicable: false,
            amount: 0,
            reason: `Income > ₹12L does not qualify for 87A rebate`
        };
    }

    /**
     * Apply Marginal Relief for income slightly above ₹12L
     * Tax cannot exceed (Income - ₹12L)
     * @param {number} taxableIncome - Taxable income
     * @param {number} tax - Tax after slab calculation
     * @param {Object} rebate - Rebate object
     * @returns {Object} Tax after marginal relief
     */
    applyMarginalRelief(taxableIncome, tax, rebate) {
        const threshold = this.regimeConfig.marginalRelief.threshold;
        const taxAfterRebate = tax - rebate.amount;
        
        // Check if marginal relief applies
        if (taxableIncome > threshold && taxableIncome <= threshold + 500000) {
            const excessIncome = taxableIncome - threshold;
            
            // Tax on ₹12L = ₹60,000 (exactly equal to rebate limit)
            // So effective tax at ₹12L threshold = ₹0
            // Marginal relief ensures tax ≤ excess income
            
            if (taxAfterRebate > excessIncome) {
                const marginalReliefAmount = taxAfterRebate - excessIncome;
                
                this.addLog(
                    'Marginal Relief',
                    'Income Slightly Above ₹12L',
                    marginalReliefAmount,
                    null,
                    `Your income is ${TaxUtils.formatCurrency(excessIncome)} above ₹12L. Without relief, tax would be ${TaxUtils.formatCurrency(taxAfterRebate)}. With marginal relief, tax is capped at ${TaxUtils.formatCurrency(excessIncome)}.`,
                    marginalReliefAmount
                );
                
                return {
                    tax: excessIncome,
                    marginalRelief: marginalReliefAmount,
                    applicable: true
                };
            }
        }
        
        return {
            tax: taxAfterRebate,
            marginalRelief: 0,
            applicable: false
        };
    }

    /**
     * Calculate Surcharge
     * @param {number} totalIncome - Total income (before deductions)
     * @param {number} tax - Tax after rebate and marginal relief
     * @returns {Object} Surcharge details
     */
    calculateSurcharge(totalIncome, tax) {
        const surchargeRates = this.regimeConfig.surcharge;
        
        for (const slab of surchargeRates) {
            if (totalIncome > slab.min && totalIncome <= slab.max) {
                const surchargeAmount = TaxUtils.roundToRupee(tax * slab.rate);
                
                // Apply marginal relief for surcharge if applicable
                const marginalRelief = this.calculateSurchargeMarginalRelief(totalIncome, tax, surchargeAmount, slab);
                
                this.addLog(
                    'Surcharge',
                    slab.description,
                    marginalRelief.amount,
                    null,
                    `Income > ${TaxUtils.formatCurrency(slab.min)}: ${TaxUtils.formatPercent(slab.rate)} surcharge on tax. New Regime caps surcharge at 25% max.`
                );
                
                return {
                    applicable: true,
                    rate: slab.rate,
                    amount: marginalRelief.amount,
                    marginalReliefApplied: marginalRelief.applied
                };
            }
        }
        
        return {
            applicable: false,
            rate: 0,
            amount: 0,
            marginalReliefApplied: false
        };
    }

    /**
     * Calculate Surcharge Marginal Relief
     * Ensures tax+surcharge doesn't exceed income - threshold
     */
    calculateSurchargeMarginalRelief(totalIncome, tax, surcharge, slab) {
        const threshold = slab.min;
        const taxWithSurcharge = tax + surcharge;
        const taxWithoutSurcharge = tax;
        const excessIncome = totalIncome - threshold;
        
        // If jump in tax > excess income, apply relief
        if (taxWithSurcharge > taxWithoutSurcharge + excessIncome) {
            return {
                amount: excessIncome + taxWithoutSurcharge - taxWithoutSurcharge,  // Cap increase at excess
                applied: true
            };
        }
        
        return {
            amount: surcharge,
            applied: false
        };
    }

    /**
     * Calculate Health & Education Cess (4%)
     * @param {number} taxWithSurcharge - Tax + Surcharge
     * @returns {Object} Cess details
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
        
        return {
            rate: cessRate,
            amount: cessAmount
        };
    }

    /**
     * Calculate Capital Gains Tax
     * Same rates for both regimes
     * @param {Object} userData - User input data
     * @returns {Object} Capital gains tax breakdown
     */
    calculateCapitalGainsTax(userData) {
        let totalTax = 0;
        let stcgTax = 0;
        let ltcgTax = 0;
        
        // 1. STCG Equity (20%)
        let stcgEquity = TaxUtils.validateNumber(userData.stcgEquity);
        let stcl = TaxUtils.validateNumber(userData.stclCarryForward);
        
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
                `STCG: ₹${TaxUtils.formatCurrency(stcgEquity)} @ ${(rate*100).toFixed(0)}% = ${TaxUtils.formatCurrency(stcgTax)}`
            );
        }

        // 2. LTCG Equity (12.5% > 1.25L)
        let ltcgEquity = TaxUtils.validateNumber(userData.ltcgEquity);
        let ltcl = TaxUtils.validateNumber(userData.ltclCarryForward);
        
        if (ltcgEquity > 0 && stcl > 0) {
            const offset = Math.min(ltcgEquity, stcl);
            ltcgEquity -= offset;
            stcl -= offset;
            this.addLog('Loss Setoff', 'STCL vs LTCG', offset, null, `Offset remaining ₹${TaxUtils.formatCurrency(offset)} STCL against LTCG.`);
        }
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
                    `LTCG: ₹${TaxUtils.formatCurrency(taxable)} (above 1.25L) @ ${(rate*100).toFixed(1)}% = ${TaxUtils.formatCurrency(tax)}`
                );
            }
        }

        // 3. Real Estate LTCG
        const sale = TaxUtils.validateNumber(userData.realEstateSaleValue);
        const cost = TaxUtils.validateNumber(userData.realEstatePurchaseValue);
        
        if (sale > 0 && cost > 0) {
            const expenses = TaxUtils.validateNumber(userData.realEstateTransferExpenses);
            const purchaseDateStr = userData.realEstatePurchaseDate;
            let rawGain = Math.max(0, sale - cost - expenses);
            
            const invest54 = Math.min(TaxUtils.validateNumber(userData.investmentSec54), 100000000); 
            const invest54EC = Math.min(TaxUtils.validateNumber(userData.investmentSec54EC), 5000000); 
            const deposit = TaxUtils.validateNumber(userData.capitalGainDeposit);
            
            const totalExemption = invest54 + invest54EC + deposit;
            if (totalExemption > 0) {
                this.addLog('Exemptions', 'Sec 54/54EC', totalExemption, null, `Total Claimed Exemptions: ₹${TaxUtils.formatCurrency(totalExemption)}`);
            }

            let reTax = 0;
            const pDate = new Date(purchaseDateStr);
            const cutoffDate = new Date(this.config.capitalGains.realEstate.grandfatherDate);
            const isGrandfathered = pDate < cutoffDate;
            
            const gainNoIndex = Math.max(0, rawGain - totalExemption);
            const taxNoIndex = TaxUtils.roundToRupee(gainNoIndex * 0.125);
            
            if (isGrandfathered && !isNaN(pDate.getTime())) {
                const purchaseYear = pDate.getFullYear();
                const purchaseMonth = pDate.getMonth() + 1;
                const fyStart = purchaseMonth >= 4 ? purchaseYear : purchaseYear - 1;
                const fyKey = `${fyStart}-${(fyStart+1).toString().slice(-2)}`;
                const ciiMap = this.config.capitalGains.cii;
                const purchaseCII = ciiMap[fyKey] || 100; 
                const saleCII = 376; 
                
                const indexedCost = TaxUtils.roundToRupee(cost * (saleCII / purchaseCII));
                const gainIndex = Math.max(0, sale - indexedCost - expenses - totalExemption);
                const taxIndex = TaxUtils.roundToRupee(gainIndex * 0.20);
                
                if (taxIndex < taxNoIndex) {
                    reTax = taxIndex;
                    this.addLog('Section 112', 'LTCG (Property)', reTax, null, `Grandfathered: 20% w/ Indexation (Cost: ₹${TaxUtils.formatCurrency(indexedCost)}) is better.`);
                } else {
                    reTax = taxNoIndex;
                    this.addLog('Section 112', 'LTCG (Property)', reTax, null, `Grandfathered: 12.5% No-Indexation is better.`);
                }
            } else {
                reTax = taxNoIndex;
                if (gainNoIndex > 0) {
                     this.addLog('Section 112', 'LTCG (Property)', reTax, null, `New Rule: Flat 12.5%. Taxable Gain: ₹${TaxUtils.formatCurrency(gainNoIndex)}`);
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
     */
    addLog(section, item, amount, limit, explanation, taxSaved = null) {
        this.log.push(TaxUtils.createLogEntry(section, item, amount, limit, explanation, taxSaved));
    }

    /**
     * Estimate tax saved based on marginal rate
     */
    estimateTaxSaved(amount, marginalRate = 0.30) {
        return TaxUtils.roundToRupee(amount * marginalRate);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewRegimeCalculator;
}
