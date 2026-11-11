import mediaData from "../../content/agent-media.json";

export interface AgentQuote {
  /** A short, source-checked original line; Chinese below is this project's translation. */
  text: string;
  translation?: string;
  sourceUrl: string;
}

export interface AgentMedia {
  id: string;
  portraitUrl?: string;
  accent: string;
  sourceUrl: string;
  artworkCredit: string;
  quote?: AgentQuote;
}

const posterBackground = [9, 15, 22];
function luminance(channels: number[]) {
  const linear = channels.map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}

function readableAccent(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return "#a5e9d8";
  const original = [1, 3, 5].map(start => Number.parseInt(value.slice(start, start + 2), 16));
  const background = luminance(posterBackground);
  for (let step = 0; step <= 20; step++) {
    const channels = original.map(channel => Math.round(channel + (255 - channel) * step / 20));
    if ((luminance(channels) + .05) / (background + .05) >= 4.5) {
      return "#" + channels.map(channel => channel.toString(16).padStart(2, "0")).join("");
    }
  }
  return "#a5e9d8";
}

// Keep source colours intact in JSON; brighten very dark theme colours for poster text.
// Separate from saved reports so existing browser snapshots remain readable.
const mediaById = new Map<string, AgentMedia>(
  mediaData.agents.map((item): [string, AgentMedia] => [item.id, { ...item, accent: readableAccent(item.accent) }]),
);

export const agentMediaSource = {
  version: mediaData.version,
  reviewedAt: mediaData.reviewedAt,
  sourceUrl: mediaData.sourceUrl,
} as const;

export function getAgentMedia(id: string): AgentMedia | undefined {
  return mediaById.get(id);
}

