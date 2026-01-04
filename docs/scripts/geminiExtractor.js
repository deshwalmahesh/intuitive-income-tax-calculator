/**
 * GEMINI EXTRACTOR - Tax Document Data Extraction
 * Uses Gemini Flash API to extract salary/tax data from Form-16, Salary Slips, etc.
 * Supports both PDFs and Images (jpg/png)
 */

// Removed Hardcoded API Key
const GEMINI_MODEL = 'gemini-3-flash-preview'; // Use latest fast model
// Base URL - Key will be appended dynamically
const GEMINI_API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Get API Key from Local Storage
 */
function getGeminiApiKey() {
    return localStorage.getItem('gemini_api_key');
}

// Maximum file size (10MB recommended for inline base64)
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Comprehensive extraction prompt covering ALL Form-16/26AS components
 * Designed to match fields in config.js and app.js collectUserData()
 */
const EXTRACTION_PROMPT = `You are an expert Indian tax document analyzer. Analyze this document (Form-16, Form 26AS, Salary Slip, or Tax Statement) and extract ALL salary/tax information.

IMPORTANT CONTEXT:
- Financial Year 2025-26 runs from April 2025 to March 2026
- Extract ANNUAL figures for the employment period shown
- This is for an Indian Income Tax Calculator
- Documents may come from platforms like Deel, Remote.com, Turing, or standard Form-16s

EXTRACT THE FOLLOWING JSON STRUCTURE (return 0 for missing numeric fields, null for missing strings):

{
  // ===== DOCUMENT & EMPLOYER INFO =====
  "documentType": "Form16_PartA" | "Form16_PartB" | "Form16_Combined" | "Form26AS" | "SalarySlip" | "TaxStatement" | "Remote_Payslip" | "Deel_Payslip" | "Unknown",
  "employerName": "Company/Employer name",
  "employerPAN": "Employer PAN if visible (AAAAA9999A format)",
  "employeePAN": "Employee PAN if visible",
  
  // ===== EMPLOYMENT PERIOD =====
  "startMonth": 1-12 (employment start month, 4=April),
  "startYear": 4 digit year (2025 or 2026),
  "endMonth": 1-12 (employment end month, 3=March),
  "endYear": 4 digit year (2025 or 2026),
  
  // ===== SALARY COMPONENTS - Section 17(1) =====
  "grossSalary": (Total gross salary - Section 17(1) in Form-16),
  "basicPlusDA": (Basic salary + Dearness Allowance combined),
  "hraReceived": (House Rent Allowance received),
  "bonus": (Performance bonus, annual bonus, incentives, "Variable Pay", "Statutory Bonus"),
  "specialAllowance": (Special allowance, "Flexi Basket", "Other Allowance"),
  "ltaReceived": (Leave Travel Allowance, "LTA", "Leave Travel Concession"),
  "commission": (Commission received, if any),
  
  // ===== REIMBURSEMENTS & ALLOWANCES =====
  "telephoneReimb": (Telephone/Mobile/Internet. Look for: "Connectivity Allowance", "Communication Allowance", "Broadband"),
  "booksReimb": (Books/Periodicals. Look for: "Professional Development Allowance", "Learning Allowance"),
  "conveyanceAllowance": (Fuel/Conveyance. Look for: "Transport Allowance", "Petrol Reimbursement"),
  "driverAllowance": (Driver Salary/Allowance),
  "childrenEducationAllowance": (Children education allowance - Section 10(14), ₹100/child/month max 2 children),
  "hostelAllowance": (Hostel expenditure allowance - Section 10(14), ₹300/child/month max 2 children),
  "uniformAllowance": (Uniform allowance if mentioned),
  "mealVouchers": (Meal vouchers/Food coupons value),
  
  // ===== PERQUISITES & OTHER BENEFITS - Section 17(2) =====
  "perquisitesValue": (Value of perquisites u/s 17(2) - rent-free accommodation, car, etc.),
  "profitsInLieuOfSalary": (Profits in lieu of salary u/s 17(3)),
  
  // ===== RETIREMENT BENEFITS - Section 10 =====
  "gratuityReceived": (Gratuity received on retirement/resignation - Section 10(10)),
  "leaveEncashmentReceived": (Leave encashment on retirement - Section 10(10AA)),
  "vrsCompensation": (Voluntary Retirement Scheme compensation - Section 10(10C)),
  "retrenchmentCompensation": (Retrenchment compensation received - Section 10(10B)),
  "commutedPension": (Commuted pension received - Section 10(10A)),
  
  // ===== EMPLOYEE DEDUCTIONS =====
  "epfContribution": (Employee's own PF contribution - NOT employer's share. Look for "PF", "EPF"),
  "employerNPSContribution": (Employer's NPS contribution u/s 80CCD(2)),
  "employeeNPSContribution": (Employee's own NPS contribution u/s 80CCD(1)),
  "professionalTax": (Professional tax deducted. Look for "Prof Tax", "P Tax", "PT"),
  
  // ===== TAX COMPUTATION =====
  "totalTaxableIncome": (Net taxable salary as computed by employer),
  "taxDeductedTDS": (Total TDS deducted - look for 'Tax Deducted' or 'TDS'),
  "standardDeductionApplied": (Standard deduction amount applied - 50000 or 75000),
  "section89Relief": (Relief under Section 89(1) for arrears),
  
  // ===== CHAPTER VI-A DEDUCTIONS =====
  "section80CDeductions": (Total 80C deductions shown - PPF, ELSS, LIC, NSC, Tuition Fees etc.),
  "healthInsuranceSelf": (80D - Self/Family health insurance premium),
  "healthInsuranceParents": (80D - Parents health insurance premium),
  "educationLoanInterest": (80E - Interest on education loan - UNLIMITED deduction),
  "homeLoanInterest": (Section 24b - Home loan interest paid),
  "homeLoanPrincipal": (80C - Home loan principal repaid),
  "section80EEInterest": (Interest u/s 80EE - Home Loan FY 16-17, max 50000),
  "section80EEAInterest": (Interest u/s 80EEA - Affordable Housing FY 19-22, max 150000),
  "section80EEBInterest": (Interest on Electric Vehicle Loan - Section 80EEB, max 150000),
  "donations80G": (Donations u/s 80G to approved charities/funds),
  "agniveerContribution": (Agniveer Corpus Fund Contribution - Section 80CCH),
  
  // ===== OTHER INCOME (from Form 16 Part B or 26AS) =====
  "otherIncomeFromEmployer": (Any other income reported to employer for TDS - interest, rental, etc.),
  "giftsFromNonRelatives": (Gifts from non-relatives exceeding 50000 - Section 56(2)(x)),
  
  // ===== 26AS SPECIFIC (if applicable) =====
  "tcsCollected": (Tax Collected at Source - from 26AS Part B),
  "advanceTaxPaid": (Advance tax paid by assessee - 26AS Part C),
  "selfAssessmentTaxPaid": (Self-assessment tax paid - 26AS Part C),
  "refundReceived": (Refund received during the year - 26AS Part D),
  
  // ===== METADATA =====
  "extractionConfidence": "HIGH" | "MEDIUM" | "LOW",
  "notes": "Any assumptions made or issues found"
}

EXTRACTION RULES:
1. All monetary values must be NUMBERS without currency symbols (₹) or commas
2. Return ANNUAL totals for this employment period only
3. DO NOT hallucinate or guess values - return 0 if not clearly visible
4. basicPlusDA is typically 40-50% of grossSalary
5. epfContribution is typically 12% of Basic salary
6. Look for Form-16 sections: 17(1) for Salary, 17(2) for Perquisites, 17(3) for Profits
7. For Remote.com/Deel documents, map allowances to specific fields
8. Gratuity/Leave Encashment are usually shown separately (retirement benefits)
9. 80G donations may appear under "Deductions" section in Form-16 Part B
10. If document is partial or unclear, set extractionConfidence to LOW`;

/**
 * Convert file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded string
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Get MIME type for file
 * @param {File} file - The uploaded file
 * @returns {string} MIME type string
 */
function getFileMimeType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
    };
    return mimeTypes[extension] || file.type || 'application/octet-stream';
}

/**
 * Validate file before processing
 * @param {File} file - The file to validate
 * @returns {Object} {valid: boolean, error: string|null}
 */
function validateFile(file) {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum ${MAX_FILE_SIZE_MB}MB allowed.`
        };
    }
    
    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mimeType = getFileMimeType(file);
    if (!allowedTypes.includes(mimeType)) {
        return {
            valid: false,
            error: `Unsupported file type. Please upload PDF or Image (JPG/PNG).`
        };
    }
    
    return { valid: true, error: null };
}

/**
 * Helper to wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract tax data from a document using Gemini API
 * @param {File} file - The document file (PDF or Image)
 * @returns {Promise<Object>} Extracted data with structure matching our form fields
 */
async function extractTaxData(file) {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // Convert to base64
    const base64Data = await fileToBase64(file);
    const mimeType = getFileMimeType(file);
    
    console.log(`[GeminiExtractor] Processing ${file.name} (${mimeType}, ${(file.size / 1024).toFixed(1)}KB)`);
    
    // Build request
    const requestBody = {
        contents: [{
            parts: [
                { text: EXTRACTION_PROMPT },
                { 
                    inline_data: { 
                        mime_type: mimeType, 
                        data: base64Data 
                    }
                }
            ]
        }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
        }
    };
    
    // Get API Key
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("Missing API Key. Please enter your Gemini API Key in the upload section.");
    }
    
    // retry logic ...
    const maxRetries = 2;
    let retries = 0;
    
    while (true) {
        try {
            const response = await fetch(`${GEMINI_API_BASE_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (response.status === 429) {
                const errorJson = await response.json();
                let retryAfter = 60; // Default 60 seconds
                
                // Try to extract retry delay from error details
                if (errorJson.error && errorJson.error.message) {
                    const match = errorJson.error.message.match(/retry in (\d+(\.\d+)?)s/);
                    if (match) {
                        retryAfter = parseFloat(match[1]) + 2; // Add 2s buffer
                    }
                }
                
                if (retries < maxRetries) {
                    console.warn(`[GeminiExtractor] Rate limit hit. Retrying in ${retryAfter.toFixed(1)}s... (Attempt ${retries + 1}/${maxRetries})`);
                    await delay(retryAfter * 1000);
                    retries++;
                    continue; // Retry loop
                } else {
                    throw new Error(`Quota exceeded. Please wait ${retryAfter.toFixed(0)}s and try again.`);
                }
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                // Check for invalid key specifically
                if (response.status === 400 && errorText.includes('API key not valid')) {
                     throw new Error('Invalid API Key. Please check the key you entered.');
                }
                console.error('[GeminiExtractor] API Error:', errorText);
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Extract the JSON from response
            let extractedData;
            try {
                const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textContent) {
                    throw new Error('No content in Gemini response');
                }
                extractedData = JSON.parse(textContent);
            } catch (parseError) {
                console.error('[GeminiExtractor] Parse error:', parseError);
                throw new Error('Failed to parse Gemini response as JSON');
            }
            
            // Validate and normalize extracted data
            return validateAndNormalizeExtraction(extractedData, file.name);
            
        } catch (error) {
            // Re-throw if it's our custom quota error or other fatal error
            throw error;
        }
    }
}

/**
 * Validate extracted data and apply sanity checks
 * @param {Object} data - Raw extracted data from Gemini
 * @param {string} fileName - Original file name for logging
 * @returns {Object} Validated and normalized data with warnings
 */
function validateAndNormalizeExtraction(data, fileName) {
    const warnings = [];
    const normalized = { ...data };
    
    // Ensure all numeric fields are numbers
    const numericFields = [
        // Salary Components
        'grossSalary', 'basicPlusDA', 'hraReceived', 'bonus', 'specialAllowance',
        'ltaReceived', 'commission',
        // Reimbursements & Allowances
        'telephoneReimb', 'booksReimb', 'conveyanceAllowance', 'driverAllowance',
        'childrenEducationAllowance', 'hostelAllowance', 'uniformAllowance', 'mealVouchers',
        // Perquisites
        'perquisitesValue', 'profitsInLieuOfSalary',
        // Retirement Benefits
        'gratuityReceived', 'leaveEncashmentReceived', 'vrsCompensation',
        'retrenchmentCompensation', 'commutedPension',
        // Employee Deductions
        'epfContribution', 'employerNPSContribution', 'employeeNPSContribution', 'professionalTax',
        // Tax Computation
        'totalTaxableIncome', 'taxDeductedTDS', 'standardDeductionApplied', 'section89Relief',
        // Chapter VI-A Deductions
        'section80CDeductions', 'healthInsuranceSelf', 'healthInsuranceParents',
        'educationLoanInterest', 'homeLoanInterest', 'homeLoanPrincipal',
        'section80EEInterest', 'section80EEAInterest', 'section80EEBInterest',
        'donations80G', 'agniveerContribution',
        // Other Income
        'otherIncomeFromEmployer', 'giftsFromNonRelatives',
        // 26AS Specific
        'tcsCollected', 'advanceTaxPaid', 'selfAssessmentTaxPaid', 'refundReceived',
        // Dates
        'startMonth', 'endMonth', 'startYear', 'endYear'
    ];
    
    numericFields.forEach(field => {
        if (normalized[field] === null || normalized[field] === undefined) {
            normalized[field] = 0;
        } else {
            normalized[field] = parseFloat(normalized[field]) || 0;
        }
    });
    
    // Validation: Basic/Gross ratio
    if (normalized.grossSalary > 0 && normalized.basicPlusDA > 0) {
        const basicRatio = normalized.basicPlusDA / normalized.grossSalary;
        if (basicRatio < 0.30) {
            warnings.push(`Basic+DA seems low (${(basicRatio * 100).toFixed(0)}% of Gross). Typical is 40-50%.`);
        } else if (basicRatio > 0.70) {
            warnings.push(`Basic+DA seems high (${(basicRatio * 100).toFixed(0)}% of Gross). Typical is 40-50%.`);
        }
    }
    
    // Validation: EPF is typically 12% of Basic
    if (normalized.basicPlusDA > 0 && normalized.epfContribution > 0) {
        const epfRatio = normalized.epfContribution / normalized.basicPlusDA;
        if (epfRatio < 0.08 || epfRatio > 0.16) {
            warnings.push(`EPF contribution (${(epfRatio * 100).toFixed(0)}% of Basic) differs from typical 12%.`);
        }
    }
    
    // Set default dates if not extracted (full FY)
    if (!normalized.startMonth || normalized.startMonth < 1 || normalized.startMonth > 12) {
        normalized.startMonth = 4;  // April
        normalized.startYear = 2025;
        warnings.push('Employment start date not found, defaulting to April 2025.');
    }
    if (!normalized.endMonth || normalized.endMonth < 1 || normalized.endMonth > 12) {
        normalized.endMonth = 3;  // March
        normalized.endYear = 2026;
        warnings.push('Employment end date not found, defaulting to March 2026.');
    }
    
    // Default employer name
    if (!normalized.employerName) {
        normalized.employerName = fileName.replace(/\\.[^.]+$/, '').replace(/[-_]/g, ' ');
        warnings.push('Employer name not found, using filename.');
    }
    
    // Add warnings and source info
    normalized._warnings = warnings;
    normalized._sourceFile = fileName;
    normalized._extractedAt = new Date().toISOString();
    
    console.log(`[GeminiExtractor] Extracted from ${fileName}:`, normalized);
    if (warnings.length > 0) {
        console.warn(`[GeminiExtractor] Warnings:`, warnings);
    }
    
    return normalized;
}

/**
 * Aggregate data from multiple job extractions
 * Handles fields that should be summed vs taken once
 * @param {Array<Object>} jobsData - Array of extracted job data
 * @returns {Object} Aggregated data with per-job and global fields
 */
function aggregateMultipleJobs(jobsData) {
    const aggregated = {
        jobs: jobsData,
        
        // === Aggregated Fields ===
        // Sum across jobs (per-job nature)
        totalProfessionalTax: 0,
        totalEmployerNPS: 0,
        totalEmployeeNPS: 0,
        
        // Retirement Benefits (sum - could be from different employers)
        totalGratuity: 0,
        totalLeaveEncashment: 0,
        totalVRSCompensation: 0,
        totalRetrenchmentCompensation: 0,
        totalCommutedPension: 0,
        
        // Max fields (Annual limits/Declarations usually duplicated across Form 16s)
        totalHealthInsuranceSelf: 0,
        totalHealthInsuranceParents: 0,
        totalHomeLoanInterest: 0,
        totalHomeLoanPrincipal: 0,
        totalEducationLoanInterest: 0,
        totalSection80EEInterest: 0,
        totalSection80EEAInterest: 0,
        totalSection80EEBInterest: 0,
        totalSection89Relief: 0,
        totalAgniveerContribution: 0,
        totalSection80CDeductions: 0,
        totalDonations80G: 0,
        
        // Other Income
        totalGiftsFromNonRelatives: 0,
        totalOtherIncomeFromEmployer: 0,
        
        // 26AS Specific (sum)
        totalTCS: 0,
        totalAdvanceTax: 0,
        totalSelfAssessmentTax: 0,
        totalRefund: 0,
        
        // Summary
        totalJobs: jobsData.length,
        allWarnings: []
    };
    
    jobsData.forEach((job, index) => {
        // === SUM FIELDS (per-job nature) ===
        aggregated.totalProfessionalTax += job.professionalTax || 0;
        aggregated.totalEmployerNPS += job.employerNPSContribution || 0;
        aggregated.totalEmployeeNPS += job.employeeNPSContribution || 0;
        
        // Retirement benefits (sum from multiple employers)
        aggregated.totalGratuity += job.gratuityReceived || 0;
        aggregated.totalLeaveEncashment += job.leaveEncashmentReceived || 0;
        aggregated.totalVRSCompensation += job.vrsCompensation || 0;
        aggregated.totalRetrenchmentCompensation += job.retrenchmentCompensation || 0;
        aggregated.totalCommutedPension += job.commutedPension || 0;
        
        // Other income (sum)
        aggregated.totalOtherIncomeFromEmployer += job.otherIncomeFromEmployer || 0;
        
        // 26AS fields (sum)
        aggregated.totalTCS += job.tcsCollected || 0;
        aggregated.totalAdvanceTax += job.advanceTaxPaid || 0;
        aggregated.totalSelfAssessmentTax += job.selfAssessmentTaxPaid || 0;
        aggregated.totalRefund += job.refundReceived || 0;
        
        // === MAX FIELDS (Annual limits/Declarations) ===
        aggregated.totalHealthInsuranceSelf = Math.max(aggregated.totalHealthInsuranceSelf, job.healthInsuranceSelf || 0);
        aggregated.totalHealthInsuranceParents = Math.max(aggregated.totalHealthInsuranceParents, job.healthInsuranceParents || 0);
        aggregated.totalHomeLoanInterest = Math.max(aggregated.totalHomeLoanInterest, job.homeLoanInterest || 0);
        aggregated.totalHomeLoanPrincipal = Math.max(aggregated.totalHomeLoanPrincipal, job.homeLoanPrincipal || 0);
        aggregated.totalEducationLoanInterest = Math.max(aggregated.totalEducationLoanInterest, job.educationLoanInterest || 0);
        aggregated.totalSection80EEInterest = Math.max(aggregated.totalSection80EEInterest, job.section80EEInterest || 0);
        aggregated.totalSection80EEAInterest = Math.max(aggregated.totalSection80EEAInterest, job.section80EEAInterest || 0);
        aggregated.totalSection80EEBInterest = Math.max(aggregated.totalSection80EEBInterest, job.section80EEBInterest || 0);
        aggregated.totalSection89Relief = Math.max(aggregated.totalSection89Relief, job.section89Relief || 0);
        aggregated.totalAgniveerContribution = Math.max(aggregated.totalAgniveerContribution, job.agniveerContribution || 0);
        aggregated.totalSection80CDeductions = Math.max(aggregated.totalSection80CDeductions, job.section80CDeductions || 0);
        aggregated.totalDonations80G = Math.max(aggregated.totalDonations80G, job.donations80G || 0);
        aggregated.totalGiftsFromNonRelatives = Math.max(aggregated.totalGiftsFromNonRelatives, job.giftsFromNonRelatives || 0);
        
        // Collect all warnings
        if (job._warnings && job._warnings.length > 0) {
            aggregated.allWarnings.push(...job._warnings.map(w => `Job ${index + 1}: ${w}`));
        }
    });
    
    // Cap professional tax at constitutional limit
    if (aggregated.totalProfessionalTax > 2500) {
        aggregated.allWarnings.push(`Total Professional Tax (₹${aggregated.totalProfessionalTax}) exceeds ₹2,500 limit. Capped.`);
        aggregated.totalProfessionalTax = 2500;
    }
    
    return aggregated;
}

// Export functions for use by other modules
window.GeminiExtractor = {
    extractTaxData,
    validateFile,
    aggregateMultipleJobs,
    validateFile,
    getGeminiApiKey,
    MAX_FILE_SIZE_MB
};
