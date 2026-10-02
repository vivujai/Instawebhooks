const PAGE_URL = "https://www.hdsb.ca/irs/news-events/";
const DISCORD_HOOK = process.env.DISCORD_HOOK;

(async () => {
  if (!DISCORD_HOOK) {
    console.error("Missing DISCORD_HOOK secret");
    process.exit(1);
  }

  const res = await fetch(PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  });

  if (!res.ok) {
    console.error("Fetch failed:", res.status);
    process.exit(1);
  }

  const html = await res.text();

  // Save raw HTML to a file for inspection
  require("fs").writeFileSync("page.html", html);
  console.log("Saved raw HTML to page.html (" + html.length + " chars)");

  // Check if there's a table
  const tableCount = (html.match(/<table/gi) || []).length;
  console.log("Found " + tableCount + " <table> elements");

  // Check for the announcements heading
  const hasHeading = html.includes("Daily Announcements") || html.includes("Daily Announc");
  console.log("Includes 'Daily Announcements':", hasHeading);

  // Check for any <td> cells
  const tdCount = (html.match(/<td/gi) || []).length;
  console.log("Found " + tdCount + " <td> elements");

  // Print first 2000 chars of HTML for inspection
  console.log("First 2000 chars of HTML:");
  console.log(html.slice(0, 2000));

  process.exit(0);
})();
