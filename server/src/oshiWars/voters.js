import allowedFromJson from "./allowedVoters.json";
import allowedFromTxt from "./allowedVoters.txt";

/**
 * Whitelist location (edit either file, then redeploy / restart wrangler):
 *   - server/src/oshiWars/allowedVoters.txt  (preferred if it has any IDs)
 *   - server/src/oshiWars/allowedVoters.json (array of strings, or { "ids": [...] })
 */
function parseTxt(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function parseJson(data) {
  if (Array.isArray(data)) return data.map(String);
  if (data && Array.isArray(data.ids)) return data.ids.map(String);
  return [];
}

const txtIds = parseTxt(allowedFromTxt);
const jsonIds = parseJson(allowedFromJson);
const sourceIds = txtIds.length > 0 ? txtIds : jsonIds;

const ALLOWED_VOTER_IDS = new Set(
  sourceIds.map((id) => id.trim().toLowerCase()).filter(Boolean)
);

export function normalizeVoterId(voterId) {
  return String(voterId || "").trim();
}

export function isAllowedVoter(voterId) {
  const clean = normalizeVoterId(voterId);
  if (!clean) return false;
  return ALLOWED_VOTER_IDS.has(clean.toLowerCase());
}

export function getAllowedVoterCount() {
  return ALLOWED_VOTER_IDS.size;
}
