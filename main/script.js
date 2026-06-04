/**
 * ============================================================
 * Chaos Creatures Breed & Morph Shop Portal — Controller v2.0
 * ============================================================
 */

// Species specific genetic database
const SPECIES_GENEDB = {
  'ball-python': {
    name: 'Ball Python',
    genes: {
      // Recessives
      albino: { name: 'Albino', type: 'recessive' },
      piebald: { name: 'Piebald', type: 'recessive' },
      clown: { name: 'Clown', type: 'recessive' },
      ghost: { name: 'Ghost (Hypo)', type: 'recessive' },
      axanthic: { name: 'Axanthic', type: 'recessive' },
      gstripe: { name: 'Genetic Stripe', type: 'recessive' },
      lavender: { name: 'Lavender Albino', type: 'recessive' },
      dghost: { name: 'Desert Ghost', type: 'recessive' },
      sunset: { name: 'Sunset', type: 'recessive' },
      tristripe: { name: 'Tri-stripe', type: 'recessive' },
      toffee: { name: 'Toffee', type: 'recessive' },
      puzzle: { name: 'Puzzle', type: 'recessive' },
      monsoon: { name: 'Monsoon', type: 'recessive' },

      // Co-dominants (Super forms)
      pastel: { name: 'Pastel', type: 'codom', superName: 'Super Pastel' },
      mojave: { name: 'Mojave', type: 'codom', superName: 'Super Mojave' },
      lesser: { name: 'Lesser', type: 'codom', superName: 'Super Lesser' },
      butter: { name: 'Butter', type: 'codom', superName: 'Super Butter' },
      yellowbelly: { name: 'Yellowbelly', type: 'codom', superName: 'Ivory' },
      asphalt: { name: 'Asphalt', type: 'codom', superName: 'Super Asphalt' },
      gravel: { name: 'Gravel', type: 'codom', superName: 'Super Gravel' },
      fire: { name: 'Fire', type: 'codom', superName: 'Super Fire' },
      enchi: { name: 'Enchi', type: 'codom', superName: 'Super Enchi' },
      leopard: { name: 'Leopard', type: 'codom', superName: 'Super Leopard' },
      cinnamon: { name: 'Cinnamon', type: 'codom', superName: 'Super Cinnamon' },
      blackpastel: { name: 'Black Pastel', type: 'codom', superName: 'Super Black Pastel' },
      ghi: { name: 'GHI', type: 'codom', superName: 'Super GHI' },
      mahogany: { name: 'Mahogany', type: 'codom', superName: 'Suma' },
      spotnose: { name: 'Spotnose', type: 'codom', superName: 'Super Spotnose' },
      bamboo: { name: 'Bamboo', type: 'codom', superName: 'Super Bamboo' },
      scaleless: { name: 'Scaleless Head', type: 'codom', superName: 'Scaleless' },
      champagne: { name: 'Champagne', type: 'codom', superName: 'Super Champagne' },
      calico: { name: 'Calico', type: 'codom', superName: 'Super Calico' },
      sugar: { name: 'Sugar', type: 'codom', superName: 'Super Sugar' },
      phantom: { name: 'Phantom', type: 'codom', superName: 'Super Phantom' },
      mystic: { name: 'Mystic', type: 'codom', superName: 'Super Mystic' },
      banana: { name: 'Banana', type: 'codom', superName: 'Super Banana' },
      coralglow: { name: 'Coral Glow', type: 'codom', superName: 'Super Coral Glow' },
      specter: { name: 'Specter', type: 'codom', superName: 'Super Specter' },
      spark: { name: 'Spark', type: 'codom', superName: 'Super Spark' },

      // Dominants (Visual only, no separate Super form)
      spider: { name: 'Spider', type: 'dominant' },
      pinstripe: { name: 'Pinstripe', type: 'dominant' },
      woma: { name: 'Woma', type: 'dominant' },
      blade: { name: 'Blade', type: 'dominant' },
      acid: { name: 'Acid', type: 'dominant' },
      hurricane: { name: 'Hurricane', type: 'dominant' }
    }
  },
  'blood-python': {
    name: 'Blood Python',
    genes: {
      // Recessives
      tplus: { name: 'T+ Albino', type: 'recessive' },
      tminus: { name: 'T- Albino', type: 'recessive' },
      axanthic: { name: 'VPI Axanthic', type: 'recessive' },
      vbialbino: { name: 'VPI Albino', type: 'recessive' },

      // Co-dominants (Super forms)
      matrix: { name: 'Matrix', type: 'codom', superName: 'Ivory' },
      goldeneye: { name: 'Goldeneye', type: 'codom', superName: 'Magpie' },
      batik: { name: 'Batik', type: 'codom', superName: 'Super Batik' },
      pixel: { name: 'Pixel', type: 'codom', superName: 'Super Pixel' },
      stripe: { name: 'Stripe', type: 'codom', superName: 'Super Stripe' },

      // Dominants
      chrome: { name: 'Chrome', type: 'dominant' }
    }
  },
  'crested-gecko': {
    name: 'Crested Gecko',
    genes: {
      // Recessives
      axanthic: { name: 'Axanthic', type: 'recessive' },

      // Co-dominants (Super forms)
      lilly: { name: 'Lilly White', type: 'codom', superName: 'Lethal Super Lilly (BEL)' },
      cappuccino: { name: 'Cappuccino', type: 'codom', superName: 'Super Cappuccino' },
      sable: { name: 'Sable', type: 'codom', superName: 'Super Sable' },

      // Dominants (Often line-bred but modeled as dominant for planner utility)
      harlequin: { name: 'Harlequin', type: 'dominant' },
      flame: { name: 'Flame', type: 'dominant' },
      pinstripe: { name: 'Pinstripe', type: 'dominant' },
      quadstripe: { name: 'Quadstripe', type: 'dominant' },
      tiger: { name: 'Tiger', type: 'dominant' }
    }
  },
  'leopard-gecko': {
    name: 'Leopard Gecko',
    genes: {
      // Recessives
      tremper: { name: 'Tremper Albino', type: 'recessive' },
      bell: { name: 'Bell Albino', type: 'recessive' },
      rainwater: { name: 'Rainwater Albino', type: 'recessive' },
      eclipse: { name: 'Eclipse', type: 'recessive' },
      blizzard: { name: 'Blizzard', type: 'recessive' },
      patternless: { name: 'Murphy Patternless', type: 'recessive' },
      ndbe: { name: 'Noir Desir (NDBE)', type: 'recessive' },

      // Co-dominants (Super forms)
      macksnow: { name: 'Mack Snow', type: 'codom', superName: 'Super Mack Snow' },
      gemsnow: { name: 'Gem Snow', type: 'codom', superName: 'Super Gem Snow' },
      giant: { name: 'Giant', type: 'codom', superName: 'Super Giant' },
      lemonfrost: { name: 'Lemon Frost', type: 'codom', superName: 'Super Lemon Frost' },

      // Dominants
      wy: { name: 'White & Yellow', type: 'dominant' },
      enigma: { name: 'Enigma', type: 'dominant' }
    }
  }
};

class ChaosShopApp {
  static THEME_KEY = 'ccr-theme';
  static DARK_META  = '#06080d';
  static LIGHT_META = '#f5f7fa';
  static SCROLL_THRESHOLD = 50;
  static ANIM_OBSERVER_THRESHOLD = 0.15;

  constructor() {
    this.html = document.documentElement;
    this.body = document.body;
    
    // Core DOM refs
    this.themeToggleBtn = null;
    this.themeMetaTag   = null;
    this.navToggleBtn   = null;
    this.navMenu        = null;
    this.navOverlay     = null;
    this.navbar         = null;

    // Calculator State Scopes
    this.plannerSpecies  = null;
    this.selectedSpecies = 'ball-python';
    this.sireActiveGenes = {};
    this.damActiveGenes  = {};

    // Calculator DOM refs
    this.calcBtn              = null;
    this.resultsIntro         = null;
    this.resultsListContainer = null;
    this.resultsList          = null;

    // Filters DOM refs
    this.filterSpecies = null;
    this.filterGender  = null;

    // Form DOM refs
    this.inquiryForm  = null;
    this.successBanner = null;

    // Boot sequencing
    try {
      this._initTheme();
      this._initMobileNav();
      this._initNavbarScroll();
      this._initScrollAnimations();
      this._initSmoothScroll();
      this._initFilters();
      this._initCalculator();
      this._initFormSubmit();
      this._initInquireButtons();
    } catch (err) {
      console.error('[ChaosShopApp] Boot error:', err);
    }
  }

  /* ============================================================
   * 1. THEME TOGGLING
   * ============================================================ */
  _initTheme() {
    this.themeToggleBtn = document.querySelector('#themeToggle');
    this.themeMetaTag   = document.querySelector('meta[name="theme-color"]');
    
    const saved = localStorage.getItem(ChaosShopApp.THEME_KEY);

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
      localStorage.setItem(ChaosShopApp.THEME_KEY, 'dark');
    } else {
      this._applyLightTheme();
      localStorage.setItem(ChaosShopApp.THEME_KEY, 'light');
    }
  }

  _applyLightTheme() {
    this.html.classList.add('light-theme');
    this._setThemeButtonText('☀️');
    this._setThemeMeta(ChaosShopApp.LIGHT_META);
  }

  _applyDarkTheme() {
    this.html.classList.remove('light-theme');
    this._setThemeButtonText('🌙');
    this._setThemeMeta(ChaosShopApp.DARK_META);
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
      if (window.scrollY > ChaosShopApp.SCROLL_THRESHOLD) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
   * 4. SCROLL ENTRANCE ANIMATIONS
   * ============================================================ */
  _initScrollAnimations() {
    const targets = document.querySelectorAll('.animate-on-scroll');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: ChaosShopApp.ANIM_OBSERVER_THRESHOLD }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ============================================================
   * 5. SMOOTH SCROLL ANCHORS
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

  /* ============================================================
   * 6. SHOP LISTING FILTERS
   * ============================================================ */
  _initFilters() {
    this.filterSpecies = document.querySelector('#filterSpecies');
    this.filterGender  = document.querySelector('#filterGender');

    if (!this.filterSpecies || !this.filterGender) return;

    const triggerFilter = () => {
      const spVal = this.filterSpecies.value;
      const gdVal = this.filterGender.value;

      document.querySelectorAll('.animal-card').forEach((card) => {
        const cardSp = card.getAttribute('data-species');
        const cardGd = card.getAttribute('data-gender');

        const spMatch = (spVal === 'all' || cardSp === spVal);
        const gdMatch = (gdVal === 'all' || cardGd === gdVal);

        if (spMatch && gdMatch) {
          card.classList.remove('filtered-out');
        } else {
          card.classList.add('filtered-out');
        }
      });
    };

    this.filterSpecies.addEventListener('change', triggerFilter);
    this.filterGender.addEventListener('change', triggerFilter);
  }

  /* ============================================================
   * 7. BREEDER GENETICS PLANNER (PUNNETT CALCULATOR)
   * ============================================================ */
  _initCalculator() {
    this.calcBtn              = document.querySelector('#calcGeneticsBtn');
    this.resultsIntro         = document.querySelector('#resultsIntro');
    this.resultsListContainer = document.querySelector('#resultsListContainer');
    this.resultsList          = document.querySelector('#resultsList');
    this.plannerSpecies       = document.querySelector('#plannerSpecies');

    if (!this.calcBtn) return;

    // Load default species genes (Ball Python)
    this.selectedSpecies = this.plannerSpecies ? this.plannerSpecies.value : 'ball-python';
    this._populateGeneSelects();

    // Hook species dropdown change
    if (this.plannerSpecies) {
      this.plannerSpecies.addEventListener('change', () => {
        this.selectedSpecies = this.plannerSpecies.value;
        
        // Reset selected tags and data
        this.sireActiveGenes = {};
        this.damActiveGenes = {};
        
        this._renderTags('sire');
        this._renderTags('dam');
        this._populateGeneSelects();
        
        // Clear outputs
        if (this.resultsListContainer) this.resultsListContainer.style.display = 'none';
        if (this.resultsIntro) this.resultsIntro.style.display = 'block';
      });
    }

    // Hook change events on sire select
    const sireSelect = document.querySelector('#sireGeneSelect');
    sireSelect.addEventListener('change', () => this._handleGeneSelectChange('sire'));

    const sireAddBtn = document.querySelector('#sireAddGeneBtn');
    sireAddBtn.addEventListener('click', () => this._addGene('sire'));

    // Hook change events on dam select
    const damSelect = document.querySelector('#damGeneSelect');
    damSelect.addEventListener('change', () => this._handleGeneSelectChange('dam'));

    const damAddBtn = document.querySelector('#damAddGeneBtn');
    damAddBtn.addEventListener('click', () => this._addGene('dam'));

    // Calculate cross trigger
    this.calcBtn.addEventListener('click', () => {
      this._runGeneticsCross();
    });
  }

  /** Populates select dropdown elements with selected species sorted genes */
  _populateGeneSelects() {
    const sireSelect = document.querySelector('#sireGeneSelect');
    const damSelect = document.querySelector('#damGeneSelect');

    if (!sireSelect || !damSelect) return;

    // Reset lists
    sireSelect.innerHTML = '<option value="">-- Add a Gene --</option>';
    damSelect.innerHTML = '<option value="">-- Add a Gene --</option>';

    const genes = SPECIES_GENEDB[this.selectedSpecies].genes;

    // Sort genes alphabetically
    const sortedKeys = Object.keys(genes).sort((a, b) => {
      return genes[a].name.localeCompare(genes[b].name);
    });

    sortedKeys.forEach((key) => {
      const gene = genes[key];
      const typeText = gene.type === 'codom' ? 'Co-dom' : (gene.type === 'recessive' ? 'Recessive' : 'Dominant');
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${gene.name} (${typeText})`;
      
      sireSelect.appendChild(option);
      damSelect.appendChild(option.cloneNode(true));
    });
  }

  /** Changes the carrier states depending on select gene type */
  _handleGeneSelectChange(parent) {
    const select = document.querySelector(`#${parent}GeneSelect`);
    const stateSelect = document.querySelector(`#${parent}GeneState`);
    const geneId = select.value;

    if (!geneId) {
      stateSelect.style.display = 'none';
      stateSelect.innerHTML = '';
      return;
    }

    const genes = SPECIES_GENEDB[this.selectedSpecies].genes;
    const gene = genes[geneId];
    stateSelect.innerHTML = '';

    if (gene.type === 'recessive') {
      stateSelect.innerHTML = `
        <option value="het">Carrier (Het)</option>
        <option value="homo">Visual (Homo)</option>
      `;
    } else if (gene.type === 'codom') {
      stateSelect.innerHTML = `
        <option value="het">Single Gene (Het)</option>
        <option value="homo">Super Form (Homo)</option>
      `;
    } else if (gene.type === 'dominant') {
      stateSelect.innerHTML = `
        <option value="homo">Visual</option>
      `;
    }

    stateSelect.style.display = '';
  }

  /** Adds a selected gene tag to the parent mapping */
  _addGene(parent) {
    const select = document.querySelector(`#${parent}GeneSelect`);
    const stateSelect = document.querySelector(`#${parent}GeneState`);
    const geneId = select.value;
    const state = stateSelect.value;

    if (!geneId) return;

    const activeMap = (parent === 'sire' ? this.sireActiveGenes : this.damActiveGenes);

    // Enforce 7 active genes limit combining both parents to avoid rendering freezes
    const sireKeysCount = Object.keys(this.sireActiveGenes).length;
    const damKeysCount = Object.keys(this.damActiveGenes).length;
    const totalActiveCount = sireKeysCount + damKeysCount;

    if (totalActiveCount >= 7 && !activeMap[geneId]) {
      alert('To prevent calculation freeze, you can select a maximum of 7 active genes combined between parents.');
      return;
    }

    activeMap[geneId] = state;

    // Reset selectors
    select.value = '';
    stateSelect.style.display = 'none';
    stateSelect.innerHTML = '';

    this._renderTags(parent);
  }

  /** Renders visual tag pills below parent consoles */
  _renderTags(parent) {
    const container = document.querySelector(`#${parent}ActiveTags`);
    const activeMap = (parent === 'sire' ? this.sireActiveGenes : this.damActiveGenes);
    container.innerHTML = '';

    const keys = Object.keys(activeMap);

    if (keys.length === 0) {
      container.innerHTML = '<p class="no-tags-placeholder">Normal Wild-Type</p>';
      return;
    }

    const genes = SPECIES_GENEDB[this.selectedSpecies].genes;

    keys.forEach((geneId) => {
      const gene = genes[geneId];
      const state = activeMap[geneId];
      let stateText = '';

      if (gene.type === 'recessive') {
        stateText = (state === 'het' ? 'Het' : 'Visual');
      } else if (gene.type === 'codom') {
        stateText = (state === 'het' ? 'Single' : 'Super');
      } else if (gene.type === 'dominant') {
        stateText = 'Visual';
      }

      const tag = document.createElement('span');
      tag.className = `gene-tag ${parent === 'sire' ? 'sire-tag' : 'dam-tag'}`;
      tag.innerHTML = `
        ${gene.name} (${stateText})
        <button type="button" class="remove-tag-btn" data-gene-id="${geneId}">&times;</button>
      `;

      // Close tag event
      tag.querySelector('.remove-tag-btn').addEventListener('click', () => {
        delete activeMap[geneId];
        this._renderTags(parent);
      });

      container.appendChild(tag);
    });
  }

  /** Performs the locus combinations, group matching, and renders visual graphs */
  _runGeneticsCross() {
    const activeGeneKeys = new Set([
      ...Object.keys(this.sireActiveGenes),
      ...Object.keys(this.damActiveGenes)
    ]);

    // Handle Normal x Normal pairing directly
    if (activeGeneKeys.size === 0) {
      this.resultsList.innerHTML = `
        <div class="result-item">
          <div class="result-header">
            <span class="result-morph-name">Normal Wild-Type</span>
            <span class="result-pct">100.00%</span>
          </div>
          <div class="result-genotype">Genetics: Normal Wild-Type (No mutations)</div>
          <div class="result-bar-wrapper">
            <div class="result-bar" style="width: 100%;"></div>
          </div>
        </div>
      `;
      if (this.resultsIntro) this.resultsIntro.style.display = 'none';
      if (this.resultsListContainer) this.resultsListContainer.style.display = 'block';
      return;
    }

    // Cross individual active loci
    let locusOutcomes = [];
    for (let geneKey of activeGeneKeys) {
      const sireState = this.sireActiveGenes[geneKey] || 'normal';
      const damState = this.damActiveGenes[geneKey] || 'normal';
      const crossed = this._crossLocus(sireState, damState, geneKey);
      locusOutcomes.push(crossed);
    }

    // Cartesian product of crossed loci outcomes
    let combinations = [ { phenoNames: [], geneTexts: [], prob: 1.0 } ];

    for (let locusList of locusOutcomes) {
      let nextCombos = [];
      for (let current of combinations) {
        for (let outcome of locusList) {
          let newPhenos = [...current.phenoNames];
          if (outcome.phenoName) newPhenos.push(outcome.phenoName);

          let newGenes = [...current.geneTexts];
          if (outcome.geneText && outcome.geneText !== 'Normal') newGenes.push(outcome.geneText);

          nextCombos.push({
            phenoNames: newPhenos,
            geneTexts: newGenes,
            prob: current.prob * outcome.prob
          });
        }
      }
      combinations = nextCombos;
    }

    // Group combinations with the same visual phenotype and carriers
    let grouped = {};
    for (let c of combinations) {
      let morphName = c.phenoNames.join(' ');
      if (!morphName) morphName = 'Normal Wild-Type';

      let geneticsText = c.geneTexts.join(', ');
      if (!geneticsText) geneticsText = 'Normal Wild-Type (No mutations)';

      let key = morphName + '||' + geneticsText;
      if (!grouped[key]) {
        grouped[key] = {
          morphName: morphName,
          genetics: geneticsText,
          prob: 0
        };
      }
      grouped[key].prob += c.prob;
    }

    // Convert grouped mapping back to array and sort by probability descending
    let finalOutcomes = Object.values(grouped).sort((x, y) => y.prob - x.prob);

    // Render visual graphs in output
    this.resultsList.innerHTML = '';
    
    finalOutcomes.forEach((outcome) => {
      const percentage = (outcome.prob * 100).toFixed(2);
      const row = document.createElement('div');
      row.className = 'result-item';
      row.innerHTML = `
        <div class="result-header">
          <span class="result-morph-name">${outcome.morphName}</span>
          <span class="result-pct">${percentage}%</span>
        </div>
        <div class="result-genotype">Genetics: ${outcome.genetics}</div>
        <div class="result-bar-wrapper">
          <div class="result-bar" style="width: 0%;"></div>
        </div>
      `;

      this.resultsList.appendChild(row);

      // Trigger width animation transition
      requestAnimationFrame(() => {
        const bar = row.querySelector('.result-bar');
        if (bar) bar.style.width = `${percentage}%`;
      });
    });

    if (this.resultsIntro) this.resultsIntro.style.display = 'none';
    if (this.resultsListContainer) this.resultsListContainer.style.display = 'block';
  }

  /**
   * Mendelian model cross for a single gene locus.
   * Returns array of { phenoName: string, geneText: string, prob: number }
   */
  _crossLocus(sireState, damState, geneKey) {
    const genes = SPECIES_GENEDB[this.selectedSpecies].genes;
    const gene = genes[geneKey];
    let sireAlleles = [];
    if (sireState === 'normal') sireAlleles = ['n', 'n'];
    else if (sireState === 'het') sireAlleles = ['A', 'n'];
    else if (sireState === 'homo') sireAlleles = ['A', 'A'];

    let damAlleles = [];
    if (damState === 'normal') damAlleles = ['n', 'n'];
    else if (damState === 'het') damAlleles = ['A', 'n'];
    else if (damState === 'homo') damAlleles = ['A', 'A'];

    // Crossing Punnett Square grid
    let outcomes = {};
    for (let a1 of sireAlleles) {
      for (let a2 of damAlleles) {
        let genotype = [a1, a2].sort().join('/');
        outcomes[genotype] = (outcomes[genotype] || 0) + 0.25;
      }
    }

    let results = [];
    for (let genotype in outcomes) {
      let prob = outcomes[genotype];
      let phenoName = '';
      let geneText = '';

      if (gene.type === 'codom') {
        if (genotype === 'A/A') {
          phenoName = gene.superName;
          geneText = `${gene.superName} (Homozygous)`;
        } else if (genotype === 'A/n') {
          phenoName = gene.name;
          geneText = `${gene.name} (Heterozygous)`;
        } else {
          phenoName = '';
          geneText = 'Normal';
        }
      } 
      else if (gene.type === 'dominant') {
        if (genotype === 'A/A' || genotype === 'A/n') {
          phenoName = gene.name;
          geneText = gene.name;
        } else {
          phenoName = '';
          geneText = 'Normal';
        }
      }
      else if (gene.type === 'recessive') {
        if (genotype === 'A/A') {
          phenoName = gene.name;
          geneText = `Visual ${gene.name}`;
        } else if (genotype === 'A/n') {
          phenoName = '';
          geneText = `100% Het ${gene.name}`;
        } else {
          phenoName = '';
          geneText = 'Normal';
        }
      }

      results.push({
        phenoName: phenoName,
        geneText: geneText,
        prob: prob
      });
    }

    return results;
  }

  /* ============================================================
   * 8. ANIMAL CARD INQUIRY HANDLER
   * ============================================================ */
  _initInquireButtons() {
    document.querySelectorAll('.inquire-trigger-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-animal-id');
        const name = btn.getAttribute('data-animal-name');

        const animalIdInput   = document.querySelector('#formAnimalId');
        const inquiryTypeSelect = document.querySelector('#formInquiryType');
        const formMessage      = document.querySelector('#formMessage');
        const formSection      = document.querySelector('#inquiry');

        if (animalIdInput) animalIdInput.value = id;
        if (inquiryTypeSelect) inquiryTypeSelect.value = 'Purchase Inquiry';
        if (formMessage) {
          formMessage.value = `Hello! I would like to inquire about the available animal: ${name} (ID: #${id}). Please let me know its status, feeding details, and shipping steps. Thanks!`;
        }

        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        const nameInput = document.querySelector('#formName');
        if (nameInput) {
          setTimeout(() => nameInput.focus(), 600);
        }
      });
    });
  }

  /* ============================================================
   * 9. WEB3FORMS SUBMISSION
   * ============================================================ */
  _initFormSubmit() {
    this.inquiryForm  = document.querySelector('#inquiryForm');
    this.successBanner = document.querySelector('#successBanner');

    if (!this.inquiryForm) return;

    this.inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = this.inquiryForm.querySelector('.form-submit-btn');
      const originalText = submitBtn.textContent;
      
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      if (this.successBanner) this.successBanner.style.display = 'none';

      const name = document.querySelector('#formName').value;
      const type = document.querySelector('#formInquiryType').value;
      const ref = document.querySelector('#formAnimalId').value;
      
      const subjectInput = document.querySelector('#formSubject');
      if (subjectInput) {
        subjectInput.value = `Shop Inquiry [${type}] from ${name}` + (ref ? ` (Ref: #${ref})` : '');
      }

      const formData = new FormData(this.inquiryForm);

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
          this.inquiryForm.reset();
        } else {
          console.error('[ChaosShopApp] Submission failed:', result);
          alert('Failed to send message. Please email chaoscreaturesmi@gmail.com directly.');
        }
      } catch (err) {
        console.error('[ChaosShopApp] Connection error:', err);
        alert('Connection error. Please email chaoscreaturesmi@gmail.com directly.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

// Instantiate
document.addEventListener('DOMContentLoaded', () => {
  new ChaosShopApp();
});
