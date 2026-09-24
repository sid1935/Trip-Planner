/**
 * Minimal Gemini client (REST generateContent with JSON-schema output).
 * Needs GEMINI_API_KEY. Optional GEMINI_MODEL overrides the model.
 * Tries the configured model first, then falls back if a model isn't available.
 */

const API = 'https://generativelanguage.googleapis.com/v1beta/models/';

function models() {
  const list = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
  return list.filter((m, i) => list.indexOf(m) === i);
}

function enabled() { return !!process.env.GEMINI_API_KEY; }

/**
 * Ask Gemini for JSON matching `schema`. Resolves { model, data } or throws.
 * fast = ask the model to skip extended "thinking" (these are simple extraction and
 * writing tasks, and thinking made replies too slow). If a model rejects that
 * setting, the same model is retried once without it.
 */
async function generateJSON({ system, prompt, schema, timeoutMs = 9000, temperature = 0.2, fast = true }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');

  let lastErr = null;
  for (const model of models()) {
    const attempts = fast ? [true, false] : [false];
    for (const lowThinking of attempts) {
      const generationConfig = { responseMimeType: 'application/json', responseSchema: schema, temperature: temperature };
      if (lowThinking) generationConfig.thinkingConfig = { thinkingBudget: 0 };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      let body;
      try {
        res = await fetch(API + encodeURIComponent(model) + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: generationConfig
          }),
          signal: ctrl.signal
        });
        body = await res.json().catch(() => ({}));
      } catch (e) {
        throw e.name === 'AbortError' ? new Error('Gemini took too long to answer.') : e;
      } finally {
        clearTimeout(timer);
      }

      const msg = (body && body.error && body.error.message) || '';
      if (res.status === 404) { lastErr = new Error('Model ' + model + ' not available'); break; } // next model
      if (res.status === 400 && lowThinking && /think/i.test(msg)) { lastErr = new Error(msg); continue; } // retry without
      if (!res.ok) throw new Error('Gemini ' + res.status + ': ' + (msg || 'request failed'));

      const cand = body.candidates && body.candidates[0];
      const text = cand && cand.content && cand.content.parts
        ? cand.content.parts.filter((p) => !p.thought).map((p) => p.text || '').join('')
        : '';
      if (!text) throw new Error('Gemini returned no content' + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : ''));
      return { model: model, data: JSON.parse(text) };
    }
  }
  throw lastErr || new Error('Gemini request failed.');
}

module.exports = { generateJSON, enabled, models };
