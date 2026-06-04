/**
 * ============================================================
 * Chaos Creatures Rescue — Main Landing Script
 * ============================================================
 *
 * Wire up theme toggle, mobile navigation drawer, interactive
 * surrender form submission, and scroll animations.
 * ============================================================
 */

class ChaosRescueApp {
  static THEME_KEY = 'ccr-theme';
  static DARK_META  = '#06080d';
  static LIGHT_META = '#f5f7fa';
  static SCROLL_THRESHOLD = 50;

  constructor() {
    this.html           = document.documentElement;
    this.body           = document.body;
    this.themeToggleBtn = null;
    this.themeMetaTag   = null;
    this.navToggleBtn   = null;
    this.navMenu        = null;
    this.navOverlay     = null;
    this.navbar         = null;
    this.surrenderForm  = null;
    this.successBanner  = null;

    try {
      this._initTheme();
      this._initMobileNav();
      this._initNavbarScroll();
      this._initFormSubmit();
      this._initKeyboardShortcuts();
      this._initSmoothScroll();
    } catch (err) {
      console.error('[ChaosRescueApp] Boot error:', err);
    }
  }

  /* ============================================================
   * 1. THEME TOGGLE (Synced with Care Library)
   * ============================================================ */
  _initTheme() {
    this.themeToggleBtn = document.querySelector('#themeToggle');
    this.themeMetaTag   = document.querySelector('meta[name="theme-color"]');
    const saved = localStorage.getItem(ChaosRescueApp.THEME_KEY);

    if (saved === 'light') {
      this._applyLightTheme();
    } else if (saved === 'dark') {
      this._applyDarkTheme();
    } else {
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

  _toggleTheme() {
    if (this.html.classList.contains('light-theme')) {
      this._applyDarkTheme();
      localStorage.setItem(ChaosRescueApp.THEME_KEY, 'dark');
    } else {
      this._applyLightTheme();
      localStorage.setItem(ChaosRescueApp.THEME_KEY, 'light');
    }
  }

  _applyLightTheme() {
    this.html.classList.add('light-theme');
    this._setThemeButtonText('☀️');
    this._setThemeMeta(ChaosRescueApp.LIGHT_META);
  }

  _applyDarkTheme() {
    this.html.classList.remove('light-theme');
    this._setThemeButtonText('🌙');
    this._setThemeMeta(ChaosRescueApp.DARK_META);
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
   * 2. MOBILE NAVIGATION DRAWER
   * ============================================================ */
  _initMobileNav() {
    this.navToggleBtn = document.querySelector('#navToggle');
    this.navMenu      = document.querySelector('#navMenu');
    this.navOverlay   = document.querySelector('.nav-overlay');

    if (!this.navToggleBtn || !this.navMenu) return;

    this.navToggleBtn.addEventListener('click', () => this._toggleMobileMenu());

    if (this.navOverlay) {
      this.navOverlay.addEventListener('click', () => this._closeMobileMenu());
    }

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
    this.body.style.overflow = 'hidden';
  }

  _closeMobileMenu() {
    this.navToggleBtn.classList.remove('active');
    this.navMenu.classList.remove('active');
    if (this.navOverlay) this.navOverlay.classList.remove('active');
    this.body.style.overflow = '';
  }

  _isMobileMenuOpen() {
    return this.navMenu && this.navMenu.classList.contains('active');
  }

  /* ============================================================
   * 3. NAVBAR SCROLL EFFECT
   * ============================================================ */
  _initNavbarScroll() {
    this.navbar = document.querySelector('.navbar-fixed');
    if (!this.navbar) return;

    const onScroll = () => {
      if (window.scrollY > ChaosRescueApp.SCROLL_THRESHOLD) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
   * 4. INTERACTIVE SURRENDER FORM
   * ============================================================ */
  _initFormSubmit() {
    this.surrenderForm = document.querySelector('#surrenderForm');
    this.successBanner = document.querySelector('#successBanner');

    if (!this.surrenderForm) return;

    this.surrenderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = this.surrenderForm.querySelector('.form-submit-btn');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      // Hide success banner if it was already showing
      if (this.successBanner) {
        this.successBanner.style.display = 'none';
      }

      // Dynamically assemble the email subject
      const name = document.querySelector('#formName').value;
      const species = document.querySelector('#formSpecies').value;
      const isUrgent = document.querySelector('#formUrgent').checked;
      
      const subjectInput = document.querySelector('#formSubject');
      if (subjectInput) {
        subjectInput.value = (isUrgent ? '[URGENT] ' : '') + `Surrender Request: ${species} from ${name}`;
      }

      const formData = new FormData(this.surrenderForm);

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.status === 200) {
          if (this.successBanner) {
            this.successBanner.style.display = 'block';
            this.successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          this.surrenderForm.reset();
        } else {
          console.error('[ChaosRescueApp] Web3Forms Error:', result);
          alert('Submission failed. Please email us directly at chaoscreaturesmi@gmail.com.');
        }
      } catch (err) {
        console.error('[ChaosRescueApp] Connection error:', err);
        alert('Connection error. Please email us directly at chaoscreaturesmi@gmail.com.');
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  /* ============================================================
   * 5. KEYBOARD SHORTCUTS
   * ============================================================ */
  _initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isMobileMenuOpen()) {
        this._closeMobileMenu();
      }

      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this._toggleTheme();
      }
    });
  }

  /* ============================================================
   * 6. SMOOTH SCROLL ANCHORS
   * ============================================================ */
  _initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        e.preventDefault();

        if (this._isMobileMenuOpen()) {
          this._closeMobileMenu();
        }

        targetEl.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new ChaosRescueApp();
});
