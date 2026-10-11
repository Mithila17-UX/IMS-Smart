import { describe, it, expect } from "vitest";
import {
  getSettingAt,
  getCurrentSetting,
  getVersionHistory,
  validateNewVersion,
  buildNewVersion,
  type SettingVersion,
} from "../settings";

describe("settings version resolution", () => {
  const versions: SettingVersion[] = [
    {
      key: "defaultDueDays",
      value: 30,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin-1",
    },
    {
      key: "defaultDueDays",
      value: 45,
      effectiveFrom: "2026-06-01T00:00:00.000Z",
      changedBy: "admin-2",
    },
    {
      key: "defaultDueDays",
      value: 60,
      effectiveFrom: "2026-12-01T00:00:00.000Z",
      changedBy: "admin-3",
    },
    {
      key: "depositOnNormalSales",
      value: true,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      changedBy: "admin-1",
    },
  ];

  it("returns default value when no versions exist for key", () => {
    const val = getSettingAt("unknownKey", versions, "2026-07-01T00:00:00.000Z", 100);
    expect(val).toBe(100);
  });

  it("returns default value when all versions are in the future", () => {
    const val = getSettingAt("defaultDueDays", versions, "2025-12-31T23:59:59.000Z", 15);
    expect(val).toBe(15);
  });

  it("resolves the version active at historical point in time", () => {
    // Before June 1st
    const val1 = getSettingAt("defaultDueDays", versions, "2026-05-15T12:00:00.000Z", 15);
    expect(val1).toBe(30);

    // After June 1st but before Dec 1st
    const val2 = getSettingAt("defaultDueDays", versions, "2026-06-01T00:00:00.000Z", 15);
    expect(val2).toBe(45);

    const val3 = getSettingAt("defaultDueDays", versions, "2026-10-01T00:00:00.000Z", 15);
    expect(val3).toBe(45);
  });

  it("resolves the latest version when time is past all versions", () => {
    const val = getSettingAt("defaultDueDays", versions, "2027-01-01T00:00:00.000Z", 15);
    expect(val).toBe(60);
  });

  it("getCurrentSetting returns current value", () => {
    // Current time is after 2026-06-01 but before 2026-12-01 (mock context is 2026-10-11)
    const val = getCurrentSetting("defaultDueDays", versions, 15);
    expect(val).toBe(45);
  });

  it("getVersionHistory returns sorted history descending", () => {
    const history = getVersionHistory("defaultDueDays", versions);
    expect(history).toHaveLength(3);
    expect(history[0]?.value).toBe(60);
    expect(history[1]?.value).toBe(45);
    expect(history[2]?.value).toBe(30);
  });

  it("validateNewVersion validates minimum and maximum bounds", () => {
    const under = validateNewVersion("defaultDueDays", 0, 30, { min: 1, max: 365 });
    expect(under.error).toBe("Value cannot be less than 1.");

    const over = validateNewVersion("defaultDueDays", 400, 30, { min: 1, max: 365 });
    expect(over.error).toBe("Value cannot be greater than 365.");

    const valid = validateNewVersion("defaultDueDays", 60, 30, { min: 1, max: 365 });
    expect(valid.error).toBeNull();
  });

  it("validateNewVersion produces warning on large changes exceeding threshold", () => {
    const res = validateNewVersion("defaultDueDays", 60, 30, { warnThresholdPercent: 50 });
    expect(res.warning).toContain("100%");
  });

  it("buildNewVersion creates a valid SettingVersion object", () => {
    const effective = new Date("2026-11-01T00:00:00.000Z");
    const v = buildNewVersion("defaultDueDays", 50, "user-99", effective, "Holiday extension");
    expect(v.key).toBe("defaultDueDays");
    expect(v.value).toBe(50);
    expect(v.effectiveFrom).toBe("2026-11-01T00:00:00.000Z");
    expect(v.changedBy).toBe("user-99");
    expect(v.changeReason).toBe("Holiday extension");
  });
});
