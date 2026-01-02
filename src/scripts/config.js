/**
 * TAX CONFIGURATION - FY 2025-26 (AY 2026-27)
 * 
 * This file contains ALL tax constants, slabs, limits, and rules.
 * Modular design: Easy to update for future financial years.
 * 
 * References:
 * - Income Tax Act, 1961
 * - Finance Act 2025 (Budget 2025)
 * - incometaxindia.gov.in
 * - cleartax.in/bajajfinserv.in (validated sources)
 */

const TAX_CONFIG = {
    // ============================================
    // FINANCIAL YEAR INFO
    // ============================================
    financialYear: '2025-26',
    assessmentYear: '2026-27',
    lastUpdated: '2026-01-01',

    // ============================================
    // USER PROFILE OPTIONS
    // Used to conditionally apply formulas
    // ============================================
    userProfileOptions: {
        employmentTypes: ['salaried', 'pensioner', 'unemployed'],
        employerTypes: ['private', 'government', 'psu'],
        ageCategories: [
            { id: 'below60', label: 'Below 60 years', minAge: 0, maxAge: 59 },
            { id: '60to80', label: '60 to 80 years (Senior Citizen)', minAge: 60, maxAge: 79 },
            { id: 'above80', label: 'Above 80 years (Super Senior)', minAge: 80, maxAge: 150 }
        ],
        residentialStatus: ['resident', 'nonResident', 'notOrdinaryResident']
    },

    // ============================================
    // NEW TAX REGIME - Section 115BAC
    // Same slabs for ALL ages (no senior citizen benefit)
    // Source: Finance Act 2025, Budget 2025
    // ============================================
    newRegime: {
        // Standard deduction for salaried individuals
        // Section 16(ia) - Increased to ₹75,000 in Budget 2025
        standardDeduction: {
            salary: 75000,
            familyPension: 25000  // Lower of ₹25,000 or 1/3rd of pension
        },

        // Basic exemption - Same for all ages under new regime
        basicExemption: 400000,  // ₹4L (increased from ₹3L in Budget 2025)

        // Tax Slabs - Section 115BAC (Finance Act 2025)
        // Verified from incometaxindia.gov.in
        slabs: [
            { min: 0, max: 400000, rate: 0.00, description: 'Up to ₹4,00,000' },
            { min: 400000, max: 800000, rate: 0.05, description: '₹4,00,001 to ₹8,00,000' },
            { min: 800000, max: 1200000, rate: 0.10, description: '₹8,00,001 to ₹12,00,000' },
            { min: 1200000, max: 1600000, rate: 0.15, description: '₹12,00,001 to ₹16,00,000' },
            { min: 1600000, max: 2000000, rate: 0.20, description: '₹16,00,001 to ₹20,00,000' },
            { min: 2000000, max: 2400000, rate: 0.25, description: '₹20,00,001 to ₹24,00,000' },
            { min: 2400000, max: Infinity, rate: 0.30, description: 'Above ₹24,00,000' }
        ],

        // Section 87A Rebate - Increased in Budget 2025
        rebate87A: {
            incomeLimit: 1200000,  // Rebate if taxable income ≤ ₹12L
            maxRebate: 60000       // Max rebate ₹60,000
        },

        // Marginal Relief for income slightly above ₹12L
        // Tax payable cannot exceed (Income - ₹12L)
        marginalRelief: {
            threshold: 1200000,
            applicable: true
        },

        // Surcharge rates - Capped at 25% for new regime
        // Source: Finance Act 2025
        surcharge: [
            { min: 5000000, max: 10000000, rate: 0.10, description: '10% for ₹50L - ₹1Cr' },
            { min: 10000000, max: 20000000, rate: 0.15, description: '15% for ₹1Cr - ₹2Cr' },
            { min: 20000000, max: Infinity, rate: 0.25, description: '25% for above ₹2Cr (capped)' }
        ],

        // Limited deductions available in New Regime
        // NOTE: Professional Tax (Section 16(iii)) is NOT allowed in New Regime - verified web search
        allowedDeductions: [
            '80CCD2',      // Employer NPS contribution - ONLY major deduction
            'standardDeduction',  // ₹75,000 for salaried
            'transportAllowanceDivyang',  // For disabled employees (Section 10(14))
            'agniveerCorpus',  // 80CCH
            'familyPensionDeduction'  // Lower of ₹25,000 or 1/3rd
        ]
    },

    // ============================================
    // OLD TAX REGIME
    // Different slabs based on age category
    // Source: Income Tax Act, 1961
    // ============================================
    oldRegime: {
        // Standard deduction - Section 16(ia)
        standardDeduction: {
            salary: 50000,
            familyPension: 15000  // Lower of ₹15,000 or 1/3rd of pension
        },

        // Age-based configurations
        ageCategories: {
            // Below 60 years - Individual/HUF
            below60: {
                basicExemption: 250000,  // ₹2.5L
                slabs: [
                    { min: 0, max: 250000, rate: 0.00, description: 'Up to ₹2,50,000' },
                    { min: 250000, max: 500000, rate: 0.05, description: '₹2,50,001 to ₹5,00,000' },
                    { min: 500000, max: 1000000, rate: 0.20, description: '₹5,00,001 to ₹10,00,000' },
                    { min: 1000000, max: Infinity, rate: 0.30, description: 'Above ₹10,00,000' }
                ]
            },

            // Senior Citizen (60-80 years)
            '60to80': {
                basicExemption: 300000,  // ₹3L
                slabs: [
                    { min: 0, max: 300000, rate: 0.00, description: 'Up to ₹3,00,000' },
                    { min: 300000, max: 500000, rate: 0.05, description: '₹3,00,001 to ₹5,00,000' },
                    { min: 500000, max: 1000000, rate: 0.20, description: '₹5,00,001 to ₹10,00,000' },
                    { min: 1000000, max: Infinity, rate: 0.30, description: 'Above ₹10,00,000' }
                ]
            },

            // Super Senior Citizen (80+ years)
            above80: {
                basicExemption: 500000,  // ₹5L
                slabs: [
                    { min: 0, max: 500000, rate: 0.00, description: 'Up to ₹5,00,000' },
                    { min: 500000, max: 1000000, rate: 0.20, description: '₹5,00,001 to ₹10,00,000' },
                    { min: 1000000, max: Infinity, rate: 0.30, description: 'Above ₹10,00,000' }
                ]
            }
        },

        // Section 87A Rebate - Old Regime
        rebate87A: {
            incomeLimit: 500000,  // Rebate if taxable income ≤ ₹5L
            maxRebate: 12500      // Max rebate ₹12,500
        },

        // Surcharge rates - Higher than new regime
        // Up to 37% for very high income
        surcharge: [
            { min: 5000000, max: 10000000, rate: 0.10, description: '10% for ₹50L - ₹1Cr' },
            { min: 10000000, max: 20000000, rate: 0.15, description: '15% for ₹1Cr - ₹2Cr' },
            { min: 20000000, max: 50000000, rate: 0.25, description: '25% for ₹2Cr - ₹5Cr' },
            { min: 50000000, max: Infinity, rate: 0.37, description: '37% for above ₹5Cr' }
        ]
    },

    // ============================================
    // HEALTH & EDUCATION CESS
    // Applied on (Tax + Surcharge)
    // ============================================
    cess: {
        rate: 0.04,  // 4%
        name: 'Health & Education Cess',
        section: 'Finance Act'
    },

    // ============================================
    // DEDUCTION LIMITS - Chapter VI-A
    // All limits as per FY 2025-26
    // ============================================
    deductions: {
        // Section 80C - Umbrella limit for multiple investments
        // Includes: PPF, ELSS, LIC, NSC, SCSS, Tuition, Home Principal, etc.
        section80C: {
            maxLimit: 150000,
            applicableRegimes: ['old'],
            eligibleItems: [
                { id: 'epf', name: 'EPF (Employee Provident Fund)', noLimit: true },
                { id: 'ppf', name: 'PPF (Public Provident Fund)', perLimit: 150000 },
                { id: 'elss', name: 'ELSS Mutual Funds (3-year lock-in)', noLimit: true },
                { id: 'lifeInsurance', name: 'Life Insurance Premium', noLimit: true },
                { id: 'nsc', name: 'NSC (National Savings Certificate)', noLimit: true },
                { id: 'scss', name: 'Senior Citizens Savings Scheme', perLimit: 1500000 },
                { id: 'taxSaverFD', name: 'Tax Saver FD (5-year lock-in)', noLimit: true },
                { id: 'sukanyaSamriddhi', name: 'Sukanya Samriddhi Yojana', perLimit: 150000 },
                { id: 'tuitionFees', name: 'Tuition Fees (max 2 children)', noLimit: true, maxChildren: 2 },
                { id: 'homeLoanPrincipal', name: 'Home Loan Principal Repayment', noLimit: true },
                { id: 'stampDuty', name: 'Stamp Duty & Registration', noLimit: true }
            ],
            section: 'Section 80C',
            explanation: 'Combined limit for various investments like PPF, ELSS, LIC, etc. All items share the ₹1.5L pool.'
        },

        // Section 80CCC - Pension Fund (within 80C pool)
        section80CCC: {
            maxLimit: 150000,  // Part of 80C pool
            applicableRegimes: ['old'],
            section: 'Section 80CCC',
            explanation: 'Contributions to pension plans from LIC or IRDAI-approved insurers. Shares limit with 80C.'
        },

        // Section 80CCD(1) - Employee NPS Contribution
        section80CCD1: {
            maxLimit: 150000,  // Within 80C pool
            percentOfSalary: 0.10,  // Max 10% of salary
            applicableRegimes: ['old'],
            section: 'Section 80CCD(1)',
            explanation: 'Your own contribution to NPS Tier-1. Limited to 10% of salary, within ₹1.5L 80C pool.'
        },

        // Section 80CCD(1B) - Additional NPS (EXTRA ₹50K)
        section80CCD1B: {
            maxLimit: 50000,  // Additional, over and above 80C
            applicableRegimes: ['old'],
            section: 'Section 80CCD(1B)',
            explanation: 'Extra ₹50,000 deduction for NPS Tier-1 contribution, OVER AND ABOVE the 80C limit.'
        },

        // Section 80CCD(2) - Employer NPS Contribution
        // KEY: Different limits for private vs government employees
        // Available in BOTH regimes (only deduction in new regime!)
        section80CCD2: {
            applicableRegimes: ['old', 'new'],
            limits: {
                // New Regime: 14% for ALL employees (Budget 2025)
                newRegime: {
                    private: 0.14,
                    government: 0.14,
                    psu: 0.14
                },
                // Old Regime: 14% for Govt, 10% for Private (!= New Regime)
            oldRegime: {
                private: 0.10,  // STILL 10% in Old Regime (14% parity is ONLY in New Regime)
                government: 0.14,
                psu: 0.10  // Same as private sector
                }
            },
            aggregateCap: 750000,  // ₹7.5L cap for EPF+NPS+Superannuation combined
            section: 'Section 80CCD(2)',
            explanation: 'Employer\'s NPS contribution. No upper limit but capped at % of salary. Available in BOTH regimes.'
        },

        // Section 80D - Health Insurance
        section80D: {
            applicableRegimes: ['old'],
            limits: {
                // Self, spouse, dependent children
                self: {
                    below60: 25000,
                    '60to80': 50000,
                    above80: 50000
                },
                // Parents
                parents: {
                    below60: 25000,
                    '60to80': 50000,
                    above80: 50000
                }
            },
            preventiveHealthCheckup: 5000,  // Within above limits, not extra
            section: 'Section 80D',
            explanation: 'Health insurance premium. ₹25K for self/family (<60), ₹50K if senior. Same for parents.'
        },

        // Section 80DD - Dependent with Disability
        section80DD: {
            applicableRegimes: ['old'],
            limits: {
                '40to79': 75000,   // 40-79% disability
                '80plus': 125000   // 80%+ severe disability
            },
            section: 'Section 80DD',
            explanation: 'Flat deduction for maintaining disabled dependent (spouse, children, parents, siblings).'
        },

        // Section 80DDB - Medical Treatment for Specified Diseases
        section80DDB: {
            applicableRegimes: ['old'],
            limits: {
                below60: 40000,
                '60to80': 100000,
                above80: 100000
            },
            diseases: ['Neurological diseases', 'Cancer', 'AIDS', 'Renal failure', 'Parkinson\'s', 'Dementia'],
            section: 'Section 80DDB',
            explanation: 'Treatment of specified diseases. ₹40K (<60), ₹1L (seniors). Requires specialist prescription.'
        },

        // Section 80EE - Home Loan Interest (Legacy FY 16-17)
        section80EE: {
            maxLimit: 50000,
            applicableRegimes: ['old'],
            loanWindow: { start: '2016-04-01', end: '2017-03-31' },
            loanLimit: 3500000,
            propertyLimit: 5000000,
            section: 'Section 80EE',
            explanation: 'Additional home loan interest deduction. Max ₹50k. Loan sanctioned FY 16-17. First-time buyer.'
        },

        // Section 80EEA - Affordable Housing Interest (Legacy FY 19-22)
        section80EEA: {
            maxLimit: 150000,
            applicableRegimes: ['old'],
            loanWindow: { start: '2019-04-01', end: '2022-03-31' },
            propertyLimit: 4500000,
            section: 'Section 80EEA',
            explanation: 'Additional interest for affordable housing. Max ₹1.5L. Loan sanctioned FY 19-22.'
        },

        // Section 80E - Education Loan Interest
        section80E: {
            maxLimit: null,  // UNLIMITED
            maxYears: 8,     // From year of first repayment
            applicableRegimes: ['old'],
            eligibleFor: ['self', 'spouse', 'children'],
            section: 'Section 80E',
            explanation: 'UNLIMITED interest deduction for higher education loan. Available for 8 years from first payment.'
        },

        // Section 80EEB - EV Loan Interest (Legacy)
        section80EEB: {
            maxLimit: 150000,
            applicableRegimes: ['old'],
            loanWindow: { start: '2019-04-01', end: '2023-03-31' },
            section: 'Section 80EEB',
            explanation: 'Interest on EV Loan (Sanctioned Apr\'19-Mar\'23). Max ₹1.5 Lakh. Old Regime Only.'
        },

        // Section 80G - Donations
        section80G: {
            applicableRegimes: ['old'],
            categories: {
                // 100% deduction, no qualifying limit
                fullNoLimit: {
                    percentage: 1.00,
                    hasQualifyingLimit: false,
                    items: [
                        { id: 'pmReliefFund', name: 'PM National Relief Fund' },
                        { id: 'nationalDefenceFund', name: 'National Defence Fund' },
                        { id: 'cmReliefFund', name: 'CM Relief Fund' },
                        { id: 'nationalChildrensFund', name: 'National Children\'s Fund' },
                        { id: 'africaFund', name: 'Africa (Public Contribution-India) Fund' }
                    ]
                },
                // 50% deduction, no qualifying limit
                halfNoLimit: {
                    percentage: 0.50,
                    hasQualifyingLimit: false,
                    items: [
                        { id: 'pmDroughtFund', name: 'PM Drought Relief Fund' },
                        { id: 'jawaharNehruFund', name: 'Jawaharlal Nehru Memorial Fund' }
                    ]
                },
                // 100% deduction, with 10% AGI limit
                fullWithLimit: {
                    percentage: 1.00,
                    hasQualifyingLimit: true,
                    qualifyingLimitPercent: 0.10,  // 10% of Adjusted Gross Total Income
                    items: [
                        { id: 'approvedResearch', name: 'Approved Scientific Research Association' },
                        { id: 'approvedUniversity', name: 'Approved University/Institution' }
                    ]
                },
                // 50% deduction, with 10% AGI limit
                halfWithLimit: {
                    percentage: 0.50,
                    hasQualifyingLimit: true,
                    qualifyingLimitPercent: 0.10,
                    items: [
                        { id: 'charityTrust', name: 'Charitable Trust (General)' },
                        { id: 'ngo', name: 'NGO with 80G Certificate' },
                        { id: 'temple', name: 'Notified Temple/Mosque/Church' }
                    ]
                }
            },
            cashLimit: 2000,  // Cash donation > ₹2000 NOT eligible
            section: 'Section 80G',
            explanation: 'Donations to approved funds/charities. Different rates (50%/100%) and limits apply.'
        },

        // Section 80GGC - Political Party Donations
        // NOTE: NOT available in New Regime (Section 115BAC) - verified via cleartax.in, policybazaar.com
        section80GGC: {
            applicableRegimes: ['old'],  // OLD REGIME ONLY - NOT in New Regime
            percentage: 1.00,  // 100% deduction
            cashLimit: 0,      // NO cash donations allowed
            section: 'Section 80GGC',
            explanation: '100% deduction for donations to registered political parties. Cash NOT allowed. OLD REGIME ONLY.'
        },

        // Section 80GG - Rent (for those not receiving HRA)
        section80GG: {
            applicableRegimes: ['old'],
            limits: {
                monthlyMax: 5000,    // ₹5,000/month
                yearlyMax: 60000,    // ₹60,000/year
                percentOfATI: 0.25   // 25% of Adjusted Total Income
            },
            conditions: [
                'Not receiving HRA',
                'No owned house at place of work',
                'File Form 10BA'
            ],
            section: 'Section 80GG',
            explanation: 'Rent deduction if NOT receiving HRA. Least of ₹5K/month, 25% ATI, or (Rent - 10% ATI).'
        },

        // Section 80TTA - Savings Interest (Non-seniors)
        section80TTA: {
            maxLimit: 10000,
            applicableRegimes: ['old'],
            applicableAges: ['below60'],
            interestTypes: ['savings'],  // Only savings, NOT FD
            section: 'Section 80TTA',
            explanation: 'Savings account interest deduction up to ₹10,000. NOT for FD interest.'
        },

        // Section 80TTB - Interest for Seniors
        // Limit INCREASED to ₹1,00,000 in Budget 2025
        section80TTB: {
            maxLimit: 100000,  // ₹1L (Corrected based on Budget 2025)
            applicableRegimes: ['old'],
            applicableAges: ['60to80', 'above80'],
            interestTypes: ['savings', 'fd', 'rd', 'postOffice'],
            section: 'Section 80TTB',
            explanation: 'All interest (savings + FD) deduction for seniors. Limit: ₹1,00,000 (Increased in Budget 2025).'
        },

        // Section 80U - Self Disability
        section80U: {
            applicableRegimes: ['old'],
            limits: {
                '40to79': 75000,
                '80plus': 125000
            },
            section: 'Section 80U',
            explanation: 'Flat deduction if taxpayer has certified disability. ₹75K (40-79%), ₹1.25L (80%+).'
        },

        // Section 24(b) - Home Loan Interest
        section24b: {
            applicableRegimes: ['old'],
            limits: {
                selfOccupied: 200000,   // ₹2L max
                letOut: null            // No limit for rented property
            },
            section: 'Section 24(b)',
            explanation: 'Home loan interest. ₹2L limit for self-occupied property. No limit for let-out.'
        },

        // Section 16(ii) - Entertainment Allowance (Government Employees ONLY)
        entertainmentAllowance: {
            applicableRegimes: ['old'],
            eligibility: ['government'],  // Central/State government employees ONLY
            limits: {
                maxAmount: 5000,          // ₹5,000 flat limit
                percentOfBasicSalary: 0.20  // 20% of basic salary
            },
            formula: 'Least of: (1) Actual allowance received, (2) 20% of Basic Salary, (3) ₹5,000',
            section: 'Section 16(ii)',
            explanation: 'Deduction for government employees. Least of actual, 20% salary, or ₹5,000. Not for private sector.'
        },

        // Section 16(iii) - Professional Tax
        professionalTax: {
            applicableRegimes: ['old'],  // NOT available in New Regime
            maxLimit: 2500,              // ₹2,500 max per year (Constitutional limit under Article 276)
            section: 'Section 16(iii)',
            explanation: 'Actual professional tax paid. Max ₹2,500/year. State-level tax, NOT allowed in New Regime.'
        },

        // Section 80GGA - Scientific Research/Rural Development Donations
        section80GGA: {
            applicableRegimes: ['old'],  // NOT in New Regime
            deductionPercentage: 1.00,   // 100% deduction
            eligibility: 'All taxpayers EXCEPT those with business/professional income',
            eligibleDonations: [
                'Approved scientific research associations/institutions',
                'Universities/colleges for scientific research',
                'Rural development programs',
                'National Urban Poverty Eradication Fund'
            ],
            cashLimit: 2000,  // Cash donations > ₹2,000 NOT eligible
            requiredDocuments: ['Donation receipt', 'Form 58A certificate'],
            section: 'Section 80GGA',
            explanation: '100% deduction for scientific research/rural development donations. NOT for business income taxpayers.'
        }
    },

    // ============================================
    // EXEMPTIONS - Section 10
    // ============================================
    exemptions: {
        // HRA - Section 10(13A) + Rule 2A
        hra: {
            applicableRegimes: ['old'],
            metroPercentage: 0.50,      // 50% of salary for metros
            nonMetroPercentage: 0.40,   // 40% for non-metros
            rentExcess: 0.10,           // Rent - 10% of salary
            metros: ['Delhi', 'Mumbai', 'Kolkata', 'Chennai'],
            section: 'Section 10(13A) + Rule 2A',
            formula: 'Least of: (1) Actual HRA, (2) 50/40% of salary, (3) Rent - 10% salary',
            explanation: 'HRA exemption based on city, rent paid, and salary. Available only in Old Regime.'
        },

        // LTA - Section 10(5) + Rule 2B
        lta: {
            applicableRegimes: ['old'],
            currentBlock: { start: 2022, end: 2025 },  // Block period
            tripsPerBlock: 2,
            carryForwardTrips: 1,
            section: 'Section 10(5) + Rule 2B',
            explanation: 'Travel fare exemption for domestic travel. 2 trips per 4-year block.'
        },

        // Gratuity - Section 10(10)
        // NOTE: New Regime limit is ₹5L per CBDT Circular 06/2025 (May 27, 2025)
        gratuity: {
            applicableRegimes: ['old', 'new'],
            limits: {
                government: null,        // Fully exempt in both regimes
                private: {
                    oldRegime: 2000000,  // ₹20L in Old Regime
                    newRegime: 500000    // ₹5L in New Regime (CBDT Circular 06/2025)
                },
                privateFormula: '(15/26) × Last Salary × Years'  // For covered employees
            },
            section: 'Section 10(10)',
            explanation: 'Gratuity on retirement. Govt: fully exempt. Private: ₹20L (Old Regime), ₹5L (New Regime).'
        },

        // Leave Encashment - Section 10(10AA)
        leaveEncashment: {
            applicableRegimes: ['old', 'new'],
            limits: {
                government: null,        // Fully exempt
                private: 2500000         // ₹25L limit
            },
            section: 'Section 10(10AA)',
            explanation: 'Leave encashment at retirement. Fully exempt for govt, up to ₹25L for private.'
        },

        // Children Education Allowance - Section 10(14)
        childrenEducationAllowance: {
            applicableRegimes: ['old'],
            limitPerChild: 100,      // ₹100 per month
            maxChildren: 2,          // Max 2 children
            section: 'Section 10(14)',
            explanation: 'Exemption of ₹100/month per child (max 2 children).'
        },

        // Hostel Expenditure Allowance - Section 10(14)
        hostelAllowance: {
            applicableRegimes: ['old'],
            limitPerChild: 300,      // ₹300 per month
            maxChildren: 2,          // Max 2 children
            section: 'Section 10(14)',
            explanation: 'Exemption of ₹300/month per child (max 2 children) for hostel expenditure.'
        },

        // Transport Allowance (Divyang) - Section 10(14)
        // NOTE: Available in BOTH Old and New Regimes for Divyang employees
        transportAllowanceDivyang: {
            applicableRegimes: ['old', 'new'],
            limit: 3200,             // ₹3200 per month
            description: 'Blind, deaf and dumb, or orthopedically handicapped',
            section: 'Section 10(14)',
            explanation: 'Exemption of ₹3200/month for commuting expenses for disabled employees. Available in BOTH regimes.'
        },

        // Voluntary Retirement Scheme (VRS) - Section 10(10C)
        vrs: {
            applicableRegimes: ['old', 'new'], // Exempt in both
            limit: 500000,           // ₹5 Lakhs
            section: 'Section 10(10C)',
            explanation: 'Compensation on voluntary retirement exempt up to ₹5,00,000.'
        },

        // Agricultural Income - Section 10(1)
        agriculturalIncome: {
            applicableRegimes: ['old', 'new'],
            limit: null,  // Fully exempt u/s 10(1), BUT used for rate determination (Partial Integration)
            section: 'Section 10(1)',
            explanation: 'Exempt from tax, but included for slab rate calculation (Partial Integration) in Old Regime.'
        },

        // Perquisites - Section 17(2)
        perquisites: {
            // General Perquisite Exemption Threshold (The "Cliff Edge")
            threshold: 400000, // ₹4 Lakhs (Budget 2025)
            
            // Medical Treatment Abroad
            medicalAbroadLimit: 800000, // ₹8 Lakhs (Increased from ₹2L)
            
            section: 'Section 17(2)',
            explanation: 'Non-monetary perquisites are tax-free if Salary (excluding perks) ≤ ₹4L. Medical treatment abroad exempt up to ₹8L.'
        },

        // Life Insurance Maturity - Section 10(10D)
        lifeInsuranceMaturity: {
            applicableRegimes: ['old', 'new'],
            limits: {
                traditionalPremium: 500000,  // ₹5 Lakhs aggregate premium limit (Apr 2023 onwards)
                ulipPremium: 250000,         // ₹2.5 Lakhs aggregate premium limit (Feb 2021 onwards)
                minSumAssuredRatio: 0.10     // Premium must be < 10% of Sum Assured
            },
            section: 'Section 10(10D)',
            explanation: 'Maturity proceeds exempt if premium limits met (₹5L Traditional, ₹2.5L ULIP) and premium < 10% Sum Assured.'
        },

        // NPS Withdrawals - Section 10(12A) / 10(12B)
        npsWithdrawal: {
            applicableRegimes: ['old', 'new'],
            exemptions: {
                lumpSumRetirement: 0.60,  // 60% of corpus exempt on closure
                partialWithdrawal: 0.25   // 25% of OWN contribution exempt
            },
            section: 'Section 10(12A)',
            section: 'Section 10(12A)',
            explanation: '60% of corpus exempt on retirement. Partial withdrawal exempt up to 25% of self contribution.'
        },

        // Minor Child Income Exemption - Section 10(32)
        // NOTE: NOT available in New Regime (Section 115BAC) - verified via quicko.com, icmai.in, tataaia.com
        minorChildExemption: {
            applicableRegimes: ['old'],  // OLD REGIME ONLY - NOT in New Regime
            limitPerChild: 1500,     // ₹1500 per child
            maxChildren: null,       // Section 10(32) says "each minor child" - no specific limit
            section: 'Section 10(32)',
            explanation: 'Exemption of ₹1,500 per child if minor\'s income is clubbed with parent. OLD REGIME ONLY.'
        },

        // Gifts - Section 56(2)(x)
        // Taxable as "Income from Other Sources" with specific exemptions
        gifts: {
            applicableRegimes: ['old', 'new'],  // Gift rules apply regardless of regime
            exemptions: {
                // Gifts from relatives - Fully exempt (no limit)
                fromRelatives: {
                    exempt: true,
                    limit: null,  // No limit
                    relatives: [
                        'Spouse',
                        'Brother/Sister',
                        'Brother/Sister of Spouse',
                        'Brother/Sister of either Parent (Uncle/Aunt)',
                        'Lineal Ascendants (Parents, Grandparents)',
                        'Lineal Descendants (Children, Grandchildren)',
                        'Lineal Ascendants/Descendants of Spouse',
                        'Spouse of any of the above'
                    ]
                },
                // Gifts on marriage - Fully exempt (no limit, from anyone)
                onMarriage: {
                    exempt: true,
                    limit: null,
                    description: 'Any gift received on occasion of marriage is fully exempt (from anyone)'
                },
                // Gifts from non-relatives
                fromNonRelatives: {
                    threshold: 50000,  // ₹50,000 per FY
                    taxRule: 'If aggregate gifts from non-relatives > ₹50,000, ENTIRE amount is taxable (not just excess)'
                },
                // Inheritance/Will
                inheritance: {
                    exempt: true,
                    description: 'Property/money received under will or inheritance is fully exempt'
                },
                // COVID-19 specific (still applicable)
                covidRelief: {
                    medicalTreatment: { exempt: true, description: 'Sum for COVID-19 medical treatment - fully exempt' },
                    fromEmployerOnDeath: { exempt: true, limit: null, description: 'From employer of deceased (COVID) - fully exempt' },
                    fromNonEmployerOnDeath: { exempt: true, limit: 1000000, description: 'From non-employer for COVID death - exempt up to ₹10L' }
                }
            },
            section: 'Section 56(2)(x)',
            explanation: 'Gifts from relatives are fully exempt. Non-relative gifts over ₹50K are fully taxable. Marriage gifts always exempt.'
        },

        // Retrenchment Compensation - Section 10(10B)
        retrenchmentCompensation: {
            applicableRegimes: ['old', 'new'],
            limit: 500000,  // ₹5,00,000 max
            formula: 'Least of: (1) ₹5L, (2) Actual received, (3) 15 days avg pay × completed years',
            section: 'Section 10(10B)',
            explanation: 'Compensation on retrenchment exempt up to ₹5L. For workmen under Industrial Disputes Act.'
        },

        // Superannuation Fund - Section 10(13) & 17(2)(vii)
        superannuation: {
            applicableRegimes: ['old', 'new'],
            limits: {
                employerContributionExempt: 150000,  // ₹1,50,000 per year specific limit
                aggregateCap: 750000  // ₹7,50,000 combined (EPF + NPS + Superannuation)
            },
            taxFreePayments: [
                'On death of beneficiary',
                'On retirement/incapacitation',
                'Refund on death/leaving service'
            ],
            section: 'Section 10(13) & 17(2)(vii)',
            explanation: 'Employer contribution to superannuation exempt up to ₹1.5L/year. Part of ₹7.5L aggregate cap.'
        },

        // Provident Fund Interest - Section 10(11) & 10(12)
        pfInterest: {
            applicableRegimes: ['old', 'new'],
            limits: {
                exemptRateLimit: 0.095,  // 9.5% p.a. - interest above this rate is taxable
                contributionLimit: 250000,  // ₹2.5L - interest on contribution above this is taxable
                contributionLimitNoEmployer: 500000  // ₹5L if no employer contribution
            },
            section: 'Section 10(11) & 10(12)',
            explanation: 'PF interest exempt up to 9.5% rate. Interest on employee contribution >₹2.5L is taxable.'
        },

        // Sukanya Samriddhi Account - Section 10(11A)
        sukanyaSamriddhi: {
            applicableRegimes: ['old', 'new'],
            status: 'EEE',  // Exempt-Exempt-Exempt (Contribution + Interest + Withdrawal)
            eligibility: 'Girl child below 10 years (Guardian account)',
            withdrawalConditions: [
                'Education expenses (after Class 10)',
                'Marriage (after age 18)',
                'Full maturity at 21 years'
            ],
            section: 'Section 10(11A)',
            explanation: 'Complete EEE status - contributions, interest, and withdrawals all tax-free.'
        },

        // NPS Vatsalya (Minor Child Account) - Section 10(12BA) - NEW AY 2026-27
        npsVatsalya: {
            applicableRegimes: ['old', 'new'],
            eligibility: 'Minor child (<18 years) account opened by parent/guardian',
            partialWithdrawalExempt: 0.25,  // 25% of parent's contribution exempt
            deduction80CCD1B: {
                available: true,
                limit: 50000,  // ₹50,000 under 80CCD(1B)
                maxChildren: 2,
                regime: 'old'  // Only in Old Regime
            },
            withdrawalPurpose: ['Education', 'Medical treatment', 'Disability of minor'],
            section: 'Section 10(12BA)',
            explanation: 'NEW: Pension account for minor. 25% withdrawal exempt. Parent can claim ₹50K deduction (Old Regime).'
        },

        // Commuted Pension - Section 10(10A)
        commutedPension: {
            applicableRegimes: ['old', 'new'],
            limits: {
                government: { exempt: true, limit: null, description: 'Fully exempt for govt employees' },
                privateApprovedFund: { exempt: true, limit: null, description: 'Fully exempt if from approved fund (New Rule FY 25-26)' },
                privateLegacy: {
                    withGratuity: 0.333,  // 1/3rd exempt if gratuity received
                    withoutGratuity: 0.50  // 1/2 exempt if no gratuity
                }
            },
            section: 'Section 10(10A)',
            explanation: 'Commuted pension: Fully exempt for govt. Private: 1/3rd exempt with gratuity, 1/2 without.'
        }
    },

    // ============================================
    // SALARY COMPONENTS - For employment period inputs
    // Based on common Indian salary structures
    // ============================================
    salaryComponents: {
        // Core Components (always shown)
        core: {
            grossSalary: {
                label: 'Gross Salary',
                taxable: true,
                description: 'Total salary for the period (before deductions)',
                required: true
            },
            basicPlusDA: {
                label: 'Basic + DA',
                taxable: true,
                description: 'Base salary + Dearness Allowance. Usually 40-50% of gross. Used for HRA, EPF calculations.',
                autoCompute: 0.50,  // Default to 50% of gross if not provided
                required: true
            }
        },

        // Variable Components (optional - user can add)
        variable: {
            bonus: {
                id: 'bonus',
                label: 'Bonus / Variable Pay',
                taxable: true,
                regimes: ['old', 'new'],  // Taxable in both
                description: 'Performance bonus, annual bonus, incentives. Fully taxable.',
                helpText: 'Includes performance bonus, annual bonus, joining bonus, retention bonus'
            },
            specialAllowance: {
                id: 'specialAllowance',
                label: 'Special Allowance',
                taxable: true,
                regimes: ['old', 'new'],
                description: 'Fully taxable allowance. Often used to balance CTC.',
                helpText: 'Catch-all allowance, fully taxable in both regimes'
            }
        },

        // Reimbursements (exempt if bills submitted)
        reimbursements: {
            lta: {
                id: 'lta',
                label: 'LTA (Leave Travel Allowance)',
                taxable: false,
                regimes: ['old'],  // OLD REGIME ONLY
                exemptionCondition: 'Actual travel expenses with bills',
                description: 'Exempt in Old Regime only. Must submit travel bills.',
                helpText: '2 trips per 4-year block (2022-2025). Only domestic travel. Fare only, not accommodation.',
                section: 'Section 10(5)'
            },
            telephone: {
                id: 'telephone',
                label: 'Telephone / Internet Reimbursement',
                taxable: false,
                regimes: ['old', 'new'],  // BOTH regimes
                exemptionCondition: 'Actual bills for official use',
                description: '100% exempt in both regimes if bills submitted for official use.',
                helpText: 'Mobile, landline, Wi-Fi bills for work. No fixed limit but must be reasonable.',
                section: 'Rule 3(7)(ix)'
            },
            books: {
                id: 'books',
                label: 'Books / Periodicals Reimbursement',
                taxable: false,
                regimes: ['old', 'new'],  // BOTH regimes
                exemptionCondition: 'Actual bills for work-related books',
                description: '100% exempt in both regimes. For professional/work-related books only.',
                helpText: 'Newspapers, journals, technical books relevant to your work.',
                section: 'Section 10(14)'
            },
            conveyance: {
                id: 'conveyance',
                label: 'Conveyance / Fuel Reimbursement',
                taxable: false,
                regimes: ['old', 'new'],  
                exemptionCondition: 'Actual bills for OFFICIAL duties only (Logbook)',
                description: 'Exempt ONLY for official duties. Home-Office commute is fully taxable in New Regime.',
                helpText: 'Official work fuel bills only. Commute expenses are NOT exempt.',
                section: 'Section 10(14)'
            },
            driver: {
                id: 'driver',
                label: 'Driver Salary / Allowance',
                taxable: true,
                regimes: ['old', 'new'],
                description: 'Fully taxable for employees (unless specific official use proof). Often part of "Vehicle Lease" value.',
                helpText: 'Usually fully taxable. ₹900/m exemption possible ONLY if car is provided by employer and used for official purposes.',
                section: 'Section 17(2)'
            }
        },

        // TODO: Future - Add custom component option for company-specific allowances
        // customComponents: [] 
    },

    // ============================================
    // VALIDATION RULES - Hard blocks and warnings
    // ============================================
    validation: {
        // Hard blocks - Cannot proceed without fixing
        hardBlocks: {
            sumExceedsGross: {
                rule: 'Sum of (Basic + HRA + Bonus + Allowances) cannot exceed Gross Salary',
                message: 'Total salary components exceed Gross Salary. Please correct.',
                type: 'error'
            },
            hraWithoutHraReceived: {
                rule: 'Cannot claim HRA exemption if HRA Received is 0',
                message: 'You cannot claim HRA exemption without receiving HRA. Enter HRA amount received.',
                type: 'error'
            },
            ltaWithoutLtaReceived: {
                rule: 'Cannot claim LTA exemption if LTA Received is 0',
                message: 'You cannot claim LTA exemption without having LTA in salary. Enter LTA received.',
                type: 'error'
            }
        },

        // Warnings - Unusual values, proceed with caution
        warnings: {
            basicTooLow: {
                rule: 'Basic + DA is less than 40% of Gross',
                threshold: 0.40,
                message: 'Basic salary seems low (typically 40-50% of gross). Please verify your salary slip.',
                type: 'warning'
            },
            basicTooHigh: {
                rule: 'Basic + DA is more than 60% of Gross',
                threshold: 0.60,
                message: 'Basic salary seems high (typically 40-50% of gross). Please verify.',
                type: 'warning'
            },
            hraExceedsBasic: {
                rule: 'HRA exceeds 50% of Basic salary',
                threshold: 0.50,
                message: 'HRA seems unusually high compared to Basic. Typical range is 40-50% of Basic.',
                type: 'warning'
            },
            epfUnusual: {
                rule: 'EPF contribution is not ~12% of Basic',
                expectedPercent: 0.12,
                tolerance: 0.02,  // Allow 10-14%
                message: 'EPF is typically 12% of Basic. Your amount differs significantly.',
                type: 'warning'
            }
        }
    },

    // ============================================
    // CAPITAL GAINS - Separate Tax Rates
    // ============================================
    capitalGains: {
        // Short Term Capital Gains - Section 111A
        stcg: {
            equity: {
                rate: 0.20,  // 20% (increased from 15% in Budget 2024)
                holdingPeriod: 12,  // months
                section: 'Section 111A',
                explanation: 'STCG on equity/mutual funds if sold within 12 months. Flat 20% tax.'
            },
            other: {
                rate: 'slab',  // Taxed at slab rate
                explanation: 'STCG on other assets (debt, property <2 years). Added to income, taxed at slab.'
            }
        },

        // Long Term Capital Gains - Section 112A
        ltcg: {
            equity: {
                rate: 0.125,  // 12.5% (increased from 10%)
                exemption: 125000,  // First ₹1.25L exempt
                holdingPeriod: 12,  // months
                section: 'Section 112A',
                explanation: 'LTCG on equity. First ₹1.25L exempt, then 12.5% tax.'
            },
            property: {
                grandfatheringDate: '2024-07-23',
                beforeGrandfathering: {
                    option1: { rate: 0.125, indexation: false },
                    option2: { rate: 0.20, indexation: true }
                },
                afterGrandfathering: {
                    rate: 0.125,
                    indexation: false
                },
                holdingPeriod: 24,  // months
                section: 'Section 112',
                explanation: 'LTCG on property. Bought before Jul 2024: choose 12.5% (no indexation) or 20% (with indexation).'
            }
        },

        // Loss Setoff Rules
        lossSetoff: {
            stcl: {
                setoffAgainst: ['stcg', 'ltcg'],
                carryforward: 8  // years
            },
            ltcl: {
                setoffAgainst: ['ltcg'],  // Cannot setoff against STCG normally
                carryforward: 8
            }
        },

        // Surcharge cap on capital gains
        maxSurcharge: 0.15,  // 15% max surcharge on capital gains

        // Capital Gains Exemption Limits (Section 54 Family) - COMPLETE
        exemptions: {
            // Section 54 - Sell House, Buy House
            section54: {
                maxLimit: 100000000, // ₹10 Crores
                assetType: 'Residential House -> Residential House',
                eligibility: ['Individual', 'HUF'],
                condition: 'Long-term asset (held > 24 months)',
                investmentRequired: 'Capital Gain amount',
                timeLimit: {
                    purchase: { before: 1, after: 2, unit: 'years' },
                    construct: { within: 3, unit: 'years' }
                },
                twoHouseOption: {
                    available: true,
                    ltcgLimit: 20000000,  // ₹2 Crore max LTCG
                    onceInLifetime: true
                },
                withdrawalRule: 'If new house sold within 3 years, exemption becomes taxable',
                section: 'Section 54'
            },

            // Section 54F - Sell Any Asset, Buy House
            section54F: {
                maxLimit: 100000000, // ₹10 Crores
                assetType: 'Any other asset (Gold, Shares, Land) -> Residential House',
                eligibility: ['Individual', 'HUF'],
                condition: 'Must not own more than 1 house on date of transfer',
                investmentRequired: 'NET CONSIDERATION (not just capital gain!)',
                trap: 'If you invest only Capital Gain portion, exemption is proportionate!',
                formula: 'Exemption = Capital Gain × (Amount Invested / Net Consideration)',
                timeLimit: {
                    purchase: { before: 1, after: 2, unit: 'years' },
                    construct: { within: 3, unit: 'years' }
                },
                section: 'Section 54F'
            },

            // Section 54EC - Buy Bonds
            section54EC: {
                maxLimit: 5000000, // ₹50 Lakhs per FY
                assetType: 'Land/Building -> Notified Bonds',
                eligibleBonds: ['NHAI', 'REC', 'IRFC', 'PFC', 'HUDCO', 'IREDA'],
                timeLimit: { within: 6, unit: 'months' },
                lockIn: { period: 5, unit: 'years' },
                interestRate: 0.0525,  // ~5.25% p.a. (taxable)
                section: 'Section 54EC'
            },

            // Section 54B - Agricultural Land
            section54B: {
                maxLimit: null,  // No specific cap, limited to capital gain
                assetType: 'Urban Agricultural Land -> New Agricultural Land',
                eligibility: ['Individual', 'HUF'],
                condition: 'Original land used for agriculture for at least 2 years before sale',
                timeLimit: { within: 2, unit: 'years' },
                newAsset: 'Agricultural land (rural or urban)',
                withdrawalRule: 'If new land sold within 3 years, exemption reversed',
                section: 'Section 54B',
                explanation: 'Exemption on capital gain from sale of agricultural land if reinvested in new agricultural land.'
            },

            // Section 54D - Compulsory Acquisition of Industrial Property
            section54D: {
                maxLimit: null,
                assetType: 'Industrial Land/Building (compulsory acquisition)',
                eligibility: 'Any Assessee',
                condition: 'Asset used for industrial undertaking for at least 2 years before acquisition',
                timeLimit: { within: 3, unit: 'years' },
                reinvestment: 'New land/building for shifting/re-establishing industrial undertaking',
                appliesTo: 'Both STCG and LTCG',
                section: 'Section 54D',
                explanation: 'Exemption when industrial property is compulsorily acquired by govt.'
            },

            // Section 54G - Industrial Relocation (Urban to Non-Urban)
            section54G: {
                maxLimit: null,
                assetType: 'Industrial assets (Plant, Machinery, Land, Building)',
                eligibility: 'Any Assessee',
                condition: 'Industrial undertaking must shift from urban area to non-urban area',
                timeLimit: { before: 1, after: 3, unit: 'years' },
                reinvestment: 'New plant/machinery/land/building + shifting expenses in non-urban area',
                section: 'Section 54G',
                explanation: 'Exemption for shifting industrial undertaking from urban to rural/non-urban area.'
            },

            // Section 54GA - Industrial Relocation (Urban to SEZ)
            section54GA: {
                maxLimit: null,
                assetType: 'Industrial assets (Plant, Machinery, Land, Building)',
                eligibility: 'Any Assessee',
                condition: 'Industrial undertaking must shift from urban area to Special Economic Zone (SEZ)',
                timeLimit: { before: 1, after: 3, unit: 'years' },
                reinvestment: 'New assets + shifting expenses in SEZ',
                section: 'Section 54GA',
                explanation: 'Exemption for shifting industrial undertaking from urban area to SEZ.'
            },

            // Section 54EE - Investment in Specified Fund (Startups)
            section54EE: {
                maxLimit: 5000000, // ₹50 Lakhs
                assetType: 'Any Long-Term Capital Asset -> Specified Fund units',
                eligibility: 'Any Assessee',
                timeLimit: { within: 6, unit: 'months' },
                lockIn: { period: 3, unit: 'years' },
                fundType: 'Notified by Central Government for startups',
                section: 'Section 54EE',
                explanation: 'Exemption for investing LTCG in govt-notified startup funds. Max ₹50L, 3-year lock-in.'
            },

            // Section 54GB - Investment in Startup Equity
            section54GB: {
                maxLimit: null,  // Full exemption possible
                assetType: 'Residential Property -> Eligible Startup Equity Shares',
                eligibility: ['Individual', 'HUF'],
                condition: 'Assessee must have >50% share rights in startup',
                startupCriteria: {
                    dpiitRecognized: true,
                    maxAge: 10,  // years
                    maxTurnover: 1000000000  // ₹100 Crore
                },
                utilisation: 'Startup must use money to buy new assets within 1 year',
                lockIn: { period: 5, unit: 'years' },
                validTill: '2026-03-31',  // Extended till March 31, 2026
                section: 'Section 54GB',
                explanation: 'Invest in eligible DPIIT startup to avoid capital gains on residential property sale.'
            }
        }
    },

    // ============================================
    // SPECIAL RULES
    // ============================================
    specialRules: {
        // Agricultural Income - Section 10(1) + Partial Integration
        agriculturalIncome: {
            status: 'Exempt under Section 10(1)',
            partialIntegration: {
                applicable: true,
                conditions: {
                    agriculturalIncomeThreshold: 5000,  // ₹5,000 - if exceeded, integration applies
                    nonAgriIncomeAboveExemption: true   // Non-agri income must exceed basic exemption
                },
                mechanism: {
                    step1: 'Calculate tax on (Non-Agri Income + Agri Income) = Tax A',
                    step2: 'Calculate tax on (Basic Exemption + Agri Income) = Tax B',
                    step3: 'Tax Payable = Tax A - Tax B',
                    step4: 'Add Surcharge and Cess on result'
                },
                effect: 'Agri income pushes non-agri income into higher tax bracket',
                applicableTo: ['Individual', 'HUF', 'AOP', 'BOI', 'Artificial Juridical Person'],
                notApplicableTo: ['Company', 'Firm', 'LLP']
            },
            itrForms: {
                upTo5000: 'ITR-1 allowed',
                above5000: 'ITR-2 or ITR-3 required'
            },
            section: 'Section 10(1)',
            explanation: 'Agricultural income is exempt. But if > ₹5K and non-agri income > exemption, it affects tax rate via partial integration.'
        },

        // Section 89 - Relief on Salary Arrears
        section89Relief: {
            applicableRegimes: ['old', 'new'],
            purpose: 'Relief when salary arrears/advance salary received, to avoid higher tax bracket',
            form: 'Form 10E',
            mandatory: true,  // Must file Form 10E before claiming relief
            eligibleArrears: [
                'Salary arrears',
                'Advance salary',
                'Gratuity',
                'Commuted pension',
                'Leave encashment (on retirement)',
                'Arrears of family pension',
                'Compensation under Section 10(10C)'
            ],
            calculationMechanism: {
                step1: 'Calculate tax on total income INCLUDING arrears (current year)',
                step2: 'Calculate tax on total income EXCLUDING arrears (current year)',
                step3: 'Tax attributable to arrears (current year) = Step1 - Step2',
                step4: 'Calculate tax on income of relevant past year(s) INCLUDING arrears',
                step5: 'Calculate tax on income of relevant past year(s) EXCLUDING arrears',
                step6: 'Tax attributable to arrears (spread over years) = Step4 - Step5',
                step7: 'Relief = Step3 - Step6 (if positive)'
            },
            deadline: 'Form 10E must be filed before ITR filing',
            section: 'Section 89(1)',
            explanation: 'Relief for arrears to avoid extra tax due to receipt in single year. File Form 10E mandatorily.'
        },

        // Clubbing of Income - Non-Minor rules
        clubbingOfIncome: {
            // Spouse income clubbing (Section 64(1)(ii) & (iv))
            spouseIncome: {
                remuneration: {
                    condition: 'Spouse employed in concern where assessee has substantial interest',
                    exemption: 'If spouse has technical/professional qualification and income is due to that qualification, NOT clubbed',
                    section: 'Section 64(1)(ii)'
                },
                assetTransfer: {
                    condition: 'Income from assets transferred to spouse without adequate consideration',
                    exception: 'Not applicable if transfer is under agreement to live apart',
                    section: 'Section 64(1)(iv)'
                }
            },
            // Daughter-in-law clubbing (Section 64(1)(vi) & (viii))
            daughterInLaw: {
                condition: 'Income from assets transferred to son\'s wife without adequate consideration',
                clubbedWith: 'Transferor (father/mother-in-law)',
                section: 'Section 64(1)(vi) & (viii)'
            },
            // HUF clubbing
            huf: {
                condition: 'Individual transfers assets to HUF without adequate consideration',
                clubbedWith: 'Individual transferor',
                section: 'Section 64(2)'
            }
        }
    },

    // ============================================
    // HELPER MESSAGES & EXPLANATIONS
    // For UI tooltips and reports
    // ============================================
    explanations: {
        newRegimeAdvantage: 'Lower tax rates, simpler compliance. Best for income ≤ ₹12.75L (zero tax) or if you have few deductions.',
        oldRegimeAdvantage: 'More deductions available (80C, 80D, HRA, etc.). Better if total deductions > ₹4.25L above new regime limit.',
        marginalRelief: 'If your income is slightly above ₹12L, tax is capped so you don\'t pay more than the income above ₹12L.',
        cess: '4% cess is added on top of tax + surcharge. Used for health and education.'
    },
    
    // Reliefs (Section 89, etc.)
    reliefs: {
        section89: {
            section: 'Section 89(1)',
            explanation: 'Relief for salary arrears/advance. Reduces tax liability. Form 10E mandatory.',
            applicableRegimes: ['old', 'new']
        }
    }
    },

    // ============================================
    // CAPITAL GAINS - Section 45, 54, 54F, 54EC
    // FY 2025-26 Rules (Budget 2025)
    // ============================================
    capitalGains: {
        // Equity / Shares (Section 111A, 112A)
        equity: {
            stcgRate: 0.20,      // 20% (Section 111A)
            ltcgRate: 0.125,     // 12.5% (Section 112A)
            ltcgExemptionLimit: 125000, // ₹1.25 Lakh exempt
            definition: 'Held for > 12 months is LTCG'
        },

        // Real Estate (Section 112)
        realEstate: {
            holdingPeriodMonths: 24, // > 24 months is LTCG
            grandfatherDate: '2024-07-23', // Cutoff for indexation option
            
            // Rules for properties bought BEFORE Jul 23, 2024
            grandfathered: {
                option1: { rate: 0.125, indexation: false, label: '12.5% without Indexation' },
                option2: { rate: 0.20, indexation: true, label: '20% with Indexation' }
                // Logic: Calculate both, pay lower tax
            },
            
            // Rules for properties bought ON/AFTER Jul 23, 2024
            newRules: {
                rate: 0.125,
                indexation: false,
                label: '12.5% without Indexation (Mandatory)'
            }
        },

        // Exemptions (Section 54 Family)
        exemptions: {
            // Section 54: Sell House -> Buy House
            section54: {
                maxLimit: 100000000, // ₹10 Crore Cap (FY 24-25 onwards)
                assetSource: 'residential_house',
                investmentTarget: 'residential_house',
                lockInYears: 3
            },
            
            // Section 54F: Sell Other Asset -> Buy House
            section54F: {
                maxLimit: 100000000, // ₹10 Crore Cap
                assetSource: 'other', // Gold, Land, Shares
                investmentTarget: 'residential_house',
                proRata: true, // Deduction = Gain * (Invested/NetConsideration)
                lockInYears: 3
            },
            
            // Section 54EC: Sell Land/Building -> Buy Bonds
            section54EC: {
                maxLimit: 5000000, // ₹50 Lakh Cap
                lockInYears: 5,
                bonds: ['NHAI', 'REC', 'PFC', 'IRFC']
            }
        },

        // Cost Inflation Index (CII) Table
        // Source: incometaxindia.gov.in
        cii: {
            '2025-26': 376, // Current FY
            '2024-25': 363,
            '2023-24': 348,
            '2022-23': 331,
            '2021-22': 317,
            '2020-21': 301,
            '2019-20': 289,
            '2018-19': 280,
            '2017-18': 272,
            '2016-17': 264,
            '2015-16': 254,
            '2014-15': 240,
            '2013-14': 220,
            '2012-13': 200,
            '2011-12': 184,
            '2010-11': 167,
            '2009-10': 148,
            '2008-09': 137,
            '2007-08': 129,
            '2006-07': 122,
            '2005-06': 117,
            '2004-05': 113,
            '2003-04': 109,
            '2002-03': 105,
            '2001-02': 100
        }
    }
};

// Make config immutable to prevent accidental modifications
Object.freeze(TAX_CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TAX_CONFIG;
}
