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

  if (r.status === 429) {
    const data = await r.json();
    console.warn("Rate limited, waiting " + data.retry_after + "s");
    await new Promise(res => setTimeout(res, data.retry_after * 1000 + 500));
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
  console.log("Extracted " + text.length + " characters");

  const chunks = chunkMessage(text);
  await sendToDiscord("📢 IRHS News & Events\n🔗 " + PAGE_URL);

  for (let i = 0; i < chunks.length; i++) {
    console.log("Sending chunk " + (i + 1) + "/" + chunks.length);
    await sendToDiscord(chunks[i]);
    await new Promise(r => setTimeout(r, 1200));
  }
})();
