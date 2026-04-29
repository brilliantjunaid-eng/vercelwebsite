"use strict";

/* ═══════════════════════════════════════════════════════
   PACT — AI CONTENT GENERATION (Vercel version)
═══════════════════════════════════════════════════════ */

var AI_CACHE_STORAGE_KEY = "pact.ai_cache";

function getAICache() {
  try {
    var raw = localStorage.getItem(AI_CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function setAICache(cacheKey, content) {
  try {
    var cache = getAICache();
    cache[cacheKey] = content;
    localStorage.setItem(AI_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function buildAICacheKey(topic, subject) {
  return (subject || "general") + "::" + (topic || "").toLowerCase().trim();
}

function getAICachedContent(topic, subject) {
  return getAICache()[buildAICacheKey(topic, subject)] || null;
}

function isTopicInLibrary(topic) {
  if (!topic || !topic.trim()) return false;
  var norm = topic.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return TOPIC_LIBRARY.some(function (entry) {
    return entry.keywords.some(function (kw) {
      var normKw = kw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      return norm.indexOf(normKw) >= 0 || normKw.indexOf(norm) >= 0;
    });
  });
}

(function patchLookupContent() {
  var _original = lookupContent;
  lookupContent = function (topic, subject) {
    var cached = getAICachedContent(topic, subject);
    if (cached) return cached;
    return _original(topic, subject);
  };
})();

function generateAIContent(topic, subject, onSuccess, onError) {
  var cached = getAICachedContent(topic, subject);
  if (cached) { onSuccess(cached); return; }

  fetch("/api/generate-hook", {   // ← Vercel API route
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topic, subject: subject })
  })
  .then(function (res) {
    if (!res.ok) throw new Error("Function returned " + res.status);
    return res.text();
  })
  .then(function (text) {
    var clean  = text.replace(/```json|```/g, "").trim();
    var parsed = JSON.parse(clean);

    if (!Array.isArray(parsed.lowSupport)  || !parsed.lowSupport.length)  parsed.lowSupport  = ["Stay with the next single step.", "One move at a time is enough right now."];
    if (!Array.isArray(parsed.midSupport)  || !parsed.midSupport.length)  parsed.midSupport  = ["Ask what the core idea really is.", "Name the central question in plain words first."];
    if (!Array.isArray(parsed.highSupport) || !parsed.highSupport.length) parsed.highSupport = ["You are in a good state. Keep going.", "Stay quiet and let the work carry you."];

    setAICache(buildAICacheKey(topic, subject), parsed);
    onSuccess(parsed);
  })
  .catch(function (err) {
    console.error("[Pact AI] Generation failed:", err);
    if (onError) onError(err);
  });
}

function enhanceHookPageWithAI(els, context, state, fallbackContent) {
  var topic   = context.topic;
  var subject = context.subject;

  if (isTopicInLibrary(topic)) return;

  var cached = getAICachedContent(topic, subject);
  if (cached) {
    applyAIContentToHook(els, cached);
    return;
  }

  els.title.textContent            = "Finding what makes " + topic + " worth approaching\u2026";
  els.shortText.textContent        = "One moment while the warm-up takes shape.";
  els.longText.textContent         = "";
  els.beautyText.textContent       = "Preparing a curiosity angle for this topic\u2026";
  els.lensText.textContent         = "";
  els.payoffText.textContent       = "";
  els.challengePreview.textContent = "The challenge question is being prepared\u2026";

  generateAIContent(topic, subject,
    function (aiContent)  { applyAIContentToHook(els, aiContent); },
    function ()           { applyAIContentToHook(els, fallbackContent); }
  );
}

function applyAIContentToHook(els, content) {
  if (!content) return;
  if (els.title)            els.title.textContent            = content.title         || "";
  if (els.shortText)        els.shortText.textContent        = content.hook          || "";
  if (els.longText)         els.longText.textContent         = content.hookLong      || "";
  if (els.beautyText)       els.beautyText.textContent       = content.beauty        || "";
  if (els.lensText)         els.lensText.textContent         = content.lens          || "";
  if (els.payoffText)       els.payoffText.textContent       = content.payoff        || "";
  if (els.visualTitle)      els.visualTitle.textContent      = content.visualTitle   || "";
  if (els.visualCaption)    els.visualCaption.textContent    = content.visualCaption || "";
  if (els.visualGraphic)    els.visualGraphic.innerHTML      = renderTopicVisual(content);
  if (els.challengePreview) els.challengePreview.textContent = (content.challenge && content.challenge.question) || "";
}
