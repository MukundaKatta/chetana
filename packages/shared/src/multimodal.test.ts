import { describe, it, expect } from "vitest";
import {
  validateAttachment,
  modelSupportsModality,
  gateAttachments,
  type MultimodalAttachment,
} from "./multimodal";

describe("multimodal pipeline (#595/#593)", () => {
  const image: MultimodalAttachment = { type: "image", data: "abc123", mimeType: "image/png" };
  const audio: MultimodalAttachment = { type: "audio", data: "abc123", mimeType: "audio/wav" };

  it("validates allowed mime types", () => {
    expect(validateAttachment(image).valid).toBe(true);
    expect(validateAttachment({ ...image, mimeType: "image/tiff" }).valid).toBe(false);
  });

  it("validates audio attachments", () => {
    expect(validateAttachment(audio).valid).toBe(true);
  });

  it("gates modalities by provider capability", () => {
    expect(modelSupportsModality("deepseek", "image")).toBe(false);
    expect(modelSupportsModality("openai", "audio")).toBe(true);
  });

  it("splits attachments into kept and skipped by provider", () => {
    const { kept, skipped } = gateAttachments("deepseek", [image, audio]);
    expect(kept).toHaveLength(0);
    expect(skipped).toHaveLength(2);

    const openaiResult = gateAttachments("openai", [image, audio]);
    expect(openaiResult.kept).toHaveLength(2);
  });
});
