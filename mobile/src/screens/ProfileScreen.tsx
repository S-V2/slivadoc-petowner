import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, BackHandler, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMobilePetFamily,
  inviteMobilePetFamily,
  revokeMobilePetFamily,
  type MobileBootstrap,
  type MobileFamilyAccess,
  type MobileOwner,
  type MobilePet,
} from "../api";
import { Card, Pill, Screen, SectionTitle, SoftButton, TopHeader } from "../components/ui";
import { colors, shadow, typography } from "../theme";

type ProfilePage = "main" | "family" | "security";
type ProfileProps = {
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  owner?: MobileOwner;
  pets: MobilePet[];
  petCount: number;
  activityCount: number;
  points: number;
  rewardFormula?: MobileBootstrap["points"]["formula"];
  onLogin: () => void;
  onLogout: () => void | Promise<void>;
};

const familyRoles = [
  { value: "co_parent", label: "Co-parent", icon: "heart" as const },
  { value: "caregiver", label: "Caregiver", icon: "hand-left" as const },
  { value: "veterinarian", label: "Dokter", icon: "medkit" as const },
  { value: "viewer", label: "Viewer", icon: "eye" as const },
];
const familyPermissions = [
  { value: "profile", label: "Profil pet", note: "Identitas dan data dasar" },
  { value: "health", label: "Data kesehatan", note: "Rekam medis dan kondisi" },
  { value: "booking", label: "Booking", note: "Jadwal dan perawatan" },
];

function isEmailVerified(owner: MobileOwner) {
  if (typeof owner.email_verified === "boolean") return owner.email_verified;
  if (owner.email_verified_at) return true;
  // Akun dari alur registrasi lama hanya bisa login setelah OTP email selesai.
  return Boolean(owner.email);
}
function isPhoneVerified(owner: MobileOwner) {
  if (typeof owner.phone_verified === "boolean") return owner.phone_verified;
  return Boolean(owner.phone_verified_at);
}
function maskEmail(value: string) {
  const [name = "", domain = ""] = value.split("@");
  return domain ? `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}` : value;
}
function maskPhone(value: string) {
  return value.length < 7 ? value : `${value.slice(0, 4)} •••• ${value.slice(-3)}`;
}

export function ProfileScreen({ onAction, onOpenNotifications, onOpenSupport, owner, pets, petCount, activityCount, points, rewardFormula, onLogin, onLogout }: ProfileProps) {
  const [page, setPage] = useState<ProfilePage>("main");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (page === "main") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setPage("main");
      return true;
    });
    return () => subscription.remove();
  }, [page]);

  if (!owner) {
    return <Screen><TopHeader title="Akun" subtitle="Pet Parent Slivadoc" onNotification={onOpenNotifications}/><Card style={styles.guestCard}><View style={styles.guestRow}><View style={styles.guestAvatar}><Ionicons name="person-outline" size={25} color={colors.sky600}/></View><View style={styles.guestCopy}><Text style={styles.name}>Yuk, masuk dulu!</Text><Text style={styles.meta}>Simpan profil, kesehatan, dan aktivitas pet dalam satu akun.</Text></View></View><SoftButton label="Masuk sebagai Pet Owner" icon="log-in-outline" onPress={onLogin}/></Card></Screen>;
  }
  if (page === "family") {
    return <FamilyAccessScreen pets={pets} onBack={() => setPage("main")} onAction={onAction} onOpenNotifications={onOpenNotifications}/>;
  }
  if (page === "security") {
    return <><SecurityScreen owner={owner} onBack={() => setPage("main")} onAction={onAction} onOpenNotifications={onOpenNotifications} onRequestLogout={() => setLogoutConfirmOpen(true)}/><LogoutConfirm visible={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => { setLogoutConfirmOpen(false); void onLogout(); }}/></>;
  }

  const initials = owner.full_name.split(" ").map((item) => item[0]).slice(0, 2).join("").toUpperCase();
  const emailVerified = isEmailVerified(owner);
  const phoneVerified = isPhoneVerified(owner);
  const memberSince = new Date(owner.member_since);
  const memberLabel = Number.isNaN(memberSince.valueOf()) ? "pet parent" : `sejak ${memberSince.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`;

  return <>
    <Screen>
      <TopHeader title="Akun & Keluarga" subtitle="Profil pet parent" onNotification={onOpenNotifications}/>
      <Card style={styles.profileCard}>
        <LinearGradient colors={[colors.sky600, "#0A6F9C", colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}><Text style={styles.coverText}>PET PARENT CLUB ✦</Text></LinearGradient>
        <View style={styles.profileRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.profileCopy}><Text style={styles.name}>{owner.full_name}</Text><Text style={styles.meta} numberOfLines={2}>{owner.email} · {memberLabel}</Text><Pill tone="mint">✓ AKUN AKTIF</Pill></View><Pressable accessibilityRole="button" accessibilityLabel="Edit profil" onPress={() => onAction("Edit profil tersedia melalui data akun Slivadoc")} style={({ pressed }) => [styles.edit, pressed && styles.pressed]}><Ionicons name="create-outline" size={16} color={colors.sky600}/></Pressable></View>
        <View style={styles.stats}><Stat value={String(petCount)} label="Hewan"/><Stat value={String(activityCount)} label="Aktivitas"/><Stat value={points.toLocaleString("id-ID")} label="Points"/><Stat value={points > 0 ? "Member" : "Regular"} label="Status" last/></View>
      </Card>

      <SectionTitle eyebrow="SLIVA POINT" title="Saldo dan aturan klaim"/>
      <LinearGradient colors={[colors.sky600, "#0A6F9C", colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.memberCard}>
        <View style={styles.memberTop}><View style={styles.shield}><Text style={styles.shieldText}>✦</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{points.toLocaleString("id-ID")} Sliva Points</Text><Text style={styles.memberNote}>{points ? "Tersedia untuk klaim sesuai syarat" : "Belum ada transaksi lunas"}</Text></View><Pill tone="mint">AKTIF</Pill></View>
        <View style={styles.benefits}>{(rewardFormula?.payment_methods ?? []).map((method) => <Benefit key={method.method} text={method.mode === "fixed" ? `${method.label}: ${method.fixed_points.toLocaleString("id-ID")} poin/transaksi` : `${method.label}: ${method.points_per_unit.toLocaleString("id-ID")} poin per Rp${method.divisor.toLocaleString("id-ID")}`}/>)}<Benefit text={`Nilai poin Rp${(rewardFormula?.point_value_rupiah ?? 0).toLocaleString("id-ID")} · hold ${rewardFormula?.settlement_hold_days ?? 0} hari`}/><Benefit text="Refund otomatis membatalkan poin terkait"/></View>
      </LinearGradient>

      <SectionTitle eyebrow="PREFERENSI" title="Pengaturan akun"/>
      <Card style={styles.settings}>
        <Setting icon="notifications-outline" title="Notifikasi" note="Buka daftar, status baca, dan detail update" onPress={onOpenNotifications}/>
        <Setting icon="people-outline" title="Keluarga & akses" note="Undang anggota dan atur izin setiap pet" onPress={() => setPage("family")}/>
        <Setting icon="shield-checkmark-outline" title="Privasi & keamanan" note="Verifikasi, privasi data, dan sesi perangkat" onPress={() => setPage("security")}/>
        <Setting icon="mail-outline" title="Email login" note={owner.email} onPress={() => setPage("security")} right={<VerificationBadge verified={emailVerified} compact/>}/>
        <Setting icon="call-outline" title="Nomor telepon" note={owner.phone || "Belum diisi"} onPress={() => setPage("security")} right={<VerificationBadge verified={phoneVerified} compact/>} last/>
      </Card>

      <SectionTitle eyebrow="BANTUAN" title="Ada yang bisa kami bantu?"/>
      <Pressable accessibilityRole="button" accessibilityLabel="Chat customer support" onPress={onOpenSupport} style={({ pressed }) => [styles.supportCard, pressed && styles.pressed]}><LinearGradient colors={[colors.sky600, "#0A6F9C"]} style={styles.supportIcon}><Ionicons name="chatbubbles" size={20} color={colors.white}/></LinearGradient><View style={styles.supportCopy}><Text style={styles.supportTitle}>Chat Customer Support</Text><Text style={styles.supportNote}>Hubungi tim Slivadoc langsung dari aplikasi.</Text></View><View style={styles.supportArrow}><Ionicons name="arrow-forward" size={16} color={colors.sky600}/></View></Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Keluar dari akun" onPress={() => setLogoutConfirmOpen(true)} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color={colors.red}/></View><View style={styles.logoutCopy}><Text style={styles.logoutTitle}>Keluar dari akun</Text><Text style={styles.logoutNote}>Akhiri sesi hanya di perangkat ini.</Text></View><Ionicons name="chevron-forward" size={17} color={colors.red}/></Pressable>
      <Text style={styles.version}>Slivadoc Pet Owner Mobile</Text>
    </Screen>
    <LogoutConfirm visible={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => { setLogoutConfirmOpen(false); void onLogout(); }}/>
  </>;
}

function FamilyAccessScreen({ pets, onBack, onAction, onOpenNotifications }: { pets: MobilePet[]; onBack: () => void; onAction: (message: string) => void; onOpenNotifications: () => void }) {
  const [petId, setPetId] = useState(() => pets[0]?.id ?? "");
  const [items, setItems] = useState<MobileFamilyAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("co_parent");
  const [permissions, setPermissions] = useState(["profile", "health", "booking"]);
  const [revokeItem, setRevokeItem] = useState<MobileFamilyAccess>();
  const requestVersion = useRef(0);
  const effectivePetId = pets.some((pet) => pet.id === petId) ? petId : pets[0]?.id ?? "";
  const selectedPet = pets.find((pet) => pet.id === effectivePetId);

  const reload = useCallback(async () => {
    if (!effectivePetId) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await getMobilePetFamily(effectivePetId);
      if (version === requestVersion.current) setItems(response.data);
    } catch (cause) {
      if (version === requestVersion.current) onAction(cause instanceof Error ? cause.message : "Akses keluarga belum dapat dimuat");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [effectivePetId, onAction]);

  useEffect(() => {
    queueMicrotask(() => void reload());
    return () => { requestVersion.current += 1; };
  }, [reload]);

  const invite = async () => {
    if (!selectedPet || name.trim().length < 3 || !email.includes("@") || !permissions.length) { onAction("Lengkapi nama, email, dan minimal satu izin akses"); return; }
    setBusy(true);
    try {
      await inviteMobilePetFamily(selectedPet.id, { email: email.trim().toLowerCase(), full_name: name.trim(), role, permissions });
      setName(""); setEmail(""); await reload(); onAction(`Undangan akses ${selectedPet.name} berhasil dikirim`);
    } catch (cause) { onAction(cause instanceof Error ? cause.message : "Undangan belum dapat dikirim"); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!revokeItem) return;
    setBusy(true);
    try { await revokeMobilePetFamily(revokeItem.id); setRevokeItem(undefined); await reload(); onAction("Akses anggota berhasil dicabut"); }
    catch (cause) { onAction(cause instanceof Error ? cause.message : "Akses belum dapat dicabut"); }
    finally { setBusy(false); }
  };

  return <>
    <Screen>
      <AccountPageHeader eyebrow="AKUN & KELUARGA" title="Keluarga & akses" onBack={onBack} onNotification={onOpenNotifications}/>
      <LinearGradient colors={["#EAF8FF", "#EEFBF7", "#F3EFFF"]} style={styles.detailHero}><View style={styles.detailHeroIcon}><Ionicons name="people" size={22} color={colors.sky600}/></View><View style={styles.detailHeroCopy}><Text style={styles.detailHeroTitle}>Rawat bareng, tetap terkontrol</Text><Text style={styles.detailHeroNote}>Pilih pet, undang orang terpercaya, lalu tentukan data yang boleh mereka akses.</Text></View></LinearGradient>

      <SectionTitle eyebrow="PILIH PET" title="Akses berlaku untuk"/>
      {pets.length ? <View style={styles.petSelector}>{pets.map((pet) => { const active = pet.id === selectedPet?.id; return <Pressable key={pet.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setPetId(pet.id)} style={({ pressed }) => [styles.petChip, active && styles.petChipActive, pressed && styles.pressed]}><Ionicons name="paw-outline" size={17} color={active ? colors.sky600 : colors.muted}/><Text style={[styles.petChipText, active && styles.petChipTextActive]}>{pet.name}</Text>{active ? <Ionicons name="checkmark-circle" size={16} color={colors.sky600}/> : null}</Pressable>; })}</View> : <Card style={styles.emptyCard}><Ionicons name="paw-outline" size={24} color={colors.sky600}/><Text style={styles.emptyTitle}>Tambahkan pet lebih dulu</Text><Text style={styles.emptyNote}>Akses keluarga selalu diatur terpisah untuk setiap pet.</Text></Card>}

      {selectedPet ? <>
        <SectionTitle eyebrow="ORANG TERPERCAYA" title={`Akses ${selectedPet.name}`}/>
        <Card style={styles.familyList}>{loading ? <View style={styles.loadingRow}><ActivityIndicator color={colors.sky600}/><Text style={styles.loadingText}>Memuat akses keluarga…</Text></View> : items.length ? items.map((item, index) => <FamilyMember key={item.id} item={item} last={index === items.length - 1} onRevoke={item.role === "owner" ? undefined : () => setRevokeItem(item)}/>) : <View style={styles.emptyList}><View style={styles.emptyListIcon}><Ionicons name="person-add-outline" size={20} color={colors.sky600}/></View><View style={styles.emptyListCopy}><Text style={styles.emptyTitle}>Belum ada anggota</Text><Text style={styles.emptyNote}>Undangan pertama untuk {selectedPet.name} akan tampil di sini.</Text></View></View>}</Card>

        <SectionTitle eyebrow="UNDANG ANGGOTA" title="Atur akses baru"/>
        <Card style={styles.inviteCard}>
          <FieldLabel label="Nama lengkap"/><TextInput value={name} onChangeText={setName} placeholder="Nama anggota keluarga" placeholderTextColor={colors.muted} style={styles.input}/>
          <FieldLabel label="Email"/><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="nama@email.com" placeholderTextColor={colors.muted} style={styles.input}/>
          <FieldLabel label="Peran"/><View style={styles.roleGrid}>{familyRoles.map((item) => { const active = role === item.value; return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setRole(item.value)} style={({ pressed }) => [styles.roleChip, active && styles.roleChipActive, pressed && styles.pressed]}><Ionicons name={item.icon} size={14} color={active ? colors.sky600 : colors.muted}/><Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{item.label}</Text></Pressable>; })}</View>
          <FieldLabel label="Izin akses"/><View style={styles.permissionList}>{familyPermissions.map((item, index) => { const enabled = permissions.includes(item.value); return <View key={item.value} style={[styles.permissionRow, index === familyPermissions.length - 1 && styles.noBorder]}><View style={styles.permissionCopy}><Text style={styles.permissionTitle}>{item.label}</Text><Text style={styles.permissionNote}>{item.note}</Text></View><Switch accessibilityLabel={`Izin ${item.label}`} value={enabled} onValueChange={() => setPermissions((current) => enabled ? current.filter((value) => value !== item.value) : [...current, item.value])} trackColor={{ false: "#DCE7ED", true: colors.sky100 }} thumbColor={enabled ? colors.sky500 : "#FFFFFF"}/></View>; })}</View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void invite()} style={({ pressed }) => [styles.primaryAction, busy && styles.disabled, pressed && styles.pressed]}>{busy ? <ActivityIndicator size="small" color={colors.white}/> : <Ionicons name="paper-plane" size={16} color={colors.white}/>}<Text style={styles.primaryActionText}>{busy ? "Memproses…" : "Kirim undangan"}</Text></Pressable>
          <Text style={styles.formHint}>Penerima hanya mendapat izin yang kamu aktifkan untuk pet ini.</Text>
        </Card>
      </> : null}
    </Screen>
    <ConfirmModal visible={Boolean(revokeItem)} eyebrow="CABUT AKSES" title={`Hapus akses ${revokeItem?.full_name ?? "anggota"}?`} note={`Akses ke data ${selectedPet?.name ?? "pet"} akan langsung dihentikan.`} cancelLabel="Batal" confirmLabel={busy ? "Memproses…" : "Ya, cabut akses"} busy={busy} onCancel={() => setRevokeItem(undefined)} onConfirm={() => void revoke()}/>
  </>;
}

function SecurityScreen({ owner, onBack, onAction, onOpenNotifications, onRequestLogout }: { owner: MobileOwner; onBack: () => void; onAction: (message: string) => void; onOpenNotifications: () => void; onRequestLogout: () => void }) {
  const [maskSensitive, setMaskSensitive] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const emailVerified = isEmailVerified(owner);
  const phoneVerified = isPhoneVerified(owner);
  const verifiedCount = Number(emailVerified) + Number(phoneVerified);
  return <Screen>
    <AccountPageHeader eyebrow="PENGATURAN AKUN" title="Privasi & keamanan" onBack={onBack} onNotification={onOpenNotifications}/>
    <LinearGradient colors={["#EBF8FF", "#ECFBF7", "#F2EFFF"]} style={styles.securityHero}><View style={styles.securityScore}><Text style={styles.securityScoreValue}>{verifiedCount}/2</Text><Text style={styles.securityScoreLabel}>terverifikasi</Text></View><View style={styles.detailHeroCopy}><Text style={styles.detailHeroTitle}>{verifiedCount === 2 ? "Akunmu terlindungi ✨" : "Tinggal sedikit lagi"}</Text><Text style={styles.detailHeroNote}>{verifiedCount === 2 ? "Kontak login dan pemulihan akun sudah terverifikasi." : "Verifikasi kontak yang belum aktif agar pemulihan akun lebih aman."}</Text></View></LinearGradient>

    <SectionTitle eyebrow="IDENTITAS LOGIN" title="Status verifikasi"/>
    <Card style={styles.verificationCard}><AccountVerificationRow icon="mail" title="Email login" value={maskSensitive ? maskEmail(owner.email) : owner.email} verified={emailVerified}/><AccountVerificationRow icon="call" title="Nomor telepon" value={owner.phone ? (maskSensitive ? maskPhone(owner.phone) : owner.phone) : "Belum diisi"} verified={phoneVerified} last/></Card>

    <SectionTitle eyebrow="KONTROL PRIVASI" title="Data di perangkat ini"/>
    <Card style={styles.controlCard}><ControlRow icon="eye-off-outline" title="Samarkan data sensitif" note="Sembunyikan sebagian email dan nomor di halaman ini." value={maskSensitive} onChange={setMaskSensitive}/><ControlRow icon="warning-outline" title="Notifikasi keamanan" note="Tampilkan update aktivitas akun yang penting." value={securityAlerts} onChange={(value) => { setSecurityAlerts(value); onAction(value ? "Notifikasi keamanan diaktifkan" : "Notifikasi keamanan dinonaktifkan di perangkat ini"); }} last/></Card>

    <SectionTitle eyebrow="AKTIVITAS KEAMANAN" title="Pantau akun"/>
    <Pressable accessibilityRole="button" onPress={onOpenNotifications} style={({ pressed }) => [styles.securityAction, pressed && styles.pressed]}><View style={styles.securityActionIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.sky600}/></View><View style={styles.securityActionCopy}><Text style={styles.securityActionTitle}>Tinjau notifikasi keamanan</Text><Text style={styles.securityActionNote}>Buka riwayat update dan lihat detail aktivitas.</Text></View><Ionicons name="arrow-forward" size={16} color={colors.sky600}/></Pressable>

    <SectionTitle eyebrow="SESI AKTIF" title="Perangkat saat ini"/>
    <Card style={styles.sessionCard}><View style={styles.sessionIcon}><Ionicons name="phone-portrait-outline" size={20} color="#13856F"/></View><View style={styles.sessionCopy}><Text style={styles.sessionTitle}>Aplikasi Slivadoc Mobile</Text><Text style={styles.sessionNote}>Sesi ini · aktif sekarang</Text></View><View style={styles.activeDot}/></Card>
    <Text style={styles.sessionHint}>Keluar akan menghapus token login aman hanya dari perangkat ini. Data akun dan profil pet tetap tersimpan.</Text>
    <Pressable accessibilityRole="button" onPress={onRequestLogout} style={({ pressed }) => [styles.logoutButton, styles.securityLogout, pressed && styles.pressed]}><View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color={colors.red}/></View><View style={styles.logoutCopy}><Text style={styles.logoutTitle}>Keluar dari perangkat ini</Text><Text style={styles.logoutNote}>Kamu bisa masuk kembali kapan saja.</Text></View><Ionicons name="chevron-forward" size={17} color={colors.red}/></Pressable>
  </Screen>;
}

function AccountPageHeader({ eyebrow, title, onBack, onNotification }: { eyebrow: string; title: string; onBack: () => void; onNotification: () => void }) {
  return <View style={styles.detailHeader}><Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.navy}/></Pressable><View style={styles.detailHeaderCopy}><Text style={styles.detailEyebrow}>{eyebrow}</Text><Text style={styles.detailTitle} numberOfLines={1}>{title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" onPress={onNotification} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Ionicons name="notifications-outline" size={19} color={colors.navy}/><View style={styles.headerNotificationDot}/></Pressable></View>;
}
function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) { return <View style={[styles.stat, last && styles.statLast]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Benefit({ text }: { text: string }) { return <View style={styles.benefit}><View style={styles.benefitCheck}><Ionicons name="checkmark" size={10} color={colors.sky600}/></View><Text style={styles.benefitText}>{text}</Text></View>; }
function Setting({ icon, title, note, onPress, right, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; onPress?: () => void; right?: ReactNode; last?: boolean }) { return <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.setting, last && styles.noBorder, pressed && styles.pressed]}><View style={styles.settingIcon}><Ionicons name={icon} size={19} color={colors.sky600}/></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingNote} numberOfLines={2}>{note}</Text></View>{right ?? <Ionicons name="chevron-forward" size={17} color={colors.muted}/>}</Pressable>; }
function VerificationBadge({ verified, compact }: { verified: boolean; compact?: boolean }) { return <View style={[styles.verificationBadge, verified ? styles.verificationBadgeOn : styles.verificationBadgeOff, compact && styles.verificationBadgeCompact]}><Ionicons name={verified ? "checkmark-circle" : "alert-circle-outline"} size={compact ? 14 : 15} color={verified ? colors.sky600 : colors.yellow}/>{!compact || !verified ? <Text style={[styles.verificationBadgeText, verified ? styles.verificationTextOn : styles.verificationTextOff]}>{verified ? "Terverifikasi" : "Belum verifikasi"}</Text> : null}</View>; }
function FamilyMember({ item, last, onRevoke }: { item: MobileFamilyAccess; last?: boolean; onRevoke?: () => void }) {
  const initials = item.full_name.split(" ").map((value) => value[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = familyRoles.find((role) => role.value === item.role)?.label ?? (item.role === "owner" ? "Pemilik" : item.role);
  return <View style={[styles.familyMember, last && styles.noBorder]}><View style={styles.familyAvatar}><Text style={styles.familyAvatarText}>{initials || "?"}</Text></View><View style={styles.familyMemberCopy}><View style={styles.familyMemberHeading}><Text style={styles.familyMemberName}>{item.full_name}</Text><View style={styles.familyStatus}><Text style={styles.familyStatusText}>{item.status}</Text></View></View><Text style={styles.familyMemberMeta} numberOfLines={1}>{item.email} · {roleLabel}</Text><Text style={styles.familyPermissionText}>{item.permissions.length ? item.permissions.map((permission) => familyPermissions.find((value) => value.value === permission)?.label ?? permission).join(" · ") : "Tanpa izin aktif"}</Text></View>{onRevoke ? <Pressable accessibilityRole="button" accessibilityLabel={`Cabut akses ${item.full_name}`} onPress={onRevoke} style={({ pressed }) => [styles.revokeButton, pressed && styles.pressed]}><Ionicons name="trash-outline" size={16} color={colors.red}/></Pressable> : <Ionicons name="shield-checkmark" size={17} color={colors.mint}/>}</View>;
}
function FieldLabel({ label }: { label: string }) { return <Text style={styles.fieldLabel}>{label}</Text>; }
function AccountVerificationRow({ icon, title, value, verified, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; verified: boolean; last?: boolean }) { return <View style={[styles.accountRow, last && styles.noBorder]}><View style={styles.accountIcon}><Ionicons name={icon} size={18} color={colors.sky600}/></View><View style={styles.accountCopy}><Text style={styles.accountTitle}>{title}</Text><Text style={styles.accountValue} numberOfLines={1}>{value}</Text></View><VerificationBadge verified={verified}/></View>; }
function ControlRow({ icon, title, note, value, onChange, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; value: boolean; onChange: (value: boolean) => void; last?: boolean }) { return <View style={[styles.controlRow, last && styles.noBorder]}><View style={styles.controlIcon}><Ionicons name={icon} size={18} color={colors.violet}/></View><View style={styles.controlCopy}><Text style={styles.controlTitle}>{title}</Text><Text style={styles.controlNote}>{note}</Text></View><Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: "#DCE7ED", true: colors.sky100 }} thumbColor={value ? colors.sky500 : "#FFFFFF"}/></View>; }
function ConfirmModal({ visible, eyebrow, title, note, cancelLabel, confirmLabel, busy, onCancel, onConfirm }: { visible: boolean; eyebrow: string; title: string; note: string; cancelLabel: string; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><Pressable style={styles.confirmBackdrop} onPress={onCancel}><Pressable style={styles.confirmCard} onPress={(event) => event.stopPropagation()}><View style={styles.confirmIcon}><Ionicons name="shield-outline" size={23} color={colors.red}/></View><Text style={styles.confirmEyebrow}>{eyebrow}</Text><Text style={styles.confirmTitle}>{title}</Text><Text style={styles.confirmNote}>{note}</Text><View style={styles.confirmActions}><Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelButtonText}>{cancelLabel}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={({ pressed }) => [styles.dangerButton, busy && styles.disabled, pressed && styles.pressed]}><Text style={styles.dangerButtonText}>{confirmLabel}</Text></Pressable></View></Pressable></Pressable></Modal>; }
function LogoutConfirm({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) { return <ConfirmModal visible={visible} eyebrow="KONFIRMASI KELUAR" title="Keluar dari akun?" note="Sesi Slivadoc di perangkat ini akan diakhiri. Data dan profil pet kamu tetap aman." cancelLabel="Tetap masuk" confirmLabel="Ya, keluar" onCancel={onCancel} onConfirm={onConfirm}/>; }

const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.58 }, noBorder: { borderBottomWidth: 0 },
  guestCard: { marginTop: 10, padding: 14 }, guestRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }, guestAvatar: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.sky50 }, guestCopy: { minWidth: 0, flex: 1 },
  profileCard: { marginTop: 8, overflow: "hidden" }, cover: { height: 68, padding: 13 }, coverText: { color: "rgba(255,255,255,.9)", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, profileRow: { flexDirection: "row", alignItems: "center", marginTop: -28, paddingHorizontal: 13, paddingBottom: 12 }, avatar: { width: 64, height: 64, borderRadius: 21, borderWidth: 4, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky100 }, avatarText: { color: colors.sky600, fontSize: 20, fontWeight: "900" }, profileCopy: { minWidth: 0, flex: 1, marginLeft: 9, paddingTop: 26, alignItems: "flex-start" }, name: { color: colors.navy, fontSize: typography.cardTitle, lineHeight: 20, fontWeight: "900" }, meta: { marginTop: 2, marginBottom: 5, color: colors.muted, fontSize: typography.caption, lineHeight: 14 }, edit: { marginTop: 26, width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 }, stats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line }, stat: { flex: 1, paddingVertical: 9, borderRightWidth: 1, borderRightColor: colors.line, alignItems: "center" }, statLast: { borderRightWidth: 0 }, statValue: { color: colors.navy, fontSize: 12, fontWeight: "900" }, statLabel: { marginTop: 2, color: colors.muted, fontSize: 8 },
  memberCard: { padding: 14, borderRadius: 18, ...shadow }, memberTop: { flexDirection: "row", alignItems: "center", gap: 8 }, shield: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.18)" }, shieldText: { color: colors.white }, memberCopy: { minWidth: 0, flex: 1 }, memberName: { color: colors.white, fontSize: 13, fontWeight: "900" }, memberNote: { marginTop: 2, color: "rgba(255,255,255,.9)", fontSize: 9 }, benefits: { gap: 6, marginTop: 10 }, benefit: { flexDirection: "row", alignItems: "center", gap: 6 }, benefitCheck: { width: 17, height: 17, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, benefitText: { flex: 1, color: "rgba(255,255,255,.9)", fontSize: 10, lineHeight: 14 },
  settings: { paddingHorizontal: 11 }, setting: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line }, settingIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 }, settingCopy: { minWidth: 0, flex: 1 }, settingTitle: { color: colors.navy, fontSize: 12, fontWeight: "800" }, settingNote: { marginTop: 2, color: colors.muted, fontSize: 9, lineHeight: 13 },
  verificationBadge: { maxWidth: 104, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9 }, verificationBadgeOn: { backgroundColor: colors.sky50 }, verificationBadgeOff: { backgroundColor: colors.yellow50 }, verificationBadgeCompact: { paddingHorizontal: 5 }, verificationBadgeText: { fontSize: 8, fontWeight: "900" }, verificationTextOn: { color: colors.sky600 }, verificationTextOff: { color: colors.yellow },
  supportCard: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 18, backgroundColor: colors.white, ...shadow }, supportIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15 }, supportCopy: { minWidth: 0, flex: 1 }, supportTitle: { color: colors.navy, fontSize: 13, fontWeight: "900" }, supportNote: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 14 }, supportArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.sky50 },
  logoutButton: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, padding: 12, borderWidth: 1, borderColor: "#FFD5DD", borderRadius: 17, backgroundColor: colors.red50 }, logoutIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.white }, logoutCopy: { minWidth: 0, flex: 1 }, logoutTitle: { color: colors.red, fontSize: 12, fontWeight: "900" }, logoutNote: { marginTop: 3, color: "#82535C", fontSize: 9 }, version: { marginTop: 11, color: colors.muted, fontSize: 9, textAlign: "center" },
  detailHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }, detailHeaderCopy: { minWidth: 0, flex: 1 }, detailEyebrow: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, detailTitle: { marginTop: 3, color: colors.navy, fontSize: typography.cardTitle, lineHeight: 20, fontWeight: "900" }, headerButton: { position: "relative", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white }, headerNotificationDot: { position: "absolute", top: 7, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  detailHero: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderWidth: 1, borderColor: colors.sky100, borderRadius: 19 }, detailHeroIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(255,255,255,.82)" }, detailHeroCopy: { minWidth: 0, flex: 1 }, detailHeroTitle: { color: colors.navy, fontSize: 14, lineHeight: 19, fontWeight: "900" }, detailHeroNote: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  petSelector: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, petChip: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white }, petChipActive: { borderColor: colors.sky400, backgroundColor: colors.sky50 }, petChipEmoji: { fontSize: 17 }, petChipText: { color: colors.text, fontSize: 11, fontWeight: "800" }, petChipTextActive: { color: colors.sky600 },
  emptyCard: { alignItems: "center", gap: 5, padding: 22 }, emptyTitle: { color: colors.navy, fontSize: 12, fontWeight: "900" }, emptyNote: { marginTop: 3, color: colors.muted, fontSize: 9, lineHeight: 14 }, familyList: { paddingHorizontal: 12 }, loadingRow: { minHeight: 82, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, loadingText: { color: colors.muted, fontSize: 10 }, emptyList: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 10 }, emptyListIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky50 }, emptyListCopy: { minWidth: 0, flex: 1 },
  familyMember: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line }, familyAvatar: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.violet50 }, familyAvatarText: { color: colors.violet, fontSize: 12, fontWeight: "900" }, familyMemberCopy: { minWidth: 0, flex: 1 }, familyMemberHeading: { flexDirection: "row", alignItems: "center", gap: 5 }, familyMemberName: { minWidth: 0, flexShrink: 1, color: colors.navy, fontSize: 11, fontWeight: "900" }, familyStatus: { paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.mint50 }, familyStatusText: { color: "#13856F", fontSize: 7, fontWeight: "900", textTransform: "uppercase" }, familyMemberMeta: { marginTop: 2, color: colors.muted, fontSize: 9 }, familyPermissionText: { marginTop: 3, color: colors.sky600, fontSize: 8, fontWeight: "700" }, revokeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.red50 },
  inviteCard: { padding: 13 }, fieldLabel: { marginTop: 10, marginBottom: 6, color: colors.navy, fontSize: 10, fontWeight: "900" }, input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: "#FBFDFE", color: colors.text, fontSize: typography.input }, roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, roleChip: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: "#FBFDFE" }, roleChipActive: { borderColor: colors.sky400, backgroundColor: colors.sky50 }, roleChipText: { color: colors.muted, fontSize: 9, fontWeight: "800" }, roleChipTextActive: { color: colors.sky600 }, permissionList: { overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: 14 }, permissionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, permissionCopy: { minWidth: 0, flex: 1 }, permissionTitle: { color: colors.navy, fontSize: 10, fontWeight: "800" }, permissionNote: { marginTop: 2, color: colors.muted, fontSize: 8 }, primaryAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 13, borderRadius: 13, backgroundColor: colors.sky600, ...shadow }, primaryActionText: { color: colors.white, fontSize: 12, fontWeight: "900" }, formHint: { marginTop: 8, color: colors.muted, fontSize: 8, lineHeight: 12, textAlign: "center" },
  securityHero: { flexDirection: "row", alignItems: "center", gap: 13, padding: 14, borderWidth: 1, borderColor: colors.sky100, borderRadius: 19 }, securityScore: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: colors.sky400, borderRadius: 31, backgroundColor: colors.white }, securityScoreValue: { color: colors.navy, fontSize: 16, fontWeight: "900" }, securityScoreLabel: { color: colors.muted, fontSize: 7, fontWeight: "700" }, verificationCard: { paddingHorizontal: 12 }, accountRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line }, accountIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.sky50 }, accountCopy: { minWidth: 0, flex: 1 }, accountTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" }, accountValue: { marginTop: 3, color: colors.muted, fontSize: 9 },
  controlCard: { paddingHorizontal: 12 }, controlRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line }, controlIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.violet50 }, controlCopy: { minWidth: 0, flex: 1 }, controlTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" }, controlNote: { marginTop: 3, color: colors.muted, fontSize: 8, lineHeight: 12 }, securityAction: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 17, backgroundColor: colors.white, ...shadow }, securityActionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky50 }, securityActionCopy: { minWidth: 0, flex: 1 }, securityActionTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" }, securityActionNote: { marginTop: 3, color: colors.muted, fontSize: 9, lineHeight: 13 },
  sessionCard: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }, sessionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.mint50 }, sessionCopy: { minWidth: 0, flex: 1 }, sessionTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" }, sessionNote: { marginTop: 3, color: colors.muted, fontSize: 9 }, activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.mint }, sessionHint: { marginTop: 7, paddingHorizontal: 4, color: colors.muted, fontSize: 8, lineHeight: 13 }, securityLogout: { marginBottom: 8 },
  confirmBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(14,32,55,.48)" }, confirmCard: { width: "100%", maxWidth: 390, padding: 18, borderRadius: 22, backgroundColor: colors.white, ...shadow }, confirmIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.red50 }, confirmEyebrow: { marginTop: 14, color: colors.red, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, confirmTitle: { marginTop: 5, color: colors.navy, fontSize: 18, lineHeight: 23, fontWeight: "900" }, confirmNote: { marginTop: 7, color: colors.muted, fontSize: 11, lineHeight: 17 }, confirmActions: { flexDirection: "row", gap: 8, marginTop: 18 }, cancelButton: { minHeight: 42, flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white }, cancelButtonText: { color: colors.text, fontSize: 11, fontWeight: "900" }, dangerButton: { minHeight: 42, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.red }, dangerButtonText: { color: colors.white, fontSize: 11, fontWeight: "900" },
});
