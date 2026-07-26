/* ============================================================
   db.js — Acceso a IndexedDB.
   Dos object stores: "words" y "reviews".
   Todo el resto de la app pasa por aquí, igual que el
   DbHelper de la versión Flutter.
   ============================================================ */

const DB_NAME = 'lexifrancais_pwa';
const DB_VERSION = 1;
const STORE_WORDS = 'words';
const STORE_REVIEWS = 'reviews';

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_WORDS)) {
        const words = db.createObjectStore(STORE_WORDS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Índice compuesto simple usando una clave concatenada,
        // para poder detectar duplicados mot+traduction rápido.
        words.createIndex('by_mot_traduction', 'motTraduction', { unique: true });
        words.createIndex('by_mot', 'mot', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const reviews = db.createObjectStore(STORE_REVIEWS, {
          keyPath: 'wordId',
        });
        reviews.createIndex('by_nextReview', 'nextReview', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return _dbPromise;
}

function tx(db, storeNames, mode) {
  return db.transaction(storeNames, mode);
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const Db = {
  /**
   * Inserta una palabra si no existe (mot+traduction), o la actualiza
   * si `replace` es true. Devuelve { id, isNew }.
   */
  async upsertWord(word, replace = false) {
    const db = await openDb();
    const t = tx(db, [STORE_WORDS], 'readwrite');
    const store = t.objectStore(STORE_WORDS);
    const key = `${word.mot}|||${word.traduction}`;
    const idx = store.index('by_mot_traduction');

    const existing = await requestToPromise(idx.get(key));

    if (existing) {
      if (replace) {
        const updated = { ...word, id: existing.id, motTraduction: key };
        await requestToPromise(store.put(updated));
      }
      return { id: existing.id, isNew: false };
    } else {
      const toInsert = { ...word, motTraduction: key };
      const id = await requestToPromise(store.add(toInsert));
      return { id, isNew: true };
    }
  },

  async getAllWords() {
    const db = await openDb();
    const t = tx(db, [STORE_WORDS], 'readonly');
    const store = t.objectStore(STORE_WORDS);
    const all = await requestToPromise(store.getAll());
    return all.sort((a, b) => a.mot.localeCompare(b.mot));
  },

  async getWordById(id) {
    const db = await openDb();
    const t = tx(db, [STORE_WORDS], 'readonly');
    return requestToPromise(t.objectStore(STORE_WORDS).get(id));
  },

  async countWords() {
    const db = await openDb();
    const t = tx(db, [STORE_WORDS], 'readonly');
    return requestToPromise(t.objectStore(STORE_WORDS).count());
  },

  async ensureReviewExists(wordId) {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS], 'readwrite');
    const store = t.objectStore(STORE_REVIEWS);
    const existing = await requestToPromise(store.get(wordId));
    if (!existing) {
      const initial = {
        wordId,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: new Date().toISOString(),
      };
      await requestToPromise(store.add(initial));
    }
  },

  async getReviewForWord(wordId) {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS], 'readonly');
    return requestToPromise(t.objectStore(STORE_REVIEWS).get(wordId));
  },

  async saveReview(review) {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS], 'readwrite');
    await requestToPromise(t.objectStore(STORE_REVIEWS).put(review));
  },

  /** Palabras cuyo nextReview ya venció, unidas con sus datos de word. */
  async getWordsDueToday(limit = 200) {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS, STORE_WORDS], 'readonly');
    const reviewStore = t.objectStore(STORE_REVIEWS);
    const wordStore = t.objectStore(STORE_WORDS);

    const allReviews = await requestToPromise(reviewStore.getAll());
    const nowIso = new Date().toISOString();
    const due = allReviews
      .filter((r) => r.nextReview <= nowIso)
      .sort((a, b) => (a.nextReview < b.nextReview ? -1 : 1))
      .slice(0, limit);

    const result = [];
    for (const review of due) {
      const word = await requestToPromise(wordStore.get(review.wordId));
      if (word) result.push({ word, review });
    }
    return result;
  },

  async countDueToday() {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS], 'readonly');
    const all = await requestToPromise(t.objectStore(STORE_REVIEWS).getAll());
    const nowIso = new Date().toISOString();
    return all.filter((r) => r.nextReview <= nowIso).length;
  },

  async countLearned() {
    const db = await openDb();
    const t = tx(db, [STORE_REVIEWS], 'readonly');
    const all = await requestToPromise(t.objectStore(STORE_REVIEWS).getAll());
    return all.filter((r) => r.repetitions >= 3).length;
  },
};
