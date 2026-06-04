/**
 * ============================================================
 * Chaos Creature Rescue — Main Application Script
 * ============================================================
 *
 * A single, self-instantiating class that bootstraps every
 * interactive feature of the Chaos Creature Rescue PWA:
 *
 *  1.  Theme toggle (dark / light) with system preference
 *  2.  Mobile hamburger navigation
 *  3.  Debounced search & filter across all card types
 *  4.  Scroll-triggered entrance animations
 *  5.  Navbar shrink-on-scroll effect
 *  6.  Smooth-scroll anchor links
 *  7.  PWA "Add to Home Screen" install prompt
 *  8.  Service Worker registration
 *  9.  Keyboard shortcuts
 *  10. Active nav-link tracking via Intersection Observer
 *  11. Print button
 *
 * No external dependencies — pure vanilla ES6+.
 * ============================================================
 */

class ChaosCreatureApp {
  // ── Static constants ──────────────────────────────────────
  static THEME_KEY = 'ccr-theme';
  static DARK_META  = '#0a0c10';
  static LIGHT_META = '#f8fafb';
  static SCROLL_THRESHOLD = 50;
  static SEARCH_DEBOUNCE  = 200;
  static ANIM_OBSERVER_THRESHOLD  = 0.15;
  static NAV_OBSERVER_THRESHOLD   = 0.3;

  /* ──────────────────────────────────────────────────────────
   * Constructor — wire up every feature
   * ────────────────────────────────────────────────────────── */
  constructor() {
    // Cached DOM references (set during init methods)
    this.html           = document.documentElement;
    this.body           = document.body;
    this.themeToggleBtn = null;
    this.themeMetaTag   = null;
    this.navToggleBtn   = null;
    this.navMenu        = null;
    this.navOverlay     = null;
    this.searchInput    = null;
    this.searchClear    = null;
    this.installBtn     = null;
    this.printBtn       = null;
    this.navbar         = null;

    // State
    this.deferredInstallPrompt = null;
    this.searchDebounceTimer   = null;

    // Boot sequence
    try {
      this._initTheme();
      this._initMobileNav();
      this._initSearch();
      this._initScrollAnimations();
      this._initNavbarScroll();
      this._initSmoothScroll();
      this._initPWAInstall();
      this._registerServiceWorker();
      this._initKeyboardShortcuts();
      this._initActiveNavTracking();
      this._initPrintButton();
      this._initAccordion();
    } catch (err) {
      console.error('[ChaosCreatureApp] Initialisation error:', err);
    }
  }

  /* ============================================================
   * 1. THEME TOGGLE
   * ============================================================ */
  _initTheme() {
    this.themeToggleBtn = document.querySelector('#themeToggle');
    this.themeMetaTag   = document.querySelector('meta[name="theme-color"]');

    // Determine initial theme:
    //   1. Check localStorage for a saved preference
    //   2. Fall back to system preference
    const saved = localStorage.getItem(ChaosCreatureApp.THEME_KEY);

    if (saved === 'light') {
      this._applyLightTheme();
    } else if (saved === 'dark') {
      this._applyDarkTheme();
    } else {
      // No saved preference — respect OS setting
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this._applyDarkTheme();
      } else {
        this._applyLightTheme();
      }
    }

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this._toggleTheme());
    }
  }

  /** Switch between dark and light */
  _toggleTheme() {
    if (this.html.classList.contains('light-theme')) {
      this._applyDarkTheme();
      localStorage.setItem(ChaosCreatureApp.THEME_KEY, 'dark');
    } else {
      this._applyLightTheme();
      localStorage.setItem(ChaosCreatureApp.THEME_KEY, 'light');
    }
  }

  _applyLightTheme() {
    this.html.classList.add('light-theme');
    this._setThemeMeta(ChaosCreatureApp.LIGHT_META);
    this._setThemeButtonText('☀️');
  }

  _applyDarkTheme() {
    this.html.classList.remove('light-theme');
    this._setThemeMeta(ChaosCreatureApp.DARK_META);
    this._setThemeButtonText('🌙');
  }

  _setThemeMeta(color) {
    if (this.themeMetaTag) {
      this.themeMetaTag.setAttribute('content', color);
    }
  }

  _setThemeButtonText(emoji) {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.textContent = emoji;
    }
  }

  /* ============================================================
   * 2. MOBILE NAVIGATION
   * ============================================================ */
  _initMobileNav() {
    this.navToggleBtn = document.querySelector('#navToggle');
    this.navMenu      = document.querySelector('#navMenu');
    this.navOverlay   = document.querySelector('.nav-overlay');

    if (!this.navToggleBtn || !this.navMenu) return;

    // Hamburger button click
    this.navToggleBtn.addEventListener('click', () => this._toggleMobileMenu());

    // Close when clicking the overlay
    if (this.navOverlay) {
      this.navOverlay.addEventListener('click', () => this._closeMobileMenu());
    }

    // Close when clicking any nav link inside the menu
    this.navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => this._closeMobileMenu());
    });
  }

  _toggleMobileMenu() {
    const isOpen = this.navToggleBtn.classList.contains('active');
    if (isOpen) {
      this._closeMobileMenu();
    } else {
      this._openMobileMenu();
    }
  }

  _openMobileMenu() {
    this.navToggleBtn.classList.add('active');
    this.navMenu.classList.add('active');
    if (this.navOverlay) this.navOverlay.classList.add('active');
    this.body.style.overflow = 'hidden'; // prevent background scroll
  }

  _closeMobileMenu() {
    this.navToggleBtn.classList.remove('active');
    this.navMenu.classList.remove('active');
    if (this.navOverlay) this.navOverlay.classList.remove('active');
    this.body.style.overflow = '';
  }

  /** Whether the mobile menu is currently visible */
  _isMobileMenuOpen() {
    return this.navMenu && this.navMenu.classList.contains('active');
  }

  /* ============================================================
   * 3. SEARCH & FILTER
   * ============================================================ */
  _initSearch() {
    this.searchInput = document.querySelector('#searchInput');
    this.searchClear = document.querySelector('#searchClear');

    if (!this.searchInput) return;

    // Debounced input handler
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this._performSearch(this.searchInput.value.trim());
      }, ChaosCreatureApp.SEARCH_DEBOUNCE);

      // Show/hide clear button
      if (this.searchClear) {
        this.searchClear.style.display = this.searchInput.value ? '' : 'none';
      }
    });

    // Enter key handler to blur on mobile
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.searchInput.blur();
        clearTimeout(this.searchDebounceTimer);
        this._performSearch(this.searchInput.value.trim());
      }
    });

    // Clear button
    if (this.searchClear) {
      this.searchClear.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchClear.style.display = 'none';
        this._performSearch('');
        this.searchInput.focus();
      });
    }
  }

  /**
   * Filter `.species-card`, `.guide-card`, and `.feeder-card` elements.
   * Searches through headings (h3), paragraphs, and list-item text.
   * Hides non-matching cards with the `.search-hidden` class.
   * Shows a `.no-results` message when no cards match.
   */
  _performSearch(query) {
    const cards = document.querySelectorAll('.species-card, .guide-card, .feeder-card');
    const lowerQuery = query.toLowerCase();
    let matchCount = 0;

    cards.forEach((card) => {
      if (!lowerQuery) {
        // Empty query — show everything
        card.classList.remove('search-hidden');
        
        // Collapse all guide/feeder cards when query is cleared
        if (card.classList.contains('guide-card') || card.classList.contains('feeder-card')) {
          card.classList.remove('expanded');
          const header = card.querySelector('.guide-header') || card.querySelector('.feeder-header');
          if (header) header.setAttribute('aria-expanded', 'false');
        }
        matchCount++;
        return;
      }

      // Gather searchable text from key child elements
      const textParts = [];
      card.querySelectorAll('h3, p, li').forEach((el) => {
        textParts.push(el.textContent);
      });

      // Also include any direct text on the card itself (alt text, data attrs, etc.)
      const searchableText = textParts.join(' ').toLowerCase();

      if (searchableText.includes(lowerQuery)) {
        card.classList.remove('search-hidden');
        
        // Automatically expand matching guide/feeder cards during active search
        if (card.classList.contains('guide-card') || card.classList.contains('feeder-card')) {
          card.classList.add('expanded');
          const header = card.querySelector('.guide-header') || card.querySelector('.feeder-header');
          if (header) header.setAttribute('aria-expanded', 'true');
        }
        matchCount++;
      } else {
        card.classList.add('search-hidden');
      }
    });

    // Manage "no results" message
    this._toggleNoResultsMessage(lowerQuery && matchCount === 0);
  }

  /**
   * Show or hide an inline "no results" message.
   * Creates the element on first use and appends it after the
   * first card grid found on the page.
   */
  _toggleNoResultsMessage(show) {
    let msgEl = document.querySelector('.no-results');

    if (show) {
      if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.className = 'no-results';
        msgEl.textContent = 'No matching creatures or guides found.';

        // Insert after the first card container we can find
        const container =
          document.querySelector('.species-grid') ||
          document.querySelector('.guide-grid') ||
          document.querySelector('.feeder-grid') ||
          document.querySelector('main');

        if (container) {
          container.parentNode.insertBefore(msgEl, container.nextSibling);
        } else {
          this.body.appendChild(msgEl);
        }
      }
      msgEl.style.display = '';
    } else if (msgEl) {
      msgEl.style.display = 'none';
    }
  }

  /* ============================================================
   * 4. SCROLL ANIMATIONS (Intersection Observer)
   * ============================================================ */
  _initScrollAnimations() {
    const targets = document.querySelectorAll('.animate-on-scroll');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: ChaosCreatureApp.ANIM_OBSERVER_THRESHOLD }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ============================================================
   * 5. NAVBAR SCROLL EFFECT
   * ============================================================ */
  _initNavbarScroll() {
    this.navbar = document.querySelector('.navbar-fixed');
    if (!this.navbar) return;

    const onScroll = () => {
      if (window.scrollY > ChaosCreatureApp.SCROLL_THRESHOLD) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
  }

  /* ============================================================
   * 6. SMOOTH SCROLL FOR ANCHOR LINKS
   * ============================================================ */
  _initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        e.preventDefault();

        // Close mobile menu first if it's open
        if (this._isMobileMenuOpen()) {
          this._closeMobileMenu();
        }

        targetEl.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ============================================================
   * 7. PWA INSTALL PROMPT
   * ============================================================ */
  _initPWAInstall() {
    this.installBtn = document.querySelector('#installBtn');

    // Capture the deferred prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;

      // Show install button and its wrapper <li>
      if (this.installBtn) {
        this.installBtn.hidden = false;
        this.installBtn.style.display = '';
        const wrapper = document.querySelector('#installBtnWrapper');
        if (wrapper) wrapper.style.display = '';
      }
    });

    // Handle install button click
    if (this.installBtn) {
      this.installBtn.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) return;

        try {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;

          if (outcome === 'accepted') {
            console.log('[ChaosCreatureApp] PWA install accepted');
          } else {
            console.log('[ChaosCreatureApp] PWA install dismissed');
          }
        } catch (err) {
          console.error('[ChaosCreatureApp] Install prompt error:', err);
        }

        // Prompt can only be used once
        this.deferredInstallPrompt = null;
        this.installBtn.hidden = true;
      });
    }

    // Hide button after successful install
    window.addEventListener('appinstalled', () => {
      console.log('[ChaosCreatureApp] PWA installed successfully');
      this.deferredInstallPrompt = null;
      if (this.installBtn) this.installBtn.hidden = true;
    });
  }

  /* ============================================================
   * 8. SERVICE WORKER REGISTRATION
   * ============================================================ */
  _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[ChaosCreatureApp] Service Workers not supported');
      return;
    }

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log(
          '[ChaosCreatureApp] Service Worker registered — scope:',
          registration.scope
        );
      } catch (err) {
        console.error('[ChaosCreatureApp] Service Worker registration failed:', err);
      }
    });
  }

  /* ============================================================
   * 9. KEYBOARD SHORTCUTS
   * ============================================================ */
  _initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape — close mobile menu
      if (e.key === 'Escape' && this._isMobileMenuOpen()) {
        this._closeMobileMenu();
        return;
      }

      // Alt + T — toggle theme
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this._toggleTheme();
        return;
      }

      // Ctrl/Cmd + P — let browser handle print (no preventDefault)
    });
  }

  /* ============================================================
   * 10. ACTIVE NAV LINK TRACKING
   * ============================================================ */
  _initActiveNavTracking() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id');
          const navLink = document.querySelector(`.nav-menu a[href="#${id}"]`);

          if (!navLink) return;

          if (entry.isIntersecting) {
            // Remove active from all nav links, then set on current
            document
              .querySelectorAll('.nav-menu a')
              .forEach((a) => a.classList.remove('active'));
            navLink.classList.add('active');
          }
        });
      },
      {
        threshold: ChaosCreatureApp.NAV_OBSERVER_THRESHOLD,
        rootMargin: '0px 0px -60% 0px', // trigger when section is in top 40%
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ============================================================
   * 11. PRINT BUTTON
   * ============================================================ */
  _initPrintButton() {
    // Main navbar print button (prints everything)
    this.printBtn = document.querySelector('#printBtn');
    if (this.printBtn) {
      this.printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Individual card print buttons
    const cardPrintBtns = document.querySelectorAll('.card-print-btn');
    cardPrintBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid collapsing/expanding accordion on click
        const card = btn.closest('.guide-card, .feeder-card');
        if (!card) return;

        // Apply single-print classes
        document.body.classList.add('print-single-mode');
        card.classList.add('print-target');

        // Trigger print dialog
        window.print();

        // Clean up classes immediately after print dialog resolves
        document.body.classList.remove('print-single-mode');
        card.classList.remove('print-target');
      });
    });
  }

  /* ============================================================
   * 12. COLLAPSIBLE ACCORDION FOR CARE GUIDES
   * ============================================================ */
  _initAccordion() {
    const accordionCards = document.querySelectorAll('.guide-card, .feeder-card');

    accordionCards.forEach((card) => {
      // By default, collapse all cards on boot
      card.classList.remove('expanded');

      const header = card.querySelector('.guide-header') || card.querySelector('.feeder-header');
      if (header) {
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'false');

        const toggleCard = () => {
          const isExpanded = card.classList.toggle('expanded');
          header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        };

        header.addEventListener('click', toggleCard);
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCard();
          }
        });
      }
    });

    // Intercept card link clicks (Full Care Guide -> scroll and expand)
    document.querySelectorAll('.card-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          const targetCard = document.querySelector(targetId);
          if (targetCard && (targetCard.classList.contains('guide-card') || targetCard.classList.contains('feeder-card'))) {
            targetCard.classList.add('expanded');
            const header = targetCard.querySelector('.guide-header') || targetCard.querySelector('.feeder-header');
            if (header) header.setAttribute('aria-expanded', 'true');
          }
        }
      });
    });
  }
}

/* ================================================================
 * Boot the app once the DOM is ready
 * ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  try {
    new ChaosCreatureApp();
  } catch (err) {
    console.error('[ChaosCreatureApp] Fatal boot error:', err);
  }
});
