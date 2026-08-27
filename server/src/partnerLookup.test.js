import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consumeSseText,
  extractFound,
  lookupPracticePartner,
  parseSseBlock,
  pickSavedPartner,
} from "./partnerLookup.js";

const SAMPLE_INHERITANCE = {
  main_parent_id: 100401,
  parent_rarity: 5,
  main_blue_factors: 3,
  trainer_name: "Asriel",
  account_id: "123456789012",
};

test("extractFound ignores a pending POST result with null inheritance", () => {
  assert.equal(
    extractFound({
      task_id: 213858719,
      status: "pending",
      will_persist: true,
      result: { inheritance: null, trainer_name: null },
    }),
    null
  );
});

test("extractFound uses stream inheritance even when POST result is null", () => {
  const found = extractFound({
    task_id: 213858719,
    status: "pending",
    result: { inheritance: null, trainer_name: null },
    stream: { status: "completed", inheritance: SAMPLE_INHERITANCE },
  });
  assert.equal(found.inheritance.main_parent_id, 100401);
  assert.equal(found.trainer_name, "Asriel");
});

test("extractFound treats saved partner rows as inheritance", () => {
  const found = extractFound({
    account_id: "163368214",
    main_parent_id: 100401,
    blue_sparks: ["stamina_3"],
  });
  assert.equal(found.inheritance.main_parent_id, 100401);
});

test("extractFound reads uma.moe immediate-complete POST payloads", () => {
  const found = extractFound({
    task_id: null,
    status: "completed",
    will_persist: false,
    result: {
      account_id: "711269443937",
      trainer_name: "DannyN",
      follower_num: null,
      last_updated: null,
      inheritance: {
        account_id: "711269443937",
        affinity_score: 0,
        blue_sparks: [201, 401, 302],
        blue_stars_sum: 4,
        green_sparks: [10200102, 10260202, 10040201],
        green_stars_sum: 5,
        label: null,
        left_blue_factors: 401,
        left_green_factors: 10260202,
        left_pink_factors: 3202,
        left_white_count: 8,
        left_white_factors: [1000601, 2000202],
        main_parent_id: 102001,
      },
    },
  });
  assert.equal(found.trainer_name, "DannyN");
  assert.deepEqual(found.inheritance.blue_sparks, [201, 401, 302]);
  assert.equal(found.inheritance.main_parent_id, 102001);
});

test("parseSseBlock merges split JSON data lines", () => {
  const parsed = parseSseBlock(
    [
      "event: completed",
      'data: {"status":"completed","task_id":213858719}',
      `data: ${JSON.stringify({ inheritance: SAMPLE_INHERITANCE })}`,
    ].join("\n")
  );
  assert.equal(parsed.event, "completed");
  assert.equal(parsed.data.inheritance.main_parent_id, 100401);
});

test("consumeSseText keeps inheritance from processing when completed is empty", () => {
  const sse = [
    "event: processing",
    `data: ${JSON.stringify({ status: "processing", inheritance: SAMPLE_INHERITANCE })}`,
    "",
    "event: completed",
    'data: {"status":"completed","task_id":213858719}',
    "",
  ].join("\n");
  const parsed = consumeSseText(sse);
  assert.equal(parsed.terminal.ok, true);
  assert.equal(parsed.found.inheritance.main_parent_id, 100401);
});

test("pickSavedPartner only returns a row that matches the requested id", () => {
  const saved = [
    { account_id: "111", main_parent_id: 1 },
    { account_id: "163368214", main_parent_id: 100401 },
  ];
  assert.equal(pickSavedPartner(saved, "163368214").main_parent_id, 100401);
  assert.equal(pickSavedPartner(saved, "999"), null);
  assert.equal(pickSavedPartner(saved, "x", 213858719), null);
  assert.equal(
    pickSavedPartner(
      [{ task_id: 213858719, main_parent_id: 9 }],
      "163368214",
      213858719
    ).main_parent_id,
    9
  );
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sseResponse(text) {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

test("lookup uses saved partner when completed SSE has no inheritance", async () => {
  const fetchImpl = async (url) => {
    const path = String(url).replace("https://uma.moe", "");
    if (path === "/api/v4/partner/lookup") {
      return jsonResponse({
        task_id: 213858719,
        status: "pending",
        will_persist: true,
        result: { inheritance: null, trainer_name: null },
      });
    }
    if (path === "/api/v4/partner/lookup/213858719/stream") {
      return sseResponse(
        'event: completed\ndata: {"status":"completed","task_id":213858719}\n\n'
      );
    }
    if (path === "/api/v4/partner/lookup/213858719" || path.endsWith("/result")) {
      return jsonResponse({ status: "completed", result: { inheritance: null } });
    }
    if (path === "/api/v4/partner/saved") {
      return jsonResponse([
        { ...SAMPLE_INHERITANCE, account_id: "163368214" },
      ]);
    }
    return jsonResponse({ error: `unhandled ${path}` }, 404);
  };

  const result = await lookupPracticePartner("uma_k_test", "163368214", {
    fetch: fetchImpl,
    retryDelayMs: 0,
    savedAttempts: 2,
    taskAttempts: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.result.inheritance.main_parent_id, 100401);
  assert.equal(result.body.inheritance.main_parent_id, 100401);
});

test("lookup does not keep the pending null result when the stream has data", async () => {
  const fetchImpl = async (url) => {
    const path = String(url).replace("https://uma.moe", "");
    if (path === "/api/v4/partner/lookup") {
      return jsonResponse({
        task_id: 7,
        status: "pending",
        result: { inheritance: null, trainer_name: null },
      });
    }
    if (path === "/api/v4/partner/lookup/7/stream") {
      return sseResponse(
        `event: completed\ndata: ${JSON.stringify({
          status: "completed",
          task_id: 7,
          inheritance: SAMPLE_INHERITANCE,
        })}\n\n`
      );
    }
    return jsonResponse({ error: `unhandled ${path}` }, 404);
  };

  const result = await lookupPracticePartner("uma_k_test", "163368214", {
    fetch: fetchImpl,
    retryDelayMs: 0,
    savedAttempts: 1,
    taskAttempts: 1,
  });
  assert.equal(result.ok, true);
  assert.equal(result.body.result.inheritance.trainer_name, "Asriel");
});

test("lookup returns 502 instead of an empty success when nothing is found", async () => {
  const fetchImpl = async (url) => {
    const path = String(url).replace("https://uma.moe", "");
    if (path === "/api/v4/partner/lookup") {
      return jsonResponse({
        task_id: 213858719,
        status: "pending",
        will_persist: true,
        result: { inheritance: null, trainer_name: null },
      });
    }
    if (path === "/api/v4/partner/lookup/213858719/stream") {
      return sseResponse(
        'event: completed\ndata: {"status":"completed","task_id":213858719}\n\n'
      );
    }
    if (path === "/api/v4/partner/saved") return jsonResponse([]);
    return jsonResponse({ result: { inheritance: null } });
  };

  const result = await lookupPracticePartner("uma_k_test", "163368214", {
    fetch: fetchImpl,
    retryDelayMs: 0,
    savedAttempts: 1,
    taskAttempts: 1,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.match(result.body.error, /Practice ID may have expired/);
  assert.equal(result.body.result.inheritance, null);
});

test("lookup returns inheritance from an immediate-complete POST and skips the stream", async () => {
  const calls = [];
  const payload = {
    task_id: null,
    status: "completed",
    will_persist: false,
    result: {
      account_id: "711269443937",
      trainer_name: "DannyN",
      follower_num: null,
      last_updated: null,
      inheritance: {
        account_id: "711269443937",
        blue_sparks: [201, 401, 302],
        green_sparks: [10200102, 10260202, 10040201],
        main_parent_id: 102001,
      },
    },
  };
  const fetchImpl = async (url) => {
    calls.push(String(url).replace("https://uma.moe", ""));
    return jsonResponse(payload);
  };

  const result = await lookupPracticePartner("uma_k_test", "966998386", {
    fetch: fetchImpl,
    retryDelayMs: 0,
    savedAttempts: 1,
    taskAttempts: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(calls, ["/api/v4/partner/lookup"]);
  assert.equal(result.body.trainer_name, "DannyN");
  assert.equal(result.body.result.account_id, "711269443937");
  assert.equal(result.body.result.inheritance.main_parent_id, 102001);
  assert.deepEqual(result.body.inheritance.blue_sparks, [201, 401, 302]);
});
