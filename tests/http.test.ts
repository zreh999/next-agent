import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  ensureOwner,
  errorResponse,
  guardWrite,
  HttpError,
  OWNER_COOKIE,
  ownerToken,
  readJson,
  setOwner,
} from "../src/lib/server/http";

const endpoint = "http://localhost:3100/api/assessments";
const encoder = new TextEncoder();
type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function writeRequest(origin?: string, host = "127.0.0.1:3100") {
  const headers = new Headers({ host });
  if (origin !== undefined) headers.set("origin", origin);
  return new NextRequest(endpoint, { method: "POST", headers });
}

function streamedRequest(bytes: Uint8Array, chunkSize = 4096) {
  let offset = 0;
  const cancelled = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
    cancel: cancelled,
  });
  const request = new NextRequest(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as NextRequestInit);
  return { request, cancelled };
}

function expectStatus(operation: () => unknown, status: number) {
  try {
    operation();
    throw new Error("Expected an HttpError.");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
  }
}

async function expectRejectedStatus(operation: Promise<unknown>, status: number) {
  await expect(operation).rejects.toBeInstanceOf(HttpError);
  await expect(operation).rejects.toMatchObject({ status });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ORIGIN", "");
  vi.stubEnv("TRUST_PROXY", "false");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("request JSON boundaries", () => {
  it("decodes UTF-8 characters split between stream chunks without Content-Length", async () => {
    const body = { message: "下一把玩谁🎮", answer: "先收集信息" };
    const { request } = streamedRequest(encoder.encode(JSON.stringify(body)), 1);
    expect(request.headers.has("content-length")).toBe(false);
    expect(await readJson(request)).toEqual(body);
    expect(request.body?.locked).toBe(false);
  });

  it("accepts exactly 32 KiB of JSON supplied in multiple chunks", async () => {
    const overhead = encoder.encode(JSON.stringify({ text: "" })).byteLength;
    const body = { text: "x".repeat(32_768 - overhead) };
    const bytes = encoder.encode(JSON.stringify(body));
    expect(bytes.byteLength).toBe(32_768);
    const { request } = streamedRequest(bytes, 997);
    expect(await readJson(request)).toEqual(body);
  });

  it("limits bytes rather than characters and cancels an oversized chunked body", async () => {
    const text = JSON.stringify({ text: "测".repeat(20_000) });
    expect(text.length).toBeLessThan(32_768);
    const { request, cancelled } = streamedRequest(encoder.encode(text), 2048);
    expect(request.headers.has("content-length")).toBe(false);
    await expectRejectedStatus(readJson(request), 413);
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(request.body?.locked).toBe(false);
  });

  it("returns a JSON input error for a missing body and malformed JSON", async () => {
    await expectRejectedStatus(readJson(new NextRequest(endpoint, { method: "POST" })), 400);
    const { request } = streamedRequest(encoder.encode('{"broken":'));
    await expectRejectedStatus(readJson(request), 400);
  });
});

describe("write origin checks", () => {
  it("accepts the browser's actual Host when Next canonicalizes its URL to localhost", () => {
    const request = writeRequest("http://127.0.0.1:3100");
    expect(request.nextUrl.host).toBe("localhost:3100");
    expect(request.headers.get("host")).toBe("127.0.0.1:3100");
    expect(() => guardWrite(request)).not.toThrow();
  });

  it("uses the request URL host when no Host header is supplied", () => {
    const request = new NextRequest(endpoint, { method: "POST", headers: { origin: "http://localhost:3100" } });
    expect(() => guardWrite(request)).not.toThrow();
  });

  it("rejects foreign, malformed, null, and non-HTTP origins with 403", () => {
    for (const origin of ["https://evil.example", "not-an-origin", "null", "ftp://127.0.0.1:3100"]) {
      expectStatus(() => guardWrite(writeRequest(origin)), 403);
    }
  });

  it("requires the configured APP_ORIGIN scheme as well as hostname", () => {
    vi.stubEnv("APP_ORIGIN", "https://next-agent.example");
    expect(() => guardWrite(writeRequest("https://next-agent.example", "next-agent.example"))).not.toThrow();
    expectStatus(() => guardWrite(writeRequest("http://next-agent.example", "next-agent.example")), 403);
    expectStatus(() => guardWrite(writeRequest("https://next-agent.example:444", "next-agent.example:444")), 403);
  });

  it("rejects invalid APP_ORIGIN configuration and does not trust forwarded hosts", () => {
    vi.stubEnv("APP_ORIGIN", "invalid-configuration");
    expectStatus(() => guardWrite(writeRequest("http://127.0.0.1:3100")), 403);
    vi.stubEnv("APP_ORIGIN", "");
    const request = writeRequest("https://evil.example");
    request.headers.set("x-forwarded-host", "evil.example");
    expectStatus(() => guardWrite(request), 403);
  });

  it("rejects an advertised oversized body before parsing", () => {
    const request = writeRequest("http://127.0.0.1:3100");
    request.headers.set("content-length", "32769");
    expectStatus(() => guardWrite(request), 413);
  });
});

describe("owner cookies and errors", () => {
  it("ignores malformed owner values and generates the required token format", () => {
    const request = new NextRequest(endpoint, { headers: { cookie: `${OWNER_COOKIE}=short-invalid-value` } });
    expect(ownerToken(request)).toBeUndefined();
    expect(ensureOwner(request)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets an HttpOnly, same-site, secure production owner cookie", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = NextResponse.json({ ok: true });
    setOwner(response, "0".repeat(64));
    const cookie = response.cookies.get(OWNER_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 2_592_000 });
  });

  it("preserves expected HTTP statuses while returning safe JSON for unexpected errors", async () => {
    const expected = errorResponse(new HttpError(403, "请从本站提交请求。"));
    expect(expected.status).toBe(403);
    expect(await expected.json()).toEqual({ error: "请从本站提交请求。" });

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unexpected = errorResponse(new Error("synthetic-internal-detail"));
    expect(unexpected.status).toBe(503);
    expect(JSON.stringify(await unexpected.json())).not.toContain("synthetic-internal-detail");
  });
});
