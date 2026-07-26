/* ============================================================
   app.js — Orquesta las pantallas: Inicio, Estudio, Terminado.
   Sin framework: DOM directo, a propósito (misma filosofía
   "Lite" que la versión Flutter: velocidad sobre arquitectura).
   ============================================================ */

const el = (id) => document.getElementById(id);

const screens = {
  home: el('screen-home'),
  study: el('screen-study'),
  done: el('screen-done'),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

/* ---------------------- PANTALLA INICIO ---------------------- */

async function refreshHomeStats() {
  const [due, learned, total] = await Promise.all([
    Db.countDueToday(),
    Db.countLearned(),
    Db.countWords(),
  ]);

  el('stat-due').textContent = due;
  el('stat-learned').textContent = learned;
  el('stat-total').textContent = `${total} palabra${total === 1 ? '' : 's'} en tu vocabulario`;

  const studyBtn = el('btn-study');
  studyBtn.disabled = due === 0;
  studyBtn.textContent = due === 0 ? 'Nada pendiente por hoy 🎉' : `Estudiar (${due})`;
}

el('btn-refresh').addEventListener('click', refreshHomeStats);

el('btn-study').addEventListener('click', async () => {
  await startStudySession();
});

el('btn-import').addEventListener('click', () => {
  el('csv-input').click();
});

el('csv-input').addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  event.target.value = ''; // permite reimportar el mismo archivo después
  if (!file) return;

  const importBtn = el('btn-import');
  const originalLabel = importBtn.textContent;
  importBtn.disabled = true;
  importBtn.textContent = 'Importando…';

  try {
    const text = await file.text();
    const result = await importCsvString(text, false);
    await refreshHomeStats();
    showImportResult(result);
  } catch (e) {
    showImportResult({
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [`No se pudo leer el archivo: ${e && e.message ? e.message : e}`],
    });
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = originalLabel;
  }
});

function showImportResult(result) {
  const lines = [];
  lines.push(`Importadas: ${result.imported}`);
  lines.push(`Omitidas (ya existían): ${result.skipped}`);
  if (result.errors && result.errors.length > 0) {
    lines.push('');
    lines.push('Avisos:');
    result.errors.slice(0, 5).forEach((e) => lines.push(`• ${e}`));
    if (result.errors.length > 5) {
      lines.push(`… y ${result.errors.length - 5} más.`);
    }
  }
  el('import-result-text').textContent = lines.join('\n');
  el('import-modal').classList.add('active');
}

el('btn-close-import').addEventListener('click', () => {
  el('import-modal').classList.remove('active');
});

/* ---------------------- PANTALLA ESTUDIO ---------------------- */

let studyQueue = [];
let studyInitialCount = 0;

async function startStudySession() {
  studyQueue = await Db.getWordsDueToday();
  studyInitialCount = studyQueue.length;

  if (studyQueue.length === 0) {
    await refreshHomeStats();
    return;
  }

  showScreen('study');
  renderCurrentCard();
}

function renderCurrentCard() {
  const flashcard = el('flashcard');
  flashcard.classList.remove('flipped');

  el('study-progress').textContent = `${studyQueue.length} / ${studyInitialCount}`;

  const { word } = studyQueue[0];

  el('card-mot').textContent = word.mot;
  el('card-ipa').textContent = '';
  el('card-traduction').textContent = word.traduction;

  // Chips (tipo, nivel, género)
  const tagsEl = el('card-tags');
  tagsEl.innerHTML = '';
  const isNoun = (word.type || '').toLowerCase().includes('nom') ||
                 (word.type || '').toLowerCase().includes('substantiv');
  const isVerb = (word.type || '').toLowerCase().includes('verb');

  [word.type, word.niveau, isNoun ? word.genre : null].forEach((t) => {
    if (t) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    }
  });

  // Campos adicionales
  const fieldsEl = el('card-fields');
  fieldsEl.innerHTML = '';
  const addField = (label, value) => {
    if (!value) return;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const l = document.createElement('span');
    l.className = 'field-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'field-value';
    v.textContent = value;
    wrap.appendChild(l);
    wrap.appendChild(v);
    fieldsEl.appendChild(wrap);
  };

  if (isNoun) addField('Pluriel', word.plural);
  if (isVerb) {
    addField('Présent', word.present);
    addField('Passé composé', word.passeCompose);
  }
  addField('Expression fréquente', word.expression);
  addField('Exemple', word.example);
}

el('flashcard').addEventListener('click', (event) => {
  // Evita que tocar los botones de audio dispare el flip.
  if (event.target.closest('.audio-btn')) return;
  el('flashcard').classList.toggle('flipped');
});

el('btn-audio-front').addEventListener('click', (event) => {
  event.stopPropagation();
  playCurrentAudio();
});
el('btn-audio-back').addEventListener('click', (event) => {
  event.stopPropagation();
  playCurrentAudio();
});

function playCurrentAudio() {
  if (studyQueue.length === 0) return;
  Tts.speak(studyQueue[0].word.mot);
}

document.querySelectorAll('.answer-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    await answerCurrentCard(btn.dataset.answer);
  });
});

async function answerCurrentCard(answerKey) {
  if (studyQueue.length === 0) return;
  const current = studyQueue[0];
  const newReview = sm2Next(current.review, answerKey);
  await Db.saveReview(newReview);

  studyQueue.shift();

  if (studyQueue.length === 0) {
    showScreen('done');
  } else {
    renderCurrentCard();
  }
}

el('btn-back-home').addEventListener('click', async () => {
  showScreen('home');
  await refreshHomeStats();
});

el('btn-done-home').addEventListener('click', async () => {
  showScreen('home');
  await refreshHomeStats();
});

/* ---------------------- INSTALACIÓN PWA ---------------------- */

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  el('install-banner').classList.add('active');
});

el('btn-install').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  el('install-banner').classList.remove('active');
});

window.addEventListener('appinstalled', () => {
  el('install-banner').classList.remove('active');
});

/* ---------------------- INICIO ---------------------- */

Tts.init();
refreshHomeStats();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('No se pudo registrar el Service Worker:', err);
    });
  });
}
