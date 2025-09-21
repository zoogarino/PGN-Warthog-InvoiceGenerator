// Function to calculate days between two dates (inclusive)
function calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
    return Math.floor((end - start) / oneDay) + 1; // Add 1 to include both start and end dates
}

// Function to update total days and recalculate costs
function updateDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const totalDays = calculateDays(startDate, endDate);
    
    if (totalDays < 0) {
        alert('End date must be after start date');
        document.getElementById('endDate').value = startDate;
        document.getElementById('totalDays').textContent = '0';
        return;
    }
    
    document.getElementById('totalDays').textContent = totalDays;
    
    // Update all row calculations
    const rows = document.querySelectorAll('.costs-table tbody tr:not(.total-row):not(.vat-row):not(.grand-total-row)');
    rows.forEach(row => {
        if (row.querySelector('.units')) {
            row.querySelector('.units').textContent = totalDays;
            calculateRowTotal(row);
        }
    });
    calculateTotals();
}

// Function to export to PDF
function exportToPDF() {
    const element = document.querySelector('.invoice-container');
    const opt = {
        margin: 10,
        filename: 'invoice.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: true,
            allowTaint: true,
            imageTimeout: 0,
            onclone: function(clonedDoc) {
                // Handle the logo in the cloned document
                const logoImg = clonedDoc.querySelector('.company-logo');
                if (logoImg) {
                    // Convert relative path to absolute path
                    const absolutePath = new URL(logoImg.src, window.location.href).href;
                    logoImg.src = absolutePath;
                }
            }
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };

    // Temporarily hide the export button
    const exportBtn = document.getElementById('exportPDF');
    exportBtn.style.display = 'none';

    // Find all placeholder elements
    const placeholders = element.querySelectorAll('.placeholder');
    const emptyPlaceholders = [];

    // Store empty placeholders and temporarily clear their content
    placeholders.forEach(placeholder => {
        if (placeholder.textContent.trim() === placeholder.originalText) {
            emptyPlaceholders.push({
                element: placeholder,
                text: placeholder.textContent
            });
            placeholder.textContent = '';
        }
    });

    // Temporarily hide the Add Row button
    const addRowBtn = document.querySelector('.costs-section button');
    if (addRowBtn) {
        addRowBtn.style.display = 'none';
    }

    // Generate PDF
    // Add detailed error logging
    console.log('Starting PDF generation...');
    console.log('Options:', opt);
    console.log('Element to convert:', element);

    // Check if html2pdf is loaded
    if (typeof html2pdf === 'undefined') {
        console.error('html2pdf is not loaded!');
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    // Check if the logo is loaded
    const logo = element.querySelector('.company-logo');
    if (logo) {
        console.log('Logo found:', logo.src);
        console.log('Logo complete:', logo.complete);
        console.log('Logo natural size:', logo.naturalWidth, 'x', logo.naturalHeight);
    } else {
        console.warn('Logo not found in the document');
    }

    html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
            console.log('PDF generated successfully');
        })
        .catch(err => {
            console.error('PDF generation failed with error:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
            alert('Failed to generate PDF. Check console for details. Error: ' + err.message);
        })
        .finally(() => {
            // Always restore the UI state, even if there's an error
            emptyPlaceholders.forEach(item => {
                item.element.textContent = item.text;
            });
            // Show the export button again
            exportBtn.style.display = 'block';
            // Show the Add Row button again
            if (addRowBtn) {
                addRowBtn.style.display = 'block';
            }
        });
}

// Function to handle placeholder behavior
function initializePlaceholders() {
    const editables = document.querySelectorAll('.editable[contenteditable="true"]:not(#headerReference):not(#clientReference)');
    
    editables.forEach(editable => {
        // Skip if it's already been initialized
        if (editable.dataset.initialized) return;
        
        const originalText = editable.textContent;
        editable.originalText = originalText; // Store original text on the element
        editable.classList.add('placeholder');
        
        editable.addEventListener('focus', function() {
            if (this.textContent.trim() === this.originalText) {
                this.textContent = '';
                this.classList.remove('placeholder');
            }
        });
        
        editable.addEventListener('blur', function() {
            if (this.textContent.trim() === '') {
                this.textContent = this.originalText;
                this.classList.add('placeholder');
            }
        });
        
        // Mark as initialized
        editable.dataset.initialized = 'true';
    });
}

// Function to sync reference fields
function syncReferences(sourceId, targetId) {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    
    if (!source || !target) return;

    source.addEventListener('input', function() {
        // Always sync the content
        target.textContent = this.textContent;
        // Remove placeholder class if content is not empty
        if (this.textContent.trim() !== '') {
            target.classList.remove('placeholder');
            this.classList.remove('placeholder');
        }
    });

    // Ensure the field is properly initialized for editing
    source.addEventListener('focus', function() {
        if (this.classList.contains('placeholder')) {
            this.textContent = '';
            this.classList.remove('placeholder');
        }
    });

    source.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.getAttribute('data-placeholder') || 'Enter PGN Reference';
            this.classList.add('placeholder');
            target.textContent = this.textContent;
            target.classList.add('placeholder');
        }
    });
}

// Initialize reference field
function initializeReferenceField() {
    const headerRef = document.getElementById('headerReference');
    const clientRef = document.getElementById('clientReference');

    if (headerRef && clientRef) {
        // Add placeholder class initially
        clientRef.classList.add('placeholder');

        // Set up event listeners for client reference
        clientRef.addEventListener('focus', function() {
            if (this.classList.contains('placeholder')) {
                this.textContent = '';
                this.classList.remove('placeholder');
            }
        });

        clientRef.addEventListener('blur', function() {
            if (this.textContent.trim() === '') {
                this.textContent = 'Enter PGN Reference';
                this.classList.add('placeholder');
                headerRef.textContent = '';
            }
        });

        clientRef.addEventListener('input', function() {
            // Update header reference with the same text
            headerRef.textContent = this.textContent;
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Logo is now handled directly in HTML
    // Initialize reference field
    initializeReferenceField();
    const costsTable = document.querySelector('.costs-table tbody');
    
    // Create add row button
    const addRowBtn = document.createElement('button');
    addRowBtn.textContent = '+ Add Row';
    addRowBtn.style.cssText = 'margin: 10px 0; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;';
    
    function createNewRow() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td class="description-col editable" contenteditable="true">[New Item]</td>
            <td class="editable qty" contenteditable="true">0</td>
            <td class="editable price" contenteditable="true">0.00</td>
            <td class="editable units" contenteditable="true">1</td>
            <td class="row-total">0.00</td>
        `;
        
        // Add event listeners to the new row
        addRowCalculation(newRow);
        return newRow;
    }
    
    addRowBtn.addEventListener('click', function() {
        const newRow = createNewRow();
        const subtotalRow = costsTable.querySelector('.total-row');
        costsTable.insertBefore(newRow, subtotalRow);
    });
    
    // Insert button after the costs section
    const costsSection = document.querySelector('.costs-section');
    costsSection.appendChild(addRowBtn);

    // Function to parse currency value
    function parseCurrencyValue(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
    }

    // Function to format currency
    function formatCurrency(value) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Function to calculate row total
    function calculateRowTotal(row) {
        const qty = parseCurrencyValue(row.querySelector('.qty').textContent);
        const price = parseCurrencyValue(row.querySelector('.price').textContent);
        const units = parseCurrencyValue(row.querySelector('.units').textContent);
        const total = qty * price * units;
        row.querySelector('.row-total').textContent = formatCurrency(total);
        return total;
    }

    // Function to add calculation listeners to a row
    function addRowCalculation(row) {
        const editableCells = row.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.addEventListener('input', function() {
                calculateRowTotal(row);
                calculateTotals();
            });

            // Ensure numeric input
            cell.addEventListener('keypress', function(e) {
                if (cell.classList.contains('qty') || cell.classList.contains('units')) {
                    // Only allow numbers
                    if (!/[\d]/.test(e.key)) {
                        e.preventDefault();
                    }
                } else if (cell.classList.contains('price')) {
                    // Allow numbers and decimal point
                    if (!/[\d.]/.test(e.key)) {
                        e.preventDefault();
                    }
                    // Prevent multiple decimal points
                    if (e.key === '.' && this.textContent.includes('.')) {
                        e.preventDefault();
                    }
                }
            });
        });
    }

    // Function to calculate all totals
    function calculateTotals() {
        let subtotal = 0;
        const rows = costsTable.querySelectorAll('tr:not(.total-row):not(.vat-row):not(.grand-total-row)');
        
        rows.forEach(row => {
            if (row.querySelector('.row-total')) {
                subtotal += parseCurrencyValue(row.querySelector('.row-total').textContent);
            }
        });

        const vatRate = 0.15; // 15% VAT
        const vatAmount = subtotal * vatRate;
        const grandTotal = subtotal + vatAmount;

        // Update totals
        document.getElementById('subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('vat-amount').textContent = formatCurrency(vatAmount);
        document.getElementById('grand-total').textContent = formatCurrency(grandTotal);
    }

    // Initialize calculations for existing rows
    const existingRows = costsTable.querySelectorAll('tr:not(.total-row):not(.vat-row):not(.grand-total-row)');
    existingRows.forEach(row => {
        addRowCalculation(row);
    });

    // Initial calculation
    calculateTotals();

    // Add event listener for PDF export
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);

    // Initialize placeholders
    initializePlaceholders();

    // Initialize placeholders for dynamically added rows
    addRowBtn.addEventListener('click', function() {
        // Wait for DOM to update
        setTimeout(initializePlaceholders, 0);
    });
});
