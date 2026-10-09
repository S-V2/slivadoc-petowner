import { memo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import { BottomSheetSafeArea } from "./BottomSheetSafeArea";
import { legalParagraphs, LEGAL_VERSION, type LegalPolicy } from "../../../shared/legal";
import { getLegalDocument, getLegalSources, legalCopy, legalReadingProgress, type LegalLanguage } from "../../../shared/legal-localization";
import { colors } from "../theme";

type Props = { policy: LegalPolicy; onClose: () => void; onAccept: () => void };
const tone = { accent: colors.sky600, tint: colors.sky50, line: colors.sky100 };
// A keyed reader resets scroll and agreement gating when the document or language changes.
// Remain inside the registration Modal: a second native Modal would break iOS presentation.
export function LegalDocumentPanel(props: Props) {
  const { language, setLanguage } = useI18n();
  return <LegalReader key={`${props.policy}-${language}`} {...props} language={language} onLanguageChange={next => void setLanguage(next)}/>;
}
function LegalReader({ policy, onClose, onAccept, language, onLanguageChange }: Props & { language: LegalLanguage; onLanguageChange: (language: LegalLanguage) => void }) {
  const [read, setRead] = useState(false);
  const [progress, setProgress] = useState(0);
  const size = useRef({ viewport: 0, content: 0 });
  const copy = legalCopy[language];
  const updateProgress = (offset: number, viewport: number, content: number) => {
    const next = legalReadingProgress(offset, viewport, content);
    setProgress(next); if (next === 100) setRead(true);
  };
  return <View style={styles.backdrop}>
    <BottomSheetSafeArea style={styles.sheet}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.backRegistration} onPress={onClose} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={19} color={colors.sky600}/><Text style={styles.backText}>{copy.back}</Text>
        </Pressable>
        <View style={styles.languageGroup} accessibilityLabel={copy.language}>
          {(["id", "en"] as const).map(code => <Pressable key={code} accessibilityRole="button" accessibilityLabel={code === "id" ? "Bahasa Indonesia" : "English"} accessibilityState={{ selected: language === code }} onPress={() => onLanguageChange(code)} style={[styles.languageButton, language === code && { backgroundColor: tone.accent }]}><Text style={[styles.languageText, language === code && styles.languageSelected]}>{code.toUpperCase()}</Text></Pressable>)}
        </View>
      </View>
      <ScrollView accessibilityLabel={copy.content} style={styles.scroll} contentContainerStyle={styles.scrollContent}
        onLayout={event => { size.current.viewport = event.nativeEvent.layout.height; updateProgress(0, size.current.viewport, size.current.content); }}
        onContentSizeChange={(_, height) => { size.current.content = height; updateProgress(0, size.current.viewport, height); }}
        scrollEventThrottle={32}
        onScroll={({ nativeEvent: event }) => updateProgress(event.contentOffset.y, event.layoutMeasurement.height, event.contentSize.height)}
      >
        <LegalNativeContent policy={policy} language={language}/>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.progressCaption}><Text style={styles.progressLabel}>{copy.readProgress}</Text><Text style={[styles.progressNumber, { color: tone.accent }]}>{progress}%</Text></View>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={copy.readProgress} accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.sky500 }]}/></View>
        <Text style={styles.hint}>{read ? copy.ready : copy.scrollHint}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.agree} accessibilityState={{ disabled: !read }} disabled={!read} onPress={() => { if (read) onAccept(); }} style={({ pressed }) => [styles.agreeButton, { backgroundColor: read ? tone.accent : "#E6EDF2" }, pressed && styles.pressed]}>
          <Ionicons name={read ? "checkmark-circle-outline" : "arrow-down-outline"} size={20} color={read ? colors.white : "#698091"}/><Text style={[styles.agreeText, { color: read ? colors.white : "#698091" }]}>{copy.agree}</Text>
        </Pressable>
      </View>
    </BottomSheetSafeArea>
  </View>;
}

const LegalNativeContent = memo(function LegalNativeContent({ policy, language }: { policy: LegalPolicy; language: LegalLanguage }) {
  const [linkError, setLinkError] = useState(false);
  const document = getLegalDocument(policy, language); const copy = legalCopy[language];
  const openSource = async (url: string) => { setLinkError(false); try { await Linking.openURL(url); } catch { setLinkError(true); } };
  return <>
    <View style={[styles.hero, { backgroundColor: tone.tint, borderColor: tone.line }]}>
      <View style={[styles.heroOrbit, { borderColor: tone.line }]} pointerEvents="none"/>
      <View style={[styles.heroIcon, { borderColor: tone.line }]}><Ionicons name={policy === "privacy" ? "shield-checkmark-outline" : "document-text-outline"} size={26} color={tone.accent}/></View>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>{policy === "privacy" ? copy.privacyKicker : copy.termsKicker}</Text>
      <Text accessibilityRole="header" style={styles.title}>{document.title}</Text>
      <Text style={styles.metadata}>{copy.version} {LEGAL_VERSION} · {copy.effective} {copy.date}</Text>
      <View style={styles.stats}><Text style={[styles.stat, { color: tone.accent, borderColor: tone.line }]}>{document.sections.length} {copy.sections}</Text><Text style={[styles.stat, { color: tone.accent, borderColor: tone.line }]}>{document.sections.reduce((sum, section) => sum + legalParagraphs(section).length, 0)} {copy.clauses}</Text></View>
    </View>
    <View style={[styles.introduction, { backgroundColor: tone.tint, borderLeftColor: tone.accent }]}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>{copy.intro}</Text><Text style={styles.paragraph}>{document.introduction}</Text><Text style={styles.translationNote}>{copy.translationNote}</Text>
    </View>
    {document.sections.map((section, sectionIndex) => <View key={section.heading} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionNumber, { backgroundColor: tone.tint, borderColor: tone.line }]}><Text style={[styles.sectionNumberText, { color: tone.accent }]}>{String(sectionIndex + 1).padStart(2, "0")}</Text></View>
        <View style={styles.sectionTitle}><Text style={[styles.sectionKicker, { color: tone.accent }]}>{copy.section} {sectionIndex + 1}</Text><Text accessibilityRole="header" style={styles.heading}>{section.heading}</Text></View>
      </View>
      {legalParagraphs(section).map((paragraph, paragraphIndex) => <View key={paragraphIndex} style={styles.clause}><Text style={[styles.clauseNumber, { color: tone.accent }]}>{sectionIndex + 1}.{paragraphIndex + 1}.</Text><Text style={[styles.paragraph, styles.clauseText]}>{paragraph}</Text></View>)}
    </View>)}
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>SLIVADOC · {language === "en" ? "REFERENCES" : "REFERENSI"}</Text>
      <Text accessibilityRole="header" style={styles.heading}>{copy.sources}</Text><Text style={styles.paragraph}>{copy.sourcesNote}</Text>
      {getLegalSources(language).map(source => <Pressable key={source.url} accessibilityRole="link" accessibilityLabel={source.title} onPress={() => void openSource(source.url)} style={({ pressed }) => [styles.source, pressed && styles.pressed]}><Text style={[styles.sourceText, { color: tone.accent }]}>{source.title}</Text><Ionicons name="open-outline" size={16} color={tone.accent}/></Pressable>)}
      {linkError ? <Text accessibilityRole="alert" style={styles.error}>{copy.sourceError}</Text> : null}
    </View>
    <View style={styles.end}><Ionicons name="checkmark-circle-outline" size={36} color={tone.accent}/><Text style={styles.heading}>{copy.end}</Text><Text style={styles.endNote}>{copy.endNote}</Text></View>
  </>;
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,35,50,.4)" },
  sheet: { height: "94%", backgroundColor: "#F5F9FC" },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 12, backgroundColor: colors.white },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, minHeight: 44, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, backgroundColor: colors.sky50 },
  backText: { fontSize: 13, fontWeight: "700", color: colors.sky600 },
  pressed: { opacity: .7 },
  languageGroup: { flexDirection: "row", gap: 4, padding: 4, borderWidth: 1, borderColor: "#DCE8EE", borderRadius: 14, backgroundColor: "#F4F8FB" },
  languageButton: { minWidth: 44, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  languageText: { fontSize: 12, fontWeight: "800", color: "#526A7B" }, languageSelected: { color: colors.white },
  scroll: { flex: 1 }, scrollContent: { padding: 14, gap: 16 },
  hero: { padding: 22, borderWidth: 1, borderRadius: 22, overflow: "hidden", gap: 12 },
  heroOrbit: { position: "absolute", right: -60, top: -66, width: 160, height: 160, borderRadius: 80, borderWidth: 22, opacity: .45 },
  heroIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 15, backgroundColor: colors.white, marginBottom: 4 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, lineHeight: 16 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -.5, color: colors.navy },
  metadata: { fontSize: 12, lineHeight: 20, color: "#526A7B" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, stat: { paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, backgroundColor: colors.white, fontSize: 11, fontWeight: "700" },
  introduction: { padding: 18, borderLeftWidth: 3, borderRadius: 16, gap: 12 },
  translationNote: { fontSize: 11, lineHeight: 18, color: "#506F7E" },
  section: { padding: 18, gap: 16, borderWidth: 1, borderColor: "#E0EAF0", borderRadius: 18, backgroundColor: colors.white },
  sectionHeader: { flexDirection: "row", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#EDF2F5" },
  sectionNumber: { width: 36, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12 },
  sectionNumberText: { fontSize: 13, fontWeight: "800" }, sectionTitle: { flex: 1, gap: 4 },
  sectionKicker: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, lineHeight: 14 },
  heading: { fontSize: 16, lineHeight: 23, fontWeight: "700", color: colors.navy },
  clause: { flexDirection: "row", gap: 7 }, clauseNumber: { width: 29, paddingTop: 4, fontSize: 10, lineHeight: 20, fontWeight: "700" }, clauseText: { flex: 1 },
  paragraph: { fontSize: 14, lineHeight: 24, color: "#355268" },
  source: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, padding: 12, backgroundColor: "#F7FAFC", borderWidth: 1, borderColor: "#E5EDF2", borderRadius: 12 },
  sourceText: { flex: 1, fontSize: 12, lineHeight: 20, fontWeight: "600" }, error: { color: colors.red, fontSize: 12 },
  end: { alignItems: "center", gap: 10, padding: 20 }, endNote: { fontSize: 12, lineHeight: 20, textAlign: "center", color: colors.muted },
  footer: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, gap: 7, borderTopWidth: 1, borderTopColor: "#E0EAF0", backgroundColor: colors.white },
  progressCaption: { flexDirection: "row", justifyContent: "space-between" }, progressLabel: { fontSize: 11, color: colors.muted }, progressNumber: { fontSize: 11, fontWeight: "700" },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: colors.sky50, overflow: "hidden" }, progressFill: { height: 4, borderRadius: 4 },
  hint: { fontSize: 11, lineHeight: 17, color: colors.muted, marginBottom: 4 },
  agreeButton: { minHeight: 50, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, agreeText: { flexShrink: 1, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
});
