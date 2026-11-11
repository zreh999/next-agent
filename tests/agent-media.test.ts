import { describe, expect, it } from "vitest";
import media from "../content/agent-media.json" with { type: "json" };
import { catalog } from "../src/lib/content";
import { getAgentMedia } from "../src/lib/agent-media";

describe("attributed character artwork and short quotes", () => {
  it("covers every candidate with a unique portrait and the matching official profile", () => {
    expect(media.agents.map(item => item.id).sort()).toEqual(catalog.agents.map(agent => agent.id).sort());
    expect(new Set(media.agents.map(item => item.portraitUrl)).size).toBe(catalog.agents.length);
    for (const agent of catalog.agents) {
      const item = getAgentMedia(agent.id)!;
      const portrait = new URL(item.portraitUrl!);
      expect(portrait.protocol).toBe("https:");
      expect(portrait.hostname).toBe("media.valorant-api.com");
      expect(item.sourceUrl).toBe(agent.sourceUrl);
      expect(item.artworkCredit).toContain("Riot Games");
    }
  });

  it("gives each character an attributed short original quote and a separate Chinese interpretation", () => {
    const sources = new Set<string>();
    for (const agent of catalog.agents) {
      const quote = getAgentMedia(agent.id)?.quote;
      expect(quote, agent.id).toBeDefined();
      expect(quote!.text.trim().split(/\s+/).length, agent.id).toBeLessThanOrEqual(12);
      expect(quote!.text.trim().length, agent.id).toBeGreaterThan(0);
      expect(quote!.translation?.trim().length, agent.id).toBeGreaterThan(0);
      const source = new URL(quote!.sourceUrl);
      expect(source.protocol).toBe("https:");
      expect(source.hostname).toBe("wiki.playvalorant.com");
      expect(source.pathname).toMatch(/\/Quotes$/);
      sources.add(source.href);
    }
    expect(sources.size).toBe(catalog.agents.length);
    expect(getAgentMedia("unknown-agent")).toBeUndefined();
    expect(getAgentMedia("__proto__")).toBeUndefined();
  });

  it("keeps role theme lettering readable against the dark poster background", () => {
    const luminance = (channels: number[]) => channels
      .map(channel => channel / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
      .reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
    const background = luminance([9, 15, 22]);
    for (const agent of catalog.agents) {
      const colour = getAgentMedia(agent.id)!.accent;
      const channels = [1, 3, 5].map(start => Number.parseInt(colour.slice(start, start + 2), 16));
      expect((luminance(channels) + .05) / (background + .05), agent.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});
