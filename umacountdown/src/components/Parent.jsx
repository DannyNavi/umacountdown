import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
const HIDE_RACE_SPARKS_KEY = "uma-parent-hide-race-sparks";
const ID_KIND_KEY = "uma-parent-id-kind";
const ID_KIND_PARENT = "parent";
const ID_KIND_PARTNER = "partner";

function readHideRaceSparksPreference() {
  try {
    return localStorage.getItem(HIDE_RACE_SPARKS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHideRaceSparksPreference(value) {
  try {
    localStorage.setItem(HIDE_RACE_SPARKS_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

function inferIdKind(id) {
  const digits = String(id || "").replace(/\D/g, "");
  return digits.length === 9 ? ID_KIND_PARTNER : ID_KIND_PARENT;
}

function readStoredIdKind() {
  try {
    const value = localStorage.getItem(ID_KIND_KEY);
    if (value === ID_KIND_PARENT || value === ID_KIND_PARTNER) return value;
  } catch {
    // ignore quota / private mode
  }
  return null;
}

function writeStoredIdKind(kind) {
  try {
    localStorage.setItem(ID_KIND_KEY, kind);
  } catch {
    // ignore quota / private mode
  }
}

function normalizeIdKind(value, fallbackId) {
  if (value === "trainer" || value === ID_KIND_PARENT) return ID_KIND_PARENT;
  if (value === ID_KIND_PARTNER) return ID_KIND_PARTNER;
  if (fallbackId) return inferIdKind(fallbackId);
  return readStoredIdKind() || ID_KIND_PARENT;
}

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

function collectSparks(groups, factorById, matchedIds, hideRaceSparks = false) {
  return groups.flatMap(({ values, tone }) =>
    asList(values)
      .map((value) => {
        const parsed = parseSpark(value, factorById);
        if (!parsed) return null;
        const nextTone = tone || "white";
        if (
          hideRaceSparks &&
          nextTone === "white" &&
          isRaceSparkFactor(parsed.factorId, factorById)
        ) {
          return null;
        }
        return {
          ...parsed,
          tone: nextTone,
          matched: nextTone === "white" && matchedIds?.has(parsed.factorId),
        };
      })
      .filter(Boolean)
  );
}

function whiteFactorIds(values) {
  const ids = new Set();
  for (const value of asList(values)) {
    const parsed = parseSpark(value);
    if (parsed?.factorId) ids.add(parsed.factorId);
  }
  return ids;
}

function matchingWhiteIds(inheritance) {
  const sources = [
    whiteFactorIds(inheritance.main_white_factors ?? inheritance.white_sparks),
    whiteFactorIds(inheritance.left_white_factors),
    whiteFactorIds(inheritance.right_white_factors),
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

function InspirationGrid({
  groups,
  factorById,
  columns = 2,
  matchedIds,
  hideRaceSparks = false,
}) {
  const chips = collectSparks(groups, factorById, matchedIds, hideRaceSparks);
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

function PartnerCard({ payload, factorById, hideRaceSparks }) {
  const inheritance = pickInheritance(payload);
  if (!inheritance) return null;

  const trainerName = pickTrainerName(payload, inheritance);
  const cardId = inheritance.main_parent_id ?? inheritance.card_id;
  const charaName =
    inheritance.chara_name ||
    inheritance.character_name ||
    inheritance.name ||
    charaNameFromId(cardId) ||
    (cardId != null ? `Card ${cardId}` : trainerName || "Practice partner");
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
  const matchedIds = matchingWhiteIds(inheritance);

  return (
    <article className="Parent-details">
      <div className="Parent-details-bar">Practice Partner</div>

      <div className="Parent-profile">
        <CharaPortrait cardId={cardId} name={charaName} variant="circle" />
        <div className="Parent-profile-info">
          {trainerName ? <p className="Parent-trainer">{trainerName}</p> : null}
          <h2 className="Parent-chara-name">{charaName}</h2>
        </div>
      </div>

      <section className="Parent-block" aria-label="Sparks">
        <InspirationGrid
          groups={sparkGroups("main", inheritance)}
          factorById={factorById}
          columns={2}
          matchedIds={matchedIds}
          hideRaceSparks={hideRaceSparks}
        />
      </section>

      {(hasLeft || hasRight) && (
        <div className="Parent-lineage">
          {hasLeft && (
            <section className="Parent-block" aria-label={`P1 ${leftName}`}>
              <h3 className="Parent-block-title">
                <CharaPortrait cardId={inheritance.parent_left_id} name={leftName} variant="circle" />
                <span>P1 {leftName}</span>
              </h3>
              <InspirationGrid
                groups={sparkGroups("left", inheritance)}
                factorById={factorById}
                columns={2}
                matchedIds={matchedIds}
                hideRaceSparks={hideRaceSparks}
              />
            </section>
          )}
          {hasRight && (
            <section className="Parent-block" aria-label={`P2 ${rightName}`}>
              <h3 className="Parent-block-title">
                <CharaPortrait cardId={inheritance.parent_right_id} name={rightName} variant="circle" />
                <span>P2 {rightName}</span>
              </h3>
              <InspirationGrid
                groups={sparkGroups("right", inheritance)}
                factorById={factorById}
                columns={2}
                matchedIds={matchedIds}
                hideRaceSparks={hideRaceSparks}
              />
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
  const [searchParams] = useSearchParams();
  const idKind = normalizeIdKind(searchParams.get("type"), id);
  const [draft, setDraft] = useState(id || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hideRaceSparks, setHideRaceSparks] = useState(readHideRaceSparksPreference);
  const [factorById, setFactorById] = useState(() => {
    const items = readCachedFactors();
    return items
      ? new Map(items.map((factor) => [String(factor.id), factor]))
      : new Map();
  });

  function onHideRaceSparksChange(event) {
    const next = event.target.checked;
    setHideRaceSparks(next);
    writeHideRaceSparksPreference(next);
  }

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

    fetch(
      `/api/v4/practice?id=${encodeURIComponent(id)}&type=${encodeURIComponent(idKind)}`,
      {
        signal: controller.signal,
      }
    )
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
          setError(
            idKind === ID_KIND_PARENT
              ? "This trainer has no inheritance data on uma.moe yet."
              : "Lookup finished but no inheritance data was returned. The Partner ID may have expired."
          );
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
  }, [id, idKind]);

  function setIdKind(next) {
    writeStoredIdKind(next);
    if (id) {
      navigate(`/parent/${id}?type=${next}`, { replace: true });
      return;
    }
    navigate(`/parent?type=${next}`, { replace: true });
  }

  function onSubmit(event) {
    event.preventDefault();
    const next = draft.replace(/\D/g, "");
    if (!next) return;
    writeStoredIdKind(idKind);
    navigate(`/parent/${next}?type=${idKind}`);
  }

  const isParentId = idKind === ID_KIND_PARENT;

  return (
    <div className={`Parent-Container${data ? " has-result" : ""}`}>

      <form className="Parent-form" onSubmit={onSubmit}>
        <div className="Parent-id-flip" role="group" aria-label="ID type">
          <button
            type="button"
            aria-pressed={isParentId}
            onClick={() => setIdKind(ID_KIND_PARENT)}
          >
            Trainer ID
          </button>
          <button
            type="button"
            aria-pressed={!isParentId}
            onClick={() => setIdKind(ID_KIND_PARTNER)}
          >
            Partner ID
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          maxLength={isParentId ? 16 : 9}
          placeholder={isParentId ? "Trainer ID" : "Partner ID"}
          value={draft}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            setDraft(isParentId ? digits.slice(0, 16) : digits.slice(0, 9));
          }}
          aria-label={isParentId ? "Trainer ID" : "Partner ID"}
        />
        <button
          type="submit"
          className="Parent-form-submit"
          disabled={loading || !draft || (!isParentId && draft.length !== 9)}
        >
          Fetch
        </button>
      </form>

      <label className="Parent-option">
        <input
          type="checkbox"
          checked={hideRaceSparks}
          onChange={onHideRaceSparksChange}
        />
        Hide race sparks
      </label>

      {loading ? (
        <p className="Parent-status">{data ? `Updating ${id}…` : `Looking up ${id}…`}</p>
      ) : null}
      {error ? <p className="Parent-status error">{error}</p> : null}
      {data ? (
        <PartnerCard
          payload={data}
          factorById={factorById}
          hideRaceSparks={hideRaceSparks}
        />
      ) : null}
    </div>
  );
}
