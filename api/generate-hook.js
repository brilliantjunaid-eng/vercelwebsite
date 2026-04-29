// api/generate-hook.js  ← place this file in an "api" folder at your project root
// ─────────────────────────────────────────────────────────
// Vercel Serverless Function using Groq API (free, no credit card)
// SETUP:
// 1. console.groq.com → sign up → API Keys → create key
// 2. Vercel dashboard → your project → Settings → Environment Variables
//    Add: GROQ_API_KEY = your key
// 3. Push to GitHub — Vercel auto-redeploys
// ─────────────────────────────────────────────────────────

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  var topic   = (req.body.topic   || "").trim();
  var subject = (req.body.subject || "general").trim();

  if (!topic) {
    return res.status(400).send("Topic is required");
  }

 var prompt = [
  "A student is about to study \"" + topic + "\" in " + subject + ".",
  "",
  "Before writing anything, think: what is the single most surprising or counterintuitive thing about this topic?",
  "What would make a smart person say 'wait, I never thought about it that way'?",
  "That insight must drive the hook — not a definition, not a summary.",
  "",
  "Rules:",
  "- hook: one sentence, under 20 words. Must contain a specific surprising fact or contradiction. NOT a vague claim.",
  "- hookLong: 2-3 sentences. Expand the surprise. Use a concrete analogy or real-world connection. No textbook tone.",
  "- beauty: what is genuinely elegant or strange about this topic. Avoid the word 'beautiful'.",
  "- lens: one specific thing to notice while studying — a pattern, a question, an irony.",
  "- payoff: a real-world consequence of understanding this. Not 'it will help you in exams'.",
  "- lowSupport/midSupport/highSupport: short, human, specific to THIS topic. Not generic motivation.",
  "- challenge.question: a question that cannot be answered by memorization alone.",
  "",
  "Banned words and phrases: fascinating, intriguing, delve, explore, it is worth noting, beautiful, complex, unlock, crushing it, payoff is huge, whole new world, next level, hard work is paying off.",
  "",
  "BAD hook example: 'Atoms can be counted precisely using the mole concept.'",
  "GOOD hook example: 'One mole of sand grains would bury every continent on Earth under 1 kilometre of sand — yet chemists count in moles daily.'",
  "",
  "Respond with ONLY valid JSON. No markdown. No commentary. No fences.",
  "",
  "{",
  "  \"title\": \"3-5 word topic name\",",
  "  \"hook\": \"...\",",
  "  \"hookLong\": \"...\",",
  "  \"beauty\": \"...\",",
  "  \"lens\": \"...\",",
  "  \"payoff\": \"...\",",
  "  \"visualKind\": \"generic-curve\",",
  "  \"visualTitle\": \"...\",",
  "  \"visualCaption\": \"...\",",
  "  \"lowSupport\": [\"...\", \"...\"],",
  "  \"midSupport\": [\"...\", \"...\"],",
  "  \"highSupport\": [\"...\", \"...\"],",
  "  \"challenge\": { \"question\": \"...\", \"cues\": \"...\" }",
  "}"
].join("\n");
  var response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
  } catch (e) {
    console.error("Groq fetch failed:", e);
    return res.status(502).send("Upstream API error");
  }

  var data;
  try {
    data = await response.json();
  } catch (e) {
    return res.status(502).send("Invalid upstream response");
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error("Unexpected Groq response:", JSON.stringify(data));
    return res.status(502).json({ error: "Unexpected response", detail: data });
  }

  var text  = data.choices[0].message.content;
  var clean = text.replace(/```json|```/g, "").trim();

  res.status(200).setHeader("Content-Type", "application/json").send(clean);
}
