import { getPlatformAccessToken, refreshMobileSession } from "../api";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import {
  careerBasicFields,
  careerEmploymentTypes,
  careerLocation,
  careerCopy,
  careerDepartments,
  careerErrors,
  careerRequestKey,
  careerSubmitError,
  emptyCareerDraft,
  getCareerCatalog,
  sendCareerApplication,
  type CareerCatalog,
  type CareerDraft,
  type CareerPosition,
} from "../../../shared/careers";
import { BrandLogo } from "../components/BrandLogo";
import { careerWorkMode } from "../../../shared/career-discovery";
import { PLATFORM_API_URL } from "../api";
import { useI18n } from "../i18n";
import { colors } from "../theme";
import { useAppSurface } from "../components/ui";
import { LegalDocumentPanel } from "../components/LegalDocumentPanel";

export function CareerScreen({ onBack }: { onBack: () => void }) {
  const { bottomInset } = useAppSurface();
  const { language, setLanguage } = useI18n(),
    c = careerCopy[language];
  const [catalog, setCatalog] = useState<CareerCatalog>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState<CareerPosition>();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    const controller = new AbortController();
    getCareerCatalog(PLATFORM_API_URL, controller.signal)
      .then((data) => {
        setCatalog(data);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(true);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!position) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPosition(undefined);
      return true;
    });
    return () => sub.remove();
  }, [position]);
  function select(next?: CareerPosition) {
    setPosition(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  const positions = (catalog?.data ?? []).filter(
    (p) =>
      (!department || p.department === department) &&
      `${p.title[language]} ${p.summary[language]} ${careerDepartments[p.department]?.[language]}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.content,
          { paddingBottom: bottomInset + 108 },
        ]}
      >
        <View style={s.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={position ? c.backPositions : c.back}
            onPress={() => (position ? select() : onBack())}
            style={s.back}
          >
            <Ionicons name="arrow-back" size={18} color={colors.sky600} />
            <Text style={s.backText}>{c.back}</Text>
          </Pressable>
          <BrandLogo size={38} />
          <View style={s.language}>
            {(["id", "en"] as const).map((code) => (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityLabel={
                  code === "id" ? "Bahasa Indonesia" : "English"
                }
                accessibilityState={{ selected: language === code }}
                onPress={() => void setLanguage(code)}
                style={[
                  s.languageButton,
                  language === code && s.languageSelected,
                ]}
              >
                <Text style={[s.languageText, language === code && s.white]}>
                  {code.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {position && catalog ? (
          <>
            <LinearGradient
              colors={[colors.sky50, colors.sky100]}
              style={s.hero}
            >
              <Text style={s.eyebrow}>
                {careerDepartments[position.department]?.[language]}
              </Text>
              <Text accessibilityRole="header" style={s.roleTitle}>
                {position.title[language]}
              </Text>
              <Text style={s.body}>{position.summary[language]}</Text>
              <Badge text={careerWorkMode(position, language)} />
              <Text style={s.hint}>{careerLocation(position, language)}</Text>
              <Text style={s.backText}>
                {position.employment_types
                  ?.map(
                    (type) => careerEmploymentTypes[type]?.[language] ?? type,
                  )
                  .join(" · ")}
              </Text>
            </LinearGradient>
            {position.status === "talent_pool" && (
              <Text style={s.notice}>{c.talentNote}</Text>
            )}
            <View style={s.detail}>
              <Text style={s.sectionTitle}>{c.responsibilities}</Text>
              {position.responsibilities.map((v) => (
                <Text style={s.listText} key={v.id}>
                  • {v[language]}
                </Text>
              ))}
              <Text style={s.sectionTitle}>{c.requirements}</Text>
              {position.requirements.map((v) => (
                <Text style={s.listText} key={v.id}>
                  • {v[language]}
                </Text>
              ))}
            </View>
            <CareerNativeForm
              key={position.id}
              position={position}
              version={catalog.consent_version}
              onDone={() => select()}
              onSuccess={() => scroll.current?.scrollToEnd({ animated: true })}
            />
          </>
        ) : (
          <>
            <LinearGradient
              colors={[colors.sky50, colors.sky100]}
              style={s.hero}
            >
              <View style={s.heroBrand}>
                <BrandLogo size={34} />
                <Text style={s.eyebrow}>SLIVADOC CAREER</Text>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {c.title}
                {"\n"}
                <Text style={s.blue}>{c.titleAccent}</Text>
              </Text>
              <Text style={s.body}>{c.intro}</Text>
              <View style={s.heroArt}>
                <View style={s.paw}>
                  <Ionicons name="paw" size={70} color="white" />
                </View>
                <View style={s.artLabel}>
                  <Ionicons
                    name="sparkles-outline"
                    size={19}
                    color={colors.sky600}
                  />
                  <Text style={s.artText}>Better, together.</Text>
                </View>
              </View>
              <Text style={s.heroCaption}>One Platform. Every Animal.</Text>
            </LinearGradient>
            <View style={s.values}>
              {c.values.map((v, i) => (
                <View style={s.value} key={v}>
                  <View style={s.valueIcon}>
                    <Ionicons
                      name={
                        i === 0
                          ? "heart-outline"
                          : i === 1
                            ? "people-outline"
                            : "sparkles-outline"
                      }
                      size={21}
                      color={colors.sky600}
                    />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.valueTitle}>{v}</Text>
                    <Text style={s.hint}>{c.valueNotes[i]}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={s.eyebrow}>YOUR NEXT CHAPTER</Text>
            <Text accessibilityRole="header" style={s.heading}>
              {c.positions}
            </Text>
            <Text style={s.body}>{c.positionsNote}</Text>
            <View style={s.search}>
              <Ionicons name="search" size={20} color={colors.sky600} />
              <TextInput
                accessibilityLabel={c.search}
                placeholder={c.search}
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                style={s.searchInput}
                returnKeyType="search"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filters}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !department }}
                onPress={() => setDepartment("")}
                style={[s.chip, !department && s.chipActive]}
              >
                <Text style={[s.chipText, !department && s.white]}>
                  {c.all}
                </Text>
              </Pressable>
              {Object.keys(careerDepartments)
                .filter((d) => catalog?.data.some((p) => p.department === d))
                .map((d) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: department === d }}
                    key={d}
                    onPress={() => setDepartment(d)}
                    style={[s.chip, department === d && s.chipActive]}
                  >
                    <Text style={[s.chipText, department === d && s.white]}>
                      {careerDepartments[d]?.[language]}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
            <Text accessibilityLiveRegion="polite" style={s.resultCount}>
              {positions.length} {c.results}
            </Text>
            {loading ? (
              <ActivityIndicator
                accessibilityLabel={
                  language === "id" ? "Memuat posisi" : "Loading positions"
                }
                color={colors.sky600}
                style={s.loader}
              />
            ) : error ? (
              <View style={s.empty}>
                <Text style={s.body}>{c.loadError}</Text>
                <Action
                  label={c.retry}
                  onPress={() => {
                    setLoading(true);
                    setError(false);
                    setAttempt((v) => v + 1);
                  }}
                />
              </View>
            ) : !positions.length ? (
              <View style={s.empty}>
                <Text style={s.body}>{c.empty}</Text>
                <Action
                  label={c.clear}
                  onPress={() => {
                    setDepartment("");
                    setQuery("");
                  }}
                />
              </View>
            ) : (
              <View style={s.jobs} testID="career-job-grid">
                {positions.map((p) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${c.detail}: ${p.title[language]}`}
                    onPress={() => select(p)}
                    key={p.id}
                    testID="career-job-card"
                    style={({ pressed }) => [s.job, pressed && s.pressed]}
                  >
                    <View style={s.row}>
                      <BrandLogo size={34} />
                      <Badge text={careerWorkMode(p, language)} />
                    </View>
                    <Text style={s.jobDept}>
                      {careerDepartments[p.department]?.[language]}
                    </Text>
                    <Text style={s.jobTitle}>{p.title[language]}</Text>
                    <Text style={s.jobSummary} numberOfLines={3}>
                      {p.summary[language]}
                    </Text>
                    <Text style={s.backText}>
                      {p.employment_types
                        ?.map(
                          (type) =>
                            careerEmploymentTypes[type]?.[language] ?? type,
                        )
                        .join(" · ")}
                    </Text>
                    <View style={s.jobBottom}>
                      <View style={s.inline}>
                        <Ionicons
                          name="location-outline"
                          size={15}
                          color={colors.muted}
                        />
                        <Text style={s.hint}>
                          {careerLocation(p, language)}
                        </Text>
                      </View>
                      <Text style={s.backText}>{c.detail} ↗</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={s.process}>
              <Text style={s.eyebrow}>HOW IT WORKS</Text>
              <Text accessibilityRole="header" style={s.heading}>
                {c.process}
              </Text>
              {c.steps.map((step, i) => (
                <View style={s.step} key={step}>
                  <Text style={s.stepNumber}>0{i + 1}</Text>
                  <View style={s.flex}>
                    <Text style={s.valueTitle}>{step}</Text>
                    <Text style={s.hint}>{c.stepNotes[i]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={s.security}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={colors.sky600}
          />
          <View style={s.flex}>
            <Text style={s.valueTitle}>{c.noFee}</Text>
            <Text style={s.hint}>{c.noFeeNote}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Badge({ text }: { text: string }) {
  return (
    <View style={s.badge}>
      <View style={s.badgeDot} />
      <Text style={s.badgeText}>{text}</Text>
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={s.actionText}>{label}</Text>
      <Ionicons name="arrow-forward" color="white" size={18} />
    </Pressable>
  );
}
function CareerNativeForm({
  position,
  version,
  onDone,
  onSuccess,
}: {
  position: CareerPosition;
  version: string;
  onDone: () => void;
  onSuccess: () => void;
}) {
  const { language } = useI18n(),
    c = careerCopy[language];
  const [draft, setDraft] = useState(emptyCareerDraft);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const key = useRef("");
  const sent = useRef(false);
  const errors = careerErrors(draft, position, file, language),
    valid = Object.keys(errors).length === 0;
  function change(id: keyof CareerDraft, value: string | boolean) {
    setDraft((v) => ({ ...v, [id]: value }));
    key.current = "";
    setError("");
  }
  function touch(id: string) {
    setTouched((v) => ({ ...v, [id]: true }));
  }
  async function pick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets[0]) {
        setFile(result.assets[0]);
        touch("resume");
        key.current = "";
        setError("");
      }
    } catch {
      setError(c.resumeError);
    }
  }
  async function submit() {
    if (sent.current || !valid || !file) return;
    sent.current = true;
    setBusy(true);
    setError("");
    if (!key.current) key.current = careerRequestKey();
    const form = new FormData();
    form.append(
      "application",
      JSON.stringify({
        ...draft,
        position_id: position.id,
        position_revision: position.revision,
        employment_type:
          draft.employment_type || position.employment_types?.[0],
        request_key: key.current,
        language,
        consent_version: version,
      }),
    );
    form.append("resume", {
      uri: file.uri,
      name: file.name,
      type: "application/pdf",
    } as unknown as Blob);
    try {
      const result = await sendCareerApplication(PLATFORM_API_URL, form, { getToken: getPlatformAccessToken, refresh: refreshMobileSession });
      setReceipt(result.id);
      setFile(null);
      setDraft(emptyCareerDraft());
      setTimeout(onSuccess, 100);
    } catch (cause) {
      setError(careerSubmitError(cause, language));
    } finally {
      setBusy(false);
      sent.current = false;
    }
  }
  const feedback = (id: string) =>
    touched[id] && errors[id] ? (
      <Text accessibilityLiveRegion="polite" style={s.error}>
        {errors[id]}
      </Text>
    ) : null;
  if (receipt)
    return (
      <View style={s.success}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark" size={42} color={colors.sky600} />
        </View>
        <Text accessibilityRole="header" style={s.heading}>
          {c.success}
        </Text>
        <Text style={s.body}>{c.successNote}</Text>
        <View style={s.reference}>
          <Text style={s.hint}>{c.reference}</Text>
          <Text selectable style={s.referenceText}>
            {receipt}
          </Text>
        </View>
        <Action label={c.browse} onPress={onDone} />
      </View>
    );
  return (
    <View style={s.form}>
      <Text style={s.eyebrow}>YOUR APPLICATION</Text>
      <Text accessibilityRole="header" style={s.heading}>
        {c.formTitle}
      </Text>
      <Text style={s.body}>{c.formIntro}</Text>
      <Text accessibilityRole="header" style={s.legend}>
        {c.personal}
      </Text>
      {(position.employment_types?.length ?? 0) > 1 && (
        <View style={s.field}>
          <Text style={s.label}>{c.employment_type} *</Text>
          {position.employment_types?.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{
                checked: draft.employment_type === type,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => {
                change("employment_type", type);
                touch("employment_type");
              }}
              style={[
                s.input,
                draft.employment_type === type && {
                  backgroundColor: colors.sky100,
                  borderColor: colors.sky600,
                },
              ]}
            >
              <Text style={s.backText}>
                {draft.employment_type === type ? "◉ " : "○ "}
                {careerEmploymentTypes[type]?.[language] ?? type}
              </Text>
            </Pressable>
          ))}
          {feedback("employment_type")}
        </View>
      )}
      {careerBasicFields.map((f) => (
        <View key={f.id} style={s.field}>
          <Text style={s.label}>{c[f.id]} *</Text>
          <TextInput
            accessibilityLabel={c[f.id]}
            editable={!busy}
            value={draft[f.id]}
            onChangeText={(v) =>
              change(
                f.id,
                f.kind === "number" || f.kind === "tel"
                  ? v.replace(/\D/g, "").slice(0, f.max)
                  : v,
              )
            }
            onBlur={() => touch(f.id)}
            maxLength={
              f.kind === "tel" || f.kind === "number" ? undefined : f.max
            }
            keyboardType={
              f.kind === "email"
                ? "email-address"
                : f.kind === "number" || f.kind === "tel"
                  ? "number-pad"
                  : "default"
            }
            autoCapitalize={f.kind === "email" ? "none" : "sentences"}
            autoCorrect={f.kind !== "email"}
            multiline={f.kind === "textarea"}
            textAlignVertical={f.kind === "textarea" ? "top" : "center"}
            style={[
              s.input,
              f.kind === "textarea" && s.textarea,
              Boolean(touched[f.id] && errors[f.id]) && s.invalid,
            ]}
          />
          {f.id === "motivation" && (
            <Text style={s.hint}>{c.motivationHint}</Text>
          )}
          {feedback(f.id)}
        </View>
      ))}
      <Text accessibilityRole="header" style={s.legend}>
        {c.role}
      </Text>
      <View style={s.roleTag}>
        <Ionicons name="briefcase-outline" size={16} color={colors.sky600} />
        <Text style={s.backText}>{position.title[language]}</Text>
      </View>
      {position.fields.map((f) => (
        <View key={f.id} style={s.field}>
          <Text style={s.label}>
            {f.label[language]} {f.required ? "*" : ""}
          </Text>
          <TextInput
            accessibilityLabel={f.label[language]}
            editable={!busy}
            value={draft.answers[f.id] ?? ""}
            onChangeText={(v) => {
              setDraft((prev) => ({
                ...prev,
                answers: { ...prev.answers, [f.id]: v },
              }));
              key.current = "";
              setError("");
            }}
            onBlur={() => touch(`answers.${f.id}`)}
            keyboardType={f.kind === "url" ? "url" : "default"}
            autoCapitalize={f.kind === "url" ? "none" : "sentences"}
            autoCorrect={f.kind !== "url"}
            placeholder={f.kind === "url" ? "https://…" : undefined}
            placeholderTextColor={colors.muted}
            maxLength={f.max_length}
            multiline={f.kind === "textarea"}
            textAlignVertical={f.kind === "textarea" ? "top" : "center"}
            style={[
              s.input,
              f.kind === "textarea" && s.textarea,
              Boolean(
                touched[`answers.${f.id}`] && errors[`answers.${f.id}`],
              ) && s.invalid,
            ]}
          />
          {f.kind === "textarea" && (
            <Text style={s.hint}>
              {c.min} {f.min_length} {c.chars}
            </Text>
          )}
          {feedback(`answers.${f.id}`)}
        </View>
      ))}
      <Text accessibilityRole="header" style={s.legend}>
        {c.documents}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.upload}
        disabled={busy}
        onPress={() => void pick()}
        style={s.upload}
      >
        <Ionicons
          name="document-attach-outline"
          size={30}
          color={colors.sky600}
        />
        <Text style={s.uploadTitle}>{file?.name ?? c.upload} *</Text>
        <Text style={[s.hint, s.center]}>{c.uploadHint}</Text>
      </Pressable>
      {feedback("resume")}
      <View style={s.privacyNote}>
        <Text style={s.valueTitle}>{c.readPrivacy}</Text>
        <Text style={s.hint}>{c.privacyNote}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => setPrivacy(true)}
          style={s.privacyLink}
        >
          <Text style={s.backText}>{c.privacy} ↗</Text>
        </Pressable>
      </View>
      {(["consent", "truth_declaration"] as const).map((id) => (
        <Pressable
          key={id}
          accessibilityRole="checkbox"
          accessibilityLabel={id === "consent" ? c.consent : c.truth}
          accessibilityState={{ checked: draft[id], disabled: busy }}
          disabled={busy}
          onPress={() =>
            id === "consent" && !draft.consent
              ? setPrivacy(true)
              : change(id, !draft[id])
          }
          style={s.checkbox}
        >
          <Ionicons
            name={draft[id] ? "checkbox" : "square-outline"}
            color={colors.sky600}
            size={24}
          />
          <Text style={s.checkboxText}>
            {id === "consent" ? c.consent : c.truth} *
          </Text>
        </Pressable>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <Action
        label={busy ? c.sending : c.submit}
        disabled={!valid || busy}
        onPress={() => void submit()}
      />
      {!valid && <Text style={[s.hint, s.center]}>{c.check}</Text>}
      <Modal
        visible={privacy}
        animationType="slide"
        transparent
        onRequestClose={() => setPrivacy(false)}
      >
        {privacy && (
          <LegalDocumentPanel
            policy="privacy"
            onClose={() => setPrivacy(false)}
            onAccept={() => {
              change("consent", true);
              setPrivacy(false);
            }}
          />
        )}
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: {
    padding: 20,
    paddingBottom: 45,
    gap: 16,
    alignSelf: "center",
    width: "100%",
    maxWidth: 760,
  },
  flex: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: "white",
  },
  backText: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
  language: {
    flexDirection: "row",
    gap: 3,
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: "white",
  },
  languageButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
  },
  languageSelected: { backgroundColor: colors.sky600 },
  languageText: { fontSize: 11, fontWeight: "800", color: colors.muted },
  white: { color: "white" },
  hero: {
    padding: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#C4E9FF",
    gap: 16,
    overflow: "hidden",
  },
  heroBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: colors.sky600,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1.1,
    color: colors.navy,
  },
  blue: { color: colors.sky600 },
  body: { fontSize: 13, lineHeight: 22, color: colors.muted },
  heroArt: {
    alignItems: "center",
    justifyContent: "center",
    height: 135,
    marginVertical: 8,
  },
  paw: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: colors.sky500,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-9deg" }],
    borderWidth: 5,
    borderColor: "#FFFFFF99",
  },
  artLabel: {
    position: "absolute",
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "white",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.sky100,
    padding: 13,
    transform: [{ rotate: "4deg" }],
  },
  artText: { fontSize: 11, fontWeight: "700", color: colors.sky600 },
  heroCaption: {
    textAlign: "center",
    color: colors.sky600,
    fontSize: 10,
    letterSpacing: 1,
  },
  values: { gap: 17, paddingVertical: 9 },
  value: { flexDirection: "row", alignItems: "center", gap: 12 },
  valueIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  valueTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  hint: { fontSize: 11, lineHeight: 18, color: colors.muted },
  heading: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: colors.navy,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 51,
    color: colors.navy,
    fontSize: 13,
  },
  filters: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: colors.sky600, borderColor: colors.sky600 },
  chipText: { fontSize: 11, color: colors.text, fontWeight: "600" },
  resultCount: { fontSize: 11, color: colors.muted },
  loader: { padding: 45 },
  empty: {
    padding: 25,
    gap: 20,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
  },
  jobs: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  jobSummary: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    flexGrow: 1,
  },
  job: {
    width: "48%",
    padding: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  jobIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: colors.sky50,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.sky50,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.sky500,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.sky600 },
  jobDept: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.sky600,
    marginTop: 5,
  },
  jobTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.navy,
  },
  jobBottom: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 15,
    marginTop: 8,
    gap: 10,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  pressed: { opacity: 0.75 },
  process: {
    backgroundColor: colors.sky50,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 22,
    padding: 23,
    gap: 18,
    marginTop: 8,
  },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepNumber: {
    width: 37,
    height: 37,
    textAlign: "center",
    paddingTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: colors.sky600,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 11,
  },
  security: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 17,
    padding: 18,
    backgroundColor: "white",
  },
  roleTitle: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: colors.navy,
  },
  notice: {
    fontSize: 11,
    lineHeight: 19,
    color: colors.muted,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
    padding: 15,
  },
  detail: { paddingVertical: 5, gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 8,
  },
  listText: { fontSize: 13, lineHeight: 23, color: colors.muted },
  form: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 20,
    gap: 16,
  },
  legend: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.sky600,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 23,
    marginTop: 10,
  },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: "#D6E6F0",
    borderRadius: 11,
    padding: 13,
    backgroundColor: "#FBFDFF",
    fontSize: 14,
    color: colors.navy,
    minHeight: 48,
  },
  textarea: { minHeight: 112, lineHeight: 23 },
  invalid: { borderColor: "#D85C72" },
  error: { fontSize: 12, lineHeight: 20, color: "#B4233C" },
  roleTag: {
    flexDirection: "row",
    gap: 8,
    padding: 11,
    borderRadius: 10,
    backgroundColor: colors.sky50,
    alignItems: "center",
    flexWrap: "wrap",
  },
  upload: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#84C7EC",
    borderRadius: 14,
    padding: 22,
    gap: 11,
    alignItems: "center",
    backgroundColor: colors.canvas,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.sky600,
    textAlign: "center",
  },
  center: { textAlign: "center" },
  privacyNote: {
    gap: 8,
    padding: 15,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  privacyLink: { paddingVertical: 8 },
  checkbox: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkboxText: { fontSize: 12, lineHeight: 21, color: colors.text, flex: 1 },
  action: {
    minHeight: 50,
    backgroundColor: colors.sky600,
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
  },
  actionText: { fontSize: 13, fontWeight: "700", color: "white" },
  disabled: { opacity: 0.42 },
  success: {
    padding: 25,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 22,
    backgroundColor: "white",
  },
  successIcon: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: colors.sky50,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  reference: {
    padding: 16,
    gap: 9,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  referenceText: { fontSize: 12, color: colors.navy },
});
