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

function stars(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return "";
  return "★".repeat(Math.min(5, Math.max(1, Math.round(n))));
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

function CharaPortrait({ cardId, name }) {
  const src = charaStandUrl(cardId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return null;
  return (
    <img
      className="Parent-portrait"
      src={src}
      alt={name ? `${name} portrait` : ""}
      width={48}
      height={48}
      onError={() => setFailed(true)}
    />
  );
}

function decodeSpark(value, factorById = new Map()) {
  if (value == null) return null;
  if (typeof value === "object") {
    const name =
      value.name ||
      value.factor_name ||
      value.label ||
      factorById.get(String(value.id ?? value.factor_id))?.text ||
      charaNameFromId(value.id ?? value.factor_id) ||
      value.id ||
      value.factor_id;
    const star = value.star ?? value.stars ?? value.level;
    if (name != null && star != null) return `${stars(star)} ${name}`.trim();
    if (name != null) return String(name);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const raw = String(value);
  if (!/^\d+$/.test(raw) || raw.length < 2) return raw;
  const level = Number(raw.slice(-1));
  const factorId = raw.slice(0, -1);
  const starText = stars(level);
  const factorName =
    factorById.get(factorId)?.text || STAT_FACTORS[Number(factorId)];
  if (factorName) return `${starText} ${factorName}`.trim();
  const charaName = charaNameFromId(factorId);
  if (charaName) return `${starText} ${charaName}`.trim();
  return starText ? `${starText} ${factorId}` : raw;
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
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

function SparkChips({ groups, factorById }) {
  const chips = groups.flatMap(({ values, tone }) =>
    asList(values)
      .map((value) => decodeSpark(value, factorById))
      .filter(Boolean)
      .map((text) => ({ text, tone: tone || "" }))
  );
  if (!chips.length) return null;
  return (
    <div className="Parent-chips">
      {chips.map((chip, index) => (
        <span className={`Parent-chip ${chip.tone}`} key={`${chip.text}-${index}`}>
          {chip.text}
        </span>
      ))}
    </div>
  );
}

function FactorRow({ title, values, tone, factorById }) {
  if (!asList(values).length) return null;
  return (
    <div className="Parent-section" aria-label={title}>
      <h3 className="Parent-spark-label">{title}</h3>
      <SparkChips groups={[{ values, tone }]} factorById={factorById} />
    </div>
  );
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

  const leftName = charaNameFromId(inheritance.parent_left_id) || inheritance.parent_left_id;
  const rightName = charaNameFromId(inheritance.parent_right_id) || inheritance.parent_right_id;
  const hasLeft =
    inheritance.parent_left_id ||
    inheritance.left_blue_factors ||
    inheritance.left_white_factors;
  const hasRight =
    inheritance.parent_right_id ||
    inheritance.right_blue_factors ||
    inheritance.right_white_factors;

  return (
    <article className="Parent-card">
      <div className="Parent-card-header">
        <div className="Parent-name">
          <CharaPortrait cardId={cardId} name={charaName} />
          <h2>{charaName}</h2>
        </div>
        {trainerName ? <span className="Parent-meta">{trainerName}</span> : null}
        {rarity ? <span className="Parent-stars">{stars(rarity)}</span> : null}
      </div>

      <div className="Parent-main-sparks">
        <FactorRow title="Blue" values={inheritance.main_blue_factors ?? inheritance.blue_sparks} tone="blue" factorById={factorById} />
        <FactorRow title="Pink" values={inheritance.main_pink_factors ?? inheritance.pink_sparks} tone="pink" factorById={factorById} />
        <FactorRow title="Green" values={inheritance.main_green_factors ?? inheritance.green_sparks} tone="green" factorById={factorById} />
        <FactorRow title="White" values={inheritance.main_white_factors ?? inheritance.white_sparks} tone="white" factorById={factorById} />
      </div>

      {(hasLeft || hasRight) && (
        <div className="Parent-grandparents">
          {hasLeft && (
            <div className="Parent-section">
              <h3 className="Parent-parent-heading">
                <CharaPortrait cardId={inheritance.parent_left_id} name={leftName} />
                <span>P1 {inheritance.parent_left_id ? `(${leftName})` : ""}</span>
              </h3>
              <SparkChips
                groups={[
                  { values: inheritance.left_blue_factors, tone: "blue" },
                  { values: inheritance.left_pink_factors, tone: "pink" },
                  { values: inheritance.left_green_factors, tone: "green" },
                  { values: inheritance.left_white_factors, tone: "white" },
                ]}
                factorById={factorById}
              />
            </div>
          )}

          {hasRight && (
            <div className="Parent-section">
              <h3 className="Parent-parent-heading">
                <CharaPortrait cardId={inheritance.parent_right_id} name={rightName} />
                <span>P2 {inheritance.parent_right_id ? `(${rightName})` : ""}</span>
              </h3>
              <SparkChips
                groups={[
                  { values: inheritance.right_blue_factors, tone: "blue" },
                  { values: inheritance.right_pink_factors, tone: "pink" },
                  { values: inheritance.right_green_factors, tone: "green" },
                  { values: inheritance.right_white_factors, tone: "white" },
                ]}
                factorById={factorById}
              />
            </div>
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
  const [factorById, setFactorById] = useState(() => new Map());

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
        setFactorById(
          new Map(list.map((factor) => [String(factor.id), factor]))
        );
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

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);

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
        const inheritance = pickInheritance(body);
        if (!inheritance && !body.error) {
          setError("Lookup finished but no inheritance data was returned. The Practice ID may have expired.");
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to look up practice partner");
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

      {loading ? <p className="Parent-status">Looking up {id}…</p> : null}
      {error ? <p className="Parent-status error">{error}</p> : null}
      {data ? <PartnerCard payload={data} factorById={factorById} /> : null}
    </div>
  );
}
