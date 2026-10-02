const PAGE_URL = "https://www.hdsb.ca/irs/news-events/";
const DISCORD_HOOK = process.env.DISCORD_HOOK;

async function extractAnnouncements(html) {
  // Get everything between the Daily Announcements heading and the next major section
  // Look for a table structure or alternating title/announcement blocks

  // Strategy: find the section and extract title + text pairs
  let section = html;

  // Try to find the announcements table - IRHS lists them with alternating row colors
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);

  if (tableMatch) {
    const tableHtml = tableMatch[1];
    const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

    if (rows && rows.length > 1) {
      const announcements = [];

      for (const row of rows) {
        // Skip header row
        if (row.toLowerCase().includes('title') && row.toLowerCase().includes('annou')) continue;

        // Extract cells
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);

        if (cells && cells.length >= 2) {
          let title = cells[0].replace(/<[^>]+>/g, "").trim();
          let text = cells[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

          // Clean up HTML entities
          text = text
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&apos;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

          title = title
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&apos;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

          if (title && text) {
            announcements.push({ title, text });
          }
        }
      }

      return announcements;
    }
  }

  // Fallback: try to extract from a different structure
  const results = [];
  const titlePattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;

  while ((match = titlePattern.exec(html)) !== null) {
    const title = match[1].replace(/<[^>]+>/g, "").trim();
    if (title && title.length < 100) {
      // Look for text following this heading
      const afterMatch = html.slice(match.index + match[0].length);
      const textMatch = afterMatch.match(/([\s\S]{0,500}?)(?:<h[1-6]|<\/div>|<\/section>|$)/i);
      const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

      if (text && text.length > 10) {
        results.push({ title, text });
      }
    }
  }

  return results;
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

  const html = await res.text();
  const announcements = extractAnnouncements(html);

  console.log("Found " + announcements.length + " announcements");

  if (announcements.length === 0) {
    console.log("No announcements found");
    process.exit(0);
  }

  // Build the message: each title + announcement, then link at the end
  let message = "📢 **IRHS Daily Announcements**\n\n";

  for (let i = 0; i < announcements.length; i++) {
    const a = announcements[i];
    message += "**" + a.title + "**\n" + a.text + "\n\n";

    // Keep each chunk Discord-safe
    if (message.length > 1800) {
      await sendToDiscord(message.trim());
      message = "";
    }
  }

  // Append the link to the last chunk
  if (message) {
    message += "\n🔗 [Check full announcements](" + PAGE_URL + ")";
    await sendToDiscord(message);
  }

  console.log("Done");
})();
