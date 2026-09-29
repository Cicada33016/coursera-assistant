/**
 * React Bits - LatticeLoader (JavaScript & CSS)
 * Universal implementation supporting both browser DOM lifecycle and React rendering.
 */

const PATTERNS = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 }
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 }
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } }
};

const DEFAULT_PATTERN = { 3: 'orbit', 4: 'sweep' };

const MARKS = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] }
};

const resolvePattern = (pattern, grid) => {
  if (typeof pattern === 'string') {
    const named = PATTERNS[pattern];
    return (named && named[grid]) || PATTERNS[DEFAULT_PATTERN[grid]][grid];
  }
  const cells = Array.from({ length: grid * grid }, (_, i) => pattern.cells[i] ?? null);
  const max = Math.max(0, ...cells.filter(v => v != null));
  return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 };
};

const fmt = ds => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);

const spoken = ds =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

/**
 * Creates and mounts a LatticeLoader element in the DOM
 */
export function createLatticeLoader(initialProps = {}) {
  const props = Object.assign({
    status: 'working',
    label: 'Thinking',
    doneLabel: 'Done in',
    errorLabel: 'Failed after',
    pattern: 'orbit',
    grid: 3,
    shape: 'round',
    doneColor: '#22c55e',
    errorColor: '#ef4444',
    cellSize: 6,
    gap: 2,
    fontSize: 14,
    step: 90,
    idleOpacity: 0.15,
    glow: false,
    glowColor: '',
    showTimer: true,
    color: '#f5f5f5'
  }, initialProps);

  const n = props.grid === 4 ? 4 : 3;
  const pat = resolvePattern(props.pattern, n);
  const marks = MARKS[n];
  const d = props.step * pat.scale;
  const cycle = Math.round(pat.loop * d);

  let currentStatus = props.status;
  let timerInterval = null;
  let currentDs = 0;
  let startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  if (typeof document === 'undefined') {
    // Non-browser fallback
    return {
      element: null,
      update: () => {},
      destroy: () => {},
      getStatus: () => currentStatus
    };
  }

  const root = document.createElement('span');
  root.setAttribute('role', 'status');
  root.className = 'lattice-loader' + (props.className ? ` ${props.className}` : '');
  root.setAttribute('data-status', currentStatus);
  root.setAttribute('data-shape', props.shape);
  if (props.glow) root.setAttribute('data-glow', '');

  function applyStyles(status) {
    const markColor = status === 'error' ? props.errorColor : props.doneColor;
    root.style.setProperty('--ll-n', String(n));
    root.style.setProperty('--ll-cell', `${props.cellSize}px`);
    root.style.setProperty('--ll-gap', `${props.gap}px`);
    root.style.setProperty('--ll-font', `${props.fontSize}px`);
    root.style.setProperty('--ll-color', props.color);
    root.style.setProperty('--ll-mark', markColor);
    root.style.setProperty('--ll-idle', String(props.idleOpacity));
    root.style.setProperty('--ll-glow', props.glowColor || props.color);
    root.style.setProperty('--ll-mark-glow', props.glowColor || markColor);
    root.style.setProperty('--ll-cycle', `${cycle}ms`);
  }
  applyStyles(currentStatus);

  // Grid
  const gridSpan = document.createElement('span');
  gridSpan.className = 'lattice-loader__grid';
  gridSpan.setAttribute('aria-hidden', 'true');

  // Layer run
  const layerRun = document.createElement('span');
  layerRun.className = 'lattice-loader__layer lattice-loader__run';
  pat.cells.forEach((unit) => {
    const cell = document.createElement('span');
    cell.className = 'lattice-loader__cell';
    if (unit == null) {
      cell.setAttribute('data-hole', '');
    } else {
      if (pat.lit && pat.lit !== 0.62) {
        cell.setAttribute('data-lit', String(Math.round(pat.lit * 100)));
      }
      cell.style.animationDelay = `${Math.round(unit * d)}ms`;
    }
    layerRun.appendChild(cell);
  });
  gridSpan.appendChild(layerRun);

  // Layer mark
  const layerMark = document.createElement('span');
  layerMark.className = 'lattice-loader__layer lattice-loader__mark';
  const markCells = [];
  const currentMark = currentStatus === 'working' ? 'done' : currentStatus;
  for (let i = 0; i < pat.cells.length; i++) {
    const cell = document.createElement('span');
    cell.className = 'lattice-loader__cell';
    if (marks[currentMark] && marks[currentMark].includes(i)) {
      cell.setAttribute('data-on', '');
    }
    markCells.push(cell);
    layerMark.appendChild(cell);
  }
  gridSpan.appendChild(layerMark);
  root.appendChild(gridSpan);

  // Label
  const labelSpan = document.createElement('span');
  labelSpan.className = 'lattice-loader__label';
  labelSpan.setAttribute('aria-hidden', 'true');

  const textWorking = document.createElement('span');
  textWorking.className = 'lattice-loader__text';
  textWorking.textContent = props.label;
  if (currentStatus === 'working') textWorking.setAttribute('data-active', '');

  const textDone = document.createElement('span');
  textDone.className = 'lattice-loader__text';
  textDone.textContent = props.doneLabel;
  if (currentStatus === 'done') textDone.setAttribute('data-active', '');

  const textError = document.createElement('span');
  textError.className = 'lattice-loader__text';
  textError.textContent = props.errorLabel;
  if (currentStatus === 'error') textError.setAttribute('data-active', '');

  labelSpan.appendChild(textWorking);
  labelSpan.appendChild(textDone);
  labelSpan.appendChild(textError);
  root.appendChild(labelSpan);

  // Timer
  let timerSpan = null;
  if (props.showTimer) {
    timerSpan = document.createElement('span');
    timerSpan.className = 'lattice-loader__timer';
    timerSpan.setAttribute('aria-hidden', 'true');
    timerSpan.textContent = '0.0s';
    root.appendChild(timerSpan);
  }

  // Screen reader announcer
  const srSpan = document.createElement('span');
  srSpan.className = 'lattice-loader__sr';
  srSpan.textContent = `${props.label}, in progress`;
  root.appendChild(srSpan);

  function paintTimer(ds) {
    currentDs = ds;
    if (timerSpan) timerSpan.textContent = fmt(ds);
  }

  function startTimer() {
    stopTimer();
    startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    paintTimer(0);
    timerInterval = setInterval(() => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      paintTimer(Math.floor((now - startedAt) / 100));
    }, 100);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  if (currentStatus === 'working') {
    startTimer();
  }

  function update(newProps = {}) {
    if (newProps.label) textWorking.textContent = newProps.label;
    if (newProps.doneLabel) textDone.textContent = newProps.doneLabel;
    if (newProps.errorLabel) textError.textContent = newProps.errorLabel;

    if (newProps.status && newProps.status !== currentStatus) {
      currentStatus = newProps.status;
      root.setAttribute('data-status', currentStatus);
      applyStyles(currentStatus);

      // Active text
      textWorking.removeAttribute('data-active');
      textDone.removeAttribute('data-active');
      textError.removeAttribute('data-active');

      if (currentStatus === 'working') {
        textWorking.setAttribute('data-active', '');
        srSpan.textContent = `${props.label}, in progress`;
        startTimer();
      } else if (currentStatus === 'done') {
        stopTimer();
        textDone.setAttribute('data-active', '');
        srSpan.textContent = `${props.doneLabel}${props.showTimer ? ` ${spoken(currentDs)}` : ''}`;
      } else if (currentStatus === 'error') {
        stopTimer();
        textError.setAttribute('data-active', '');
        srSpan.textContent = `${props.errorLabel}${props.showTimer ? ` ${spoken(currentDs)}` : ''}`;
      }

      // Mark cells
      const activeMark = currentStatus === 'error' ? 'error' : 'done';
      for (let i = 0; i < markCells.length; i++) {
        if (marks[activeMark] && marks[activeMark].includes(i)) {
          markCells[i].setAttribute('data-on', '');
        } else {
          markCells[i].removeAttribute('data-on');
        }
      }
    }
  }

  function destroy() {
    stopTimer();
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  return {
    element: root,
    update: update,
    destroy: destroy,
    getStatus: () => currentStatus
  };
}

/**
 * Universal LatticeLoader component
 * Can be instantiated directly: LatticeLoader.create(props)
 * Or invoked as a component: LatticeLoader(props)
 */
export default function LatticeLoader(props = {}) {
  // If React is present in the global/import environment:
  if (typeof React !== 'undefined' && React && typeof React.createElement === 'function') {
    const n = props.grid === 4 ? 4 : 3;
    const pat = resolvePattern(props.pattern, n);
    const marks = MARKS[n];
    const d = (props.step || 90) * pat.scale;
    const cycle = Math.round(pat.loop * d);
    const markColor = props.status === 'error' ? (props.errorColor || '#ef4444') : (props.doneColor || '#22c55e');

    const style = Object.assign({
      '--ll-n': n,
      '--ll-cell': `${props.cellSize || 6}px`,
      '--ll-gap': `${props.gap || 2}px`,
      '--ll-font': `${props.fontSize || 14}px`,
      '--ll-color': props.color || '#f5f5f5',
      '--ll-mark': markColor,
      '--ll-idle': props.idleOpacity || 0.15,
      '--ll-glow': props.glowColor || props.color || '#f5f5f5',
      '--ll-mark-glow': props.glowColor || markColor,
      '--ll-cycle': `${cycle}ms`
    }, props.style);

    return React.createElement(
      'span',
      {
        role: 'status',
        className: `lattice-loader${props.className ? ` ${props.className}` : ''}`,
        'data-status': props.status || 'working',
        'data-shape': props.shape || 'round',
        style: style
      },
      React.createElement(
        'span',
        { className: 'lattice-loader__grid', 'aria-hidden': 'true' },
        React.createElement(
          'span',
          { className: 'lattice-loader__layer lattice-loader__run' },
          pat.cells.map((unit, i) =>
            React.createElement('span', {
              key: i,
              className: 'lattice-loader__cell',
              'data-hole': unit == null ? '' : undefined,
              style: unit == null ? undefined : { animationDelay: `${Math.round(unit * d)}ms` }
            })
          )
        ),
        React.createElement(
          'span',
          { className: 'lattice-loader__layer lattice-loader__mark' },
          pat.cells.map((_, i) =>
            React.createElement('span', {
              key: i,
              className: 'lattice-loader__cell',
              'data-on': marks[props.status === 'error' ? 'error' : 'done']?.includes(i) ? '' : undefined
            })
          )
        )
      ),
      React.createElement(
        'span',
        { className: 'lattice-loader__label', 'aria-hidden': 'true' },
        React.createElement('span', { className: 'lattice-loader__text', 'data-active': props.status === 'working' ? '' : undefined }, props.label || 'Thinking'),
        React.createElement('span', { className: 'lattice-loader__text', 'data-active': props.status === 'done' ? '' : undefined }, props.doneLabel || 'Done in'),
        React.createElement('span', { className: 'lattice-loader__text', 'data-active': props.status === 'error' ? '' : undefined }, props.errorLabel || 'Failed after')
      ),
      props.showTimer !== false
        ? React.createElement('span', { className: 'lattice-loader__timer', 'aria-hidden': 'true' }, '0.0s')
        : null
    );
  }

  return createLatticeLoader(props);
}

LatticeLoader.create = createLatticeLoader;

// Global and CommonJS bindings
if (typeof window !== 'undefined') {
  window.LatticeLoader = LatticeLoader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LatticeLoader;
  module.exports.default = LatticeLoader;
  module.exports.createLatticeLoader = createLatticeLoader;
}
