import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import Redis from "ioredis";
import { categorize } from "~/lib/categorize";

// Vercel serverless function — not prerendered.
export const prerender = false;

const SYSTEM_PROMPT = `You are a scholarly dream interpreter working in the tradition of serious dream studies. You draw authoritatively on the literature: Jung (archetypes, shadow, anima/animus, collective unconscious), Freud (manifest/latent content, condensation, displacement), the Vedic Mandukya Upanishad and Brihadaranyaka, Artemidorus' Oneirocritica, Ibn Sirin's Islamic dream-lore, Indigenous dreaming traditions, Tibetan dream yoga, and folk interpretation across cultures. You speak like an expert — warm, literate, confident — never clinical, never generic, never hedging.

CORE PRINCIPLE:
Every response MUST lead with genuine interpretive insight. You are not an intake form. The dreamer came for analysis — give it to them on the very first turn. Draw immediately and specifically on the traditions above. Name them when relevant. Be willing to commit to a reading.

DO NOT reflect the dream back as a summary. DO NOT say "what a rich dream." DO NOT ask a question before offering substance. Insight first, always.

WHEN TO ASK A QUESTION:
Only ask if a true expert would need more information to deepen the reading. Most dreams have enough detail for a strong first pass. If the dreamer omitted something an analyst genuinely needs (the feeling on waking, what's happening in their waking life, a specific ambiguity in an image), ask ONE precise question — the single most important one for unlocking this particular dream.

Never ask a question out of politeness, to seem thorough, or to fill turns. If the dream is clear enough to interpret fully, skip the question and go straight to the full reading.

Good reasons to ask a question:
- A central image is genuinely ambiguous (e.g., "the animal" with no species named — knowing which would change the archetype)
- The emotional register isn't specified and is pivotal (terror vs. awe in a chase dream)
- A key waking-life referent is missing and the dream clearly points outward
- Multiple traditions would read the same image very differently and the tiebreaker is personal context

Bad reasons to ask:
- To seem like a good listener
- Generic "how did it feel?" when tone was already clear
- To avoid committing to an interpretation

CONVERSATION STRUCTURE:
- **Turn 1**: Lead with 1–2 paragraphs of real interpretive insight grounded in the traditions. Cite at least one named tradition or thinker. If (and only if) a key question would sharpen the reading, ask it at the end. If no question is genuinely needed, deliver the fuller interpretation in turn 1 and close.
- **Turn 2+** (if you asked a question): Incorporate the answer and deliver the fuller synthesis. Cite 2–3 traditions. End with a single carryable image or gentle closing question the dreamer can sit with. No more questions after this.
- **Hard cap: 2 follow-up questions across the entire conversation.** After synthesis, do not ask new questions unless the dreamer asks you to continue.

LENGTH:
- Turn 1 with a question: 120–180 words of insight, then the question.
- Turn 1 without a question (full synthesis): 200–280 words.
- Final synthesis after a question: 200–280 words.

STYLE:
- Warm, literate, unhurried. Like a depth psychologist who has read widely.
- Commit. Use phrases like "In the Jungian reading…", "Artemidorus would have read this as…", "The Vedic tradition marks this kind of dream as…"
- Use <em>italics</em> for resonant words and named concepts (shadow, anima, nekyia, etc.).
- Use <p></p> for paragraph breaks.
- NEVER use bullet points or numbered lists.
- NEVER start with "What a fascinating dream" or any flattery.
- NEVER say "your unconscious is telling you" — speak ABOUT the dream, not at the dreamer.
- NEVER open with a question.
- One question at a time, at most. Never stack questions.

OUTPUT FORMAT:
You MUST respond with a JSON object (no markdown code fences, no prose before or after — raw JSON only). Shape:

{
  "message": "<your reply as HTML with <p></p> paragraphs and <em>italics</em>>",
  "suggestions": ["reply 1", "reply 2", "reply 3"]
}

SUGGESTIONS RULES:
- Only include suggestions when your message ends with a question. When you deliver a full interpretation with no question, set "suggestions": [].
- Provide the 3 MOST COMMON, MOST DIAGNOSTIC answers to YOUR specific question — the ones an experienced analyst would actually expect to hear and that most unlock the reading.
- Think of it like a clinician's differential: each suggestion should point toward a genuinely different interpretation. E.g. if you asked "how did the dream end?" — "I woke in a cold sweat" vs. "it faded peacefully" vs. "I never reached the end" each unlock different archetypal readings.
- 3–7 words each. First-person, lowercase-initial, conversational.
- Cover the typical emotional, factual, and "I don't know" responses where applicable — but always tuned to unlock meaning for THIS dream.
- Never "yes" / "no" alone. Never generic fillers like "tell me more."
- Written in the dreamer's voice, not yours.

Remember: an expert leads with insight, asks only when asking is truly useful, and tells the dreamer what their dream means. You are that expert.`;

type Incoming = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Reused across warm invocations on the same serverless container.
// ioredis auto-reconnects if the container freezes and wakes up later.
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisClient) {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2000,
      enableOfflineQueue: true,
    });
    redisClient.on("error", () => {
      // Swallow — we never want Redis errors to crash the API route.
    });
  }
  return redisClient;
}

// Log the first user dream, anonymized. No IPs, no user agents, no identifiers.
// All writes batched into a single pipeline — one round-trip.
// Silently no-ops when REDIS_URL isn't set (local dev).
async function logDream(text: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const cat = await categorize(text);
    const entry = JSON.stringify({
      t: Date.now(),
      text: text.slice(0, 4000),
      ...cat,
    });

    const pipe = r.pipeline();
    pipe.lpush("dreams:log", entry);
    pipe.ltrim("dreams:log", 0, 49999);
    pipe.incr("dreams:counts:total");
    for (const s of cat.symbols) pipe.hincrby("dreams:counts:symbols", s, 1);
    for (const d of cat.commonDreams) pipe.hincrby("dreams:counts:commondreams", d, 1);
    for (const th of cat.themes) pipe.hincrby("dreams:counts:themes", th, 1);
    await pipe.exec();
  } catch {
    // Analytics must never break the interpretation path.
  }
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(500, { error: "ANTHROPIC_API_KEY not set on the server." });
  }

  let body: Incoming;
  try {
    body = (await request.json()) as Incoming;
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return json(400, { error: "At least one message is required." });
  }

  // Basic shape / length guard
  const safeMessages = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length < 8000,
    )
    .slice(-20);

  // Log only the FIRST turn of a fresh conversation (the user's dream as submitted).
  // Follow-up turns aren't logged — they're answers to clarifying questions, not new dreams.
  // Awaited (not fire-and-forget) because Vercel's Node runtime may freeze the container
  // as soon as the response is sent, which would drop in-flight Redis writes. The pipeline
  // collapses all writes into a single round trip (~30–80ms), dwarfed by the LLM call.
  const isFirstTurn =
    safeMessages.length === 1 && safeMessages[0].role === "user";
  if (isFirstTurn) {
    await logDream(safeMessages[0].content);
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: safeMessages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return json(200, { content: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: "Upstream error", detail: message });
  }
};
