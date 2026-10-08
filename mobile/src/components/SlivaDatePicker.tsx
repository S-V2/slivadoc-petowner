import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { useState } from "react";
import {  ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { calendarValue, dateKey, monthDays, parseCalendarDate, withinDateBounds, validCalendarValue, type CalendarKind } from "../../../shared/calendar";
import { LocalizedText as Text, useI18n } from "../i18n";
import { BoundedBottomSheet } from "./ui";
import { colors } from "../theme";

export function SlivaDatePicker({ value = "", onChangeText, kind = "date", label = "Pilih tanggal", min, max, style, disabled = false }: {
  value?: string; onChangeText?: (value: string) => void; kind?: CalendarKind; label?: string; min?: string; max?: string; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [day, setDay] = useState(dateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [yearsOpen, setYearsOpen] = useState(false);
  const launch = () => { const date = parseCalendarDate(value) ?? new Date(); setMonth(date); setDay(dateKey(date)); setTime(kind === "time" ? value || "09:00" : value.slice(11, 16) || "09:00"); setYearsOpen(false); setOpen(true); };
  const validDraft = validCalendarValue(calendarValue(day,time,kind),kind,min?.replace(" ","T"),max?.replace(" ","T"));
  const commit = (next: string) => { if (next && !validCalendarValue(next.replace(" ","T"),kind,min?.replace(" ","T"),max?.replace(" ","T"))) return; onChangeText?.(next); setOpen(false); };
  return <>
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={t(label)} onPress={launch} style={[styles.field, style]}><Text style={[styles.value, styles.fieldValue]}>{value ? kind === "time" ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parseCalendarDate(value) ?? new Date()) + (kind === "datetime-local" ? ` · ${value.slice(11, 16)}` : "") : label}</Text><Ionicons name={kind === "time" ? "time-outline" : "calendar-outline"} size={20} color={colors.sky600}/></Pressable>
    <BoundedBottomSheet visible={open} onClose={() => setOpen(false)} maxHeight="90%">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Text style={styles.title}>Kalender Slivadoc</Text><Pressable accessibilityRole="button" accessibilityLabel={t("Tutup")} onPress={() => setOpen(false)} style={styles.control}><Ionicons name="close" size={22} color={colors.navy}/></Pressable></View>
        {kind !== "time" && <>
          <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={t("Bulan sebelumnya")} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} style={styles.control}><Ionicons name="chevron-back" size={20} color={colors.sky600}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("Pilih tahun")} style={styles.monthControl} onPress={() => setYearsOpen(!yearsOpen)}><Text style={styles.title}>{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month)}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("Bulan berikutnya")} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} style={styles.control}><Ionicons name="chevron-forward" size={20} color={colors.sky600}/></Pressable></View>
          {yearsOpen ? <ScrollView style={styles.years} contentContainerStyle={styles.grid} nestedScrollEnabled>{Array.from({ length: 131 }, (_, index) => { const year = new Date().getFullYear() + 30 - index; return <Pressable key={year} accessibilityRole="button" accessibilityState={{ selected: year === month.getFullYear() }} style={styles.year} onPress={() => {setMonth(new Date(year, month.getMonth(), 1, 12)); setYearsOpen(false);}}><Text>{year}</Text></Pressable>; })}</ScrollView> : <View style={styles.grid}>
            {Array.from({ length: 7 }, (_, index) => <View key={index} style={styles.cell}><Text style={styles.weekday}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 9, 5 + index))}</Text></View>)}
            {monthDays(month.getFullYear(), month.getMonth()).map((date) => {const key = dateKey(date); const allowed = withinDateBounds(key, min, max); return <Pressable key={key} accessibilityRole="button" accessibilityLabel={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)} accessibilityState={{ selected: key === day, disabled: !allowed }} disabled={!allowed} style={[styles.cell, key === day && styles.selected, (!allowed || date.getMonth() !== month.getMonth()) && styles.outside]} onPress={() => {setDay(key); if (kind === "date") commit(key);}}><Text style={key === day ? styles.selectedText : styles.value}>{date.getDate()}</Text></Pressable>;})}
          </View>}
        </>}
        {kind !== "date" && <><Text style={styles.title}>Pilih jam</Text>{[24,60].map((count,index) => <View key={count}><Text>{index === 0 ? "Jam" : "Menit"}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{Array.from({length:count},(_,n) => { const val=String(n).padStart(2,"0");const selected=time.split(":")[index]===val;return <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${t(index===0?"Jam":"Menit")} ${val}`} accessibilityState={{selected}} style={[styles.control,selected&&styles.selected]} onPress={()=>setTime(index===0?`${val}:${time.split(":")[1]}`:`${time.split(":")[0]}:${val}`)}><Text style={selected?styles.selectedText:styles.value}>{val}</Text></Pressable>; })}</ScrollView></View>)}</>}
        {!validDraft && <Text accessibilityRole="alert">Pilih tanggal/jam yang valid sesuai batas jadwal.</Text>}
        <View style={styles.actions}><Pressable accessibilityRole="button" style={styles.control} onPress={() => commit("")}><Text>Kosongkan</Text></Pressable><Pressable accessibilityRole="button" style={styles.control} onPress={() => setOpen(false)}><Text>Batal</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{disabled: !validDraft}} style={[styles.control,styles.selected,!validDraft&&styles.outside]} disabled={!validDraft} onPress={() => commit(calendarValue(day,time,kind," "))}><Text style={styles.selectedText}>Selesai</Text></Pressable></View>
      </ScrollView>
    </BoundedBottomSheet>
  </>;
}
const styles=StyleSheet.create({
  field:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10,padding:12,borderWidth:1,borderColor:colors.sky100,borderRadius:14,backgroundColor:colors.white},
  value:{color:colors.navy,fontSize:14},fieldValue:{flex:1,flexShrink:1,minWidth:0},monthControl:{flex:1,minHeight:44,alignItems:"center",justifyContent:"center"},content:{padding:18,gap:12},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},title:{flexShrink:1,color:colors.navy,fontSize:17,fontWeight:"600"},
  control:{minWidth:44,minHeight:44,padding:12,margin:2,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:colors.sky50},grid:{flexDirection:"row",flexWrap:"wrap"},cell:{width:"14.2857%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:12},selected:{backgroundColor:colors.sky600},selectedText:{color:colors.white,fontWeight:"600"},outside:{opacity:.35},weekday:{color:colors.muted,fontSize:10},actions:{flexDirection:"row",flexWrap:"wrap",justifyContent:"flex-end",gap:10},years:{maxHeight:280},year:{width:"25%",minHeight:44,alignItems:"center",justifyContent:"center"}
});
