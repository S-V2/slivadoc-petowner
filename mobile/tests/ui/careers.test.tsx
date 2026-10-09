import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { CareerScreen } from "../../src/screens/CareerScreen";
import {
  careerErrors,
  emptyCareerDraft,
  type CareerPosition,
} from "../../../shared/careers";
const makeRole = (
  id: string,
  title: string,
  key: string,
  label: string,
): CareerPosition => ({
  id,
  title: { id: title, en: title },
  department: "engineering",
  status: "talent_pool",
  summary: { id: "Membangun layanan pet care", en: "Build pet care services" },
  responsibilities: [],
  requirements: [],
  fields: [
    {
      id: key,
      label: { id: label, en: label },
      kind: "textarea",
      required: true,
      min_length: 20,
      max_length: 2000,
    },
  ],
});
const roles = [
  makeRole("backend-engineer", "Backend Engineer", "stack", "Backend stack"),
  makeRole("qa-engineer", "QA Engineer", "testing", "Testing experience"),
];
jest.mock("../../src/components/ui", () => ({
  useAppSurface: () => ({ bottomInset: 0 }),
}));
jest.mock("../../src/api", () => ({ PLATFORM_API_URL: "http://career.test" }));
jest.mock("../../src/i18n", () => ({
  useI18n: () => ({ language: "en", setLanguage: jest.fn() }),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../src/components/LegalDocumentPanel", () => ({
  LegalDocumentPanel: () => null,
}));
const fetchMock = jest.fn<typeof fetch>();
beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: roles, consent_version: "2026-10-09" }),
  } as Response);
});
describe("career mobile", () => {
  test("opens a native role-specific form, filters phone, and clears prior role answers", async () => {
    await render(<CareerScreen onBack={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByLabelText("View role: Backend Engineer")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByLabelText("View role: Backend Engineer"));
    expect(screen.getByLabelText("Backend stack")).toBeTruthy();
    expect(screen.queryByLabelText("Testing experience")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Submit application" }),
    ).toBeDisabled();
    await fireEvent.changeText(
      screen.getByLabelText("Phone number"),
      "abc08123-4567890",
    );
    expect(screen.getByLabelText("Phone number").props.value).toBe(
      "081234567890",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Backend stack"),
      "Private prior role answer",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Back to positions" }),
    );
    await fireEvent.press(screen.getByLabelText("View role: QA Engineer"));
    expect(screen.getByLabelText("Testing experience").props.value).toBe("");
    expect(screen.queryByLabelText("Backend stack")).toBeNull();
  });
  test("search and error retry retain a usable screen", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await render(<CareerScreen onBack={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.getByLabelText("View role: QA Engineer")).toBeTruthy(),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Search roles or skills"),
      "no-such-role",
    );
    expect(screen.getByText("No positions match your search.")).toBeTruthy();
  });
  test("multiple work types require an explicit choice in the native form", async () => {
    const role = { ...roles[0]!, employment_types: ["PART_TIME", "CONTRACTOR"] };
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({data:[role],consent_version:"2026-10-09"})} as Response);
    await render(<CareerScreen onBack={jest.fn()} />);
    await waitFor(()=>expect(screen.getByLabelText("View role: Backend Engineer")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("View role: Backend Engineer"));
    const choices=screen.getAllByRole("radio");
    expect(choices[0]!.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(choices[1]!);
    expect(screen.getAllByRole("radio")[1]!.props.accessibilityState.checked).toBe(true);
    expect(careerErrors(emptyCareerDraft(),role,null,"en").employment_type).toBeTruthy();
    expect(careerErrors({...emptyCareerDraft(),employment_type:"CONTRACTOR"},role,null,"en").employment_type).toBeUndefined();
  });
  test("validation requires all common and role-specific answers, valid PDF and consents", () => {
    const role = roles[0]!;
    const draft = {
      ...emptyCareerDraft(),
      full_name: "QA Candidate",
      email: "qa@example.test",
      phone: "081234567890",
      city: "Jakarta",
      education: "Computer Science",
      experience: "0",
      availability: "Next month",
      motivation: "I want to build reliable systems for pet parents.",
      answers: { stack: "Go, PostgreSQL, and reliable APIs" },
      consent: true,
      truth_declaration: true,
    };
    expect(
      careerErrors(draft, role, { name: "CV.pdf", size: 400 }, "en"),
    ).toEqual({});
    const bad = { ...draft, phone: "abc", answers: {}, consent: false };
    const errors = careerErrors(bad, role, { name: "CV.exe", size: 400 }, "en");
    expect(errors.phone).toBeTruthy();
    expect(errors["answers.stack"]).toBeTruthy();
    expect(errors.consent).toBeTruthy();
    expect(errors.resume).toBeTruthy();
  });
});
