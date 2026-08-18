import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { money } from "@/lib/crm-domain";

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function IconAction({ icon, onPress, label }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; onPress: () => void; label: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity accessibilityLabel={label} onPress={onPress} style={[styles.iconAction, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialIcons name={icon} color={colors.foreground} size={21} />
    </TouchableOpacity>
  );
}

export function PrimaryButton({ title, onPress, icon = "add", disabled = false }: { title: string; onPress: () => void; icon?: React.ComponentProps<typeof MaterialIcons>["name"]; disabled?: boolean }) {
  const colors = useColors();
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primaryButton, { backgroundColor: colors.primary }, disabled && styles.disabled]}>
      <MaterialIcons name={icon} color="#18130B" size={20} />
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, icon = "chevron-right" }: { title: string; onPress: () => void; icon?: React.ComponentProps<typeof MaterialIcons>["name"] }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{title}</Text>
      <MaterialIcons name={icon} color={colors.muted} size={20} />
    </TouchableOpacity>
  );
}

export function MetricCard({ label, value, tone = "neutral", helper }: { label: string; value: number; tone?: "neutral" | "gold" | "success" | "alert"; helper?: string }) {
  const colors = useColors();
  const toneColor = tone === "gold" ? colors.primary : tone === "success" ? colors.success : tone === "alert" ? colors.error : colors.foreground;
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: toneColor }]}>{money(value)}</Text>
      {helper ? <Text style={[styles.metricHelper, { color: colors.muted }]}>{helper}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const colors = useColors();
  return <View style={styles.sectionTitle}><Text style={[styles.sectionText, { color: colors.foreground }]}>{title}</Text>{action}</View>;
}

export function EmptyState({ icon = "auto-awesome", title, detail, action }: { icon?: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}24` }]}><MaterialIcons name={icon} size={24} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: colors.muted }]}>{detail}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors = useColors();
  const normalized = status.replace("-", " ");
  const palette = status === "paid" || status === "delivered" ? { bg: `${colors.success}20`, fg: colors.success } : status === "overdue" || status === "failed" ? { bg: `${colors.error}18`, fg: colors.error } : status === "out" || status === "part-paid" ? { bg: `${colors.warning}20`, fg: colors.warning } : { bg: `${colors.primary}1E`, fg: colors.primary };
  return <View style={[styles.statusPill, { backgroundColor: palette.bg }]}><Text style={[styles.statusText, { color: palette.fg }]}>{normalized}</Text></View>;
}

export function FormInput({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad" | "numeric" | "decimal-pad"; multiline?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.inputMultiline, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
    </View>
  );
}

export function LoadingScreen() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Opening your records…</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 4 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.6 },
  iconAction: { height: 42, width: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  primaryButton: { minHeight: 50, paddingHorizontal: 18, borderRadius: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#18130B", fontWeight: "800", fontSize: 15 },
  secondaryButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secondaryButtonText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  metricCard: { borderWidth: 1, borderRadius: 19, padding: 15, flexGrow: 1, minWidth: "47%" },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  metricValue: { fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -0.3, marginTop: 6 },
  metricHelper: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 24 },
  sectionText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  emptyState: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: "center" },
  emptyIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyDetail: { marginTop: 5, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  emptyAction: { width: "100%", marginTop: 18 },
  statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { marginBottom: 15 },
  inputLabel: { fontSize: 13, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 49, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  inputMultiline: { minHeight: 94, paddingTop: 13, textAlignVertical: "top" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600" },
});
