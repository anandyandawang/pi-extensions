import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { Type } from "typebox";
import * as bm from "beautiful-mermaid";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const ANSI_RE = /\x1b\[[0-9;]*m/g;

/**
 * Artist Extension
 * 
 * Uses beautiful-mermaid to turn Mermaid diagrams into ASCII art.
 */
export default function (pi: ExtensionAPI) {
  // Lightweight pointer: tell the agent visual planning exists, don't load full methodology.
  pi.on("before_agent_start", async (event, _ctx) => {
    return {
      systemPrompt: event.systemPrompt + "\nFor non-trivial changes, use the /visual-planning command to start a visual planning session.",
    };
  });

  // When invoked, load the co-located SKILL.md and inject it as a steer message.
  pi.registerCommand("visual-planning", {
    description: "Start a visual planning session",
    handler: async (_args, ctx) => {
      const skillPath = path.resolve(fileURLToPath(import.meta.url), "../skills/visual-planning/SKILL.md");
      const raw = await readFile(skillPath, "utf-8");
      // Strip YAML frontmatter
      const body = raw.replace(/^---[\s\S]*?---\n/, "");
      await pi.sendUserMessage(
        `I am starting a visual planning session. Here are the guidelines:\n\n${body}`,
        { deliverAs: "steer" }
      );
      ctx.ui.notify("Visual planning mode engaged! 🎨", "info");
    },
  });

  pi.registerTool({
    name: "draw_visual_plan",
    label: "Draw Visual Plan",
    description: "Generate a visual diagram using Mermaid syntax. The extension will convert this Mermaid code into high-quality Unicode/ASCII art for the TUI. Use flowcharts, sequence diagrams, or class diagrams. Keep it simple and Grug-friendly.",
    parameters: Type.Object({
      mermaid_code: Type.String({ description: "The Mermaid.js syntax for the diagram" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { mermaid_code } = params;

      return {
        content: [
          { type: "text", text: "Grug render visual plan! 🎨" },
        ],
        details: { mermaid_code },
      };
    },
    renderResult(result, _options, theme, _context) {
      const details = result.details as { mermaid_code: string } | undefined;
      if (!details?.mermaid_code) {
        return null;
      }

      return {
        render(width: number): string[] {
          try {
            const padding = width > 120 ? 5 : width > 80 ? 3 : 1;
            const asciiArt = bm.renderMermaidASCII(details.mermaid_code, {
              paddingX: padding,
              paddingY: padding,
              useAscii: false,
            });

            // beautiful-mermaid output is plain text but strip any stray
            // ANSI codes defensively -- they reset bg color mid-line and
            // would break the steer-message background. Then right-pad
            // each line to `width` cells so the steer bg fills the full
            // row (pi paints bg per visible char, not to row edge).
            const lines = asciiArt.split("\n").map((raw) => raw.replace(ANSI_RE, ""));
            return lines.map((line) => {
              const truncated = truncateToWidth(line, width);
              const pad = Math.max(0, width - visibleWidth(truncated));
              return truncated + " ".repeat(pad);
            });
          } catch (error: any) {
            return [`Failed to render diagram: ${error.message}`];
          }
        },
        invalidate() {},
      };
    },
  });


}
