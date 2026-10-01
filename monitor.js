const PAGE_URL = "https://www.hdsb.ca/irs/news-events/";
const ZAP_HOOK = process.env.ZAP_HOOK;

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

function chunkMessage(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

(async () => {
  const res = await fetch(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!res.ok) {
    console.error("Fetch failed:", res.status);
    process.exit(1);
  }

  const text = extractText(await res.text());
  console.log(`Extracted ${text.length} characters`);

  for (const part of chunkMessage(text, 1800)) {
    const r = await fetch(ZAP_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: part, page: PAGE_URL })
    });
    console.log("Hook status:", r.status);
  }
})();
