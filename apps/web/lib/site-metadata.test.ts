import { describe, expect, it } from "vitest";
import { resolveSiteBaseUrl } from "@/lib/site-metadata";

describe("site metadata base URL", () => {
  it("uses a safe local default", () => {
    expect(resolveSiteBaseUrl().href).toBe("http://localhost:3000/");
    expect(resolveSiteBaseUrl("not-a-url").href).toBe("http://localhost:3000/");
    expect(resolveSiteBaseUrl("javascript:example").href).toBe("http://localhost:3000/");
  });

  it("preserves GitHub Pages base paths without duplicating them", () => {
    expect(resolveSiteBaseUrl("https://example.test", "/matchwork").href).toBe("https://example.test/matchwork/");
    expect(resolveSiteBaseUrl("https://example.test/matchwork/", "/matchwork").href).toBe("https://example.test/matchwork/");
    expect(resolveSiteBaseUrl("https://example.test/base?query=1#hash", "/matchwork/").href).toBe("https://example.test/base/matchwork/");
  });
});
