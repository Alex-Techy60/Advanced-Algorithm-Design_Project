let resultPath = [];
let resultCost = 0;
let resultSafe = false;
let animStep = 0;
let animTimer = null;
let isPlaying = false;

function loadExample() {
  document.getElementById('grid-input').value =
    '5\n. . . P .\nW . . . .\n. P . . G\n. . W . .\n. . . T .';
}

function clearAll() {
  document.getElementById('grid-input').value = '';
  document.getElementById('cave-grid').innerHTML = '';
  document.getElementById('cave-grid').style.display = 'none';
  document.getElementById('grid-placeholder').style.display = 'flex';
  document.getElementById('stats-panel').style.display = 'none';
  document.getElementById('anim-panel').style.display = 'none';
  document.getElementById('grid-info').style.display = 'none';
  document.getElementById('grid-size-label').textContent = '—';
  document.getElementById('wt-display').textContent = '';

  const pill = document.getElementById('status-pill');
  pill.className = 'status-pill';
  pill.textContent = 'WAITING';

  hideError();
  stopAnim();
  animStep = 0;
  isPlaying = false;
  document.getElementById('play-btn').textContent = '▶ PLAY';
}

function runAlgo() {
  hideError();
  stopAnim();
  animStep = 0;
  isPlaying = false;
  document.getElementById('play-btn').textContent = '▶ PLAY';

  const input = document.getElementById('grid-input').value;
  if (!input.trim()) {
    showError('Please enter grid data.');
    return;
  }

  const pill = document.getElementById('status-pill');
  pill.className = 'status-pill running';
  pill.textContent = 'RUNNING';

  setTimeout(() => {
    try {

      parse(input);

      precompute();

      document.getElementById('grid-size-label').textContent = `${n} × ${n}`;

      document.getElementById('grid-info').style.display = 'flex';
      document.getElementById('info-wumpus').textContent =
        `${wumpuses.length} Wumpus${wumpuses.length !== 1 ? 'es' : ''}`;
      document.getElementById('info-pits').textContent =
        `${pits.length} Pit${pits.length !== 1 ? 's' : ''}`;
      document.getElementById('info-tz').textContent =
        `${timezones.length} Timezone${timezones.length !== 1 ? 's' : ''}`;

      const result = search();
      resultSafe = result.safe;
      resultPath = result.safe ? result.path : [];
      resultCost = result.safe ? result.cost : 0;

      pill.className = resultSafe ? 'status-pill safe' : 'status-pill unsafe';
      pill.textContent = resultSafe ? 'SAFE' : 'UNSAFE';

      document.getElementById('stats-panel').style.display = 'block';
      const statStatus = document.getElementById('stat-status');
      statStatus.textContent = resultSafe ? 'SAFE' : 'UNSAFE';
      statStatus.style.color = resultSafe ? 'var(--safe)' : 'var(--danger)';
      document.getElementById('stat-cost').textContent = resultSafe ? resultCost : '—';
      document.getElementById('stat-length').textContent = resultSafe ? resultPath.length : '—';
      document.getElementById('stat-turn').textContent = resultSafe ? `0 / ${resultPath.length - 1}` : '—';

      const pd = document.getElementById('path-display');
      if (resultSafe) {
        pd.innerHTML = resultPath
          .map((p, i) =>
            `<span>(${p[0]},${p[1]})</span>${i < resultPath.length - 1 ? ' → ' : ''}`
          )
          .join('');
      } else {
        pd.innerHTML = '<span style="color:var(--danger)">No safe path exists.</span>';
      }

      if (resultSafe && resultPath.length > 1) {
        document.getElementById('anim-panel').style.display = 'block';
        const slider = document.getElementById('turn-slider');
        slider.max = resultPath.length - 1;
        slider.value = 0;
        document.getElementById('turn-display').textContent = `0 / ${resultPath.length - 1}`;
      }

      renderGrid(0);

    } catch (e) {
      showError(e.message);
      pill.className = 'status-pill';
      pill.textContent = 'ERROR';
    }
  }, 50);
}

function renderGrid(step) {
  const grid = document.getElementById('cave-grid');
  grid.style.display = 'inline-grid';
  grid.style.gridTemplateColumns = `repeat(${n}, 52px)`;
  document.getElementById('grid-placeholder').style.display = 'none';

  const wt = getWtAtStep(step, resultPath);

  const currentPos = resultSafe && step < resultPath.length
    ? resultPath[step]
    : null;

  const pathSet = new Set(
    resultPath.slice(0, step + 1).map(p => `${p[0]},${p[1]}`)
  );

  const wumpusPos = new Set();
  for (let w = 0; w < wumpuses.length; w++) {
    const wc = wumpusCols.length > 0
      ? wumpusCols[w][Math.min(wt, maxTurns)]
      : wumpuses[w][1];
    wumpusPos.add(`${wumpuses[w][0]},${wc}`);
  }

  const stenchNow = stenchCells.length > 0
    ? stenchCells[Math.min(wt, maxTurns)]
    : new Set();

  grid.innerHTML = '';

  for (let r = 1; r <= n; r++) {
    for (let c = 1; c <= n; c++) {
      const sym = gridData[r - 1][c - 1];
      const key = `${r},${c}`;

      const isAgent   = currentPos && currentPos[0] === r && currentPos[1] === c;
      const isWumpus  = wumpusPos.has(key);
      const isOnPath  = pathSet.has(key) && !isAgent;
      const isStench  = stenchNow.has(key) && !isWumpus;
      const isBreeze  = breezeCells.has(key);

      let cls = 'cell';
      let icon = '';
      let label = '';

      if (isAgent) {
        cls += ' agent-here';
        icon = '▲';
        label = 'AGENT';
      } else if (isWumpus) {
        cls += ' cell-wumpus';
        icon = '⚠';
        label = 'W';
      } else if (sym === 'G') {
        cls += ' cell-gold';
        icon = '★';
        label = 'GOLD';
      } else if (sym === 'P') {
        cls += ' cell-pit';
        icon = '◉';
        label = 'PIT';
      } else if (sym === 'T') {
        cls += ' cell-tz';
        icon = '⟳';
        label = 'TZ';
      } else if (r === 1 && c === 1 && !isAgent) {
        cls += ' cell-start';
        icon = '◎';
        label = 'START';
      } else {
        cls += ' cell-empty';
        icon = '';
        label = '.';
      }

      if (isStench && !isWumpus)                    cls += ' stench-overlay';
      if (isBreeze && sym !== 'P')                  cls += ' breeze-overlay';
      if (isOnPath && !isWumpus && sym !== 'G')     cls += ' path-cell';

      const stepNum = isOnPath
        ? resultPath.findIndex(p => p[0] === r && p[1] === c)
        : -1;

      const div = document.createElement('div');
      div.className = cls;
      div.innerHTML = `
        <span class="cell-coord">${r},${c}</span>
        <span class="cell-icon">${icon}</span>
        ${label ? `<span class="cell-label">${label}</span>` : ''}
        ${stepNum > 0 ? `<span class="path-number">${stepNum}</span>` : ''}
      `;
      grid.appendChild(div);
    }
  }

  document.getElementById('wt-display').textContent =
    `wt: ${wt}  |  step: ${step} / ${resultSafe ? resultPath.length - 1 : 0}`;
}

function onSlider(val) {
  animStep = parseInt(val);
  document.getElementById('turn-display').textContent =
    `${animStep} / ${resultPath.length - 1}`;
  document.getElementById('stat-turn').textContent =
    `${animStep} / ${resultPath.length - 1}`;
  renderGrid(animStep);

  stopAnim();
  document.getElementById('play-btn').textContent = '▶ PLAY';
  isPlaying = false;
}

function togglePlay() {
  if (isPlaying) {
    stopAnim();
    document.getElementById('play-btn').textContent = '▶ PLAY';
    isPlaying = false;
  } else {

    if (animStep >= resultPath.length - 1) animStep = 0;
    startAnim();
    document.getElementById('play-btn').textContent = '⏸ PAUSE';
    isPlaying = true;
  }
}

function startAnim() {

  const speed = 1100 - parseInt(document.getElementById('speed-slider').value);

  animTimer = setInterval(() => {
    if (animStep >= resultPath.length - 1) {
      stopAnim();
      document.getElementById('play-btn').textContent = '▶ PLAY';
      isPlaying = false;
      return;
    }

    animStep++;
    document.getElementById('turn-slider').value = animStep;
    document.getElementById('turn-display').textContent =
      `${animStep} / ${resultPath.length - 1}`;
    document.getElementById('stat-turn').textContent =
      `${animStep} / ${resultPath.length - 1}`;
    renderGrid(animStep);
  }, speed);
}

function stopAnim() {
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('error-msg').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
  loadExample();
});
