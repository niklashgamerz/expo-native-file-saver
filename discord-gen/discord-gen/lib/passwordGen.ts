const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIAL = "!@#$%^&*()-_=+[]{}";

export function generatePassword(length = 14): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  let pw = "";
  pw += UPPER[Math.floor(Math.random() * UPPER.length)];
  pw += LOWER[Math.floor(Math.random() * LOWER.length)];
  pw += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  pw += SPECIAL[Math.floor(Math.random() * SPECIAL.length)];
  for (let i = 4; i < length; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

export function generateUsername(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `vault${digits}`;
}

export function generateDisplayName(): string {
  const first = ["Frost", "Silent", "Neon", "Shadow", "Void", "Crystal", "Luna", "Solar"];
  const last = ["Elite", "Ghost", "Runner", "Walker", "Alpha", "Omega", "Nova", "Zero"];
  return `${first[Math.floor(Math.random() * first.length)]}${last[Math.floor(Math.random() * last.length)]}`;
}
