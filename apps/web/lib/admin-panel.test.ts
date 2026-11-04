import { describe, expect, it } from "vitest";
import {
  adminTabParam, appendPage, formatRelativeDate, isStaleVerificationError, parseAdminTab, removeWithRestore, validateReason,
} from "@/lib/admin-panel";

describe("admin panel helpers", () => {
  it("syncs tabs with the query string and defaults to companies", () => {
    expect(parseAdminTab("?tab=usuarios")).toBe("users");
    expect(parseAdminTab("?tab=problemas&x=1")).toBe("problems");
    expect(parseAdminTab("?tab=ajustes")).toBe("settings");
    expect(parseAdminTab("")).toBe("companies");
    expect(parseAdminTab("?tab=<script>")).toBe("companies");
    expect(adminTabParam("settings")).toBe("ajustes");
  });

  it("requires a rejection reason of 5 to 200 characters after trimming", () => {
    expect(validateReason("   ab   ")).toMatch(/al menos 5/);
    expect(validateReason("hola!")).toBeNull();
    expect(validateReason("a".repeat(200))).toBeNull();
    expect(validateReason("a".repeat(201))).toMatch(/máximo 200/);
    expect(validateReason("á".repeat(200))).toBeNull();
  });

  it("formats relative dates in Spanish", () => {
    const now = new Date("2026-11-04T12:00:00Z");
    expect(formatRelativeDate("2026-11-04T11:59:40Z", now)).toBe("ahora");
    expect(formatRelativeDate("2026-11-04T11:30:00Z", now)).toBe("hace 30 min");
    expect(formatRelativeDate("2026-11-04T09:00:00Z", now)).toBe("hace 3 h");
    expect(formatRelativeDate("2026-11-03T08:00:00Z", now)).toBe("ayer");
    expect(formatRelativeDate("2026-10-30T12:00:00Z", now)).toBe("hace 5 días");
    expect(formatRelativeDate("2026-08-01T12:00:00Z", now)).toMatch(/2026/);
    expect(formatRelativeDate("2026-11-05T12:00:00Z", now)).toBe("ahora");
    expect(formatRelativeDate("nope", now)).toBe("—");
  });

  it("detects the stale-version error", () => {
    expect(isStaleVerificationError(new Error("verification request changed"))).toBe(true);
    expect(isStaleVerificationError(new Error("La empresa modificó su solicitud mientras la revisabas."))).toBe(true);
    expect(isStaleVerificationError(new Error("other"))).toBe(false);
    expect(isStaleVerificationError("verification request changed")).toBe(false);
  });

  it("appends pages without duplicates and restores optimistic removals in place", () => {
    const key = (item: { id: string }) => item.id;
    expect(appendPage([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }], key).map(key)).toEqual(["a", "b", "c"]);
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const { items, restore } = removeWithRestore(list, key, "b");
    expect(items.map(key)).toEqual(["a", "c"]);
    expect(restore(items).map(key)).toEqual(["a", "b", "c"]);
    expect(restore([...items, { id: "b" }]).map(key)).toEqual(["a", "c", "b"]);
    expect(removeWithRestore(list, key, "zzz").items).toBe(list);
  });
});
