/* ============================================================
   Traventure — frontend logic
   Talks only to the Express backend. No API key lives here.
   ============================================================ */

(() => {
  'use strict';

  // Backend base. Uses the same origin when served by Express or Vercel,
  // so we use relative URLs (empty string) for all environments.
  const API_BASE = '';

  // ---------- Small helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  function fmt(value, suffix = '') {
    if (value == null) return '—';
    return `${Math.round(value * 10) / 10}${suffix}`;
  }

  // ---------- Weather / category visual mapping ----------
  function weatherEmoji(icon) {
    if (!icon) return '🌤️';
    switch (icon.slice(0, 2)) {
      case '01': return '☀️';
      case '02': return '⛅';
      case '03': return '☁️';
      case '04': return '☁️';
      case '09': return '🌧️';
      case '10': return '🌦️';
      case '11': return '⛈️';
      case '13': return '🌨️';
      case '50': return '🌫️';
      default: return '🌤️';
    }
  }

  const CATEGORY_META = {
    Beach: { emoji: '🏖️', grad: ['#0f4c5c', '#2a9d8f'] },
    Hill: { emoji: '⛰️', grad: ['#3a5a40', '#8cb369'] },
    Nature: { emoji: '🌿', grad: ['#2d6a4f', '#52b788'] },
    Forest: { emoji: '🌲', grad: ['#1b4332', '#40916c'] },
    Historical: { emoji: '🏛️', grad: ['#6d4c41', '#a1887f'] },
    Lake: { emoji: '🏞️', grad: ['#1d3557', '#457b9d'] },
    City: { emoji: '🏙️', grad: ['#1e3a5f', '#2d5a7f'] },
    default: { emoji: '🌍', grad: ['#0f4c5c', '#2a9d8f'] },
  };

  function catMeta(category) {
    return CATEGORY_META[category] || CATEGORY_META.default;
  }

  function recoClass(label) {
    if (label.startsWith('Excellent')) return 'reco-excellent';
    if (label.startsWith('Good')) return 'reco-good';
    if (label.startsWith('Moderate')) return 'reco-moderate';
    return 'reco-bad';
  }

  function scoreClass(score) {
    if (score >= 80) return '';
    if (score >= 60) return 'mid';
    return 'bad';
  }

  // ---------- State ----------
  const state = {
    date: new Date().toISOString().slice(0, 10),
    category: 'all',
    search: '',
    division: 'all',  // 'all' or division name
    district: 'all',  // 'all' or district id
    all: [], // full recommendations from the API
    divisions: [], // loaded from API
    districts: [], // loaded from API for selected division
  };

  // ---------- Elements ----------
  const dateInput = $('#travel-date');
  const searchBox = $('#search-box');
  const searchForm = $('#search-form');
  const filtersEl = $('#category-filters');
  const grid = $('#cards-grid');
  const statusBar = $('#status-bar');
  const statusText = $('#status-text');
  const errorBanner = $('#error-banner');
  const emptyState = $('#empty-state');
  const recNote = $('#rec-note');
  const recTitle = $('#rec-title');
  const recEyebrow = $('#rec-eyebrow');
  const modal = $('#modal');
  const modalBody = $('#modal-body');
  const modalClose = $('#modal-close');

  // District explorer elements
  const divisionGrid = $('#division-grid');
  const districtGrid = $('#district-grid');
  const divisionStep = $('#division-step');
  const districtStep = $('#district-step');
  const destinationStep = $('#destination-step');
  const selectedDivisionNameEl = $('#selected-division-name');
  const districtStepDivisionNameEl = $('#district-step-division-name');
  const divisionDistrictCountEl = $('#division-district-count');
  const destStepDivisionNameEl = $('#dest-step-division-name');
  const destStepDistrictNameEl = $('#dest-step-district-name');
  const districtDestinationCountEl = $('#district-destination-count');
  const breadcrumbDivisionNameEl = $('#breadcrumb-division-name');
  const breadcrumbDistrictNameEl = $('#breadcrumb-district-name');
  const backToDivisionsBtn = $('#back-to-divisions');
  const backToDivisionsBtn2 = $('#back-to-divisions-2');
  const backToDistrictsBtn = $('#back-to-districts');
  const districtCategoryFiltersEl = $('#district-category-filters');

  // Mobile menu elements
  const mobileMenuBtn = $('.mobile-menu-btn');
  const navLinks = $('#nav-links');

  // Mobile menu toggle
  function initMobileMenu() {
    if (!mobileMenuBtn || !navLinks) return;
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ---------- API ----------
  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data.error) msg = data.error;
      } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  async function loadDivisions() {
    try {
      const data = await fetchJSON(`${API_BASE}/api/divisions`);
      state.divisions = data.divisions || [];
      renderDivisions();
    } catch (err) {
      showError(err.message);
    }
  }

  async function loadDistrictsForDivision(division) {
    try {
      const data = await fetchJSON(`${API_BASE}/api/districts?division=${encodeURIComponent(division)}`);
      state.districts = data.districts || [];
      renderDistricts();
    } catch (err) {
      showError(err.message);
    }
  }

  async function loadRecommendations() {
    setLoading(true);
    hideError();
    try {
      const data = await fetchJSON(`${API_BASE}/api/recommendations?date=${state.date}`);
      state.all = data.recommendations || [];
      recTitle.textContent = `Best places to travel — ${state.date}`;
      recEyebrow.textContent = `${data.count} destinations · live weather`;
      renderDivisions();
      render();
      if (!map) initMap();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Rendering ----------
  function setLoading(on) {
    statusBar.hidden = !on;
    statusText.textContent = 'Loading live weather data…';
  }

  function showError(msg) {
    errorBanner.hidden = false;
    errorBanner.textContent = `⚠️ ${msg}`;
  }

  function hideError() {
    errorBanner.hidden = true;
  }

  function filteredList() {
    const q = state.search.trim().toLowerCase();
    return state.all.filter((item) => {
      const matchCat = state.category === 'all' || item.category === state.category;
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const matchDivision = state.division === 'all' || item.division === state.division;
      // District matching: compare by name since state.district is ID (e.g., "chattogram")
      // but item.district is display name (e.g., "Chattogram")
      const matchDistrict = state.district === 'all' || 
        (state.districts.some(d => d.id === state.district && d.name === item.district));
      return matchCat && matchSearch && matchDivision && matchDistrict;
    });
  }

  function render() {
    const items = filteredList();
    grid.innerHTML = '';
    emptyState.hidden = items.length > 0;

    // Update destination count in recommendation section
    recNote.textContent =
      state.category === 'all' ? `${items.length} destinations` : `Filtered: ${state.category} (${items.length} destinations)`;

    // Update destination count in district explorer
    if (districtDestinationCountEl) {
      districtDestinationCountEl.textContent = items.length;
    }

    // Update category filters for district explorer
    renderDistrictCategoryFilters();

    // Render destination cards FIRST - this must work independently of map
    try {
      items.forEach((item, i) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `View ${item.name} details`);
        card.style.animationDelay = `${i * 40}ms`;
        card.innerHTML = cardHTML(item);
        card.addEventListener('click', () => openDetails(item.id));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails(item.id);
          }
        });
        grid.appendChild(card);
      });
    } catch (err) {
      console.error('Error rendering destination cards:', err);
    }

    // Update map markers AFTER cards are rendered
    if (map) {
      try {
        filterMapMarkers(state.category);
      } catch (err) {
        console.error('Error updating map markers:', err);
      }
    }
  }

  // ---------- Division/District Explorer Rendering ----------
function renderDivisions() {
    if (!divisionGrid) return;
    divisionGrid.innerHTML = '';

    // "All Divisions" button - use total destinations from divisions data (already loaded)
    // Sum up destinationCount from all divisions
    const totalDestinations = state.divisions.reduce((sum, div) => sum + (div.destinationCount || 0), 0);
    const allBtn = document.createElement('button');
    allBtn.className = 'division-btn' + (state.division === 'all' ? ' active' : '');
    allBtn.dataset.division = 'all';
    allBtn.innerHTML = `<span class="division-name">All Divisions</span><span class="division-count">${totalDestinations}</span>`;
    allBtn.addEventListener('click', () => selectDivision('all'));
    divisionGrid.appendChild(allBtn);

    state.divisions.forEach((div) => {
      const btn = document.createElement('button');
      btn.className = 'division-btn' + (state.division === div.name ? ' active' : '');
      btn.dataset.division = div.name;
      btn.innerHTML = `<span class="division-name">${escapeHtml(div.name)}</span><span class="division-count">${div.destinationCount}</span>`;
      btn.addEventListener('click', () => selectDivision(div.name));
      divisionGrid.appendChild(btn);
    });
  }

  function selectDivision(division) {
    state.division = division;
    state.district = 'all'; // Reset district when division changes
    state.category = 'all'; // Reset category

    // Update active division button
    $$('.division-btn', divisionGrid).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.division === division);
    });

    if (division === 'all') {
      // Show all divisions step, hide district step
      divisionStep.classList.remove('hidden');
      districtStep.classList.add('hidden');
      destinationStep.classList.add('hidden');
      updateCategoryFilters();
      // Reset map to show all
      if (map) {
        filterMapMarkers(state.category);
        fitMarkersToMap();
      }
      render();
    } else {
      // Show district step
      divisionStep.classList.add('hidden');
      districtStep.classList.remove('hidden');
      destinationStep.classList.add('hidden');

      selectedDivisionNameEl.textContent = division;
      districtStepDivisionNameEl.textContent = division;
      divisionDistrictCountEl.textContent = state.districts.length || 0;

      loadDistrictsForDivision(division).then(() => {
        // Center map on division after districts are loaded
        if (map) {
          const divisionDistricts = state.districts.filter(d => d.division === division);
          if (divisionDistricts.length > 0) {
            const avgLat = divisionDistricts.reduce((sum, d) => sum + (Number(d.latitude) || 0), 0) / divisionDistricts.length;
            const avgLng = divisionDistricts.reduce((sum, d) => sum + (Number(d.longitude) || 0), 0) / divisionDistricts.length;
            if (!isNaN(avgLat) && !isNaN(avgLng)) {
              map.setView([avgLat, avgLng], 8, { animate: true });
            }
          }
        }
        render();
      });
    }
  }

  function renderDistricts() {
    if (!districtGrid) return;
    districtGrid.innerHTML = '';

    // "All Districts" button
    const allBtn = document.createElement('button');
    allBtn.className = 'district-btn' + (state.district === 'all' ? ' active' : '');
    allBtn.dataset.district = 'all';
    allBtn.innerHTML = '<span class="district-name">All Districts</span><span class="district-count">' + filteredList().length + '</span>';
    allBtn.addEventListener('click', () => selectDistrict('all'));
    districtGrid.appendChild(allBtn);

    state.districts.forEach((dist) => {
      const btn = document.createElement('button');
      btn.className = 'district-btn' + (state.district === dist.id ? ' active' : '');
      btn.dataset.district = dist.id;
      btn.innerHTML = `<span class="district-name">${escapeHtml(dist.name)}</span><span class="district-count">${dist.destinationCount || 0}</span>`;
      btn.addEventListener('click', () => selectDistrict(dist.id));
      districtGrid.appendChild(btn);
    });
  }

  function selectDistrict(district) {
    state.district = district;

    // Update active district button
    $$('.district-btn', districtGrid).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.district === district);
    });

    if (district === 'all') {
      // Stay in district step, show all districts in division
      districtStep.classList.remove('hidden');
      destinationStep.classList.add('hidden');
    } else {
      // Show destination step
      districtStep.classList.add('hidden');
      destinationStep.classList.remove('hidden');

      const dist = state.districts.find(d => d.id === district);
      if (dist) {
        destStepDivisionNameEl.textContent = state.division;
        destStepDistrictNameEl.textContent = dist.name;
        breadcrumbDivisionNameEl.textContent = state.division;
        breadcrumbDistrictNameEl.textContent = dist.name;
        districtDestinationCountEl.textContent = dist.destinationCount || 0;

        // Center map on district
        if (map) {
          const lat = Number(dist.latitude);
          const lng = Number(dist.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], 9, { animate: true });
          }
        }
      }
    }
    updateCategoryFilters();
    render();
  }

  function renderDistrictCategoryFilters() {
    if (!districtCategoryFiltersEl) return;

    // Get unique categories from currently filtered destinations
    const items = filteredList();
    const categories = [...new Set(items.map(item => item.category))].sort();

    districtCategoryFiltersEl.innerHTML = '';

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'chip' + (state.category === 'all' ? ' active' : '');
    allBtn.dataset.category = 'all';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => selectCategory('all'));
    districtCategoryFiltersEl.appendChild(allBtn);

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (state.category === cat ? ' active' : '');
      btn.dataset.category = cat;
      btn.textContent = cat;
      btn.addEventListener('click', () => selectCategory(cat));
      districtCategoryFiltersEl.appendChild(btn);
    });
  }

  function selectCategory(category) {
    state.category = category;

    // Update active category buttons in both filter sections
    $$('.chip', filtersEl).forEach((c) => c.classList.toggle('active', c.dataset.category === category));
    $$('.chip', districtCategoryFiltersEl).forEach((c) => c.classList.toggle('active', c.dataset.category === category));

    // Update district button counts
    if (state.district !== 'all' && state.division !== 'all') {
      const items = filteredList();
      $$('.district-btn', districtGrid).forEach((btn) => {
        if (btn.dataset.district !== 'all') {
          const countEl = btn.querySelector('.district-count');
          if (countEl) {
            const dist = state.districts.find(d => d.id === btn.dataset.district);
            if (dist) {
              // Match by district name since item.district is display name (e.g., "Chattogram")
              // and dist.id is the ID (e.g., "chattogram")
              const catCount = state.all.filter(i => 
                (i.district === dist.name) && (state.category === 'all' || i.category === state.category)
              ).length;
              countEl.textContent = catCount;
            }
          }
        } else {
          const countEl = btn.querySelector('.district-count');
          if (countEl) countEl.textContent = items.length;
        }
      });
    }

    render();
  }

  function updateCategoryFilters() {
    // Sync legacy category filters
    $$('.chip', filtersEl).forEach((c) => c.classList.toggle('active', c.dataset.category === state.category));
    renderDistrictCategoryFilters();
  }

  function cardHTML(item) {
    const cat = catMeta(item.category);
    const w = item.weather || {};
    const img = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="card-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="card-cat-emoji" style="display:none;">${cat.emoji}</span>`
      : `<span class="card-cat-emoji">${cat.emoji}</span>`;
    return `
      <div class="card-media" style="--grad-a:${cat.grad[0]};--grad-b:${cat.grad[1]}">
        <div class="card-media-top">
          <span class="card-category-pill">${escapeHtml(item.category)}</span>
          <div class="score-badge">
            <span class="score-ring ${scoreClass(item.travelScore)}">${item.travelScore}</span>
            <small>/ 100</small>
          </div>
        </div>
        ${img}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(item.name)}</h3>
        <p class="card-location">📍 ${escapeHtml(item.country)}</p>
        <div class="card-weather">
          <span class="weather-emoji">${weatherEmoji(w.icon)}</span>
          <div class="card-weather-main">
            <div class="card-temp">${fmt(w.temperature, '°C')}</div>
            <div class="card-cond">${escapeHtml(w.condition || '—')}</div>
          </div>
          <div class="card-rain"><span class="rain-dot">💧</span>${w.rainProbability ?? '—'}%</div>
        </div>
        <div class="card-recommend ${recoClass(item.recommendation)}">${escapeHtml(item.recommendation)}</div>
        <p class="card-hint">Click for full details →</p>
      </div>`;
  }

  // ---------- Details modal ----------
  async function openDetails(id) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalBody.innerHTML = `
      <div class="modal-loading"><span class="spinner"></span><p>Loading destination…</p></div>`;

    try {
      const item = await fetchJSON(`${API_BASE}/api/destinations/${id}?date=${state.date}`);
      modalBody.innerHTML = detailsHTML(item);
    } catch (err) {
      modalBody.innerHTML = `
        <div class="modal-loading"><p>⚠️ ${escapeHtml(err.message)}</p></div>`;
    }
  }

  function detailsHTML(item) {
    const cat = catMeta(item.category);
    const w = item.weather || {};
    const activities = item.recommendedActivities || [];

    const noteHtml = w.note
      ? `<div class="modal-note">ℹ️ ${escapeHtml(w.note)}</div>`
      : '';

    const metric = (emoji, label, value) => `
      <div class="metric">
        <span class="metric-emoji">${emoji}</span>
        <div>
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}</div>
        </div>
      </div>`;

    const modalMedia = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="modal-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="card-cat-emoji" style="display:none;">${cat.emoji}</span>`
      : `<span class="card-cat-emoji">${cat.emoji}</span>`;

    return `
      <div class="modal-hero" style="--grad-a:${cat.grad[0]};--grad-b:${cat.grad[1]}">
        ${modalMedia}
      </div>
      <div class="modal-main">
        <span class="chip">${escapeHtml(item.category)}</span>
        <h2 class="modal-title">${escapeHtml(item.name)}</h2>
        ${item.location && item.location.length > 0 ? `<p class="modal-location-detail">📍 ${escapeHtml(item.location)}</p>` : ''}
        <p class="modal-location">📍 ${escapeHtml(item.country)} · ${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}</p>
        <p class="modal-desc">${escapeHtml(item.shortDescription)}</p>

        <div class="modal-badges">
          <span class="score-badge">
            <span class="score-ring ${scoreClass(item.travelScore)}">${item.travelScore}</span>
            <small>Travel Score / 100</small>
          </span>
          <span class="chip">${escapeHtml(item.recommendation)}</span>
        </div>

        <div class="modal-grid">
          ${metric('🌡️', 'Temperature', fmt(w.temperature, '°C'))}
          ${metric('🤔', 'Feels like', fmt(w.feelsLike, '°C'))}
          ${metric('💧', 'Rain chance', `${w.rainProbability ?? '—'}%`)}
          ${metric('💦', 'Precipitation', fmt(w.precipitationMm, ' mm'))}
          ${metric('💨', 'Wind speed', `${fmt(w.windSpeedKmh)} km/h`)}
          ${metric('💧', 'Humidity', `${w.humidity ?? '—'}%`)}
          ${metric('👁️', 'Visibility', fmt(w.visibilityKm, ' km'))}
          ${metric('⛅', 'Condition', escapeHtml(w.condition || '—'))}
        </div>

        <div class="modal-reco ${recoClass(item.recommendation)}">
          <strong>${escapeHtml(item.recommendation)}</strong>
          ${escapeHtml(item.shortRecommendation || '')}
        </div>

        <div class="modal-activities">
          <h3>Recommended activities</h3>
          <ul>${activities.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
        </div>
        ${noteHtml}
      </div>`;
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    modalBody.innerHTML = '';
  }

  // ---------- Event wiring ----------
  dateInput.value = state.date;
  dateInput.max = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  dateInput.min = new Date().toISOString().slice(0, 10);

  dateInput.addEventListener('change', () => {
    state.date = dateInput.value || state.date;
    loadRecommendations();
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.search = searchBox.value;
    render();
    $('#destinations').scrollIntoView({ behavior: 'smooth' });
  });

  searchBox.addEventListener('input', () => {
    state.search = searchBox.value;
    render();
  });

  filtersEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip', filtersEl).forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.category = chip.dataset.category;
    // Sync district category filters
    $$('.chip', districtCategoryFiltersEl).forEach((c) => c.classList.toggle('active', c.dataset.category === state.category));
    render();
  });

  // District explorer back buttons
  if (backToDivisionsBtn) {
    backToDivisionsBtn.addEventListener('click', () => selectDivision('all'));
  }
  if (backToDivisionsBtn2) {
    backToDivisionsBtn2.addEventListener('click', () => selectDivision('all'));
  }
  if (backToDistrictsBtn) {
    backToDistrictsBtn.addEventListener('click', () => {
      const division = state.division;
      if (division && division !== 'all') {
        selectDivision(division);
      }
    });
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // ---------- Map ----------
  let map = null;
  let markers = {};
  let markerData = {}; // Store marker data for zoom-dependent sizing

  // Calculate marker size based on zoom level
  function getMarkerSize(zoom) {
    if (zoom <= 5) return { size: 16, anchor: 8 };       // Country-level: ~16px
    if (zoom <= 7) return { size: 18, anchor: 9 };       // Country-wide: ~18px
    if (zoom <= 9) return { size: 24, anchor: 12 };      // Regional: ~24px
    if (zoom <= 11) return { size: 30, anchor: 15 };     // Division-level: ~30px
    if (zoom <= 13) return { size: 40, anchor: 20 };     // District-level: ~40px
    if (zoom <= 15) return { size: 48, anchor: 24 };     // Local: ~48px
    return { size: 56, anchor: 28 };                     // Very close: ~56px
  }

  // Create marker HTML with dynamic size
  function createMarkerHtml(item, zoom) {
    const { image, category, travelScore } = item;
    const scoreRange = getScoreRange(travelScore);
    const catColor = {
      Excellent: 'var(--score-good)',
      Good: 'var(--score-mid)',
      Moderate: '#b7791f',
      'Not Recommended': 'var(--score-bad)',
    }[scoreRange];

    const { size } = getMarkerSize(zoom);
    const borderWidth = Math.max(1, Math.round(size * 0.06)); // Scale border with size

    // Hide score text on fallback markers at low zoom to reduce clutter
    const showScoreText = zoom >= 10;

    if (image) {
      return `<div class="marker-image-wrapper" style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${escapeHtml(image)}');background-size:cover;background-position:center;border:${borderWidth}px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
    } else {
      const fontSize = Math.max(8, Math.round(size * 0.22));
      const padding = Math.max(2, Math.round(size * 0.08));
      const scoreText = showScoreText ? scoreRange : '';
      return `<div class="marker-fallback" style="width:${size}px;height:${size}px;border-radius:50%;background:${catColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#fff;border:${borderWidth}px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);text-align:center;line-height:1.2;padding:${padding}px;">${scoreText}</div>`;
    }
  }

  // Update all markers for current zoom level
  function updateMarkersForZoom() {
    if (!map) return;
    const zoom = map.getZoom();
    const { size, anchor } = getMarkerSize(zoom);

    Object.entries(markers).forEach(([id, marker]) => {
      const data = markerData[id];
      if (!data) return;

      const html = createMarkerHtml(data.item, zoom);
      const newIcon = L.divIcon({
        html,
        className: 'custom-marker',
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
      });
      marker.setIcon(newIcon);
    });
  }

  function initMap() {
    try {
      const mapEl = $('#map');
      if (!mapEl || mapEl.offsetParent === null) return;
      map = L.map('map').setView([23.8515, 90.3823], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add destination markers from state.all
    state.all.forEach((item) => {
      const { latitude, longitude, name, category, travelScore, weather, recommendation, image } = item;
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.error('Skipping invalid map coordinate:', { id: item.id, name: item.name, district: item.district, latitude: item.latitude, longitude: item.longitude, lat, lng });
        return;
      }

      const popupContent = createPopupContent(item);

      // Store marker data for zoom-dependent sizing
      markerData[item.id] = { item };

      // Create initial marker with zoom-appropriate size
      const initialZoom = map.getZoom();
      const markerHtml = createMarkerHtml(item, initialZoom);
      const { size, anchor } = getMarkerSize(initialZoom);

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: 'custom-marker',
          iconSize: [size, size],
          iconAnchor: [anchor, anchor],
        }),
      })
        .bindPopup(popupContent)
        .addTo(map);

      // Add tooltip with destination name (hover only, not permanent)
      marker.bindTooltip(name, {
        permanent: false,
        direction: 'top',
        offset: [0, -28],
        className: 'map-marker-tooltip',
        sticky: true,
      });

      markers[item.id] = marker;
    });

    // Update markers on zoom change
    map.on('zoomend', updateMarkersForZoom);

    // Fit markers to map with some padding
    fitMarkersToMap();

    // Category filter functionality
    const mapFiltersEl = $('#map-filters');
    if (mapFiltersEl) {
      mapFiltersEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        $$('.filter-chip', mapFiltersEl).forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const category = chip.dataset.filter;
        filterMapMarkers(category);
        // Sync with card filters
        $$('.chip', filtersEl).forEach((c) => {
          if (c.dataset.category === category) {
            c.classList.add('active');
          }
        });
        state.category = category;
        render();
      });
    }

    // Search synchronization - supports division, district, and destination
    const searchBox = $('#search-box');
    if (searchBox) {
      searchBox.addEventListener('input', () => {
        const q = searchBox.value.trim().toLowerCase();
        if (!q) return;

        // Check for division match
        const divisionMatch = state.divisions.find(d => d.name.toLowerCase().includes(q));
        if (divisionMatch) {
          selectDivision(divisionMatch.name);
          return;
        }

        // Check for district match
        const districtMatch = state.districts.find(d => d.name.toLowerCase().includes(q));
        if (districtMatch) {
          selectDivision(state.division);
          // Wait for districts to load, then select
          setTimeout(() => selectDistrict(districtMatch.id), 100);
          return;
        }

        // Check for destination match
        const match = state.all.find(
          (item) => item.name.toLowerCase().includes(q)
        );
        if (match) {
          // Auto-select division/district if needed
          if (state.division !== match.division) {
            selectDivision(match.division);
          }
          if (state.district !== match.district) {
            setTimeout(() => selectDistrict(match.district), 100);
          }
          const lat = Number(match.latitude);
          const lng = Number(match.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], 10, { animate: true });
            if (markers[match.id]) {
              markers[match.id].openPopup();
            }
          }
        }
        render();
      });
    }

    // Map click sync with cards - when card clicked, center map
    const grid = $('#cards-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        const itemId = card.getAttribute('aria-label');
        if (!itemId) return;
        const item = state.all.find((i) => i.id === itemId.replace('view-', ''));
        if (item) {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], 10, { animate: true });
            if (markers[item.id]) {
              markers[item.id].openPopup();
            }
          }
        }
      });
    }

    // Popup "View Details" button handler
    map.on('popupopen', (e) => {
      const popup = e.popup;
      const btn = popup.getElement().querySelector('.popup-view-details');
      if (btn) {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          openDetails(id);
        });
      }
    });
  } catch (err) {
    console.error('Error initializing map:', err);
  }
}

function getScoreRange(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Not Recommended';
  }

  function createPopupContent(item) {
    const { name, category, weather, travelScore, recommendation, image } = item;
    const w = weather || {};
    const meta = catMeta(category);
    const formattedTemp = fmt(w.temperature, '°C');
    const formattedRainProb = w.rainProbability ?? '—';

    const imgHtml = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="popup-image" loading="lazy">`
      : `<span class="popup-emoji">${meta.emoji}</span>`;

    return `
      <div class="map-popup">
        <div class="map-popup-header">
          ${imgHtml}
          <div class="map-popup-title">
            <strong>${escapeHtml(name)}</strong>
            <span class="map-popup-category">${escapeHtml(category)}</span>
          </div>
        </div>
        <div class="map-popup-body">
          <div class="map-popup-row">
            <span class="map-popup-emoji">${weatherEmoji(w.icon)}</span>
            <div>
              <div class="map-popup-label">Condition</div>
              <div class="map-popup-value">${escapeHtml(w.condition || '—')}</div>
            </div>
          </div>
          <div class="map-popup-row">
            <span class="map-popup-emoji">🌡️</span>
            <div>
              <div class="map-popup-label">Temp</div>
              <div class="map-popup-value">${formattedTemp}</div>
            </div>
          </div>
          <div class="map-popup-row">
            <span class="map-popup-emoji">💧</span>
            <div>
              <div class="map-popup-label">Rain</div>
              <div class="map-popup-value">${formattedRainProb}%</div>
            </div>
          </div>
          <div class="map-popup-row">
            <span class="map-popup-emoji">🎯</span>
            <div>
              <div class="map-popup-label">Score</div>
              <div class="map-popup-value">${travelScore}/100</div>
            </div>
          </div>
          <div class="map-popup-row">
            <span class="map-popup-emoji">✅</span>
            <div>
              <div class="map-popup-label">Rec.</div>
              <div class="map-popup-value">${escapeHtml(recommendation)}</div>
            </div>
          </div>
        </div>
        <button class="popup-view-details" data-id="${escapeHtml(item.id)}">View Details</button>
      </div>`;
  }

  function filterMapMarkers(category) {
    try {
      const isAll = category === 'all';
      Object.entries(markers).forEach(([id, marker]) => {
        const item = state.all.find((i) => i.id === id);
        if (!item) return;
        const matchCategory = isAll || item.category === category;
        const matchDivision = state.division === 'all' || item.division === state.division;
        // District matching: compare by name since state.district is ID (e.g., "chattogram")
        // but item.district is display name (e.g., "Chattogram")
        const matchDistrict = state.district === 'all' || 
          (state.districts.some(d => d.id === state.district && d.name === item.district));
        if (matchCategory && matchDivision && matchDistrict) {
          marker.addTo(map);
        } else {
          map.removeLayer(marker);
        }
      });
      fitMarkersToMap();
    } catch (err) {
      console.error('Error in filterMapMarkers:', err);
    }
  }

  function fitMarkersToMap() {
    const visibleMarkers = Object.values(markers).filter(
      (marker) => map.hasLayer(marker)
    );
    if (visibleMarkers.length === 0) return;
    if (visibleMarkers.length === 1) {
      const latLng = visibleMarkers[0].getLatLng();
      if (latLng && !isNaN(latLng.lat) && !isNaN(latLng.lng)) {
        map.setView(latLng, 10);
      }
      return;
    }
    const latLngs = visibleMarkers
      .map((m) => m.getLatLng())
      .filter((ll) => ll && !isNaN(ll.lat) && !isNaN(ll.lng));
    if (latLngs.length === 0) return;
    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  // Expose filter function globally for category chip sync
  window.filterMapByCategory = function (category) {
    state.category = category;
    filterMapMarkers(category);
    render();
    // Update category chips
    $$('.chip', filtersEl).forEach((c) => c.classList.remove('active'));
    $$('.chip', filtersEl).forEach((c) => {
      if (c.dataset.category === category) {
        c.classList.add('active');
      }
    });
  };

  // Initial load
  initMobileMenu();
  loadDivisions().then(loadRecommendations);
})();