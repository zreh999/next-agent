import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// HTTP-only integration check for an already running application. This script
// intentionally does not launch a browser, worker, build, or application server.
const base = new URL(process.env.API_BASE_URL ?? "http://127.0.0.1:3000");
const origin = base.origin;
let assertionCount = 0;
let passedAssertionCount = 0;
let groupCount = 0;
let currentGroup = "startup";
let ownerCookie = "";

function check(condition, message) {
  assertionCount++;
  assert.ok(Boolean(condition), message);
  passedAssertionCount++;
}

function equal(actual, expected, message) {
  assertionCount++;
  assert.deepEqual(actual, expected, message);
  passedAssertionCount++;
}

async function group(name, operation) {
  currentGroup = name;
  const start = assertionCount;
  await operation();
  groupCount++;
  console.log(`PASS ${name} (${assertionCount - start} assertions)`);
}

async function request(path, { method = "GET", body, owner = false, requestOrigin } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") headers.origin = requestOrigin ?? origin;
  if (owner && ownerCookie) headers.cookie = ownerCookie;
  return fetch(new URL(path, base), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
}

async function jsonResponse(response, status, label) {
  equal(response.status, status, `${label}: expected HTTP ${status}, received ${response.status}`);
  check(response.headers.get("content-type")?.includes("application/json"), `${label}: JSON response`);
  return response.json();
}

function allObjectKeys(value) {
  if (Array.isArray(value)) return value.flatMap(allObjectKeys);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [key, ...allObjectKeys(nested)]);
}

async function main() {
  check(["http:", "https:"].includes(base.protocol), "API_BASE_URL must use HTTP or HTTPS");
  check(!base.username && !base.password, "API_BASE_URL must not embed credentials");
  console.log("HTTP integration smoke — no browser or build is launched.");

  let questionnaire;
  let catalog;
  await group("versioned content and official Chinese names", async () => {
    const health = await jsonResponse(await request("/api/health"), 200, "health");
    equal(health.ok, true, "health: service is ready");
    equal(health.version, "0.2.0", "health: application release");

    questionnaire = await jsonResponse(await request("/api/questionnaire"), 200, "questionnaire");
    equal(questionnaire.version, "2.0.0", "questionnaire: content version");
    equal(questionnaire.questions.length, 16, "questionnaire: 16 scenarios");
    equal(questionnaire.questions.flatMap(question => question.options).length, 64, "questionnaire: 64 options");
    equal(questionnaire.dimensions.length, 5, "questionnaire: five dimensions");

    catalog = await jsonResponse(await request("/api/agents"), 200, "catalog");
    equal(catalog.version, "2.0.0", "catalog: content version");
    equal(catalog.agents.length, 30, "catalog: complete dated roster");
    equal(new Set(catalog.agents.map(agent => agent.id)).size, 30, "catalog: no duplicate agents");
    equal(catalog.agents.find(agent => agent.id === "hush")?.name, "遐思", "Hush: official Chinese name");
    equal(catalog.agents.find(agent => agent.id === "miks")?.name, "迷核", "Miks: official Chinese name");
    equal(catalog.agents.find(agent => agent.id === "veto")?.name, "禁灭", "Veto: official Chinese name");
    check(catalog.agents.every(agent => typeof agent.name === "string" && agent.name.trim()), "catalog: every agent has a display name");
  });

  const input = {
    questionnaireVersion: questionnaire.version,
    answers: questionnaire.questions.map((question, index) => ({
      questionId: question.id,
      optionId: question.options[index % question.options.length].id,
    })),
    preferences: {
      experience: "some",
      practice: "dedicated",
      communication: "active",
      excludedAgentIds: [],
    },
  };
  const selectedOptionLabels = input.answers.map(answer => questionnaire.questions
    .find(question => question.id === answer.questionId).options.find(option => option.id === answer.optionId).label);
  let created;
  await group("create assessment and keep its owner cookie private", async () => {
    const response = await request("/api/assessments", { method: "POST", body: input });
    created = await jsonResponse(response, 201, "create assessment");
    const cookieHeaders = response.headers.getSetCookie();
    const ownerHeader = cookieHeaders.find(cookie => cookie.startsWith("next_agent_owner="));
    // Cookie values are only held in memory and never included in test output.
    check(typeof ownerHeader === "string", "create: owner cookie exists");
    ownerCookie = ownerHeader.split(";", 1)[0];
    check(/^next_agent_owner=[a-f0-9]{64}$/.test(ownerCookie), "create: valid owner token shape");
    check(/;\s*HttpOnly(?:;|$)/i.test(ownerHeader), "create: cookie is HttpOnly");
    check(/;\s*SameSite=Lax(?:;|$)/i.test(ownerHeader), "create: cookie is same-site Lax");
    check(/;\s*Path=\/(?:;|$)/i.test(ownerHeader), "create: cookie has root path");
    if (base.protocol === "https:") check(/;\s*Secure(?:;|$)/i.test(ownerHeader), "create: HTTPS owner cookie is secure");
    check(typeof created.id === "string" && created.id.length > 10, "create: result identifier exists");
    equal(created.report.result.recommendations.length, 3, "create: three candidates for unrestricted preferences");
    equal(new Set(created.report.result.recommendations.map(candidate => candidate.agentId)).size, 3, "create: distinct candidates");
    equal(created.report.result.coverageCount, 30, "create: covers the full roster");
    equal(created.report.result.versions.questionnaire, "2.0.0", "create: saves questionnaire version");
    equal(created.report.result.versions.agents, "2.0.0", "create: saves agent catalog version");
    check(created.report.result.recommendations.every(candidate => catalog.agents.some(agent => agent.id === candidate.agentId)), "create: only catalog agents are returned");
  });

  const privatePath = `/api/assessments/${encodeURIComponent(created.id)}`;
  await group("visitor isolation and owner-only query", async () => {
    await jsonResponse(await request(privatePath), 404, "visitor private query");
    const response = await request(privatePath, { owner: true });
    const privateReport = await jsonResponse(response, 200, "owner private query");
    equal(privateReport.id, created.id, "owner: receives the correct report");
    equal(privateReport.input, input, "owner: original input is preserved");
    equal(privateReport.report, created.report, "owner: result snapshot is preserved");
    check(response.headers.get("cache-control")?.includes("no-store"), "owner: private response cannot be cached");
    check(!Object.hasOwn(privateReport, "ownerHash"), "owner: storage credential hash is not exposed");
  });

  const privateNote = `SMOKE_ONLY_PRIVATE_NOTE_${randomUUID()}`;
  const feedbackInput = {
    agentId: created.report.result.recommendations[0].agentId,
    round: 1,
    enjoyment: 4,
    burden: 2,
    wantsContinue: true,
    notes: privateNote,
  };
  await group("owner feedback saves and persists", async () => {
    await jsonResponse(await request(`${privatePath}/feedback`, { method: "POST", body: feedbackInput }), 404, "visitor feedback write");
    const saved = await jsonResponse(await request(`${privatePath}/feedback`, { method: "POST", body: feedbackInput, owner: true }), 201, "owner feedback write");
    equal(saved.feedback.agentId, feedbackInput.agentId, "feedback: candidate agent");
    equal(saved.feedback.round, 1, "feedback: round number");
    equal(saved.feedback.enjoyment, 4, "feedback: enjoyment");
    equal(saved.feedback.burden, 2, "feedback: burden");
    check(saved.feedback.notes === privateNote, "feedback: private synthetic note is saved");
    const restored = await jsonResponse(await request(privatePath, { owner: true }), 200, "feedback persisted query");
    check(restored.feedback.some(record => record.id === saved.feedback.id && record.notes === privateNote), "feedback: saved record survives an independent request");
  });

  let share;
  await group("explicit public share removes answer evidence and private notes", async () => {
    await jsonResponse(await request(`${privatePath}/shares`, { method: "POST" }), 404, "visitor share creation");
    share = await jsonResponse(await request(`${privatePath}/shares`, { method: "POST", owner: true }), 201, "owner share creation");
    check(typeof share.id === "string" && share.id !== created.id, "share: separate public identifier");
    equal(share.path, `/s/${share.id}`, "share: public page path");
    const response = await request(`/api/shares/${encodeURIComponent(share.id)}`);
    const summary = await jsonResponse(response, 200, "visitor public summary");
    const serialized = JSON.stringify(summary);
    const keys = allObjectKeys(summary);
    for (const field of ["input", "answers", "ownerHash", "assessmentId", "feedback", "notes", "questionId", "optionId"]) {
      check(!keys.includes(field), `share: excludes private field ${field}`);
    }
    check(!serialized.includes(created.id), "share: excludes private assessment identifier");
    check(!serialized.includes(privateNote), "share: excludes private feedback text");
    for (const label of selectedOptionLabels) check(!serialized.includes(label), "share: excludes a selected option's full text");
    for (const answer of input.answers) check(!serialized.includes(JSON.stringify(answer.questionId)), "share: excludes raw answer question identifiers");
    for (const candidate of summary.report.result.recommendations) {
      for (const reason of candidate.reasons) equal(reason.questionIds, [], "share: explanation has no answer provenance");
    }
    equal(summary.report.result.profile, created.report.result.profile, "share: preserves the profile");
    equal(summary.report.result.versions, created.report.result.versions, "share: preserves content versions");
    equal(summary.report.result.recommendations.map(candidate => candidate.agentId), created.report.result.recommendations.map(candidate => candidate.agentId), "share: preserves candidate order");
    check(response.headers.get("cache-control")?.includes("no-store"), "share: public response respects revocation without caching");
  });

  await group("foreign origins rejected and owner can revoke sharing", async () => {
    await jsonResponse(await request("/api/assessments", { method: "POST", body: input, owner: true, requestOrigin: "https://cross-origin.invalid" }), 403, "foreign origin assessment write");
    const sharePath = `/api/shares/${encodeURIComponent(share.id)}`;
    await jsonResponse(await request(sharePath, { method: "DELETE" }), 404, "visitor share revocation");
    const revoked = await jsonResponse(await request(sharePath, { method: "DELETE", owner: true }), 200, "owner share revocation");
    equal(revoked.ok, true, "revoke: confirmed");
    await jsonResponse(await request(sharePath), 404, "revoked public query");
    const stillPrivate = await jsonResponse(await request(privatePath, { owner: true }), 200, "private report after revocation");
    equal(stillPrivate.report, created.report, "revoke: private report remains unchanged");
    check(stillPrivate.feedback.some(record => record.notes === privateNote), "revoke: private feedback remains available");
  });

  await group("invalid answers and old questionnaire versions return 400", async () => {
    const variants = [
      ["duplicate answer", { ...input, answers: [...input.answers, input.answers[0]] }],
      ["missing answer", { ...input, answers: input.answers.slice(1) }],
      ["unknown question", { ...input, answers: input.answers.map((answer, index) => index === 0 ? { ...answer, questionId: "smoke-unknown-question" } : answer) }],
      ["unknown option", { ...input, answers: input.answers.map((answer, index) => index === 0 ? { ...answer, optionId: "smoke-unknown-option" } : answer) }],
      ["old questionnaire version", { ...input, questionnaireVersion: "1.0.0" }],
    ];
    for (const [label, body] of variants) {
      const error = await jsonResponse(await request("/api/assessments", { method: "POST", body, owner: true }), 400, label);
      check(typeof error.error === "string" && error.error.length > 0, `${label}: actionable error message`);
    }
  });

  console.log(`PASS HTTP integration smoke: ${groupCount} groups, ${passedAssertionCount} assertions. Browser checks were not run.`);
}

main().catch(error => {
  // Do not print response headers, cookies, tokens, or private response bodies.
  const message = error instanceof Error ? error.message.split("\n", 1)[0] : "Unexpected smoke-test error";
  console.error(`FAIL ${currentGroup}: ${message}`);
  console.error(`${groupCount} groups completed; ${passedAssertionCount}/${assertionCount} attempted assertions passed. Browser checks were not run.`);
  process.exitCode = 1;
});
