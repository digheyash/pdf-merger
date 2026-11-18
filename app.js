/**
 * PDF Merger & Page Numberer - Main Application Logic
 * 100% Client-Side PDF Processing using PDF-Lib & PDF.js
 */

(() => {
  'use strict';

  // =========================================================================
  // State Management
  // =========================================================================
  const state = {
    files: [], // Array of { id, file, name, size, pageCount, arrayBuffer, thumbUrl }
    isProcessing: false,
    mergedBlobUrl: null,
    mergedBytes: null,
    mergedTotalPages: 0,
    theme: localStorage.getItem('pdf_merger_theme') || 'light',
    settings: {
      enableNumbering: true,
      position: 'bottom-center',
      format: 'Page {n} of {total}',
      customFormat: 'Page {n} of {total}',
      startNumber: 1,
      skipPages: 0,
      includeSkippedInTotal: true,
      fontFamily: 'Helvetica',
      fontSize: 10,
      fontColor: '#1f2937',
      margin: 28,
    }
  };

  // =========================================================================
  // DOM Elements Cache
  // =========================================================================
  const el = {
    // Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    moonIcon: document.getElementById('moonIcon'),
    sunIcon: document.getElementById('sunIcon'),
    libStatusBanner: document.getElementById('libStatusBanner'),

    // Dropzone & File List
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    fileList: document.getElementById('fileList'),
    emptyState: document.getElementById('emptyState'),
    filesToolbar: document.getElementById('filesToolbar'),
    filesSummaryBadge: document.getElementById('filesSummaryBadge'),
    summaryCount: document.getElementById('summaryCount'),
    summaryPages: document.getElementById('summaryPages'),
    addMoreBtn: document.getElementById('addMoreBtn'),
    sortAzBtn: document.getElementById('sortAzBtn'),
    reverseBtn: document.getElementById('reverseBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),

    // Settings
    enableNumberingToggle: document.getElementById('enableNumberingToggle'),
    settingsContainer: document.getElementById('settingsContainer'),
    posButtons: document.querySelectorAll('.pos-btn'),
    formatSelect: document.getElementById('formatSelect'),
    formatSampleText: document.getElementById('formatSampleText'),
    customFormatGroup: document.getElementById('customFormatGroup'),
    customFormatInput: document.getElementById('customFormatInput'),
    startNumberInput: document.getElementById('startNumberInput'),
    skipPagesInput: document.getElementById('skipPagesInput'),
    includeSkippedInTotalCheck: document.getElementById('includeSkippedInTotalCheck'),
    fontFamilySelect: document.getElementById('fontFamilySelect'),
    fontSizeInput: document.getElementById('fontSizeInput'),
    fontSizeDisplay: document.getElementById('fontSizeDisplay'),
    fontColorInput: document.getElementById('fontColorInput'),
    colorHexText: document.getElementById('colorHexText'),
    marginInput: document.getElementById('marginInput'),
    marginDisplay: document.getElementById('marginDisplay'),

    // Live Simulation
    simPageNumber: document.getElementById('simPageNumber'),

    // Footer & Actions
    footerStatusText: document.getElementById('footerStatusText'),
    generateTestFilesBtn: document.getElementById('generateTestFilesBtn'),
    mergeBtn: document.getElementById('mergeBtn'),

    // Progress Modal
    progressModal: document.getElementById('progressModal'),
    progressTitle: document.getElementById('progressTitle'),
    progressMessage: document.getElementById('progressMessage'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),

    // Success Modal
    successModal: document.getElementById('successModal'),
    resultPageCount: document.getElementById('resultPageCount'),
    resultFileSize: document.getElementById('resultFileSize'),
    outputFileNameInput: document.getElementById('outputFileNameInput'),
    downloadMergedBtn: document.getElementById('downloadMergedBtn'),
    previewMergedBtn: document.getElementById('previewMergedBtn'),
    closeSuccessBtn: document.getElementById('closeSuccessBtn'),

    // Privacy Modal
    privacyModal: document.getElementById('privacyModal'),
    openPrivacyModalBtn: document.getElementById('openPrivacyModalBtn'),
    closePrivacyModalBtn: document.getElementById('closePrivacyModalBtn'),
  };

  // =========================================================================
  // Initialize Application
  // =========================================================================
  function init() {
    applyTheme(state.theme);
    checkLibraries();
    setupEventListeners();
    updateLivePreview();
    updateUIState();
  }

  // =========================================================================
  // Theme Toggle
  // =========================================================================
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('pdf_merger_theme', theme);
    if (theme === 'dark') {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      el.moonIcon.classList.add('hidden');
      el.sunIcon.classList.remove('hidden');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      el.sunIcon.classList.add('hidden');
      el.moonIcon.classList.remove('hidden');
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  // =========================================================================
  // Library Verification & Dynamic Loader
  // =========================================================================
  function checkLibraries() {
    if (typeof PDFLib !== 'undefined') {
      if (el.libStatusBanner) el.libStatusBanner.classList.add('hidden');
      return true;
    }
    setTimeout(() => {
      if (typeof PDFLib !== 'undefined') {
        if (el.libStatusBanner) el.libStatusBanner.classList.add('hidden');
      } else {
        if (el.libStatusBanner) el.libStatusBanner.classList.remove('hidden');
      }
    }, 300);
    return false;
  }

  async function ensurePdfLibLoaded() {
    if (typeof PDFLib !== 'undefined') return true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'pdf-lib.min.js';
      script.onload = () => {
        if (typeof PDFLib !== 'undefined') {
          if (el.libStatusBanner) el.libStatusBanner.classList.add('hidden');
          resolve(true);
        } else {
          resolve(false);
        }
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================
  function setupEventListeners() {
    // Theme toggle
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Dropzone Events
    el.dropzone.addEventListener('click', () => el.fileInput.click());
    el.browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.fileInput.click();
    });
    el.addMoreBtn.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', handleFileInput);

    // Drag and Drop files onto dropzone
    ['dragenter', 'dragover'].forEach(eventName => {
      el.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      el.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.dropzone.classList.remove('drag-active');
      });
    });

    el.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        processUploadedFiles(Array.from(dt.files));
      }
    });

    // Toolbar buttons
    el.sortAzBtn.addEventListener('click', sortFilesAz);
    el.reverseBtn.addEventListener('click', reverseFilesOrder);
    el.clearAllBtn.addEventListener('click', clearAllFiles);

    // Settings listeners
    el.enableNumberingToggle.addEventListener('change', (e) => {
      state.settings.enableNumbering = e.target.checked;
      if (state.settings.enableNumbering) {
        el.settingsContainer.classList.remove('disabled');
      } else {
        el.settingsContainer.classList.add('disabled');
      }
      updateLivePreview();
    });

    // Position buttons
    el.posButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        el.posButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.settings.position = btn.dataset.pos;
        updateLivePreview();
      });
    });

    // Format select
    el.formatSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        el.customFormatGroup.classList.remove('hidden');
        state.settings.format = el.customFormatInput.value || 'Page {n} of {total}';
      } else {
        el.customFormatGroup.classList.add('hidden');
        state.settings.format = val;
      }
      updateLivePreview();
    });

    el.customFormatInput.addEventListener('input', (e) => {
      state.settings.format = e.target.value;
      updateLivePreview();
    });

    // Numeric inputs
    el.startNumberInput.addEventListener('input', (e) => {
      state.settings.startNumber = Math.max(1, parseInt(e.target.value, 10) || 1);
      updateLivePreview();
    });

    el.skipPagesInput.addEventListener('input', (e) => {
      state.settings.skipPages = Math.max(0, parseInt(e.target.value, 10) || 0);
      updateLivePreview();
    });

    el.includeSkippedInTotalCheck.addEventListener('change', (e) => {
      state.settings.includeSkippedInTotal = e.target.checked;
      updateLivePreview();
    });

    // Font styling
    el.fontFamilySelect.addEventListener('change', (e) => {
      state.settings.fontFamily = e.target.value;
      updateLivePreview();
    });

    el.fontSizeInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.settings.fontSize = val;
      el.fontSizeDisplay.textContent = val;
      updateLivePreview();
    });

    el.fontColorInput.addEventListener('input', (e) => {
      state.settings.fontColor = e.target.value;
      el.colorHexText.textContent = e.target.value;
      updateLivePreview();
    });

    el.marginInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.settings.margin = val;
      el.marginDisplay.textContent = val;
      updateLivePreview();
    });

    // Execution Buttons
    el.generateTestFilesBtn.addEventListener('click', generateSamplePdfs);
    el.mergeBtn.addEventListener('click', executeMergeAndNumber);

    // Modal action buttons
    el.downloadMergedBtn.addEventListener('click', downloadFinalPdf);
    el.previewMergedBtn.addEventListener('click', previewFinalPdf);
    el.closeSuccessBtn.addEventListener('click', () => el.successModal.classList.add('hidden'));

    // Modal dismiss on backdrop click
    el.successModal.addEventListener('click', (e) => {
      if (e.target === el.successModal) {
        el.successModal.classList.add('hidden');
      }
    });

    // Privacy Modal Listeners
    if (el.openPrivacyModalBtn && el.privacyModal) {
      el.openPrivacyModalBtn.addEventListener('click', () => {
        el.privacyModal.classList.remove('hidden');
      });
      el.closePrivacyModalBtn.addEventListener('click', () => {
        el.privacyModal.classList.add('hidden');
      });
      el.privacyModal.addEventListener('click', (e) => {
        if (e.target === el.privacyModal) {
          el.privacyModal.classList.add('hidden');
        }
      });
    }
  }

  // =========================================================================
  // File Upload & Reading
  // =========================================================================
  function handleFileInput(e) {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(Array.from(e.target.files));
      el.fileInput.value = ''; // Reset input
    }
  }

  async function processUploadedFiles(rawFiles) {
    await ensurePdfLibLoaded();
    const pdfFiles = rawFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      alert('Please select valid PDF documents (.pdf).');
      return;
    }

    showProgress('Reading PDF Files...', 'Analyzing document pages and structures...', 15);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const percent = 15 + Math.round(((i + 1) / pdfFiles.length) * 45);
      updateProgress(`Processing file ${i + 1} of ${pdfFiles.length}...`, file.name, percent);

      try {
        const arrayBuffer = await file.arrayBuffer();
        let pageCount = 1;

        if (typeof PDFLib !== 'undefined') {
          try {
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount();
          } catch (err) {
            console.warn(`Could not load page count for ${file.name}:`, err);
          }
        }

        // Generate thumbnail
        const thumbUrl = await generateThumbnail(arrayBuffer);

        state.files.push({
          id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          size: file.size,
          pageCount: pageCount,
          arrayBuffer: arrayBuffer,
          thumbUrl: thumbUrl
        });
      } catch (err) {
        console.error('Error reading PDF file:', file.name, err);
        alert(`Could not read "${file.name}". The file may be corrupt or encrypted.`);
      }
    }

    hideProgress();
    renderFileList();
    updateUIState();
  }

  // Generate thumbnail using PDF.js or fallback
  async function generateThumbnail(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      return null;
    }
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (err) {
      console.warn('PDF.js thumbnail generation skipped:', err);
      return null;
    }
  }

  // =========================================================================
  // File List Rendering & Drag Reorder
  // =========================================================================
  function renderFileList() {
    el.fileList.innerHTML = '';

    if (state.files.length === 0) {
      el.emptyState.classList.remove('hidden');
      el.filesToolbar.classList.add('hidden');
      el.filesSummaryBadge.classList.add('hidden');
      return;
    }

    el.emptyState.classList.add('hidden');
    el.filesToolbar.classList.remove('hidden');
    el.filesSummaryBadge.classList.remove('hidden');

    state.files.forEach((fileItem, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.draggable = true;
      card.dataset.id = fileItem.id;
      card.dataset.index = index;

      // File Thumbnail
      let thumbHtml = '';
      if (fileItem.thumbUrl) {
        thumbHtml = `<img src="${fileItem.thumbUrl}" alt="Preview" class="file-thumb-canvas" />`;
      } else {
        thumbHtml = `
          <div class="file-thumb-fallback">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="9" cy="5" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle>
            <circle cx="9" cy="19" r="1.5"></circle>
            <circle cx="15" cy="5" r="1.5"></circle>
            <circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="15" cy="19" r="1.5"></circle>
          </svg>
        </div>
        <div class="file-order-badge">${index + 1}</div>
        <div class="file-thumb-container">
          ${thumbHtml}
        </div>
        <div class="file-info">
          <div class="file-name" title="${escapeHtml(fileItem.name)}">${escapeHtml(fileItem.name)}</div>
          <div class="file-meta">
            <span class="meta-pill">${fileItem.pageCount} ${fileItem.pageCount === 1 ? 'page' : 'pages'}</span>
            <span>${formatBytes(fileItem.size)}</span>
          </div>
        </div>
        <div class="file-actions">
          <button type="button" class="action-icon-btn move-up-btn" title="Move up" ${index === 0 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button type="button" class="action-icon-btn move-down-btn" title="Move down" ${index === state.files.length - 1 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button type="button" class="action-icon-btn danger-hover remove-btn" title="Remove file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Event handlers for actions
      card.querySelector('.move-up-btn').addEventListener('click', () => moveFile(index, index - 1));
      card.querySelector('.move-down-btn').addEventListener('click', () => moveFile(index, index + 1));
      card.querySelector('.remove-btn').addEventListener('click', () => removeFile(index));

      // Native Drag & Drop reordering
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragover', handleDragOver);
      card.addEventListener('drop', handleDrop);
      card.addEventListener('dragend', handleDragEnd);

      el.fileList.appendChild(card);
    });
  }

  // Drag and drop reordering helpers
  let draggedCard = null;

  function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e) {
    e.preventDefault();
    if (draggedCard && draggedCard !== this) {
      const fromIndex = parseInt(draggedCard.dataset.index, 10);
      const toIndex = parseInt(this.dataset.index, 10);
      moveFile(fromIndex, toIndex);
    }
  }

  function handleDragEnd() {
    if (draggedCard) {
      draggedCard.classList.remove('dragging');
      draggedCard = null;
    }
  }

  function moveFile(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= state.files.length || toIndex < 0 || toIndex >= state.files.length) return;
    const moved = state.files.splice(fromIndex, 1)[0];
    state.files.splice(toIndex, 0, moved);
    renderFileList();
    updateUIState();
  }

  function removeFile(index) {
    state.files.splice(index, 1);
    renderFileList();
    updateUIState();
  }

  function sortFilesAz() {
    state.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    renderFileList();
    updateUIState();
  }

  function reverseFilesOrder() {
    state.files.reverse();
    renderFileList();
    updateUIState();
  }

  function clearAllFiles() {
    if (state.files.length > 0 && confirm('Are you sure you want to remove all PDF files?')) {
      state.files = [];
      renderFileList();
      updateUIState();
    }
  }

  // =========================================================================
  // Sample PDFs Generator (Instant demo)
  // =========================================================================
  async function generateSamplePdfs() {
    const isReady = await ensurePdfLibLoaded();
    if (!isReady || typeof PDFLib === 'undefined') {
      alert('PDF engine is still loading. Please ensure pdf-lib.min.js is present in the app folder and refresh the page.');
      return;
    }

    showProgress('Creating Sample PDFs...', 'Generating demo PDF files in memory...', 30);

    try {
      // Sample 1: "Project Proposal - Q4" (2 pages)
      const doc1 = await PDFLib.PDFDocument.create();
      const fontBold = await doc1.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const fontRegular = await doc1.embedFont(PDFLib.StandardFonts.Helvetica);

      // Page 1
      const p1 = doc1.addPage([595.28, 841.89]); // A4
      p1.drawRectangle({
        x: 0, y: 760, width: 595.28, height: 81.89,
        color: PDFLib.rgb(0.14, 0.38, 0.92)
      });
      p1.drawText('PROJECT PROPOSAL: 2026 ROADMAP', {
        x: 50, y: 795, size: 20, font: fontBold, color: PDFLib.rgb(1, 1, 1)
      });
      p1.drawText('Executive Summary & Strategic Initiatives', {
        x: 50, y: 775, size: 12, font: fontRegular, color: PDFLib.rgb(0.9, 0.95, 1)
      });
      p1.drawText('This proposal outlines the high-impact deliverables scheduled for release.', {
        x: 50, y: 700, size: 12, font: fontRegular, color: PDFLib.rgb(0.2, 0.2, 0.2)
      });
      p1.drawText('Key Objectives:', {
        x: 50, y: 650, size: 14, font: fontBold, color: PDFLib.rgb(0.1, 0.1, 0.1)
      });
      p1.drawText('• Automate client-side PDF document manipulation.', {
        x: 60, y: 620, size: 11, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3)
      });
      p1.drawText('• Deliver responsive, high-performance web tooling.', {
        x: 60, y: 595, size: 11, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3)
      });

      // Page 2
      const p2 = doc1.addPage([595.28, 841.89]);
      p2.drawText('Timeline & Resource Allocation', {
        x: 50, y: 780, size: 16, font: fontBold, color: PDFLib.rgb(0.1, 0.1, 0.1)
      });
      p2.drawText('All phases will proceed with local-first security guarantees.', {
        x: 50, y: 740, size: 12, font: fontRegular, color: PDFLib.rgb(0.3, 0.3, 0.3)
      });

      const bytes1 = await doc1.save();
      const file1 = new File([bytes1], 'Sample-1_Project-Proposal.pdf', { type: 'application/pdf' });

      // Sample 2: "Financial Appendix" (3 pages)
      const doc2 = await PDFLib.PDFDocument.create();
      const doc2FontBold = await doc2.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const doc2FontReg = await doc2.embedFont(PDFLib.StandardFonts.Helvetica);

      for (let pageNum = 1; pageNum <= 3; pageNum++) {
        const page = doc2.addPage([595.28, 841.89]);
        page.drawRectangle({
          x: 40, y: 800, width: 515.28, height: 3,
          color: PDFLib.rgb(0.06, 0.72, 0.5)
        });
        page.drawText(`Financial Appendix - Section ${pageNum}`, {
          x: 40, y: 810, size: 14, font: doc2FontBold, color: PDFLib.rgb(0.1, 0.1, 0.1)
        });
        page.drawText(`Quarterly metrics and performance indicators for segment #${pageNum}.`, {
          x: 40, y: 760, size: 11, font: doc2FontReg, color: PDFLib.rgb(0.3, 0.3, 0.3)
        });
      }

      const bytes2 = await doc2.save();
      const file2 = new File([bytes2], 'Sample-2_Financial-Appendix.pdf', { type: 'application/pdf' });

      // Process them into state
      await processUploadedFiles([file1, file2]);
    } catch (err) {
      console.error('Error generating sample PDFs:', err);
      alert('Could not generate sample PDFs: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  // =========================================================================
  // Live Preview Updating
  // =========================================================================
  function updateLivePreview() {
    const s = state.settings;
    const totalPagesSample = state.files.reduce((acc, f) => acc + f.pageCount, 0) || 12;
    const startNum = s.startNumber;

    // Build sample formatted string
    let previewStr = s.format;
    previewStr = previewStr.replace(/\{n\}/g, startNum);
    previewStr = previewStr.replace(/\{total\}/g, totalPagesSample);

    el.formatSampleText.textContent = previewStr;
    el.simPageNumber.textContent = s.enableNumbering ? previewStr : '';

    // Position class
    el.simPageNumber.className = 'sim-page-number';
    if (s.enableNumbering) {
      el.simPageNumber.classList.add(`pos-${s.position}`);
    }

    // Font styling
    el.simPageNumber.style.color = s.fontColor;
    el.simPageNumber.style.fontSize = Math.max(8, Math.round(s.fontSize * 0.85)) + 'px';

    if (s.fontFamily === 'Helvetica') {
      el.simPageNumber.style.fontFamily = 'var(--font-sans)';
    } else if (s.fontFamily === 'TimesRoman') {
      el.simPageNumber.style.fontFamily = 'Georgia, "Times New Roman", serif';
    } else if (s.fontFamily === 'Courier') {
      el.simPageNumber.style.fontFamily = 'var(--font-mono)';
    }
  }

  // =========================================================================
  // UI State & Count Aggregation
  // =========================================================================
  function updateUIState() {
    const totalFiles = state.files.length;
    const totalPages = state.files.reduce((acc, f) => acc + f.pageCount, 0);
    const totalBytes = state.files.reduce((acc, f) => acc + f.size, 0);

    el.summaryCount.textContent = `${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}`;
    el.summaryPages.textContent = `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}`;

    if (totalFiles >= 1) {
      el.mergeBtn.disabled = false;
      el.footerStatusText.className = 'footer-text ready';
      el.footerStatusText.innerHTML = `
        <span class="status-indicator"></span>
        <span>Ready: <strong>${totalFiles} files</strong> with <strong>${totalPages} total pages</strong> (${formatBytes(totalBytes)})</span>
      `;
    } else {
      el.mergeBtn.disabled = true;
      el.footerStatusText.className = 'footer-text';
      el.footerStatusText.innerHTML = `
        <span class="status-indicator"></span>
        <span>Upload PDF files on the left to begin</span>
      `;
    }

    updateLivePreview();
  }

  // =========================================================================
  // Core PDF Merging & Page Numbering Engine
  // =========================================================================
  async function executeMergeAndNumber() {
    const isReady = await ensurePdfLibLoaded();
    if (!isReady || typeof PDFLib === 'undefined') {
      alert('PDF library not ready. Please ensure pdf-lib.min.js is present in the app folder and refresh the page.');
      return;
    }

    if (state.files.length === 0) {
      alert('Please upload at least one PDF file.');
      return;
    }

    showProgress('Merging PDF Documents...', 'Initializing master document...', 5);

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      // Step 1: Copy pages from all documents
      for (let i = 0; i < state.files.length; i++) {
        const item = state.files[i];
        const percent = 5 + Math.round(((i + 1) / state.files.length) * 45);
        updateProgress(
          'Merging Pages...',
          `Adding ${item.name} (${item.pageCount} pages)...`,
          percent
        );

        const srcDoc = await PDFLib.PDFDocument.load(item.arrayBuffer, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);

        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }

      const totalMergedPages = mergedPdf.getPageCount();
      state.mergedTotalPages = totalMergedPages;

      // Step 2: Add Page Numbers (if enabled)
      if (state.settings.enableNumbering) {
        updateProgress('Adding Page Numbers...', 'Embedding font and calculating positions...', 55);

        // Select Font
        let fontName = PDFLib.StandardFonts.Helvetica;
        if (state.settings.fontFamily === 'TimesRoman') {
          fontName = PDFLib.StandardFonts.TimesRoman;
        } else if (state.settings.fontFamily === 'Courier') {
          fontName = PDFLib.StandardFonts.Courier;
        }

        const embeddedFont = await mergedPdf.embedFont(fontName);

        // Parse Color
        const rgbColor = hexToRgbPdf(state.settings.fontColor);

        const skip = state.settings.skipPages;
        const startNum = state.settings.startNumber;
        const includeSkipped = state.settings.includeSkippedInTotal;
        const totalCountForLabel = includeSkipped ? totalMergedPages : Math.max(1, totalMergedPages - skip);

        const allPages = mergedPdf.getPages();

        for (let idx = 0; idx < allPages.length; idx++) {
          const currentPercent = 55 + Math.round(((idx + 1) / allPages.length) * 35);
          updateProgress('Applying Page Numbers...', `Stamping page ${idx + 1} of ${totalMergedPages}...`, currentPercent);

          // Check if this page should be numbered
          if (idx < skip) {
            continue; // Skip numbering on cover/intro pages
          }

          const page = allPages[idx];
          const pageNumberVal = includeSkipped ? (startNum + idx) : (startNum + (idx - skip));

          // Format text
          let stampText = state.settings.format;
          stampText = stampText.replace(/\{n\}/g, pageNumberVal);
          stampText = stampText.replace(/\{total\}/g, totalCountForLabel);

          // Calculate text width and height
          const fontSize = state.settings.fontSize;
          const textWidth = embeddedFont.widthOfTextAtSize(stampText, fontSize);
          const margin = state.settings.margin;

          // Calculate coordinates and orientation
          const { x, y, rotationDegrees } = getPositionCoordinates(
            page,
            state.settings.position,
            textWidth,
            fontSize,
            margin
          );

          page.drawText(stampText, {
            x: x,
            y: y,
            size: fontSize,
            font: embeddedFont,
            color: rgbColor,
            rotate: PDFLib.degrees(rotationDegrees)
          });
        }
      }

      // Step 3: Finalize and Save
      updateProgress('Finalizing Document...', 'Assembling binary output...', 95);
      const pdfBytes = await mergedPdf.save();
      state.mergedBytes = pdfBytes;

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (state.mergedBlobUrl) {
        URL.revokeObjectURL(state.mergedBlobUrl);
      }
      state.mergedBlobUrl = URL.createObjectURL(blob);

      updateProgress('Complete!', 'Document generated successfully.', 100);

      // Show Result Modal
      setTimeout(() => {
        hideProgress();
        showSuccessModal(totalMergedPages, pdfBytes.byteLength);
      }, 400);

    } catch (err) {
      console.error('Error during PDF merge:', err);
      hideProgress();
      alert('An error occurred during PDF merging: ' + (err.message || err));
    }
  }

  // =========================================================================
  // Math & Geometry Helper: Exact Coordinates for Rotated Pages
  // =========================================================================
  function getPositionCoordinates(page, position, textWidth, fontSize, margin) {
    const { width, height } = page.getSize();
    const rawRotation = page.getRotation().angle || 0;
    const rotation = ((rawRotation % 360) + 360) % 360;

    let x = 0;
    let y = 0;
    let rotationDegrees = 0;

    // Standard Unrotated Page (rotation === 0)
    if (rotation === 0) {
      rotationDegrees = 0;
      switch (position) {
        case 'bottom-center':
          x = (width - textWidth) / 2;
          y = margin;
          break;
        case 'bottom-right':
          x = width - textWidth - margin;
          y = margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'top-center':
          x = (width - textWidth) / 2;
          y = height - margin - fontSize;
          break;
        case 'top-right':
          x = width - textWidth - margin;
          y = height - margin - fontSize;
          break;
        case 'top-left':
          x = margin;
          y = height - margin - fontSize;
          break;
      }
    }
    // Rotated 90 degrees clockwise in viewer
    else if (rotation === 90) {
      rotationDegrees = 270;
      switch (position) {
        case 'bottom-center':
          x = width - margin;
          y = (height + textWidth) / 2;
          break;
        case 'bottom-right':
          x = width - margin;
          y = textWidth + margin;
          break;
        case 'bottom-left':
          x = width - margin;
          y = height - margin;
          break;
        case 'top-center':
          x = margin + fontSize;
          y = (height + textWidth) / 2;
          break;
        case 'top-right':
          x = margin + fontSize;
          y = textWidth + margin;
          break;
        case 'top-left':
          x = margin + fontSize;
          y = height - margin;
          break;
      }
    }
    // Rotated 180 degrees
    else if (rotation === 180) {
      rotationDegrees = 180;
      switch (position) {
        case 'bottom-center':
          x = (width + textWidth) / 2;
          y = height - margin;
          break;
        case 'bottom-right':
          x = margin + textWidth;
          y = height - margin;
          break;
        case 'bottom-left':
          x = width - margin;
          y = height - margin;
          break;
        case 'top-center':
          x = (width + textWidth) / 2;
          y = margin + fontSize;
          break;
        case 'top-right':
          x = margin + textWidth;
          y = margin + fontSize;
          break;
        case 'top-left':
          x = width - margin;
          y = margin + fontSize;
          break;
      }
    }
    // Rotated 270 degrees
    else if (rotation === 270) {
      rotationDegrees = 90;
      switch (position) {
        case 'bottom-center':
          x = margin + fontSize;
          y = (height - textWidth) / 2;
          break;
        case 'bottom-right':
          x = margin + fontSize;
          y = height - textWidth - margin;
          break;
        case 'bottom-left':
          x = margin + fontSize;
          y = margin;
          break;
        case 'top-center':
          x = width - margin;
          y = (height - textWidth) / 2;
          break;
        case 'top-right':
          x = width - margin;
          y = height - textWidth - margin;
          break;
        case 'top-left':
          x = width - margin;
          y = margin;
          break;
      }
    }

    return { x, y, rotationDegrees };
  }

  // Parse Hex to PDFLib RGB
  function hexToRgbPdf(hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    return PDFLib.rgb(r, g, b);
  }

  // =========================================================================
  // Modals & UI Feedback
  // =========================================================================
  function showProgress(title, message, percent) {
    el.progressTitle.textContent = title;
    el.progressMessage.textContent = message;
    el.progressBar.style.width = percent + '%';
    el.progressPercent.textContent = percent + '%';
    el.progressModal.classList.remove('hidden');
  }

  function updateProgress(title, message, percent) {
    el.progressTitle.textContent = title;
    el.progressMessage.textContent = message;
    el.progressBar.style.width = percent + '%';
    el.progressPercent.textContent = percent + '%';
  }

  function hideProgress() {
    el.progressModal.classList.add('hidden');
  }

  function showSuccessModal(totalPages, byteLength) {
    el.resultPageCount.textContent = totalPages;
    el.resultFileSize.textContent = formatBytes(byteLength);
    el.successModal.classList.remove('hidden');
  }

  function downloadFinalPdf() {
    if (!state.mergedBlobUrl) return;
    const rawName = el.outputFileNameInput.value.trim() || 'merged-numbered';
    const finalName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;

    const a = document.createElement('a');
    a.href = state.mergedBlobUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function previewFinalPdf() {
    if (!state.mergedBlobUrl) return;
    window.open(state.mergedBlobUrl, '_blank');
  }

  // =========================================================================
  // Utilities
  // =========================================================================
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Run initial boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
