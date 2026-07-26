/* ============================================================
   tts.js — Síntesis de voz usando la Web Speech API del navegador.
   Equivalente web de flutter_tts: no requiere archivos de audio
   ni conexión (usa las voces ya instaladas en el sistema/navegador).
   ============================================================ */

const Tts = {
  _voice: null,
  _voicesLoaded: false,

  _pickFrenchVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase() === 'fr-fr') ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('fr')) ||
      null
    );
  },

  init() {
    if (!('speechSynthesis' in window)) return;
    this._voice = this._pickFrenchVoice();
    window.speechSynthesis.onvoiceschanged = () => {
      this._voice = this._pickFrenchVoice();
      this._voicesLoaded = true;
    };
  },

  /** Reproduce el texto en francés. No lanza si el navegador no soporta TTS. */
  speak(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('Este navegador no soporta síntesis de voz (Web Speech API).');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 0.85;
    utter.pitch = 1.0;
    if (this._voice) utter.voice = this._voice;
    window.speechSynthesis.speak(utter);
  },
};
