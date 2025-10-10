// =============== GLOBAL VARIABLES ===============
const API_BASE_URL = "https://crowdshield-ais-powered-crowd-disaster.onrender.com"; // Render backend URL 
let map;
let charts = {};
let updateInterval;
let isLoggedIn = false;
let currentPage = 'dashboard';
let cameraActive = false;
// Notification queue state
let notificationQueue = [];
let notificationActive = false;
let currentNotificationEl = null;
// Alert notification de-duplication state
let shownAlertKeys = new Set();
// Database alert saving de-duplication
let lastSavedAlerts = new Map();

// Social account links mapping for modal popup
const SOCIAL_ACCOUNTS = {
    github: [
        { name: 'Ghansham Bordekar', handle: '@ghanshambordekar3', url: 'https://github.com/ghanshambordekar3' },
        { name: 'Vaibhav Ingle', handle: '@Vaibhav01-bit', url: 'https://github.com/Vaibhav01-bit' }
    ],
    linkedin: [
        { name: 'Ghansham Bordekar', handle: 'linkedin.com/in/ghansham-bordekar', url: 'https://www.linkedin.com/in/ghansham-bordekar' },
        { name: 'Vaibhav Ingle', handle: 'linkedin.com/in/vaibhav-ingle...', url: 'https://www.linkedin.com/in/vaibhav-ingle-649bb8253?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app' }
    ],
    instagram: [
        { name: 'Ghansham Bordekar', handle: '@sh_y_am_3', url: 'https://instagram.com/sh_y_am_3' },
        { name: 'Vaibhav Ingle', handle: '@Vaibhavingle07', url: 'https://instagram.com/Vaibhavingle07' }
    ],
    whatsapp: [
        { name: 'Ghansham Bordekar', handle: '+91 88498 26386', url: 'https://wa.me/8849826386' },
        { name: 'Vaibhav Ingle', handle: '+91 87672 08015', url: 'https://wa.me/8767208015' }
    ],
    platformColors: {
        github: '#ffffff',
        linkedin: '#0A66C2',
        instagram: '#E4405F',
        whatsapp: '#25D366',
        default: '#00FF88'
    }
};

function getPlatformMeta(platform) {
    switch ((platform || '').toLowerCase()) {
        case 'github':
            return { label: 'GitHub', icon: 'fab fa-github' };
        case 'linkedin':
            return { label: 'LinkedIn', icon: 'fab fa-linkedin' };
        case 'instagram':
            return { label: 'Instagram', icon: 'fab fa-instagram' };
        case 'whatsapp':
            return { label: 'WhatsApp', icon: 'fab fa-whatsapp' };
        default:
            return { label: 'Social', icon: 'fas fa-share-alt' };
    }
}

// Exposed for inline onclick handlers in HTML
function showSocialModal(platform) {
    const modal = document.getElementById('socialModal');
    const titleEl = document.getElementById('socialModalTitle');
    const bodyEl = document.getElementById('socialModalBody');
    const closeBtn = document.getElementById('socialModalClose');

    if (!modal || !titleEl || !bodyEl || !closeBtn) {
        console.warn('Social modal elements not found');
        return;
    }

    const meta = getPlatformMeta(platform);
    const accounts = SOCIAL_ACCOUNTS[platform] || [];

    // Set dynamic color for the modal based on the platform
    const platformColor = SOCIAL_ACCOUNTS.platformColors[platform] || SOCIAL_ACCOUNTS.platformColors.default;
    const platformColorRGB = platformColor.startsWith('#')
        ? `${parseInt(platformColor.slice(1, 3), 16)}, ${parseInt(platformColor.slice(3, 5), 16)}, ${parseInt(platformColor.slice(5, 7), 16)}`
        : '0, 255, 136'; // Default green

    const socialModal = modal.querySelector('.social-modal');
    socialModal.style.setProperty('--platform-color', platformColor);
    socialModal.style.setProperty('--platform-color-rgb', platformColorRGB);

    // Set title
    titleEl.innerHTML = `<i class="${meta.icon}" style="margin-right:10px;"></i> ${meta.label} Accounts`;

    // Set body content
    bodyEl.innerHTML = accounts.length > 0
        ? accounts.map((acc, index) => `
            <div class="social-account-item" style="animation-delay: ${index * 100}ms;">
                <div style="display:flex; align-items:center; gap:15px; flex-grow: 1;">
                    <div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(var(--platform-color-rgb), 0.1); color:var(--platform-color); font-size:1.2rem; flex-shrink: 0;">
                        <i class="${meta.icon}"></i>
                    </div>
                    <div>
                        <div style="font-weight:700;color:var(--text-light);">${acc.name}</div>
                        ${acc.handle ? `<div class="handle-text" style="font-size:0.85rem;">${acc.handle}</div>` : ''}
                    </div>
                </div>
                <a href="${acc.url}" target="_blank" rel="noopener noreferrer" class="login-btn" style="padding: 8px 16px; font-size: 14px; width: auto; text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Open</span>
                </a>
            </div>
        `).join('')
        : '<div style="padding: 20px; text-align: center; color: #9ca3af;">No accounts configured for this platform.</div>';

    // Show modal
    modal.classList.remove('hidden');

    // Close handlers
    const closeModalHandler = (e) => {
        if (e.target === modal || e.key === 'Escape') {
            hideSocialModal();
            modal.removeEventListener('click', closeModalHandler);
            document.removeEventListener('keydown', closeModalHandler);
        }
    }
    modal.addEventListener('click', closeModalHandler);
    document.addEventListener('keydown', closeModalHandler);
    closeBtn.onclick = hideSocialModal;
}

function hideSocialModal() {
    const modal = document.getElementById('socialModal');
    if (modal) {
        modal.classList.add('hidden');
        // Clear body to be safe
        const bodyEl = document.getElementById('socialModalBody');
        if (bodyEl) bodyEl.innerHTML = '';
    }
}

function makeAlertKey(type, message, zoneId) {
    const t = (type || 'info').toString().toLowerCase().trim();
    const m = (message || '').toString().trim();
    const z = zoneId != null ? String(zoneId) : '';
    return `${t}|${m}|${z}`;
}

// Simulated data
let simulatedData = {
    density: [],
    alerts: [],
    routes: [],
    analytics: {
        totalPeople: 0,
        avgDensity: 0.0,
        peakHours: '--:--',
        riskLevel: 'LOW'
    }
};

// =============== INITIALIZATION ===============
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();

    // By default, the login page will now always show first.
});


function initializeApp() {
    // Daily reset check for analytics values
    try { checkDailyResetAnalytics(); } catch (_) { }

    // Initialize theme - default to dark mode
    const savedTheme = localStorage.getItem('crowdshield_theme') || 'dark';
    document.body.className = savedTheme + '-mode';
    updateThemeIcon();

    // Generate initial simulated data
    generateSimulatedData();

    // Initialize mobile-specific features
    initializeMobileFeatures();

    // Initialize navbar buttons with retry
    setTimeout(initializeNavbarButtons, 500);
}

function initializeMobileFeatures() {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile || isTouch) {
        document.body.classList.add('mobile-device');

        // Add mobile-specific meta tags
        addMobileMetaTags();

        // Initialize touch gestures
        initializeTouchGestures();

        // Optimize for mobile performance
        optimizeForMobile();

        // Handle orientation changes
        handleOrientationChange();

        // Prevent zoom on input focus (iOS)
        preventInputZoom();
    }

    // Handle viewport changes
    handleViewportChanges();
}

function addMobileMetaTags() {
    // Prevent text size adjustment on orientation change
    const textSizeAdjust = document.createElement('meta');
    textSizeAdjust.name = 'format-detection';
    textSizeAdjust.content = 'telephone=no';
    document.head.appendChild(textSizeAdjust);

    // Add PWA capabilities
    const appleMobileCapable = document.createElement('meta');
    appleMobileCapable.name = 'apple-mobile-web-app-capable';
    appleMobileCapable.content = 'yes';
    document.head.appendChild(appleMobileCapable);
}

function initializeTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Swipe gestures for sidebar
    document.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    }, { passive: true });

    function handleSwipeGesture() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        // Horizontal swipe (sidebar toggle)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            const sidebar = document.getElementById('sidebar');
            if (deltaX > 0 && touchStartX < 50) {
                // Swipe right from left edge - open sidebar
                sidebar.classList.add('open');
                showNotification('Sidebar opened', 'info');
            } else if (deltaX < 0 && sidebar.classList.contains('open')) {
                // Swipe left - close sidebar
                sidebar.classList.remove('open');
                showNotification('Sidebar closed', 'info');
            }
        }
    }

    // Close sidebar when tapping outside
    document.addEventListener('touchstart', function (e) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#sidebarToggle')) {
            sidebar.classList.remove('open');
        }
    }, { passive: true });

    // Enhanced mobile navigation with auto-hide
    setupMobileNavigation();
}

function setupMobileNavigation() {
    // Auto-hide sidebar after navigation on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    // Add smooth closing animation
                    sidebar.style.transition = 'left 0.3s ease';
                    setTimeout(() => {
                        sidebar.classList.remove('open');
                        showNotification('Navigated to ' + this.textContent.trim(), 'success');
                    }, 100);
                }
            }
        });
    });

    // Add touch feedback for better UX
    navItems.forEach(item => {
        item.addEventListener('touchstart', function () {
            this.style.backgroundColor = 'rgba(37, 99, 235, 0.3)';
        }, { passive: true });

        item.addEventListener('touchend', function () {
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 150);
        }, { passive: true });
    });

    // Hamburger menu enhancement for mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            const sidebar = document.getElementById('sidebar');
            const isOpen = sidebar.classList.contains('open');

            if (isOpen) {
                sidebar.classList.remove('open');
                showNotification('Menu closed', 'info');
            } else {
                sidebar.classList.add('open');
                showNotification('Menu opened', 'info');
            }
        });
    }
}

function optimizeForMobile() {
    // Reduce animation complexity on mobile
    if (window.innerWidth <= 768) {
        document.documentElement.style.setProperty('--animation-duration', '0.2s');

        // Disable complex animations
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .welcome-page, .login-page {
                    animation-duration: 0.3s !important;
                }
                .feature-item:hover {
                    transform: none !important;
                }
                .nav-item:hover {
                    transform: translateX(4px) !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function handleOrientationChange() {
    window.addEventListener('orientationchange', function () {
        setTimeout(function () {
            // Recalculate viewport height
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // Refresh map if it exists
            if (map) {
                setTimeout(() => map.invalidateSize(), 300);
            }

            // Close sidebar on orientation change
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        }, 100);
    });
}

function preventInputZoom() {
    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            if (this.style.fontSize !== '16px') {
                this.style.fontSize = '16px';
            }
        });
    });
}

function handleViewportChanges() {
    // Set CSS custom property for viewport height
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => setTimeout(setVH, 100));
}

function initializeNavbarButtons() {
    // Theme toggle button
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn && !themeBtn.hasAttribute('data-initialized')) {
        try { themeBtn.removeEventListener('click', toggleTheme); } catch (_) { }
        themeBtn.addEventListener('click', toggleTheme);
        try { themeBtn.removeEventListener('touchstart', toggleTheme); } catch (_) { }
        themeBtn.addEventListener('touchstart', function (e) { e.preventDefault(); toggleTheme(); }, { passive: false });
        themeBtn.setAttribute('data-initialized', 'true');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && !logoutBtn.hasAttribute('data-initialized')) {
        try { logoutBtn.removeEventListener('click', handleLogout); } catch (_) { }
        logoutBtn.addEventListener('click', handleLogout);
        try { logoutBtn.removeEventListener('touchstart', handleLogout); } catch (_) { }
        logoutBtn.addEventListener('touchstart', function (e) { e.preventDefault(); handleLogout(); }, { passive: false });
        logoutBtn.setAttribute('data-initialized', 'true');
    }

    // Sidebar toggle button
    const sidebarBtn = document.getElementById('sidebarToggle');
    if (sidebarBtn && !sidebarBtn.hasAttribute('data-initialized')) {
        try { sidebarBtn.removeEventListener('click', toggleSidebar); } catch (_) { }
        sidebarBtn.addEventListener('click', toggleSidebar);
        try { sidebarBtn.removeEventListener('touchstart', toggleSidebar); } catch (_) { }
        sidebarBtn.addEventListener('touchstart', function (e) { e.preventDefault(); toggleSidebar(); }, { passive: false });
        sidebarBtn.setAttribute('data-initialized', 'true');
    }

    // Retry if buttons not found
    if (!themeBtn || !logoutBtn || !sidebarBtn) {
        setTimeout(initializeNavbarButtons, 200);
    }
}

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Ensure a single submit handler is attached (defensive: remove then add)
        try { loginForm.removeEventListener('submit', handleLogin); } catch (_) { }
        loginForm.addEventListener('submit', handleLogin);
    }

    const startButton = document.getElementById('startButton');
    if (startButton) startButton.addEventListener('click', showLoginPage);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay && !sidebarOverlay.hasAttribute('data-initialized')) {
        // Clicking the overlay should always close the sidebar (not toggle)
        const closeSidebarFromOverlay = function (e) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (!sidebar || !overlay) return;
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');

                // restore hamburger icon
                const sidebarBtn = document.getElementById('sidebarToggle');
                if (sidebarBtn) {
                    sidebarBtn.classList.remove('open');
                    sidebarBtn.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        };

        sidebarOverlay.addEventListener('click', closeSidebarFromOverlay);
        try { sidebarOverlay.removeEventListener('touchstart', closeSidebarFromOverlay); } catch (_) { }
        sidebarOverlay.addEventListener('touchstart', function (e) { e.preventDefault(); closeSidebarFromOverlay(e); }, { passive: false });
        sidebarOverlay.setAttribute('data-initialized', 'true');
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            showPage(page);

            // Close sidebar on mobile/tablet after navigation
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        });
    });

    // Delegated fallback: some mobile browsers/embedded webviews can miss direct handlers
    // Attach a delegated touchend + click listener that only runs when the event wasn't
    // already handled (check e.defaultPrevented). This improves reliability for taps
    // on .nav-item children (icons/labels) which may intercept pointer events.
    const delegatedNavHandler = function (e) {
        try {
            if (e.defaultPrevented) return; // already handled by the element handler
            const el = (e.target && e.target.closest) ? e.target.closest('.nav-item') : null;
            if (!el) return;
            e.preventDefault();
            const page = el.getAttribute('data-page');
            if (page) showPage(page);

            // Close sidebar on mobile/tablet after navigation
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        } catch (err) {
            // defensive - don't throw for unexpected targets
            console.warn('delegatedNavHandler error', err);
        }
    };

    // Use touchend (more responsive) and a normal click as a fallback
    try { document.removeEventListener('touchend', delegatedNavHandler); } catch(_) {}
    document.addEventListener('touchend', delegatedNavHandler, { passive: false });
    try { document.removeEventListener('click', delegatedNavHandler); } catch(_) {}
    document.addEventListener('click', delegatedNavHandler);

    // Close sidebar when clicking outside on mobile - defensive and deterministic close
    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');

        if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('open')) {
            const clickedInsideSidebar = sidebar.contains(e.target);
            const clickedOnToggle = sidebarToggle ? sidebarToggle.contains(e.target) : false;
            const clickedOnOverlay = overlay ? overlay.contains(e.target) : false;

            if (!clickedInsideSidebar && !clickedOnToggle && !clickedOnOverlay) {
                // close (not toggle) to ensure we don't accidentally reopen
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');

                const sidebarBtn = document.getElementById('sidebarToggle');
                if (sidebarBtn) {
                    sidebarBtn.classList.remove('open');
                    sidebarBtn.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        }
    });

    // Ensure the sidebar toggle is resilient on mobile: attach both click and touchstart once
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle && !sidebarToggle.hasAttribute('data-initialized')) {
        try { sidebarToggle.removeEventListener('click', toggleSidebar); } catch (_) { }
        sidebarToggle.addEventListener('click', function (e) { e.preventDefault(); toggleSidebar(); });

        // For some mobile browsers, touchstart is more reliable than click
        try { sidebarToggle.removeEventListener('touchstart', toggleSidebar); } catch (_) { }
        sidebarToggle.addEventListener('touchstart', function (e) { e.preventDefault(); toggleSidebar(); }, { passive: false });
        sidebarToggle.setAttribute('data-initialized', 'true');
    }

    // Settings toggles
    setupSettingsToggles();

    // Camera view controls
    setupCameraViewControls();

    // Mobile camera gestures
    setupMobileCameraGestures();

    // Alert monitoring system
    setupAlertMonitoring();

    // Map controls
    document.getElementById('refreshMap').addEventListener('click', refreshMap);
    document.getElementById('safeRoutes').addEventListener('click', toggleSafeRoutes);

    // Safe Routes Modal controls - use setTimeout to ensure elements exist
    setTimeout(() => {
        const srClose = document.getElementById('srClose');
        const srCancel = document.getElementById('srCancel');
        const srFind = document.getElementById('srFind');
        const srClear = document.getElementById('srClear');

        if (srClose) {
            srClose.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                hideSafeRoutesModal();
            });
        }

        if (srCancel) {
            srCancel.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                hideSafeRoutesModal();
            });
        }

        // Setup auto-suggest immediately
        setupAutoSuggest();

        if (srFind) {
            srFind.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const startInput = document.getElementById('srStart');
                const destInput = document.getElementById('srDest');

                if (!startInput || !destInput) {
                    showNotification('Modal elements not found', 'error');
                    return;
                }

                const startValue = startInput.value.trim();
                const destValue = destInput.value.trim();

                if (!startValue || !destValue) {
                    showNotification('Please enter both start and destination locations', 'warning');
                    return;
                }

                // Show processing state
                const originalText = srFind.innerHTML;
                srFind.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding Routes...';
                srFind.disabled = true;

                // Get coordinates from location names
                let startCoords = getLocationCoords(startValue);
                let destCoords = getLocationCoords(destValue);

                // If no exact match, try to parse as coordinates or use defaults
                if (!startCoords) {
                    startCoords = parseCoordinatesFromInput(startValue) || [19.9975, 73.7898];
                }
                if (!destCoords) {
                    destCoords = parseCoordinatesFromInput(destValue) || [19.0760, 72.8777];
                }

                // Process route calculation with delay
                setTimeout(() => {
                    hideSafeRoutesModal();
                    displayRoutes(startCoords, destCoords);
                    showNotification('Route calculated successfully via roads!', 'success');
                    // Reset button state
                    srFind.innerHTML = originalText;
                    srFind.disabled = false;
                }, 1000);
            });
        }

        if (srClear) {
            srClear.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                clearSafeRoutesDropdowns();
            });
        }
    }, 1000);

    // Heatmap summary controls
    document.getElementById('exportHeatmap').addEventListener('click', exportHeatmapData);
    document.getElementById('resetHeatmap').addEventListener('click', resetHeatmapView);
    document.getElementById('refreshDatabase').addEventListener('click', refreshDatabaseData);

    // Initialize Google Maps-style features after DOM is ready
    setTimeout(() => {
        if (map) {
            initializeMapControls();
        }
    }, 1000);

    // Full History Modal controls
    document.getElementById('viewFullHistoryBtn').addEventListener('click', showFullHistoryModal);
    document.getElementById('fullHistoryClose').addEventListener('click', hideFullHistoryModal);
    document.getElementById('refreshHistoryBtn').addEventListener('click', refreshFullHistory);

    // Quick Actions controls
    document.getElementById('quickActionsToggle').addEventListener('click', toggleQuickActions);
    document.getElementById('panicDispatchBtn').addEventListener('click', playAlertSound);
    document.getElementById('massNotificationBtn').addEventListener('click', showMassNotificationModal);
    document.getElementById('riskRadar').addEventListener('click', showRiskRadarPanel);

    // Mass Notification Modal controls
    document.getElementById('mnClose').addEventListener('click', hideMassNotificationModal);
    document.getElementById('mnCancel').addEventListener('click', hideMassNotificationModal);

    // Social Modal
    document.getElementById('socialModalClose').addEventListener('click', hideSocialModal);


    // Camera controls
    document.getElementById('openCameraBtn').addEventListener('click', startCamera);
    document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);
    document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
    document.getElementById('startRecordingBtn').addEventListener('click', startRecording);
    document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);

    // Legacy overcrowding monitoring (now handled by unified system)
    const legacyMonitorBtn = document.getElementById('monitorOvercrowdingBtn');
    if (legacyMonitorBtn && !legacyMonitorBtn.hasAttribute('data-unified')) {
        legacyMonitorBtn.addEventListener('click', () => {
            if (currentPage !== 'alerts') {
                showPage('alerts');
            }
            checkOvercrowdingStatus();
        });
    }

    // New: Event listener for the "Continue to Login" button
    const continueBtn = document.getElementById('continueToLoginBtn');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const testPopup = document.getElementById('testReviewPopup');
            const loginPanel = document.querySelector('.login-panel');
            if (testPopup) testPopup.classList.add('hide-popup');
            if (loginPanel) {
                // The show-panel class will handle the display and animation
                loginPanel.classList.add('show-panel');
            }
        });
    }
}


// =============== OVERCROWDING MONITORING ===============
function checkOvercrowdingStatus() {
    // Show "Monitoring Active" immediately
    updateOvercrowdingAlertMessage("Monitoring Active");

    // Fetch latest density data to check overcrowding status
    fetch(`${API_BASE_URL}/api/density`)
        .then(response => response.json())
        .then(data => {
            let isOvercrowding = false;
            let overcrowdingMessage = "Not Overcrowding";

            if (data && data.length > 0) {
                // Check the latest density data for overcrowding
                const latestData = data[0];
                const densityLevel = latestData.density;
                const count = latestData.count;

                // Consider overcrowding if density is High or count is above threshold
                if (densityLevel === 'High' || count >= 10) {
                    isOvercrowding = true;
                    overcrowdingMessage = "Overcrowding Detected";
                }
            }

            // Update the alert card message with systematic format
            const latestData = data && data.length > 0 ? data[0] : null;
            updateOvercrowdingAlertMessage(overcrowdingMessage, latestData);

            // Start camera if not active
            if (!cameraActive) {
                startCamera();
            }

            // Show appropriate notification
            if (isOvercrowding) {
                showNotification('Overcrowding detected! Monitoring area with camera feed activated.', 'warning');
            } else {
                showNotification('Not Overcrowding. Monitoring area with camera feed activated.', 'info');
            }
        })
        .catch(error => {
            console.error("Error checking overcrowding status:", error);
            // Fallback: start camera anyway
            if (!cameraActive) {
                startCamera();
            }
            showNotification('Unable to check overcrowding status. Camera feed activated.', 'warning');
        });
}

function updateOvercrowdingAlertMessage(message, densityData = null) {
    // Find the overcrowding alert card and update its message
    const alertCards = document.querySelectorAll('.alert-card');
    alertCards.forEach(card => {
        const header = card.querySelector('.alert-header h3');
        if (header && header.textContent.includes('Overcrowding')) {
            const messageElement = card.querySelector('p');
            if (messageElement) {
                // Always show Monitoring Active with details inside
                let systematicMessage = '';

                if (densityData) {
                    const count = densityData.count || 0;
                    const density = densityData.density || 'Unknown';
                    const timestamp = densityData.timestamp ?
                        new Date(densityData.timestamp).toLocaleTimeString() : 'Just now';

                    systematicMessage = `
                        <div style="font-weight: 600; margin-bottom: 8px;">Monitoring Active</div>
                        <div style="font-size: 0.9rem; color: #6b7280;">
                            <div>👥 People Count: <strong>${count}</strong></div>
                            <div>📊 Density Level: <strong style="color: ${getDensityColor(density)}">${density}</strong></div>
                            <div>⏰ Last Updated: <strong>${timestamp}</strong></div>
                        </div>
                    `;
                } else {
                    systematicMessage = `
                        <div style="font-weight: 600;">Monitoring Active</div>
                        <div style="font-size: 0.9rem; color: #6b7280; margin-top: 8px;">
                            <div>📡 Monitoring active - fetching data...</div>
                        </div>
                    `;
                }

                messageElement.innerHTML = systematicMessage;
            }
        }
    });
}

function getDensityColor(density) {
    switch (density.toLowerCase()) {
        case 'high': return '#ef4444'; // Red
        case 'medium': return '#f59e0b'; // Orange
        case 'low': return '#10b981'; // Green
        default: return '#6b7280'; // Gray
    }
}

// =============== AUTHENTICATION ===============
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value?.trim();
    const password = document.getElementById('password').value;
    const loginForm = document.getElementById('loginForm');
    const loginBtn = loginForm.querySelector('.login-btn');

    if (!username || !password) {
        showLoginStatus('error', 'Please enter both username and password ❌');
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    const loginText = document.getElementById('loginText');
    const loginLoading = document.getElementById('loginLoading');
    loginText.classList.add('hidden');
    loginLoading.classList.remove('hidden');

    const radarSweep = loginLoading.querySelector('.radar-sweep');
    if (radarSweep) {
        radarSweep.style.animation = 'sweep 2s linear infinite';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            showLoginStatus('success', 'Access Granted ✅');
            setTimeout(() => {
                localStorage.setItem('crowdshield_login', 'true');
                showDashboard();
            }, 1000);
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        showLoginStatus('error', 'Access Denied ❌');
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
        loginBtn.disabled = false;
        loginText.classList.remove('hidden');
        loginLoading.classList.add('hidden');
    }
}

function showLoginStatus(type, message) {
    const loginStatus = document.getElementById('loginStatus');
    loginStatus.textContent = message;
    loginStatus.className = `login-status ${type}`;
    loginStatus.style.display = 'block';

    if (type === 'success') {
        loginStatus.style.animation = 'pulse 2s infinite';
    } else {
        loginStatus.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
    }
}

function resetLoginButton() {
    const loginForm = document.getElementById('loginForm');
    let loginBtn = null;
    if (loginForm) {
        loginBtn = loginForm.querySelector('button[type="submit"], .login-btn');
    }
    // Fallback to any .login-btn (defensive)
    if (!loginBtn) loginBtn = document.querySelector('.login-btn');

    const loginText = document.getElementById('loginText');
    const loginLoading = document.getElementById('loginLoading');
    if (loginBtn) loginBtn.disabled = false;
    if (loginText) loginText.classList.remove('hidden');
    if (loginLoading) loginLoading.classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').classList.add('active');
    isLoggedIn = true;

    // Hide test review popup aggressively
    const testReviewPopup = document.getElementById('testReviewPopup');
    if (testReviewPopup) {
        testReviewPopup.classList.remove('visible');
        testReviewPopup.style.display = 'none'; // Explicitly hide
        testReviewPopup.style.animation = 'none'; // Stop any animations
    }

    // Initialize dashboard components
    setTimeout(() => {
        initializeMap();
        initializeCharts();
        startDataUpdates();
        // Fetch alerts and history immediately so history shows after refresh
        try { fetchAlerts(); } catch (_) { }
        try { fetchDensityData(); } catch (_) { }
    }, 500);
}

function handleLogout() {
    localStorage.removeItem('crowdshield_login');
    const loginPage = document.getElementById('loginPage');
    loginPage.style.display = 'flex';
    loginPage.style.opacity = '1';
    document.getElementById('app').classList.remove('active');
    isLoggedIn = false;

    // Clear intervals
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    // Reset form
    document.getElementById('loginForm').reset();
    document.getElementById('loginStatus').style.display = 'none';
    resetLoginButton();

    // Hide test review popup (if visible) and ensure login panel is shown so user can re-login
    try {
        const testReviewPopup = document.getElementById('testReviewPopup');
        if (testReviewPopup) {
            testReviewPopup.classList.remove('visible');
            testReviewPopup.classList.add('hide-popup');
            testReviewPopup.style.display = 'none';
            testReviewPopup.style.animation = 'none';
        }

        const loginPanel = document.querySelector('.login-panel');
        if (loginPanel) {
            // Make sure the login panel is visible and ready for input
            loginPanel.classList.add('show-panel');
            loginPanel.style.display = '';
        }

        // Close camera if active to avoid background locks
        if (cameraActive && typeof closeCamera === 'function') {
            closeCamera();
        }

        // Remove sidebar-open flag (if present) to restore page state
        document.body.classList.remove('sidebar-open');

        // Focus username for quicker re-login
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
    } catch (e) {
        console.warn('handleLogout cleanup error', e);
    }
}

// =============== NAVIGATION ===============
function showPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName).classList.add('active');

    currentPage = pageName;

    // Initialize page-specific components
    if (pageName === 'analytics') {
        setTimeout(() => initializeAnalyticsCharts(), 300);
        // Start the database scan when analytics page is shown
        setTimeout(() => {
            startDatabaseScan();
        }, 500);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.toggle('open');

    // Keep a body-level flag so CSS can reliably style the toggle and other elements
    document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));

    // Update hamburger button icon to an X when open for clearer UX on mobile
    const sidebarBtn = document.getElementById('sidebarToggle');
    if (sidebarBtn) {
        if (sidebar.classList.contains('open')) {
            sidebarBtn.classList.add('open');
            sidebarBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            sidebarBtn.classList.remove('open');
            sidebarBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }

    // The overlay's visibility is now controlled by the .sidebar.open selector in CSS
    // so we just need to toggle its active state for the transition.
    // We use a timeout to ensure the display:block is applied before the opacity transition.
    if (sidebar.classList.contains('open')) {
        // show overlay by adding the active class (CSS controls visibility)
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
        // remove body flag as well
        setTimeout(() => {
            if (!sidebar.classList.contains('open')) {
                document.body.classList.remove('sidebar-open');
            }
        }, 350);
    }
}

// =============== THEME MANAGEMENT ===============
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');

    body.className = isDark ? 'light-mode' : 'dark-mode';
    localStorage.setItem('crowdshield_theme', isDark ? 'light' : 'dark');
    updateThemeIcon();

    // Sync settings toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        if (isDark) {
            darkModeToggle.classList.remove('active');
        } else {
            darkModeToggle.classList.add('active');
        }
    }
}

function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        const isDark = document.body.classList.contains('dark-mode');
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// =============== MAP INITIALIZATION ===============
function initializeMap() {
    if (map) return;

    map = L.map('map', {
        zoomControl: false, // We'll add custom zoom controls
        attributionControl: false,
        closePopupOnClick: false // Remove cross button from popups
    }).setView([19.9975, 73.7898], 13);

    // Initialize map layers
    initializeMapLayers();

    // Initialize Google Maps-style controls
    initializeMapControls();

    // Initialize search with clear button
    setTimeout(() => {
        const searchInput = document.getElementById('mapSearch');
        const clearBtn = document.getElementById('clearSearch');

        if (searchInput && clearBtn) {
            searchInput.addEventListener('input', function () {
                if (this.value.length > 0) {
                    clearBtn.style.display = 'block';
                } else {
                    clearBtn.style.display = 'none';
                }
            });

            clearBtn.addEventListener('click', function () {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                document.getElementById('searchResults').style.display = 'none';
            });
        }
    }, 500);

    // Add sample markers for demonstration
    addSampleMarkers();

    // Legend removed

    // Add all location names like Google Maps
    addAllLocationNames();
}

function initializeMapLayers() {
    // Define different map layers
    window.mapLayers = {
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, Maxar, Earthstar Geographics'
        }),
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap contributors'
        }),
        hybrid: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, Maxar, Earthstar Geographics'
        })
    };

    // Set default layer to street map
    window.mapLayers.street.addTo(map);
    window.currentLayer = 'street';
}

function initializeMapControls() {
    // Search functionality
    setupMapSearch();

    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => {
        map.zoomIn();
        showNotification('Zoomed in', 'info');
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        map.zoomOut();
        showNotification('Zoomed out', 'info');
    });

    // Layer controls
    document.getElementById('layerToggle').addEventListener('click', () => {
        const menu = document.getElementById('layerMenu');
        menu.classList.toggle('hidden');
    });

    // Layer switching
    document.querySelectorAll('.layer-option').forEach(option => {
        option.addEventListener('click', () => {
            const layerType = option.dataset.layer;
            switchMapLayer(layerType);

            // Update active state
            document.querySelectorAll('.layer-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Hide menu
            document.getElementById('layerMenu').classList.add('hidden');
        });
    });

    // My location
    document.getElementById('myLocation').addEventListener('click', getCurrentLocationOnMap);

    // Fullscreen
    document.getElementById('fullscreenMap').addEventListener('click', toggleMapFullscreen);

    // Street View (simulated)
    document.getElementById('streetView').addEventListener('click', activateStreetView);



    // Nearby places
    document.getElementById('nearbyPlaces').addEventListener('click', showNearbyPlaces);

    // Close layer menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.layer-controls')) {
            document.getElementById('layerMenu').classList.add('hidden');
        }
    });
}

function addSampleMarkers() {
    // Safe zone (green) with label - no close button
    const safeZone = L.circle([19.9975, 73.7898], {
        color: 'green',
        fillColor: '#10b981',
        fillOpacity: 0.3,
        radius: 500
    }).addTo(map);
    safeZone.bindPopup('<b>Safe Zone</b><br>Density: Low<br>Status: Normal', { closeButton: false });

    L.marker([19.9975, 73.7898], {
        icon: L.divIcon({
            className: 'location-label',
            html: `<div style="
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                border: 1px solid #10b981;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">Nashik Central</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        })
    }).addTo(map);

    // Warning zone (yellow) with label - no close button
    const warningZone = L.circle([20.0025, 73.7950], {
        color: 'orange',
        fillColor: '#f59e0b',
        fillOpacity: 0.3,
        radius: 300
    }).addTo(map);
    warningZone.bindPopup('<b>Warning Zone</b><br>Density: Medium<br>Status: Monitor', { closeButton: false });

    L.marker([20.0025, 73.7950], {
        icon: L.divIcon({
            className: 'location-label',
            html: `<div style="
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                border: 1px solid #f59e0b;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">Gangapur Area</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        })
    }).addTo(map);

    // Critical zone (red) - initially hidden, no close button
    const criticalZone = L.circle([19.9925, 73.7850], {
        color: 'red',
        fillColor: '#ef4444',
        fillOpacity: 0.3,
        radius: 200
    });
    criticalZone.bindPopup('<b>Critical Zone</b><br>Density: High<br>Status: Alert', { closeButton: false });
}

function addAllLocationNames() {
    // Hide location names on map by default - only show in route search
    return;

    const locations = [
        // North America - Major Cities
        { coords: [40.7128, -74.0060], name: 'NEW YORK', type: 'city' },
        { coords: [34.0522, -118.2437], name: 'LOS ANGELES', type: 'city' },
        { coords: [41.8781, -87.6298], name: 'CHICAGO', type: 'city' },
        { coords: [29.7604, -95.3698], name: 'HOUSTON', type: 'city' },
        { coords: [33.4484, -112.0740], name: 'PHOENIX', type: 'city' },
        { coords: [39.9526, -75.1652], name: 'PHILADELPHIA', type: 'city' },
        { coords: [32.7767, -96.7970], name: 'DALLAS', type: 'city' },
        { coords: [37.7749, -122.4194], name: 'SAN FRANCISCO', type: 'city' },
        { coords: [47.6062, -122.3321], name: 'SEATTLE', type: 'city' },
        { coords: [39.7392, -104.9903], name: 'DENVER', type: 'city' },
        { coords: [25.7617, -80.1918], name: 'MIAMI', type: 'city' },
        { coords: [42.3601, -71.0589], name: 'BOSTON', type: 'city' },
        { coords: [38.9072, -77.0369], name: 'WASHINGTON DC', type: 'city' },
        { coords: [33.7490, -84.3880], name: 'ATLANTA', type: 'city' },
        { coords: [43.6532, -79.3832], name: 'TORONTO', type: 'city' },
        { coords: [45.5017, -73.5673], name: 'MONTREAL', type: 'city' },
        { coords: [49.2827, -123.1207], name: 'VANCOUVER', type: 'city' },
        { coords: [19.4326, -99.1332], name: 'MEXICO CITY', type: 'city' },
        { coords: [25.6866, -100.3161], name: 'MONTERREY', type: 'city' },
        { coords: [20.6597, -103.3496], name: 'GUADALAJARA', type: 'city' },

        // Europe - Major Cities
        { coords: [51.5074, -0.1278], name: 'LONDON', type: 'city' },
        { coords: [48.8566, 2.3522], name: 'PARIS', type: 'city' },
        { coords: [52.5200, 13.4050], name: 'BERLIN', type: 'city' },
        { coords: [41.9028, 12.4964], name: 'ROME', type: 'city' },
        { coords: [40.4168, -3.7038], name: 'MADRID', type: 'city' },
        { coords: [41.3851, 2.1734], name: 'BARCELONA', type: 'city' },
        { coords: [50.1109, 8.6821], name: 'FRANKFURT', type: 'city' },
        { coords: [45.4642, 9.1900], name: 'MILAN', type: 'city' },
        { coords: [59.9139, 10.7522], name: 'OSLO', type: 'city' },
        { coords: [59.3293, 18.0686], name: 'STOCKHOLM', type: 'city' },
        { coords: [55.6761, 12.5683], name: 'COPENHAGEN', type: 'city' },
        { coords: [52.3676, 4.9041], name: 'AMSTERDAM', type: 'city' },
        { coords: [50.8503, 4.3517], name: 'BRUSSELS', type: 'city' },
        { coords: [47.3769, 8.5417], name: 'ZURICH', type: 'city' },
        { coords: [48.2082, 16.3738], name: 'VIENNA', type: 'city' },
        { coords: [50.0755, 14.4378], name: 'PRAGUE', type: 'city' },
        { coords: [47.4979, 19.0402], name: 'BUDAPEST', type: 'city' },
        { coords: [52.2297, 21.0122], name: 'WARSAW', type: 'city' },
        { coords: [55.7558, 37.6176], name: 'MOSCOW', type: 'city' },
        { coords: [59.9311, 30.3609], name: 'ST PETERSBURG', type: 'city' },

        // Asia - Major Cities
        { coords: [35.6762, 139.6503], name: 'TOKYO', type: 'city' },
        { coords: [39.9042, 116.4074], name: 'BEIJING', type: 'city' },
        { coords: [31.2304, 121.4737], name: 'SHANGHAI', type: 'city' },
        { coords: [22.3193, 114.1694], name: 'HONG KONG', type: 'city' },
        { coords: [37.5665, 126.9780], name: 'SEOUL', type: 'city' },
        { coords: [25.0330, 121.5654], name: 'TAIPEI', type: 'city' },
        { coords: [1.3521, 103.8198], name: 'SINGAPORE', type: 'city' },
        { coords: [3.1390, 101.6869], name: 'KUALA LUMPUR', type: 'city' },
        { coords: [13.7563, 100.5018], name: 'BANGKOK', type: 'city' },
        { coords: [21.0285, 105.8542], name: 'HANOI', type: 'city' },
        { coords: [10.8231, 106.6297], name: 'HO CHI MINH', type: 'city' },
        { coords: [14.5995, 120.9842], name: 'MANILA', type: 'city' },
        { coords: [-6.2088, 106.8456], name: 'JAKARTA', type: 'city' },
        { coords: [28.6139, 77.2090], name: 'NEW DELHI', type: 'city' },
        { coords: [19.0760, 72.8777], name: 'MUMBAI', type: 'city' },
        { coords: [13.0827, 80.2707], name: 'CHENNAI', type: 'city' },
        { coords: [22.5726, 88.3639], name: 'KOLKATA', type: 'city' },
        { coords: [12.9716, 77.5946], name: 'BANGALORE', type: 'city' },
        { coords: [17.3850, 78.4867], name: 'HYDERABAD', type: 'city' },
        { coords: [18.5204, 73.8567], name: 'PUNE', type: 'city' },
        { coords: [19.9975, 73.7898], name: 'NASHIK', type: 'city' },
        { coords: [23.0225, 72.5714], name: 'AHMEDABAD', type: 'city' },
        { coords: [26.9124, 75.7873], name: 'JAIPUR', type: 'city' },
        { coords: [31.6340, 74.8723], name: 'AMRITSAR', type: 'city' },
        { coords: [23.6850, 90.3563], name: 'DHAKA', type: 'city' },
        { coords: [24.8607, 67.0011], name: 'KARACHI', type: 'city' },
        { coords: [31.5497, 74.3436], name: 'LAHORE', type: 'city' },
        { coords: [33.6844, 73.0479], name: 'ISLAMABAD', type: 'city' },
        { coords: [27.7172, 85.3240], name: 'KATHMANDU', type: 'city' },
        { coords: [6.9271, 79.8612], name: 'COLOMBO', type: 'city' },

        // Middle East & Central Asia
        { coords: [25.2048, 55.2708], name: 'DUBAI', type: 'city' },
        { coords: [24.4539, 54.3773], name: 'ABU DHABI', type: 'city' },
        { coords: [25.2854, 51.5310], name: 'DOHA', type: 'city' },
        { coords: [29.3117, 47.4818], name: 'KUWAIT CITY', type: 'city' },
        { coords: [26.0667, 50.5577], name: 'MANAMA', type: 'city' },
        { coords: [24.7136, 46.6753], name: 'RIYADH', type: 'city' },
        { coords: [21.4858, 39.1925], name: 'MECCA', type: 'city' },
        { coords: [24.4539, 39.6128], name: 'MEDINA', type: 'city' },
        { coords: [35.6895, 51.3890], name: 'TEHRAN', type: 'city' },
        { coords: [32.0853, 34.7818], name: 'TEL AVIV', type: 'city' },
        { coords: [31.7683, 35.2137], name: 'JERUSALEM', type: 'city' },
        { coords: [33.5138, 36.2765], name: 'DAMASCUS', type: 'city' },
        { coords: [33.8869, 35.5131], name: 'BEIRUT', type: 'city' },
        { coords: [39.9334, 32.8597], name: 'ANKARA', type: 'city' },
        { coords: [41.0082, 28.9784], name: 'ISTANBUL', type: 'city' },
        { coords: [40.1792, 44.4991], name: 'YEREVAN', type: 'city' },
        { coords: [40.4093, 49.8671], name: 'BAKU', type: 'city' },
        { coords: [41.7151, 44.8271], name: 'TBILISI', type: 'city' },
        { coords: [43.2551, 76.9126], name: 'ALMATY', type: 'city' },
        { coords: [41.2995, 69.2401], name: 'TASHKENT', type: 'city' },
        { coords: [42.8746, 74.5698], name: 'BISHKEK', type: 'city' },
        { coords: [38.5598, 68.7870], name: 'DUSHANBE', type: 'city' },
        { coords: [37.9601, 58.3261], name: 'ASHGABAT', type: 'city' },
        { coords: [34.5553, 69.2075], name: 'KABUL', type: 'city' },

        // Africa - Major Cities
        { coords: [30.0444, 31.2357], name: 'CAIRO', type: 'city' },
        { coords: [30.0626, 31.2497], name: 'GIZA', type: 'city' },
        { coords: [31.2001, 29.9187], name: 'ALEXANDRIA', type: 'city' },
        { coords: [6.5244, 3.3792], name: 'LAGOS', type: 'city' },
        { coords: [9.0579, 8.6753], name: 'ABUJA', type: 'city' },
        { coords: [7.3775, 3.9470], name: 'IBADAN', type: 'city' },
        { coords: [11.0041, 4.0000], name: 'KANO', type: 'city' },
        { coords: [4.8156, 7.0498], name: 'PORT HARCOURT', type: 'city' },
        { coords: [5.6037, -0.1870], name: 'ACCRA', type: 'city' },
        { coords: [14.7167, -17.4677], name: 'DAKAR', type: 'city' },
        { coords: [12.6392, -8.0029], name: 'BAMAKO', type: 'city' },
        { coords: [6.1319, 1.2228], name: 'LOME', type: 'city' },
        { coords: [6.3703, 2.3912], name: 'COTONOU', type: 'city' },
        { coords: [15.5007, 32.5599], name: 'KHARTOUM', type: 'city' },
        { coords: [9.0307, 38.7616], name: 'ADDIS ABABA', type: 'city' },
        { coords: [-1.2921, 36.8219], name: 'NAIROBI', type: 'city' },
        { coords: [-6.7924, 39.2083], name: 'DAR ES SALAAM', type: 'city' },
        { coords: [0.3476, 32.5825], name: 'KAMPALA', type: 'city' },
        { coords: [-1.9441, 30.0619], name: 'KIGALI', type: 'city' },
        { coords: [-3.3731, 29.9189], name: 'BUJUMBURA', type: 'city' },
        { coords: [-4.4419, 15.2663], name: 'KINSHASA', type: 'city' },
        { coords: [-11.2027, 17.8739], name: 'LUANDA', type: 'city' },
        { coords: [-15.3875, 28.3228], name: 'LUSAKA', type: 'city' },
        { coords: [-17.8252, 31.0335], name: 'HARARE', type: 'city' },
        { coords: [-25.7479, 28.2293], name: 'PRETORIA', type: 'city' },
        { coords: [-26.2041, 28.0473], name: 'JOHANNESBURG', type: 'city' },
        { coords: [-33.9249, 18.4241], name: 'CAPE TOWN', type: 'city' },
        { coords: [-29.8587, 31.0218], name: 'DURBAN', type: 'city' },
        { coords: [33.9716, -6.8498], name: 'RABAT', type: 'city' },
        { coords: [33.5731, -7.5898], name: 'CASABLANCA', type: 'city' },
        { coords: [36.7538, 3.0588], name: 'ALGIERS', type: 'city' },
        { coords: [36.8065, 10.1815], name: 'TUNIS', type: 'city' },
        { coords: [32.6851, 13.1849], name: 'TRIPOLI', type: 'city' },

        // Oceania - Major Cities
        { coords: [-33.8688, 151.2093], name: 'SYDNEY', type: 'city' },
        { coords: [-37.8136, 144.9631], name: 'MELBOURNE', type: 'city' },
        { coords: [-27.4698, 153.0251], name: 'BRISBANE', type: 'city' },
        { coords: [-31.9505, 115.8605], name: 'PERTH', type: 'city' },
        { coords: [-34.9285, 138.6007], name: 'ADELAIDE', type: 'city' },
        { coords: [-35.2809, 149.1300], name: 'CANBERRA', type: 'city' },
        { coords: [-42.8821, 147.3272], name: 'HOBART', type: 'city' },
        { coords: [-12.4634, 130.8456], name: 'DARWIN', type: 'city' },
        { coords: [-36.8485, 174.7633], name: 'AUCKLAND', type: 'city' },
        { coords: [-41.2865, 174.7762], name: 'WELLINGTON', type: 'city' },
        { coords: [-43.5321, 172.6362], name: 'CHRISTCHURCH', type: 'city' },
        { coords: [-17.7134, 168.3273], name: 'PORT VILA', type: 'city' },
        { coords: [-18.1416, 178.4419], name: 'SUVA', type: 'city' },
        { coords: [-13.8333, -171.7500], name: 'APIA', type: 'city' },

        // South America - Major Cities
        { coords: [-23.5558, -46.6396], name: 'SAO PAULO', type: 'city' },
        { coords: [-22.9068, -43.1729], name: 'RIO DE JANEIRO', type: 'city' },
        { coords: [-15.8267, -47.9218], name: 'BRASILIA', type: 'city' },
        { coords: [-12.9714, -38.5014], name: 'SALVADOR', type: 'city' },
        { coords: [-8.0476, -34.8770], name: 'RECIFE', type: 'city' },
        { coords: [-3.1190, -60.0217], name: 'MANAUS', type: 'city' },
        { coords: [-1.4558, -48.4902], name: 'BELEM', type: 'city' },
        { coords: [-30.0346, -51.2177], name: 'PORTO ALEGRE', type: 'city' },
        { coords: [-25.4284, -49.2733], name: 'CURITIBA', type: 'city' },
        { coords: [-19.9167, -43.9345], name: 'BELO HORIZONTE', type: 'city' },
        { coords: [-34.6118, -58.3960], name: 'BUENOS AIRES', type: 'city' },
        { coords: [-31.4201, -64.1888], name: 'CORDOBA', type: 'city' },
        { coords: [-32.9442, -60.6505], name: 'ROSARIO', type: 'city' },
        { coords: [-34.9011, -56.1645], name: 'MONTEVIDEO', type: 'city' },
        { coords: [-33.4489, -70.6693], name: 'SANTIAGO', type: 'city' },
        { coords: [-33.0472, -71.6127], name: 'VALPARAISO', type: 'city' },
        { coords: [-36.8485, -73.0524], name: 'CONCEPCION', type: 'city' },
        { coords: [4.7110, -74.0721], name: 'BOGOTA', type: 'city' },
        { coords: [6.2442, -75.5812], name: 'MEDELLIN', type: 'city' },
        { coords: [10.9685, -74.7813], name: 'BARRANQUILLA', type: 'city' },
        { coords: [3.4516, -76.5320], name: 'CALI', type: 'city' },
        { coords: [-0.1807, -78.4678], name: 'QUITO', type: 'city' },
        { coords: [-2.1894, -79.8890], name: 'GUAYAQUIL', type: 'city' },
        { coords: [-12.0464, -77.0428], name: 'LIMA', type: 'city' },
        { coords: [-13.5319, -71.9675], name: 'CUSCO', type: 'city' },
        { coords: [-16.5000, -68.1500], name: 'LA PAZ', type: 'city' },
        { coords: [-17.7833, -63.1821], name: 'SANTA CRUZ', type: 'city' },
        { coords: [-25.2637, -57.5759], name: 'ASUNCION', type: 'city' },
        { coords: [10.4806, -66.9036], name: 'CARACAS', type: 'city' },
        { coords: [8.5380, -71.1394], name: 'MARACAIBO', type: 'city' },
        { coords: [5.5301, -73.3350], name: 'TUNJA', type: 'city' },


        // Real-time Data Layers - Only Crowd Density
        { coords: [19.9975, 73.7898], name: '🔴 High Density Zone', type: 'crowd-data', density: 'high' },
        { coords: [20.0123, 73.7456], name: '🟡 Medium Density Zone', type: 'crowd-data', density: 'medium' },
        { coords: [19.9615, 73.7926], name: '🟢 Low Density Zone', type: 'crowd-data', density: 'low' },

        // Indian Cities & Areas - Comprehensive Coverage
        { coords: [19.9615, 73.7926], name: 'Nashik Road', type: 'area' },
        { coords: [19.9307, 73.7314], name: 'Cidco', type: 'area' },
        { coords: [20.0123, 73.7456], name: 'Gangapur Road', type: 'area' },
        { coords: [19.9456, 73.8234], name: 'Deolali Camp', type: 'area' },
        { coords: [20.0456, 73.7123], name: 'Satpur MIDC', type: 'area' },
        { coords: [19.9990, 73.7910], name: 'Panchavati', type: 'area' },
        { coords: [20.0234, 73.7567], name: 'Ambad', type: 'area' },
        { coords: [19.9800, 73.7600], name: 'College Road', type: 'area' },
        { coords: [19.9850, 73.7750], name: 'MG Road', type: 'area' },
        { coords: [19.9700, 73.7800], name: 'Dwarka Nagar', type: 'area' },
        { coords: [19.9900, 73.7950], name: 'Raviwar Karanja', type: 'area' },
        { coords: [19.9650, 73.7850], name: 'Sharanpur', type: 'area' },
        { coords: [19.9750, 73.7700], name: 'Govind Nagar', type: 'area' },
        { coords: [19.9550, 73.7750], name: 'Canada Corner', type: 'area' },
        { coords: [19.9450, 73.7650], name: 'Ashok Stambh', type: 'area' },
        { coords: [19.9350, 73.7550], name: 'Indira Nagar', type: 'area' },
        { coords: [19.9250, 73.7450], name: 'Mahatma Nagar', type: 'area' },
        { coords: [19.9150, 73.7350], name: 'Shivaji Nagar', type: 'area' },
        { coords: [19.9050, 73.7250], name: 'Gandhi Nagar', type: 'area' },
        // Mumbai Metropolitan Region - Comprehensive
        { coords: [19.0330, 72.8570], name: 'Bandra West', type: 'area' },
        { coords: [19.0596, 72.8295], name: 'Andheri East', type: 'area' },
        { coords: [19.1136, 72.8697], name: 'Powai', type: 'area' },
        { coords: [18.9220, 72.8347], name: 'Dadar', type: 'area' },
        { coords: [18.9067, 72.8147], name: 'Worli', type: 'area' },
        { coords: [18.9388, 72.8354], name: 'Fort', type: 'area' },
        { coords: [18.9067, 72.8147], name: 'Lower Parel', type: 'area' },
        { coords: [19.0728, 72.8826], name: 'Borivali', type: 'area' },
        { coords: [19.2183, 72.9781], name: 'Thane', type: 'area' },
        { coords: [19.0895, 72.8656], name: 'Santacruz', type: 'area' },
        { coords: [19.0176, 72.8562], name: 'Khar', type: 'area' },
        { coords: [19.0544, 72.8320], name: 'Juhu', type: 'area' },
        { coords: [19.1197, 72.9073], name: 'Malad', type: 'area' },
        { coords: [19.1075, 72.8263], name: 'Versova', type: 'area' },
        { coords: [18.9750, 72.8258], name: 'Mahim', type: 'area' },
        { coords: [18.9647, 72.8378], name: 'Matunga', type: 'area' },
        { coords: [18.9520, 72.8347], name: 'Sion', type: 'area' },
        { coords: [19.0412, 72.8797], name: 'Goregaon', type: 'area' },
        { coords: [19.0895, 72.9073], name: 'Kandivali', type: 'area' },
        { coords: [19.2215, 73.1645], name: 'Ulhasnagar', type: 'area' },
        { coords: [19.2403, 73.1305], name: 'Kalyan', type: 'area' },
        { coords: [19.2952, 72.8544], name: 'Mira Road', type: 'area' },
        { coords: [19.4912, 72.8054], name: 'Vasai', type: 'area' },
        { coords: [19.0330, 73.0297], name: 'Navi Mumbai', type: 'area' },
        { coords: [19.3002, 73.0635], name: 'Bhiwandi', type: 'area' },
        { coords: [18.5362, 73.8980], name: 'Koregaon Park', type: 'area' },
        { coords: [18.5304, 73.8567], name: 'Shivajinagar', type: 'area' },
        { coords: [18.5074, 73.8077], name: 'Deccan', type: 'area' },
        { coords: [18.4633, 73.8671], name: 'Kothrud', type: 'area' },
        { coords: [18.5793, 73.9089], name: 'Viman Nagar', type: 'area' },
        { coords: [18.5679, 73.9143], name: 'Kalyani Nagar', type: 'area' },
        { coords: [18.4088, 73.8878], name: 'Warje', type: 'area' },
        { coords: [18.6298, 73.7997], name: 'Pimpri', type: 'area' },
        { coords: [18.6161, 73.8286], name: 'Chinchwad', type: 'area' },
        { coords: [28.7041, 77.1025], name: 'Connaught Place', type: 'area' },
        { coords: [28.5355, 77.3910], name: 'Noida', type: 'area' },
        { coords: [28.4595, 77.0266], name: 'Gurgaon', type: 'area' },
        { coords: [28.6692, 77.4538], name: 'Ghaziabad', type: 'area' },
        { coords: [28.6139, 77.2090], name: 'Karol Bagh', type: 'area' },
        { coords: [28.5494, 77.2500], name: 'Lajpat Nagar', type: 'area' },
        { coords: [28.6304, 77.2177], name: 'Chandni Chowk', type: 'area' },
        { coords: [28.5245, 77.1855], name: 'Saket', type: 'area' },
        { coords: [28.4817, 77.1873], name: 'Vasant Kunj', type: 'area' },
        { coords: [28.6692, 77.4538], name: 'Dwarka', type: 'area' },
        { coords: [12.9352, 77.6245], name: 'Whitefield', type: 'area' },
        { coords: [12.9698, 77.7500], name: 'Electronic City', type: 'area' },
        { coords: [12.9279, 77.6271], name: 'Marathahalli', type: 'area' },
        { coords: [12.9716, 77.5946], name: 'MG Road', type: 'area' },
        { coords: [12.9698, 77.6413], name: 'Koramangala', type: 'area' },
        { coords: [12.9591, 77.6974], name: 'Indiranagar', type: 'area' },
        { coords: [13.0827, 80.2707], name: 'T Nagar', type: 'area' },
        { coords: [13.0569, 80.2570], name: 'Adyar', type: 'area' },
        { coords: [13.0878, 80.2785], name: 'Anna Nagar', type: 'area' },
        { coords: [13.0475, 80.2574], name: 'Mylapore', type: 'area' },
        { coords: [13.0067, 80.2206], name: 'Velachery', type: 'area' },
        { coords: [22.5726, 88.3639], name: 'Park Street', type: 'area' },
        { coords: [22.5448, 88.3426], name: 'Salt Lake', type: 'area' },
        { coords: [22.6203, 88.4370], name: 'New Town', type: 'area' },
        { coords: [22.5958, 88.2636], name: 'Howrah', type: 'area' },
        { coords: [17.4065, 78.4772], name: 'Banjara Hills', type: 'area' },
        { coords: [17.4399, 78.3489], name: 'Jubilee Hills', type: 'area' },
        { coords: [17.4126, 78.3861], name: 'Secunderabad', type: 'area' },
        { coords: [17.3850, 78.4867], name: 'HITEC City', type: 'area' },
        { coords: [17.4483, 78.3915], name: 'Gachibowli', type: 'area' },
        { coords: [23.0225, 72.5714], name: 'Satellite', type: 'area' },
        { coords: [23.0395, 72.5661], name: 'Vastrapur', type: 'area' },
        { coords: [23.0732, 72.5290], name: 'Bopal', type: 'area' },
        { coords: [23.0225, 72.5714], name: 'SG Highway', type: 'area' },
        { coords: [26.9124, 75.7873], name: 'Pink City', type: 'area' },
        { coords: [26.8467, 75.8061], name: 'Malviya Nagar', type: 'area' },
        { coords: [26.9260, 75.8235], name: 'C Scheme', type: 'area' },

        // Major Roads & Highways with Real-time Traffic Data
        { coords: [19.9500, 73.7500], name: 'NH-50 (Nashik-Pune)', type: 'road', traffic: 'moderate' },
        { coords: [19.9700, 73.7700], name: 'NH-60 (Mumbai Highway)', type: 'road', traffic: 'heavy' },
        { coords: [20.0300, 73.7800], name: 'Nashik-Aurangabad Road', type: 'road', traffic: 'light' },
        { coords: [19.9400, 73.8000], name: 'Nashik-Shirdi Highway', type: 'road', traffic: 'moderate' },
        { coords: [28.6139, 77.2090], name: 'Ring Road Delhi', type: 'road', traffic: 'heavy' },
        { coords: [19.0760, 72.8777], name: 'Western Express Highway', type: 'road', traffic: 'heavy' },
        { coords: [18.5204, 73.8567], name: 'Pune-Mumbai Expressway', type: 'road', traffic: 'moderate' },
        { coords: [12.9716, 77.5946], name: 'Outer Ring Road Bangalore', type: 'road', traffic: 'heavy' },
        { coords: [13.0827, 80.2707], name: 'IT Expressway Chennai', type: 'road', traffic: 'moderate' },
        { coords: [22.5726, 88.3639], name: 'EM Bypass Kolkata', type: 'road', traffic: 'heavy' },
        { coords: [17.3850, 78.4867], name: 'ORR Hyderabad', type: 'road', traffic: 'moderate' },
        { coords: [23.0225, 72.5714], name: 'SG Highway Ahmedabad', type: 'road', traffic: 'moderate' },
        { coords: [26.9124, 75.7873], name: 'Tonk Road Jaipur', type: 'road', traffic: 'light' },

        // Transit Hubs with Real-time Data
        { coords: [19.9615, 73.7926], name: '🚂 Nashik Road Station', type: 'transit', status: 'active' },
        { coords: [18.9398, 72.8355], name: '🚂 CST Mumbai', type: 'transit', status: 'busy' },
        { coords: [28.6139, 77.2090], name: '🚇 New Delhi Metro', type: 'transit', status: 'active' },
        { coords: [12.9716, 77.5946], name: '🚇 Bangalore Metro', type: 'transit', status: 'moderate' },
        { coords: [13.0827, 80.2707], name: '🚇 Chennai Metro', type: 'transit', status: 'active' },
        { coords: [22.5726, 88.3639], name: '🚇 Kolkata Metro', type: 'transit', status: 'busy' },
        { coords: [17.3850, 78.4867], name: '🚇 Hyderabad Metro', type: 'transit', status: 'moderate' },
        { coords: [23.0225, 72.5714], name: '🚌 Ahmedabad BRTS', type: 'transit', status: 'active' },
        { coords: [18.5204, 73.8567], name: '🚌 Pune BRT', type: 'transit', status: 'moderate' }
    ];

    locations.forEach(location => {
        let className, fontSize, fontWeight, color, borderColor;

        switch (location.type) {
            case 'city':
                className = 'city-label';
                fontSize = '14px';
                fontWeight = 'bold';
                color = '#ffffff';
                borderColor = '#10b981';
                break;
            case 'area':
                className = 'area-label';
                fontSize = '11px';
                fontWeight = 'normal';
                color = '#e5e5e5';
                borderColor = '#6b7280';
                break;
            case 'road':
                className = 'road-label';
                fontSize = '10px';
                fontWeight = 'normal';
                color = location.traffic === 'heavy' ? '#ef4444' :
                    location.traffic === 'moderate' ? '#f59e0b' : '#10b981';
                borderColor = color;
                break;
            case 'crowd-data':
                className = 'crowd-data-label';
                fontSize = '12px';
                fontWeight = 'bold';
                color = location.density === 'high' ? '#ef4444' :
                    location.density === 'medium' ? '#f59e0b' : '#10b981';
                borderColor = color;
                break;

            case 'transit':
                className = 'transit-label';
                fontSize = '10px';
                fontWeight = 'bold';
                color = location.status === 'busy' ? '#ef4444' :
                    location.status === 'moderate' ? '#f59e0b' : '#10b981';
                borderColor = color;
                break;
            default:
                className = 'default-label';
                fontSize = '10px';
                fontWeight = 'normal';
                color = '#cccccc';
                borderColor = '#6b7280';
        }

        const marker = L.marker(location.coords, {
            icon: L.divIcon({
                className: className,
                html: `<div style="
                    background: rgba(0,0,0,0.8);
                    color: ${color};
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: ${fontSize};
                    font-weight: ${fontWeight};
                    white-space: nowrap;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
                    border: 1px solid ${borderColor};
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    animation: ${location.type === 'crowd-data' || location.type === 'traffic-data' || location.type === 'transit-data' ? 'pulse 2s infinite' : 'none'};
                ">${location.name}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            })
        }).addTo(map);

        // Add real-time data popups without close button
        if (location.type === 'crowd-data') {
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: ${color};">📊 Crowd Density Monitor</h4>
                    <p><strong>Current Density:</strong> ${location.density.toUpperCase()}</p>
                    <p><strong>People Count:</strong> ${location.density === 'high' ? '45-60' : location.density === 'medium' ? '20-35' : '5-15'}</p>
                    <p><strong>Status:</strong> ${location.density === 'high' ? '🚨 Alert' : location.density === 'medium' ? '⚠️ Monitor' : '✅ Normal'}</p>
                    <p><strong>Last Update:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            `, { closeButton: false });

        } else if (location.type === 'road' && location.traffic) {
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: ${color};">🛣️ ${location.name}</h4>
                    <p><strong>Traffic:</strong> ${location.traffic.toUpperCase()}</p>
                    <p><strong>Speed:</strong> ${location.traffic === 'heavy' ? '15-25' : location.traffic === 'moderate' ? '35-45' : '55-65'} km/h</p>
                    <p><strong>Travel Time:</strong> ${location.traffic === 'heavy' ? '+40%' : location.traffic === 'moderate' ? '+20%' : 'Normal'}</p>
                    <p><strong>Last Update:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            `, { closeButton: false });
        } else if (location.type === 'transit' && location.status) {
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: ${color};">🚇 ${location.name}</h4>
                    <p><strong>Status:</strong> ${location.status.toUpperCase()}</p>
                    <p><strong>Passenger Load:</strong> ${location.status === 'busy' ? '85-95%' : location.status === 'moderate' ? '60-75%' : '30-50%'}</p>
                    <p><strong>Service:</strong> ${location.status === 'busy' ? 'Peak Hours' : 'Normal Service'}</p>
                    <p><strong>Last Update:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            `, { closeButton: false });
        }
    });

    // Add CSS for real-time data animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        .crowd-data-label, .traffic-data-label, .transit-data-label {
            animation: pulse 2s infinite;
        }
        /* Hide all location labels by default */
        .leaflet-marker-icon {
            display: none !important;
        }
        /* Only show crowd density markers */
        .crowd-data-label {
            display: block !important;
        }
    `;
    document.head.appendChild(style);
}

function addMapLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.style.background = 'rgba(0, 0, 0, 0.8)';
        div.style.color = 'white';
        div.style.padding = '12px';
        div.style.borderRadius = '8px';
        div.style.fontSize = '12px';
        div.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        div.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; color: white;">🛰️ Satellite Heatmap</h4>
                    <div><span style="color: #00ff00; font-size: 16px;">●</span> Safe (0-2 people/m²)</div>
                    <div><span style="color: #ff8800; font-size: 16px;">●</span> Warning (2-4 people/m²)</div>
                    <div><span style="color: #ff0000; font-size: 16px;">●</span> Critical (4+ people/m²)</div>
                `;
        return div;
    };
    legend.addTo(map);
}

function refreshMap() {
    const button = document.getElementById('refreshMap');
    button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';

    setTimeout(() => {
        // Remove all non-tile layers from the map
        map.eachLayer(layer => {
            if (!layer._url) { // Check if it's not a tile layer
                map.removeLayer(layer);
            }
        });

        addRefreshedHeatmapData();

        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        generateSimulatedData();
        updateStatusIndicators();
        showNotification('Heatmap refreshed with latest data!', 'success');
    }, 1500);
}

function addRefreshedHeatmapData() {
    // Real-time heatmap zones with accurate locations for satellite view
    const zones = [
        { coords: [19.9975, 73.7898], name: 'Nashik Central', density: getRandomDensity(), radius: 400 },
        { coords: [19.9615, 73.7926], name: 'Nashik Road Station', density: getRandomDensity(), radius: 350 },
        { coords: [19.9307, 73.7314], name: 'Sandip University Area', density: getRandomDensity(), radius: 300 },
        { coords: [20.0123, 73.7456], name: 'Gangapur Road', density: getRandomDensity(), radius: 250 },
        { coords: [19.9456, 73.8234], name: 'Deolali Camp', density: getRandomDensity(), radius: 200 },
        { coords: [20.0456, 73.7123], name: 'Satpur Industrial', density: getRandomDensity(), radius: 280 },
        { coords: [19.9990, 73.7910], name: 'Panchavati', density: getRandomDensity(), radius: 220 }
    ];

    zones.forEach((zone, index) => {
        const color = zone.density === 'high' ? '#ff0000' : zone.density === 'medium' ? '#ff8800' : '#00ff00';

        // Enhanced heatmap circles for satellite view
        const circle = L.circle(zone.coords, {
            color: '#ffffff',
            fillColor: color,
            fillOpacity: 0.6,
            radius: zone.radius,
            weight: 3,
            opacity: 0.9
        }).addTo(map);

        // Add location name label on map
        const label = L.marker(zone.coords, {
            icon: L.divIcon({
                className: 'location-label',
                html: `<div style="
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    white-space: nowrap;
                    border: 1px solid ${color};
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">${zone.name}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            })
        }).addTo(map);

        const peopleCount = zone.density === 'high' ? Math.floor(Math.random() * 50 + 30) :
            zone.density === 'medium' ? Math.floor(Math.random() * 30 + 10) :
                Math.floor(Math.random() * 15 + 1);

        circle.bindPopup(`
            <div style="background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 6px; font-size: 0.9rem;">
                <b style="color: ${color};">${zone.name}</b><br>
                Density: <span style="color:${color}; font-weight:bold;">${zone.density.toUpperCase()}</span><br>
                People Count: <b>${peopleCount}</b><br>
                Status: ${zone.density === 'high' ? '🚨 Alert' : zone.density === 'medium' ? '⚠️ Monitor' : '✅ Normal'}<br>
                <small>Last updated: ${new Date().toLocaleTimeString()}</small>
            </div>
        `, { closeButton: false });
    });

    // Update heatmap summary
    updateHeatmapSummary(zones);
}

function getRandomDensity() {
    const rand = Math.random();
    if (rand > 0.8) return 'high';
    if (rand > 0.4) return 'medium';
    return 'low';
}

function updateHeatmapSummary(zones) {
    const safe = zones.filter(z => z.density === 'low').length;
    const warning = zones.filter(z => z.density === 'medium').length;
    const critical = zones.filter(z => z.density === 'high').length;

    const currentDensity = critical > 0 ? 'High' : warning > 0 ? 'Medium' : 'Low';

    // Update summary elements if they exist
    const elements = {
        currentDensity: document.getElementById('currentDensity'),
        safeZonesCount: document.getElementById('safeZonesCount'),
        warningZonesCount: document.getElementById('warningZonesCount'),
        criticalZonesCount: document.getElementById('criticalZonesCount'),
        totalPeopleCount: document.getElementById('totalPeopleCount'),
        lastUpdateTime: document.getElementById('lastUpdateTime')
    };

    if (elements.currentDensity) elements.currentDensity.textContent = currentDensity;
    if (elements.safeZonesCount) elements.safeZonesCount.textContent = safe;
    if (elements.warningZonesCount) elements.warningZonesCount.textContent = warning;
    if (elements.criticalZonesCount) elements.criticalZonesCount.textContent = critical;
    if (elements.totalPeopleCount) {
        const totalPeople = zones.reduce((sum, zone) => sum + (zone.peopleCount || 0), 0);
        elements.totalPeopleCount.textContent = totalPeople;
    }
    if (elements.lastUpdateTime) elements.lastUpdateTime.textContent = new Date().toLocaleTimeString();
}

// =============== DATABASE REFRESH FUNCTIONALITY ===============
function refreshDatabaseData() {
    const button = document.getElementById('refreshDatabase');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    button.disabled = true;

    // Show loading states for all data fields
    const elements = {
        currentDensity: document.getElementById('currentDensity'),
        safeZonesCount: document.getElementById('safeZonesCount'),
        warningZonesCount: document.getElementById('warningZonesCount'),
        criticalZonesCount: document.getElementById('criticalZonesCount'),
        totalPeopleCount: document.getElementById('totalPeopleCount'),
        lastUpdateTime: document.getElementById('lastUpdateTime')
    };

    Object.values(elements).forEach(el => {
        if (el) el.textContent = 'Syncing...';
    });

    // Fetch fresh data from MySQL database
    Promise.all([
        fetch(`${API_BASE_URL}/api/density`).catch(() => ({ json: () => [] })),
        fetch(`${API_BASE_URL}/api/alerts`).catch(() => ({ json: () => [] }))
    ]).then(async ([densityRes, alertsRes]) => {
        const densityData = await densityRes.json().catch(() => []);
        const alertsData = await alertsRes.json().catch(() => []);

        // Process and update UI with fresh MySQL data
        updateHeatmapSummaryFromDatabase(densityData, alertsData);

        // Update charts with fresh data
        if (densityData.length > 0) {
            updateDensityUI(densityData);
            updateHourlyChartFromDensity(densityData);
            updateAnalyticsFromDensity(densityData);
        }

        // Update alerts display
        if (alertsData.length > 0) {
            updateAlertsUI(alertsData);
        }

        button.innerHTML = '<i class="fas fa-check"></i> Synced!';
        showNotification('Database synchronized successfully! All data updated from MySQL.', 'success');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);

    }).catch(error => {
        console.error('Database sync error:', error);

        // Reset to previous values or defaults on error
        if (elements.currentDensity) elements.currentDensity.textContent = 'Low';
        if (elements.safeZonesCount) elements.safeZonesCount.textContent = '0';
        if (elements.warningZonesCount) elements.warningZonesCount.textContent = '0';
        if (elements.criticalZonesCount) elements.criticalZonesCount.textContent = '0';
        if (elements.totalPeopleCount) elements.totalPeopleCount.textContent = '0';
        if (elements.lastUpdateTime) elements.lastUpdateTime.textContent = 'Sync failed';

        button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Sync Failed';
        showNotification('Database sync failed. Please check connection and try again.', 'error');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    });
}

function updateHeatmapSummaryFromDatabase(densityData, alertsData) {
    // Process density data to get zone statistics
    const zoneStats = processZoneStatistics(densityData);

    // Update summary elements with real database data
    const elements = {
        currentDensity: document.getElementById('currentDensity'),
        safeZonesCount: document.getElementById('safeZonesCount'),
        warningZonesCount: document.getElementById('warningZonesCount'),
        criticalZonesCount: document.getElementById('criticalZonesCount'),
        totalPeopleCount: document.getElementById('totalPeopleCount'),
        lastUpdateTime: document.getElementById('lastUpdateTime')
    };

    if (elements.currentDensity) {
        elements.currentDensity.textContent = zoneStats.overallDensity;
    }
    if (elements.safeZonesCount) {
        elements.safeZonesCount.textContent = zoneStats.safeZones;
    }
    if (elements.warningZonesCount) {
        elements.warningZonesCount.textContent = zoneStats.warningZones;
    }
    if (elements.criticalZonesCount) {
        elements.criticalZonesCount.textContent = zoneStats.criticalZones;
    }
    if (elements.totalPeopleCount) {
        elements.totalPeopleCount.textContent = zoneStats.totalPeople;
    }
    if (elements.lastUpdateTime) {
        elements.lastUpdateTime.textContent = new Date().toLocaleTimeString() + ' (MySQL)';
    }
}

function processZoneStatistics(densityData) {
    if (!densityData || densityData.length === 0) {
        return {
            overallDensity: 'Low',
            safeZones: 0,
            warningZones: 0,
            criticalZones: 0,
            totalPeople: 0
        };
    }

    // Get latest data per zone
    const latestByZone = new Map();
    densityData.forEach(item => {
        if (!item || item.zoneId == null) return;
        const ts = item.timestamp ? new Date(item.timestamp).getTime() : 0;
        const prev = latestByZone.get(item.zoneId);
        if (!prev || ts > prev._ts) {
            latestByZone.set(item.zoneId, Object.assign({}, item, { _ts: ts }));
        }
    });

    let safeZones = 0;
    let warningZones = 0;
    let criticalZones = 0;
    let totalPeople = 0;

    latestByZone.forEach(zone => {
        const density = (zone.density || '').toString().toLowerCase();
        const count = parseInt(zone.count) || 0;

        totalPeople += count;

        if (density === 'high') {
            criticalZones++;
        } else if (density === 'medium') {
            warningZones++;
        } else {
            safeZones++;
        }
    });

    // Determine overall density
    let overallDensity = 'Low';
    if (criticalZones > 0) {
        overallDensity = 'High';
    } else if (warningZones > 0) {
        overallDensity = 'Medium';
    }

    return {
        overallDensity,
        safeZones,
        warningZones,
        criticalZones,
        totalPeople
    };
}

function toggleSafeRoutes() {
    const button = document.getElementById('safeRoutes');
    const isActive = button.classList.contains('active');

    if (!isActive) {
        showSafeRoutesModal();
    } else {
        button.classList.remove('active');
        button.innerHTML = '<i class="fas fa-route"></i> Show Routes';
        clearAllRoutes();
    }
}

function showSafeRoutesModal() {
    const modal = document.getElementById('safeRoutesModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Clear previous selections
        const startInput = document.getElementById('srStart');
        const destInput = document.getElementById('srDest');
        if (startInput) startInput.value = '';
        if (destInput) destInput.value = '';

        // Setup auto-suggest functionality with multiple attempts
        let attempts = 0;
        const setupWithRetry = () => {
            attempts++;
            const startInput = document.getElementById('srStart');
            const destInput = document.getElementById('srDest');
            const gpsBtn = document.getElementById('useGpsBtn');

            if (startInput && destInput && gpsBtn) {
                setupAutoSuggest();
            } else if (attempts < 5) {
                setTimeout(setupWithRetry, 200);
            }
        };
        setupWithRetry();
    }
}

function showRouteSelectionPopup() {
    showSafeRoutesModal();
}

function hideSafeRoutesModal() {
    const modal = document.getElementById('safeRoutesModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function searchLocation(input, type) {
    const query = input.value.trim();
    if (query.length < 1) {
        document.getElementById(type === 'start' ? 'startSuggestions' : 'destSuggestions').innerHTML = '';
        return;
    }

    // Auto-suggest multiple locations immediately
    const suggestions = getLocationSuggestions(query);
    displaySuggestions(suggestions, type);

    // Show popular suggestions even for single character
    if (query.length === 1) {
        const popularSuggestions = getPopularLocations(query);
        displaySuggestions([...suggestions, ...popularSuggestions], type);
    }
}

function getLocationSuggestions(query) {
    const allLocations = [
        // Major Highways & Junctions
        { name: 'NH-50 Nashik-Pune Highway', coords: '19.9307,73.7314', type: 'highway' },
        { name: 'NH-60 Mumbai-Nashik Highway', coords: '19.9615,73.7926', type: 'highway' },
        { name: 'Nashik-Aurangabad Highway (NH-222)', coords: '19.8762,75.3433', type: 'highway' },
        { name: 'Nashik-Shirdi Highway', coords: '19.7645,74.4769', type: 'highway' },

        // Missing Major Cities
        { name: 'Surat, Gujarat', coords: '21.1702,72.8311', type: 'city' },
        { name: 'Kanpur, Uttar Pradesh', coords: '26.4499,80.3319', type: 'city' },
        { name: 'Lucknow, Uttar Pradesh', coords: '26.8467,80.9462', type: 'city' },
        { name: 'Nagpur, Maharashtra', coords: '21.1458,79.0882', type: 'city' },
        { name: 'Indore, Madhya Pradesh', coords: '22.7196,75.8577', type: 'city' },
        { name: 'Thane, Maharashtra', coords: '19.2183,72.9781', type: 'city' },
        { name: 'Bhopal, Madhya Pradesh', coords: '23.2599,77.4126', type: 'city' },
        { name: 'Visakhapatnam, Andhra Pradesh', coords: '17.6868,83.2185', type: 'city' },
        { name: 'Pimpri-Chinchwad, Maharashtra', coords: '18.6298,73.7997', type: 'city' },
        { name: 'Patna, Bihar', coords: '25.5941,85.1376', type: 'city' },
        { name: 'Vadodara, Gujarat', coords: '22.3072,73.1812', type: 'city' },
        { name: 'Ludhiana, Punjab', coords: '30.9010,75.8573', type: 'city' },
        { name: 'Agra, Uttar Pradesh', coords: '27.1767,78.0081', type: 'city' },
        { name: 'Faridabad, Haryana', coords: '28.4089,77.3178', type: 'city' },
        { name: 'Meerut, Uttar Pradesh', coords: '28.9845,77.7064', type: 'city' },
        { name: 'Rajkot, Gujarat', coords: '22.3039,70.8022', type: 'city' },
        { name: 'Kalyan-Dombivli, Maharashtra', coords: '19.2403,73.1305', type: 'city' },
        { name: 'Vasai-Virar, Maharashtra', coords: '19.4912,72.8054', type: 'city' },
        { name: 'Varanasi, Uttar Pradesh', coords: '25.3176,82.9739', type: 'city' },
        { name: 'Srinagar, Jammu and Kashmir', coords: '34.0837,74.7973', type: 'city' },
        { name: 'Aurangabad, Maharashtra', coords: '19.8762,75.3433', type: 'city' },
        { name: 'Dhanbad, Jharkhand', coords: '23.7957,86.4304', type: 'city' },
        { name: 'Amritsar, Punjab', coords: '31.6340,74.8723', type: 'city' },
        { name: 'Navi Mumbai, Maharashtra', coords: '19.0330,73.0297', type: 'city' },
        { name: 'Allahabad, Uttar Pradesh', coords: '25.4358,81.8463', type: 'city' },
        { name: 'Ranchi, Jharkhand', coords: '23.3441,85.3096', type: 'city' },
        { name: 'Howrah, West Bengal', coords: '22.5958,88.2636', type: 'city' },
        { name: 'Coimbatore, Tamil Nadu', coords: '11.0168,76.9558', type: 'city' },
        { name: 'Jabalpur, Madhya Pradesh', coords: '23.1815,79.9864', type: 'city' },
        { name: 'Gwalior, Madhya Pradesh', coords: '26.2183,78.1828', type: 'city' },
        { name: 'Vijayawada, Andhra Pradesh', coords: '16.5062,80.6480', type: 'city' },
        { name: 'Jodhpur, Rajasthan', coords: '26.2389,73.0243', type: 'city' },
        { name: 'Madurai, Tamil Nadu', coords: '9.9252,78.1198', type: 'city' },
        { name: 'Raipur, Chhattisgarh', coords: '21.2514,81.6296', type: 'city' },
        { name: 'Kota, Rajasthan', coords: '25.2138,75.8648', type: 'city' },
        { name: 'Chandigarh, Punjab', coords: '30.7333,76.7794', type: 'city' },
        { name: 'Guwahati, Assam', coords: '26.1445,91.7362', type: 'city' },
        { name: 'Solapur, Maharashtra', coords: '17.6599,75.9064', type: 'city' },
        { name: 'Hubli-Dharwad, Karnataka', coords: '15.3647,75.1240', type: 'city' },
        { name: 'Bareilly, Uttar Pradesh', coords: '28.3670,79.4304', type: 'city' },
        { name: 'Moradabad, Uttar Pradesh', coords: '28.8386,78.7733', type: 'city' },
        { name: 'Mysore, Karnataka', coords: '12.2958,76.6394', type: 'city' },
        { name: 'Gurgaon, Haryana', coords: '28.4595,77.0266', type: 'city' },
        { name: 'Aligarh, Uttar Pradesh', coords: '27.8974,78.0880', type: 'city' },
        { name: 'Jalandhar, Punjab', coords: '31.3260,75.5762', type: 'city' },
        { name: 'Tiruchirappalli, Tamil Nadu', coords: '10.7905,78.7047', type: 'city' },
        { name: 'Bhubaneswar, Odisha', coords: '20.2961,85.8245', type: 'city' },
        { name: 'Salem, Tamil Nadu', coords: '11.6643,78.1460', type: 'city' },
        { name: 'Warangal, Telangana', coords: '17.9689,79.5941', type: 'city' },
        { name: 'Mira-Bhayandar, Maharashtra', coords: '19.2952,72.8544', type: 'city' },
        { name: 'Thiruvananthapuram, Kerala', coords: '8.5241,76.9366', type: 'city' },
        { name: 'Bhiwandi, Maharashtra', coords: '19.3002,73.0635', type: 'city' },
        { name: 'Saharanpur, Uttar Pradesh', coords: '29.9680,77.5552', type: 'city' },
        { name: 'Guntur, Andhra Pradesh', coords: '16.3067,80.4365', type: 'city' },
        { name: 'Amravati, Maharashtra', coords: '20.9374,77.7796', type: 'city' },
        { name: 'Bikaner, Rajasthan', coords: '28.0229,73.3119', type: 'city' },
        { name: 'Noida, Uttar Pradesh', coords: '28.5355,77.3910', type: 'city' },
        { name: 'Jamshedpur, Jharkhand', coords: '22.8046,86.2029', type: 'city' },
        { name: 'Bhilai Nagar, Chhattisgarh', coords: '21.1938,81.3509', type: 'city' },
        { name: 'Cuttack, Odisha', coords: '20.4625,85.8828', type: 'city' },
        { name: 'Firozabad, Uttar Pradesh', coords: '27.1592,78.3957', type: 'city' },
        { name: 'Kochi, Kerala', coords: '9.9312,76.2673', type: 'city' },
        { name: 'Bhavnagar, Gujarat', coords: '21.7645,72.1519', type: 'city' },
        { name: 'Dehradun, Uttarakhand', coords: '30.3165,78.0322', type: 'city' },
        { name: 'Durgapur, West Bengal', coords: '23.5204,87.3119', type: 'city' },
        { name: 'Asansol, West Bengal', coords: '23.6739,86.9524', type: 'city' },
        { name: 'Nanded, Maharashtra', coords: '19.1383,77.2975', type: 'city' },
        { name: 'Kolhapur, Maharashtra', coords: '16.7050,74.2433', type: 'city' },
        { name: 'Ajmer, Rajasthan', coords: '26.4499,74.6399', type: 'city' },
        { name: 'Akola, Maharashtra', coords: '20.7002,77.0082', type: 'city' },
        { name: 'Gulbarga, Karnataka', coords: '17.3297,76.8343', type: 'city' },
        { name: 'Jamnagar, Gujarat', coords: '22.4707,70.0577', type: 'city' },
        { name: 'Ujjain, Madhya Pradesh', coords: '23.1765,75.7885', type: 'city' },
        { name: 'Loni, Uttar Pradesh', coords: '28.7506,77.2897', type: 'city' },
        { name: 'Siliguri, West Bengal', coords: '26.7271,88.3953', type: 'city' },
        { name: 'Jhansi, Uttar Pradesh', coords: '25.4484,78.5685', type: 'city' },
        { name: 'Ulhasnagar, Maharashtra', coords: '19.2215,73.1645', type: 'city' },
        { name: 'Jammu, Jammu and Kashmir', coords: '32.7266,74.8570', type: 'city' },
        { name: 'Sangli-Miraj & Kupwad, Maharashtra', coords: '16.8524,74.5815', type: 'city' },
        { name: 'Mangalore, Karnataka', coords: '12.9141,74.8560', type: 'city' },
        { name: 'Erode, Tamil Nadu', coords: '11.3410,77.7172', type: 'city' },
        { name: 'Belgaum, Karnataka', coords: '15.8497,74.4977', type: 'city' },
        { name: 'Ambattur, Tamil Nadu', coords: '13.1143,80.1548', type: 'city' },
        { name: 'Tirunelveli, Tamil Nadu', coords: '8.7139,77.7567', type: 'city' },
        { name: 'Malegaon, Maharashtra', coords: '20.5579,74.5287', type: 'city' },
        { name: 'Gaya, Bihar', coords: '24.7914,85.0002', type: 'city' },
        { name: 'Jalgaon, Maharashtra', coords: '21.0077,75.5626', type: 'city' },
        { name: 'Udaipur, Rajasthan', coords: '24.5854,73.7125', type: 'city' },
        { name: 'Maheshtala, West Bengal', coords: '22.5093,88.2482', type: 'city' },

        // Nashik Major Locations
        { name: 'Nashik Road Railway Station', coords: '19.9615,73.7926', type: 'transport' },
        { name: 'Sandip University, Nashik', coords: '19.9307,73.7314', type: 'education' },
        { name: 'Nashik Central Bus Stand', coords: '19.9975,73.7899', type: 'transport' },
        { name: 'College Road, Nashik', coords: '19.9980,73.7900', type: 'area' },
        { name: 'MG Road, Nashik', coords: '19.9985,73.7905', type: 'area' },
        { name: 'Panchavati Temple, Nashik', coords: '19.9990,73.7910', type: 'religious' },
        { name: 'Gangapur Road, Nashik', coords: '20.0123,73.7456', type: 'area' },
        { name: 'Cidco Nashik', coords: '19.9307,73.7314', type: 'area' },
        { name: 'Satpur MIDC, Nashik', coords: '20.0456,73.7123', type: 'industrial' },
        { name: 'Ambad Nashik', coords: '20.0234,73.7567', type: 'area' },
        { name: 'Deolali Camp, Nashik', coords: '19.9456,73.8234', type: 'military' },
        { name: 'Nashik Airport (Ozar)', coords: '20.1117,73.9131', type: 'transport' },

        // Mumbai Major Locations
        { name: 'Mumbai Central Railway Station', coords: '18.9690,72.8205', type: 'transport' },
        { name: 'Chhatrapati Shivaji Terminus (CST)', coords: '18.9398,72.8355', type: 'transport' },
        { name: 'Bandra West, Mumbai', coords: '19.0596,72.8295', type: 'area' },
        { name: 'Andheri East, Mumbai', coords: '19.1136,72.8697', type: 'area' },
        { name: 'Mumbai Airport (BOM)', coords: '19.0896,72.8656', type: 'transport' },

        // Pune Major Locations
        { name: 'Pune Railway Station', coords: '18.5314,73.8447', type: 'transport' },
        { name: 'Shivajinagar, Pune', coords: '18.5304,73.8567', type: 'area' },
        { name: 'Koregaon Park, Pune', coords: '18.5362,73.8980', type: 'area' },
        { name: 'Pune Airport', coords: '18.5821,73.9197', type: 'transport' },

        // Other Major Cities
        { name: 'Aurangabad Railway Station', coords: '19.8762,75.3433', type: 'transport' },
        { name: 'Nagpur Railway Station', coords: '21.1458,79.0882', type: 'transport' },
        { name: 'Shirdi Sai Baba Temple', coords: '19.7645,74.4769', type: 'religious' },
        { name: 'Lonavala Hill Station', coords: '18.7537,73.4068', type: 'tourist' },
        { name: 'Mahabaleshwar Hill Station', coords: '17.9220,73.6581', type: 'tourist' }
    ];

    return allLocations.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
}

function getPopularLocations(query) {
    const popular = [
        { name: '🏛️ Nashik Road Station → Most Popular', coords: '19.9615,73.7926', type: 'popular' },
        { name: '🎓 Sandip University → Trending', coords: '19.9640, 73.6670', type: 'popular' },
        { name: '🛣️ Mumbai Highway → Fastest Route', coords: '18.9690,72.8205', type: 'popular' },
        { name: '🏔️ Shirdi Temple → Spiritual Journey', coords: '19.7645,74.4769', type: 'popular' },
        { name: '✈️ Mumbai Airport → International', coords: '19.0896,72.8656', type: 'popular' }
    ];

    return popular.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);
}

function displaySuggestions(suggestions, type) {
    const container = document.getElementById(type === 'start' ? 'startSuggestions' : 'destSuggestions');

    if (suggestions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = suggestions.map(suggestion => {
        const icon = getLocationIcon(suggestion.type || 'area');
        const badge = getLocationBadge(suggestion.type || 'area');
        return `<div class="suggestion-item" onclick="selectLocation('${suggestion.name}', '${suggestion.coords}', '${type}')">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <i class="${icon}" style="margin-right: 10px; width: 16px;"></i>
                    <span>${suggestion.name}</span>
                </div>
                <span class="location-badge ${badge.class}">${badge.text}</span>
            </div>
        </div>`;
    }).join('');
}

function getLocationIcon(type) {
    const icons = {
        highway: 'fas fa-road',
        transport: 'fas fa-train',
        education: 'fas fa-graduation-cap',
        religious: 'fas fa-place-of-worship',
        tourist: 'fas fa-mountain',
        industrial: 'fas fa-industry',
        military: 'fas fa-shield-alt',
        area: 'fas fa-map-marker-alt',
        popular: 'fas fa-star'
    };
    return icons[type] || 'fas fa-map-marker-alt';
}

function getLocationBadge(type) {
    const badges = {
        highway: { text: 'Highway', class: 'badge-highway' },
        transport: { text: 'Transport', class: 'badge-transport' },
        education: { text: 'University', class: 'badge-education' },
        religious: { text: 'Temple', class: 'badge-religious' },
        tourist: { text: 'Tourist', class: 'badge-tourist' },
        industrial: { text: 'Industrial', class: 'badge-industrial' },
        military: { text: 'Military', class: 'badge-military' },
        popular: { text: 'Popular', class: 'badge-popular' },
        area: { text: 'Area', class: 'badge-area' }
    };
    return badges[type] || { text: 'Location', class: 'badge-default' };
}

function selectLocation(name, coords, type) {
    const input = document.getElementById(type === 'start' ? 'startLocation' : 'destination');
    input.value = name;
    input.dataset.coords = coords;
    document.getElementById(type === 'start' ? 'startSuggestions' : 'destSuggestions').innerHTML = '';
}

function useCurrentLocationStart() {
    getCurrentLocation().then(coords => {
        const input = document.getElementById('startLocation');
        input.value = 'Current Location';
        input.dataset.coords = coords.join(',');
        showNotification('Current location set as start point!', 'success');
    }).catch(() => {
        showNotification('Failed to get current location', 'error');
    });
}

function showSafeRoutes() {
    const startInput = document.getElementById('startLocation');
    const destInput = document.getElementById('destination');

    const startCoords = startInput.dataset.coords || parseLocationInput(startInput.value);
    const destCoords = destInput.dataset.coords || parseLocationInput(destInput.value);

    if (!startCoords || !destCoords) {
        showNotification('Please select valid start and destination locations', 'warning');
        return;
    }

    closeRoutePopup();
    displayRoutes(startCoords.split(',').map(Number), destCoords.split(',').map(Number));
}

function parseLocationInput(input) {
    const coordPattern = /^-?\d+\.\d+,-?\d+\.\d+$/;
    if (coordPattern.test(input)) {
        return input;
    }
    return null;
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => resolve([position.coords.latitude, position.coords.longitude]),
                () => reject()
            );
        } else {
            reject();
        }
    });
}

function displayRoutes(start, dest) {
    const button = document.getElementById('safeRoutes');
    button.classList.add('active');
    button.innerHTML = '<i class="fas fa-route"></i> Hide Routes';

    const distance = calculateDistance({ lat: start[0], lng: start[1] }, { lat: dest[0], lng: dest[1] });
    const routeCoords = generateRoadBasedRoute(start, dest);
    const routeName = getRouteName(start, dest);

    clearAllRoutes();
    window.currentRoutes = [];

    // Draw road-based route with proper waypoints
    drawRoadRoute(routeCoords, routeName, distance);

    showNotification(`Route found via roads: ${routeName}`, 'success');
}

function drawRoadRoute(routeCoords, routeName, distance) {
    // Use Leaflet Routing Machine for proper road routing
    const routingControl = L.Routing.control({
        waypoints: [
            L.latLng(routeCoords[0][0], routeCoords[0][1]),
            L.latLng(routeCoords[routeCoords.length - 1][0], routeCoords[routeCoords.length - 1][1])
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: function () { return null; }, // Don't create default markers
        lineOptions: {
            styles: [{
                color: '#2563eb',
                weight: 6,
                opacity: 0.8
            }]
        },
        show: false, // Hide the instruction panel
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
        })
    }).addTo(map);

    // Add custom markers
    addRoadMarkers([routeCoords[0], routeCoords[routeCoords.length - 1]], routeName);

    // Calculate realistic travel time
    const travelTime = calculateRoadTravelTime(distance, routeCoords);
    const highwayName = getBestHighwayName(routeCoords[0], routeCoords[routeCoords.length - 1]);

    // Add popup to the route when it's created
    routingControl.on('routesfound', function (e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const actualDistance = (summary.totalDistance / 1000).toFixed(1);
        const actualTime = Math.round(summary.totalTime / 60);

        // Create popup for the route - no close button
        const popup = L.popup({
            closeButton: false,
            autoClose: false
        }).setContent(`
            <div style="min-width: 180px;">
                📏 Distance: <b>${actualDistance} km</b><br>
                ⏱️ Travel time: <b>${actualTime} min</b><br>
                🛣️ Via: <b>Roads & Highways</b>
            </div>
        `);

        // Show popup at the midpoint of the route
        const midpoint = routes[0].coordinates[Math.floor(routes[0].coordinates.length / 2)];
        popup.setLatLng([midpoint.lat, midpoint.lng]).openOn(map);
    });

    window.currentRoutes.push(routingControl);
}

function addRoadMarkers(routeCoords, routeName) {
    // Add start marker
    const startMarker = L.marker(routeCoords[0], {
        icon: L.divIcon({
            className: 'route-marker start-marker',
            html: '<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">START</div>',
            iconSize: [50, 20],
            iconAnchor: [25, 10]
        })
    }).addTo(map);

    // Add end marker
    const endMarker = L.marker(routeCoords[routeCoords.length - 1], {
        icon: L.divIcon({
            className: 'route-marker end-marker',
            html: '<div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">END</div>',
            iconSize: [40, 20],
            iconAnchor: [20, 10]
        })
    }).addTo(map);

    // Add waypoint markers for major junctions
    const waypoints = routeCoords.slice(1, -1);
    waypoints.forEach((point, index) => {
        if (index % 2 === 0) { // Show every other waypoint to avoid clutter
            const waypointMarker = L.marker(point, {
                icon: L.divIcon({
                    className: 'route-marker waypoint-marker',
                    html: '<div style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 50%; font-size: 10px; font-weight: bold;">' + (index + 1) + '</div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);

            window.currentRoutes.push(waypointMarker);
        }
    });

    window.currentRoutes.push(startMarker, endMarker);
}

function calculateRoadTravelTime(distance, routeCoords) {
    // Calculate realistic travel time based on road type and distance
    let avgSpeed = 50; // km/h default

    // Adjust speed based on route characteristics
    if (distance > 100) avgSpeed = 70; // Highway speeds for long distance
    else if (distance < 20) avgSpeed = 35; // City speeds for short distance

    const timeHours = distance / avgSpeed;
    const timeMinutes = Math.ceil(timeHours * 60);

    if (timeMinutes < 60) {
        return `${timeMinutes} min`;
    } else {
        const hours = Math.floor(timeMinutes / 60);
        const mins = timeMinutes % 60;
        return `${hours}h ${mins}m`;
    }
}

function getRouteName(start, dest) {
    const startName = getLocationName(start);
    const destName = getLocationName(dest);
    return `${startName} to ${destName}`;
}

function getLocationName(coords) {
    const lat = coords[0], lng = coords[1];

    // Match coordinates to location names
    if (Math.abs(lat - 19.9615) < 0.01 && Math.abs(lng - 73.7926) < 0.01) return 'Nashik Road';
    if (Math.abs(lat - 19.9307) < 0.01 && Math.abs(lng - 73.7314) < 0.01) return 'Sandip University';
    if (Math.abs(lat - 19.9975) < 0.01 && Math.abs(lng - 73.7898) < 0.01) return 'Nashik Central';
    if (Math.abs(lat - 18.9690) < 0.01 && Math.abs(lng - 72.8205) < 0.01) return 'Mumbai Central';
    if (Math.abs(lat - 18.5314) < 0.01 && Math.abs(lng - 73.8447) < 0.01) return 'Pune Station';

    return 'Selected Location';
}

function getBestHighwayName(start, dest) {
    const startLat = start[0], startLng = start[1];
    const destLat = dest[0], destLng = dest[1];

    // Determine highway based on coordinates
    if (destLat < 19.5) return 'NH-50 (Nashik-Pune Highway)';
    if (destLng < 73.5) return 'NH-60 (Mumbai-Nashik Highway)';
    if (destLat > 20.5) return 'NH-222 (Nashik-Aurangabad Highway)';
    if (destLng > 74.5) return 'SH-44 (Nashik-Shirdi Highway)';
    return 'Local Safe Roads';
}

function generateRoadBasedRoute(start, dest) {
    // Return simple start and end points - routing machine will handle the road calculation
    return [start, dest];
}

function calculateRoadWaypoints(start, dest) {
    const startLat = start[0], startLng = start[1];
    const destLat = dest[0], destLng = dest[1];

    // Find best highway/road route between points
    const bestRoute = findBestRoadRoute(start, dest);

    if (bestRoute.length > 0) {
        return bestRoute;
    }

    // Fallback: generate road-following waypoints
    const roadPoints = [start];
    const steps = 8; // More waypoints for smoother roads

    for (let i = 1; i < steps; i++) {
        const ratio = i / steps;
        let lat = startLat + (destLat - startLat) * ratio;
        let lng = startLng + (destLng - startLng) * ratio;

        // Apply road curvature and snap to road network
        const roadPoint = snapToNearestRoad(lat, lng, start, dest, ratio);
        roadPoints.push(roadPoint);
    }

    roadPoints.push(dest);
    return roadPoints;
}

function snapToNearestRoad(lat, lng, start, dest, ratio) {
    // Comprehensive road network with major highways and roads
    const roadNetwork = [
        // Major Highways
        [19.9975, 73.7898], // Nashik Central
        [19.9615, 73.7926], // Nashik Road
        [19.9307, 73.7314], // Cidco
        [20.0123, 73.7456], // Gangapur Road
        [19.9456, 73.8234], // Deolali
        [20.0456, 73.7123], // Satpur
        [18.9690, 72.8205], // Mumbai Central
        [18.5314, 73.8447], // Pune Station
        [19.8762, 75.3433], // Aurangabad
        [19.7645, 74.4769], // Shirdi

        // Highway Junctions
        [19.5000, 73.2000], // NH-50 Junction
        [19.2000, 72.9000], // Mumbai-Nashik Highway
        [20.2000, 74.0000], // Aurangabad Highway
        [19.0000, 73.5000], // Pune-Nashik Route

        // International Routes (for long distance)
        [28.6139, 77.2090], // Delhi
        [22.5726, 88.3639], // Kolkata
        [13.0827, 80.2707], // Chennai
        [12.9716, 77.5946], // Bangalore
        [23.0225, 72.5714], // Ahmedabad
    ];

    // Find nearest road point with distance weighting
    let nearest = [lat, lng];
    let minDistance = Infinity;

    roadNetwork.forEach(road => {
        const distance = Math.sqrt(Math.pow(lat - road[0], 2) + Math.pow(lng - road[1], 2));
        if (distance < minDistance) {
            minDistance = distance;
            // Create natural road curve based on ratio
            const curveFactor = Math.sin(ratio * Math.PI) * 0.002; // Add road curvature
            nearest = [
                lat * 0.6 + road[0] * 0.4 + curveFactor,
                lng * 0.6 + road[1] * 0.4 + curveFactor
            ];
        }
    });

    return nearest;
}

function findBestRoadRoute(start, dest) {
    // Major highway routes for common destinations
    const highways = {
        'nashik-mumbai': [
            [19.9975, 73.7898], // Nashik
            [19.8000, 73.5000], // Highway point 1
            [19.5000, 73.2000], // Highway point 2
            [19.2000, 72.9000], // Highway point 3
            [18.9690, 72.8205]  // Mumbai
        ],
        'nashik-pune': [
            [19.9975, 73.7898], // Nashik
            [19.7000, 73.7000], // Highway point 1
            [19.4000, 73.6000], // Highway point 2
            [19.0000, 73.5000], // Highway point 3
            [18.5314, 73.8447]  // Pune
        ],
        'nashik-aurangabad': [
            [19.9975, 73.7898], // Nashik
            [20.1000, 74.2000], // Highway point 1
            [20.3000, 74.6000], // Highway point 2
            [19.8762, 75.3433]  // Aurangabad
        ],
        'mumbai-pune': [
            [18.9690, 72.8205], // Mumbai
            [18.8000, 73.0000], // Expressway point 1
            [18.7000, 73.3000], // Expressway point 2
            [18.6000, 73.6000], // Expressway point 3
            [18.5314, 73.8447]  // Pune
        ]
    };

    // Determine which highway route to use based on start/dest proximity
    const routeKey = determineHighwayRoute(start, dest);
    if (routeKey && highways[routeKey]) {
        return highways[routeKey];
    }

    return [];
}

function determineHighwayRoute(start, dest) {
    const startLat = start[0], startLng = start[1];
    const destLat = dest[0], destLng = dest[1];

    // Check for common routes
    if (isNearLocation(start, [19.9975, 73.7898]) && isNearLocation(dest, [18.9690, 72.8205])) {
        return 'nashik-mumbai';
    }
    if (isNearLocation(start, [19.9975, 73.7898]) && isNearLocation(dest, [18.5314, 73.8447])) {
        return 'nashik-pune';
    }
    if (isNearLocation(start, [19.9975, 73.7898]) && isNearLocation(dest, [19.8762, 75.3433])) {
        return 'nashik-aurangabad';
    }
    if (isNearLocation(start, [18.9690, 72.8205]) && isNearLocation(dest, [18.5314, 73.8447])) {
        return 'mumbai-pune';
    }

    return null;
}

function isNearLocation(point, target, threshold = 0.5) {
    const distance = Math.sqrt(Math.pow(point[0] - target[0], 2) + Math.pow(point[1] - target[1], 2));
    return distance < threshold;
}

function findBestHighway(start, dest, highways) {
    // Find highway that best connects start and destination
    let bestRoute = [];
    let minTotalDistance = Infinity;

    Object.values(highways).forEach(highway => {
        const totalDistance = calculateHighwayDistance(start, dest, highway);
        if (totalDistance < minTotalDistance) {
            minTotalDistance = totalDistance;
            bestRoute = highway;
        }
    });

    return bestRoute;
}

function findSafestHighway(start, dest, highways) {
    // Prefer well-maintained highways (NH over SH)
    const nationalHighways = Object.entries(highways)
        .filter(([name]) => name.startsWith('NH'))
        .map(([, route]) => route);

    return findBestHighway(start, dest, Object.fromEntries(
        Object.entries(highways).filter(([name]) => name.startsWith('NH'))
    )) || Object.values(highways)[0];
}

function calculateHighwayDistance(start, dest, highway) {
    let totalDistance = calculateDistance({ lat: start[0], lng: start[1] }, { lat: highway[0][0], lng: highway[0][1] });

    for (let i = 0; i < highway.length - 1; i++) {
        totalDistance += calculateDistance(
            { lat: highway[i][0], lng: highway[i][1] },
            { lat: highway[i + 1][0], lng: highway[i + 1][1] }
        );
    }

    totalDistance += calculateDistance(
        { lat: highway[highway.length - 1][0], lng: highway[highway.length - 1][1] },
        { lat: dest[0], lng: dest[1] }
    );

    return totalDistance;
}

function findNearestRoad(point, roads) {
    let nearest = roads[0];
    let minDistance = calculateDistance({ lat: point[0], lng: point[1] }, { lat: nearest[0], lng: nearest[1] });

    roads.forEach(road => {
        const distance = calculateDistance({ lat: point[0], lng: point[1] }, { lat: road[0], lng: road[1] });
        if (distance < minDistance) {
            minDistance = distance;
            nearest = road;
        }
    });

    return nearest;
}

function getRouteDescription(type) {
    switch (type) {
        case 'fastest': return '🏁 Express highways with minimal stops - Perfect for time-sensitive travel';
        case 'scenic': return '🌲 Beautiful landscapes and tourist attractions - Enjoy the journey';
        case 'safe': return '🛡️ Well-maintained roads with excellent safety records';
        default: return 'Optimized route for your journey';
    }
}

function clearAllRoutes() {
    if (window.currentRoutes) {
        window.currentRoutes.forEach(route => {
            if (route.remove) {
                route.remove(); // For routing control
            } else {
                map.removeLayer(route); // For regular layers
            }
        });
        window.currentRoutes = [];
    }
    if (window.currentRoute) {
        if (window.currentRoute.remove) {
            window.currentRoute.remove();
        } else {
            map.removeLayer(window.currentRoute);
        }
        window.currentRoute = null;
    }
}

// =============== SAFE ROUTES MODAL FUNCTIONS ===============
let safeRoutesModal = null;
let pickingStart = false;
let pickingDest = false;
let startMarker = null;
let destMarker = null;
let currentRouteLayer = null;

function showSafeRoutesModal() {
    safeRoutesModal = document.getElementById('safeRoutesModal');
    if (safeRoutesModal) {
        safeRoutesModal.classList.remove('hidden');
        // Reset form
        clearSafeRoutesForm();
    }
}

function hideSafeRoutesModal() {
    const modal = document.getElementById('safeRoutesModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Also handle the global variable if it exists
    if (safeRoutesModal) {
        safeRoutesModal.classList.add('hidden');
    }
    // Clear any picking state
    pickingStart = false;
    pickingDest = false;
    if (map) {
        map.off('click', handleMapClick);
    }
}

function clearSafeRoutesDropdowns() {
    const startInput = document.getElementById('srStart');
    const destInput = document.getElementById('srDest');

    if (startInput) startInput.value = '';
    if (destInput) destInput.value = '';

    // Hide suggestions
    document.getElementById('startSuggestions').style.display = 'none';
    document.getElementById('destSuggestions').style.display = 'none';

    showNotification('Safe routes form cleared!', 'info');
}

// Auto-suggest functionality
function setupAutoSuggest() {
    console.log('Setting up auto-suggest...');

    const startInput = document.getElementById('srStart');
    const destInput = document.getElementById('srDest');
    const gpsBtn = document.getElementById('useGpsBtn');

    console.log('Elements found:', { startInput: !!startInput, destInput: !!destInput, gpsBtn: !!gpsBtn });

    if (startInput) {
        // Remove existing listeners
        startInput.removeEventListener('input', handleStartInput);
        startInput.removeEventListener('focus', handleStartFocus); // This was a typo, should be handleStartFocus

        // Add new listeners
        startInput.addEventListener('input', handleStartInput);
        startInput.addEventListener('focus', handleStartFocus);
    }

    if (destInput) {
        // Remove existing listeners
        destInput.removeEventListener('input', handleDestInput); // This was a typo, should be handleDestInput
        destInput.removeEventListener('focus', handleDestFocus);

        // Add new listeners
        destInput.addEventListener('input', handleDestInput);
        destInput.addEventListener('focus', handleDestFocus);
    }

    if (gpsBtn) {
        gpsBtn.onclick = function () {
            const startInput = document.getElementById('srStart');

            gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting...';
            gpsBtn.disabled = true;

            // Use shared promise-based helper to get current location
            getCurrentLocation().then(coords => {
                if (startInput) {
                    const lat = coords[0].toFixed(4);
                    const lng = coords[1].toFixed(4);
                    startInput.value = `Current Location (${lat}, ${lng})`;
                    startInput.dataset.coords = `${coords[0]},${coords[1]}`;
                }
                gpsBtn.innerHTML = '📱 Location Set';
                gpsBtn.disabled = false;
                showNotification('Current location detected and set as starting point!', 'success');
            }).catch(err => {
                gpsBtn.innerHTML = '📱 Use GPS';
                gpsBtn.disabled = false;
                let message = 'An error occurred while getting your location.';
                if (err && err.code) {
                    switch (err.code) {
                        case 1:
                            message = 'You denied the request for Geolocation. Please enable it in your browser settings.';
                            break;
                        case 2:
                            message = 'Location information is unavailable.';
                            break;
                        case 3:
                            message = 'The request to get user location timed out.';
                            break;
                        default:
                            message = 'An unknown error occurred.';
                            break;
                    }
                }
                showNotification(message, 'error');
            });
        };
    }
}

function handleStartInput() {
    console.log('Start input changed:', this.value);
    showSuggestions(this.value, 'start');
}

function handleStartFocus() {
    if (this.value) showSuggestions(this.value, 'start');
}

function handleDestInput() {
    console.log('Dest input changed:', this.value);
    showSuggestions(this.value, 'dest');
}

function handleDestFocus() {
    if (this.value) showSuggestions(this.value, 'dest');
}

function showSuggestions(query, type) {
    console.log('Showing suggestions for:', query, type);

    const container = document.getElementById(type + 'Suggestions');
    console.log('Container found:', !!container);

    if (!container) return;

    if (!query || query.length < 1) {
        container.style.display = 'none';
        return;
    }

    const locations = getLocationSuggestions(query);
    console.log('Locations found:', locations.length);

    if (locations.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = locations.map(loc =>
        `<div class="suggestion-item" onclick="selectSuggestion('${loc.name}', '${type}')" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #4b5563; color: #f8fafc; font-size: 0.9rem;">
            ${loc.icon} ${loc.name}
        </div>`
    ).join('');

    container.style.display = 'block';
    console.log('Suggestions displayed');
}

function selectSuggestion(locationName, type) {
    console.log('Selecting suggestion:', locationName, type);

    const input = document.getElementById(type === 'start' ? 'srStart' : 'srDest');
    if (input) {
        input.value = locationName;
    }

    const container = document.getElementById(type + 'Suggestions');
    if (container) {
        container.style.display = 'none';
    }
}

function getLocationSuggestions(query) {
    const locations = [
        // Major Indian Cities
        { name: 'Mumbai, Maharashtra', icon: '🏙️', coords: [19.0760, 72.8777] },
        { name: "Nandurbar, Maharashtra", icon: '🏙️', coords: [21.3667, 74.2500], },
        { name: 'New Delhi, Delhi', icon: '🏛️', coords: [28.6139, 77.2090] },
        { name: 'Bangalore, Karnataka', icon: '🌆', coords: [12.9716, 77.5946] },
        { name: 'Chennai, Tamil Nadu', icon: '🏛️', coords: [13.0827, 80.2707] },
        { name: 'Kolkata, West Bengal', icon: '🏛️', coords: [22.5726, 88.3639] },
        { name: 'Hyderabad, Telangana', icon: '🏛️', coords: [17.3850, 78.4867] },
        { name: 'Pune, Maharashtra', icon: '🏛️', coords: [18.5204, 73.8567] },
        { name: 'Ahmedabad, Gujarat', icon: '🏛️', coords: [23.0225, 72.5714] },
        { name: 'Jaipur, Rajasthan', icon: '🏛️', coords: [26.9124, 75.7873] },
        { name: 'Surat, Gujarat', icon: '🏭', coords: [21.1702, 72.8311] },
        { name: 'Lucknow, Uttar Pradesh', icon: '🏛️', coords: [26.8467, 80.9462] },
        { name: 'Kanpur, Uttar Pradesh', icon: '🏭', coords: [26.4499, 80.3319] },
        { name: 'Nagpur, Maharashtra', icon: '🏛️', coords: [21.1458, 79.0882] },
        { name: 'Indore, Madhya Pradesh', icon: '🏛️', coords: [22.7196, 75.8577] },
        { name: 'Thane, Maharashtra', icon: '🏙️', coords: [19.2183, 72.9781] },
        { name: 'Bhopal, Madhya Pradesh', icon: '🏛️', coords: [23.2599, 77.4126] },
        { name: 'Visakhapatnam, Andhra Pradesh', icon: '🏖️', coords: [17.6868, 83.2185] },
        { name: 'Pimpri-Chinchwad, Maharashtra', icon: '🏭', coords: [18.6298, 73.7997] },
        { name: 'Patna, Bihar', icon: '🏛️', coords: [25.5941, 85.1376] },
        { name: 'Vadodara, Gujarat', icon: '🏛️', coords: [22.3072, 73.1812] },
        { name: 'Ludhiana, Punjab', icon: '🏭', coords: [30.9010, 75.8573] },
        { name: 'Agra, Uttar Pradesh', icon: '🕌', coords: [27.1767, 78.0081] },
        { name: 'Nashik, Maharashtra', icon: '🏛️', coords: [19.9975, 73.7898] },
        { name: 'Faridabad, Haryana', icon: '🏭', coords: [28.4089, 77.3178] },
        { name: 'Meerut, Uttar Pradesh', icon: '🏛️', coords: [28.9845, 77.7064] },
        { name: 'Rajkot, Gujarat', icon: '🏛️', coords: [22.3039, 70.8022] },
        { name: 'Kalyan-Dombivli, Maharashtra', icon: '🏙️', coords: [19.2403, 73.1305] },
        { name: 'Vasai-Virar, Maharashtra', icon: '🏙️', coords: [19.4912, 72.8054] },
        { name: 'Varanasi, Uttar Pradesh', icon: '🛕', coords: [25.3176, 82.9739] },
        { name: 'Srinagar, Jammu and Kashmir', icon: '🏔️', coords: [34.0837, 74.7973] },
        { name: 'Aurangabad, Maharashtra', icon: '🏛️', coords: [19.8762, 75.3433] },
        { name: 'Dhanbad, Jharkhand', icon: '⛏️', coords: [23.7957, 86.4304] },
        { name: 'Amritsar, Punjab', icon: '🛕', coords: [31.6340, 74.8723] },
        { name: 'Navi Mumbai, Maharashtra', icon: '🏙️', coords: [19.0330, 73.0297] },
        { name: 'Allahabad, Uttar Pradesh', icon: '🛕', coords: [25.4358, 81.8463] },
        { name: 'Ranchi, Jharkhand', icon: '🏛️', coords: [23.3441, 85.3096] },
        { name: 'Howrah, West Bengal', icon: '🏭', coords: [22.5958, 88.2636] },
        { name: 'Coimbatore, Tamil Nadu', icon: '🏭', coords: [11.0168, 76.9558] },
        { name: 'Jabalpur, Madhya Pradesh', icon: '🏛️', coords: [23.1815, 79.9864] },
        { name: 'Gwalior, Madhya Pradesh', icon: '🏰', coords: [26.2183, 78.1828] },
        { name: 'Vijayawada, Andhra Pradesh', icon: '🏛️', coords: [16.5062, 80.6480] },
        { name: 'Jodhpur, Rajasthan', icon: '🏰', coords: [26.2389, 73.0243] },
        { name: 'Madurai, Tamil Nadu', icon: '🛕', coords: [9.9252, 78.1198] },
        { name: 'Raipur, Chhattisgarh', icon: '🏛️', coords: [21.2514, 81.6296] },
        { name: 'Kota, Rajasthan', icon: '🏛️', coords: [25.2138, 75.8648] },
        { name: 'Chandigarh, Punjab', icon: '🏛️', coords: [30.7333, 76.7794] },
        { name: 'Guwahati, Assam', icon: '🏛️', coords: [26.1445, 91.7362] },
        { name: 'Solapur, Maharashtra', icon: '🏛️', coords: [17.6599, 75.9064] },
        { name: 'Hubli-Dharwad, Karnataka', icon: '🏛️', coords: [15.3647, 75.1240] },
        { name: 'Bareilly, Uttar Pradesh', icon: '🏛️', coords: [28.3670, 79.4304] },
        { name: 'Moradabad, Uttar Pradesh', icon: '🏛️', coords: [28.8386, 78.7733] },
        { name: 'Mysore, Karnataka', icon: '🏰', coords: [12.2958, 76.6394] },
        { name: 'Gurgaon, Haryana', icon: '🏙️', coords: [28.4595, 77.0266] },
        { name: 'Aligarh, Uttar Pradesh', icon: '🏛️', coords: [27.8974, 78.0880] },
        { name: 'Jalandhar, Punjab', icon: '🏛️', coords: [31.3260, 75.5762] },
        { name: 'Tiruchirappalli, Tamil Nadu', icon: '🏛️', coords: [10.7905, 78.7047] },
        { name: 'Bhubaneswar, Odisha', icon: '🏛️', coords: [20.2961, 85.8245] },
        { name: 'Salem, Tamil Nadu', icon: '🏛️', coords: [11.6643, 78.1460] },
        { name: 'Warangal, Telangana', icon: '🏛️', coords: [17.9689, 79.5941] },
        { name: 'Mira-Bhayandar, Maharashtra', icon: '🏙️', coords: [19.2952, 72.8544] },
        { name: 'Thiruvananthapuram, Kerala', icon: '🏛️', coords: [8.5241, 76.9366] },
        { name: 'Bhiwandi, Maharashtra', icon: '🏭', coords: [19.3002, 73.0635] },
        { name: 'Saharanpur, Uttar Pradesh', icon: '🏛️', coords: [29.9680, 77.5552] },
        { name: 'Guntur, Andhra Pradesh', icon: '🏛️', coords: [16.3067, 80.4365] },
        { name: 'Amravati, Maharashtra', icon: '🏛️', coords: [20.9374, 77.7796] },
        { name: 'Bikaner, Rajasthan', icon: '🏰', coords: [28.0229, 73.3119] },
        { name: 'Noida, Uttar Pradesh', icon: '🏙️', coords: [28.5355, 77.3910] },
        { name: 'Jamshedpur, Jharkhand', icon: '🏭', coords: [22.8046, 86.2029] },
        { name: 'Bhilai Nagar, Chhattisgarh', icon: '🏭', coords: [21.1938, 81.3509] },
        { name: 'Cuttack, Odisha', icon: '🏛️', coords: [20.4625, 85.8828] },
        { name: 'Firozabad, Uttar Pradesh', icon: '🏭', coords: [27.1592, 78.3957] },
        { name: 'Kochi, Kerala', icon: '🏖️', coords: [9.9312, 76.2673] },
        { name: 'Bhavnagar, Gujarat', icon: '🏛️', coords: [21.7645, 72.1519] },
        { name: 'Dehradun, Uttarakhand', icon: '🏔️', coords: [30.3165, 78.0322] },
        { name: 'Durgapur, West Bengal', icon: '🏭', coords: [23.5204, 87.3119] },
        { name: 'Asansol, West Bengal', icon: '🏭', coords: [23.6739, 86.9524] },
        { name: 'Nanded, Maharashtra', icon: '🏛️', coords: [19.1383, 77.2975] },
        { name: 'Kolhapur, Maharashtra', icon: '🏛️', coords: [16.7050, 74.2433] },
        { name: 'Ajmer, Rajasthan', icon: '🛕', coords: [26.4499, 74.6399] },
        { name: 'Akola, Maharashtra', icon: '🏛️', coords: [20.7002, 77.0082] },
        { name: 'Gulbarga, Karnataka', icon: '🏛️', coords: [17.3297, 76.8343] },
        { name: 'Jamnagar, Gujarat', icon: '🏛️', coords: [22.4707, 70.0577] },
        { name: 'Ujjain, Madhya Pradesh', icon: '🛕', coords: [23.1765, 75.7885] },
        { name: 'Loni, Uttar Pradesh', icon: '🏛️', coords: [28.7506, 77.2897] },
        { name: 'Siliguri, West Bengal', icon: '🏛️', coords: [26.7271, 88.3953] },
        { name: 'Jhansi, Uttar Pradesh', icon: '🏰', coords: [25.4484, 78.5685] },
        { name: 'Ulhasnagar, Maharashtra', icon: '🏙️', coords: [19.2215, 73.1645] },
        { name: 'Jammu, Jammu and Kashmir', icon: '🏔️', coords: [32.7266, 74.8570] },
        { name: 'Sangli-Miraj & Kupwad, Maharashtra', icon: '🏛️', coords: [16.8524, 74.5815] },
        { name: 'Mangalore, Karnataka', icon: '🏖️', coords: [12.9141, 74.8560] },
        { name: 'Erode, Tamil Nadu', icon: '🏛️', coords: [11.3410, 77.7172] },
        { name: 'Belgaum, Karnataka', icon: '🏛️', coords: [15.8497, 74.4977] },
        { name: 'Ambattur, Tamil Nadu', icon: '🏭', coords: [13.1143, 80.1548] },
        { name: 'Tirunelveli, Tamil Nadu', icon: '🏛️', coords: [8.7139, 77.7567] },
        { name: 'Malegaon, Maharashtra', icon: '🏛️', coords: [20.5579, 74.5287] },
        { name: 'Gaya, Bihar', icon: '🛕', coords: [24.7914, 85.0002] },
        { name: 'Jalgaon, Maharashtra', icon: '🏛️', coords: [21.0077, 75.5626] },
        { name: 'Udaipur, Rajasthan', icon: '🏰', coords: [24.5854, 73.7125] },
        { name: 'Maheshtala, West Bengal', icon: '🏙️', coords: [22.5093, 88.2482] },

        // Nashik Area (Comprehensive)
        { name: 'Nashik Central', icon: '🏛️', coords: [19.9975, 73.7898] },
        { name: 'Nashik Road Railway Station', icon: '🚂', coords: [19.9615, 73.7926] },
        { name: 'Sandip University, Nashik', icon: '🎓', coords: [19.9640, 73.6670] },
        { name: 'Gangapur Road, Nashik', icon: '🛣️', coords: [20.0123, 73.7456] },
        { name: 'Deolali Camp, Nashik', icon: '⛺', coords: [19.9456, 73.8234] },
        { name: 'Satpur MIDC, Nashik', icon: '🏭', coords: [20.0456, 73.7123] },
        { name: 'Panchavati, Nashik', icon: '🛕', coords: [19.9990, 73.7910] },
        { name: 'Nashik Airport (Ozar)', icon: '✈️', coords: [20.1117, 73.9131] },
        { name: 'College Road, Nashik', icon: '🎓', coords: [19.9980, 73.7900] },
        { name: 'MG Road, Nashik', icon: '🛣️', coords: [19.9985, 73.7905] },
        { name: 'Cidco Nashik', icon: '🏙️', coords: [19.9307, 73.7314] },
        { name: 'Ambad, Nashik', icon: '🏛️', coords: [20.0234, 73.7567] },
        { name: 'Pathardi Phata, Nashik', icon: '🛣️', coords: [19.9800, 73.7600] },
        { name: 'Trimbakeshwar, Nashik', icon: '🛕', coords: [19.9333, 73.5333] },
        { name: 'Igatpuri, Nashik', icon: '🏔️', coords: [19.6917, 73.5667] },
        { name: 'Sinnar, Nashik', icon: '🏛️', coords: [19.8500, 74.0000] },
        { name: 'Yeola, Nashik', icon: '🏛️', coords: [20.0424, 74.4894] },
        { name: 'Manmad, Nashik', icon: '🚂', coords: [20.2522, 74.4394] },
        { name: 'Kalwan, Nashik', icon: '🏛️', coords: [20.4833, 74.0167] },
        { name: 'Malegaon, Nashik', icon: '🏛️', coords: [20.5579, 74.5287] },

        // International Cities (Major)
        { name: 'New York, USA', icon: '🗽', coords: [40.7128, -74.0060] },
        { name: 'London, UK', icon: '🇬🇧', coords: [51.5074, -0.1278] },
        { name: 'Paris, France', icon: '🗼', coords: [48.8566, 2.3522] },
        { name: 'Tokyo, Japan', icon: '🗾', coords: [35.6762, 139.6503] },
        { name: 'Dubai, UAE', icon: '🏗️', coords: [25.2048, 55.2708] },
        { name: 'Singapore', icon: '🏙️', coords: [1.3521, 103.8198] },
        { name: 'Sydney, Australia', icon: '🇦🇺', coords: [-33.8688, 151.2093] },
        { name: 'Los Angeles, USA', icon: '🌴', coords: [34.0522, -118.2437] },
        { name: 'Toronto, Canada', icon: '🍁', coords: [43.6532, -79.3832] },
        { name: 'Berlin, Germany', icon: '🇩🇪', coords: [52.5200, 13.4050] },
        { name: 'Moscow, Russia', icon: '🇷🇺', coords: [55.7558, 37.6176] },
        { name: 'Beijing, China', icon: '🇨🇳', coords: [39.9042, 116.4074] },
        { name: 'Shanghai, China', icon: '🏙️', coords: [31.2304, 121.4737] },
        { name: 'Hong Kong', icon: '🏙️', coords: [22.3193, 114.1694] },
        { name: 'Seoul, South Korea', icon: '🇰🇷', coords: [37.5665, 126.9780] },
        { name: 'Bangkok, Thailand', icon: '🇹🇭', coords: [13.7563, 100.5018] },
        { name: 'Kuala Lumpur, Malaysia', icon: '🇲🇾', coords: [3.1390, 101.6869] },
        { name: 'Jakarta, Indonesia', icon: '🇮🇩', coords: [-6.2088, 106.8456] },
        { name: 'Manila, Philippines', icon: '🇵🇭', coords: [14.5995, 120.9842] },
        { name: 'Istanbul, Turkey', icon: '🇹🇷', coords: [41.0082, 28.9784] },
        { name: 'Cairo, Egypt', icon: '🇪🇬', coords: [30.0444, 31.2357] },
        { name: 'Lagos, Nigeria', icon: '🇳🇬', coords: [6.5244, 3.3792] },
        { name: 'São Paulo, Brazil', icon: '🇧🇷', coords: [-23.5558, -46.6396] },
        { name: 'Mexico City, Mexico', icon: '🇲🇽', coords: [19.4326, -99.1332] },
        { name: 'Buenos Aires, Argentina', icon: '🇦🇷', coords: [-34.6118, -58.3960] },

        // Popular Tourist Destinations
        { name: 'Shirdi Sai Baba Temple', icon: '🛕', coords: [19.7645, 74.4769] },
        { name: 'Lonavala Hill Station', icon: '🏔️', coords: [18.7537, 73.4068] },
        { name: 'Mahabaleshwar', icon: '🏔️', coords: [17.9220, 73.6581] },
        { name: 'Goa', icon: '🏖️', coords: [15.2993, 74.1240] },
        { name: 'Ajanta Caves', icon: '🏛️', coords: [20.5519, 75.7033] },
        { name: 'Ellora Caves', icon: '🏛️', coords: [20.0269, 75.1789] },
        { name: 'Rishikesh', icon: '🏔️', coords: [30.0869, 78.2676] },
        { name: 'Haridwar', icon: '🛕', coords: [29.9457, 78.1642] },
        { name: 'Manali', icon: '🏔️', coords: [32.2396, 77.1887] },
        { name: 'Shimla', icon: '🏔️', coords: [31.1048, 77.1734] },
        { name: 'Darjeeling', icon: '🏔️', coords: [27.0360, 88.2627] },
        { name: 'Ooty', icon: '🏔️', coords: [11.4064, 76.6932] },
        { name: 'Kodaikanal', icon: '🏔️', coords: [10.2381, 77.4892] },
        { name: 'Mount Abu', icon: '🏔️', coords: [24.5925, 72.7156] },
        { name: 'Munnar', icon: '🏔️', coords: [10.0889, 77.0595] },
        { name: 'Coorg', icon: '🏔️', coords: [12.3375, 75.8069] },
        { name: 'Hampi', icon: '🏛️', coords: [15.3350, 76.4600] },
        { name: 'Khajuraho', icon: '🏛️', coords: [24.8318, 79.9199] },
        { name: 'Konark', icon: '🏛️', coords: [19.8876, 86.0943] },
        { name: 'Puri', icon: '🛕', coords: [19.8135, 85.8312] },

        // Additional Towns and Cities (End-to-End Coverage)
        { name: 'Satara, Maharashtra', icon: '🏛️', coords: [17.6805, 74.0183] },
        { name: 'Sangli, Maharashtra', icon: '🏛️', coords: [16.8524, 74.5815] },
        { name: 'Ahmednagar, Maharashtra', icon: '🏛️', coords: [19.0948, 74.7480] },
        { name: 'Latur, Maharashtra', icon: '🏛️', coords: [18.4088, 76.5604] },
        { name: 'Osmanabad, Maharashtra', icon: '🏛️', coords: [18.1760, 76.0343] },
        { name: 'Beed, Maharashtra', icon: '🏛️', coords: [18.9894, 75.7585] },
        { name: 'Parbhani, Maharashtra', icon: '🏛️', coords: [19.2608, 76.7734] },
        { name: 'Hingoli, Maharashtra', icon: '🏛️', coords: [19.7147, 77.1547] },
        { name: 'Washim, Maharashtra', icon: '🏛️', coords: [20.1097, 77.1350] },
        { name: 'Buldhana, Maharashtra', icon: '🏛️', coords: [20.5307, 76.1809] },
        { name: 'Yavatmal, Maharashtra', icon: '🏛️', coords: [20.3897, 78.1307] },
        { name: 'Wardha, Maharashtra', icon: '🏛️', coords: [20.7453, 78.6022] },
        { name: 'Chandrapur, Maharashtra', icon: '🏛️', coords: [19.9615, 79.2961] },
        { name: 'Gadchiroli, Maharashtra', icon: '🏛️', coords: [20.1809, 80.0056] },
        { name: 'Gondia, Maharashtra', icon: '🏛️', coords: [21.4522, 80.1955] },
        { name: 'Bhandara, Maharashtra', icon: '🏛️', coords: [21.1704, 79.6552] },
        { name: 'Ratnagiri, Maharashtra', icon: '🏖️', coords: [16.9902, 73.3120] },
        { name: 'Sindhudurg, Maharashtra', icon: '🏖️', coords: [16.0000, 73.5000] },
        { name: 'Raigad, Maharashtra', icon: '🏛️', coords: [18.2367, 73.1840] },

        // Gujarat Cities and Towns
        { name: 'Gandhinagar, Gujarat', icon: '🏛️', coords: [23.2156, 72.6369] },
        { name: 'Anand, Gujarat', icon: '🏛️', coords: [22.5645, 72.9289] },
        { name: 'Bharuch, Gujarat', icon: '🏭', coords: [21.7051, 72.9959] },
        { name: 'Navsari, Gujarat', icon: '🏛️', coords: [20.9463, 72.9270] },
        { name: 'Valsad, Gujarat', icon: '🏛️', coords: [20.5992, 72.9342] },
        { name: 'Junagadh, Gujarat', icon: '🏛️', coords: [21.5222, 70.4579] },
        { name: 'Porbandar, Gujarat', icon: '🏖️', coords: [21.6417, 69.6293] },
        { name: 'Dwarka, Gujarat', icon: '🛕', coords: [22.2394, 68.9678] },
        { name: 'Kutch, Gujarat', icon: '🏜️', coords: [23.7337, 69.8597] },
        { name: 'Mehsana, Gujarat', icon: '🏛️', coords: [23.5880, 72.3693] },
        { name: 'Patan, Gujarat', icon: '🏛️', coords: [23.8502, 72.1262] },
        { name: 'Palanpur, Gujarat', icon: '🏛️', coords: [24.1669, 72.4281] },
        { name: 'Morbi, Gujarat', icon: '🏭', coords: [22.8173, 70.8322] },
        { name: 'Surendranagar, Gujarat', icon: '🏛️', coords: [22.7196, 71.6369] },
        { name: 'Godhra, Gujarat', icon: '🏛️', coords: [22.7756, 73.6135] },
        { name: 'Dahod, Gujarat', icon: '🏛️', coords: [22.8396, 74.2663] },
        { name: 'Vapi, Gujarat', icon: '🏭', coords: [20.3712, 72.9051] },

        // Rajasthan Cities and Towns
        { name: 'Alwar, Rajasthan', icon: '🏰', coords: [27.5530, 76.6346] },
        { name: 'Bharatpur, Rajasthan', icon: '🏛️', coords: [27.2152, 77.4977] },
        { name: 'Sikar, Rajasthan', icon: '🏛️', coords: [27.6094, 75.1399] },
        { name: 'Jhunjhunu, Rajasthan', icon: '🏛️', coords: [28.1080, 75.3980] },
        { name: 'Churu, Rajasthan', icon: '🏜️', coords: [28.2969, 74.9647] },
        { name: 'Ganganagar, Rajasthan', icon: '🏛️', coords: [29.9167, 73.8667] },
        { name: 'Hanumangarh, Rajasthan', icon: '🏛️', coords: [29.5819, 74.3089] },
        { name: 'Tonk, Rajasthan', icon: '🏛️', coords: [26.1673, 75.7947] },
        { name: 'Bundi, Rajasthan', icon: '🏰', coords: [25.4305, 75.6499] },
        { name: 'Sawai Madhopur, Rajasthan', icon: '🏛️', coords: [26.0173, 76.3440] },
        { name: 'Dausa, Rajasthan', icon: '🏛️', coords: [26.8947, 76.3308] },
        { name: 'Karauli, Rajasthan', icon: '🏛️', coords: [26.4987, 77.0206] },
        { name: 'Dholpur, Rajasthan', icon: '🏛️', coords: [26.7009, 77.8964] },
        { name: 'Bhilwara, Rajasthan', icon: '🏭', coords: [25.3407, 74.6269] },
        { name: 'Chittorgarh, Rajasthan', icon: '🏰', coords: [24.8887, 74.6269] },
        { name: 'Banswara, Rajasthan', icon: '🏛️', coords: [23.5411, 74.4421] },
        { name: 'Dungarpur, Rajasthan', icon: '🏛️', coords: [23.8441, 73.7150] },
        { name: 'Pratapgarh, Rajasthan', icon: '🏛️', coords: [24.0319, 74.7804] },
        { name: 'Rajsamand, Rajasthan', icon: '🏛️', coords: [25.0728, 73.8809] },
        { name: 'Sirohi, Rajasthan', icon: '🏛️', coords: [24.8853, 72.8589] },
        { name: 'Jalore, Rajasthan', icon: '🏛️', coords: [25.3476, 72.6265] },
        { name: 'Pali, Rajasthan', icon: '🏛️', coords: [25.7711, 73.3234] },
        { name: 'Nagaur, Rajasthan', icon: '🏛️', coords: [27.1956, 73.7367] },
        { name: 'Barmer, Rajasthan', icon: '🏜️', coords: [25.7521, 71.3962] },
        { name: 'Jaisalmer, Rajasthan', icon: '🏜️', coords: [26.9157, 70.9083] },

        // Uttar Pradesh Cities and Towns
        { name: 'Gorakhpur, Uttar Pradesh', icon: '🏛️', coords: [26.7606, 83.3732] },
        { name: 'Varanasi, Uttar Pradesh', icon: '🛕', coords: [25.3176, 82.9739] },
        { name: 'Allahabad, Uttar Pradesh', icon: '🛕', coords: [25.4358, 81.8463] },
        { name: 'Bareilly, Uttar Pradesh', icon: '🏛️', coords: [28.3670, 79.4304] },
        { name: 'Moradabad, Uttar Pradesh', icon: '🏛️', coords: [28.8386, 78.7733] },
        { name: 'Aligarh, Uttar Pradesh', icon: '🏛️', coords: [27.8974, 78.0880] },
        { name: 'Mathura, Uttar Pradesh', icon: '🛕', coords: [27.4924, 77.6737] },
        { name: 'Vrindavan, Uttar Pradesh', icon: '🛕', coords: [27.5820, 77.7064] },
        { name: 'Firozabad, Uttar Pradesh', icon: '🏭', coords: [27.1592, 78.3957] },
        { name: 'Mainpuri, Uttar Pradesh', icon: '🏛️', coords: [27.2350, 79.0647] },
        { name: 'Etah, Uttar Pradesh', icon: '🏛️', coords: [27.6333, 78.6667] },
        { name: 'Budaun, Uttar Pradesh', icon: '🏛️', coords: [28.0409, 79.1218] },
        { name: 'Shahjahanpur, Uttar Pradesh', icon: '🏛️', coords: [27.8831, 79.9103] },
        { name: 'Pilibhit, Uttar Pradesh', icon: '🏛️', coords: [28.6315, 79.8040] },
        { name: 'Lakhimpur Kheri, Uttar Pradesh', icon: '🏛️', coords: [27.9465, 80.7782] },
        { name: 'Sitapur, Uttar Pradesh', icon: '🏛️', coords: [27.5677, 80.6947] },
        { name: 'Hardoi, Uttar Pradesh', icon: '🏛️', coords: [27.4167, 80.1333] },
        { name: 'Unnao, Uttar Pradesh', icon: '🏛️', coords: [26.5465, 80.4879] },
        { name: 'Rae Bareli, Uttar Pradesh', icon: '🏛️', coords: [26.2124, 81.2337] },
        { name: 'Sultanpur, Uttar Pradesh', icon: '🏛️', coords: [26.2647, 82.0736] },
        { name: 'Pratapgarh, Uttar Pradesh', icon: '🏛️', coords: [25.8938, 81.9420] },
        { name: 'Jaunpur, Uttar Pradesh', icon: '🏛️', coords: [25.7506, 82.6841] },
        { name: 'Azamgarh, Uttar Pradesh', icon: '🏛️', coords: [26.0685, 83.1836] },
        { name: 'Mau, Uttar Pradesh', icon: '🏛️', coords: [25.9417, 83.5611] },
        { name: 'Ballia, Uttar Pradesh', icon: '🏛️', coords: [25.7522, 84.1491] },
        { name: 'Deoria, Uttar Pradesh', icon: '🏛️', coords: [26.5024, 83.7791] },
        { name: 'Kushinagar, Uttar Pradesh', icon: '🛕', coords: [26.7411, 83.8883] },
        { name: 'Maharajganj, Uttar Pradesh', icon: '🏛️', coords: [27.1441, 83.5583] },
        { name: 'Sant Kabir Nagar, Uttar Pradesh', icon: '🏛️', coords: [26.7667, 83.0333] },
        { name: 'Basti, Uttar Pradesh', icon: '🏛️', coords: [26.8067, 82.7364] },
        { name: 'Siddharthnagar, Uttar Pradesh', icon: '🏛️', coords: [27.2833, 83.1000] },
        { name: 'Gonda, Uttar Pradesh', icon: '🏛️', coords: [27.1333, 81.9667] },
        { name: 'Bahraich, Uttar Pradesh', icon: '🏛️', coords: [27.5742, 81.5947] },
        { name: 'Shravasti, Uttar Pradesh', icon: '🛕', coords: [27.5167, 82.0167] },
        { name: 'Balrampur, Uttar Pradesh', icon: '🏛️', coords: [27.4333, 82.1833] },

        // Madhya Pradesh Cities and Towns
        { name: 'Gwalior, Madhya Pradesh', icon: '🏰', coords: [26.2183, 78.1828] },
        { name: 'Ujjain, Madhya Pradesh', icon: '🛕', coords: [23.1765, 75.7885] },
        { name: 'Sagar, Madhya Pradesh', icon: '🏛️', coords: [23.8388, 78.7378] },
        { name: 'Dewas, Madhya Pradesh', icon: '🏛️', coords: [22.9676, 76.0534] },
        { name: 'Satna, Madhya Pradesh', icon: '🏛️', coords: [24.5667, 80.8167] },
        { name: 'Rewa, Madhya Pradesh', icon: '🏛️', coords: [24.5364, 81.2961] },
        { name: 'Katni, Madhya Pradesh', icon: '🏛️', coords: [23.8315, 80.3919] },
        { name: 'Singrauli, Madhya Pradesh', icon: '⛏️', coords: [24.1997, 82.6739] },
        { name: 'Morena, Madhya Pradesh', icon: '🏛️', coords: [26.5017, 78.0014] },
        { name: 'Bhind, Madhya Pradesh', icon: '🏛️', coords: [26.5653, 78.7875] },
        { name: 'Guna, Madhya Pradesh', icon: '🏛️', coords: [24.6333, 77.3167] },
        { name: 'Shivpuri, Madhya Pradesh', icon: '🏛️', coords: [25.4333, 77.6667] },
        { name: 'Vidisha, Madhya Pradesh', icon: '🏛️', coords: [23.5251, 77.8081] },
        { name: 'Chhatarpur, Madhya Pradesh', icon: '🏛️', coords: [24.9177, 79.5881] },
        { name: 'Damoh, Madhya Pradesh', icon: '🏛️', coords: [23.8315, 79.4419] },
        { name: 'Mandsaur, Madhya Pradesh', icon: '🏛️', coords: [24.0734, 75.0700] },
        { name: 'Neemuch, Madhya Pradesh', icon: '🏛️', coords: [24.4739, 74.8706] },
        { name: 'Ratlam, Madhya Pradesh', icon: '🏛️', coords: [23.3315, 75.0367] },
        { name: 'Shajapur, Madhya Pradesh', icon: '🏛️', coords: [23.4267, 76.2733] },
        { name: 'Rajgarh, Madhya Pradesh', icon: '🏛️', coords: [24.0073, 76.7274] },
        { name: 'Sehore, Madhya Pradesh', icon: '🏛️', coords: [23.2017, 77.0873] },
        { name: 'Raisen, Madhya Pradesh', icon: '🏛️', coords: [23.3315, 77.7833] },
        { name: 'Betul, Madhya Pradesh', icon: '🏛️', coords: [21.9017, 77.8986] },
        { name: 'Harda, Madhya Pradesh', icon: '🏛️', coords: [22.3442, 77.0953] },
        { name: 'Hoshangabad, Madhya Pradesh', icon: '🏛️', coords: [22.7542, 77.7281] },

        // Karnataka Cities and Towns
        { name: 'Mysore, Karnataka', icon: '🏰', coords: [12.2958, 76.6394] },
        { name: 'Mangalore, Karnataka', icon: '🏖️', coords: [12.9141, 74.8560] },
        { name: 'Hubli, Karnataka', icon: '🏛️', coords: [15.3647, 75.1240] },
        { name: 'Dharwad, Karnataka', icon: '🏛️', coords: [15.4589, 75.0078] },
        { name: 'Belgaum, Karnataka', icon: '🏛️', coords: [15.8497, 74.4977] },
        { name: 'Gulbarga, Karnataka', icon: '🏛️', coords: [17.3297, 76.8343] },
        { name: 'Bijapur, Karnataka', icon: '🏛️', coords: [16.8302, 75.7100] },
        { name: 'Bellary, Karnataka', icon: '⛏️', coords: [15.1394, 76.9214] },
        { name: 'Raichur, Karnataka', icon: '🏛️', coords: [16.2120, 77.3439] },
        { name: 'Bidar, Karnataka', icon: '🏛️', coords: [17.9104, 77.5199] },
        { name: 'Shimoga, Karnataka', icon: '🏛️', coords: [13.9299, 75.5681] },
        { name: 'Davangere, Karnataka', icon: '🏛️', coords: [14.4644, 75.9218] },
        { name: 'Chitradurga, Karnataka', icon: '🏛️', coords: [14.2251, 76.3980] },
        { name: 'Tumkur, Karnataka', icon: '🏛️', coords: [13.3379, 77.1022] },
        { name: 'Kolar, Karnataka', icon: '⛏️', coords: [13.1358, 78.1299] },
        { name: 'Mandya, Karnataka', icon: '🏛️', coords: [12.5218, 76.8951] },
        { name: 'Hassan, Karnataka', icon: '🏛️', coords: [13.0033, 76.0953] },
        { name: 'Chikmagalur, Karnataka', icon: '🏔️', coords: [13.3161, 75.7720] },
        { name: 'Udupi, Karnataka', icon: '🏖️', coords: [13.3409, 74.7421] },
        { name: 'Karwar, Karnataka', icon: '🏖️', coords: [14.8167, 74.1167] },

        // Tamil Nadu Cities and Towns
        { name: 'Madurai, Tamil Nadu', icon: '🛕', coords: [9.9252, 78.1198] },
        { name: 'Coimbatore, Tamil Nadu', icon: '🏭', coords: [11.0168, 76.9558] },
        { name: 'Salem, Tamil Nadu', icon: '🏛️', coords: [11.6643, 78.1460] },
        { name: 'Tiruchirappalli, Tamil Nadu', icon: '🏛️', coords: [10.7905, 78.7047] },
        { name: 'Tirunelveli, Tamil Nadu', icon: '🏛️', coords: [8.7139, 77.7567] },
        { name: 'Erode, Tamil Nadu', icon: '🏛️', coords: [11.3410, 77.7172] },
        { name: 'Vellore, Tamil Nadu', icon: '🏛️', coords: [12.9165, 79.1325] },
        { name: 'Thoothukudi, Tamil Nadu', icon: '🏖️', coords: [8.7642, 78.1348] },
        { name: 'Dindigul, Tamil Nadu', icon: '🏛️', coords: [10.3673, 77.9803] },
        { name: 'Thanjavur, Tamil Nadu', icon: '🏛️', coords: [10.7870, 79.1378] },
        { name: 'Ranipet, Tamil Nadu', icon: '🏛️', coords: [12.9249, 79.3308] },
        { name: 'Sivakasi, Tamil Nadu', icon: '🏭', coords: [9.4581, 77.7906] },
        { name: 'Karur, Tamil Nadu', icon: '🏭', coords: [10.9601, 78.0766] },
        { name: 'Pudukkottai, Tamil Nadu', icon: '🏛️', coords: [10.3833, 78.8167] },
        { name: 'Nagapattinam, Tamil Nadu', icon: '🏖️', coords: [10.7661, 79.8448] },
        { name: 'Viluppuram, Tamil Nadu', icon: '🏛️', coords: [11.9401, 79.4861] },
        { name: 'Cuddalore, Tamil Nadu', icon: '🏖️', coords: [11.7480, 79.7714] },
        { name: 'Kanchipuram, Tamil Nadu', icon: '🛕', coords: [12.8185, 79.7037] },
        { name: 'Tiruvannamalai, Tamil Nadu', icon: '🛕', coords: [12.2253, 79.0747] },
        { name: 'Krishnagiri, Tamil Nadu', icon: '🏛️', coords: [12.5186, 78.2137] },
        { name: 'Dharmapuri, Tamil Nadu', icon: '🏛️', coords: [12.1357, 78.1582] },
        { name: 'Tirupattur, Tamil Nadu', icon: '🏛️', coords: [12.4963, 78.5739] },
        { name: 'Namakkal, Tamil Nadu', icon: '🏛️', coords: [11.2189, 78.1677] },
        { name: 'Perambalur, Tamil Nadu', icon: '🏛️', coords: [11.2342, 78.8808] },
        { name: 'Ariyalur, Tamil Nadu', icon: '🏛️', coords: [11.1401, 79.0782] },
        { name: 'Kallakurichi, Tamil Nadu', icon: '🏛️', coords: [11.7401, 78.9597] },
        { name: 'Chengalpattu, Tamil Nadu', icon: '🏛️', coords: [12.6819, 79.9864] },
        { name: 'Tenkasi, Tamil Nadu', icon: '🏛️', coords: [8.9597, 77.3152] },
        { name: 'Ramanathapuram, Tamil Nadu', icon: '🏖️', coords: [9.3648, 78.8370] },
        { name: 'Virudhunagar, Tamil Nadu', icon: '🏛️', coords: [9.5810, 77.9624] },
        { name: 'Theni, Tamil Nadu', icon: '🏔️', coords: [10.0104, 77.4977] },
        { name: 'The Nilgiris, Tamil Nadu', icon: '🏔️', coords: [11.4064, 76.6932] },

        // Kerala Cities and Towns
        { name: 'Kochi, Kerala', icon: '🏖️', coords: [9.9312, 76.2673] },
        { name: 'Thiruvananthapuram, Kerala', icon: '🏛️', coords: [8.5241, 76.9366] },
        { name: 'Kozhikode, Kerala', icon: '🏖️', coords: [11.2588, 75.7804] },
        { name: 'Thrissur, Kerala', icon: '🛕', coords: [10.5276, 76.2144] },
        { name: 'Kollam, Kerala', icon: '🏖️', coords: [8.8932, 76.6141] },
        { name: 'Palakkad, Kerala', icon: '🏛️', coords: [10.7867, 76.6548] },
        { name: 'Alappuzha, Kerala', icon: '🏖️', coords: [9.4981, 76.3388] },
        { name: 'Kottayam, Kerala', icon: '🏛️', coords: [9.5916, 76.5222] },
        { name: 'Kannur, Kerala', icon: '🏖️', coords: [11.8745, 75.3704] },
        { name: 'Kasaragod, Kerala', icon: '🏖️', coords: [12.4996, 74.9869] },
        { name: 'Wayanad, Kerala', icon: '🏔️', coords: [11.6854, 76.1320] },
        { name: 'Idukki, Kerala', icon: '🏔️', coords: [9.9181, 76.9672] },
        { name: 'Pathanamthitta, Kerala', icon: '🏛️', coords: [9.2648, 76.7870] },
        { name: 'Malappuram, Kerala', icon: '🏛️', coords: [11.0510, 76.0711] },

        // Andhra Pradesh and Telangana Cities
        { name: 'Visakhapatnam, Andhra Pradesh', icon: '🏖️', coords: [17.6868, 83.2185] },
        { name: 'Vijayawada, Andhra Pradesh', icon: '🏛️', coords: [16.5062, 80.6480] },
        { name: 'Guntur, Andhra Pradesh', icon: '🏛️', coords: [16.3067, 80.4365] },
        { name: 'Nellore, Andhra Pradesh', icon: '🏛️', coords: [14.4426, 79.9865] },
        { name: 'Kurnool, Andhra Pradesh', icon: '🏛️', coords: [15.8281, 78.0373] },
        { name: 'Rajahmundry, Andhra Pradesh', icon: '🏛️', coords: [17.0005, 81.8040] },
        { name: 'Kakinada, Andhra Pradesh', icon: '🏖️', coords: [16.9891, 82.2475] },
        { name: 'Eluru, Andhra Pradesh', icon: '🏛️', coords: [16.7107, 81.0953] },
        { name: 'Ongole, Andhra Pradesh', icon: '🏛️', coords: [15.5057, 80.0499] },
        { name: 'Anantapur, Andhra Pradesh', icon: '🏛️', coords: [14.6819, 77.6006] },
        { name: 'Chittoor, Andhra Pradesh', icon: '🏛️', coords: [13.2172, 79.1003] },
        { name: 'Tirupati, Andhra Pradesh', icon: '🛕', coords: [13.6288, 79.4192] },
        { name: 'Kadapa, Andhra Pradesh', icon: '🏛️', coords: [14.4673, 78.8242] },
        { name: 'Nizamabad, Telangana', icon: '🏛️', coords: [18.6725, 78.0941] },
        { name: 'Warangal, Telangana', icon: '🏛️', coords: [17.9689, 79.5941] },
        { name: 'Khammam, Telangana', icon: '🏛️', coords: [17.2473, 80.1514] },
        { name: 'Karimnagar, Telangana', icon: '🏛️', coords: [18.4386, 79.1288] },
        { name: 'Mahbubnagar, Telangana', icon: '🏛️', coords: [16.7460, 77.9982] },
        { name: 'Nalgonda, Telangana', icon: '🏛️', coords: [17.0568, 79.2873] },
        { name: 'Adilabad, Telangana', icon: '🏛️', coords: [19.6718, 78.5311] },
        { name: 'Medak, Telangana', icon: '🏛️', coords: [18.0487, 78.2747] },
        { name: 'Sangareddy, Telangana', icon: '🏛️', coords: [17.6186, 78.0831] },
        { name: 'Siddipet, Telangana', icon: '🏛️', coords: [18.1018, 78.8492] },

        // West Bengal Cities and Towns
        { name: 'Howrah, West Bengal', icon: '🏭', coords: [22.5958, 88.2636] },
        { name: 'Durgapur, West Bengal', icon: '🏭', coords: [23.5204, 87.3119] },
        { name: 'Asansol, West Bengal', icon: '🏭', coords: [23.6739, 86.9524] },
        { name: 'Siliguri, West Bengal', icon: '🏛️', coords: [26.7271, 88.3953] },
        { name: 'Malda, West Bengal', icon: '🏛️', coords: [25.0000, 88.1333] },
        { name: 'Krishnanagar, West Bengal', icon: '🏛️', coords: [23.4058, 88.5019] },
        { name: 'Baharampur, West Bengal', icon: '🏛️', coords: [24.1000, 88.2500] },
        { name: 'Jalpaiguri, West Bengal', icon: '🏛️', coords: [26.5499, 88.7167] },
        { name: 'Cooch Behar, West Bengal', icon: '🏛️', coords: [26.3255, 89.4497] },
        { name: 'Darjeeling, West Bengal', icon: '🏔️', coords: [27.0360, 88.2627] },
        { name: 'Alipurduar, West Bengal', icon: '🏛️', coords: [26.4837, 89.5264] },
        { name: 'Purulia, West Bengal', icon: '🏛️', coords: [23.3424, 86.3616] },
        { name: 'Bankura, West Bengal', icon: '🏛️', coords: [23.2324, 87.0696] },
        { name: 'Birbhum, West Bengal', icon: '🏛️', coords: [24.0000, 87.6167] },
        { name: 'Burdwan, West Bengal', icon: '🏛️', coords: [23.2324, 87.8615] },
        { name: 'Nadia, West Bengal', icon: '🏛️', coords: [23.4731, 88.5565] },
        { name: 'North 24 Parganas, West Bengal', icon: '🏛️', coords: [22.6167, 88.4000] },
        { name: 'South 24 Parganas, West Bengal', icon: '🏛️', coords: [22.1667, 88.4167] },
        { name: 'Hooghly, West Bengal', icon: '🏛️', coords: [22.9000, 88.4000] },
        { name: 'Medinipur, West Bengal', icon: '🏛️', coords: [22.4333, 87.3167] },

        // Odisha Cities and Towns
        { name: 'Bhubaneswar, Odisha', icon: '🏛️', coords: [20.2961, 85.8245] },
        { name: 'Cuttack, Odisha', icon: '🏛️', coords: [20.4625, 85.8828] },
        { name: 'Rourkela, Odisha', icon: '🏭', coords: [22.2604, 84.8536] },
        { name: 'Berhampur, Odisha', icon: '🏛️', coords: [19.3149, 84.7941] },
        { name: 'Sambalpur, Odisha', icon: '🏛️', coords: [21.4669, 83.9812] },
        { name: 'Puri, Odisha', icon: '🛕', coords: [19.8135, 85.8312] },
        { name: 'Balasore, Odisha', icon: '🏖️', coords: [21.4942, 86.9336] },
        { name: 'Baripada, Odisha', icon: '🏛️', coords: [21.9347, 86.7334] },
        { name: 'Bhadrak, Odisha', icon: '🏛️', coords: [21.0581, 86.5086] },
        { name: 'Balangir, Odisha', icon: '🏛️', coords: [20.7167, 83.4833] },
        { name: 'Jharsuguda, Odisha', icon: '🏭', coords: [21.8558, 84.0058] },
        { name: 'Bargarh, Odisha', icon: '🏛️', coords: [21.3333, 83.6167] },
        { name: 'Sundargarh, Odisha', icon: '⛏️', coords: [22.1167, 84.0333] },
        { name: 'Phulbani, Odisha', icon: '🏛️', coords: [20.4667, 84.2333] },
        { name: 'Dhenkanal, Odisha', icon: '🏛️', coords: [20.6667, 85.6000] },
        { name: 'Angul, Odisha', icon: '🏭', coords: [20.8333, 85.1000] },
        { name: 'Jajpur, Odisha', icon: '🏛️', coords: [20.8333, 86.3333] },
        { name: 'Keonjhar, Odisha', icon: '⛏️', coords: [21.6333, 85.5833] },
        { name: 'Mayurbhanj, Odisha', icon: '🏛️', coords: [21.9333, 86.7333] },
        { name: 'Kendrapara, Odisha', icon: '🏛️', coords: [20.5000, 86.4167] },
        { name: 'Jagatsinghpur, Odisha', icon: '🏛️', coords: [20.2667, 86.1667] },
        { name: 'Nayagarh, Odisha', icon: '🏛️', coords: [20.1333, 85.1000] },
        { name: 'Khordha, Odisha', icon: '🏛️', coords: [20.1833, 85.6167] },
        { name: 'Ganjam, Odisha', icon: '🏛️', coords: [19.3833, 85.0500] },
        { name: 'Gajapati, Odisha', icon: '🏛️', coords: [18.8667, 84.1667] },
        { name: 'Rayagada, Odisha', icon: '🏛️', coords: [19.1667, 83.4167] },
        { name: 'Nabarangpur, Odisha', icon: '🏛️', coords: [19.2333, 82.5500] },
        { name: 'Kalahandi, Odisha', icon: '🏛️', coords: [19.9167, 83.1667] },
        { name: 'Nuapada, Odisha', icon: '🏛️', coords: [20.8000, 82.5333] },
        { name: 'Koraput, Odisha', icon: '🏛️', coords: [18.8167, 82.7167] },
        { name: 'Malkangiri, Odisha', icon: '🏛️', coords: [18.3500, 81.9000] }
    ];

    return locations.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 15);
}

function getLocationCoords(locationName) {
    // Check if it's current location with stored coordinates
    const startInput = document.getElementById('srStart');
    if (locationName.includes('Current Location') && startInput && startInput.dataset.coords) {
        return startInput.dataset.coords.split(',').map(Number);
    }

    const locations = {
        // Major Indian Cities (Comprehensive)
        'Mumbai, Maharashtra': [19.0760, 72.8777], 'Mumbai': [19.0760, 72.8777],
        "Dhule, Maharashtra": [20.9000, 74.7833], "Nandurbar, Maharashtra": [21.3667, 74.2500],
        'New Delhi, Delhi': [28.6139, 77.2090], 'New Delhi': [28.6139, 77.2090], 'Delhi': [28.6139, 77.2090],
        'Bangalore, Karnataka': [12.9716, 77.5946], 'Bangalore': [12.9716, 77.5946],
        'Chennai, Tamil Nadu': [13.0827, 80.2707], 'Chennai': [13.0827, 80.2707],
        'Kolkata, West Bengal': [22.5726, 88.3639], 'Kolkata': [22.5726, 88.3639],
        'Hyderabad, Telangana': [17.3850, 78.4867], 'Hyderabad': [17.3850, 78.4867],
        'Pune, Maharashtra': [18.5204, 73.8567], 'Pune': [18.5204, 73.8567],
        'Ahmedabad, Gujarat': [23.0225, 72.5714], 'Ahmedabad': [23.0225, 72.5714],
        'Jaipur, Rajasthan': [26.9124, 75.7873], 'Jaipur': [26.9124, 75.7873],
        'Surat, Gujarat': [21.1702, 72.8311], 'Surat': [21.1702, 72.8311],
        'Kanpur, Uttar Pradesh': [26.4499, 80.3319], 'Kanpur': [26.4499, 80.3319],
        'Lucknow, Uttar Pradesh': [26.8467, 80.9462], 'Lucknow': [26.8467, 80.9462],
        'Nagpur, Maharashtra': [21.1458, 79.0882], 'Nagpur': [21.1458, 79.0882],
        'Indore, Madhya Pradesh': [22.7196, 75.8577], 'Indore': [22.7196, 75.8577],
        'Thane, Maharashtra': [19.2183, 72.9781], 'Thane': [19.2183, 72.9781],
        'Bhopal, Madhya Pradesh': [23.2599, 77.4126], 'Bhopal': [23.2599, 77.4126],
        'Visakhapatnam, Andhra Pradesh': [17.6868, 83.2185], 'Visakhapatnam': [17.6868, 83.2185],
        'Pimpri-Chinchwad, Maharashtra': [18.6298, 73.7997], 'Pimpri-Chinchwad': [18.6298, 73.7997],
        'Patna, Bihar': [25.5941, 85.1376], 'Patna': [25.5941, 85.1376],
        'Vadodara, Gujarat': [22.3072, 73.1812], 'Vadodara': [22.3072, 73.1812],
        'Ludhiana, Punjab': [30.9010, 75.8573], 'Ludhiana': [30.9010, 75.8573],
        'Agra, Uttar Pradesh': [27.1767, 78.0081], 'Agra': [27.1767, 78.0081],
        'Faridabad, Haryana': [28.4089, 77.3178], 'Faridabad': [28.4089, 77.3178],
        'Meerut, Uttar Pradesh': [28.9845, 77.7064], 'Meerut': [28.9845, 77.7064],
        'Rajkot, Gujarat': [22.3039, 70.8022], 'Rajkot': [22.3039, 70.8022],
        'Kalyan-Dombivli, Maharashtra': [19.2403, 73.1305], 'Kalyan-Dombivli': [19.2403, 73.1305],
        'Vasai-Virar, Maharashtra': [19.4912, 72.8054], 'Vasai-Virar': [19.4912, 72.8054],
        'Varanasi, Uttar Pradesh': [25.3176, 82.9739], 'Varanasi': [25.3176, 82.9739],
        'Srinagar, Jammu and Kashmir': [34.0837, 74.7973], 'Srinagar': [34.0837, 74.7973],
        'Aurangabad, Maharashtra': [19.8762, 75.3433], 'Aurangabad': [19.8762, 75.3433],
        'Dhanbad, Jharkhand': [23.7957, 86.4304], 'Dhanbad': [23.7957, 86.4304],
        'Amritsar, Punjab': [31.6340, 74.8723], 'Amritsar': [31.6340, 74.8723],
        'Navi Mumbai, Maharashtra': [19.0330, 73.0297], 'Navi Mumbai': [19.0330, 73.0297],
        'Allahabad, Uttar Pradesh': [25.4358, 81.8463], 'Allahabad': [25.4358, 81.8463],
        'Ranchi, Jharkhand': [23.3441, 85.3096], 'Ranchi': [23.3441, 85.3096],
        'Howrah, West Bengal': [22.5958, 88.2636], 'Howrah': [22.5958, 88.2636],
        'Coimbatore, Tamil Nadu': [11.0168, 76.9558], 'Coimbatore': [11.0168, 76.9558],
        'Jabalpur, Madhya Pradesh': [23.1815, 79.9864], 'Jabalpur': [23.1815, 79.9864],
        'Gwalior, Madhya Pradesh': [26.2183, 78.1828], 'Gwalior': [26.2183, 78.1828],
        'Vijayawada, Andhra Pradesh': [16.5062, 80.6480], 'Vijayawada': [16.5062, 80.6480],
        'Jodhpur, Rajasthan': [26.2389, 73.0243], 'Jodhpur': [26.2389, 73.0243],
        'Madurai, Tamil Nadu': [9.9252, 78.1198], 'Madurai': [9.9252, 78.1198],
        'Raipur, Chhattisgarh': [21.2514, 81.6296], 'Raipur': [21.2514, 81.6296],
        'Kota, Rajasthan': [25.2138, 75.8648], 'Kota': [25.2138, 75.8648],
        'Chandigarh, Punjab': [30.7333, 76.7794], 'Chandigarh': [30.7333, 76.7794],
        'Guwahati, Assam': [26.1445, 91.7362], 'Guwahati': [26.1445, 91.7362],
        'Solapur, Maharashtra': [17.6599, 75.9064], 'Solapur': [17.6599, 75.9064],
        'Hubli-Dharwad, Karnataka': [15.3647, 75.1240], 'Hubli-Dharwad': [15.3647, 75.1240],
        'Bareilly, Uttar Pradesh': [28.3670, 79.4304], 'Bareilly': [28.3670, 79.4304],
        'Moradabad, Uttar Pradesh': [28.8386, 78.7733], 'Moradabad': [28.8386, 78.7733],
        'Mysore, Karnataka': [12.2958, 76.6394], 'Mysore': [12.2958, 76.6394],
        'Gurgaon, Haryana': [28.4595, 77.0266], 'Gurgaon': [28.4595, 77.0266],
        'Aligarh, Uttar Pradesh': [27.8974, 78.0880], 'Aligarh': [27.8974, 78.0880],
        'Jalandhar, Punjab': [31.3260, 75.5762], 'Jalandhar': [31.3260, 75.5762],
        'Tiruchirappalli, Tamil Nadu': [10.7905, 78.7047], 'Tiruchirappalli': [10.7905, 78.7047],
        'Bhubaneswar, Odisha': [20.2961, 85.8245], 'Bhubaneswar': [20.2961, 85.8245],
        'Salem, Tamil Nadu': [11.6643, 78.1460], 'Salem': [11.6643, 78.1460],
        'Warangal, Telangana': [17.9689, 79.5941], 'Warangal': [17.9689, 79.5941],
        'Mira-Bhayandar, Maharashtra': [19.2952, 72.8544], 'Mira-Bhayandar': [19.2952, 72.8544],
        'Thiruvananthapuram, Kerala': [8.5241, 76.9366], 'Thiruvananthapuram': [8.5241, 76.9366],
        'Bhiwandi, Maharashtra': [19.3002, 73.0635], 'Bhiwandi': [19.3002, 73.0635],
        'Saharanpur, Uttar Pradesh': [29.9680, 77.5552], 'Saharanpur': [29.9680, 77.5552],
        'Guntur, Andhra Pradesh': [16.3067, 80.4365], 'Guntur': [16.3067, 80.4365],
        'Amravati, Maharashtra': [20.9374, 77.7796], 'Amravati': [20.9374, 77.7796],
        'Bikaner, Rajasthan': [28.0229, 73.3119], 'Bikaner': [28.0229, 73.3119],
        'Noida, Uttar Pradesh': [28.5355, 77.3910], 'Noida': [28.5355, 77.3910],
        'Jamshedpur, Jharkhand': [22.8046, 86.2029], 'Jamshedpur': [22.8046, 86.2029],
        'Bhilai Nagar, Chhattisgarh': [21.1938, 81.3509], 'Bhilai Nagar': [21.1938, 81.3509],
        'Cuttack, Odisha': [20.4625, 85.8828], 'Cuttack': [20.4625, 85.8828],
        'Firozabad, Uttar Pradesh': [27.1592, 78.3957], 'Firozabad': [27.1592, 78.3957],
        'Kochi, Kerala': [9.9312, 76.2673], 'Kochi': [9.9312, 76.2673],
        'Bhavnagar, Gujarat': [21.7645, 72.1519], 'Bhavnagar': [21.7645, 72.1519],
        'Dehradun, Uttarakhand': [30.3165, 78.0322], 'Dehradun': [30.3165, 78.0322],
        'Durgapur, West Bengal': [23.5204, 87.3119], 'Durgapur': [23.5204, 87.3119],
        'Asansol, West Bengal': [23.6739, 86.9524], 'Asansol': [23.6739, 86.9524],
        'Nanded, Maharashtra': [19.1383, 77.2975], 'Nanded': [19.1383, 77.2975],
        'Kolhapur, Maharashtra': [16.7050, 74.2433], 'Kolhapur': [16.7050, 74.2433],
        'Ajmer, Rajasthan': [26.4499, 74.6399], 'Ajmer': [26.4499, 74.6399],
        'Akola, Maharashtra': [20.7002, 77.0082], 'Akola': [20.7002, 77.0082],
        'Gulbarga, Karnataka': [17.3297, 76.8343], 'Gulbarga': [17.3297, 76.8343],
        'Jamnagar, Gujarat': [22.4707, 70.0577], 'Jamnagar': [22.4707, 70.0577],
        'Ujjain, Madhya Pradesh': [23.1765, 75.7885], 'Ujjain': [23.1765, 75.7885],
        'Loni, Uttar Pradesh': [28.7506, 77.2897], 'Loni': [28.7506, 77.2897],
        'Siliguri, West Bengal': [26.7271, 88.3953], 'Siliguri': [26.7271, 88.3953],
        'Jhansi, Uttar Pradesh': [25.4484, 78.5685], 'Jhansi': [25.4484, 78.5685],
        'Ulhasnagar, Maharashtra': [19.2215, 73.1645], 'Ulhasnagar': [19.2215, 73.1645],
        'Jammu, Jammu and Kashmir': [32.7266, 74.8570], 'Jammu': [32.7266, 74.8570],
        'Sangli-Miraj & Kupwad, Maharashtra': [16.8524, 74.5815], 'Sangli-Miraj & Kupwad': [16.8524, 74.5815],
        'Mangalore, Karnataka': [12.9141, 74.8560], 'Mangalore': [12.9141, 74.8560],
        'Erode, Tamil Nadu': [11.3410, 77.7172], 'Erode': [11.3410, 77.7172],
        'Belgaum, Karnataka': [15.8497, 74.4977], 'Belgaum': [15.8497, 74.4977],
        'Ambattur, Tamil Nadu': [13.1143, 80.1548], 'Ambattur': [13.1143, 80.1548],
        'Tirunelveli, Tamil Nadu': [8.7139, 77.7567], 'Tirunelveli': [8.7139, 77.7567],
        'Malegaon, Maharashtra': [20.5579, 74.5287], 'Malegaon': [20.5579, 74.5287],
        'Gaya, Bihar': [24.7914, 85.0002], 'Gaya': [24.7914, 85.0002],
        'Jalgaon, Maharashtra': [21.0077, 75.5626], 'Jalgaon': [21.0077, 75.5626],
        'Udaipur, Rajasthan': [24.5854, 73.7125], 'Udaipur': [24.5854, 73.7125],
        'Maheshtala, West Bengal': [22.5093, 88.2482], 'Maheshtala': [22.5093, 88.2482],
        'Surat, Gujarat': [21.1702, 72.8311], 'Surat': [21.1702, 72.8311],
        'Lucknow, Uttar Pradesh': [26.8467, 80.9462], 'Lucknow': [26.8467, 80.9462],
        'Kanpur, Uttar Pradesh': [26.4499, 80.3319], 'Kanpur': [26.4499, 80.3319],
        'Nagpur, Maharashtra': [21.1458, 79.0882], 'Nagpur': [21.1458, 79.0882],
        'Indore, Madhya Pradesh': [22.7196, 75.8577], 'Indore': [22.7196, 75.8577],
        'Thane, Maharashtra': [19.2183, 72.9781], 'Thane': [19.2183, 72.9781],
        'Bhopal, Madhya Pradesh': [23.2599, 77.4126], 'Bhopal': [23.2599, 77.4126],
        'Visakhapatnam, Andhra Pradesh': [17.6868, 83.2185], 'Visakhapatnam': [17.6868, 83.2185],
        'Pimpri-Chinchwad, Maharashtra': [18.6298, 73.7997], 'Pimpri-Chinchwad': [18.6298, 73.7997],
        'Patna, Bihar': [25.5941, 85.1376], 'Patna': [25.5941, 85.1376],
        'Vadodara, Gujarat': [22.3072, 73.1812], 'Vadodara': [22.3072, 73.1812],
        'Ludhiana, Punjab': [30.9010, 75.8573], 'Ludhiana': [30.9010, 75.8573],
        'Agra, Uttar Pradesh': [27.1767, 78.0081], 'Agra': [27.1767, 78.0081],
        'Nashik, Maharashtra': [19.9975, 73.7898], 'Nashik': [19.9975, 73.7898],
        'Faridabad, Haryana': [28.4089, 77.3178], 'Faridabad': [28.4089, 77.3178],
        'Meerut, Uttar Pradesh': [28.9845, 77.7064], 'Meerut': [28.9845, 77.7064],
        'Rajkot, Gujarat': [22.3039, 70.8022], 'Rajkot': [22.3039, 70.8022],
        'Kalyan-Dombivli, Maharashtra': [19.2403, 73.1305], 'Kalyan-Dombivli': [19.2403, 73.1305],
        'Vasai-Virar, Maharashtra': [19.4912, 72.8054], 'Vasai-Virar': [19.4912, 72.8054],
        'Varanasi, Uttar Pradesh': [25.3176, 82.9739], 'Varanasi': [25.3176, 82.9739],
        'Srinagar, Jammu and Kashmir': [34.0837, 74.7973], 'Srinagar': [34.0837, 74.7973],
        'Aurangabad, Maharashtra': [19.8762, 75.3433], 'Aurangabad': [19.8762, 75.3433],
        'Dhanbad, Jharkhand': [23.7957, 86.4304], 'Dhanbad': [23.7957, 86.4304],
        'Amritsar, Punjab': [31.6340, 74.8723], 'Amritsar': [31.6340, 74.8723],
        'Navi Mumbai, Maharashtra': [19.0330, 73.0297], 'Navi Mumbai': [19.0330, 73.0297],
        'Allahabad, Uttar Pradesh': [25.4358, 81.8463], 'Allahabad': [25.4358, 81.8463],
        'Ranchi, Jharkhand': [23.3441, 85.3096], 'Ranchi': [23.3441, 85.3096],
        'Howrah, West Bengal': [22.5958, 88.2636], 'Howrah': [22.5958, 88.2636],
        'Coimbatore, Tamil Nadu': [11.0168, 76.9558], 'Coimbatore': [11.0168, 76.9558],
        'Jabalpur, Madhya Pradesh': [23.1815, 79.9864], 'Jabalpur': [23.1815, 79.9864],
        'Gwalior, Madhya Pradesh': [26.2183, 78.1828], 'Gwalior': [26.2183, 78.1828],
        'Vijayawada, Andhra Pradesh': [16.5062, 80.6480], 'Vijayawada': [16.5062, 80.6480],
        'Jodhpur, Rajasthan': [26.2389, 73.0243], 'Jodhpur': [26.2389, 73.0243],
        'Madurai, Tamil Nadu': [9.9252, 78.1198], 'Madurai': [9.9252, 78.1198],
        'Raipur, Chhattisgarh': [21.2514, 81.6296], 'Raipur': [21.2514, 81.6296],
        'Kota, Rajasthan': [25.2138, 75.8648], 'Kota': [25.2138, 75.8648],
        'Chandigarh, Punjab': [30.7333, 76.7794], 'Chandigarh': [30.7333, 76.7794],
        'Guwahati, Assam': [26.1445, 91.7362], 'Guwahati': [26.1445, 91.7362],
        'Solapur, Maharashtra': [17.6599, 75.9064], 'Solapur': [17.6599, 75.9064],
        'Hubli-Dharwad, Karnataka': [15.3647, 75.1240], 'Hubli-Dharwad': [15.3647, 75.1240],
        'Bareilly, Uttar Pradesh': [28.3670, 79.4304], 'Bareilly': [28.3670, 79.4304],
        'Moradabad, Uttar Pradesh': [28.8386, 78.7733], 'Moradabad': [28.8386, 78.7733],
        'Mysore, Karnataka': [12.2958, 76.6394], 'Mysore': [12.2958, 76.6394],
        'Gurgaon, Haryana': [28.4595, 77.0266], 'Gurgaon': [28.4595, 77.0266],
        'Aligarh, Uttar Pradesh': [27.8974, 78.0880], 'Aligarh': [27.8974, 78.0880],
        'Jalandhar, Punjab': [31.3260, 75.5762], 'Jalandhar': [31.3260, 75.5762],
        'Tiruchirappalli, Tamil Nadu': [10.7905, 78.7047], 'Tiruchirappalli': [10.7905, 78.7047],
        'Bhubaneswar, Odisha': [20.2961, 85.8245], 'Bhubaneswar': [20.2961, 85.8245],
        'Salem, Tamil Nadu': [11.6643, 78.1460], 'Salem': [11.6643, 78.1460],
        'Warangal, Telangana': [17.9689, 79.5941], 'Warangal': [17.9689, 79.5941],
        'Mira-Bhayandar, Maharashtra': [19.2952, 72.8544], 'Mira-Bhayandar': [19.2952, 72.8544],
        'Thiruvananthapuram, Kerala': [8.5241, 76.9366], 'Thiruvananthapuram': [8.5241, 76.9366],
        'Bhiwandi, Maharashtra': [19.3002, 73.0635], 'Bhiwandi': [19.3002, 73.0635],
        'Saharanpur, Uttar Pradesh': [29.9680, 77.5552], 'Saharanpur': [29.9680, 77.5552],
        'Guntur, Andhra Pradesh': [16.3067, 80.4365], 'Guntur': [16.3067, 80.4365],
        'Amravati, Maharashtra': [20.9374, 77.7796], 'Amravati': [20.9374, 77.7796],
        'Bikaner, Rajasthan': [28.0229, 73.3119], 'Bikaner': [28.0229, 73.3119],
        'Noida, Uttar Pradesh': [28.5355, 77.3910], 'Noida': [28.5355, 77.3910],
        'Jamshedpur, Jharkhand': [22.8046, 86.2029], 'Jamshedpur': [22.8046, 86.2029],
        'Bhilai Nagar, Chhattisgarh': [21.1938, 81.3509], 'Bhilai Nagar': [21.1938, 81.3509],
        'Cuttack, Odisha': [20.4625, 85.8828], 'Cuttack': [20.4625, 85.8828],
        'Firozabad, Uttar Pradesh': [27.1592, 78.3957], 'Firozabad': [27.1592, 78.3957],
        'Kochi, Kerala': [9.9312, 76.2673], 'Kochi': [9.9312, 76.2673],
        'Bhavnagar, Gujarat': [21.7645, 72.1519], 'Bhavnagar': [21.7645, 72.1519],
        'Dehradun, Uttarakhand': [30.3165, 78.0322], 'Dehradun': [30.3165, 78.0322],
        'Durgapur, West Bengal': [23.5204, 87.3119], 'Durgapur': [23.5204, 87.3119],
        'Asansol, West Bengal': [23.6739, 86.9524], 'Asansol': [23.6739, 86.9524],
        'Nanded, Maharashtra': [19.1383, 77.2975], 'Nanded': [19.1383, 77.2975],
        'Kolhapur, Maharashtra': [16.7050, 74.2433], 'Kolhapur': [16.7050, 74.2433],
        'Ajmer, Rajasthan': [26.4499, 74.6399], 'Ajmer': [26.4499, 74.6399],
        'Akola, Maharashtra': [20.7002, 77.0082], 'Akola': [20.7002, 77.0082],
        'Gulbarga, Karnataka': [17.3297, 76.8343], 'Gulbarga': [17.3297, 76.8343],
        'Jamnagar, Gujarat': [22.4707, 70.0577], 'Jamnagar': [22.4707, 70.0577],
        'Ujjain, Madhya Pradesh': [23.1765, 75.7885], 'Ujjain': [23.1765, 75.7885],
        'Loni, Uttar Pradesh': [28.7506, 77.2897], 'Loni': [28.7506, 77.2897],
        'Siliguri, West Bengal': [26.7271, 88.3953], 'Siliguri': [26.7271, 88.3953],
        'Jhansi, Uttar Pradesh': [25.4484, 78.5685], 'Jhansi': [25.4484, 78.5685],
        'Ulhasnagar, Maharashtra': [19.2215, 73.1645], 'Ulhasnagar': [19.2215, 73.1645],
        'Jammu, Jammu and Kashmir': [32.7266, 74.8570], 'Jammu': [32.7266, 74.8570],
        'Sangli-Miraj & Kupwad, Maharashtra': [16.8524, 74.5815], 'Sangli-Miraj & Kupwad': [16.8524, 74.5815],
        'Mangalore, Karnataka': [12.9141, 74.8560], 'Mangalore': [12.9141, 74.8560],
        'Erode, Tamil Nadu': [11.3410, 77.7172], 'Erode': [11.3410, 77.7172],
        'Belgaum, Karnataka': [15.8497, 74.4977], 'Belgaum': [15.8497, 74.4977],
        'Ambattur, Tamil Nadu': [13.1143, 80.1548], 'Ambattur': [13.1143, 80.1548],
        'Tirunelveli, Tamil Nadu': [8.7139, 77.7567], 'Tirunelveli': [8.7139, 77.7567],
        'Malegaon, Maharashtra': [20.5579, 74.5287], 'Malegaon': [20.5579, 74.5287],
        'Gaya, Bihar': [24.7914, 85.0002], 'Gaya': [24.7914, 85.0002],
        'Jalgaon, Maharashtra': [21.0077, 75.5626], 'Jalgaon': [21.0077, 75.5626],
        'Udaipur, Rajasthan': [24.5854, 73.7125], 'Udaipur': [24.5854, 73.7125],
        'Maheshtala, West Bengal': [22.5093, 88.2482], 'Maheshtala': [22.5093, 88.2482],

        // Nashik Area (Comprehensive)
        'Nashik Central': [19.9975, 73.7898],
        'Nashik Road Railway Station': [19.9615, 73.7926], 'Nashik Road Station': [19.9615, 73.7926],
        'Sandip University, Nashik': [19.9640, 73.6670], 'Sandip University Area': [19.9640, 73.6670],
        'Gangapur Road, Nashik': [20.0123, 73.7456], 'Gangapur Road': [20.0123, 73.7456],
        'Deolali Camp, Nashik': [19.9456, 73.8234], 'Deolali Camp': [19.9456, 73.8234],
        'Satpur MIDC, Nashik': [20.0456, 73.7123], 'Satpur Industrial': [20.0456, 73.7123],
        'Panchavati, Nashik': [19.9990, 73.7910], 'Panchavati Temple': [19.9990, 73.7910],
        'Nashik Airport (Ozar)': [20.1117, 73.9131],
        'College Road, Nashik': [19.9980, 73.7900], 'MG Road, Nashik': [19.9985, 73.7905],
        'Cidco Nashik': [19.9307, 73.7314], 'Ambad, Nashik': [20.0234, 73.7567],
        'Pathardi Phata, Nashik': [19.9800, 73.7600], 'Trimbakeshwar, Nashik': [19.9333, 73.5333],
        'Igatpuri, Nashik': [19.6917, 73.5667], 'Sinnar, Nashik': [19.8500, 74.0000],
        'Yeola, Nashik': [20.0424, 74.4894], 'Manmad, Nashik': [20.2522, 74.4394],
        'Kalwan, Nashik': [20.4833, 74.0167],

        // International Cities (Major)
        'New York, USA': [40.7128, -74.0060], 'New York': [40.7128, -74.0060],
        'London, UK': [51.5074, -0.1278], 'London': [51.5074, -0.1278],
        'Paris, France': [48.8566, 2.3522], 'Paris': [48.8566, 2.3522],
        'Tokyo, Japan': [35.6762, 139.6503], 'Tokyo': [35.6762, 139.6503],
        'Dubai, UAE': [25.2048, 55.2708], 'Dubai': [25.2048, 55.2708],
        'Singapore': [1.3521, 103.8198],
        'Sydney, Australia': [-33.8688, 151.2093], 'Sydney': [-33.8688, 151.2093],
        'Los Angeles, USA': [34.0522, -118.2437], 'Los Angeles': [34.0522, -118.2437],
        'Toronto, Canada': [43.6532, -79.3832], 'Toronto': [43.6532, -79.3832],
        'Berlin, Germany': [52.5200, 13.4050], 'Berlin': [52.5200, 13.4050],
        'Moscow, Russia': [55.7558, 37.6176], 'Moscow': [55.7558, 37.6176],
        'Beijing, China': [39.9042, 116.4074], 'Beijing': [39.9042, 116.4074],
        'Shanghai, China': [31.2304, 121.4737], 'Shanghai': [31.2304, 121.4737],
        'Hong Kong': [22.3193, 114.1694],
        'Seoul, South Korea': [37.5665, 126.9780], 'Seoul': [37.5665, 126.9780],
        'Bangkok, Thailand': [13.7563, 100.5018], 'Bangkok': [13.7563, 100.5018],
        'Kuala Lumpur, Malaysia': [3.1390, 101.6869], 'Kuala Lumpur': [3.1390, 101.6869],
        'Jakarta, Indonesia': [-6.2088, 106.8456], 'Jakarta': [-6.2088, 106.8456],
        'Manila, Philippines': [14.5995, 120.9842], 'Manila': [14.5995, 120.9842],
        'Istanbul, Turkey': [41.0082, 28.9784], 'Istanbul': [41.0082, 28.9784],
        'Cairo, Egypt': [30.0444, 31.2357], 'Cairo': [30.0444, 31.2357],
        'Lagos, Nigeria': [6.5244, 3.3792], 'Lagos': [6.5244, 3.3792],
        'São Paulo, Brazil': [-23.5558, -46.6396], 'São Paulo': [-23.5558, -46.6396],
        'Mexico City, Mexico': [19.4326, -99.1332], 'Mexico City': [19.4326, -99.1332],
        'Buenos Aires, Argentina': [-34.6118, -58.3960], 'Buenos Aires': [-34.6118, -58.3960],

        // Popular Tourist Destinations
        'Shirdi Sai Baba Temple': [19.7645, 74.4769], 'Shirdi': [19.7645, 74.4769],
        'Lonavala Hill Station': [18.7537, 73.4068], 'Lonavala': [18.7537, 73.4068],
        'Mahabaleshwar': [17.9220, 73.6581], 'Goa': [15.2993, 74.1240],
        'Ajanta Caves': [20.5519, 75.7033], 'Ellora Caves': [20.0269, 75.1789],
        'Rishikesh': [30.0869, 78.2676], 'Haridwar': [29.9457, 78.1642],
        'Manali': [32.2396, 77.1887], 'Shimla': [31.1048, 77.1734],
        'Darjeeling': [27.0360, 88.2627], 'Ooty': [11.4064, 76.6932],
        'Kodaikanal': [10.2381, 77.4892], 'Mount Abu': [24.5925, 72.7156],
        'Munnar': [10.0889, 77.0595], 'Coorg': [12.3375, 75.8069],
        'Hampi': [15.3350, 76.4600], 'Khajuraho': [24.8318, 79.9199],
        'Konark': [19.8876, 86.0943], 'Puri': [19.8135, 85.8312]
    };

    // Try exact match first
    if (locations[locationName]) {
        return locations[locationName];
    }

    // Try partial match
    const lowerName = locationName.toLowerCase();
    for (const [key, coords] of Object.entries(locations)) {
        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
            return coords;
        }
    }

    return null;
}

function parseCoordinatesFromInput(input) {
    // Try to parse coordinates in format "lat, lng"
    const coordPattern = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;
    const match = input.match(coordPattern);
    if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
}



function clearSafeRoutesForm() {
    document.getElementById('srStart').value = '';
    document.getElementById('srDest').value = '';
    // Clear markers
    if (startMarker && map) {
        map.removeLayer(startMarker);
        startMarker = null;
    }
    if (destMarker && map) {
        map.removeLayer(destMarker);
        destMarker = null;
    }
    // Clear route
    if (currentRouteLayer && map) {
        map.removeLayer(currentRouteLayer);
        currentRouteLayer = null;
    }
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        const button = document.getElementById('srUseCurrent');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting...';
        button.disabled = true;

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('srStart').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

                // Add marker on map
                if (startMarker && map) {
                    map.removeLayer(startMarker);
                }
                startMarker = L.marker([lat, lng]).addTo(map);
                startMarker.bindPopup('Start Location (Current)').openPopup();

                button.innerHTML = originalText;
                button.disabled = false;
                showNotification('Current location set as start point!', 'success');
            },
            function (error) {
                console.error('Error getting location:', error);
                button.innerHTML = originalText;
                button.disabled = false;
                showNotification('Failed to get current location. Please check permissions.', 'error');
            }
        );
    } else {
        showNotification('Geolocation is not supported by this browser.', 'error');
    }
}

function pickStartLocation() {
    pickingStart = true;
    pickingDest = false;
    if (map) {
        map.on('click', handleMapClick);
        showNotification('Click on the map to select start location.', 'info');
    }
}

function pickDestinationLocation() {
    pickingStart = false;
    pickingDest = true;
    if (map) {
        map.on('click', handleMapClick);
        showNotification('Click on the map to select destination.', 'info');
    }
}

function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (pickingStart) {
        document.getElementById('srStart').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (startMarker && map) {
            map.removeLayer(startMarker);
        }
        startMarker = L.marker([lat, lng]).addTo(map);
        startMarker.bindPopup('Start Location').openPopup();
        pickingStart = false;
        showNotification('Start location selected!', 'success');
    } else if (pickingDest) {
        document.getElementById('srDest').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (destMarker && map) {
            map.removeLayer(destMarker);
        }
        destMarker = L.marker([lat, lng]).addTo(map);
        destMarker.bindPopup('Destination').openPopup();
        pickingDest = false;
        showNotification('Destination selected!', 'success');
    }

    // Remove click handler after selection
    if (!pickingStart && !pickingDest && map) {
        map.off('click', handleMapClick);
    }
}

function findSafeRoutes() {
    const startInput = document.getElementById('srStart').value.trim();
    const destInput = document.getElementById('srDest').value.trim();

    if (!startInput || !destInput) {
        showNotification('Please select both start and destination locations.', 'warning');
        return;
    }

    const button = document.getElementById('srFind');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding...';
    button.disabled = true;

    // Parse coordinates
    const startCoords = parseCoordinates(startInput);
    const destCoords = parseCoordinates(destInput);

    if (!startCoords || !destCoords) {
        showNotification('Invalid coordinate format. Use "lat, lng" format.', 'error');
        button.innerHTML = originalText;
        button.disabled = false;
        return;
    }

    // Call backend API to find safe routes
    fetchSafeRoutes(startCoords, destCoords)
        .then(routes => {
            displaySafeRoutes(routes, startCoords, destCoords);
            button.innerHTML = originalText;
            button.disabled = false;
            showNotification('Safe routes found and displayed!', 'success');
        })
        .catch(error => {
            console.error('Error finding routes:', error);
            button.innerHTML = originalText;
            button.disabled = false;
            showNotification('Failed to find safe routes. Please try again.', 'error');
        });
}

function parseCoordinates(coordString) {
    const parts = coordString.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
    }
    return null;
}

function fetchSafeRoutes(startCoords, destCoords) {
    const requestData = {
        start: { lat: startCoords.lat, lng: startCoords.lng },
        destination: { lat: destCoords.lat, lng: destCoords.lng }
    };

    return fetch(`${API_BASE_URL}/api/routes/calculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to calculate route');
            }
            return response.json();
        })
        .then(data => {
            if (data.route) {
                // Convert backend response to frontend format
                const route = {
                    waypoints: data.route.waypoints.map(point => [point.lat, point.lng]),
                    distance: data.route.distance,
                    safety: data.route.safety,
                    estimatedTime: data.route.estimatedTime
                };
                return [route];
            } else {
                throw new Error('Invalid route response');
            }
        })
        .catch(error => {
            console.error('Error fetching safe routes:', error);
            // Fallback to simple route calculation
            const route = {
                waypoints: [
                    [startCoords.lat, startCoords.lng],
                    [(startCoords.lat + destCoords.lat) / 2, (startCoords.lng + destCoords.lng) / 2],
                    [destCoords.lat, destCoords.lng]
                ],
                distance: calculateDistance(startCoords, destCoords),
                safety: 'Medium'
            };
            return [route];
        });
}

function calculateDistance(coord1, coord2) {
    // Simple distance calculation (Haversine formula approximation)
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c; // Distance in km
}

function displaySafeRoutes(routes, startCoords, destCoords) {
    if (!routes || routes.length === 0) return;

    // Clear existing route
    if (currentRouteLayer && map) {
        map.removeLayer(currentRouteLayer);
    }

    const route = routes[0]; // Use first route for now

    // Create route polyline
    currentRouteLayer = L.polyline(route.waypoints, {
        color: '#10b981',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map);

    // Add popup with route info
    const distance = route.distance.toFixed(2);
    const safety = route.safety;
    const estimatedTime = route.estimatedTime ? `${route.estimatedTime} min` : 'N/A';

    currentRouteLayer.bindPopup(`
        📏 Distance: <b>${distance} km</b><br>
        ⏱️ Travel time: <b>${estimatedTime}</b><br>
        🛣️ Via: <b>Safe Routes</b>
    `, { closeButton: false }).openPopup();

    // Fit map to show the entire route
    map.fitBounds(currentRouteLayer.getBounds(), { padding: [20, 20] });
}

function clearSafeRoutes() {
    clearSafeRoutesForm();
    showNotification('Safe routes cleared!', 'info');
}

function getSafetyColor(safety) {
    switch (safety.toLowerCase()) {
        case 'high': return '#10b981'; // Green
        case 'medium': return '#f59e0b'; // Orange
        case 'low': return '#ef4444'; // Red
        default: return '#6b7280'; // Gray
    }
}

// =============== CHARTS INITIALIZATION ===============
function initializeCharts() {
    // Density Chart
    const densityCtx = document.getElementById('densityChart').getContext('2d');
    charts.density = new Chart(densityCtx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(),
            datasets: [{
                label: 'Crowd Density',
                data: generateDensityData(),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'People per m²'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });

    // Predictions Chart
    const predictionsCtx = document.getElementById('predictionsChart').getContext('2d');
    charts.predictions = new Chart(predictionsCtx, {
        type: 'bar',
        data: {
            labels: ['Next Hour', 'Next 2 Hours', 'Next 3 Hours'],
            datasets: [{
                label: 'Predicted Crowd Count (sum of zones)',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    '#10b981',
                    '#f59e0b',
                    '#10b981'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Predicted Crowd Count (sum of zones)'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            }
        }
    });
}

function initializeAnalyticsCharts() {
    // Hourly Chart
    const hourlyCtx = document.getElementById('hourlyChart');
    if (hourlyCtx && !charts.hourly) {
        charts.hourly = new Chart(hourlyCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00'),
                datasets: [{
                    label: 'Hourly Crowd Pattern (Today)',
                    data: Array(24).fill(0),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Density (people/m²)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Zone Chart
    const zoneCtx = document.getElementById('zoneChart');
    if (zoneCtx && !charts.zone) {
        charts.zone = new Chart(zoneCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Safe Zones', 'Warning Zones', 'Critical Zones'],
                datasets: [{
                    data: [0, 0, 0], // Set all to 0
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutBounce'
                }
            }
        });
    }

    // Prediction Chart
    const predictionCtx = document.getElementById('predictionChart');
    if (predictionCtx && !charts.prediction) {
        charts.prediction = new Chart(predictionCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Now', '+15m', '+30m', '+45m', '+1h', '+1h15m', '+1h30m'],
                datasets: [{
                    label: 'Current Trend',
                    data: [0, 0, 0, 0, 0, 0, 0], // Set all to 0
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }, {
                    label: 'AI Prediction',
                    data: [null, null, null, 0, 0, 0, 0], // Set all to 0
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Density (people/m²)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
}

// =============== DATA GENERATION ===============
function updateHourlyChartFromDensity(densityData) {
    if (!Array.isArray(densityData) || densityData.length === 0) return;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Aggregate counts per hour for today
    const hourly = Array(24).fill(0);
    densityData.forEach(it => {
        if (!it || !it.timestamp) return;
        const d = new Date(it.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key === todayKey) {
            const hr = d.getHours();
            hourly[hr] += Number(it.count) || 0;
        }
    });

    const labels = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');

    // Ensure chart exists
    if (!charts.hourly) {
        const hourlyCtx = document.getElementById('hourlyChart');
        if (hourlyCtx) {
            charts.hourly = new Chart(hourlyCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Hourly Crowd Pattern (Today)',
                        data: hourly,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'People (sum per hour)' } },
                        x: { title: { display: true, text: 'Hour of Day' } }
                    },
                    animation: { duration: 2000, easing: 'easeInOutQuart' }
                }
            });
        }
        return;
    }

    charts.hourly.data.labels = labels;
    charts.hourly.data.datasets[0].data = hourly;
    charts.hourly.update('none');
}

function generateSimulatedData() {
    // Set all density data to 0
    simulatedData.density = generateDensityData();

    // No alerts generated - keep empty
    simulatedData.alerts = [];

    // No routes - keep empty
    simulatedData.routes = [];

    // Set analytics data to 0/None
    simulatedData.analytics = {
        totalPeople: 0,
        avgDensity: 0.0,
        peakHours: 'None',
        riskLevel: 'None'
    };
}

function updateAnalyticsFromDensity(densityData) {
    try {
        // Locate chart canvas and prepare a container for details
        let details = document.getElementById('zoneDistributionDetails');

        if (!Array.isArray(densityData) || densityData.length === 0) {
            if (charts.zone) {
                charts.zone.data.datasets[0].data = [0, 0, 0];
                charts.zone.update('none');
            }
            if (details) {
                details.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px; background: var(--light-bg); border-radius: 8px;">No zone data available from the database.</div>';
            }
            return;
        }

        // Determine latest record per zoneId
        const latestByZone = new Map();
        densityData.forEach(item => {
            if (!item || item.zoneId == null) return;
            const ts = item.timestamp ? new Date(item.timestamp).getTime() : 0;
            const prev = latestByZone.get(item.zoneId);
            if (!prev || ts > prev._ts) {
                latestByZone.set(item.zoneId, Object.assign({}, item, { _ts: ts }));
            }
        });

        let safe = 0, warning = 0, critical = 0;
        latestByZone.forEach(it => {
            // The property from the backend is `density` and it's a string 'Low', 'Medium', 'High'
            const densityLevel = (it.density || 'low').toString().toLowerCase();
            if (densityLevel === 'high') critical++;
            else if (densityLevel === 'medium') warning++;
            else safe++; // Default to safe if 'low' or unknown
        });

        const total = safe + warning + critical;
        if (charts.zone) {
            charts.zone.data.datasets[0].data = [safe, warning, critical];
            charts.zone.update('none');
        }

        // Render textual summary and per-zone table
        if (details) {
            const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
            let html = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-bottom: 15px;">
                    <div style="background:rgba(16,185,129,0.1); color:#10b981; padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size: 1.2rem; font-weight: bold;">${safe}</div>
                        <div style="font-size: 0.8rem;">Safe Zones (${pct(safe)}%)</div>
                    </div>
                    <div style="background:rgba(245,158,11,0.1); color:#f59e0b; padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size: 1.2rem; font-weight: bold;">${warning}</div>
                        <div style="font-size: 0.8rem;">Warning Zones (${pct(warning)}%)</div>
                    </div>
                    <div style="background:rgba(239,68,68,0.1); color:#ef4444; padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size: 1.2rem; font-weight: bold;">${critical}</div>
                        <div style="font-size: 0.8rem;">Critical Zones (${pct(critical)}%)</div>
                    </div>
                </div>
            `;

            // Build table
            html += `
                <div class="analytics-table-container">
                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th>Zone ID</th>
                                <th style="text-align:right;">People</th>
                                <th>Density</th>
                                <th>Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const rows = Array.from(latestByZone.values())
                .sort((a, b) => (a.zoneId ?? 0) - (b.zoneId ?? 0));

            rows.forEach(r => {
                const z = r.zoneId != null ? `Zone ${r.zoneId}` : '-';
                const c = r.count != null ? r.count : 'N/A';
                const d = r.density != null ? r.density : 'N/A';
                const t = r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'N/A';
                const color = getDensityColor(d);
                html += `
                    <tr>
                        <td class="zone-id-cell">${z}</td>
                        <td style="text-align:right;">${c}</td>
                        <td style="color:${color}; font-weight:600;">${d}</td>
                        <td class="timestamp-cell">${t}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            details.innerHTML = html;
        }
    } catch (e) {
        console.warn('Failed to update analytics from density', e);
    }
}

function generateSimulatedData() {
    // Set all density data to 0
    simulatedData.density = generateDensityData();

    // No alerts generated - keep empty
    simulatedData.alerts = [];

    // No routes - keep empty
    simulatedData.routes = [];

    // Set analytics data to 0/None
    simulatedData.analytics = {
        totalPeople: 0,
        avgDensity: 0.0,
        peakHours: 'None',
        riskLevel: 'None'
    };
}

function generateTimeLabels() {
    const labels = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 5 * 60000); // 5 minutes intervals
        labels.push(time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }));
    }
    return labels;
}

function generateDensityData() {
    const data = [];
    for (let i = 0; i < 12; i++) {
        // Set all density data to 0
        data.push(0);
    }
    return data;
}

// =============== DATA UPDATES ===============
function startDataUpdates() {
    updateInterval = setInterval(() => {
        if (isLoggedIn) {
            fetchDensityData();
            fetchAlerts();
            updateStatusIndicators();
            // Analytics are derived from backend density data; no periodic zeroing
        }
    }, 5000); // Update every 5 seconds
    // Start the database scan process on the analytics page
    if (currentPage === 'analytics') startDatabaseScan();
}

function updateCharts() {
    if (charts.density) {
        charts.density.data.labels = generateTimeLabels();
        charts.density.data.datasets[0].data = generateDensityData(); // Will return all 0s
        charts.density.update('none');
    }

    if (charts.predictions) {
        // Keep predictions at 0
        charts.predictions.data.datasets[0].data = [0, 0, 0];
        charts.predictions.update('none');
    }
}

function updateStatusIndicators() {
    // If camera is active, do not override live values
    if (cameraActive) return;

    // Keep all status indicators at 0 when camera is off
    const safeZones = 0;
    const warningZones = 0;
    const criticalZones = 0;
    const peopleCount = 0;

    document.querySelector('.status-safe span').textContent = `Safe Zones: ${safeZones}`;
    document.querySelector('.status-warning span').textContent = `Warning Zones: ${warningZones}`;
    document.querySelector('.status-critical span').textContent = `Critical Zones: ${criticalZones}`;
    document.querySelector('.status-indicator:last-child span').textContent = `People Count: ${peopleCount}`;
}

function updateAnalytics() {
    // No-op: analytics are updated from backend density data and reset daily.
    checkDailyResetAnalytics();
}

function animateCounter(elementId, targetValue, decimals = 0) {
    const element = document.getElementById(elementId);
    const startValue = parseFloat(element.textContent) || 0;
    const increment = (targetValue - startValue) / 50;
    let currentValue = startValue;

    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= targetValue) ||
            (increment < 0 && currentValue <= targetValue)) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = decimals > 0 ? currentValue.toFixed(decimals) : Math.floor(currentValue);
    }, 20);
}

// =============== ALERTS MANAGEMENT ===============
function addNewAlert(alertData) {
    // De-dup notifications within the session (unless noDedup is set)
    const type = (alertData.type || 'info').toString().toLowerCase();
    const message = alertData.message || 'Alert';
    const zoneId = alertData.zoneId != null ? alertData.zoneId : 1;
    const key = makeAlertKey(type, message, zoneId);
    if (!alertData || alertData.noDedup !== true) {
        if (shownAlertKeys.has(key)) {
            return; // skip duplicate
        }
        shownAlertKeys.add(key);
    }

    // Show alert as a pop-up/side notification, not inside camera feed
    const notifType = type === 'critical' ? 'error' : (type === 'warning' ? 'warning' : 'info');
    try { showNotification(message, notifType); } catch (_) { }

    // Persist to backend/MySQL for sequential storage with duplicate prevention
    try {
        const typeRaw = (alertData.type || 'info').toString();
        const normalizedType = typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase();
        const alertKey = `${normalizedType}_${zoneId}`;
        const now = Date.now();

        // Check if we recently saved this same alert (within 30 seconds)
        const lastSaved = lastSavedAlerts.get(alertKey);
        if (lastSaved && (now - lastSaved) < 30000) {
            console.log('Skipping duplicate alert save via addNewAlert:', alertKey);
            return;
        }

        // Update last saved time
        lastSavedAlerts.set(alertKey, now);

        const timestamp = new Date().toISOString();
        fetch(`${API_BASE_URL}/api/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zoneId, type: normalizedType, message, status: 'active', timestamp })
        }).then(response => {
            if (response.ok) {
                console.log('Alert saved to database via addNewAlert:', { zoneId, type: normalizedType, message });
                try { fetchAlerts(); } catch (_) { }
            }
        }).catch(err => console.error('Error saving alert:', err));
    } catch (e) {
        console.error('Alert persist error:', e);
    }

    // Keep notification visible by default for 5s via showNotification()
}

// =============== SETTINGS MANAGEMENT ===============
function setupSettingsToggles() {
    const toggles = document.querySelectorAll('.toggle-switch');

    toggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            this.classList.toggle('active');

            // Handle specific toggle actions
            if (this.id === 'darkModeToggle') {
                toggleTheme();
            }

            // Add bounce animation
            this.style.animation = 'toggleBounce 0.3s ease-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    });

    // Sync dark mode toggle with current theme
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const isDark = document.body.classList.contains('dark-mode');
        if (isDark) {
            darkModeToggle.classList.add('active');
        }
    }
}

function saveSettings() {
    // Simulate saving settings
    const button = event.target;
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    button.disabled = true;

    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Saved!';
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1000);
    }, 1500);
}

// =============== HEATMAP SUMMARY CONTROLS ===============
function exportHeatmapData() {
    const button = document.getElementById('exportHeatmap');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    button.disabled = true;

    // Simulate data export
    setTimeout(() => {
        // Create sample data for export
        const exportData = {
            timestamp: new Date().toISOString(),
            currentDensity: document.getElementById('currentDensity').textContent,
            safeZones: document.getElementById('safeZonesCount').textContent,
            warningZones: document.getElementById('warningZonesCount').textContent,
            criticalZones: document.getElementById('criticalZonesCount').textContent,
            lastUpdate: document.getElementById('lastUpdateTime').textContent
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `heatmap-summary-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        button.innerHTML = '<i class="fas fa-check"></i> Exported!';
        showNotification('Heatmap data exported successfully!', 'success');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }, 1500);
}

function resetHeatmapView() {
    const button = document.getElementById('resetHeatmap');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    button.disabled = true;

    // Reset map view to default
    setTimeout(() => {
        if (map) {
            map.setView([19.9975, 73.7898], 13); // Reset to Nashik coordinates

            // Reset heatmap summary data
            document.getElementById('currentDensity').textContent = 'Low';
            document.getElementById('safeZonesCount').textContent = '0';
            document.getElementById('warningZonesCount').textContent = '0';
            document.getElementById('criticalZonesCount').textContent = '0';
            document.getElementById('totalPeopleCount').textContent = '0';
            document.getElementById('lastUpdateTime').textContent = 'Just now';

            // Reset status indicators people count
            document.querySelector('.status-indicator:last-child span').textContent = 'People Count: 0';

            // Reset status indicators
            updateStatusIndicators();

            // Remove any active routes
            if (window.currentRoute) {
                map.removeLayer(window.currentRoute);
                window.currentRoute = null;
            }

            // Reset safe routes button
            const safeRoutesBtn = document.getElementById('safeRoutes');
            if (safeRoutesBtn.classList.contains('active')) {
                safeRoutesBtn.classList.remove('active');
                safeRoutesBtn.innerHTML = '<i class="fas fa-route"></i> Show Safe Routes';
            }
        }

        button.innerHTML = '<i class="fas fa-check"></i> Reset!';
        showNotification('Heatmap view reset successfully!', 'success');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }, 1000);
}

function toggleHeatmapLayers() {
    const button = document.getElementById('toggleHeatmap');
    const isActive = button.classList.contains('active');

    if (!isActive) {
        // Show all heatmap layers
        button.classList.add('active');
        button.innerHTML = '<i class="fas fa-layer-group"></i> Hide Layers';

        // Add all sample markers if not already present
        if (map) {
            // Ensure all zones are visible
            addSampleMarkers();

            // Add additional heatmap overlay if available
            if (!window.heatmapOverlay) {
                // Create a simple heatmap overlay (placeholder)
                const bounds = [[19.99, 73.78], [20.01, 73.80]];
                window.heatmapOverlay = L.rectangle(bounds, {
                    color: 'rgba(255, 0, 0, 0.1)',
                    fillColor: 'rgba(255, 0, 0, 0.1)',
                    fillOpacity: 0.1,
                    weight: 0
                }).addTo(map);
            }
        }

        showNotification('All heatmap layers enabled!', 'info');
    } else {
        // Hide heatmap layers
        button.classList.remove('active');
        button.innerHTML = '<i class="fas fa-layer-group"></i> Toggle Layers';

        // Remove heatmap overlay
        if (window.heatmapOverlay && map) {
            map.removeLayer(window.heatmapOverlay);
            window.heatmapOverlay = null;
        }

        showNotification('Heatmap layers hidden!', 'info');
    }
}

// =============== BACKEND API INTEGRATION ===============
// Function to fetch and display density data from backend
function fetchDensityData() {
    fetch("http://localhost:8080/api/density")
        .then(response => response.json())
        .then(data => {
            console.log("Density Data from Backend:", data);
            // Update UI with real data from backend
            updateDensityUI(data);
            // Update Hourly Crowd Pattern chart from backend data
            try { updateHourlyChartFromDensity(data); } catch (e) { console.warn('Hourly chart update failed:', e); }
            // Update analytics for today based on backend data
            try { updateAnalyticsFromDensity(data); } catch (e) { console.warn('Analytics update failed:', e); }
        })
        .catch(error => console.error("Error fetching density data:", error));
}

// Function to fetch and display alerts from backend
function fetchAlerts() {
    fetch(`${API_BASE_URL}/api/alerts`)
        .then(response => response.json())
        .then(data => {
            console.log("Alerts from Backend:", data);
            // Update UI with real alerts from backend
            updateAlertsUI(data);
        })
        .catch(error => console.error("Error fetching alerts:", error));

    // Also fetch and render alert history
    fetch(`${API_BASE_URL}/api/alerts/history`)
        .then(response => response.json())
        .then(history => {
            updateAlertHistoryUI(history);
            adjustPredictionFromAlerts(history);
        })
        .catch(err => console.error("Error fetching alert history:", err));
}

// Function to fetch and display routes from backend
function fetchRoutes() {
    fetch(`${API_BASE_URL}/api/routes`)
        .then(response => response.json())
        .then(data => {
            console.log("Routes from Backend:", data);
            // Update UI with real routes from backend
            updateRoutesUI(data);
        })
        .catch(error => console.error("Error fetching routes:", error));
}

// Fetch database-driven forecast and update chart + table
function fetchForecast() {
    fetch(`${API_BASE_URL}/api/forecast`)
        .then(response => response.json())
        .then(payload => {
            const zones = Array.isArray(payload && payload.zones) ? payload.zones : [];
            const totals = [0, 0, 0];
            zones.forEach(z => {
                const fc = Array.isArray(z.forecast) ? z.forecast : [];
                totals[0] += Number(fc[0] || 0);
                totals[1] += Number(fc[1] || 0);
                totals[2] += Number(fc[2] || 0);
            });

            if (charts.predictions) {
                charts.predictions.data.datasets[0].data = totals.map(v => Math.round(v));
                charts.predictions.update('none');
            }

            renderForecastTable(zones);
        })
        .catch(error => console.error("Error fetching forecast:", error));
}

function renderForecastTable(zones) {
    try {
        const canvas = document.getElementById('predictionsChart');
        if (!canvas || !canvas.parentNode) return;

        let container = document.getElementById('forecastTableContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'forecastTableContainer';
            container.style.marginTop = '12px';
            canvas.parentNode.appendChild(container);
        }

        if (!Array.isArray(zones) || zones.length === 0) {
            container.innerHTML = '<div style="color:#6b7280; font-size:0. nine rem;">No forecast data available.</div>'.replace(' nine ', '9');
            return;
        }

        let html = '<div style="overflow-x:auto;">';
        html += '<table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">';
        html += '<thead><tr>' +
            '<th style="text-align:left; padding:8px; border-bottom:1px solid var(--border-light);">Zone</th>' +
            '<th style="text-align:right; padding:8px; border-bottom:1px solid var(--border-light);">+1</th>' +
            '<th style="text-align:right; padding:8px; border-bottom:1px solid var(--border-light);">+2</th>' +
            '<th style="text-align:right; padding:8px; border-bottom:1px solid var(--border-light);">+3</th>' +
            '</tr></thead><tbody>';

        zones.forEach(z => {
            const zoneId = z.zoneId != null ? z.zoneId : '-';
            const fc = Array.isArray(z.forecast) ? z.forecast : [];
            const f1 = Math.round(Number(fc[0] || 0));
            const f2 = Math.round(Number(fc[1] || 0));
            const f3 = Math.round(Number(fc[2] || 0));
            html += '<tr>' +
                `<td style="padding:8px; border-bottom:1px solid var(--border-light);">Zone ${zoneId}</td>` +
                `<td style="padding:8px; text-align:right; border-bottom:1px solid var(--border-light);">${f1}</td>` +
                `<td style="padding:8px; text-align:right; border-bottom:1px solid var(--border-light);">${f2}</td>` +
                `<td style="padding:8px; text-align:right; border-bottom:1px solid var(--border-light);">${f3}</td>` +
                '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        console.warn('Failed to render forecast table', e);
    }
}

function updateDensityUI(densityData) {
    if (!densityData || densityData.length === 0) return;

    console.log("Updating UI with density data:", densityData);

    // Update charts with real data
    if (charts.density) {
        const latestData = densityData.slice(0, 12); // Get latest 12 data points
        const counts = latestData.map(item => item.count);
        const labels = latestData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        });

        charts.density.data.labels = labels;
        charts.density.data.datasets[0].data = counts;
        charts.density.update('none');
    }

    // Update predictions chart with simple moving average forecast
    if (charts.predictions && densityData.length >= 3) {
        const lastThree = densityData.slice(-3).map(item => item.count);
        const movingAvg = lastThree.reduce((sum, val) => sum + val, 0) / lastThree.length;

        charts.predictions.data.datasets[0].data = [
            movingAvg * 1.1,  // +10% for next hour
            movingAvg * 1.2,  // +20% for next 2 hours
            movingAvg * 0.9   // -10% for next 3 hours (conservative estimate)
        ];
        charts.predictions.update('none');
    }

    // Update status indicators only when camera is active; otherwise keep zeros
    const latestDensity = densityData[0];
    if (cameraActive && latestDensity) {
        updateStatusIndicatorsWithRealData(latestDensity);
    } else if (!cameraActive) {
        updateStatusIndicators();
    }
}

function updateStatusIndicatorsWithRealData(densityData) {
    const count = densityData.count;
    const densityLevel = densityData.density;

    // Update people count
    document.querySelector('.status-indicator:last-child span').textContent = `People Count: ${count}`;

    // Update zone status based on density level
    let safeZones = 0;
    let warningZones = 0;
    let criticalZones = 0;

    if (densityLevel === 'Low') {
        safeZones = 1;
    } else if (densityLevel === 'Medium') {
        warningZones = 1;
    } else if (densityLevel === 'High') {
        criticalZones = 1;
    }

    document.querySelector('.status-safe span').textContent = `Safe Zones: ${safeZones}`;
    document.querySelector('.status-warning span').textContent = `Warning Zones: ${warningZones}`;
    document.querySelector('.status-critical span').textContent = `Critical Zones: ${criticalZones}`;

    // Add alert for high density
    if (densityLevel === 'High') {
        addNewAlert({
            type: 'critical',
            message: `High crowd density detected! ${count} people in Zone ${densityData.zoneId}`,
            icon: 'users',
            color: '#ef4444'
        });
    }
}

// Update UI with alerts
function updateAlertsUI(alertsData) {
    // Show only the latest alert as a notification (skip older and test messages)
    if (!Array.isArray(alertsData) || alertsData.length === 0) return;

    let latest = alertsData[0];
    if (alertsData.length > 1) {
        latest = alertsData.slice().sort((a, b) => {
            const ta = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        })[0];
    }

    const message = latest && latest.message ? latest.message : 'Alert';

    // Skip test messages
    if (message.includes('Test:') || message.includes('Exactly 2 people detected')) {
        return;
    }

    const type = (latest.type || 'info').toString().toLowerCase();
    const zoneId = latest && latest.zoneId != null ? latest.zoneId : 1;
    const key = makeAlertKey(type, message, zoneId);
    if (shownAlertKeys.has(key)) return;
    shownAlertKeys.add(key);

    const notifType = type === 'critical' ? 'error' : (type === 'warning' ? 'warning' : 'info');
    try { showNotification(message, notifType); } catch (_) { }
}

// Update UI with routes
function updateRoutesUI(routesData) {
    // Implement logic to display real routes
    console.log("Updating routes UI with:", routesData);
    // You can update the safe routes display here
}

// Render Live Alert History (Last 24 Hours Only)
function updateAlertHistoryUI(history) {
    const container = document.getElementById('alertHistoryContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!history || history.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No alerts in last 24 hours</div>';
        return;
    }

    // Filter alerts from last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAlerts = history.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime >= twentyFourHoursAgo;
    });

    if (recentAlerts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No alerts in last 24 hours</div>';
        return;
    }

    recentAlerts.forEach(alert => {
        const time = alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '';
        const color = alert.type && alert.type.toLowerCase() === 'critical' ? 'var(--danger-color)' : (alert.type && alert.type.toLowerCase() === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)');
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.cssText = 'padding: 15px; border-bottom: 1px solid var(--border-light); animation: historyFade 0.5s ease-out;';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: ${color};">${alert.type} - Zone ${alert.zoneId}</strong>
                    <p style="color: #6b7280; font-size: 0.9rem; margin-top: 5px;">${alert.message}</p>
                </div>
                <span style="color: #6b7280; font-size: 0.8rem;">${time}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// Adjust Analytics AI Prediction Models based on recent alerts
function adjustPredictionFromAlerts(history) {
    if (!charts.prediction) return;
    if (!history || history.length === 0) return;

    // Compute a simple severity score from the last N alerts
    const lastN = history.slice(0, 5);
    let score = 0; // base
    lastN.forEach(a => {
        const t = (a.type || '').toLowerCase();
        if (t === 'critical') score += 3;
        else if (t === 'warning') score += 2;
        else score += 1; // info/other
    });

    // Map score into a [0..3] adjustment range
    const adj = Math.min(3, Math.max(0, score / (lastN.length * 3) * 3));

    // Update the AI Prediction dataset second series (AI Prediction)
    const ds = charts.prediction.data.datasets[1];
    if (ds) {
        // Ensure some baseline shape then add adjustment
        const base = [null, null, null, 0.8, 1.2, 1.4, 1.6];
        ds.data = base.map(v => (v == null ? null : Math.min(3, v + adj)));
        charts.prediction.update('none');
    }
}

// Initial fetch calls when dashboard loads
function initializeBackendIntegration() {
    fetchDensityData();
    fetchAlerts();
    fetchRoutes();
    fetchForecast();

    // Set up auto-refresh for backend data
    setInterval(fetchDensityData, 10000);
    setInterval(fetchAlerts, 15000); // Refresh alerts every 15 seconds
    setInterval(fetchRoutes, 20000); // Refresh routes every 20 seconds
    setInterval(fetchForecast, 12000); // Refresh forecasts every 12 seconds
}

// Modify the showDashboard function to include backend integration
function showLoginPage() {
    const welcomePage = document.getElementById('welcomePage');
    const loginPage = document.getElementById('loginPage');
    const testReviewPopup = document.getElementById('testReviewPopup');
    const loginPanel = document.querySelector('.login-panel');

    if (welcomePage && loginPage) {
        welcomePage.style.opacity = '0';
        welcomePage.style.visibility = 'hidden';
        welcomePage.style.transition = 'opacity 0.8s ease-out, visibility 0.8s ease-out';

        loginPage.style.opacity = '1';
        loginPage.style.visibility = 'visible';
        loginPage.classList.add('active-animated');

        // Always show the review popup first and hide the login form
        if (testReviewPopup) {
            testReviewPopup.classList.remove('hide-popup');
            testReviewPopup.classList.add('visible');
        }
        if (loginPanel) {
            loginPanel.classList.remove('show-panel');
        }
    }
}

function showDashboard() {
    document.getElementById('welcomePage').style.display = 'none'; // Ensure welcome page is hidden
    document.getElementById('loginPage').style.display = 'none'; // Ensure login page is hidden
    document.getElementById('app').classList.add('active');
    isLoggedIn = true;

    // Hide test review popup if it's visible
    const testReviewPopup = document.getElementById('testReviewPopup');
    if (testReviewPopup) {
        testReviewPopup.style.display = 'none';
        testReviewPopup.classList.remove('visible'); // Trigger fade-out animation
        // After animation, set display to none to remove from layout
        setTimeout(() => {
            testReviewPopup.style.display = 'none';
        }, 500); // Match CSS transition duration (0.5s)
    }

    // Initialize dashboard components
    setTimeout(() => {
        initializeMap();
        initializeCharts();
        startDataUpdates();
        initializeBackendIntegration(); // Add backend integration
        // Immediately fetch alerts and history so they're visible after refresh
        try { fetchAlerts(); } catch (_) { }
        try { fetchDensityData(); } catch (_) { }
    }, 500);
}

// =============== UTILITY FUNCTIONS ===============
function showNotification(message, type = 'info') {
    // Show only the latest notification; drop older ones
    if (!Array.isArray(window.notificationQueue)) window.notificationQueue = [];
    if (typeof window.notificationActive !== 'boolean') window.notificationActive = false;

    // Replace queue with the newest message
    window.notificationQueue = [{ message, type }];

    // Cancel any active notification immediately
    try {
        if (window.currentNotificationEl && window.currentNotificationEl.parentNode) {
            window.currentNotificationEl.parentNode.removeChild(window.currentNotificationEl);
        }
    } catch (_) { }
    window.currentNotificationEl = null;
    window.notificationActive = false;

    processNotificationQueue();
}

function processNotificationQueue() {
    if (window.notificationActive) return;
    if (!Array.isArray(window.notificationQueue) || window.notificationQueue.length === 0) return;

    // Always pick the latest item and drop the rest
    const { message, type } = window.notificationQueue.pop();
    window.notificationQueue = [];
    window.notificationActive = true;

    const notification = document.createElement('div');
    notification.className = 'notification';

    const t = (type || 'info').toString().toLowerCase();
    const bg = t === 'error' ? 'var(--danger-color)'
        : t === 'success' ? 'var(--success-color)'
            : t === 'warning' ? 'var(--warning-color)'
                : 'var(--primary-color)';

    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    window.currentNotificationEl = notification;

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            window.currentNotificationEl = null;
            window.notificationActive = false;
            // In case a newer message arrived while this was visible
            processNotificationQueue();
        }, 300);
    }, 5000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.8);
                }
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.7) translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes alertSlide {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes historyFade {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .dark-mode .settings-section {
                background: var(--dark-secondary) !important;
                border-color: var(--border-dark) !important;
            }

            .dark-mode .setting-item {
                border-bottom-color: var(--border-dark) !important;
            }

            .dark-mode .alert-card {
                background: var(--dark-secondary) !important;
                border-color: var(--border-dark) !important;
            }

            .dark-mode .history-container {
                background: var(--dark-secondary) !important;
                border-color: var(--border-dark) !important;
            }

            .dark-mode input, .dark-mode select {
                background: var(--dark-tertiary) !important;
                border-color: var(--border-dark) !important;
                color: var(--text-light) !important;
            }
        `;
document.head.appendChild(notificationStyles);

// =============== ERROR HANDLING ===============
window.addEventListener('error', function (e) {
    console.error('Application Error:', e.error);
    showNotification('An error occurred. Please refresh the page.', 'error');
});

// =============== PERFORMANCE MONITORING ===============
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
}

// Log performance after page load
window.addEventListener('load', logPerformance);

// =============== ACCESSIBILITY FEATURES ===============
document.addEventListener('keydown', function (e) {
    // ESC key to close modals/sidebar
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    // Alt + number keys for quick navigation
    if (e.altKey) {
        switch (e.key) {
            case '1':
                showPage('dashboard');
                break;
            case '2':
                showPage('alerts');
                break;
            case '3':
                showPage('analytics');
                break;
            case '4':
                showPage('settings');
                break;
        }
    }
});

// Initialize tooltips
function initializeTooltips() {
    const elements = document.querySelectorAll('[title]');
    elements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const element = e.target;
    const title = element.getAttribute('title');

    if (title) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 10000;
                    white-space: nowrap;
                    animation: fadeIn 0.2s ease-out;
                `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';

        element.setAttribute('data-tooltip', 'true');
        element.removeAttribute('title');
    }
}

function hideTooltip(e) {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }

    const element = e.target;
    if (element.getAttribute('data-tooltip')) {
        element.setAttribute('title', tooltip ? tooltip.textContent : '');
        element.removeAttribute('data-tooltip');
    }
}

// Initialize tooltips after DOM is ready
setTimeout(initializeTooltips, 1000);

// Show welcome notification on first load
setTimeout(() => {
    if (isLoggedIn) {
        showNotification('Welcome to CrowdShield Dashboard! Real-time monitoring is active.', 'success');
    }
}, 2000);

// =============== CAMERA CONTROLS ===============
function startCamera() {
    const button = document.getElementById('openCameraBtn');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    button.disabled = true;

    // Load the COCO-SSD model and start camera stream
    Promise.all([
        cocoSsd.load()
    ]).then(models => {
        window.cocoModel = models[0];

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                    // Store the stream for later use
                    window.cameraStream = stream;

                    // Use existing video element
                    const videoElement = document.getElementById('cameraFeed');
                    if (videoElement) {
                        videoElement.srcObject = stream;
                        videoElement.play();

                        // Update button states
                        button.innerHTML = '<i class="fas fa-video"></i> Camera Active';
                        button.disabled = true;

                        // Enable other camera buttons
                        const closeBtn = document.getElementById('closeCameraBtn');
                        const screenshotBtn = document.getElementById('screenshotBtn');
                        const startRecordingBtn = document.getElementById('startRecordingBtn');

                        if (closeBtn) closeBtn.disabled = false;
                        if (screenshotBtn) screenshotBtn.disabled = false;
                        if (startRecordingBtn) startRecordingBtn.disabled = false;

                        // Show camera view controls
                        showCameraControls();

                        showNotification('Camera started successfully!', 'success');

                        cameraActive = true;

                        // Start detection loop
                        startDetectionLoop(videoElement);
                    }
                })
                .catch(function (error) {
                    console.error('Error accessing camera:', error);
                    button.innerHTML = originalText;
                    button.disabled = false;
                    showNotification('Failed to access camera. Please check permissions.', 'error');
                });
        } else {
            button.innerHTML = originalText;
            button.disabled = false;
            showNotification('Camera not supported in this browser.', 'error');
        }
    }).catch(error => {
        console.error('Error loading COCO-SSD model:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('Failed to load detection model.', 'error');
    });
}

// Detection loop function
function startDetectionLoop(videoElement) {
    if (!window.cocoModel || !videoElement) return;
    // Mark detection as active so we can stop it cleanly later
    window.detectionActive = true;
    // Track last count to trigger repeated alerts on transitions to 2
    window.lastPeopleCount = undefined;

    const detectFrame = () => {
        if (!window.detectionActive) return;
        window.cocoModel.detect(videoElement).then(predictions => {
            // Filter predictions for person class
            const people = predictions.filter(p => p.class === 'person');

            // Update people count display
            const peopleCount = people.length;
            const peopleCountDisplay = document.getElementById('peopleCountDisplay');
            if (peopleCountDisplay) {
                peopleCountDisplay.textContent = `People Count: ${peopleCount}`;
            }

            // Alert each transition to exactly 2 people
            if (peopleCount === 2 && window.lastPeopleCount !== 2) {
                addNewAlert({
                    type: 'warning',
                    message: 'Test: Exactly 2 people detected',
                    icon: 'users',
                    color: '#f59e0b',
                    sticky: true,
                    noDedup: true
                });
            }
            window.lastPeopleCount = peopleCount;

            // Send detection data to backend
            sendDetectionData(peopleCount);

            // Update live people count in overcrowding alert
            updateLivePeopleCount(peopleCount);

            // Schedule next detection
            setTimeout(detectFrame, 1000);
        }).catch(error => {
            console.error('Detection error:', error);
            setTimeout(detectFrame, 2000);
        });
    };

    detectFrame();
}

// Send detection data to backend API
function sendDetectionData(count) {
    // Prepare density level based on count thresholds
    let densityLevel = 'Low';
    if (count >= 10) {
        densityLevel = 'High';
    } else if (count >= 5) {
        densityLevel = 'Medium';
    }

    // Prepare payload
    const payload = {
        zoneId: 1,
        count: count,
        density: densityLevel
    };

    // Optimistically update UI with the latest detection before backend refresh
    updateStatusIndicatorsWithRealData({ zoneId: 1, count: count, density: densityLevel });

    fetch(`${API_BASE_URL}/api/density`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(response => {
        if (!response.ok) {
            console.error('Failed to send detection data:', response.statusText);
        }
    }).catch(error => {
        console.error('Error sending detection data:', error);
    });
}

function closeCamera() {
    const button = document.getElementById('closeCameraBtn');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Closing...';
    button.disabled = true;

    setTimeout(() => {
        // Stop the detection loop
        window.detectionActive = false;
        cameraActive = false;
        // Reset tracking for repeated 2-people alerts
        window.lastPeopleCount = undefined;

        // Stop the camera stream if it's running
        if (window.cameraStream) {
            const tracks = window.cameraStream.getTracks();
            tracks.forEach(track => track.stop());
            window.cameraStream = null;
        }

        // Stop video playback
        const videoElement = document.getElementById('cameraFeed');
        if (videoElement) {
            videoElement.pause();
            videoElement.srcObject = null;
        }

        // Reset people count display
        const peopleCountDisplay = document.getElementById('peopleCountDisplay');
        if (peopleCountDisplay) {
            peopleCountDisplay.textContent = 'People Count: 0';
        }

        // Reset all button states
        const openBtn = document.getElementById('openCameraBtn');
        const screenshotBtn = document.getElementById('screenshotBtn');
        const startRecordingBtn = document.getElementById('startRecordingBtn');
        const stopRecordingBtn = document.getElementById('stopRecordingBtn');

        if (openBtn) {
            openBtn.innerHTML = '<i class="fas fa-video"></i> Open Camera';
            openBtn.disabled = false;
        }
        if (screenshotBtn) {
            screenshotBtn.disabled = true;
        }
        if (startRecordingBtn) {
            startRecordingBtn.disabled = true;
        }
        if (stopRecordingBtn) {
            stopRecordingBtn.disabled = true;
        }

        // Hide camera view controls
        hideCameraControls();

        button.innerHTML = '<i class="fas fa-video-slash"></i> Camera Closed';
        button.disabled = true;

        // Reset dashboard state and show info in alerts panel
        resetDashboardAfterCameraClose();

        showNotification('Camera closed successfully!', 'info');
    }, 500);
}

function resetDashboardAfterCameraClose() {
    // Reset status indicators to zero
    try { updateStatusIndicators(); } catch (e) { console.warn('Status reset failed:', e); }

    // Reset heatmap summary values
    const elCurrentDensity = document.getElementById('currentDensity');
    if (elCurrentDensity) elCurrentDensity.textContent = 'Low';
    const elSZ = document.getElementById('safeZonesCount');
    if (elSZ) elSZ.textContent = '0';
    const elWZ = document.getElementById('warningZonesCount');
    if (elWZ) elWZ.textContent = '0';
    const elCZ = document.getElementById('criticalZonesCount');
    if (elCZ) elCZ.textContent = '0';
    const elLUT = document.getElementById('lastUpdateTime');
    if (elLUT) elLUT.textContent = 'Just now';

    // Reset charts to zeros
    try { updateCharts(); } catch (e) { console.warn('Charts reset failed:', e); }

    // Reset analytics values
    try { updateAnalytics(); } catch (e) { console.warn('Analytics reset failed:', e); }

    // Ensure people count display shows 0
    const pc = document.getElementById('peopleCountDisplay');
    if (pc) pc.textContent = 'People Count: 0';

    // Show informational alert via unified flow so it is also recorded in history
    try {
        addNewAlert({
            type: 'info',
            message: 'Camera Closed - Monitoring paused. Dashboard reset to idle state.',
            icon: 'info-circle',
            color: 'var(--primary-color)'
        });
    } catch (_) { }

    // Remove any active safe route overlay and reset toggle
    if (window.currentRoute && typeof map !== 'undefined' && map) {
        try { map.removeLayer(window.currentRoute); } catch (_) { }
        window.currentRoute = null;
    }
    const safeRoutesBtn = document.getElementById('safeRoutes');
    if (safeRoutesBtn && safeRoutesBtn.classList.contains('active')) {
        safeRoutesBtn.classList.remove('active');
        safeRoutesBtn.innerHTML = '<i class="fas fa-route"></i> Show Safe Routes';
    }
}

function takeScreenshot() {
    const button = document.getElementById('screenshotBtn');
    const videoElement = document.getElementById('cameraFeed');

    if (!videoElement || !videoElement.srcObject) {
        showNotification('Camera is not active. Please start the camera first.', 'error');
        return;
    }

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturing...';
    button.disabled = true;

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Create download link
        canvas.toBlob(function (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `crowdshield-screenshot-${new Date().toISOString().split('T')[0]}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            button.innerHTML = '<i class="fas fa-camera"></i> Screenshot';
            button.disabled = false;
            showNotification('Screenshot captured successfully!', 'success');
        });
    } catch (error) {
        console.error('Error taking screenshot:', error);
        button.innerHTML = '<i class="fas fa-camera"></i> Screenshot';
        button.disabled = false;
        showNotification('Failed to capture screenshot.', 'error');
    }
}

function startRecording() {
    const button = document.getElementById('startRecordingBtn');
    const videoElement = document.getElementById('cameraFeed');

    if (!videoElement || !videoElement.srcObject) {
        showNotification('Camera is not active. Please start the camera first.', 'error');
        return;
    }

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    button.disabled = true;

    try {
        const stream = videoElement.srcObject;
        window.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        const chunks = [];
        window.mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
        };

        window.mediaRecorder.onstop = function () {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `crowdshield-recording-${new Date().toISOString().split('T')[0]}-${Date.now()}.webm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showNotification('Recording saved successfully!', 'success');
        };

        window.mediaRecorder.start();
        window.isRecording = true;

        button.innerHTML = '<i class="fas fa-circle"></i> Recording';
        button.disabled = true;

        const stopBtn = document.getElementById('stopRecordingBtn');
        if (stopBtn) stopBtn.disabled = false;

        showNotification('Recording started!', 'info');
    } catch (error) {
        console.error('Error starting recording:', error);
        button.innerHTML = '<i class="fas fa-circle"></i> Start Recording';
        button.disabled = false;
        showNotification('Failed to start recording.', 'error');
    }
}

function stopRecording() {
    const button = document.getElementById('stopRecordingBtn');

    if (!window.mediaRecorder || !window.isRecording) {
        showNotification('No active recording to stop.', 'error');
        return;
    }

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
    button.disabled = true;

    try {
        window.mediaRecorder.stop();
        window.isRecording = false;

        button.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
        button.disabled = true;

        const startBtn = document.getElementById('startRecordingBtn');
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-circle"></i> Start Recording';
            startBtn.disabled = false;
        }

        showNotification('Recording stopped. Saving file...', 'info');
    } catch (error) {
        console.error('Error stopping recording:', error);
        button.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
        button.disabled = false;
        showNotification('Failed to stop recording.', 'error');
    }
}
// =============== CHART DARK MODE SUPPORT ===============
function updateChartsForTheme() {
    try {
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#475569' : '#e2e8f0';

        if (typeof charts === 'object' && charts) {
            Object.values(charts).forEach(chart => {
                if (chart && chart.options) {
                    // Update scales text color
                    if (chart.options.scales) {
                        if (chart.options.scales.x) {
                            chart.options.scales.x.ticks = chart.options.scales.x.ticks || {};
                            chart.options.scales.x.ticks.color = textColor;
                            chart.options.scales.x.grid = chart.options.scales.x.grid || {};
                            chart.options.scales.x.grid.color = gridColor;
                            if (chart.options.scales.x.title) {
                                chart.options.scales.x.title.color = textColor;
                            }
                        }
                        if (chart.options.scales.y) {
                            chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                            chart.options.scales.y.ticks.color = textColor;
                            chart.options.scales.y.grid = chart.options.scales.y.grid || {};
                            chart.options.scales.y.grid.color = gridColor;
                            if (chart.options.scales.y.title) {
                                chart.options.scales.y.title.color = textColor;
                            }
                        }
                    }

                    // Update legend text color
                    if (chart.options.plugins && chart.options.plugins.legend) {
                        chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
                        chart.options.plugins.legend.labels.color = textColor;
                    }

                    chart.update('none');
                }
            });
        }
    } catch (e) {
        console.warn('Chart theme update error:', e);
    }
}

// Update the toggleTheme function to include chart updates
function toggleTheme() {
    try {
        const body = document.body;
        const isDark = body.classList.contains('dark-mode');

        body.className = isDark ? 'light-mode' : 'dark-mode';
        localStorage.setItem('crowdshield_theme', isDark ? 'light' : 'dark');
        updateThemeIcon();

        // Update charts for new theme
        try {
            updateChartsForTheme();
        } catch (e) {
            console.warn('Chart theme update failed:', e);
        }

        // Sync settings toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            if (isDark) {
                darkModeToggle.classList.remove('active');
            } else {
                darkModeToggle.classList.add('active');
            }
        }
    } catch (e) {
        console.warn('Theme toggle failed:', e);
    }
}
// =============== CAMERA MAXIMIZE/MINIMIZE FUNCTIONALITY ===============

function setupCameraViewControls() {
    const maximizeBtn = document.getElementById('maximizeBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', maximizeCamera);
    }
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', minimizeCamera);
    }

    // ESC key to minimize
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && window.cameraMaximized) {
            minimizeCamera();
        }
    });
}

function maximizeCamera() {
    const container = document.getElementById('cameraContainer');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');

    if (!container || !cameraActive) return;

    container.classList.add('maximized');
    maximizeBtn.style.display = 'none';
    minimizeBtn.style.display = 'inline-block';
    window.cameraMaximized = true;

    // Create floating minimize button
    const floatingMinimizeBtn = document.createElement('button');
    floatingMinimizeBtn.className = 'maximized-minimize-btn';
    floatingMinimizeBtn.id = 'floatingMinimizeBtn';
    floatingMinimizeBtn.innerHTML = '<i class="fas fa-compress"></i> Minimize';
    floatingMinimizeBtn.onclick = minimizeCamera;
    container.appendChild(floatingMinimizeBtn);

    // Add mobile swipe hint
    addMobileSwipeHint(container);

    // Hide scrollbars
    document.body.style.overflow = 'hidden';

    showNotification('Camera maximized. Press ESC to minimize.', 'info');
}

function minimizeCamera() {
    const container = document.getElementById('cameraContainer');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const floatingBtn = document.getElementById('floatingMinimizeBtn');

    if (!container) return;

    container.classList.add('minimizing');

    // Remove floating minimize button and mobile hint
    if (floatingBtn) {
        floatingBtn.remove();
    }
    const mobileHint = document.getElementById('mobileSwipeHint');
    if (mobileHint) {
        mobileHint.remove();
    }

    // Reset any mobile transform
    container.style.transform = '';
    container.style.opacity = '';

    setTimeout(() => {
        container.classList.remove('maximized', 'minimizing');
        maximizeBtn.style.display = 'inline-block';
        minimizeBtn.style.display = 'none';
        window.cameraMaximized = false;

        // Restore scrollbars
        document.body.style.overflow = '';
    }, 500);

    showNotification('Camera minimized.', 'info');
}

function showCameraControls() {
    const controls = document.querySelector('.camera-view-controls');
    if (controls) {
        controls.style.display = 'flex';
        controls.style.animation = 'fadeIn 0.3s ease-out';
    }
}

function hideCameraControls() {
    const controls = document.querySelector('.camera-view-controls');
    if (controls) {
        controls.style.display = 'none';
    }

    // Reset to minimized state if maximized
    if (window.cameraMaximized) {
        minimizeCamera();
    }
}
// =============== MOBILE TOUCH GESTURES FOR CAMERA ===============

function setupMobileCameraGestures() {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function handleTouchStart(e) {
        if (!window.cameraMaximized) return;
        startY = e.touches[0].clientY;
        isDragging = true;
    }

    function handleTouchMove(e) {
        if (!isDragging || !window.cameraMaximized) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // Only allow downward swipe to minimize
        if (deltaY > 50) {
            e.preventDefault();
            const container = document.getElementById('cameraContainer');
            if (container) {
                container.style.transform = `translateY(${Math.min(deltaY - 50, 100)}px)`;
                container.style.opacity = Math.max(1 - (deltaY - 50) / 200, 0.5);
            }
        }
    }

    function handleTouchEnd(e) {
        if (!isDragging || !window.cameraMaximized) return;
        isDragging = false;

        const deltaY = currentY - startY;
        const container = document.getElementById('cameraContainer');

        if (deltaY > 100) {
            // Minimize camera
            minimizeCamera();
        } else if (container) {
            // Reset position
            container.style.transform = '';
            container.style.opacity = '';
        }
    }

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function addMobileSwipeHint(container) {
    if (window.innerWidth <= 768) {
        const hint = document.createElement('div');
        hint.className = 'mobile-swipe-hint';
        hint.id = 'mobileSwipeHint';
        hint.innerHTML = '<i class="fas fa-arrow-down"></i> Swipe down to minimize';
        container.appendChild(hint);

        // Auto-hide hint after 3 seconds
        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => hint.remove(), 500);
            }
        }, 3000);
    }
}
// =============== UNIFIED ALERT MONITORING SYSTEM ===============

function setupAlertMonitoring() {
    const fireBtn = document.getElementById('monitorFireBtn');
    const overcrowdingBtn = document.getElementById('monitorOvercrowdingBtn');
    const medicalBtn = document.getElementById('monitorMedicalBtn');
    const stampedeBtn = document.getElementById('monitorStampedeBtn');

    const fireStopBtn = document.getElementById('stopFireBtn');
    const overcrowdingStopBtn = document.getElementById('stopOvercrowdingBtn');
    const medicalStopBtn = document.getElementById('stopMedicalBtn');
    const stampedeStopBtn = document.getElementById('stopStampedeBtn');

    if (fireBtn) fireBtn.addEventListener('click', () => startAlertMonitoring('fire'));
    if (overcrowdingBtn) overcrowdingBtn.addEventListener('click', () => startAlertMonitoring('overcrowding'));
    if (medicalBtn) medicalBtn.addEventListener('click', () => startAlertMonitoring('medical'));
    if (stampedeBtn) stampedeBtn.addEventListener('click', () => startAlertMonitoring('stampede'));

    if (fireStopBtn) fireStopBtn.addEventListener('click', () => stopAlertMonitoring('fire'));
    if (overcrowdingStopBtn) overcrowdingStopBtn.addEventListener('click', () => stopAlertMonitoring('overcrowding'));
    if (medicalStopBtn) medicalStopBtn.addEventListener('click', () => stopAlertMonitoring('medical'));
    if (stampedeStopBtn) stampedeStopBtn.addEventListener('click', () => stopAlertMonitoring('stampede'));
}

function startAlertMonitoring(alertType) {
    // Start camera if not active
    if (!cameraActive) {
        startCamera();
    }

    // Set current monitoring type
    window.currentMonitoringType = alertType;

    // Update UI
    updateMonitoringUI(alertType, true);

    // Start AI detection for this alert type
    setTimeout(() => {
        runAIDetection(alertType);
    }, 2000);

    showNotification(`${capitalizeFirst(alertType)} monitoring started with camera feed!`, 'info');
}

function stopAlertMonitoring(alertType) {
    // Clear monitoring type
    if (window.currentMonitoringType === alertType) {
        window.currentMonitoringType = null;
    }

    // Update UI
    updateMonitoringUI(alertType, false);

    // Hide result
    const resultDiv = document.getElementById(`${alertType}Result`);
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }

    showNotification(`${capitalizeFirst(alertType)} monitoring stopped.`, 'info');
}

function updateMonitoringUI(alertType, isMonitoring) {
    const monitorBtn = document.getElementById(`monitor${capitalizeFirst(alertType)}Btn`);
    const stopBtn = document.getElementById(`stop${capitalizeFirst(alertType)}Btn`);

    // New animation-based logic for mobile
    if (window.innerWidth <= 768) {
        const actionsContainer = monitorBtn.parentElement;
        if (isMonitoring) {
            monitorBtn.style.transform = 'rotateY(180deg)';
            monitorBtn.style.opacity = '0';
            stopBtn.style.transform = 'rotateY(0deg)';
            stopBtn.style.opacity = '1';
        } else {
            monitorBtn.style.transform = 'rotateY(0deg)';
            monitorBtn.style.opacity = '1';
            stopBtn.style.transform = 'rotateY(180deg)';
            stopBtn.style.opacity = '0';
        }
    } else { // Original logic for desktop
        if (isMonitoring) {
            monitorBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
        } else {
            monitorBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    }
}

function runAIDetection(alertType) {
    const videoElement = document.getElementById('cameraFeed');
    if (!videoElement || !window.cocoModel) {
        setTimeout(() => runAIDetection(alertType), 1000);
        return;
    }

    window.cocoModel.detect(videoElement).then(predictions => {
        const result = analyzeForAlertType(alertType, predictions);
        displayDetectionResult(alertType, result);

        // Continue monitoring if still active
        if (window.currentMonitoringType === alertType) {
            setTimeout(() => runAIDetection(alertType), 2000);
        }
    }).catch(error => {
        console.error('AI Detection error:', error);
        if (window.currentMonitoringType === alertType) {
            setTimeout(() => runAIDetection(alertType), 3000);
        }
    });
}

function analyzeForAlertType(alertType, predictions) {
    const people = predictions.filter(p => p.class === 'person');
    const peopleCount = people.length;

    switch (alertType) {
        case 'fire':
            // Simulate fire detection (no fire objects in COCO model)
            const result = {
                detected: false,
                message: '✅ No fire detected',
                color: '#10b981',
                alertType: 'Fire Emergency',
                zoneId: 1
            };
            // Save to database if detected
            if (result.detected) {
                saveAlertToDatabase(result);
            }
            return result;

        case 'overcrowding':
            const isOvercrowded = peopleCount >= 4;
            const overcrowdingResult = {
                detected: isOvercrowded,
                message: isOvercrowded ? `🚨 Overcrowding detected (${peopleCount} people)` : `✅ No overcrowding (${peopleCount} people)`,
                color: isOvercrowded ? '#ef4444' : '#10b981',
                alertType: 'Overcrowding',
                zoneId: 1,
                peopleCount: peopleCount
            };
            // Save to database if detected
            if (overcrowdingResult.detected) {
                saveAlertToDatabase(overcrowdingResult);
            }
            return overcrowdingResult;

        case 'medical':
            // Simulate medical emergency detection
            const medicalResult = {
                detected: false,
                message: '✅ No medical emergencies detected',
                color: '#10b981',
                alertType: 'Medical Emergency',
                zoneId: 1
            };
            // Save to database if detected
            if (medicalResult.detected) {
                saveAlertToDatabase(medicalResult);
            }
            return medicalResult;

        case 'stampede':
            // Simulate stampede risk detection based on crowd density
            const stampedeRisk = peopleCount >= 6;
            const stampedeResult = {
                detected: stampedeRisk,
                message: stampedeRisk ? `⚠️ Stampede risk detected (${peopleCount} people)` : `✅ No stampede risk (${peopleCount} people)`,
                color: stampedeRisk ? '#f59e0b' : '#10b981',
                alertType: 'Stampede Risk',
                zoneId: 1,
                peopleCount: peopleCount
            };
            // Save to database if detected
            if (stampedeResult.detected) {
                saveAlertToDatabase(stampedeResult);
            }
            return stampedeResult;

        default:
            return {
                detected: false,
                message: '✅ No threats detected',
                color: '#10b981',
                alertType: 'General',
                zoneId: 1
            };
    }
}

function displayDetectionResult(alertType, result) {
    const resultDiv = document.getElementById(`${alertType}Result`);
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.style.backgroundColor = result.detected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        resultDiv.style.color = result.color;
        resultDiv.style.border = `1px solid ${result.color}`;
        resultDiv.textContent = result.message;
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============== DATABASE ALERT SAVING ===============
function saveAlertToDatabase(alertResult) {
    // Create unique key for this alert type and zone
    const alertKey = `${alertResult.alertType}_${alertResult.zoneId}`;
    const now = Date.now();

    // Check if we recently saved this same alert (within 30 seconds)
    const lastSaved = lastSavedAlerts.get(alertKey);
    if (lastSaved && (now - lastSaved) < 30000) {
        console.log('Skipping duplicate alert save:', alertKey);
        return;
    }

    // Update last saved time
    lastSavedAlerts.set(alertKey, now);

    // Prepare alert data for database
    const alertData = {
        zoneId: alertResult.zoneId || 1,
        type: alertResult.alertType || 'Alert',
        message: alertResult.message || 'Alert detected',
        status: 'active',
        timestamp: new Date().toISOString()
    };

    // Save to MySQL database via backend API
    fetch('http://localhost:8080/api/alerts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertData)
    })
        .then(response => {
            if (response.ok) {
                console.log('Alert saved to database:', alertData);
                // Refresh alerts display to show new alert in history
                setTimeout(() => {
                    fetchAlerts();
                }, 500);
            } else {
                console.error('Failed to save alert to database:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Error saving alert to database:', error);
        });

    // Also show notification to user
    showNotification(`${alertResult.alertType}: ${alertResult.message}`, alertResult.detected ? 'warning' : 'info');
}

// =============== FULL HISTORY MODAL FUNCTIONS ===============
function showFullHistoryModal() {
    const modal = document.getElementById('fullHistoryModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        // Load full history data
        loadFullHistoryData();

        // Add escape key listener
        document.addEventListener('keydown', handleFullHistoryEscape);

        showNotification('Loading complete alert history from database...', 'info');
    }
}

function hideFullHistoryModal() {
    const modal = document.getElementById('fullHistoryModal');
    if (modal) {
        modal.style.display = 'none';

        // Remove escape key listener
        document.removeEventListener('keydown', handleFullHistoryEscape);
    }
}

function handleFullHistoryEscape(e) {
    if (e.key === 'Escape') {
        hideFullHistoryModal();
    }
}

function loadFullHistoryData() {
    const content = document.getElementById('fullHistoryContent');

    // Show loading state
    content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #6b7280;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px; color: var(--primary-color);"></i>
            <p>Loading complete alert history from MySQL database...</p>
        </div>
    `;

    // Fetch complete history from backend
    fetch(`${API_BASE_URL}/api/alerts/history`)
        .then(response => response.json())
        .then(history => {
            displayFullHistory(history);
        })
        .catch(error => {
            console.error('Error loading full history:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>Failed to load alert history. Please try again.</p>
                    <button onclick="loadFullHistoryData()" class="login-btn" style="margin-top: 15px;">
                        <i class="fas fa-retry"></i> Retry
                    </button>
                </div>
            `;
        });
}

function displayFullHistory(history) {
    const content = document.getElementById('fullHistoryContent');

    if (!history || history.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-dark);">
                <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 15px; color: var(--text-dark);"></i>
                <p style="color: var(--text-dark);">No alerts found in the database.</p>
            </div>
        `;
        return;
    }

    // Group alerts by date
    const groupedAlerts = groupAlertsByDate(history);

    let html = `
        <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.1)); border-radius: 8px; border-left: 4px solid var(--primary-color);">
            <h4 style="margin: 0 0 8px 0; color: var(--primary-color); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-chart-bar"></i> Statistics
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; font-size: 0.9rem; color: var(--text-dark);">
                <div style="color: var(--text-dark);"><strong style="color: var(--text-dark);">Total Alerts:</strong> ${history.length}</div>
                <div style="color: var(--text-dark);"><strong style="color: var(--text-dark);">Critical:</strong> ${history.filter(a => a.type === 'Critical').length}</div>
                <div style="color: var(--text-dark);"><strong style="color: var(--text-dark);">Warning:</strong> ${history.filter(a => a.type === 'Warning').length}</div>
                <div style="color: var(--text-dark);"><strong style="color: var(--text-dark);">Info:</strong> ${history.filter(a => a.type === 'Info').length}</div>
            </div>
        </div>
    `;

    // Display alerts grouped by date
    Object.keys(groupedAlerts).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const alerts = groupedAlerts[date];
        const dateObj = new Date(date);
        const isToday = isDateToday(dateObj);
        const isYesterday = isDateYesterday(dateObj);

        let dateLabel = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (isToday) dateLabel = `Today - ${dateLabel}`;
        else if (isYesterday) dateLabel = `Yesterday - ${dateLabel}`;

        html += `
            <div style="margin-bottom: 25px;">
                <h4 style="margin: 0 0 15px 0; padding: 10px 15px; background: var(--light-bg); border-radius: 8px; color: var(--text-dark); border-left: 4px solid var(--primary-color);">
                    <i class="fas fa-calendar-day" style="color: var(--text-dark);"></i> ${dateLabel} (${alerts.length} alerts)
                </h4>
                <div style="space-y: 10px;">
        `;

        alerts.forEach(alert => {
            const time = new Date(alert.timestamp).toLocaleTimeString();
            const color = getAlertColor(alert.type);
            const icon = getAlertIcon(alert.type);

            html += `
                <div style="padding: 15px; margin-bottom: 10px; background: var(--light-bg); border-radius: 8px; border-left: 4px solid ${color}; animation: fadeInUp 0.3s ease-out;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="${icon}" style="color: ${color};"></i>
                                <strong style="color: ${color};">${alert.type}</strong>
                                <span style="background: rgba(107, 114, 128, 0.1); color: var(--text-dark); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Zone ${alert.zoneId}</span>
                            </div>
                            <p style="margin: 0; color: var(--text-dark); line-height: 1.4;">${alert.message}</p>
                        </div>
                        <div style="text-align: right; color: var(--text-dark); font-size: 0.85rem;">
                            <div style="color: var(--text-dark);">${time}</div>
                            <div style="font-size: 0.75rem; margin-top: 2px; color: var(--text-dark);">ID: ${alert.id}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
    });

    content.innerHTML = html;
}

function groupAlertsByDate(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
        const date = new Date(alert.timestamp).toDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(alert);
    });
    return grouped;
}

function isDateToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isDateYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
}

function getAlertColor(type) {
    switch (type?.toLowerCase()) {
        case 'critical': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'info': return '#3b82f6';
        default: return '#6b7280';
    }
}

function getAlertIcon(type) {
    switch (type?.toLowerCase()) {
        case 'critical': return 'fas fa-exclamation-triangle';
        case 'warning': return 'fas fa-exclamation-circle';
        case 'info': return 'fas fa-info-circle';
        default: return 'fas fa-bell';
    }
}

function refreshFullHistory() {
    const button = document.getElementById('refreshHistoryBtn');
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    button.disabled = true;

    setTimeout(() => {
        loadFullHistoryData();
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('Alert history refreshed!', 'success');
    }, 1000);
}
// =============== QUICK ACTIONS FUNCTIONALITY ===============
function toggleQuickActions() {
    const header = document.getElementById('quickActionsToggle');
    const content = document.getElementById('quickActionsContent');

    header.classList.toggle('active');
    content.classList.toggle('active');
}



function playAlertSound() {
    try {
        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.alertActive = true;

        // Create dangerous continuous alarm
        createDangerousAlarm();

        // Add stop button to page
        addStopAlertButton();

        showNotification('🚨 DANGEROUS ALERT ACTIVATED - CONTINUOUS ALARM!', 'error');

    } catch (error) {
        console.error('Audio not supported:', error);
        showNotification('🚨 PANIC ALERT ACTIVATED!', 'error');
    }
}

function createDangerousAlarm() {
    if (!window.alertActive) return;

    const oscillator1 = window.audioContext.createOscillator();
    const oscillator2 = window.audioContext.createOscillator();
    const gainNode = window.audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(window.audioContext.destination);

    // Dangerous dual-tone alarm
    oscillator1.type = 'square';
    oscillator2.type = 'sawtooth';
    oscillator1.frequency.value = 1000;
    oscillator2.frequency.value = 1500;

    // High volume for danger
    gainNode.gain.value = 0.7;

    oscillator1.start();
    oscillator2.start();

    // Stop after 1 second and restart
    setTimeout(() => {
        oscillator1.stop();
        oscillator2.stop();
        if (window.alertActive) {
            setTimeout(createDangerousAlarm, 200);
        }
    }, 1000);
}

function addStopAlertButton() {
    if (document.getElementById('stopAlertBtn')) return;

    const stopBtn = document.createElement('button');
    stopBtn.id = 'stopAlertBtn';
    stopBtn.innerHTML = '<i class="fas fa-stop"></i> STOP ALERT';
    stopBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; background: #ef4444; color: white; border: none; padding: 15px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; animation: pulse 1s infinite;';
    stopBtn.onclick = stopAlertSound;

    document.body.appendChild(stopBtn);
}

function stopAlertSound() {
    window.alertActive = false;

    const stopBtn = document.getElementById('stopAlertBtn');
    if (stopBtn) stopBtn.remove();

    showNotification('Alert sound stopped', 'info');
}









function showMassNotificationModal() {
    const modal = document.getElementById('massNotificationModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Clear previous message
        const messageField = document.getElementById('mnMessage');
        if (messageField) {
            messageField.value = '';
        }
    }
}

function hideMassNotificationModal() {
    const modal = document.getElementById('massNotificationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Refresh the modal content for next use
    const messageField = document.getElementById('mnMessage');
    if (messageField) {
        messageField.value = '';
    }
    if (typeof clearRecipients === 'function') {
        clearRecipients();
    }
}



function selectTemplate(type) {
    const templates = {
        fire: '🔥 FIRE EMERGENCY: Evacuate immediately via nearest exit. Follow emergency personnel instructions. Stay low and move quickly to safety.',
        overcrowding: '👥 OVERCROWDING ALERT: Please disperse to adjacent areas. Maintain safe distances. Use alternative routes if available.',
        medical: '🏥 MEDICAL EMERGENCY: Clear the area immediately. Medical personnel en route. Stay calm and follow staff instructions.',
        stampede: '🏃 STAMPEDE RISK: STOP. Do not push. Move slowly to nearest safe zone. Stay calm and help others.'
    };

    const textarea = document.getElementById('notificationMessage');
    const charCount = document.getElementById('charCount');

    if (textarea && templates[type]) {
        textarea.value = templates[type];

        // Update character count
        if (charCount) {
            charCount.textContent = templates[type].length;
        }

        // Add visual feedback
        textarea.style.borderColor = 'var(--success-color)';
        textarea.focus();

        // Reset border color after animation
        setTimeout(() => {
            textarea.style.borderColor = 'var(--border-light)';
        }, 1000);

        // Add selection effect to template button
        const templateBtns = document.querySelectorAll('.template-btn');
        templateBtns.forEach(btn => btn.classList.remove('selected'));

        const selectedBtn = document.querySelector(`[data-type="${type}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
            setTimeout(() => selectedBtn.classList.remove('selected'), 2000);
        }
    }
}
// Helper: simple HTML escaper
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#039;" })[m]; });
}

// Helper: open a small preview window on desktop with copy/open buttons
function openSmsPreviewWindow(phone, message, smsUri) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Send SMS Preview</title><style>body{font-family:Arial,sans-serif;background:#f7f7f7;padding:18px} .card{background:#fff;padding:16px;border-radius:8px;max-width:680px;margin:auto;box-shadow:0 6px 24px rgba(0,0,0,0.08)} input,textarea{width:100%;padding:8px;border:1px solid #ddd;border-radius:6px} .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px} button{padding:8px 12px;border-radius:6px;border:0;cursor:pointer} .primary{background:#2563eb;color:#fff} .outline{background:#fff;border:1px solid #ccc}</style></head><body><div class="card"><h3>Send SMS</h3><label>To</label><input id="previewPhone" value="${escapeHtml(phone)}" readonly><label style="margin-top:8px;display:block">Message</label><textarea id="previewMessage" rows="6">${escapeHtml(message)}</textarea><div class="actions"><button class="outline" id="copyBtn">Copy to Clipboard</button><button class="primary" id="openBtn">Open SMS App / Link</button></div><p style="color:#666;font-size:0.9rem;margin-top:8px">Tip: On mobile this will open the native SMS composer. On desktop copy the message and send from your phone or scan a QR code.</p></div><script>const smsUri = ${JSON.stringify(smsUri)};document.getElementById('copyBtn').addEventListener('click', async ()=>{const txt=document.getElementById('previewMessage').value;try{await navigator.clipboard.writeText(txt);alert('Message copied to clipboard');}catch(e){alert('Copy failed: '+e)} });document.getElementById('openBtn').addEventListener('click', ()=>{window.location.href = smsUri;});</script></body></html>`;

    // Open an about:blank tab and write into it. Some browsers block writing if noopener/noreferrer is used.
    const w = window.open('about:blank', '_blank');
    if (w) {
        try {
            w.document.open();
            w.document.write(html);
            w.document.close();
            try { w.focus(); } catch (e) { }
            return;
        } catch (e) {
            // If writing fails (very old browsers or strict policies), fall through to fallback
            console.warn('Unable to write preview window:', e);
        }
    }

    // Popup blocked or write failed — fallback to copying text
    if (!w) {
        // popup blocked — fallback to copying text
        try {
            navigator.clipboard.writeText(message);
            alert('Message copied to clipboard.\n\nTo: ' + phone + '\n\nPaste into your SMS app.');
        } catch (e) {
            alert('Send SMS to: ' + phone + '\n\nMessage: ' + message);
        }
    }
}

function sendMassNotification() {
    const messageEl = document.getElementById('mnMessage');
    const sendBtn = document.querySelector('.send-btn');
    if (!messageEl) return;
    const message = messageEl.value || '';

    if (!message.trim()) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    if (message.length > 1000) {
        showNotification('Message too long. Please keep it under 1000 characters.', 'warning');
        return;
    }

    // Determine phone to use — try common inputs, fallback to a sensible default
    let phone = null;
    const mnPhone = document.getElementById('mnPhone');
    const notificationPhone = document.getElementById('notificationPhone');
    if (mnPhone && mnPhone.value.trim()) phone = mnPhone.value.trim();
    else if (notificationPhone && notificationPhone.value.trim()) phone = notificationPhone.value.trim();
    else phone = '8849826386'; // fallback number (can be changed)

    // Normalize phone for sms: URI
    const digits = String(phone).replace(/\D/g, '');
    const phoneForUri = String(phone).trim().startsWith('+') ? ('+' + digits) : (digits.length === 10 ? '+91' + digits : ('+' + digits));
    const smsUri = `sms:${phoneForUri}?body=${encodeURIComponent(message)}`;

    // Detect mobile
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
        // On mobile, navigate to the sms: URI which should open the composer
        try {
            // Close/hide modal first if present
            const modal = document.getElementById('massNotificationModal');
            if (modal) modal.classList.add('hidden');
            window.location.href = smsUri;
        } catch (e) {
            // fallback to copy
            try { navigator.clipboard.writeText(message); alert('Message copied to clipboard — paste into your SMS app.'); } catch (_) { alert('Please send SMS to ' + phoneForUri + '\n\n' + message); }
        }
        return;
    }

    // Desktop: open preview window for user to copy/open
    openSmsPreviewWindow(phoneForUri, message, smsUri);
    // hide modal overlay if any
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
}

// =============== RISK RADAR FUNCTIONALITY ===============
function showRiskRadarPanel() {
    const panel = document.createElement('div');
    panel.id = 'riskRadarPanel';
    panel.className = 'risk-forecast-panel';

    // Determine colors based on current theme
    const isDark = document.body.classList.contains('dark-mode');
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const borderColor = isDark ? '#374151' : '#e5e7eb';
    const textColor = isDark ? '#f9fafb' : '#1f2937';

    panel.style.cssText = `
        position: fixed;
        left: 20px;
        bottom: 90px;
        width: 350px;
        max-height: 500px;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideUp 0.3s ease-out;
        overflow: hidden;
        color: ${textColor};
    `;

    panel.innerHTML = `
        <div class="risk-header">
            <h4><i class="fas fa-chart-line"></i> Risk Forecast</h4>
            <button onclick="closeRiskRadarPanel()" class="close-btn">&times;</button>
        </div>
        <div class="risk-content">
            <div class="loading-section">
                <i class="fas fa-spinner fa-spin"></i> Loading database forecast...
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    loadRiskForecastData();
}

function closeRiskRadarPanel() {
    const panel = document.getElementById('riskRadarPanel');
    if (panel) panel.remove();
}

function loadRiskForecastData() {
    const content = document.querySelector('#riskRadarPanel .risk-content');

    // Fetch recent alerts and density data from MySQL
    Promise.all([
        fetch(`${API_BASE_URL}/api/alerts/history`).catch(() => ({ json: () => [] })),
        fetch(`${API_BASE_URL}/api/density`).catch(() => ({ json: () => [] }))
    ]).then(async ([alertsRes, densityRes]) => {
        const alerts = await alertsRes.json().catch(() => []);
        const density = await densityRes.json().catch(() => []);

        displayRiskForecast(alerts, density, content);
    }).catch(() => {
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#f9fafb' : '#1f2937';
        const errorColor = isDark ? '#f87171' : '#ef4444';

        content.innerHTML = `
            <div class="error-section" style="color: ${textColor};">
                <i class="fas fa-exclamation-triangle" style="color: ${errorColor};"></i>
                <p style="color: ${textColor};">Unable to load forecast data</p>
                <button onclick="loadRiskForecastData()" class="retry-btn" style="background: ${isDark ? '#60a5fa' : '#3b82f6'}; color: white;">Retry</button>
            </div>
        `;
    });
}

function displayRiskForecast(alerts, density, content) {
    const recentAlerts = alerts.slice(0, 10);
    const latestDensity = density.slice(0, 5);

    // Calculate risk levels based on database data
    const riskLevels = calculateRiskFromData(recentAlerts, latestDensity);
    const predictions = generatePredictionsFromData(recentAlerts, latestDensity);

    // Get theme-appropriate colors
    const isDark = document.body.classList.contains('dark-mode');
    const sectionBg = isDark ? '#374151' : '#f9fafb';
    const textColor = isDark ? '#f9fafb' : '#1f2937';
    const mutedColor = isDark ? '#9ca3af' : '#6b7280';
    const statBg = isDark ? '#374151' : '#f9fafb';
    const statBorder = isDark ? '#4b5563' : '#e5e7eb';

    content.innerHTML = `
        <div class="forecast-section" style="background: ${sectionBg}; color: ${textColor};">
            <h5 style="color: ${textColor};">Next 10 Minutes (Database Analysis)</h5>
            <div class="risk-bars" style="background: ${sectionBg}; border: 1px solid ${statBorder};">
                ${riskLevels.map((level, i) => `
                    <div class="risk-bar" style="height: ${level.height}%; background: ${level.color};" 
                         title="${level.time}: ${level.risk}"></div>
                `).join('')}
            </div>
        </div>
        <div class="incidents-section" style="color: ${textColor};">
            <h5 style="color: ${textColor};">Database Predictions</h5>
            <div class="incidents-list">
                ${predictions.length > 0 ? predictions.map(pred => `
                    <div class="incident-item ${pred.severity}" style="color: ${textColor};">
                        <strong style="color: ${textColor};">${pred.title}</strong><br>
                        <small style="color: ${mutedColor};">Based on: ${pred.source} | Confidence: ${pred.confidence}%</small>
                    </div>
                `).join('') : `<div class="no-predictions" style="color: ${isDark ? '#34d399' : '#059669'}; background: ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'}; border-color: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}">No high-risk predictions from current data</div>`}
            </div>
        </div>
        <div class="stats-section" style="color: ${textColor};">
            <h5 style="color: ${textColor};">Database Stats</h5>
            <div class="stats-grid">
                <div class="stat-item" style="background: ${statBg}; border: 1px solid ${statBorder};">
                    <span class="stat-value" style="color: ${isDark ? '#60a5fa' : '#3b82f6'};">${alerts.length}</span>
                    <span class="stat-label" style="color: ${mutedColor};">Total Alerts</span>
                </div>
                <div class="stat-item" style="background: ${statBg}; border: 1px solid ${statBorder};">
                    <span class="stat-value" style="color: ${isDark ? '#60a5fa' : '#3b82f6'};">${density.length}</span>
                    <span class="stat-label" style="color: ${mutedColor};">Density Records</span>
                </div>
            </div>
        </div>
        <button onclick="preDeployResources()" class="deploy-btn">
            <i class="fas fa-shield-alt"></i> Deploy Based on Data
        </button>
    `;
}

function calculateRiskFromData(alerts, density) {
    const timeSlots = ['Now', '+2min', '+4min', '+6min', '+8min', '+10min'];

    return timeSlots.map((time, index) => {
        // Calculate risk based on recent alert frequency and density trends
        const alertScore = alerts.filter(a => {
            const alertTime = new Date(a.timestamp);
            const hoursAgo = (Date.now() - alertTime.getTime()) / (1000 * 60 * 60);
            return hoursAgo <= (index + 1) * 2; // Weight recent alerts more
        }).length;

        const densityScore = density.length > index ?
            (density[index].count || 0) / 10 : 0;

        const totalScore = alertScore * 0.6 + densityScore * 0.4;

        let risk, color, height;
        if (totalScore >= 3) {
            risk = 'High'; color = '#ef4444'; height = 90 + (index * 2);
        } else if (totalScore >= 1.5) {
            risk = 'Medium'; color = '#f59e0b'; height = 60 + (index * 3);
        } else {
            risk = 'Low'; color = '#10b981'; height = 30 + (index * 2);
        }

        return { time, risk, color, height };
    });
}

function generatePredictionsFromData(alerts, density) {
    const predictions = [];

    // Analyze alert patterns
    const criticalAlerts = alerts.filter(a => a.type === 'Critical').length;
    const warningAlerts = alerts.filter(a => a.type === 'Warning').length;

    if (criticalAlerts >= 2) {
        predictions.push({
            title: 'Escalating Emergency Situation',
            source: `${criticalAlerts} critical alerts in database`,
            confidence: Math.min(85, criticalAlerts * 25),
            severity: 'critical'
        });
    }

    if (warningAlerts >= 3) {
        predictions.push({
            title: 'Potential Crowd Management Issue',
            source: `${warningAlerts} warning alerts recorded`,
            confidence: Math.min(70, warningAlerts * 15),
            severity: 'warning'
        });
    }

    // Analyze density trends
    if (density.length >= 3) {
        const avgDensity = density.slice(0, 3).reduce((sum, d) => sum + (d.count || 0), 0) / 3;
        if (avgDensity >= 5) {
            predictions.push({
                title: 'High Density Area Detected',
                source: `Average ${avgDensity.toFixed(1)} people from recent data`,
                confidence: Math.min(75, avgDensity * 10),
                severity: 'warning'
            });
        }
    }

    return predictions.slice(0, 3); // Limit to top 3 predictions
}

function preDeployResources() {
    closeRiskRadarPanel();

    // Fetch current database data to determine what resources are needed
    Promise.all([
        fetch(`${API_BASE_URL}/api/alerts/history`).catch(() => ({ json: () => [] })),
        fetch(`${API_BASE_URL}/api/density`).catch(() => ({ json: () => [] }))
    ]).then(async ([alertsRes, densityRes]) => {
        const alerts = await alertsRes.json().catch(() => []);
        const density = await densityRes.json().catch(() => []);

        const deploymentPlan = analyzeDeploymentNeeds(alerts, density);
        showDeploymentModal(deploymentPlan);
    }).catch(() => {
        // Fallback if database is unavailable
        const fallbackPlan = {
            needed: ['Security personnel → Panchavati & MG Road checkpoints'],
            notNeeded: ['Ambulances', 'Fire rescue', 'Emergency comms', 'Crowd barriers'],
            reason: 'Database unavailable - minimal deployment only'
        };
        showDeploymentModal(fallbackPlan);
    });
}

function analyzeDeploymentNeeds(alerts, density) {
    const needed = [];
    const notNeeded = [];

    // Check recent alerts (last 24 hours)
    const recentAlerts = alerts.filter(a => {
        const alertTime = new Date(a.timestamp);
        const hoursAgo = (Date.now() - alertTime.getTime()) / (1000 * 60 * 60);
        return hoursAgo <= 24;
    });

    const criticalAlerts = recentAlerts.filter(a => a.type === 'Critical').length;
    const medicalAlerts = recentAlerts.filter(a => a.message && a.message.includes('Medical')).length;
    const fireAlerts = recentAlerts.filter(a => a.message && a.message.includes('Fire')).length;
    const overcrowdingAlerts = recentAlerts.filter(a => a.message && a.message.includes('Overcrowding')).length;

    // Check current density
    const latestDensity = density.length > 0 ? density[0] : null;
    const currentCount = latestDensity ? latestDensity.count : 0;
    const currentDensityLevel = latestDensity ? latestDensity.density : 'Low';

    // Determine what's needed based on data
    if (medicalAlerts > 0 || criticalAlerts > 1) {
        needed.push('🚑 2 Ambulances → Nashik Central Hospital & Cidco Hospital');
    } else {
        notNeeded.push('Ambulances (no medical emergencies detected)');
    }

    if (fireAlerts > 0) {
        needed.push('🚒 Fire rescue team → Nashik Fire Station, College Road');
    } else {
        notNeeded.push('Fire rescue (no fire alerts in database)');
    }

    if (currentCount >= 3 || overcrowdingAlerts > 0 || currentDensityLevel === 'High') {
        needed.push('👮 Security personnel → Panchavati & MG Road checkpoints');
        needed.push('🚧 Crowd barriers → Nashik Road Station & Bus Stand exits');
    } else {
        notNeeded.push('Security personnel (crowd levels normal)');
        notNeeded.push('Crowd barriers (no overcrowding detected)');
    }

    if (criticalAlerts > 0 || currentCount >= 5) {
        needed.push('📡 Emergency comms → All mobile towers in 5km radius');
    } else {
        notNeeded.push('Emergency communications (situation stable)');
    }

    const reason = `Analysis: ${recentAlerts.length} alerts (${criticalAlerts} critical), ${currentCount} people detected, density: ${currentDensityLevel}`;

    return { needed, notNeeded, reason };
}

function showDeploymentModal(plan) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 99999;';

    const neededHtml = plan.needed.length > 0 ?
        `<ul style="color: #1f2937; margin: 0; padding-left: 20px;">${plan.needed.map(item => `<li>${item}</li>`).join('')}</ul>` :
        '<p style="color: #10b981; margin: 0;">✅ No additional resources needed at this time</p>';

    const notNeededHtml = plan.notNeeded.length > 0 ?
        `<div style="background: rgba(107, 114, 128, 0.1); border: 1px solid #6b7280; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #6b7280; margin: 0 0 10px 0;">⏸️ Resources Not Deployed:</h4>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 0.9rem;">${plan.notNeeded.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>` : '';

    modal.innerHTML = `
        <div style="background: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; color: #1f2937;">
            <h3 style="color: #2563eb; margin: 0 0 20px 0;"><i class="fas fa-shield-alt"></i> Smart Resource Deployment</h3>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #10b981; margin: 0 0 10px 0;">✅ Database Analysis Complete</h4>
                <p style="margin: 0; color: #1f2937;">SIMULATION: Resources deployed based on real-time database analysis:</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h4 style="color: #1f2937; margin: 0 0 10px 0;">Required Resources:</h4>
                ${neededHtml}
            </div>
            ${notNeededHtml}
            <div style="background: rgba(37, 99, 235, 0.1); border: 1px solid #2563eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #2563eb; margin: 0 0 10px 0;">📊 Database Analysis:</h4>
                <p style="margin: 0; color: #1f2937; font-size: 0.9rem;">${plan.reason}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: 600;">
                <i class="fas fa-check"></i> Acknowledged
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    showNotification('🎯 Smart deployment based on database analysis!', 'success');
}

// CSS for template buttons
const templateBtnStyles = document.createElement('style');
templateBtnStyles.textContent = `
    .template-btn {
        padding: 10px;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    .template-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(templateBtnStyles);

// =============== GOOGLE MAPS STYLE FUNCTIONALITY ===============

function setupMapSearch() {
    const searchInput = document.getElementById('mapSearch');
    const searchResults = document.getElementById('searchResults');
    const clearBtn = document.getElementById('clearSearch');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Show/hide clear button
        if (query.length > 0) {
            clearBtn.style.display = 'flex';
            clearBtn.classList.add('show');
        } else {
            clearBtn.style.display = 'none';
            clearBtn.classList.remove('show');
        }

        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        performMapSearch(query);
    });

    // Clear button functionality
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchResults.style.display = 'none';
            searchInput.focus();
        });
    }

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2) {
            searchResults.style.display = 'block';
        }
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.map-search-box')) {
            searchResults.style.display = 'none';
        }
    });
}

function performMapSearch(query) {
    const searchResults = document.getElementById('searchResults');

    // Comprehensive location database
    const locations = [
        // Major Cities
        { name: 'Mumbai, Maharashtra', coords: [19.0760, 72.8777], type: 'city' },
        { name: 'New Delhi, Delhi', coords: [28.6139, 77.2090], type: 'city' },
        { name: 'Bangalore, Karnataka', coords: [12.9716, 77.5946], type: 'city' },
        { name: 'Chennai, Tamil Nadu', coords: [13.0827, 80.2707], type: 'city' },
        { name: 'Kolkata, West Bengal', coords: [22.5726, 88.3639], type: 'city' },
        { name: 'Hyderabad, Telangana', coords: [17.3850, 78.4867], type: 'city' },
        { name: 'Pune, Maharashtra', coords: [18.5204, 73.8567], type: 'city' },
        { name: 'Ahmedabad, Gujarat', coords: [23.0225, 72.5714], type: 'city' },
        { name: 'Jaipur, Rajasthan', coords: [26.9124, 75.7873], type: 'city' },
        { name: 'Nashik, Maharashtra', coords: [19.9975, 73.7898], type: 'city' },

        // Nashik Specific
        { name: 'Nashik Road Railway Station', coords: [19.9615, 73.7926], type: 'transport' },
        { name: 'Sandip University, Nashik', coords: [19.9307, 73.7314], type: 'education' },
        { name: 'Gangapur Road, Nashik', coords: [20.0123, 73.7456], type: 'area' },
        { name: 'Deolali Camp, Nashik', coords: [19.9456, 73.8234], type: 'military' },
        { name: 'Satpur MIDC, Nashik', coords: [20.0456, 73.7123], type: 'industrial' },
        { name: 'Panchavati Temple, Nashik', coords: [19.9990, 73.7910], type: 'religious' },
        { name: 'College Road, Nashik', coords: [19.9980, 73.7900], type: 'area' },
        { name: 'MG Road, Nashik', coords: [19.9985, 73.7905], type: 'area' },

        // Points of Interest
        { name: 'Mumbai Airport (BOM)', coords: [19.0896, 72.8656], type: 'transport' },
        { name: 'Pune Airport', coords: [18.5821, 73.9197], type: 'transport' },
        { name: 'Shirdi Sai Baba Temple', coords: [19.7645, 74.4769], type: 'religious' },
        { name: 'Lonavala Hill Station', coords: [18.7537, 73.4068], type: 'tourist' },
        { name: 'Mahabaleshwar', coords: [17.9220, 73.6581], type: 'tourist' },

        // International
        { name: 'New York, USA', coords: [40.7128, -74.0060], type: 'city' },
        { name: 'London, UK', coords: [51.5074, -0.1278], type: 'city' },
        { name: 'Paris, France', coords: [48.8566, 2.3522], type: 'city' },
        { name: 'Tokyo, Japan', coords: [35.6762, 139.6503], type: 'city' },
        { name: 'Dubai, UAE', coords: [25.2048, 55.2708], type: 'city' },
        { name: 'Singapore', coords: [1.3521, 103.8198], type: 'city' }
    ];

    const results = locations.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    if (results.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    searchResults.innerHTML = results.map(result => {
        const icon = getLocationTypeIcon(result.type);
        return `
            <div class="search-result-item" onclick="selectSearchResult(${result.coords[0]}, ${result.coords[1]}, '${result.name}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 16px;">${icon}</span>
                    <div>
                        <div style="font-weight: 500;">${result.name}</div>
                        <div style="font-size: 12px; color: #666;">${result.type}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    searchResults.style.display = 'block';
}

function getLocationTypeIcon(type) {
    const icons = {
        city: '🏙️',
        transport: '🚉',
        education: '🎓',
        military: '⛺',
        industrial: '🏭',
        religious: '🛕',
        area: '📍',
        tourist: '🏔️'
    };
    return icons[type] || '📍';
}

function selectSearchResult(lat, lng, name) {
    map.setView([lat, lng], 15);

    // Add marker
    if (window.searchMarker) {
        map.removeLayer(window.searchMarker);
    }

    window.searchMarker = L.marker([lat, lng]).addTo(map);
    window.searchMarker.bindPopup(`
        <div style="text-align: center;">
            <strong>${name}</strong><br>
            <small>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</small>
        </div>
    `).openPopup();

    // Hide search results
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('mapSearch').value = name;

    showNotification(`📍 Navigated to ${name}`, 'success');
}

function switchMapLayer(layerType) {
    if (window.currentLayer) {
        map.removeLayer(window.mapLayers[window.currentLayer]);
    }

    map.addLayer(window.mapLayers[layerType]);
    window.currentLayer = layerType;

    // Add street labels for hybrid view
    if (layerType === 'hybrid') {
        if (!window.streetLabels) {
            window.streetLabels = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                opacity: 0.3
            });
        }
        window.streetLabels.addTo(map);
    } else if (window.streetLabels) {
        map.removeLayer(window.streetLabels);
    }

    showNotification(`🗺️ Switched to ${layerType} view`, 'info');
}

function getCurrentLocationOnMap() {
    const btn = document.getElementById('myLocation');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    if (!navigator.geolocation) {
        showNotification('Geolocation not supported', 'error');
        btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            map.setView([lat, lng], 16);

            // Add current location marker
            if (window.currentLocationMarker) {
                map.removeLayer(window.currentLocationMarker);
            }

            window.currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="width: 20px; height: 20px; background: #4285f4; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);

            window.currentLocationMarker.bindPopup('📍 Your current location').openPopup();

            btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            showNotification('📍 Current location found', 'success');
        },
        error => {
            btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            showNotification('Unable to get current location', 'error');
        }
    );
}

function toggleMapFullscreen() {
    const mapContainer = document.querySelector('.map-wrapper');
    const btn = document.getElementById('fullscreenMap');

    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().then(() => {
            btn.innerHTML = '<i class="fas fa-compress"></i>';
            showNotification('🔍 Entered fullscreen mode', 'info');
        }).catch(() => {
            showNotification('Fullscreen not supported', 'error');
        });
    } else {
        document.exitFullscreen().then(() => {
            btn.innerHTML = '<i class="fas fa-expand"></i>';
            showNotification('🔍 Exited fullscreen mode', 'info');
        });
    }
}

function activateStreetView() {
    const center = map.getCenter();
    const streetViewUrl = `https://www.google.com/maps/@${center.lat},${center.lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i13312!8i6656`;

    // Open in new tab
    window.open(streetViewUrl, '_blank');
    showNotification('🚶 Opening Street View in new tab', 'info');
}

function toggleTraffic() {
    const btn = document.getElementById('trafficToggle');

    if (!window.trafficLayer) {
        // Simulate traffic layer with colored routes
        window.trafficLayer = L.layerGroup();

        // Add sample traffic routes
        const trafficRoutes = [
            { coords: [[19.9975, 73.7898], [19.9615, 73.7926]], color: '#ef4444', status: 'Heavy' },
            { coords: [[19.9307, 73.7314], [20.0123, 73.7456]], color: '#f59e0b', status: 'Moderate' },
            { coords: [[19.9456, 73.8234], [20.0456, 73.7123]], color: '#10b981', status: 'Light' }
        ];

        trafficRoutes.forEach(route => {
            const polyline = L.polyline(route.coords, {
                color: route.color,
                weight: 6,
                opacity: 0.8
            });
            polyline.bindPopup(`Traffic: ${route.status}`);
            window.trafficLayer.addLayer(polyline);
        });
    }

    if (btn.classList.contains('active')) {
        map.removeLayer(window.trafficLayer);
        btn.classList.remove('active');
        showNotification('🚗 Traffic layer hidden', 'info');
    } else {
        map.addLayer(window.trafficLayer);
        btn.classList.add('active');
        showNotification('🚗 Traffic layer shown', 'info');
    }
}

function toggleTransit() {
    const btn = document.getElementById('transitToggle');

    if (!window.transitLayer) {
        // Simulate transit layer with bus/train routes
        window.transitLayer = L.layerGroup();

        // Add sample transit routes
        const transitRoutes = [
            { coords: [[19.9975, 73.7898], [19.9615, 73.7926]], type: 'Bus', line: 'Route 101' },
            { coords: [[19.9307, 73.7314], [20.0123, 73.7456]], type: 'Train', line: 'Central Line' }
        ];

        transitRoutes.forEach(route => {
            const polyline = L.polyline(route.coords, {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 5'
            });
            polyline.bindPopup(`${route.type}: ${route.line}`);
            window.transitLayer.addLayer(polyline);

            // Add transit stops
            route.coords.forEach(coord => {
                const marker = L.marker(coord, {
                    icon: L.divIcon({
                        className: 'transit-stop',
                        html: route.type === 'Bus' ? '🚌' : '🚂',
                        iconSize: [20, 20]
                    })
                });
                window.transitLayer.addLayer(marker);
            });
        });
    }

    if (btn.classList.contains('active')) {
        map.removeLayer(window.transitLayer);
        btn.classList.remove('active');
        showNotification('🚌 Transit layer hidden', 'info');
    } else {
        map.addLayer(window.transitLayer);
        btn.classList.add('active');
        showNotification('🚌 Transit layer shown', 'info');
    }
}

function showNearbyPlaces() {
    const center = map.getCenter();

    // Sample nearby places
    const nearbyPlaces = [
        { name: 'Restaurants', icon: '🍽️', coords: [center.lat + 0.001, center.lng + 0.001] },
        { name: 'Gas Stations', icon: '⛽', coords: [center.lat - 0.001, center.lng + 0.001] },
        { name: 'Hospitals', icon: '🏥', coords: [center.lat + 0.001, center.lng - 0.001] },
        { name: 'ATMs', icon: '🏧', coords: [center.lat - 0.001, center.lng - 0.001] },
        { name: 'Shopping', icon: '🛒', coords: [center.lat + 0.002, center.lng] },
        { name: 'Hotels', icon: '🏨', coords: [center.lat, center.lng + 0.002] }
    ];

    // Clear existing nearby markers
    if (window.nearbyMarkers) {
        window.nearbyMarkers.forEach(marker => map.removeLayer(marker));
    }
    window.nearbyMarkers = [];

    // Add nearby place markers
    nearbyPlaces.forEach(place => {
        const marker = L.marker(place.coords, {
            icon: L.divIcon({
                className: 'nearby-marker',
                html: `<div style="background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 16px;">${place.icon}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);

        marker.bindPopup(`${place.icon} ${place.name}`);
        window.nearbyMarkers.push(marker);
    });

    showNotification('🏢 Nearby places shown on map', 'success');
}

// Add keyboard shortcuts for map navigation
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // Don't interfere with input fields

    switch (e.key) {
        case '+':
        case '=':
            map.zoomIn();
            break;
        case '-':
            map.zoomOut();
            break;
        case 'f':
            if (e.ctrlKey) {
                e.preventDefault();
                document.getElementById('mapSearch').focus();
            }
            break;
        case 'Escape':
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('layerMenu').classList.add('hidden');
            break;
    }
});

// =============== MASS NOTIFICATION FUNCTIONS ===============
function openMobileContacts() {
    // Try to open mobile contacts app
    if (navigator.userAgent.match(/Android/i)) {
        // Android
        window.open('content://contacts/people/', '_blank');
    } else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        // iOS
        window.open('contacts://', '_blank');
    } else {
        // Desktop fallback
        showNotification('Mobile contacts feature is available on mobile devices', 'info');
    }
}

function selectContact(phone, name) {
    document.getElementById('mnPhone').value = phone;
    showNotification(`Selected ${name} (${phone})`, 'success');
}

function setTemplate(type) {
    const messageField = document.getElementById('mnMessage');
    const templates = {
        fire: '🔥 FIRE EMERGENCY ALERT 🔥\n\nImmediate evacuation required in your area. Fire detected at [LOCATION]. Please evacuate immediately via nearest safe exit. Emergency services dispatched.',
        medical: '⚕️ MEDICAL EMERGENCY ALERT ⚕️\n\nMedical emergency in progress at [LOCATION]. Medical teams dispatched. If you need immediate assistance, call emergency services.',
        overcrowding: '👥 OVERCROWDING ALERT 👥\n\nDangerous crowd levels detected at [LOCATION]. Please avoid the area and use alternative routes. Follow crowd control instructions.',
        stampede: '🏃‍♂️ STAMPEDE RISK ALERT 🏃‍♂️\n\nHigh stampede risk at [LOCATION]. Do not run. Move slowly and calmly. Follow emergency personnel instructions immediately.'
    };

    messageField.value = templates[type] || '';
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} template loaded`, 'success');
}

// =============== MASS NOTIFICATION CONTACT LIST FUNCTIONS ===============

// Mobile device detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Open contact list - mobile vs desktop handling
function openContactList() {
    if (isMobileDevice()) {
        // Try to open native contact app on mobile
        try {
            // For Android devices
            if (navigator.userAgent.toLowerCase().indexOf("android") > -1) {
                window.location.href = "content://contacts/people/";
            }
            // For iOS devices
            else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                window.location.href = "contacts://";
            }
            // Fallback for other mobile devices
            else {
                window.open("tel:", "_blank");
            }

            showNotification('Opening mobile contacts app...', 'info');
        } catch (error) {
            showNotification('Unable to open contacts app. Please select contacts manually.', 'warning');
        }
    } else {
        // Desktop message
        showNotification('Contact list app does not support desktop. This feature only works on mobile devices.', 'warning');
    }
}

// Toggle contact selection
function toggleContact(contactElement) {
    const checkbox = contactElement.querySelector('.contact-checkbox');
    const phone = contactElement.dataset.phone;
    const name = contactElement.dataset.name;

    // Toggle checkbox
    checkbox.checked = !checkbox.checked;

    // Update visual state
    if (checkbox.checked) {
        contactElement.style.background = 'rgba(16, 185, 129, 0.1)';
        contactElement.style.border = '1px solid #10b981';
    } else {
        contactElement.style.background = 'transparent';
        contactElement.style.border = '1px solid transparent';
    }

    // Update recipients input
    updateRecipientsInput();
    updateSelectedCount();
    updateContactChips();
}

// Select all contacts
function selectAllContacts() {
    const contactItems = document.querySelectorAll('.contact-item');
    const allSelected = Array.from(contactItems).every(item =>
        item.querySelector('.contact-checkbox').checked
    );

    contactItems.forEach(item => {
        const checkbox = item.querySelector('.contact-checkbox');
        checkbox.checked = !allSelected;

        if (checkbox.checked) {
            item.style.background = 'rgba(16, 185, 129, 0.1)';
            item.style.border = '1px solid #10b981';
        } else {
            item.style.background = 'transparent';
            item.style.border = '1px solid transparent';
        }
    });

    updateRecipientsInput();
    updateSelectedCount();
    updateContactChips();
}

// Update recipients input field
function updateRecipientsInput() {
    const selectedContacts = document.querySelectorAll('.contact-item .contact-checkbox:checked');
    const phoneNumbers = Array.from(selectedContacts).map(checkbox =>
        checkbox.closest('.contact-item').dataset.phone
    );

    document.getElementById('mnPhone').value = phoneNumbers.join(', ');
}

// Update selected count display
function updateSelectedCount() {
    const selectedContacts = document.querySelectorAll('.contact-item .contact-checkbox:checked');
    document.getElementById('selectedCount').textContent = selectedContacts.length;
}

// Update contact chips display
function updateContactChips() {
    const selectedContacts = document.querySelectorAll('.contact-item .contact-checkbox:checked');
    const chipsContainer = document.getElementById('contactChips');
    const display = document.getElementById('selectedContactsDisplay');

    if (selectedContacts.length > 0) {
        display.style.display = 'block';
        chipsContainer.innerHTML = '';

        selectedContacts.forEach(checkbox => {
            const contactItem = checkbox.closest('.contact-item');
            const name = contactItem.dataset.name;
            const phone = contactItem.dataset.phone;

            const chip = document.createElement('div');
            chip.style.cssText = `
                background: #10b981;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 4px;
            `;
            chip.innerHTML = `
                ${name}
                <button onclick="removeContactChip('${phone}')" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0; margin-left: 2px;">×</button>
            `;
            chipsContainer.appendChild(chip);
        });
    } else {
        display.style.display = 'none';
    }
}

// Remove contact chip
function removeContactChip(phone) {
    const contactItem = document.querySelector(`[data-phone="${phone}"]`);
    if (contactItem) {
        const checkbox = contactItem.querySelector('.contact-checkbox');
        checkbox.checked = false;
        contactItem.style.background = 'transparent';
        contactItem.style.border = '1px solid transparent';

        updateRecipientsInput();
        updateSelectedCount();
        updateContactChips();
    }
}

// Clear all recipients
function clearRecipients() {
    // Clear input field
    document.getElementById('mnPhone').value = '';

    // Uncheck all contacts
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        const checkbox = item.querySelector('.contact-checkbox');
        checkbox.checked = false;
        item.style.background = 'transparent';
        item.style.border = '1px solid transparent';
    });

    updateSelectedCount();
    updateContactChips();
    showNotification('All recipients cleared', 'info');
}

// Send mass notification with multiple numbers
function sendMassNotification() {
    const phoneNumbers = document.getElementById('mnPhone').value.trim();
    const message = document.getElementById('mnMessage').value.trim();

    if (!phoneNumbers) {
        showNotification('Please select at least one recipient', 'warning');
        return;
    }

    if (!message) {
        showNotification('Please enter a message', 'warning');
        return;
    }

    // Split phone numbers by comma and clean them
    const numbers = phoneNumbers.split(',').map(num => num.trim()).filter(num => num);

    if (numbers.length === 0) {
        showNotification('Please enter valid phone numbers', 'warning');
        return;
    }

    // Show confirmation
    const confirmMessage = `Send alert to ${numbers.length} recipient(s)?\n\nRecipients: ${numbers.join(', ')}\n\nMessage: ${message}`;

    if (confirm(confirmMessage)) {
        // Simulate sending to multiple numbers
        numbers.forEach((number, index) => {
            setTimeout(() => {
                // Open SMS for each number (in real implementation, this would be handled by backend)
                if (isMobileDevice()) {
                    window.open(`sms:${number}?body=${encodeURIComponent(message)}`, '_blank');
                } else {
                    window.open(`send-sms.html?phone=${encodeURIComponent(number)}&message=${encodeURIComponent(message)}`, '_blank', 'width=600,height=500');
                }
            }, index * 500); // Stagger the sends by 500ms
        });

        showNotification(`Mass notification sent to ${numbers.length} recipients!`, 'success');
        hideMassNotificationModal();
    }
}

// Show Mass Notification Modal
function showMassNotificationModal() {
    const modal = document.getElementById('massNotificationModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Reset form
        updateSelectedCount();
        updateContactChips();
    }
}

function hideMassNotificationModal() {
    const modal = document.getElementById('massNotificationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Refresh the modal content for next use
    const messageField = document.getElementById('mnMessage');
    if (messageField) {
        messageField.value = '';
    }
    if (typeof clearRecipients === 'function') {
        clearRecipients();
    }
}

// Template functions (if not already defined)

// Add CSS for contact interactions
const contactStyles = document.createElement('style');
contactStyles.textContent = `
    .contact-item:hover {
        background: rgba(107, 114, 128, 0.1) !important;
    }
    
    .contact-item.selected {
        background: rgba(16, 185, 129, 0.1) !important;
        border: 1px solid #10b981 !important;
    }
    
    @media (max-width: 768px) {
        .modal-body {
            flex-direction: column !important;
            gap: 15px !important;
        }
        
        .modal-body > div:last-child {
            flex: none !important;
            border-left: none !important;
            border-top: 1px solid var(--border-light) !important;
            padding-left: 0 !important;
            padding-top: 15px !important;
        }
    }
`;
document.head.appendChild(contactStyles);

// =============== CURSOR TRAIL EFFECT ===============
function initializeCursorTrail() {
    const cursorTrail = document.getElementById('cursorTrail');
    if (!cursorTrail || window.innerWidth <= 768) { // Disable on mobile for performance
        if (cursorTrail) cursorTrail.style.display = 'none';
        return;
    }

    const dots = [];
    const numDots = 6;

    for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('div');
        dot.className = 'cursor-dot';
        cursorTrail.appendChild(dot);
        dots.push({
            element: dot,
            x: 0,
            y: 0
        });
    }

    let mouseX = -100;
    let mouseY = -100;

    window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateDots() {
        let prevX = mouseX;
        let prevY = mouseY;

        dots.forEach((dot, index) => {
            const currentX = dot.x;
            const currentY = dot.y;

            dot.x += (prevX - currentX) * 0.3;
            dot.y += (prevY - currentY) * 0.3;

            dot.element.style.transform = `translate(${dot.x}px, ${dot.y}px)`;

            prevX = currentX;
            prevY = currentY;
        });

        requestAnimationFrame(animateDots);
    }

    animateDots();
}

document.addEventListener('DOMContentLoaded', initializeCursorTrail);
document.head.appendChild(contactStyles);// Location-aware template function
function setTemplate(type) {
    const messageField = document.getElementById('mnMessage');

    // Show loading state
    messageField.placeholder = 'Getting current location...';
    messageField.disabled = true;

    // Add visual feedback to the clicked button
    const buttons = document.querySelectorAll('.template-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');

    // Get current location first
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const location = {
                    lat: lat,
                    lng: lng
                };
                setTemplateWithLocation(type, location, messageField);
            },
            function (error) {
                console.warn('Geolocation error:', error.message);
                // Fallback to default location
                setTemplateWithLocation(type, null, messageField);
                let message = 'Could not get current location, using default location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'You denied the request for Geolocation. Please enable it in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'The request to get user location timed out.';
                        break;
                    case error.UNKNOWN_ERROR:
                        message = 'An unknown error occurred.';
                        break;
                }
                showNotification(message, 'warning');
            }
        );
    } else {
        // Fallback if geolocation not supported
        setTemplateWithLocation(type, null, messageField);
        showNotification('Geolocation not supported, using default location', 'warning');
    }
}

function setTemplateWithLocation(type, location, messageField) {
    let locationString;
    if (location) {
        locationString = `at coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    } else {
        locationString = "at an unknown location";
    }

    const templates = {
        fire: `🔥 FIRE EMERGENCY ALERT 🔥\n\nImmediate evacuation required! Fire detected ${locationString}. Please move to the nearest safe exit immediately and follow emergency procedures.`,
        medical: `⚕️ MEDICAL EMERGENCY ALERT ⚕️\n\nMedical assistance required ${locationString}. If you have medical training, please assist if safe to do so. Emergency services have been notified.`,
        overcrowding: `👥 OVERCROWDING ALERT 👥\n\nDangerous crowd levels detected ${locationString}. Please avoid the area and use alternative routes. Follow crowd control instructions.`,
        stampede: `🏃‍♂️ STAMPEDE RISK ALERT 🏃‍♂️\n\nHigh risk of stampede detected ${locationString}! STOP MOVING and stay where you are. Do not push or run. Wait for crowd to thin before moving slowly.`
    };

    if (templates[type]) {
        messageField.value = templates[type];
        messageField.disabled = false;
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} template applied with location: ${location ? locationString : 'Default Location'}`, 'success');
    }
}

function getLocationName(lat, lng) {
    return new Promise((resolve, reject) => {
        // Try reverse geocoding using a free service
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
            .then(response => response.json())
            .then(data => {
                if (data && (data.locality || data.city || data.principalSubdivision)) {
                    const locationName = data.locality || data.city || data.principalSubdivision;
                    resolve(locationName);
                } else {
                    reject('No location name found');
                }
            })
            .catch(error => {
                console.error('Reverse geocoding failed:', error);
                reject(error);
            });
    });
}

// =============== DATABASE SCANNING INFORMATION ===============
function startDatabaseScan() {
    const container = document.getElementById('scanning-info-container');
    if (!container) return;

    const scanStatusText = document.getElementById('scanStatusText');
    const scanLight = document.querySelector('.scan-light');
    const scanProgress = document.getElementById('scanProgress');

    // Reset UI
    scanStatusText.textContent = 'Initializing Scan...';
    scanLight.className = 'scan-light'; // Reset to default
    scanProgress.style.width = '0%';

    // Simulate scanning process
    setTimeout(() => {
        scanStatusText.textContent = 'Scanning database tables...';
        scanLight.classList.add('scanning');
        scanProgress.style.width = '30%';
    }, 500);

    setTimeout(() => {
        scanStatusText.textContent = 'Analyzing new records...';
        scanProgress.style.width = '70%';
    }, 2000);

    // Fetch data from backend to get results
    fetchDataForScan().then(data => {
        setTimeout(() => {
            scanStatusText.textContent = 'Scan Complete.';
            scanLight.classList.remove('scanning');
            scanLight.classList.add('complete');
            scanProgress.style.width = '100%';

            // Update results
            document.getElementById('tablesScanned').textContent = data.tablesScanned;
            document.getElementById('newAlertsFound').textContent = data.newAlerts;
            document.getElementById('densityRecordsAdded').textContent = data.newDensityRecords;
            document.getElementById('lastScanTime').textContent = new Date().toLocaleTimeString();

            // Restart scan after a delay
            setTimeout(startDatabaseScan, 10000); // Rescan every 10 seconds
        }, 3500);
    }).catch(err => {
        console.error("Database scan failed:", err);
        scanStatusText.textContent = 'Scan Failed. Retrying...';
        scanLight.className = 'scan-light failed'; // Use a 'failed' class
        setTimeout(startDatabaseScan, 5000);
    });
}

async function fetchDataForScan() {
    // This simulates fetching new records since the last scan.
    // In a real app, you might pass a timestamp to the backend.
    const [alertsRes, densityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/alerts`).catch(() => ({ json: () => [] })),
        fetch(`${API_BASE_URL}/api/density`).catch(() => ({ json: () => [] }))
    ]);

    const alerts = await alertsRes.json();
    const density = await densityRes.json();

    // Simulate finding "new" records
    return {
        tablesScanned: 3, // alerts, density_data, routes
        newAlerts: alerts.length > 5 ? Math.floor(Math.random() * 3) : 0,
        newDensityRecords: density.length > 10 ? Math.floor(Math.random() * 5) + 1 : 0,
    };
}


// PWA Service Worker Registration and Install Prompt
(function () {
    'use strict';

    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('CrowdShield: Service Worker registered successfully:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                if (confirm('New version of CrowdShield is available. Reload to update?')) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('CrowdShield: Service Worker registration failed:', error);
                });
        });

        // Handle service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('CrowdShield: Install prompt available');
        e.preventDefault();
        deferredPrompt = e;

        // Show custom install button after login
        setTimeout(() => {
            const loginPage = document.getElementById('loginPage');
            if (loginPage && loginPage.style.display === 'none') {
                showInstallPrompt();
            }
        }, 5000);
    });

    function showInstallPrompt() {
        if (deferredPrompt && !document.getElementById('installBanner')) {
            const installBanner = document.createElement('div');
            installBanner.id = 'installBanner';
            installBanner.innerHTML = `
                <div style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, rgba(0,255,136,0.9), rgba(0,255,136,0.7));
                    color: #0f172a;
                    padding: 15px 20px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,255,136,0.3);
                    z-index: 10000;
                    font-weight: 600;
                    cursor: pointer;
                    animation: slideInUp 0.5s ease-out;
                    max-width: 300px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-mobile-alt" style="font-size: 1.2rem;"></i>
                        <div>
                            <div style="font-size: 14px; margin-bottom: 4px;">Install CrowdShield</div>
                            <div style="font-size: 12px; opacity: 0.8;">Add to home screen for quick access</div>
                        </div>
                        <button onclick="window.installApp()" style="
                            background: #0f172a;
                            color: #00FF88;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-left: auto;
                        ">Install</button>
                        <button onclick="window.dismissInstall()" style="
                            background: transparent;
                            color: #0f172a;
                            border: none;
                            padding: 4px;
                            cursor: pointer;
                            font-size: 16px;
                        ">×</button>
                    </div>
                </div>
            `;
            document.body.appendChild(installBanner);
        }
    }

    window.installApp = function () {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('CrowdShield: User accepted the install prompt');
                } else {
                    console.log('CrowdShield: User dismissed the install prompt');
                }
                deferredPrompt = null;
                window.dismissInstall();
            });
        }
    };

    window.dismissInstall = function () {
        const banner = document.getElementById('installBanner');
        if (banner) {
            banner.remove();
        }
    };

    // Handle app installation
    window.addEventListener('appinstalled', (evt) => {
        console.log('CrowdShield: App was installed successfully');
        window.dismissInstall();
    });

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // Mobile-specific optimizations
    function initMobileOptimizations() {
        // Prevent zoom on input focus for iOS
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function () {
                if (this.style.fontSize !== '16px') {
                    this.style.fontSize = '16px';
                }
            });
        });

        // Handle viewport changes for mobile
        function setVH() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => setTimeout(setVH, 100));

        // Add mobile device class
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            document.body.classList.add('mobile-device');
        }

        // Touch-friendly improvements
        document.addEventListener('touchstart', function () { }, { passive: true });
    }

    // Initialize mobile optimizations when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileOptimizations);
    } else {
        initMobileOptimizations();
    }

})();