import { afterEach, expect, jest, test } from "@jest/globals";
import { TurboModuleRegistry } from "react-native";
import { loadNativeMapLibre } from "../../src/native-maplibre";

jest.mock("@maplibre/maplibre-react-native", () => ({ Map: "NativeMap", Camera: "NativeCamera" }));

afterEach(() => {
  jest.restoreAllMocks();
});

test.each(["MLRNCameraModule", "MLRNMapViewModule"])("does not load native maps when %s is missing", (missingModule) => {
  jest.spyOn(TurboModuleRegistry, "get").mockImplementation((name) => name === missingModule ? null : {});
  expect(loadNativeMapLibre()).toBeNull();
});

test("keeps native map components available in a build that includes MapLibre", () => {
  jest.spyOn(TurboModuleRegistry, "get").mockReturnValue({});
  expect(loadNativeMapLibre()).toEqual({ Map: "NativeMap", Camera: "NativeCamera" });
});
