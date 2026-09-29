const passwordOutput = document.querySelector('#password');
const lengthInput = document.querySelector('#length');
const lengthValue = document.querySelector('#lengthValue');
const generateButton = document.querySelector('#generateButton');
const copyButton = document.querySelector('#copyButton');
const copyText = document.querySelector('#copyText');
const warning = document.querySelector('#warning');
const strengthMeter = document.querySelector('.strength-meter');
const strengthLabel = document.querySelector('#strengthLabel');

const options = {
  lowercase: document.querySelector('#lowercase'),
  uppercase: document.querySelector('#uppercase'),
  numbers: document.querySelector('#numbers'),
  symbols: document.querySelector('#symbols')
};

const characters = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%&*?+-_'
};

function randomIndex(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(text) {
  const letters = [...text];
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const randomPosition = randomIndex(index + 1);
    [letters[index], letters[randomPosition]] = [letters[randomPosition], letters[index]];
  }
  return letters.join('');
}

function selectedGroups() {
  return Object.keys(options).filter((group) => options[group].checked);
}

function updateRange() {
  const min = Number(lengthInput.min);
  const max = Number(lengthInput.max);
  const value = Number(lengthInput.value);
  const percent = ((value - min) / (max - min)) * 100;

  lengthValue.textContent = value;
  lengthInput.style.background = `linear-gradient(to right, #35ff61 ${percent}%, #19351f ${percent}%)`;
}

function updateStrength() {
  const length = Number(lengthInput.value);
  const groups = selectedGroups();
  const points = length + groups.length * 3;
  let level = 1;
  let text = 'FRACA';

  if (groups.length === 0) {
    strengthMeter.className = 'strength-meter';
    strengthLabel.textContent = 'SEM DADOS';
    return;
  }
  if (points > 13) { level = 2; text = 'MÉDIA'; }
  if (points > 19) { level = 3; text = 'FORTE'; }
  if (points > 26) { level = 4; text = 'MUITO FORTE'; }

  strengthMeter.className = `strength-meter level-${level}`;
  strengthLabel.textContent = text;
}

function generatePassword() {
  const groups = selectedGroups();
  const length = Number(lengthInput.value);

  updateRange();
  updateStrength();

  if (groups.length === 0) {
    warning.textContent = 'Escolha pelo menos um tipo de caractere.';
    passwordOutput.textContent = 'sem_caracteres';
    return;
  }

  warning.textContent = '';
  let password = '';
  let pool = '';

  groups.forEach((group) => {
    pool += characters[group];
    password += characters[group][randomIndex(characters[group].length)];
  });

  while (password.length < length) {
    password += pool[randomIndex(pool.length)];
  }

  passwordOutput.textContent = shuffle(password);
}

async function copyPassword() {
  const password = passwordOutput.textContent;
  if (!password || password === 'sem_caracteres') return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(password);
    } else {
      const input = document.createElement('textarea');
      input.value = password;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    copyText.textContent = 'COPIADO';
    copyButton.classList.add('copied');
  } catch (error) {
    copyText.textContent = 'SELECIONE';
  }

  window.setTimeout(() => {
    copyText.textContent = 'COPIAR';
    copyButton.classList.remove('copied');
  }, 1600);
}

lengthInput.addEventListener('input', generatePassword);
generateButton.addEventListener('click', generatePassword);
copyButton.addEventListener('click', copyPassword);
Object.values(options).forEach((option) => option.addEventListener('change', generatePassword));

generatePassword();
