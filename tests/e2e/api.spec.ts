import { expect, test, type APIRequestContext } from "@playwright/test";
import type {
  AgentCatalog,
  AssessmentInput,
  FeedbackRecord,
  Questionnaire,
  ReportSnapshot,
} from "../../src/lib/domain";

interface CreatedAssessment {
  id: string;
  report: ReportSnapshot;
}

interface PrivateAssessment extends CreatedAssessment {
  input: AssessmentInput;
  feedback: FeedbackRecord[];
  shares: { id: string; createdAt: string; revokedAt: string | null }[];
}

async function loadContent(request: APIRequestContext) {
  const questionnaireResponse = await request.get("/api/questionnaire");
  expect(questionnaireResponse.status()).toBe(200);
  const questionnaire: Questionnaire = await questionnaireResponse.json();
  expect(questionnaire.version).toBeTruthy();
  expect(questionnaire.dimensions).toHaveLength(5);
  expect(questionnaire.questions.length).toBeGreaterThan(0);
  for (const question of questionnaire.questions) {
    expect(question.options.length).toBeGreaterThan(1);
  }

  const catalogResponse = await request.get("/api/agents");
  expect(catalogResponse.status()).toBe(200);
  const catalog: AgentCatalog = await catalogResponse.json();
  expect(catalog.version).toBeTruthy();
  expect(catalog.agents.length).toBeGreaterThanOrEqual(3);

  return { questionnaire, catalog };
}

function completeInput(questionnaire: Questionnaire): AssessmentInput {
  return {
    questionnaireVersion: questionnaire.version,
    answers: questionnaire.questions.map((question, index) => ({
      questionId: question.id,
      optionId: question.options[index % question.options.length].id,
    })),
    preferences: {
      experience: "some",
      practice: "balanced",
      communication: "flexible",
      excludedAgentIds: [],
    },
  };
}

function objectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(objectKeys);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [key, ...objectKeys(nested)]);
}

function expectPublicSummary(
  value: { report: ReportSnapshot },
  assessmentId: string,
  selectedOptionLabels: string[],
) {
  const keys = objectKeys(value);
  for (const privateField of ["input", "answers", "ownerHash", "assessmentId", "feedback"]) {
    expect(keys, `Public response must not include ${privateField}`).not.toContain(privateField);
  }
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain(assessmentId);
  for (const label of selectedOptionLabels) {
    expect(serialized, "Public explanations must not reveal selected option text").not.toContain(label);
  }
  for (const recommendation of value.report.result.recommendations) {
    for (const reason of recommendation.reasons) {
      expect(reason.questionIds).toEqual([]);
    }
  }
}

test("HTTP flow preserves owner-only reports, feedback and revocable public summaries", async ({
  request,
  playwright,
  baseURL,
}) => {
  const { questionnaire, catalog } = await loadContent(request);
  const input = completeInput(questionnaire);
  const selectedOptionLabels = input.answers.map((answer) => {
    const question = questionnaire.questions.find((entry) => entry.id === answer.questionId)!;
    return question.options.find((option) => option.id === answer.optionId)!.label;
  });

  const createResponse = await request.post("/api/assessments", {
    data: input,
    headers: { Origin: baseURL! },
  });
  expect(createResponse.status()).toBe(201);
  const created: CreatedAssessment = await createResponse.json();
  expect(created.id).toBeTruthy();
  expect(created.report.result.recommendations).toHaveLength(3);
  expect(created.report.result.versions.questionnaire).toBe(questionnaire.version);
  expect(created.report.result.versions.agents).toBe(catalog.version);

  const ownerState = await request.storageState();
  expect(
    ownerState.cookies.some(
      (cookie) => cookie.name === "next_agent_owner" && cookie.httpOnly && cookie.sameSite === "Lax",
    ),
  ).toBe(true);

  const reportPath = `/api/assessments/${created.id}`;
  const privateResponse = await request.get(reportPath);
  expect(privateResponse.status()).toBe(200);
  expect(privateResponse.headers()["cache-control"]).toContain("no-store");
  const privateReport: PrivateAssessment = await privateResponse.json();
  expect(privateReport.input).toEqual(input);
  expect(privateReport.report).toEqual(created.report);
  expect(privateReport.feedback).toEqual([]);

  const visitor = await playwright.request.newContext({ baseURL });
  try {
    const visitorPrivateResponse = await visitor.get(reportPath);
    expect(visitorPrivateResponse.status()).toBe(404);

    const unauthorizedShare = await visitor.post(`${reportPath}/shares`);
    expect(unauthorizedShare.status()).toBe(404);

    const shareResponse = await request.post(`${reportPath}/shares`);
    expect(shareResponse.status()).toBe(201);
    const share: { id: string; path: string } = await shareResponse.json();
    expect(share.id).toBeTruthy();
    expect(share.path).toBe(`/s/${share.id}`);
    expect(share.id).not.toBe(created.id);

    const shareApiPath = `/api/shares/${share.id}`;
    const publicResponse = await visitor.get(shareApiPath);
    expect(publicResponse.status()).toBe(200);
    expect(publicResponse.headers()["cache-control"]).toContain("no-store");
    const publicSummary: { report: ReportSnapshot } = await publicResponse.json();
    expect(Object.keys(publicSummary)).toEqual(["report"]);
    expect(publicSummary.report.result.profile).toEqual(created.report.result.profile);
    expect(publicSummary.report.result.versions).toEqual(created.report.result.versions);
    expect(publicSummary.report.result.recommendations.map(({ agentId, kind, fitScore }) => ({ agentId, kind, fitScore })))
      .toEqual(created.report.result.recommendations.map(({ agentId, kind, fitScore }) => ({ agentId, kind, fitScore })));
    expectPublicSummary(publicSummary, created.id, selectedOptionLabels);

    const visitorDelete = await visitor.delete(shareApiPath);
    expect(visitorDelete.status()).toBe(404);
    expect((await visitor.get(shareApiPath)).status()).toBe(200);

    const feedbackInput = {
      agentId: created.report.result.recommendations[0].agentId,
      round: 1,
      enjoyment: 4,
      burden: 2,
      wantsContinue: true,
      notes: "E2E 示例：喜欢这个职责，愿意再试一局。",
    };
    const unauthorizedFeedback = await visitor.post(`${reportPath}/feedback`, { data: feedbackInput });
    expect(unauthorizedFeedback.status()).toBe(404);

    const feedbackResponse = await request.post(`${reportPath}/feedback`, { data: feedbackInput });
    expect(feedbackResponse.status()).toBe(201);
    const savedFeedback: { feedback: FeedbackRecord } = await feedbackResponse.json();
    expect(savedFeedback.feedback).toMatchObject(feedbackInput);

    const refreshedResponse = await request.get(reportPath);
    expect(refreshedResponse.status()).toBe(200);
    const refreshed: PrivateAssessment = await refreshedResponse.json();
    expect(refreshed.feedback).toContainEqual(expect.objectContaining(feedbackInput));
    expect(refreshed.report).toEqual(created.report);
    expect(refreshed.shares).toContainEqual(
      expect.objectContaining({ id: share.id, revokedAt: null }),
    );

    const publicAfterFeedbackResponse = await visitor.get(shareApiPath);
    expect(publicAfterFeedbackResponse.status()).toBe(200);
    const publicAfterFeedback = await publicAfterFeedbackResponse.json();
    expectPublicSummary(publicAfterFeedback, created.id, selectedOptionLabels);
    expect(JSON.stringify(publicAfterFeedback)).not.toContain(feedbackInput.notes);
    expect(publicAfterFeedback.report).toEqual(publicSummary.report);

    const revokeResponse = await request.delete(shareApiPath);
    expect(revokeResponse.status()).toBe(200);
    expect(await revokeResponse.json()).toEqual({ ok: true });
    expect((await visitor.get(shareApiPath)).status()).toBe(404);

    const afterRevocationResponse = await request.get(reportPath);
    expect(afterRevocationResponse.status()).toBe(200);
    const afterRevocation: PrivateAssessment = await afterRevocationResponse.json();
    const revokedShare = afterRevocation.shares.find((entry) => entry.id === share.id);
    expect(revokedShare?.revokedAt).toEqual(expect.any(String));
    expect(afterRevocation.feedback).toContainEqual(expect.objectContaining(feedbackInput));
  } finally {
    await visitor.dispose();
  }
});

const invalidAnswerCases = ["duplicate", "missing", "unknown question", "unknown option"] as const;

for (const invalidCase of invalidAnswerCases) {
  test(`HTTP validation rejects ${invalidCase} answers`, async ({ request }) => {
    const { questionnaire } = await loadContent(request);
    const input = completeInput(questionnaire);

    switch (invalidCase) {
      case "duplicate":
        input.answers.push({ ...input.answers[0] });
        break;
      case "missing":
        input.answers = input.answers.slice(1);
        break;
      case "unknown question":
        input.answers[0] = { ...input.answers[0], questionId: "unknown-question-for-e2e" };
        break;
      case "unknown option":
        input.answers[0] = { ...input.answers[0], optionId: "unknown-option-for-e2e" };
        break;
    }

    const response = await request.post("/api/assessments", { data: input });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });

    const state = await request.storageState();
    expect(state.cookies.some((cookie) => cookie.name === "next_agent_owner")).toBe(false);
  });
}

test("HTTP write guard rejects a different browser origin", async ({ request }) => {
  const { questionnaire } = await loadContent(request);
  const response = await request.post("/api/assessments", {
    data: completeInput(questionnaire),
    headers: { Origin: "https://different-origin.example" },
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: expect.any(String) });
});
