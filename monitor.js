const PAGE_URL = "https://www.hdsb.ca/irs/news-events/";
const DISCORD_HOOK =```javascript
const PAGE_URL = "https://www.hdsb.ca/irs/news-events/";
const DISCORD_HOOK = process.env.DISCORD_HOOK;

async function extractText(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(nav|header|footer|form|svg)[\s\S]*?<\/\1>/gi, " ");

  s = s.replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");

  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

  return s
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Discord hard-caps a message at 2000 characters.
function chunkMessage(text, size = 1900) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

async function sendToDiscord(content) {
  const r = await fetch(DISCORD_HOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  // 429 = rate limited. Discord tells us how long to wait.
  if (r.status === 429) {
    const { retry_after } = await r.json();
    console.warn(`Rate limited, waiting ${retry_after}s`);
    await new Promise(res => setTimeout(res, retry_after * 1000 + 500));
    return sendToDiscord(content);
  }

  if (!r.ok) {
    console.error("Discord error", r.status, await r.text());
  }
  return r.status;
}

(async () => {
  if (!DISCORD_HOOK) {
    console.error("Missing DISCORD_HOOK secret");
    process.exit(1);
  }

  const res = await fetch(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!res.ok) {
    console.error("Fetch failed:", res.status);
    process.exit(1);
  }

  const text = extractText(await res.text());
  console.log(`Extracted ${text.length} characters`);

  const chunks = chunkMessage(text);
  await sendToDiscord(`📢 **IRHS News & Events** — full page dump\n🔗 ${PAGE_URL}`);

  for (const [i, part] of chunks.entries()) {
    console.log(`Sending chunk ${i + 1}/${chunks.length}`);
    await sendToDiscord(part);
    await new Promise(r => setTimeout(r, 1200)); // stay under webhook rate limits
  }
})();
