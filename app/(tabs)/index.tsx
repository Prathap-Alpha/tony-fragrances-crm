import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, MetricCard, PageHeader, PrimaryButton, SecondaryButton, SectionTitle } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCRM } from "@/lib/crm-store";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data, loading, summary } = useCRM();
  const activeDeliveries = data.deliveries.filter((delivery) => delivery.status !== "delivered" && delivery.status !== "failed").length;

  if (loading) return <ScreenContainer><View style={styles.loading}><Text style={{ color: colors.muted }}>Loading your records…</Text></View></ScreenContainer>;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Tony Fragrances" title="Good day" />
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.monogram, { borderColor: colors.primary }]}><Text style={[styles.monogramText, { color: colors.primary }]}>TF</Text></View>
            <Text style={styles.heroEyebrow}>BUSINESS OVERVIEW</Text>
          </View>
          <Text style={styles.heroTitle}>{data.businessName}</Text>
          <Text style={styles.heroDetail}>{data.customers.length === 0 ? "Start by saving your first customer and perfume." : `${data.customers.length} customer${data.customers.length === 1 ? "" : "s"} in your private CRM.`}</Text>
          <View style={styles.heroActions}>
            <View style={styles.heroAction}><PrimaryButton title="New sale" icon="add-shopping-cart" onPress={() => router.push("/sale/new")} /></View>
            <View style={styles.heroAction}><SecondaryButton title="Add customer" icon="person-add" onPress={() => router.push("/customer/new")} /></View>
          </View>
        </View>

        <SectionTitle title="Cash position" />
        <View style={styles.metricGrid}>
          <MetricCard label="Collected" value={summary.collected} tone="success" helper="Payments received" />
          <MetricCard label="To collect" value={summary.receivables} tone="alert" helper="Open customer balances" />
          <MetricCard label="Sales invoiced" value={summary.sales} tone="gold" helper="All recorded sales" />
          <MetricCard label="Net position" value={summary.netProfit} helper="After stock and expenses" />
        </View>

        <SectionTitle title="Today’s operations" />
        <View style={[styles.operationsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.operationsIcon, { backgroundColor: `${colors.primary}1F` }]}><MaterialIcons name="local-shipping" color={colors.primary} size={22} /></View>
          <View style={styles.operationsText}><Text style={[styles.operationsTitle, { color: colors.foreground }]}>{activeDeliveries} active deliver{activeDeliveries === 1 ? "y" : "ies"}</Text><Text style={[styles.operationsDetail, { color: colors.muted }]}>See customer locations, phone numbers, and delivery status in one place.</Text></View>
          <View style={styles.openAction}><SecondaryButton title="Open" onPress={() => router.push("/deliveries")} /></View>
        </View>

        <SectionTitle title="Next best action" />
        {data.products.length === 0 ? (
          <EmptyState icon="inventory-2" title="Add your perfume catalogue" detail="Save cost, selling price, and available stock before recording the first sale." action={<PrimaryButton title="Add perfume" icon="add" onPress={() => router.push("/inventory")} />} />
        ) : data.invoices.filter((invoice) => invoice.status !== "paid").length > 0 ? (
          <EmptyState icon="receipt-long" title="Follow up unpaid invoices" detail="Record collections so balances and cash records stay accurate." action={<PrimaryButton title="Review invoices" icon="arrow-forward" onPress={() => router.push("/(tabs)/sales")} />} />
        ) : (
          <EmptyState icon="auto-awesome" title="Everything is up to date" detail="Customer details, stock, deliveries, and money records are all kept on this device." />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: { borderRadius: 24, padding: 20, overflow: "hidden", backgroundColor: "#17130F" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  monogram: { width: 37, height: 37, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  monogramText: { fontSize: 14, fontWeight: "800", letterSpacing: -1 },
  heroEyebrow: { color: "#E4D7C3", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { marginTop: 25, color: "#FFF9F0", fontSize: 26, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5 },
  heroDetail: { marginTop: 7, color: "#C8BBAB", fontSize: 13, lineHeight: 19, maxWidth: 290 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  heroAction: { flex: 1 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  operationsCard: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  operationsIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  operationsText: { flex: 1 },
  operationsTitle: { fontSize: 14, fontWeight: "800" },
  operationsDetail: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  openAction: { width: 72 },
});
