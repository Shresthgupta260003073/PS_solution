// Web Audio API Audio Synthesizer for Realistic Rolling & Impact Sounds
class DiceSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  // Synthesize realistic tumbling noise burst
  playTumbleSound() {
    if (this.muted) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms pulse
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter sound to simulate wood/felt surface impact resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300 + Math.random() * 400; // Variable pitch per roll step
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.15 + Math.random() * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // Synthesize solid landing impact thud
  playImpactSound() {
    if (this.muted) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

const audioEngine = new DiceSoundEngine();

// Mappings for target 3D rotations to expose desired face (1 to 6)
const faceRotations = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: -90 },
  6: { x: 0, y: 180 }
};

// Pip configurations mapping for 3D Faces
const pipMap = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

// DOM Elements
const diceArea = document.getElementById('diceArea');
const rollButton = document.getElementById('rollButton');
const diceCountSelect = document.getElementById('diceCount');
const totalDisplay = document.getElementById('total');
const historyList = document.getElementById('historyList');
const rollCountDisplay = document.getElementById('rollCount');
const clearHistoryBtn = document.getElementById('clearHistory');
const soundToggle = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');
const soundLabel = document.getElementById('soundLabel');

let rollHistory = [];
let isRolling = false;

// Generate Face HTML with pips
function createFaceHTML(faceNumber) {
  const pips = pipMap[faceNumber];
  let pipsHTML = '';
  for (let i = 0; i < 9; i++) {
    if (pips.includes(i)) {
      pipsHTML += `<span class="pip"></span>`;
    } else {
      pipsHTML += `<span></span>`;
    }
  }
  return `<div class="die-face face-${faceNumber}">${pipsHTML}</div>`;
}

// Render 3D Cubes dynamically
function setupDice(count) {
  diceArea.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'die-wrapper';

    const shadow = document.createElement('div');
    shadow.className = 'die-shadow';

    const cube = document.createElement('div');
    cube.className = 'die-cube';
    cube.dataset.index = i;

    // Render all 6 faces for realistic 3D structure
    let facesHTML = '';
    for (let f = 1; f <= 6; f++) {
      facesHTML += createFaceHTML(f);
    }
    cube.innerHTML = facesHTML;

    wrapper.appendChild(shadow);
    wrapper.appendChild(cube);
    diceArea.appendChild(wrapper);
  }
  totalDisplay.textContent = '0';
}

// 3D Roll Animation & Sound Execution
function rollDice() {
  if (isRolling) return;
  isRolling = true;
  rollButton.disabled = true;

  const wrappers = document.querySelectorAll('.die-wrapper');
  const cubes = document.querySelectorAll('.die-cube');
  const results = [];

  const duration = 1200; // Duration of animation in ms
  const soundInterval = setInterval(() => {
    audioEngine.playTumbleSound();
  }, 90);

  cubes.forEach((cube, idx) => {
    const wrapper = wrappers[idx];
    wrapper.classList.add('rolling');

    const value = Math.floor(Math.random() * 6) + 1;
    results.push(value);

    // Multi-turn 3D spin simulation (adds 4 to 8 full 360-degree spins)
    const extraSpinsX = (Math.floor(Math.random() * 4) + 4) * 360;
    const extraSpinsY = (Math.floor(Math.random() * 4) + 4) * 360;

    const targetRot = faceRotations[value];
    const finalRotX = extraSpinsX + targetRot.x;
    const finalRotY = extraSpinsY + targetRot.y;

    // Apply cubic-bezier physics curve to transition
    cube.style.transition = `transform ${duration / 1000}s cubic-bezier(0.2, 0.8, 0.3, 1)`;
    cube.style.transform = `rotateX(${finalRotX}deg) rotateY(${finalRotY}deg)`;
  });

  setTimeout(() => {
    clearInterval(soundInterval);
    audioEngine.playImpactSound();

    wrappers.forEach(w => w.classList.remove('rolling'));

    const sum = results.reduce((a, b) => a + b, 0);
    totalDisplay.textContent = sum;

    addHistoryRecord(results, sum);

    isRolling = false;
    rollButton.disabled = false;
  }, duration);
}

function addHistoryRecord(results, total) {
  rollHistory.unshift({ results, total, time: new Date().toLocaleTimeString() });
  renderHistory();
}

function renderHistory() {
  rollCountDisplay.textContent = rollHistory.length;
  if (rollHistory.length === 0) {
    historyList.innerHTML = `<div class="empty-state"><span>🎲</span><p>Your rolls will show up here.</p></div>`;
    return;
  }

  historyList.innerHTML = rollHistory.map(item => `
    <div class="history-item">
      <span>Dice: [ ${item.results.join(', ')} ]</span>
      <strong>Total: ${item.total}</strong>
    </div>
  `).join('');
}

// Sound toggle controls
soundToggle.addEventListener('click', () => {
  audioEngine.muted = !audioEngine.muted;
  soundToggle.setAttribute('aria-pressed', !audioEngine.muted);
  soundIcon.textContent = audioEngine.muted ? '🔇' : '🔊';
  soundLabel.textContent = audioEngine.muted ? 'SOUND OFF' : 'SOUND ON';
});

// Event Listeners
rollButton.addEventListener('click', rollDice);
diceCountSelect.addEventListener('change', (e) => setupDice(parseInt(e.target.value)));
clearHistoryBtn.addEventListener('click', () => {
  rollHistory = [];
  renderHistory();
});

// Initialize on load
setupDice(parseInt(diceCountSelect.value));