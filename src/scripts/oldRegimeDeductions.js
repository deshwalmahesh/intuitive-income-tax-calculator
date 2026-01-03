/**
 * OLD REGIME DEDUCTIONS MODULE
 * Extracted deduction calculation methods for OldRegimeCalculator
 * These are assigned to OldRegimeCalculator.prototype in oldRegime.js
 */

// Calculate 80GGA Scientific Research Donations
function calculate80GGA(userData) {
        let total = 0;
        
        // 1. Static Input (from main form)
        const staticInput = TaxUtils.validateNumber(userData.scientificResearchDonation);
        const staticMode = userData.scientificDonationPaymentMode || 'online';
        
        if (staticInput > 0) {
             if (staticMode === 'cash' && staticInput > 2000) {
                this.addLog(
                    'Section 80GGA',
                    'Scientific Research (Static)',
                    0,
                    2000,
                    `Cash limit exceeded for scientific research donation (${TaxUtils.formatCurrency(staticInput)}). Max allowed cash is ₹2,000.`,
                    0
                );
             } else {
                 total += staticInput;
             }
        }

        // 2. Dynamic Input (from donations list)
        const donations = userData.donations || [];
        const researchDonations = donations.filter(d => d.category === 'approvedResearch' && d.amount > 0);
        
        for (const donation of researchDonations) {
            // Cash check (> 2000 not allowed)
             if (donation.paymentMode === 'cash' && donation.amount > 2000) {
                this.addLog(
                    'Section 80GGA',
                    'Scientific Research (Dynamic)',
                    0,
                    2000,
                    `Cash limit exceeded for scientific research donation (${TaxUtils.formatCurrency(donation.amount)}). Max allowed cash is ₹2,000.`,
                    0
                );
                continue;
             }
             total += donation.amount;
        }

        if (total > 0) {
            this.addLog(
                'Section 80GGA',
                'Scientific Research Donation',
                total,
                null,
                `100% deduction for donations to approved scientific research institutions.`,
                total * 0.30,
                'expense'
            );
        }

        return total;
    }

// Calculate 80GGC Political Party Donations
function calculate80GGC(userData) {
        // Collect from dynamic donations list
        const donations = userData.donations || [];
        let total = 0;
        
        // Filter specifically for politicalParty category
        const politicalDonations = donations.filter(d => d.category === 'politicalParty' && d.amount > 0);
        
        for (const donation of politicalDonations) {
            // STRICT VALIDATION: No cash allowed
            if (donation.paymentMode === 'cash') {
                this.addLog(
                    'Section 80GGC Warning',
                    'Political Donation Rejected',
                    0,
                    null,
                    `Cash donation of ${TaxUtils.formatCurrency(donation.amount)} to political party is NOT allowed. Must be via cheque/online.`,
                    0,
                    'expense'
                );
                continue;
            }
            total += donation.amount;
        }
        
        if (total > 0) {
            this.addLog(
                'Section 80GGC',
                'Political Party Donation',
                total,
                null,
                `100% deduction for non-cash donations to registered political parties.`,
                total * 0.30,
                'expense'
            );
        }
        
        return total;
    }

// Calculate Interest Deduction (80TTA/80TTB)
function calculateInterestDeduction(userData, ageCategory) {
        const savingsInterest = TaxUtils.validateNumber(userData.savingsInterest);
        const fdInterest = TaxUtils.validateNumber(userData.fdInterest);
        
        if (TaxUtils.isSeniorCitizen(ageCategory)) {
            // 80TTB - Seniors get ₹50,000 deduction on all interest income
            // NOTE: NOT increased in Budget 2025 (consolidated.md was wrong)
            const ttbConfig = this.deductionConfig.section80TTB;
            const totalInterest = savingsInterest + fdInterest;
            const deduction = Math.min(totalInterest, ttbConfig.maxLimit);
            
            if (totalInterest > 0) {
                this.addLog(
                    'Section 80TTB',
                    'Interest Deduction (Senior)',
                    deduction,
                    ttbConfig.maxLimit,
                    `Senior citizens: ALL interest (savings + FD + RD) deductible up to ₹50,000.`,
                    deduction * 0.30
                );
            }
            
            return deduction;
        } else {
            // 80TTA - Non-seniors get ₹10,000 on savings only
            const ttaConfig = this.deductionConfig.section80TTA;
            const deduction = Math.min(savingsInterest, ttaConfig.maxLimit);
            
            if (savingsInterest > 0) {
                this.addLog(
                    'Section 80TTA',
                    'Savings Interest Deduction',
                    deduction,
                    ttaConfig.maxLimit,
                    `Non-seniors: Only SAVINGS account interest deductible, up to ₹10,000. FD interest NOT included.`,
                    deduction * 0.30
                );
            }
            
            return deduction;
        }
    }

// Calculate 80GG Rent Deduction
function calculate80GGDeductions(userData, grossTotalIncome) {
        const rentPaid = TaxUtils.validateNumber(userData.rentPaid);
        if (rentPaid === 0) return 0;
        
        const ggConfig = this.deductionConfig.section80GG;
        const ati = grossTotalIncome;  // Adjusted Total Income
        
        const option1 = ggConfig.yearlyMax;  // ₹60,000 per year
        const option2 = ati * ggConfig.limits.percentOfATI;  // 25% of ATI
        const option3 = rentPaid - (ati * 0.10);  // Rent - 10% of ATI
        
        const deduction = TaxUtils.leastOf(option1, option2, Math.max(0, option3));
        
        this.addLog(
            'Section 80GG',
            'Rent Deduction (No HRA)',
            deduction,
            ggConfig.yearlyMax,
            `For those NOT receiving HRA. Least of: ₹60K/year, 25% of income, or (Rent - 10% income). Form 10BA required.`
        );
        
        return deduction;
    }


// Calculate 80G Donation Deductions
function calculate80GDeductions(userData, grossTotalIncome) {
        const donations = userData.donations || [];
        if (!Array.isArray(donations) || donations.length === 0) {
            return 0;
        }
        
        const gConfig = this.deductionConfig.section80G;
        let totalDeduction = 0;
        
        // Calculate Adjusted Gross Total Income (AGTI) for qualifying limit
        // AGTI = GTI - LTCG - STCG - other deductions
        const agti = grossTotalIncome * 0.90;  // Simplified approximation
        const qualifyingLimit = agti * 0.10;  // 10% of AGTI
        
        let qualifyingDonationsTotal = 0;
        const details = [];
        
        for (const donation of donations) {
            const amount = TaxUtils.validateNumber(donation.amount);
            const category = donation.category;
            const paymentMode = donation.paymentMode || 'online';
            
            // Skip Political Party (80GGC) and Scientific Research (80GGA)
            // They are handled in their own dedicated functions
            if (category === 'politicalParty' || category === 'approvedResearch') {
                continue;
            }
            
            // Cash > ₹2000 not allowed
            if (paymentMode === 'cash' && amount > gConfig.cashLimit) {
                this.addLog(
                    'Section 80G Warning',
                    'Cash Donation Limit Exceeded',
                    0,
                    gConfig.cashLimit,
                    `Cash donation of ${TaxUtils.formatCurrency(amount)} exceeds ₹2,000 limit. NOT ELIGIBLE for deduction. Use cheque/online.`,
                    0,
                    'expense'
                );
                continue;
            }
            
            // Determine category and calculate deduction
            let deductionPercent = 0;
            let hasQualifyingLimit = false;
            let categoryLabel = '50% (Subject to Limit)';
            
            if (gConfig.categories.fullNoLimit.items.some(i => i.id === category)) {
                deductionPercent = 1.0;
                hasQualifyingLimit = false;
                categoryLabel = '100% (No Limit)';
            } else if (gConfig.categories.halfNoLimit.items.some(i => i.id === category)) {
                deductionPercent = 0.5;
                hasQualifyingLimit = false;
                categoryLabel = '50% (No Limit)';
            } else if (gConfig.categories.fullWithLimit.items.some(i => i.id === category)) {
                deductionPercent = 1.0;
                hasQualifyingLimit = true;
                categoryLabel = '100% (Subject to Limit)';
            } else {
                // Default: 50% with qualifying limit (most NGOs)
                deductionPercent = 0.5;
                hasQualifyingLimit = true;
                categoryLabel = '50% (Subject to Limit)';
            }
            
            let deduction = amount * deductionPercent;
            
            // Store detail for log
            details.push(`${categoryLabel}: ${TaxUtils.formatCurrency(amount)} → ${TaxUtils.formatCurrency(deduction)}`);
            
            if (hasQualifyingLimit) {
                qualifyingDonationsTotal += deduction;
                // Will be capped at 10% of AGTI
            } else {
                totalDeduction += deduction;
            }
        }
        
        // Apply qualifying limit cap
        const cappedQualifying = Math.min(qualifyingDonationsTotal, qualifyingLimit);
        totalDeduction += cappedQualifying;
        
        // Add detailed logs
        if (donations.length > 0) {
            let explanation = `Donations Breakdown: ${details.join(' | ')}.`;
            
            if (qualifyingDonationsTotal > 0) {
                explanation += ` Qualifying Donations Total: ${TaxUtils.formatCurrency(qualifyingDonationsTotal)}.`;
                if (qualifyingDonationsTotal > qualifyingLimit) {
                    explanation += ` CAPPED at 10% of Adjusted Income (${TaxUtils.formatCurrency(qualifyingLimit)}).`;
                }
            } else {
                explanation += ` Total Deductible: ${TaxUtils.formatCurrency(totalDeduction)}`;
            }
            
            this.addLog(
                'Section 80G',
                'Charitable Donations',
                totalDeduction,
                null,
                explanation,
                totalDeduction * 0.30,
                'expense'
            );
        }
        
        return totalDeduction;
    }

// Calculate 80D Health Insurance Deductions
function calculate80DDeductions(userData, ageCategory) {
        const dConfig = this.deductionConfig.section80D;
        let total = 0;
        
        // Self + Family premium
        const selfPremium = TaxUtils.validateNumber(userData.healthInsuranceSelf);
        const selfLimit = dConfig.limits.self[ageCategory];
        const selfDeduction = Math.min(selfPremium, selfLimit);
        total += selfDeduction;
        
        // Parents premium
        const parentsPremium = TaxUtils.validateNumber(userData.healthInsuranceParents);
        const parentsAgeCategory = userData.parentsAgeCategory || 'below60';
        const parentsLimit = dConfig.limits.parents[parentsAgeCategory];
        const parentsDeduction = Math.min(parentsPremium, parentsLimit);
        total += parentsDeduction;
        
        // Preventive health checkup (within above limits, not extra)
        const checkup = TaxUtils.validateNumber(userData.preventiveCheckup);
        const checkupDeduction = Math.min(checkup, dConfig.preventiveHealthCheckup);
        // Checkup is INCLUDED in above limits, not additional
        
        if (selfPremium > 0 || parentsPremium > 0) {
            this.addLog(
                'Section 80D',
                'Health Insurance Premium',
                total,
                selfLimit + parentsLimit,
                `Self/Family: ${TaxUtils.formatCurrency(selfDeduction)} (limit ${TaxUtils.formatCurrency(selfLimit)}). Parents: ${TaxUtils.formatCurrency(parentsDeduction)} (limit ${TaxUtils.formatCurrency(parentsLimit)}). Preventive checkup included within limits.`,
                total * 0.30
            );
        }
        
        return total;
    }

// Calculate 80C Pool Deductions
function calculate80CDeductions(userData) {
        const items = [];
        let total = 0;
        const maxLimit = this.deductionConfig.section80C.maxLimit;
        
        // EPF
        const epf = TaxUtils.validateNumber(userData.epfContribution);
        if (epf > 0) {
            items.push({ id: 'epf', name: 'EPF Contribution', amount: epf });
            total += epf;
        }
        
        // PPF
        const ppf = TaxUtils.validateNumber(userData.ppfContribution);
        if (ppf > 0) {
            items.push({ id: 'ppf', name: 'PPF Contribution', amount: Math.min(ppf, 150000) });
            total += Math.min(ppf, 150000);
        }
        
        // ELSS
        const elss = TaxUtils.validateNumber(userData.elssInvestment);
        if (elss > 0) {
            items.push({ id: 'elss', name: 'ELSS Mutual Funds', amount: elss });
            total += elss;
        }
        
        // Life Insurance Premium
        const lic = TaxUtils.validateNumber(userData.lifeInsurancePremium);
        if (lic > 0) {
            items.push({ id: 'lic', name: 'Life Insurance Premium', amount: lic });
            total += lic;
        }
        
        // NSC
        const nsc = TaxUtils.validateNumber(userData.nscInvestment);
        if (nsc > 0) {
            items.push({ id: 'nsc', name: 'NSC Investment', amount: nsc });
            total += nsc;
        }
        
        // SCSS
        const scss = TaxUtils.validateNumber(userData.scssInvestment);
        if (scss > 0) {
            items.push({ id: 'scss', name: 'Senior Citizens Savings Scheme', amount: scss });
            total += scss;
        }
        
        // Tax Saver FD
        const taxSaverFD = TaxUtils.validateNumber(userData.taxSaverFD);
        if (taxSaverFD > 0) {
            items.push({ id: 'fd', name: 'Tax Saver FD (5-year)', amount: taxSaverFD });
            total += taxSaverFD;
        }
        
        // Sukanya Samriddhi
        const ssy = TaxUtils.validateNumber(userData.sukanyaSamriddhi);
        if (ssy > 0) {
            items.push({ id: 'ssy', name: 'Sukanya Samriddhi Yojana', amount: ssy });
            total += ssy;
        }
        
        // Tuition Fees (max 2 children)
        const tuition = TaxUtils.validateNumber(userData.tuitionFees);
        if (tuition > 0) {
            items.push({ id: 'tuition', name: 'Tuition Fees (max 2 children)', amount: tuition });
            total += tuition;
        }
        
        // Home Loan Principal
        const homeLoanPrincipal = TaxUtils.validateNumber(userData.homeLoanPrincipal);
        if (homeLoanPrincipal > 0) {
            items.push({ id: 'principal', name: 'Home Loan Principal', amount: homeLoanPrincipal });
            total += homeLoanPrincipal;
        }
        
        // NPS Tier-1 (within 80C pool, max 10% of salary)
        const nps = TaxUtils.validateNumber(userData.npsContribution);
        const salary = TaxUtils.validateNumber(userData.grossSalary);
        const npsMax = Math.min(nps, salary * 0.10, 150000);
        if (nps > 0) {
            items.push({ id: 'nps', name: 'NPS Tier-1 (80CCD(1))', amount: npsMax });
            total += npsMax;
        }
        
        // Stamp Duty (one-time)
        const stampDuty = TaxUtils.validateNumber(userData.stampDuty);
        if (stampDuty > 0) {
            items.push({ id: 'stamp', name: 'Stamp Duty & Registration', amount: stampDuty });
            total += stampDuty;
        }
        
        // Cap at ₹1.5L
        const cappedTotal = Math.min(total, maxLimit);
        
        // Log details
        if (items.length > 0) {
            const itemsList = items.map(i => `${i.name}: ${TaxUtils.formatCurrency(i.amount)}`).join(', ');
            this.addLog(
                'Section 80C',
                '80C Investment Pool',
                cappedTotal,
                maxLimit,
                `Combined investments: ${itemsList}. Total: ${TaxUtils.formatCurrency(total)}, Capped at: ${TaxUtils.formatCurrency(maxLimit)}.`,
                cappedTotal * 0.30
            );
        }
        
        return {
            items,
            rawTotal: total,
            total: cappedTotal,
            utilized: cappedTotal,
            remaining: maxLimit - cappedTotal
        };
    }

// Calculate Chapter VI-A Deductions
function calculateDeductions(userData, ageCategory, grossTotalIncome) {
        const breakdown = {};
        
        // =====================
        // SECTION 80C POOL - ₹1.5L Combined Limit
        // =====================
        const section80C = this.calculate80CDeductions(userData);
        breakdown.section80C = section80C.total;
        
        // =====================
        // SECTION 80CCD(1B) - Additional ₹50K NPS
        // =====================
        const npsExtra = TaxUtils.validateNumber(userData.npsExtraContribution);
        breakdown.section80CCD1B = Math.min(npsExtra, this.deductionConfig.section80CCD1B.maxLimit);
        
        if (npsExtra > 0) {
            this.addLog(
                'Section 80CCD(1B)',
                'Additional NPS Contribution',
                breakdown.section80CCD1B,
                50000,
                'EXTRA ₹50,000 deduction for NPS Tier-1, OVER AND ABOVE the 80C limit. Maximum savings!',
                breakdown.section80CCD1B * 0.30,
                'investment'  // Green - builds retirement corpus
            );
        }
        
        // =====================
        // SECTION 80CCD(2) - Employer NPS
        // =====================
        const employerNPS = TaxUtils.validateNumber(userData.employerNPSContribution);
        const basicDA = TaxUtils.validateNumber(userData.basicPlusDA) || 
                        TaxUtils.validateNumber(userData.grossSalary) * 0.5;
        const employerType = userData.employerType || 'private';
        const maxEmployerPercent = this.deductionConfig.section80CCD2.limits.oldRegime[employerType] || 0.10;
        const maxEmployerNPS = basicDA * maxEmployerPercent;
        
        breakdown.section80CCD2 = Math.min(employerNPS, maxEmployerNPS);
        
        if (employerNPS > 0) {
            this.addLog(
                'Section 80CCD(2)',
                'Employer NPS Contribution',
                breakdown.section80CCD2,
                maxEmployerNPS,
                `Employer's NPS contribution. Limit: ${TaxUtils.formatPercent(maxEmployerPercent)} of Basic+DA for ${employerType} employees. NO overall cap!`,
                breakdown.section80CCD2 * 0.30,
                'investment'  // Green - builds retirement corpus
            );
        }
        
        // =====================
        // SECTION 80D - Health Insurance
        // =====================
        breakdown.section80D = this.calculate80DDeductions(userData, ageCategory);
        
        // =====================
        // SECTION 80DD - Dependent Disability
        // =====================
        const dependentDisability = userData.dependentDisabilityLevel;
        if (dependentDisability) {
            const ddLimit = this.deductionConfig.section80DD.limits[dependentDisability] || 0;
            breakdown.section80DD = ddLimit;
            
            this.addLog(
                'Section 80DD',
                'Dependent with Disability',
                ddLimit,
                null,
                `Flat deduction for maintaining disabled dependent. ${dependentDisability === '80plus' ? 'Severe (80%+)' : 'Normal (40-79%)'} disability: ${TaxUtils.formatCurrency(ddLimit)}.`
            );
        } else {
            breakdown.section80DD = 0;
        }
        
        // =====================
        // SECTION 80DDB - Medical Treatment
        // =====================
        const medicalExpenses = TaxUtils.validateNumber(userData.specifiedDiseaseExpenses);
        if (medicalExpenses > 0) {
            const ddbLimit = this.deductionConfig.section80DDB.limits[ageCategory];
            breakdown.section80DDB = Math.min(medicalExpenses, ddbLimit);
            
            this.addLog(
                'Section 80DDB',
                'Specified Disease Treatment',
                breakdown.section80DDB,
                ddbLimit,
                `Treatment for neurological diseases, cancer, AIDS, renal failure, etc. Limit: ${TaxUtils.formatCurrency(ddbLimit)} for your age. Requires specialist prescription.`
            );
        } else {
            breakdown.section80DDB = 0;
        }
        
        // =====================
        // SECTION 80E - Education Loan Interest
        // =====================
        const educationLoanInterest = TaxUtils.validateNumber(userData.educationLoanInterest);
        breakdown.section80E = educationLoanInterest;  // NO LIMIT!
        
        if (educationLoanInterest > 0) {
            this.addLog(
                'Section 80E',
                'Education Loan Interest',
                educationLoanInterest,
                null,
                'UNLIMITED deduction for education loan interest! Available for 8 years from first repayment. For self, spouse, or children.',
                educationLoanInterest * 0.30
            );
        }

        // =====================
        // SECTION 80EE - Home Loan Interest (Legacy)
        // =====================
        const eeInterest = TaxUtils.validateNumber(userData.section80EEInterest);
        if (eeInterest > 0) {
            const eeLimit = this.config.deductions?.section80EE?.maxLimit || 50000;
            breakdown.section80EE = Math.min(eeInterest, eeLimit);
            
            this.addLog(
                'Section 80EE',
                'Home Loan Interest (Legacy)',
                breakdown.section80EE,
                eeLimit,
                `Additional deduction for loans sanctioned FY 16-17. Max ₹50,000.`
            );
        } else {
            breakdown.section80EE = 0;
        }

        // =====================
        // SECTION 80EEA - Affordable Housing Interest (Legacy)
        // =====================
        const eeaInterest = TaxUtils.validateNumber(userData.section80EEAInterest);
        if (eeaInterest > 0) {
            // Cannot claim if 80EE is claimed
            if (breakdown.section80EE > 0) {
                breakdown.section80EEA = 0;
                this.addLog(
                    'Section 80EEA',
                    'Affordable Housing Interest',
                    0,
                    null,
                    'Cannot claim 80EEA if 80EE is already claimed. Mutually exclusive.'
                );
            } else {
                const eeaLimit = this.config.deductions?.section80EEA?.maxLimit || 150000;
                breakdown.section80EEA = Math.min(eeaInterest, eeaLimit);
                
                this.addLog(
                    'Section 80EEA',
                    'Affordable Housing Interest',
                    breakdown.section80EEA,
                    eeaLimit,
                    `Additional deduction for affordable housing loans sanctioned FY 19-22. Max ₹1.5L.`
                );
            }
        } else {
            breakdown.section80EEA = 0;
        }
        
        // =====================
        // SECTION 80EEB - EV Loan Interest (Legacy)
        // =====================
        const evLoanInterest = TaxUtils.validateNumber(userData.section80EEBInterest);
        if (evLoanInterest > 0) {
            const eebLimit = this.config.deductions?.section80EEB?.maxLimit || 150000;
            breakdown.section80EEB = Math.min(evLoanInterest, eebLimit);
            
            this.addLog(
                'Section 80EEB',
                'EV Loan Interest (Legacy)',
                breakdown.section80EEB,
                eebLimit,
                `Interest on Electric Vehicle Loan. Max ₹1.5L. Valid for loans sanctioned Apr'19-Mar'23.`
            );
        } else {
            breakdown.section80EEB = 0;
        }

        // =====================
        // SECTION 80CCH - Agniveer Corpus (Available in BOTH regimes)
        // =====================
        const agniveerCorpus = TaxUtils.validateNumber(userData.agniveerContribution);
        if (agniveerCorpus > 0) {
            breakdown.section80CCH = agniveerCorpus;
            
            this.addLog(
                'Section 80CCH',
                'Agniveer Corpus Contribution',
                breakdown.section80CCH,
                null,
                'Full deduction for contribution to Agniveer Corpus Fund (Self + Govt).'
            );
        } else {
            breakdown.section80CCH = 0;
        }

        // =====================
        // SECTION 80G - Donations
        // =====================
        breakdown.section80G = this.calculate80GDeductions(userData, grossTotalIncome);
        
        // =====================
        // SECTION 80GGC - Political Party Donations
        // =====================
        // =====================
        // SECTION 80GGC - Political Party Donations
        // =====================
        // Now handled by internal calculation from raw donations list
        breakdown.section80GGC = this.calculate80GGC(userData);
        
        // =====================
        // SECTION 80GGA - Scientific Research/Rural Development
        // =====================
        // =====================
        // SECTION 80GGA - Scientific Research/Rural Development
        // =====================
        // Now handled by internal calculation (combining static + dynamic inputs)
        breakdown.section80GGA = this.calculate80GGA(userData);
        
        // =====================
        // SECTION 80GG - Rent (if no HRA)
        // =====================
        if (TaxUtils.validateNumber(userData.hraReceived) === 0) {
            breakdown.section80GG = this.calculate80GGDeductions(userData, grossTotalIncome);
        } else {
            breakdown.section80GG = 0;
        }
        
        // =====================
        // SECTION 80TTA / 80TTB - Interest Deduction
        // =====================
        breakdown.interestDeduction = this.calculateInterestDeduction(userData, ageCategory);
        
        // =====================
        // SECTION 80U - Self Disability
        // =====================
        const selfDisability = userData.selfDisabilityLevel;
        if (selfDisability) {
            const uLimit = this.deductionConfig.section80U.limits[selfDisability] || 0;
            breakdown.section80U = uLimit;
            
            this.addLog(
                'Section 80U',
                'Self with Disability',
                uLimit,
                null,
                `Flat deduction if you have certified disability. ${selfDisability === '80plus' ? 'Severe (80%+)' : 'Normal (40-79%)'}: ${TaxUtils.formatCurrency(uLimit)}.`
            );
        } else {
            breakdown.section80U = 0;
        }
        
        // =====================
        // SECTION 24(b) - Home Loan Interest
        // =====================
        const homeLoanInterest = TaxUtils.validateNumber(userData.homeLoanInterest);
        const isLetOut = userData.isPropertyLetOut === true;
        const sec24bLimit = isLetOut ? null : this.deductionConfig.section24b.limits.selfOccupied;
        
        if (homeLoanInterest > 0) {
            breakdown.section24b = sec24bLimit ? Math.min(homeLoanInterest, sec24bLimit) : homeLoanInterest;
            
            this.addLog(
                'Section 24(b)',
                'Home Loan Interest',
                breakdown.section24b,
                sec24bLimit,
                isLetOut 
                    ? `Let-out property: UNLIMITED interest deduction (${TaxUtils.formatCurrency(homeLoanInterest)}).`
                    : `Self-occupied property: Max ₹2,00,000 deduction. Interest paid: ${TaxUtils.formatCurrency(homeLoanInterest)}.`,
                breakdown.section24b * 0.30
            );
        } else {
            breakdown.section24b = 0;
        }
        
        // Calculate total deductions
        breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        
        this.addLog(
            'Total Deductions',
            'Chapter VI-A + Other Deductions',
            breakdown.total,
            null,
            'Sum of all deductions: 80C pool, NPS, health insurance, home loan, education loan, donations, disabilities, and more.'
        );
        
        return breakdown;
}

// Export all methods for prototype assignment
const OldRegimeDeductionMethods = {
    calculateDeductions,
    calculate80CDeductions,
    calculate80DDeductions,
    calculate80GDeductions,
    calculate80GGDeductions,
    calculateInterestDeduction,
    calculate80GGC,
    calculate80GGA
};

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.OldRegimeDeductionMethods = OldRegimeDeductionMethods;
}
