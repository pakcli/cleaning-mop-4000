/**
 * CLEANING MOP 4000 - Interactive Application Logic
 * Premium, state-driven, and stoic.
 */

// STATE MANAGEMENT
const state = {
  floorArea: 150, // m²
  messType: 'indomie', // indomie, mystery, rice, unspecified, everything
  activeMode: 'traditional', // traditional, cart, mop4000
  isAnimating: false,
  selectedVariant: 'standard',
  
  // Playback Control State
  isPlaying: true,       // Play / Pause state (default is playing)
  speedDirection: 'faster', // 'slower' or 'faster'
  speedMultiplier: 1,    // default to 1x (realtime)
  currentStep: 0,
  totalSteps: 0,
  durationMs: 0,
  estimatedTimeMin: 0,
  timeouts: []
};

// DOM ELEMENTS
const floorAreaSlider = document.getElementById('floor-area-slider');
const floorAreaDisplay = document.getElementById('floor-area-display');
const messTypeSelect = document.getElementById('mess-type-select');
const interactiveGrid = document.getElementById('interactive-grid');
const simFrame = document.getElementById('sim-frame');
const modeButtons = document.querySelectorAll('.btn-mode-toggle');

const metricTime = document.getElementById('metric-time');
const metricEnergy = document.getElementById('metric-energy');
const metricDignity = document.getElementById('metric-dignity');

const orderForm = document.getElementById('mop-procure-form');
const selectVariantDropdown = document.getElementById('select-variant');
const inputQty = document.getElementById('input-quantity');

const modalOverlay = document.getElementById('receipt-modal-overlay');
const receiptName = document.getElementById('receipt-name');
const receiptAddress = document.getElementById('receipt-address');
const receiptVariant = document.getElementById('receipt-variant');
const receiptQty = document.getElementById('receipt-qty');
const receiptSeverity = document.getElementById('receipt-severity');
const receiptTotalPrice = document.getElementById('receipt-total-price');
const receiptTxId = document.getElementById('receipt-tx-id');
const receiptTimeDisplay = document.getElementById('receipt-time');

// Sweeper SVG Elements
const sweepers = {
  traditional: document.getElementById('sweeper-traditional'),
  cart: document.getElementById('sweeper-cart'),
  mop4000: document.getElementById('sweeper-mop4000')
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  renderGrid();
  updateMetrics();
  setupNavigationHighlighting();
  
  // Slider listener
  floorAreaSlider.addEventListener('input', (e) => {
    state.floorArea = parseInt(e.target.value);
    
    // Smooth readable formatting
    if (state.floorArea >= 1000) {
      floorAreaDisplay.textContent = `${(state.floorArea / 1000).toFixed(1)}k m²`;
    } else {
      floorAreaDisplay.textContent = `${state.floorArea} m²`;
    }
    
    renderGrid();
    updateMetrics();
  });

  // Slider change listener for auto-restart
  floorAreaSlider.addEventListener('change', () => {
    triggerSweepAnimation();
  });
  
  // Mess type dropdown listener
  messTypeSelect.addEventListener('change', (e) => {
    state.messType = e.target.value;
    updateMesses();
    triggerSweepAnimation(); // Auto-restart!
  });
  
  // Mode togglers
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.activeMode = btn.dataset.mode;
      updateMetrics();
      triggerSweepAnimation(); // Auto-restart!
    });
  });

  // Play/Pause button listener
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      togglePlayPause();
    });
  }
  
  // Speed multiplier buttons listener
  const speedButtons = document.querySelectorAll('.btn-speed');
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      speedButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.speedDirection = btn.dataset.dir;
      state.speedMultiplier = parseInt(btn.dataset.mult);
      
      // Auto restart on speed change!
      triggerSweepAnimation();
    });
  });

  // Default auto-start simulation at page load in real-time speed (1x)
  triggerSweepAnimation();
});

// 1. GRID GENERATOR
// Renders orthographic tile sizes based on floor dimensions
function renderGrid() {
  interactiveGrid.innerHTML = '';
  
  // Cap visual grid at 1000 m² for superior performance
  const area = Math.min(1000, state.floorArea);
  const rows = Math.max(1, Math.round(Math.sqrt(area / 1.5)));
  const cols = Math.max(1, Math.round(rows * 1.5));
  
  interactiveGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  interactiveGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  
  const totalTiles = cols * rows;
  
  for (let i = 0; i < totalTiles; i++) {
    const tile = document.createElement('div');
    const isLight = (Math.floor(i / cols) + (i % cols)) % 2 === 0;
    tile.className = `grid-tile ${isLight ? 'tile-light' : 'tile-dark'}`;
    tile.dataset.col = i % cols;
    tile.dataset.row = Math.floor(i / cols);
    
    // Add Mess element
    const mess = document.createElement('div');
    mess.className = `mess-spot active`;
    tile.appendChild(mess);
    
    interactiveGrid.appendChild(tile);
  }
  
  updateMesses();
}

// 2. MESS VECTOR UPDATER
// Sets appropriate visual classes for selected threat vectors
function updateMesses() {
  const messes = document.querySelectorAll('.mess-spot');
  messes.forEach((mess, idx) => {
    // Wipe old types
    mess.className = 'mess-spot active';
    
    if (state.messType === 'everything') {
      // In hazardous state, spawn messy chaotic gradients
      const classes = ['mess-indomie', 'mess-mystery', 'mess-rice', 'mess-unspecified'];
      const randomClass = classes[idx % classes.length];
      mess.classList.add(randomClass);
    } else {
      mess.classList.add(`mess-${state.messType}`);
    }
  });
}

// 3. SIMULATOR SWEEP ANIMATION SYSTEM
function triggerSweepAnimation() {
  // Clear any existing timeouts/animation loop first
  state.timeouts.forEach(clearTimeout);
  state.timeouts = [];
  
  const mode = state.activeMode;
  const sweeper = sweepers[mode];
  const tiles = document.querySelectorAll('.grid-tile');
  
  // Clear any existing cleansed classes/messes first
  tiles.forEach(t => {
    t.classList.remove('cleansed');
    const m = t.querySelector('.mess-spot');
    if (m) m.classList.add('active');
  });
  
  // Hide other sweepers
  Object.keys(sweepers).forEach(m => {
    if (m !== mode) {
      sweepers[m].style.display = 'none';
      sweepers[m].style.animation = 'none';
    }
  });

  // Setup active sweeper element position
  sweeper.style.display = 'block';
  sweeper.style.animation = 'none';
  
  // Calculate dynamic simulation timing based on tile area squared (quadratic scale)
  const area = state.floorArea;
  const areaSquared = Math.pow(area, 2);
  let estimatedTimeMin = 0;
  
  if (mode === 'traditional') {
    estimatedTimeMin = areaSquared * 0.0012;
  } else if (mode === 'cart') {
    estimatedTimeMin = areaSquared * 0.00023;
  } else if (mode === 'mop4000') {
    estimatedTimeMin = areaSquared * 0.000013;
  }
  
  state.estimatedTimeMin = estimatedTimeMin;
  
  // Real-world duration in seconds:
  const realDurationSec = estimatedTimeMin * 60;
  
  // Calculate speed multiplier factor
  let speedFactor = 1;
  if (state.speedDirection === 'faster') {
    speedFactor = state.speedMultiplier;
  } else {
    speedFactor = 1 / state.speedMultiplier;
  }
  
  // Duration in seconds for animation
  const durationSec = realDurationSec / speedFactor;
  state.durationMs = durationSec * 1000;
  
  // Start dynamic progressive cleansing loop
  state.currentStep = 0;
  
  // Calculate grid dimensions for instant positioning
  const cappedArea = Math.min(1000, state.floorArea);
  const rows = Math.max(1, Math.round(Math.sqrt(cappedArea / 1.5)));
  const cols = Math.max(1, Math.round(rows * 1.5));
  let W = 1;
  if (mode === 'cart') {
    W = 3;
  } else if (mode === 'mop4000') {
    W = 10;
  }
  
  // Set initial position of the sweeper instantly (transition time = 0)
  setTimeout(() => {
    trackSweeperPosition(mode, 0, Math.min(cols - 1, W - 1), 0, 0);
  }, 30);
  
  animateCleansing(mode);
}

// Helper to track sweeper element position to follow the cleansed tiles exactly
function trackSweeperPosition(mode, startCol, endCol, r, transitionTimeMs) {
  const sweeper = sweepers[mode];
  if (!sweeper) return;

  const startTile = document.querySelector(`.grid-tile[data-col="${startCol}"][data-row="${r}"]`);
  if (!startTile) return;

  const frameRect = simFrame.getBoundingClientRect();
  const startRect = startTile.getBoundingClientRect();

  // Determine instrument width in tiles
  let tileCount = 1;
  if (mode === 'cart') {
    tileCount = 3;
  } else if (mode === 'mop4000') {
    tileCount = 10;
  }
  const tileWidth = startRect.width; // assume uniform tile width
  const stripWidth = tileWidth * tileCount;

  // Calculate any offset needed when remaining columns are fewer than tileCount
  const actualEndCol = endCol;
  const expectedEndCol = startCol + tileCount - 1;
  let offsetTiles = 0;
  if (mode === 'mop4000' && actualEndCol < expectedEndCol) {
    offsetTiles = expectedEndCol - actualEndCol;
  }
  const offsetPx = offsetTiles * tileWidth;

  // Compute centered X position, applying offset so the mop stays within the frame
  let centerX = startRect.left + stripWidth / 2 - frameRect.left - offsetPx;
  // Clamp X to keep the mop fully visible
  const minX = stripWidth / 2;
  const maxX = frameRect.width - stripWidth / 2;
  if (centerX < minX) centerX = minX;
  if (centerX > maxX) centerX = maxX;

  // Y centre based on the tile's vertical position
  const centerY = (startRect.top + startRect.bottom) / 2 - frameRect.top;

  sweeper.style.transition = `left ${transitionTimeMs}ms linear, top ${transitionTimeMs}ms linear`;
  sweeper.style.left = `${centerX}px`;
  sweeper.style.top = `${centerY}px`;
  sweeper.style.transform = 'translate(-50%, -50%) perspective(400px) rotateX(15deg)';

  // Dynamically size mop head width for mop4000; reset for other modes
  if (mode === 'mop4000') {
    const aspect = 60 / 200; // height/width from viewBox
    sweeper.style.width = `${stripWidth}px`;
    sweeper.style.height = `${stripWidth * aspect}px`;
  } else {
    sweeper.style.width = '';
    sweeper.style.height = '';
  }
}

// Progressive cleansing of tiles in a premium vertical zigzag column path
function animateCleansing(mode) {
  const tiles = Array.from(document.querySelectorAll('.grid-tile'));
  if (tiles.length === 0) return;

  // Determine grid resolution from capped area state
  const area = Math.min(1000, state.floorArea);
  const rows = Math.max(1, Math.round(Math.sqrt(area / 1.5)));
  const cols = Math.max(1, Math.round(rows * 1.5));

  // Determine column sweep width W based on mode
  let W = 1;
  if (mode === 'cart') {
    W = 3;
  } else if (mode === 'mop4000') {
    W = 10;
  }

  const totalChunks = Math.ceil(cols / W);
  const totalSteps = totalChunks * rows;
  state.totalSteps = totalSteps;

  // Define step executing logic
  function runAnimationStep() {
    if (!state.isPlaying) return; // Halt if paused
    
    if (state.currentStep >= state.totalSteps) {
      // Conclude animation cleanly
      if (mode === 'mop4000') {
        simFrame.style.backgroundColor = '#FFAA00';
        setTimeout(() => {
          simFrame.style.backgroundColor = '#E2E2D7';
          endAnimation();
        }, 150);
      } else {
        endAnimation();
      }
      return;
    }

    const s = state.currentStep;
    const chunkIdx = Math.floor(s / rows);
    const rowIdxWithinChunk = s % rows;
    const r = (chunkIdx % 2 === 0) ? rowIdxWithinChunk : (rows - 1 - rowIdxWithinChunk);
    
    const startCol = chunkIdx * W;
    const endCol = (chunkIdx + 1) * W - 1;

    tiles.forEach(tile => {
      const tileCol = parseInt(tile.dataset.col);
      const tileRow = parseInt(tile.dataset.row);
      if (tileCol >= startCol && tileCol <= endCol && tileRow === r) {
        tile.classList.add('cleansed');
        const mess = tile.querySelector('.mess-spot');
        if (mess) mess.classList.remove('active');
      }
    });

    state.currentStep++;

    const baseStepTime = state.durationMs / state.totalSteps;

    // Track sweeper SVG position to match cleansed area in real-time
    trackSweeperPosition(mode, startCol, Math.min(cols - 1, endCol), r, baseStepTime);

    const timeoutId = setTimeout(runAnimationStep, baseStepTime);
    state.timeouts.push(timeoutId);
  }

  // Start executing steps
  runAnimationStep();
}

function endAnimation() {
  setTimeout(() => {
    // Hide sweeper SVGs
    Object.values(sweepers).forEach(sw => {
      sw.style.display = 'none';
      sw.style.animation = 'none';
    });
  }, 250);
}

// Toggles pause / play state
function togglePlayPause() {
  state.isPlaying = !state.isPlaying;
  
  const playIcon = document.getElementById('icon-play');
  const pauseIcon = document.getElementById('icon-pause');
  
  if (state.isPlaying) {
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    
    const sweeper = sweepers[state.activeMode];
    if (sweeper) {
      sweeper.style.animationPlayState = 'running';
    }
    // Resume step execution
    animateCleansing(state.activeMode);
  } else {
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    
    const sweeper = sweepers[state.activeMode];
    if (sweeper) {
      sweeper.style.animationPlayState = 'paused';
    }
    // Pause step execution by clearing timeouts
    state.timeouts.forEach(clearTimeout);
    state.timeouts = [];
  }
}

// 4. METRICS CALCULATIONS
function updateMetrics() {
  const area = state.floorArea;
  const mode = state.activeMode;
  
  // Visual emphasis highlights toggle
  metricTime.classList.remove('highlighted');
  metricEnergy.classList.remove('highlighted');
  metricDignity.classList.remove('highlighted');
  
  const areaSquared = Math.pow(area, 2);
  
  if (mode === 'traditional') {
    const min = (areaSquared * 0.0012).toFixed(1);
    metricTime.textContent = `${min} min`;
    metricEnergy.textContent = 'High (Human)';
    metricDignity.textContent = 'Questionable';
  } else if (mode === 'cart') {
    const min = (areaSquared * 0.00023).toFixed(1);
    metricTime.textContent = `${min} min`;
    metricEnergy.textContent = 'Diesel Scrubber';
    metricDignity.textContent = 'Commercial';
  } else if (mode === 'mop4000') {
    const min = (areaSquared * 0.000013).toFixed(1);
    metricTime.textContent = `${min} min`;
    metricEnergy.textContent = 'Negligible';
    metricDignity.textContent = 'RESTORED';
    
    metricTime.classList.add('highlighted');
    metricEnergy.classList.add('highlighted');
    metricDignity.classList.add('highlighted');
  }
}

// 5. CHOOSE YOUR VARIANT CARDS SYNC
function selectVariant(variant) {
  state.selectedVariant = variant;
  
  // Sync the form dropdown
  selectVariantDropdown.value = variant;
  
  // Smooth scroll down to order form
  const orderSection = document.getElementById('order');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Add animation/flash highlight to order container to draw attention
  const formBox = document.getElementById('order-form-box');
  formBox.style.borderColor = 'var(--color-amber)';
  setTimeout(() => {
    formBox.style.borderColor = 'var(--color-deep-navy)';
  }, 800);
}

// Scroll navigation utility
function scrollToOrder() {
  const orderSection = document.getElementById('order');
  orderSection.scrollIntoView({ behavior: 'smooth' });
}

// 6. PROCUREMENT SUBMIT FORM HANDLER
function handleFormSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('input-name').value;
  const address = document.getElementById('input-address').value;
  const variant = selectVariantDropdown.value;
  const qty = parseInt(inputQty.value) || 1;
  const severity = document.getElementById('select-severity').value;
  
  // Format Price Calculations
  const unitPrice = variant === 'standard' ? 5000000 : 250000000;
  const total = unitPrice * qty;
  
  const formattedTotal = 'IDR ' + total.toLocaleString('id-ID');
  
  // Generate alphanumeric security receipt hash
  const txHex = `MOP-9001-` + Array.from({length: 4}, () => 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
  ).join('');
  
  // Get Timestamp
  const now = new Date();
  const formatTime = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  
  // Populate ceremonial receipt modal fields
  receiptName.textContent = name;
  receiptAddress.textContent = address;
  receiptVariant.textContent = variant === 'standard' ? 'Standard Edition (25cm)' : 'Absolute Unit Edition (10M)';
  receiptQty.textContent = `${qty} unit${qty > 1 ? 's' : ''}`;
  receiptSeverity.textContent = severity;
  receiptTotalPrice.textContent = formattedTotal;
  receiptTxId.textContent = txHex;
  receiptTimeDisplay.textContent = formatTime;
  
  // Launch receipt modal
  modalOverlay.classList.add('active');
}

function dismissReceipt() {
  modalOverlay.classList.remove('active');
  orderForm.reset();
}

// Navigation highlight scroll observer
function setupNavigationHighlighting() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav a');
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= (sectionTop - 120)) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').substring(1) === current) {
        link.classList.add('active');
      }
    });
  });
}
