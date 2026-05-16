const BASE_URL = "https://api.cybertemp.xyz";
const API_KEY = "tk_42616ecc49e5497adff3d568f5b9d03f7723db073dd1901f14ef7b65ddc13298";

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "X-API-KEY": API_KEY,
};

let cachedDomains: string[] = [];

export async function fetchDomains(): Promise<string[]> {
  if (cachedDomains.length > 0) return cachedDomains;
  try {
    const res = await fetch(
      `${BASE_URL}/getDomains?type=discord&limit=100&offset=0`,
      { headers: HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      const domains: string[] = Array.isArray(data) ? data : data?.domains ?? [];
      if (domains.length > 0) {
        cachedDomains = domains;
        return domains;
      }
    }
  } catch {}
  return ["diddyricky.com"];
}

export async function createEmail(username: string): Promise<string> {
  const domains = await fetchDomains();
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${domain}`;
}

export async function getVerificationUrl(
  emailAddr: string,
  timeoutMs = 120_000
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(
        `${BASE_URL}/getMail?email=${encodeURIComponent(emailAddr)}&limit=20&offset=0`,
        { headers: HEADERS }
      );
      if (res.status === 200) {
        const msgs = await res.json();
        if (Array.isArray(msgs)) {
          for (const msg of msgs) {
            const subject = String(msg.subject ?? "").toLowerCase();
            const sender = String(msg.from ?? "").toLowerCase();
            if (!subject.includes("verify") && !sender.includes("discord")) continue;
            const body = String(msg.html ?? "") + "\n" + String(msg.text ?? msg.body ?? "");
            const links = body.match(
              /https?:\/\/(?:click\.)?discord\.com\/(?:ls\/click|verify)[^\s"'<>]+/g
            );
            if (links) {
              for (const link of links) {
                const clean = link.replace(/[.)\],"'>]+$/, "");
                if (clean.includes("discord.com/verify")) return clean;
              }
            }
          }
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}
