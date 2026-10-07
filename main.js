const $ = (selector) => document.querySelector(selector);

const welcomeScreen = $('#welcomeScreen');
const appShell = $('#appShell');
const startButton = $('#startButton');
const exitButton = $('#exitButton');
const challengePanel = $('#challengePanel');
const challengeCode = $('#challengeCode');
const challengeAnswer = $('#challengeAnswer');
const challengeStatus = $('#challengeStatus');
const challengeHint = $('#challengeHint');
const verifyChallenge = $('#verifyChallenge');
const passwordOutput = $('#password');
const lengthInput = $('#length');
const lengthValue = $('#lengthValue');
const copyButton = $('#copyButton');
const copyText = $('#copyText');
const generateButton = $('#generateButton');
const warning = $('#warning');
const strengthLabel = $('#strengthLabel');
const entropyValue = $('#entropyValue');
const combinationValue = $('#combinationValue');
const crackTime = $('#crackTime');
const binaryStream = $('#binaryStream');
const checks = ['lowercase', 'uppercase', 'numbers', 'symbols'];
const generationMode = $('#generationMode');
const seedInput = $('#seedInput');
const separatorInput = $('#separator');
const avoidAmbiguous = $('#avoidAmbiguous');

const pools = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%&*?_-+=<>[]{}'
};
const words = ['neon', 'cifra', 'nuvem', 'sombra', 'pixel', 'vortex', 'radar', 'lobo', 'pulso', 'bit', 'chave', 'orbit', 'cript', 'zero', 'verde', 'onda', 'nexo', 'matrix', 'byte', 'signal'];
const ambiguous = /[O0Il1|]/g;
let audioContext;
let challengeMode = 'morse';
let challengeSolved = false;

function randomInt(max) {
  if (!max) return 0;
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    do { window.crypto.getRandomValues(array); } while (array[0] >= limit);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}
function pick(text) { return text[randomInt(text.length)]; }
function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) { const position = randomInt(index + 1); [items[index], items[position]] = [items[position], items[index]]; }
  return items;
}
function getSelectedPools() { return checks.filter((id) => $(`#${id}`).checked).map((id) => pools[id]); }
function clean(text) { return avoidAmbiguous.checked ? text.replace(ambiguous, '') : text; }

function playTone(frequency = 660, duration = 0.08, type = 'square', volume = 0.035) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* áudio opcional: o site continua funcionando sem ele */ }
}
function playTerminalTyping() { [0, 70, 135, 215, 300].forEach((delay, index) => setTimeout(() => playTone(220 + index * 48, .035, 'square', .022), delay)); }

function formatCombination(value) {
  if (!Number.isFinite(value)) return 'muito alta';
  if (value >= 1e24) return `${(value / 1e24).toFixed(1)}e+24`;
  if (value >= 1e21) return `${(value / 1e21).toFixed(1)}e+21`;
  if (value >= 1e18) return `${(value / 1e18).toFixed(1)}e+18`;
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}e+15`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}e+12`;
  return value.toLocaleString('pt-BR');
}
function updateStrength(length, poolSize) {
  const entropy = Math.round(length * Math.log2(poolSize || 1));
  const meter = document.querySelectorAll('.strength-meter span');
  const level = entropy >= 70 ? 4 : entropy >= 48 ? 3 : entropy >= 30 ? 2 : 1;
  const labels = ['FRACA', 'RAZOÁVEL', 'FORTE', 'MUITO FORTE'];
  meter.forEach((bar, index) => bar.classList.toggle('active', index < level));
  strengthLabel.textContent = labels[level - 1];
  strengthLabel.style.color = level <= 1 ? '#ff8e68' : level === 2 ? '#ffd166' : 'var(--green)';
  entropyValue.textContent = `${entropy} bits`;
  combinationValue.textContent = formatCombination(Math.pow(poolSize || 1, length));
  crackTime.textContent = entropy >= 70 ? 'séculos' : entropy >= 48 ? 'décadas' : entropy >= 30 ? 'meses' : 'minutos';
}
function updateRangeVisual() {
  const percent = ((Number(lengthInput.value) - Number(lengthInput.min)) / (Number(lengthInput.max) - Number(lengthInput.min))) * 100;
  lengthInput.style.background = `linear-gradient(to right, var(--green) ${percent}%, #315336 ${percent}%)`;
}
function randomPassword(length, selected) {
  const alphabet = clean(selected.join(''));
  if (!alphabet) return '';
  const required = selected.map((pool) => pick(clean(pool)));
  while (required.length < length) required.push(pick(alphabet));
  return shuffle(required).join('');
}
function passphrasePassword(length) {
  const count = Math.max(3, Math.round(length / 4));
  return Array.from({ length: count }, () => pick(words)).join(separatorInput.value || '');
}
async function sha256Text(value) {
  const source = value || `passforge-${Date.now()}`;
  if (crypto.subtle) {
    const data = new TextEncoder().encode(source);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return Math.abs(hash).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}
async function generatePassword() {
  const length = Number(lengthInput.value);
  const mode = generationMode.value;
  const selected = getSelectedPools();
  updateRangeVisual();
  warning.textContent = '';
  let result = '';
  if (mode === 'random') {
    if (!selected.length) { warning.textContent = 'Selecione pelo menos um tipo de caractere.'; passwordOutput.textContent = '— — — — — —'; updateStrength(0, 0); return; }
    if (length < selected.length) { warning.textContent = `Aumente o comprimento para pelo menos ${selected.length} caracteres.`; return; }
    result = randomPassword(length, selected);
  } else if (mode === 'passphrase') {
    result = passphrasePassword(length);
  } else if (mode === 'pin') {
    result = randomPassword(length, ['0123456789']);
  } else if (mode === 'hex') {
    result = randomPassword(length, ['0123456789abcdef']);
  } else if (mode === 'sha256') {
    result = (await sha256Text(seedInput.value)).slice(0, Math.max(8, length));
    if (selected.includes(pools.uppercase)) result = result.toUpperCase();
  }
  passwordOutput.textContent = result || '— — — — — —';
  const alphabetSize = mode === 'passphrase' ? words.length * 8 : mode === 'pin' ? 10 : mode === 'hex' || mode === 'sha256' ? 16 : clean(selected.join('')).length;
  updateStrength(result.length, alphabetSize);
  generateButton.animate([{ transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 180 });
}

function setBinary() { const bits = Array.from({ length: 48 }, () => randomInt(2)).join(''); binaryStream.textContent = `${bits.slice(0, 8)} ${bits.slice(8, 16)} ${bits.slice(16, 24)} ${bits.slice(24, 32)} ${bits.slice(32, 40)} ${bits.slice(40)}`; }
async function copyPassword() {
  const value = passwordOutput.textContent;
  if (!value || value.includes('—')) return;
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else { const helper = document.createElement('textarea'); helper.value = value; helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.appendChild(helper); helper.select(); document.execCommand('copy'); helper.remove(); }
  } catch { return; }
  copyText.textContent = 'COPIADO'; $('#toast').classList.add('show'); playTone(880, .06, 'sine', .025);
  setTimeout(() => { copyText.textContent = 'COPIAR'; $('#toast').classList.remove('show'); }, 1800);
}

const challenges = { morse: { code: '.--. .- ... ...', answer: 'PASS', hint: 'Dica: no Morse, cada grupo representa uma letra.' }, binary: { code: '01010000 01000001 01010011 01010011', answer: 'PASS', hint: 'Dica: cada grupo de 8 bits representa uma letra.' } };
function renderChallenge() { const item = challenges[challengeMode]; challengeCode.textContent = item.code; challengeHint.textContent = item.hint; challengeAnswer.value = ''; challengeStatus.textContent = 'BLOQUEADO'; challengeStatus.classList.remove('unlocked'); }
function showChallenge() { playTerminalTyping(); playTone(480, .12, 'sawtooth', .025); startButton.hidden = true; challengePanel.hidden = false; challengePanel.classList.add('challenge-visible'); renderChallenge(); challengeAnswer.focus(); }
function verifyAnswer() {
  const answer = challengeAnswer.value.trim().replace(/\s+/g, '').toUpperCase();
  if (answer === challenges[challengeMode].answer) {
    challengeSolved = true; challengeStatus.textContent = 'LIBERADO'; challengeStatus.classList.add('unlocked'); challengeHint.textContent = 'Acesso confirmado. Preparando o gerador...'; playTone(980, .08, 'sine', .04); playTone(1320, .12, 'sine', .035);
    setTimeout(enterTerminal, 700);
  } else { challengeStatus.textContent = 'TENTATIVA NEGADA'; challengeHint.textContent = 'Código incorreto. Tente novamente.'; playTone(170, .12, 'sawtooth', .04); challengeAnswer.select(); }
}
function enterTerminal() { if (!challengeSolved) return; welcomeScreen.classList.add('hidden'); appShell.classList.add('visible'); appShell.setAttribute('aria-hidden', 'false'); generatePassword(); }
function leaveTerminal() { appShell.classList.remove('visible'); appShell.setAttribute('aria-hidden', 'true'); challengeSolved = false; challengePanel.hidden = true; startButton.hidden = false; setTimeout(() => welcomeScreen.classList.remove('hidden'), 550); }
function createBinaryRain() { const rain = $('#binaryRain'); const columns = Math.max(5, Math.floor(window.innerWidth / 65)); rain.replaceChildren(); for (let index = 0; index < columns; index += 1) { const stream = document.createElement('span'); stream.textContent = Array.from({ length: 34 }, () => `${randomInt(2)}`).join('\n'); stream.style.animationDelay = `${-randomInt(9000)}ms`; stream.style.animationDuration = `${7000 + randomInt(6500)}ms`; stream.style.opacity = `${0.25 + Math.random() * 0.6}`; rain.appendChild(stream); } }

startButton.addEventListener('click', showChallenge);
verifyChallenge.addEventListener('click', verifyAnswer);
challengeAnswer.addEventListener('keydown', (event) => { if (event.key === 'Enter') verifyAnswer(); });
document.querySelectorAll('input[name="challengeMode"]').forEach((input) => input.addEventListener('change', (event) => { challengeMode = event.target.value; renderChallenge(); }));
exitButton.addEventListener('click', leaveTerminal);
generateButton.addEventListener('click', () => { playTone(730, .05, 'square', .025); generatePassword(); });
copyButton.addEventListener('click', copyPassword);
lengthInput.addEventListener('input', () => { lengthValue.textContent = lengthInput.value; generatePassword(); });
checks.forEach((id) => $(`#${id}`).addEventListener('change', generatePassword));
[generationMode, seedInput, separatorInput, avoidAmbiguous].forEach((control) => control.addEventListener('input', generatePassword));
setInterval(setBinary, 1600); setInterval(createBinaryRain, 4200); window.addEventListener('resize', createBinaryRain);
createBinaryRain(); generatePassword();

// Módulos extras do terminal
const morseMap = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.' };
const reverseMorse = Object.fromEntries(Object.entries(morseMap).map(([key, value]) => [value, key]));
function textToMorse(value) { return value.toUpperCase().split('').map((char) => char === ' ' ? '/' : morseMap[char] || char).join(' '); }
function morseToText(value) { return value.trim().split(/\s+/).map((code) => code === '/' ? ' ' : reverseMorse[code] || '�').join(''); }
function textToBinary(value) { return Array.from(value).map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' '); }
function binaryToText(value) { return value.trim().split(/\s+/).filter(Boolean).map((bits) => String.fromCharCode(parseInt(bits, 2))).join(''); }
function runDecoder() {
  const input = $('#decoderInput').value.trim();
  const mode = $('#decoderMode').value;
  let output = 'aguardando entrada_';
  if (input) {
    if (mode === 'text-morse') output = textToMorse(input);
    if (mode === 'morse-text') output = morseToText(input);
    if (mode === 'text-binary') output = textToBinary(input);
    if (mode === 'binary-text') output = binaryToText(input);
  }
  $('#decoderOutput').textContent = output;
  playTone(820, .06, 'square', .025);
}
function setupTabs() {
  document.querySelectorAll('.module-tab').forEach((tab) => tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.module-tab').forEach((item) => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.tab-panel').forEach((panel) => { const isActive = panel.dataset.panel === target; panel.hidden = !isActive; panel.classList.toggle('active', isActive); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    playTone(560, .04, 'square', .018);
  }));
}
function setupVault() {
  const note = $('#vaultNote');
  const status = $('#vaultStatus');
  const saved = localStorage.getItem('passforge-vault-note');
  if (saved) { note.value = saved; status.textContent = 'nota restaurada desta sessão_'; }
  $('#saveVault').addEventListener('click', () => { localStorage.setItem('passforge-vault-note', note.value); status.textContent = 'nota guardada localmente agora_'; playTone(900, .07, 'sine', .025); });
  $('#clearVault').addEventListener('click', () => { localStorage.removeItem('passforge-vault-note'); note.value = ''; status.textContent = 'cofre limpo_'; playTone(220, .07, 'square', .02); });
}
$('#decodeButton').addEventListener('click', runDecoder);
$('#decoderInput').addEventListener('input', runDecoder);
$('#decoderMode').addEventListener('change', runDecoder);
setupTabs();
setupVault();
