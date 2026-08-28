const UMA_MOE_ORIGIN = "https://uma.moe";
const PARTNER_LOOKUP_TIMEOUT_MS = 45000;

export { UMA_MOE_ORIGIN, PARTNER_LOOKUP_TIMEOUT_MS };

export function umaHeaders(apiKey, extra = {}) {
  return {
    "X-API-Key": apiKey,
    Accept: "application/json, text/plain, */*",
    ...extra,
  };
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
      payload.trainer_name ?? payload.inheritance.trainer_name
    );
  }
  if (looksLikeInheritance(payload.result?.inheritance)) {
    return foundFrom(
      payload.result.inheritance,
      payload.result.trainer_name ??
        payload.trainer_name ??
        payload.result.inheritance.trainer_name
    );
  }
  if (looksLikeInheritance(payload.stream?.inheritance)) {
    return foundFrom(
      payload.stream.inheritance,
      payload.stream.trainer_name ?? payload.trainer_name
    );
  }
  if (looksLikeInheritance(payload.data?.inheritance)) {
    return foundFrom(
      payload.data.inheritance,
      payload.data.trainer_name ?? payload.trainer_name
    );
  }
  if (looksLikeInheritance(payload.result)) {
    return foundFrom(payload.result, payload.result.trainer_name ?? payload.trainer_name);
  }
  if (looksLikeInheritance(payload)) {
    return foundFrom(payload, payload.trainer_name);
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

function rowIds(row) {
  if (!row || typeof row !== "object") return [];
  return [
    row.account_id,
    row.partner_id,
    row.trainer_id,
    row.practice_id,
    row.share_id,
    row.task_id,
  ]
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
}

export function pickSavedPartner(payload, partnerId, taskId = null) {
  const list = savedList(payload);
  if (!list.length) return null;
  const ids = new Set(
    [partnerId, taskId].filter((value) => value != null && value !== "").map(String)
  );
  // Only return a row for this Practice/Trainer ID (or this job's task_id).
  // Falling back to the newest saved partner shows some other trainer's uma.
  return list.find((row) => rowIds(row).some((id) => ids.has(id))) ?? null;
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


export async function lookupPracticePartner(apiKey, partnerId, deps = {}) {
  const {
    fetch: fetchImpl = globalThis.fetch,
    sleep: sleepImpl = sleep,
    timeoutMs = PARTNER_LOOKUP_TIMEOUT_MS,
    origin = UMA_MOE_ORIGIN,
    savedAttempts = 12,
    taskAttempts = 3,
    retryDelayMs = 250,
  } = deps;

  const headers = (extra) => umaHeaders(apiKey, extra);

  async function umaGetJson(path) {
    const res = await fetchImpl(`${origin}${path}`, {
      headers: headers(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await readJsonSafe(res);
    return { ok: res.ok, status: res.status, body };
  }

  async function fetchSavedPartnerOnce(taskId = null, options = {}) {
    const saved = await umaGetJson("/api/v4/partner/saved");
    if (!saved.ok) return null;
    const row = pickSavedPartner(saved.body, partnerId, taskId);
    return extractFound(row);
  }

  async function fetchSavedPartner(taskId = null, options = {}) {
    for (let attempt = 0; attempt < savedAttempts; attempt++) {
      if (options.stop?.()) return null;
      if (attempt > 0 && retryDelayMs) await sleepImpl(retryDelayMs);
      if (options.stop?.()) return null;
      const found = await fetchSavedPartnerOnce(taskId, options);
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
          headers: {
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
      body: JSON.stringify({ partner_id: partnerId, label: null }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

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
    return { ok: false, status: startRes.status, body: startBody };
  }

  let found = extractFound(startBody);
  let streamBody = null;

  if (hasTaskId(startBody.task_id) && !found) {
    const taskId = startBody.task_id;
    const streamAbort = new AbortController();
    let stopSaved = false;

    const savedPromise = fetchSavedPartner(taskId, {
      stop: () => stopSaved,
    });
    const streamPromise = waitForPartnerStream(taskId, streamAbort.signal).catch(
      (err) => {
        if (isAbortError(err) || err?.name === "AbortError") {
          return { ok: false, status: 504, body: { error: "Lookup timed out" } };
        }
        throw err;
      }
    );

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
      found = streamed.found || extractFound(streamed.body) || found;
      if (!found) {
        const [taskHit, savedHit] = await Promise.all([
          fetchTaskResult(taskId),
          savedPromise,
        ]);
        found = taskHit || savedHit;
      }
      if (!found) {
        found = await fetchSavedPartnerOnce(taskId);
      }
      if (!found && streamed.ok) {
        // 9-digit Practice IDs are queued. After the job finishes, uma.moe
        // often serves the same ID as an immediate-complete POST (as the
        // browser does), keyed by the trainer account rather than the share ID.
        const retryRes = await postLookup();
        const retryBody = await readJsonSafe(retryRes);
        const retryFound = extractFound(retryBody);
        if (retryFound) {
          found = retryFound;
          startBody = retryBody;
        }
      }
      stopSaved = true;
      streamAbort.abort();
      if (!found && !streamed.ok) return streamed;
    }
  }

  if (!found) {
    found = await fetchSavedPartnerOnce(startBody.task_id);
  }

  if (!found) {
    return {
      ok: false,
      status: 502,
      body: {
        error:
          "Lookup finished but no inheritance data was returned. The Practice ID may have expired.",
        ...startBody,
        result: {
          inheritance: null,
          trainer_name: null,
        },
        stream: streamBody,
      },
    };
  }

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
      stream: streamBody,
    },
  };
}
