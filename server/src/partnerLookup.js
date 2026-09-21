const UMA_MOE_ORIGIN = "https://uma.moe";
// Single uma.moe jobs often take 15–35s. Keep this under ~60s Worker wall
// clock; we never stack two full lookups in one request anymore.
const PARTNER_LOOKUP_TIMEOUT_MS = 45000;
export const ID_KIND_PARENT = "parent";
export const ID_KIND_PARTNER = "partner";

export { UMA_MOE_ORIGIN, PARTNER_LOOKUP_TIMEOUT_MS };

export function inferIdKind(id) {
  const digits = String(id || "").replace(/\D/g, "");
  // Legacy /parent/:id links used length to tell the two apart.
  return digits.length === 9 ? ID_KIND_PARTNER : ID_KIND_PARENT;
}

export function parsePracticeLookup(id, type) {
  const partnerId = String(id ?? "").trim();
  if (!/^\d+$/.test(partnerId)) {
    return { error: "Enter a Trainer ID or Partner ID" };
  }

  const kind =
    type === "trainer" || type === ID_KIND_PARENT
      ? ID_KIND_PARENT
      : type === ID_KIND_PARTNER
        ? ID_KIND_PARTNER
        : inferIdKind(partnerId);

  if (kind === ID_KIND_PARTNER) {
    if (!/^\d{9}$/.test(partnerId)) {
      return { error: "Enter a 9-digit Partner ID" };
    }
    return { partnerId, kind };
  }

  // Trainer IDs are not always 12 digits.
  if (partnerId.length > 16) {
    return { error: "Enter a Trainer ID" };
  }
  return { partnerId, kind };
}

export function practiceCacheTtlSeconds(kind) {
  // Parent/trainer IDs can change when they train a new uma.
  // Partner shares are short-lived, but a few minutes of Cache API / browser
  // reuse is fine — forcing refresh=1 on every view was the main self-inflicted
  // latency. Wrong-parent cases clear+retry instead of relying on long TTLs.
  return kind === ID_KIND_PARENT ? 600 : 120;
}

export function umaHeaders(apiKey, extra = {}) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    ...extra,
  };
  // Partner-share lookups must stay anonymous when possible. uma.moe sets
  // will_persist = user_id.is_some(), and X-API-Key always resolves to a user,
  // so authenticated streams return partner_inheritance (often an older parent
  // on the same trainer) instead of the raw practice-share snapshot.
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

export function umaAnonHeaders(browserProof, extra = {}) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    Origin: "https://uma.moe",
    Referer: "https://uma.moe/",
    ...extra,
  };
  if (browserProof) {
    headers["X-Browser-Proof"] = browserProof;
  }
  return headers;
}

function hasTaskId(taskId) {
  return taskId != null && String(taskId).trim() !== "" && Number(taskId) > 0;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function looksLikeInheritance(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    value.main_parent_id != null ||
    value.main_blue_factors != null ||
    value.main_pink_factors != null ||
    value.main_green_factors != null ||
    value.parent_rarity != null ||
    value.card_id != null ||
    Array.isArray(value.main_white_factors) ||
    Array.isArray(value.blue_sparks) ||
    Array.isArray(value.pink_sparks) ||
    Array.isArray(value.green_sparks) ||
    Array.isArray(value.white_sparks)
  );
}

function trainerNameFrom(payload, inheritance) {
  return (
    payload?.trainer_name ??
    payload?.trainer?.name ??
    payload?.trainer?.trainer_name ??
    inheritance?.trainer_name ??
    null
  );
}

function foundFrom(inheritance, trainerName) {
  return {
    inheritance,
    trainer_name: trainerName ?? inheritance?.trainer_name ?? null,
  };
}

export function extractFound(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractFound(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload !== "object") return null;

  if (looksLikeInheritance(payload.inheritance)) {
    return foundFrom(
      payload.inheritance,
      trainerNameFrom(payload, payload.inheritance)
    );
  }
  if (looksLikeInheritance(payload.result?.inheritance)) {
    return foundFrom(
      payload.result.inheritance,
      trainerNameFrom(payload.result, payload.result.inheritance) ??
        trainerNameFrom(payload, payload.result.inheritance)
    );
  }
  if (looksLikeInheritance(payload.stream?.inheritance)) {
    return foundFrom(
      payload.stream.inheritance,
      trainerNameFrom(payload.stream, payload.stream.inheritance) ??
        trainerNameFrom(payload, payload.stream.inheritance)
    );
  }
  if (looksLikeInheritance(payload.data?.inheritance)) {
    return foundFrom(
      payload.data.inheritance,
      trainerNameFrom(payload.data, payload.data.inheritance) ??
        trainerNameFrom(payload, payload.data.inheritance)
    );
  }
  if (looksLikeInheritance(payload.result)) {
    return foundFrom(payload.result, trainerNameFrom(payload.result) ?? trainerNameFrom(payload));
  }
  if (looksLikeInheritance(payload)) {
    return foundFrom(payload, trainerNameFrom(payload));
  }

  for (const nested of [payload.data, payload.payload, payload.partner, payload.saved]) {
    const found = extractFound(nested);
    if (found) return found;
  }
  return null;
}

export function savedList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.partners)) return payload.partners;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function nonEmptyIds(values) {
  return values
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
}

function shareIds(row) {
  if (!row || typeof row !== "object") return [];
  return nonEmptyIds([row.partner_id, row.practice_id, row.share_id]);
}

function accountIds(row) {
  if (!row || typeof row !== "object") return [];
  return nonEmptyIds([row.account_id, row.trainer_id]);
}

function rowRecency(row) {
  return (
    Date.parse(row?.last_updated || row?.updated_at || row?.created_at || "") ||
    Number(row?.inheritance_id || row?.id || 0) ||
    0
  );
}

function pickNewestRow(rows) {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => rowRecency(b) - rowRecency(a))[0];
}

export function pickSavedPartner(payload, partnerId, taskId = null, options = {}) {
  const list = savedList(payload);
  if (!list.length) return null;
  const requestedId = partnerId != null && partnerId !== "" ? String(partnerId) : null;
  const requestedTaskId = taskId != null && taskId !== "" ? String(taskId) : null;
  // Partner/practice share IDs must match the share code itself. Matching by
  // account_id or bare task_id can return a different uma from the same trainer.
  const requireShareId =
    options.requireShareId === true || options.kind === ID_KIND_PARTNER;

  if (requestedId) {
    const byShare = list.filter((row) => shareIds(row).includes(requestedId));
    if (byShare.length) return pickNewestRow(byShare);
  }
  if (requireShareId) return null;

  if (requestedTaskId) {
    const byTask = list.filter((row) => String(row.task_id ?? "") === requestedTaskId);
    if (byTask.length) return pickNewestRow(byTask);
  }
  if (requestedId) {
    const byAccount = list.filter((row) => accountIds(row).includes(requestedId));
    if (byAccount.length) return pickNewestRow(byAccount);
  }
  return null;
}

function citesPartnerShare(payload, partnerId) {
  if (!payload || typeof payload !== "object" || partnerId == null || partnerId === "") {
    return false;
  }
  const want = String(partnerId);
  const buckets = [
    payload,
    payload.result,
    payload.inheritance,
    payload.result?.inheritance,
    payload.data,
    payload.stream,
  ];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    if (shareIds(bucket).includes(want)) return true;
  }
  return false;
}

/** Default: treat partner_inheritance older than 5 minutes as a recycled save. */
export const STALE_INHERITANCE_MS = 5 * 60 * 1000;

/**
 * uma.moe API-key streams return partner_inheritance rows. A row whose
 * updated_at is old is usually a prior trainer save (e.g. Ryan) rather than
 * the share just scraped. Fresh upserts bump updated_at to now. Raw task
 * result fallbacks often omit timestamps — those are the live scrape.
 */
export function isStalePersistedInheritance(
  inheritance,
  nowMs = Date.now(),
  maxAgeMs = STALE_INHERITANCE_MS
) {
  if (!inheritance || typeof inheritance !== "object") return false;
  const ts = Date.parse(
    inheritance.updated_at ||
      inheritance.last_updated ||
      inheritance.created_at ||
      ""
  );
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return nowMs - ts > maxAgeMs;
}

function inheritanceFromAttempt(value) {
  return (
    value?.found?.inheritance ||
    value?.streamBody?.inheritance ||
    value?.streamBody?.result?.inheritance ||
    value?.startBody?.result?.inheritance ||
    null
  );
}

function acceptFoundForKind(found, sourcePayload, partnerId, idKind) {
  if (!found) return null;
  // Partner share lookups must cite this Partner ID. Account-keyed uma.moe
  // payloads can otherwise return a different parent from the same trainer.
  if (idKind === ID_KIND_PARTNER && !citesPartnerShare(sourcePayload, partnerId)) {
    return null;
  }
  return found;
}

function parseJsonPayload(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }
  try {
    return JSON.parse(raw.replace(/\n/g, ""));
  } catch {
    // continue
  }
  const merged = {};
  let parsedAny = false;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      Object.assign(merged, JSON.parse(trimmed));
      parsedAny = true;
    } catch {
      // ignore unparsable fragments
    }
  }
  return parsedAny ? merged : { raw };
}

export function parseSseBlock(block) {
  let eventName = "message";
  const dataLines = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  const data = parseJsonPayload(dataLines.join("\n"));
  const status = String(data.status || eventName || "").toLowerCase();
  return { event: eventName, status, data };
}

export function consumeSseText(text) {
  let lastData = {};
  let found = null;
  let terminal = null;

  const consumeBlock = (block) => {
    if (!block.trim()) return;
    const parsed = parseSseBlock(block);
    lastData = { ...lastData, ...parsed.data };
    found = extractFound(parsed.data) || extractFound(lastData) || found;
    const status = parsed.status;
    if (status === "failed" || parsed.event === "failed") {
      terminal = {
        ok: false,
        status: 502,
        body: { error: parsed.data.error || "Lookup failed", ...parsed.data },
      };
    } else if (status === "timeout" || parsed.event === "timeout") {
      terminal = {
        ok: false,
        status: 504,
        body: { error: "Lookup timed out", ...parsed.data },
      };
    } else if (status === "completed" || parsed.event === "completed") {
      terminal = { ok: true, status: 200, body: lastData };
    }
  };

  const parts = String(text || "").split(/\r?\n\r?\n/);
  const leftover = parts.pop() ?? "";
  for (const block of parts) consumeBlock(block);
  consumeBlock(leftover);
  return { lastData, found, terminal };
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function isAbortError(err) {
  return err?.name === "TimeoutError" || err?.name === "AbortError";
}

function mergeAbortSignals(signals) {
  const live = signals.filter(Boolean);
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(live);
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of live) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}


async function fetchTrainerProfile(apiKey, accountId, deps) {
  const {
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = PARTNER_LOOKUP_TIMEOUT_MS,
    origin = UMA_MOE_ORIGIN,
  } = deps;
  const res = await fetchImpl(
    `${origin}/api/v4/user/profile/${encodeURIComponent(accountId)}`,
    {
      headers: umaHeaders(apiKey),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
  const body = await readJsonSafe(res);
  return { ok: res.ok, status: res.status, body };
}

export async function lookupPracticePartner(apiKey, partnerId, deps = {}) {
  const {
    fetch: fetchImpl = globalThis.fetch,
    sleep: sleepImpl = sleep,
    timeoutMs = PARTNER_LOOKUP_TIMEOUT_MS,
    origin = UMA_MOE_ORIGIN,
    savedAttempts = 12,
    taskAttempts = 3,
    retryDelayMs = 250,
    kind,
    browserProof = null,
  } = deps;

  const idKind =
    kind === ID_KIND_PARENT || kind === ID_KIND_PARTNER
      ? kind
      : inferIdKind(partnerId);

  // Partner IDs must not authenticate as a uma.moe user. API keys force
  // will_persist=true and the SSE payload becomes partner_inheritance for the
  // trainer account (e.g. Mejiro Ryan) instead of the practice share (Agnes).
  const useAnonPartner =
    idKind === ID_KIND_PARTNER && Boolean(browserProof);
  const authKey = useAnonPartner ? null : apiKey;
  const headers = (extra) =>
    useAnonPartner
      ? umaAnonHeaders(browserProof, extra)
      : umaHeaders(authKey, extra);

  if (idKind === ID_KIND_PARENT) {
    try {
      const profile = await fetchTrainerProfile(apiKey, partnerId, deps);
      const found = extractFound(profile.body);
      if (profile.ok && found) {
        return {
          ok: true,
          status: 200,
          body: {
            trainer_name: found.trainer_name,
            result: {
              inheritance: found.inheritance,
              trainer_name: found.trainer_name,
              account_id: partnerId,
            },
            inheritance: found.inheritance,
            profile: profile.body,
          },
          found,
        };
      }
    } catch (err) {
      if (!isAbortError(err)) throw err;
      // Timed out talking to the profile API; fall through to partner lookup.
    }
  }

  async function umaGetJson(path, headerOverride) {
    const res = await fetchImpl(`${origin}${path}`, {
      headers: headerOverride || headers(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await readJsonSafe(res);
    return { ok: res.ok, status: res.status, body };
  }

  async function deleteSavedByAccount(accountId) {
    if (!apiKey || !accountId) return false;
    try {
      const res = await fetchImpl(
        `${origin}/api/v4/partner/saved/${encodeURIComponent(accountId)}`,
        {
          method: "DELETE",
          headers: umaHeaders(apiKey),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async function fetchSavedPartnerOnce(taskId = null) {
    // /saved requires an authenticated uma.moe user (API key). Skip when anonymous.
    if (!authKey) return null;
    const saved = await umaGetJson("/api/v4/partner/saved");
    if (!saved.ok) return null;
    const row = pickSavedPartner(saved.body, partnerId, taskId, {
      kind: idKind,
    });
    return extractFound(row);
  }

  async function fetchSavedPartner(taskId = null, options = {}) {
    for (let attempt = 0; attempt < savedAttempts; attempt++) {
      if (options.stop?.()) return null;
      if (attempt > 0 && retryDelayMs) await sleepImpl(retryDelayMs);
      if (options.stop?.()) return null;
      const found = await fetchSavedPartnerOnce(taskId);
      if (found) return found;
    }
    return null;
  }

  async function fetchTaskResult(taskId) {
    const paths = [
      `/api/v4/partner/lookup/${encodeURIComponent(taskId)}`,
      `/api/v4/partner/lookup/${encodeURIComponent(taskId)}/result`,
    ];
    for (let attempt = 0; attempt < taskAttempts; attempt++) {
      if (attempt > 0 && retryDelayMs) await sleepImpl(retryDelayMs);
      for (const path of paths) {
        const res = await umaGetJson(path);
        if (!res.ok) continue;
        const found = extractFound(res.body);
        if (found) return found;
      }
    }
    return null;
  }

  async function waitForPartnerStream(taskId, streamSignal) {
    let streamRes;
    try {
      streamRes = await fetchImpl(
        `${origin}/api/v4/partner/lookup/${encodeURIComponent(taskId)}/stream`,
        {
          headers: useAnonPartner
            ? umaAnonHeaders(browserProof, { Accept: "text/event-stream" })
            : {
                "X-API-Key": apiKey,
                Accept: "text/event-stream",
              },
          signal: mergeAbortSignals([
            AbortSignal.timeout(timeoutMs),
            streamSignal,
          ]),
        }
      );
    } catch (err) {
      if (isAbortError(err)) {
        return { ok: false, status: 504, body: { error: "Lookup timed out" } };
      }
      throw err;
    }

    if (!streamRes.ok || !streamRes.body) {
      const body = await readJsonSafe(streamRes);
      return {
        ok: false,
        status: streamRes.status || 502,
        body: body.error ? body : { error: "Lookup stream failed", ...body },
      };
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastData = {};
    let found = null;
    let terminal = null;

    const consumeBlock = (block) => {
      if (!block.trim()) return;
      const parsed = parseSseBlock(block);
      lastData = { ...lastData, ...parsed.data };
      found = extractFound(parsed.data) || extractFound(lastData) || found;
      const status = parsed.status;
      if (status === "failed" || parsed.event === "failed") {
        terminal = {
          ok: false,
          status: 502,
          body: { error: parsed.data.error || "Lookup failed", ...parsed.data },
        };
      } else if (status === "timeout" || parsed.event === "timeout") {
        terminal = {
          ok: false,
          status: 504,
          body: { error: "Lookup timed out", ...parsed.data },
        };
      } else if (status === "completed" || parsed.event === "completed") {
        terminal = { ok: true, status: 200, body: lastData };
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";
        for (const block of parts) consumeBlock(block);
        // Stop as soon as uma.moe reports a terminal status. Waiting on an
        // open stream after `completed` can stall until the 45s abort.
        if (terminal) break;
      }
      buffer += decoder.decode();
      consumeBlock(buffer);
    } catch (err) {
      if (!isAbortError(err)) throw err;
      if (!terminal && found) {
        return { ok: true, status: 200, body: lastData, found };
      }
      if (terminal?.ok) {
        return { ok: true, status: 200, body: lastData, found };
      }
      return {
        ok: false,
        status: 504,
        body: { error: "Lookup timed out", ...lastData },
      };
    } finally {
      try {
        await reader.cancel();
      } catch {
        // stream already closed
      }
    }

    if (terminal?.ok) {
      return { ok: true, status: 200, body: lastData, found };
    }
    if (terminal) return terminal;
    if (found) return { ok: true, status: 200, body: lastData, found };
    return {
      ok: false,
      status: 504,
      body: { error: "Lookup stream ended without a result", ...lastData },
    };
  }

  async function postLookup() {
    return fetchImpl(`${origin}/api/v4/partner/lookup`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      // Anonymous browser posts require_persistence:false. With an API key
      // uma.moe still sets will_persist=true (user_id present); the flag only
      // errors when persistence is required without a session.
      // Unique label on Partner IDs avoids attach-to-stuck active tasks
      // (uma.moe dedupes on task_data while status is pending/processing).
      body: JSON.stringify({
        partner_id: partnerId,
        label:
          idKind === ID_KIND_PARTNER
            ? `uc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
            : null,
        require_persistence: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  async function runLookupAttempt({ allowPersistedStream }) {
    const startRes = await postLookup();
    let startBody = await readJsonSafe(startRes);
    if (!startRes.ok) {
      if (startBody.error === "invalid_api_key") {
        return {
          ok: false,
          status: startRes.status,
          body: {
            ...startBody,
            error:
              "uma.moe rejected the API key. Set `key` in server/.env or server/.dev.vars (see .env.example).",
          },
        };
      }
      if (startBody.error === "browser_proof_required") {
        return {
          ok: false,
          status: startRes.status,
          body: {
            ...startBody,
            error:
              "Partner ID lookups need an anonymous uma.moe browser proof (API keys always return a saved trainer parent). Open uma.moe, copy a request's X-Browser-Proof header, and retry with ?browser_proof=...",
          },
        };
      }
      return { ok: false, status: startRes.status, body: startBody };
    }

    const persisted = Boolean(startBody.will_persist);
    let found = acceptFoundForKind(
      extractFound(startBody),
      startBody,
      partnerId,
      idKind
    );
    let streamBody = null;
    let rejectedPersistedParent = false;

    if (hasTaskId(startBody.task_id) && !found) {
      const taskId = startBody.task_id;
      const streamAbort = new AbortController();
      let stopSaved = false;

      const savedPromise = fetchSavedPartner(taskId, {
        stop: () => stopSaved,
      });
      const streamPromise = waitForPartnerStream(
        taskId,
        streamAbort.signal
      ).catch((err) => {
        if (isAbortError(err) || err?.name === "AbortError") {
          return {
            ok: false,
            status: 504,
            body: { error: "Lookup timed out" },
          };
        }
        throw err;
      });

      const winner = await Promise.race([
        savedPromise.then((hit) =>
          hit ? { kind: "saved", hit } : { kind: "saved-empty" }
        ),
        streamPromise.then((streamed) => ({ kind: "stream", streamed })),
      ]);

      if (winner.kind === "saved") {
        found = winner.hit;
        stopSaved = true;
        streamAbort.abort();
      } else {
        const streamed =
          winner.kind === "stream" ? winner.streamed : await streamPromise;
        streamBody = streamed.body;
        stopSaved = true;
        streamAbort.abort();

        // Stream timed out / failed — return immediately. Waiting on
        // fetchTaskResult / saved polls after a stream abort is what pushed
        // live 504s out to ~56s. If saved had a share match it would have
        // won the race already.
        if (!streamed.ok) {
          return streamed;
        }

        const [taskHit, savedHit] = await Promise.all([
          fetchTaskResult(taskId),
          savedPromise,
        ]);
        // Prefer share-matched saved. Trust the stream when allowed (including
        // fresh API-key partner_inheritance). Reject stale account parents when
        // allowPersistedStream is false.
        const streamFound =
          streamed.found || extractFound(streamed.body) || taskHit;
        const streamOk =
          streamFound &&
          (allowPersistedStream ||
            !persisted ||
            idKind !== ID_KIND_PARTNER ||
            citesPartnerShare(streamed.body, partnerId) ||
            citesPartnerShare(
              { inheritance: streamFound.inheritance },
              partnerId
            ));
        if (streamFound && !streamOk) {
          rejectedPersistedParent = true;
        }
        found = savedHit || (streamOk ? streamFound : null) || found;
        if (!found) {
          found = await fetchSavedPartner(taskId);
        }
      }
    }

    if (!found) {
      found = await fetchSavedPartnerOnce(startBody.task_id);
    }

    return {
      ok: Boolean(found),
      status: found ? 200 : 502,
      startBody,
      streamBody,
      found,
      persisted,
      rejectedPersistedParent,
    };
  }

  // Trust the first stream. API-key Partner lookups used to always DELETE the
  // trainer's saved rows and run a second full lookup (~2× latency / timeouts).
  // Only clear+retry when the returned partner_inheritance is stale.
  let attempt = await runLookupAttempt({
    allowPersistedStream: true,
  });

  function accountIdFromAttempt(value) {
    return (
      value?.found?.inheritance?.account_id ||
      value?.streamBody?.inheritance?.account_id ||
      value?.streamBody?.result?.inheritance?.account_id ||
      value?.startBody?.result?.inheritance?.account_id ||
      null
    );
  }

  if (idKind === ID_KIND_PARTNER && !useAnonPartner && attempt.persisted) {
    const accountId = accountIdFromAttempt(attempt);
    const inheritance = inheritanceFromAttempt(attempt);
    const citesShare =
      citesPartnerShare(attempt.streamBody, partnerId) ||
      citesPartnerShare(attempt.startBody, partnerId) ||
      citesPartnerShare(
        { inheritance, ...(attempt.found || {}) },
        partnerId
      );
    // Stale account-level partner_inheritance (e.g. Ryan vs Agnes) must be
    // cleared so the next lookup scrapes the live share. Do NOT run a second
    // full uma.moe job in this request — that doubles latency and 504s under
    // the Worker wall clock. The client retries once after this response.
    const staleAccountParent =
      Boolean(attempt.found) &&
      !citesShare &&
      isStalePersistedInheritance(inheritance);
    if (accountId && staleAccountParent) {
      const cleared = await deleteSavedByAccount(String(accountId));
      if (cleared) {
        return {
          ok: false,
          status: 503,
          body: {
            error: "Refreshing saved partner data. Retrying…",
            cleared_saved_account_id: String(accountId),
            retry: true,
          },
        };
      }
    }
  }

  if (
    idKind === ID_KIND_PARTNER &&
    !useAnonPartner &&
    !browserProof &&
    attempt.rejectedPersistedParent &&
    !attempt.found &&
    attempt.status === 502
  ) {
    // Persisted API-key path failed after clear/retry — explain why.
    return {
      ok: false,
      status: 502,
      body: {
        error:
          "Partner ID lookup returned a saved trainer parent (API keys always persist on uma.moe). Retry after clearing uma.moe saved partners, or pass an X-Browser-Proof from an anonymous uma.moe session.",
        ...(attempt.startBody || {}),
        result: { inheritance: null, trainer_name: null },
        stream: attempt.streamBody,
      },
    };
  }

  if (!attempt.found) {
    if (attempt.ok === false && attempt.body && !attempt.startBody) {
      return attempt;
    }
    return {
      ok: false,
      status: attempt.status || 502,
      body: {
        error:
          idKind === ID_KIND_PARENT
            ? "Trainer ID was not found. Check the ID and try again."
            : "Lookup finished but no inheritance data was returned. The Partner ID may have expired.",
        ...(attempt.startBody || attempt.body || {}),
        result: {
          inheritance: null,
          trainer_name: null,
        },
        stream: attempt.streamBody,
      },
    };
  }

  const startBody = attempt.startBody || {};
  const found = attempt.found;
  return {
    ok: true,
    status: 200,
    body: {
      ...startBody,
      trainer_name: found.trainer_name,
      result: {
        ...(startBody.result && typeof startBody.result === "object"
          ? startBody.result
          : {}),
        inheritance: found.inheritance,
        trainer_name: found.trainer_name,
      },
      inheritance: found.inheritance,
      stream: attempt.streamBody,
      lookup_mode: useAnonPartner
        ? "anonymous_share"
        : startBody.will_persist
          ? "api_key_persisted"
          : "api_key",
    },
  };
}
