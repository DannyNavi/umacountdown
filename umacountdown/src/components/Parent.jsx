import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { e as getCharaByBaseId } from "../../data.js";
import "./Parent.css";

const STAT_FACTORS = {
  1: "Speed",
  2: "Stamina",
  3: "Power",
  4: "Guts",
  5: "Wit",
  10: "Speed",
  20: "Stamina",
  30: "Power",
  40: "Guts",
  50: "Wit",
};

// uma.moe factors.json type 2 = inheritable G1 race sparks (34 races).
// Same list as GameTora / uma.guide race spark tables; kept as fallback before the factor table loads.
const RACE_SPARK_FACTOR_TYPE = 2;
const FALLBACK_RACE_SPARK_IDS = new Set([
  "100010", "100020", "100030", "100040", "100050", "100060", "100070", "100080",
  "100090", "100100", "100110", "100120", "100130", "100140", "100150", "100160",
  "100170", "100180", "100190", "100200", "100210", "100220", "100230", "100240",
  "100250", "100260", "100270", "100280", "100290", "100300", "100310", "100320",
  "100330", "100340",
]);

function isRaceSparkFactor(factorId, factorById = new Map()) {
  if (factorId == null || factorId === "") return false;
  const id = String(factorId);
  const meta = factorById.get(id);
  if (meta != null) return Number(meta.type) === RACE_SPARK_FACTOR_TYPE;
  return FALLBACK_RACE_SPARK_IDS.has(id);
}

const FACTORS_CACHE_KEY = "uma-parent-factors-v1";
const FACTORS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PRACTICE_CACHE_PREFIX = "uma-practice:";
const PRACTICE_CACHE_TTL_MS = 60 * 60 * 1000;

function readCachedFactors() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FACTORS_CACHE_KEY) || "null");
    if (!parsed?.items || Date.now() - parsed.savedAt > FACTORS_CACHE_TTL_MS) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCachedFactors(items) {
  try {
    localStorage.setItem(
      FACTORS_CACHE_KEY,
      JSON.stringify({ items, savedAt: Date.now() })
    );
  } catch {
    // ignore quota / private mode
  }
}

function practiceCacheKey(id) {
  return `${PRACTICE_CACHE_PREFIX}${id}`;
}

function readCachedPractice(id) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(practiceCacheKey(id)) || "null");
    if (!parsed?.payload || Date.now() - parsed.savedAt > PRACTICE_CACHE_TTL_MS) {
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCachedPractice(id, payload) {
  try {
    sessionStorage.setItem(
      practiceCacheKey(id),
      JSON.stringify({ payload, savedAt: Date.now() })
    );
  } catch {
    // ignore quota / private mode
  }
}

function starCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function charaNameFromId(cardId) {
  if (cardId == null || cardId === "") return null;
  const numeric = Number(cardId);
  if (!Number.isFinite(numeric)) return null;
  const base = Math.floor(numeric / 100);
  return getCharaByBaseId(String(base))?.name || null;
}

function charaStandUrl(cardId) {
  const digits = String(cardId ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const full = digits.slice(0, 6);
  const prefix = full.slice(0, 4);
  return `https://gametora.com/images/umamusume/characters/chara_stand_${prefix}_${full}.png`;
}

function formatScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toLocaleString("en-US");
}

function CharaPortrait({ cardId, name, variant = "stand" }) {
  const src = charaStandUrl(cardId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const className =
    variant === "circle"
      ? "Parent-portrait Parent-portrait--circle"
      : "Parent-portrait";

  if (!src || failed) {
    if (variant === "circle") {
      return (
        <div className={`${className} Parent-portrait--fallback`} aria-hidden="true">
          {(name || "?").slice(0, 1)}
        </div>
      );
    }
    return null;
  }

  return (
    <img
      className={className}
      src={src}
      alt={name ? `${name} portrait` : ""}
      width={variant === "circle" ? 48 : 48}
      height={variant === "circle" ? 48 : 48}
      onError={() => setFailed(true)}
    />
  );
}

function parseSpark(value, factorById = new Map()) {
  if (value == null) return null;

  if (typeof value === "object") {
    const id = value.id ?? value.factor_id;
    const hasStarField = value.star != null || value.stars != null || value.level != null;
    let factorId = id != null ? String(id) : "";
    let stars = starCount(value.star ?? value.stars ?? value.level);
    if (!hasStarField && /^\d+$/.test(factorId) && factorId.length >= 2) {
      stars = starCount(factorId.slice(-1));
      factorId = factorId.slice(0, -1);
    }
    const name =
      value.name ||
      value.factor_name ||
      value.label ||
      factorById.get(factorId)?.text ||
      factorById.get(String(id))?.text ||
      charaNameFromId(factorId || id) ||
      (id != null ? String(id) : null);
    if (!name) return null;
    return { name: String(name), stars, factorId };
  }

  const raw = String(value);
  if (!/^\d+$/.test(raw) || raw.length < 2) {
    return { name: raw, stars: 0, factorId: raw };
  }

  const level = Number(raw.slice(-1));
  const factorId = raw.slice(0, -1);
  const name =
    factorById.get(factorId)?.text ||
    STAT_FACTORS[Number(factorId)] ||
    charaNameFromId(factorId) ||
    factorId;
  return { name, stars: starCount(level), factorId };
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectSparks(groups, factorById, matchedIds) {
  return groups.flatMap(({ values, tone }) =>
    asList(values)
      .map((value) => {
        const parsed = parseSpark(value, factorById);
        if (!parsed || isRaceSparkFactor(parsed.factorId, factorById)) return null;
        const nextTone = tone || "white";
        return {
          ...parsed,
          tone: nextTone,
          matched: nextTone === "white" && matchedIds?.has(parsed.factorId),
        };
      })
      .filter(Boolean)
  );
}

function whiteFactorIds(values, factorById = new Map()) {
  const ids = new Set();
  for (const value of asList(values)) {
    const parsed = parseSpark(value, factorById);
    if (!parsed?.factorId || isRaceSparkFactor(parsed.factorId, factorById)) continue;
    ids.add(parsed.factorId);
  }
  return ids;
}

function matchingWhiteIds(inheritance, factorById = new Map()) {
  const sources = [
    whiteFactorIds(inheritance.main_white_factors ?? inheritance.white_sparks, factorById),
    whiteFactorIds(inheritance.left_white_factors, factorById),
    whiteFactorIds(inheritance.right_white_factors, factorById),
  ];
  const counts = new Map();
  for (const ids of sources) {
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const matched = new Set();
  for (const [id, count] of counts) {
    if (count >= 2) matched.add(id);
  }
  return matched;
}

function pickInheritance(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.inheritance,
    payload.result?.inheritance,
    payload.result,
    payload.stream?.inheritance,
    payload.data?.inheritance,
    payload.saved,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if (Array.isArray(candidate)) {
      const row = candidate.find(
        (item) =>
          item &&
          (item.main_parent_id != null ||
            item.main_blue_factors != null ||
            item.parent_rarity != null ||
            Array.isArray(item.blue_sparks))
      );
      if (row) return row;
      continue;
    }
    if (
      candidate.main_parent_id != null ||
      candidate.main_blue_factors != null ||
      candidate.parent_rarity != null ||
      candidate.card_id != null ||
      Array.isArray(candidate.main_white_factors) ||
      Array.isArray(candidate.blue_sparks)
    ) {
      return candidate;
    }
  }
  return null;
}

function pickTrainerName(payload, inheritance) {
  return (
    inheritance?.trainer_name ||
    payload?.trainer_name ||
    payload?.result?.trainer_name ||
    payload?.stream?.trainer_name ||
    null
  );
}

function StarRow({ count }) {
  const n = starCount(count);
  if (!n) return null;
  return (
    <span className="Parent-star-row" aria-label={`${n} star${n === 1 ? "" : "s"}`}>
      {"★".repeat(n)}
    </span>
  );
}

function SparkMeter({ count }) {
  const filled = Math.min(3, Math.max(0, starCount(count)));
  return (
    <span className="Parent-spark-stars" aria-label={`${filled} of 3 stars`}>
      {[0, 1, 2].map((index) => (
        <span key={index} className={index < filled ? "filled" : "empty"} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

function InspirationGrid({ groups, factorById, columns = 2, matchedIds }) {
  const chips = collectSparks(groups, factorById, matchedIds);
  if (!chips.length) {
    return <p className="Parent-empty">No inspiration data.</p>;
  }
  return (
    <div className={`Parent-insp-grid cols-${columns}`}>
      {chips.map((chip, index) => (
        <div
          className={`Parent-insp-tile ${chip.tone}${chip.tone === "green" ? " unique" : ""}${chip.matched ? " match" : ""}`}
          key={`${chip.tone}-${chip.name}-${index}`}
        >
          <span className={`Parent-insp-dot ${chip.tone}`} aria-hidden="true" />
          <div className="Parent-insp-copy">
            <span className="Parent-insp-name">{chip.name}</span>
            <SparkMeter count={chip.stars} />
          </div>
        </div>
      ))}
    </div>
  );
}

function sparkGroups(prefix, inheritance) {
  if (prefix === "left") {
    return [
      { values: inheritance.left_blue_factors, tone: "blue" },
      { values: inheritance.left_pink_factors, tone: "pink" },
      { values: inheritance.left_green_factors, tone: "green" },
      { values: inheritance.left_white_factors, tone: "white" },
    ];
  }
  if (prefix === "right") {
    return [
      { values: inheritance.right_blue_factors, tone: "blue" },
      { values: inheritance.right_pink_factors, tone: "pink" },
      { values: inheritance.right_green_factors, tone: "green" },
      { values: inheritance.right_white_factors, tone: "white" },
    ];
  }
  return [
    { values: inheritance.main_blue_factors ?? inheritance.blue_sparks, tone: "blue" },
    { values: inheritance.main_pink_factors ?? inheritance.pink_sparks, tone: "pink" },
    { values: inheritance.main_green_factors ?? inheritance.green_sparks, tone: "green" },
    { values: inheritance.main_white_factors ?? inheritance.white_sparks, tone: "white" },
  ];
}

function PartnerCard({ payload, factorById }) {
  const inheritance = pickInheritance(payload);
  if (!inheritance) return null;

  const trainerName = pickTrainerName(payload, inheritance);
  const rarity = inheritance.parent_rarity ?? inheritance.rarity;
  const cardId = inheritance.main_parent_id ?? inheritance.card_id;
  const charaName =
    inheritance.chara_name ||
    inheritance.character_name ||
    inheritance.name ||
    charaNameFromId(cardId) ||
    (cardId != null ? `Card ${cardId}` : trainerName || "Practice partner");
  const score = formatScore(inheritance.parent_rank ?? inheritance.rank ?? inheritance.eval_score);
  const leftName = charaNameFromId(inheritance.parent_left_id) || "P1";
  const rightName = charaNameFromId(inheritance.parent_right_id) || "P2";
  const hasLeft =
    inheritance.parent_left_id ||
    inheritance.left_blue_factors ||
    inheritance.left_white_factors;
  const hasRight =
    inheritance.parent_right_id ||
    inheritance.right_blue_factors ||
    inheritance.right_white_factors;
  const matchedIds = matchingWhiteIds(inheritance, factorById);

  return (
    <article className="Parent-details">
      <div className="Parent-details-bar">Practice Partner</div>

      <div className="Parent-profile">
        <CharaPortrait cardId={cardId} name={charaName} variant="circle" />
        <div className="Parent-profile-info">
          <div className="Parent-profile-meta">
            {rarity ? <StarRow count={rarity} /> : null}
            {score ? <span className="Parent-score">{score}</span> : null}
          </div>
          {trainerName ? <p className="Parent-trainer">{trainerName}</p> : null}
          <h2 className="Parent-chara-name">{charaName}</h2>
        </div>
      </div>

      <section className="Parent-block" aria-label="Inspiration">
        <h3 className="Parent-block-title">Inspiration</h3>
        <InspirationGrid groups={sparkGroups("main", inheritance)} factorById={factorById} columns={2} matchedIds={matchedIds} />
      </section>

      {(hasLeft || hasRight) && (
        <div className="Parent-lineage">
          {hasLeft && (
            <section className="Parent-block" aria-label={`P1 ${leftName}`}>
              <h3 className="Parent-block-title">
                <CharaPortrait cardId={inheritance.parent_left_id} name={leftName} variant="circle" />
                <span>P1 {leftName}</span>
              </h3>
              <InspirationGrid groups={sparkGroups("left", inheritance)} factorById={factorById} columns={2} matchedIds={matchedIds} />
            </section>
          )}
          {hasRight && (
            <section className="Parent-block" aria-label={`P2 ${rightName}`}>
              <h3 className="Parent-block-title">
                <CharaPortrait cardId={inheritance.parent_right_id} name={rightName} variant="circle" />
                <span>P2 {rightName}</span>
              </h3>
              <InspirationGrid groups={sparkGroups("right", inheritance)} factorById={factorById} columns={2} matchedIds={matchedIds} />
            </section>
          )}
        </div>
      )}
    </article>
  );
}

export default function Parent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(id || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorById, setFactorById] = useState(() => {
    const items = readCachedFactors();
    return items
      ? new Map(items.map((factor) => [String(factor.id), factor]))
      : new Map();
  });

  useEffect(() => {
    document.documentElement.classList.add("parent-page");
    return () => {
      document.documentElement.classList.remove("parent-page", "has-parent-result");
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("has-parent-result", Boolean(data));
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v4/resources/factors", { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => {
        const list = Array.isArray(body) ? body : body?.factors || [];
        if (!list.length) return;
        writeCachedFactors(list);
        setFactorById(new Map(list.map((factor) => [String(factor.id), factor])));
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Failed to load uma.moe factor table", err);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDraft(id || "");
  }, [id]);

  useEffect(() => {
    if (!id) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    const cached = readCachedPractice(id);
    const controller = new AbortController();
    setError("");
    setData(cached);
    setLoading(true);

    fetch(`/api/v4/practice?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Lookup failed (${res.status})`);
        }
        return body;
      })
      .then((body) => {
        setData(body);
        writeCachedPractice(id, body);
        const inheritance = pickInheritance(body);
        if (!inheritance && !body.error) {
          setError("Lookup finished but no inheritance data was returned. The Practice ID may have expired.");
        } else {
          setError("");
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (!cached) {
          setError(err.message || "Failed to look up practice partner");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  function onSubmit(event) {
    event.preventDefault();
    const next = draft.replace(/\D/g, "");
    if (!next) return;
    navigate(`/parent/${next}`);
  }

  return (
    <div className={`Parent-Container${data ? " has-result" : ""}`}>
      <h1>Look up practice partner</h1>
      <p className="Parent-lead">
        Fetch inheritance data from a Practice ID or Trainer ID.
      </p>

      <form className="Parent-form" onSubmit={onSubmit}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={12}
          placeholder="Practice ID (9 digits) or Trainer ID (12 digits)"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          aria-label="Practice partner ID"
        />
        <button type="submit" disabled={loading || !draft}>
          Fetch
        </button>
      </form>
      <p className="Parent-hint">
        <strong>Practice ID:</strong> 9-digit code from the in-game share button · expires after 24h
        {" · "}
        <strong>Trainer ID:</strong> permanent 12-digit account ID
      </p>

      {loading ? (
        <p className="Parent-status">{data ? `Updating ${id}…` : `Looking up ${id}…`}</p>
      ) : null}
      {error ? <p className="Parent-status error">{error}</p> : null}
      {data ? <PartnerCard payload={data} factorById={factorById} /> : null}
    </div>
  );
}
