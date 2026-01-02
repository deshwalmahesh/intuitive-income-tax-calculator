/**
 * TAX DOCUMENT UPLOADER - UI and Orchestration
 * Handles file upload, extraction progress, preview, and form population
 */

// State for uploads
let uploadedFiles = [];
let extractedJobsData = [];

/**
 * Initialize the document uploader on page load
 */
function initializeDocumentUploader() {
    // Initialize API Key UI
    setupApiKeyHandling();

    // Get DOM elements - MUST be defined before use
    const fileInput = document.getElementById('taxDocuments');
    const uploadArea = document.getElementById('documentUploadArea');

    if (!fileInput || !uploadArea) {
        console.warn('[DocumentUploader] Upload elements not found');
        return;
    }
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelection);
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    });
    
    console.log('[DocumentUploader] Initialized');
}

/**
 * Setup API Key Handling (Debounced Auto-save)
 */
function setupApiKeyHandling() {
    const input = document.getElementById('geminiApiKey');
    const statusIcon = document.getElementById('apiKeyStatusIcon');
    const statusText = document.getElementById('apiKeyStatus');
    
    if (!input) return;
    
    // Load existing key
    const existingKey = localStorage.getItem('gemini_api_key');
    if (existingKey) {
        input.value = existingKey;
        if(statusIcon) statusIcon.style.opacity = '1';
    }
    
    // Debounce timer
    let debounceTimer;
    
    input.addEventListener('input', (e) => {
        const key = e.target.value.trim();
        
        // Clear previous timer
        clearTimeout(debounceTimer);
        
        // Hide success icon while typing
        if(statusIcon) statusIcon.style.opacity = '0';
        
        // Set new timer (500ms)
        debounceTimer = setTimeout(() => {
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                if(statusIcon) statusIcon.style.opacity = '1';
                // Trigger any UI updates needed (e.g. enable extract button)
                updateExtractButton();
            } else {
                localStorage.removeItem('gemini_api_key');
                updateExtractButton();
            }
        }, 500);
    });
    
    // Immediate update on blur (focus out) to safeguard against quick navigation
    input.addEventListener('blur', (e) => {
         const key = e.target.value.trim();
         if (key) {
             localStorage.setItem('gemini_api_key', key);
             if(statusIcon) statusIcon.style.opacity = '1';
         } else {
             localStorage.removeItem('gemini_api_key');
         }
         updateExtractButton();
    });
}

/**
 * Handle file selection from input
 */
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
    // Reset input to allow re-selecting same file
    event.target.value = '';
}

/**
 * Add files to the upload list
 * @param {File[]} files - Array of files to add
 */
function addFiles(files) {
    files.forEach(file => {
        // Validate file
        const validation = window.GeminiExtractor.validateFile(file);
        
        const fileEntry = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: validation.valid ? 'pending' : 'error',
            error: validation.error,
            extractedData: null
        };
        
        uploadedFiles.push(fileEntry);
    });
    
    renderFileList();
    updateExtractButton();
}

/**
 * Remove a file from the list
 * @param {string} fileId - ID of file to remove
 */
function removeUploadedFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    extractedJobsData = extractedJobsData.filter(j => j._fileId !== fileId);
    renderFileList();
    updateExtractButton();
}

/**
 * Render the list of uploaded files
 */
function renderFileList() {
    const container = document.getElementById('uploadedDocsList');
    if (!container) return;
    
    if (uploadedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const html = uploadedFiles.map(f => {
        const sizeKB = (f.size / 1024).toFixed(1);
        const statusIcon = {
            'pending': '⏳',
            'extracting': '🔄',
            'done': '✅',
            'error': '❌'
        }[f.status];
        
        const statusClass = f.status === 'error' ? 'color: var(--color-danger);' : '';
        
        return `
            <div class="uploaded-file-item" id="${f.id}" style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--color-border); border-radius: 6px; margin-bottom: 8px; background: var(--color-bg-secondary);">
                <span style="font-size: 24px;">${f.type.includes('pdf') ? '📄' : '🖼️'}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${sizeKB} KB</div>
                    ${f.error ? `<div style="font-size: 12px; color: var(--color-danger);">${f.error}</div>` : ''}
                </div>
                <span style="font-size: 18px; ${statusClass}">${statusIcon}</span>
                <button onclick="removeUploadedFile('${f.id}')" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px;" title="Remove">✕</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

/**
 * Update extract button visibility
 */
function updateExtractButton() {
    const btn = document.getElementById('extractBtn');
    if (!btn) return;
    
    const validFiles = uploadedFiles.filter(f => f.status === 'pending' || f.status === 'done');
    const hasKey = typeof window.GeminiExtractor?.getGeminiApiKey === 'function' 
        && !!window.GeminiExtractor.getGeminiApiKey();
    
    if (validFiles.length > 0) {
        btn.style.display = 'block';
        if (validFiles.filter(f => f.status === 'pending').length > 0) {
            // There are pending files to extract
            if (hasKey) {
                btn.disabled = false;
                btn.textContent = '🤖 Extract Data with AI';
                btn.title = '';
            } else {
                btn.disabled = true;
                btn.textContent = '⚠️ API Key Required to Extract';
                btn.title = 'Please enter and save your Gemini API Key above';
            }
        } else {
            // All done
            btn.disabled = true;
            btn.textContent = '✅ Extraction Complete';
        }
    } else {
        btn.style.display = 'none';
    }
}

/**
 * Extract data from all pending documents and directly populate form fields
 */
/**
 * Extract data from all pending documents and directly populate form fields
 * Processes files one by one and updates UI immediately after each success
 */
async function extractFromDocuments() {
    const btn = document.getElementById('extractBtn');
    const statusDiv = document.getElementById('extractionStatus');
    
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = '🔄 Extracting...';
    
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<p style="color: var(--color-primary);">🤖 Analyzing documents with AI...</p>';
    }
    
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    let successCount = 0;
    
    // Check if we should clear the default empty period before starting
    // We do this only once before the first successful extraction
    let defaultPeriodCleared = false;
    
    for (let i = 0; i < pendingFiles.length; i++) {
        const fileEntry = pendingFiles[i];
        
        // Update status for current file
        fileEntry.status = 'extracting';
        renderFileList();
        
        if (statusDiv) {
            statusDiv.innerHTML = `<p style="color: var(--color-primary);">🔄 Processing ${i + 1}/${pendingFiles.length}: ${fileEntry.name}...</p>`;
        }
        
        try {
            // 1. Extract Data
            const extracted = await window.GeminiExtractor.extractTaxData(fileEntry.file);
            extracted._fileId = fileEntry.id;
            
            fileEntry.status = 'done';
            fileEntry.extractedData = extracted;
            extractedJobsData.push(extracted);
            
            // 2. Clear default empty period if this is the first success
            if (!defaultPeriodCleared) {
                const existingPeriods = window.employmentPeriods || [];
                // Only clear if there's exactly one period and it's practically empty (gross=0)
                if (existingPeriods.length === 1 && existingPeriods[0].grossSalary === 0) {
                    if (typeof window.removeEmploymentPeriod === 'function') {
                        window.removeEmploymentPeriod(existingPeriods[0].id);
                        defaultPeriodCleared = true;
                    }
                }
            }
            
            // 3. IMMEDIATELY Apply this job to the form (Create Card)
            if (typeof window.createEmploymentPeriodFromExtraction === 'function') {
                window.createEmploymentPeriodFromExtraction(extracted);
            } else {
                console.error('[DocumentUploader] createEmploymentPeriodFromExtraction not found');
            }
            
            // 4. Update aggregated global fields (using ALL extracted data so far)
            const aggregated = window.GeminiExtractor.aggregateMultipleJobs(extractedJobsData);
            if (typeof window.populateGlobalFieldsFromExtraction === 'function') {
                window.populateGlobalFieldsFromExtraction(aggregated);
            }
            
            // 5. Scroll to employment section
            const employmentSection = document.getElementById('section-employment');
            if (employmentSection) {
                employmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // 6. Trigger calculation
            if (typeof calculateTax === 'function') {
                setTimeout(calculateTax, 200);
            }
            
            // 7. Expand sections that now have data
            if (typeof window.expandSectionsWithData === 'function') {
                window.expandSectionsWithData();
            }
            
            successCount++;
            
        } catch (error) {
            console.error(`[DocumentUploader] Extraction failed for ${fileEntry.name}:`, error);
            fileEntry.status = 'error';
            fileEntry.error = error.message;
        }
        
        renderFileList();
        
        // Small delay between files to be nice to the API/UI
        if (i < pendingFiles.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    btn.disabled = false;
    btn.textContent = '🤖 Extract Data with AI';
    
    // Final status update
    if (statusDiv) {
        const errorCount = uploadedFiles.filter(f => f.status === 'error').length;
        if (errorCount === 0) {
            statusDiv.innerHTML = `
                <p style="color: var(--color-success);">
                    ✅ All Done! Processed ${successCount} document(s).
                </p>
            `;
        } else {
            statusDiv.innerHTML = `
                <p style="color: var(--color-text-primary);">
                    🏁 Completed. <span style="color: var(--color-success);">${successCount} successful</span>, 
                    <span style="color: var(--color-danger);">${errorCount} failed</span>.
                </p>
            `;
        }
    }
}

/**
 * Apply all currently extracted data to the form (Utility/Fallback)
 * Note: extractFromDocuments now handles this incrementally, so this is rarely needed main flow
 */
function applyExtractionToForm() {
    if (extractedJobsData.length === 0) {
        alert('No extracted data to apply.');
        return;
    }
    
    // Clear existing employment periods if they are empty
    const existingPeriods = window.employmentPeriods || [];
    if (existingPeriods.length === 1 && existingPeriods[0].grossSalary === 0) {
        if (typeof removeEmploymentPeriod === 'function') {
            removeEmploymentPeriod(existingPeriods[0].id);
        }
    }
    
    // Create employment periods for each extracted job
    extractedJobsData.forEach(job => {
        if (typeof createEmploymentPeriodFromExtraction === 'function') {
            createEmploymentPeriodFromExtraction(job);
        }
    });
    
    // Populate global fields
    const aggregated = window.GeminiExtractor.aggregateMultipleJobs(extractedJobsData);
    if (typeof populateGlobalFieldsFromExtraction === 'function') {
        populateGlobalFieldsFromExtraction(aggregated);
    }
    
    // Trigger tax calculation
    if (typeof calculateTax === 'function') {
        setTimeout(calculateTax, 500); 
    }
}

/**
 * Clear extraction results
 */
function clearExtractionResults() {
    uploadedFiles = [];
    extractedJobsData = [];
    renderFileList();
    updateExtractButton();
    
    const container = document.getElementById('extractionResults');
    if (container) container.style.display = 'none';
    
    const statusDiv = document.getElementById('extractionStatus');
    if (statusDiv) statusDiv.style.display = 'none';
}

// Initialize on DOM ready (can also be called from app.js initializeApp)
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure GeminiExtractor is loaded
    setTimeout(initializeDocumentUploader, 100);
});

// Expose functions globally
window.extractFromDocuments = extractFromDocuments;
window.removeUploadedFile = removeUploadedFile;
window.applyExtractionToForm = applyExtractionToForm;
window.clearExtractionResults = clearExtractionResults;
