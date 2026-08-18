import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, IconAction, LoadingScreen, PageHeader, PrimaryButton, StatusPill } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Invoice, invoiceBalance, money } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

export default function SalesScreen() {
  const { data, loading } = useCRM();
  const router = useRouter();
  if (loading) return <ScreenContainer><LoadingScreen /></ScreenContainer>;
  return <ScreenContainer><FlatList data={data.invoices} keyExtractor={(invoice) => invoice.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<PageHeader eyebrow="Orders and invoices" title="Sales" action={<IconAction label="New sale" icon="add-shopping-cart" onPress={() => router.push("/sale/new")} />} />} renderItem={({ item }) => <InvoiceCard invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />} ItemSeparatorComponent={() => <View style={styles.separator} />} ListEmptyComponent={<EmptyState icon="receipt-long" title="No invoices yet" detail="Create a sale to automatically build a professional customer invoice and reduce stock." action={<PrimaryButton title="Create first sale" icon="add-shopping-cart" onPress={() => router.push("/sale/new")} />} />} /></ScreenContainer>;
}

function InvoiceCard({ invoice, onPress }: { invoice: Invoice; onPress: () => void }) {
  const { data } = useCRM();
  const colors = useColors();
  const customer = data.customers.find((entry) => entry.id === invoice.customerId);
  return <TouchableOpacity onPress={onPress} style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.invoiceTop}><View><Text style={[styles.invoiceNumber, { color: colors.foreground }]}>{invoice.invoiceNumber}</Text><Text style={[styles.customer, { color: colors.muted }]}>{customer?.name ?? "Customer removed"}</Text></View><StatusPill status={invoice.status} /></View><View style={[styles.rule, { backgroundColor: colors.border }]} /><View style={styles.invoiceBottom}><View><Text style={[styles.balanceLabel, { color: colors.muted }]}>Balance</Text><Text style={[styles.balance, { color: invoice.status === "paid" ? colors.success : colors.foreground }]}>{money(invoiceBalance(invoice))}</Text></View><Text style={[styles.total, { color: colors.muted }]}>{money(invoice.total)}</Text></View></TouchableOpacity>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 32, flexGrow: 1 }, separator: { height: 10 }, invoiceCard: { borderWidth: 1, borderRadius: 19, padding: 15 }, invoiceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, invoiceNumber: { fontSize: 16, fontWeight: "800" }, customer: { fontSize: 12, marginTop: 4 }, rule: { height: 1, marginVertical: 14 }, invoiceBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, balanceLabel: { fontSize: 11, fontWeight: "700" }, balance: { fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 2 }, total: { fontSize: 12, fontWeight: "700" } });
