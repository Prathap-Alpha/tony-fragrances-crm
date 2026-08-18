import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, IconAction, LoadingScreen, MetricCard, PageHeader, PrimaryButton, SectionTitle, StatusPill } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { invoiceBalance, money } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

export default function FinanceScreen() {
  const { data, loading, summary } = useCRM();
  const colors = useColors();
  const router = useRouter();
  const openInvoices = data.invoices.filter((invoice) => invoice.status !== "paid");
  if (loading) return <ScreenContainer><LoadingScreen /></ScreenContainer>;
  return <ScreenContainer><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><PageHeader eyebrow="Cashbook and profitability" title="Finance" action={<IconAction label="Record expense" icon="add-card" onPress={() => router.push("/expense/new")} />} /><View style={styles.metrics}><MetricCard label="Sales" value={summary.sales} tone="gold" helper="All invoices" /><MetricCard label="Expenses" value={summary.expenses} tone="alert" helper="Business costs" /><MetricCard label="Gross profit" value={summary.grossProfit} tone="success" helper="Before expenses" /><MetricCard label="Net position" value={summary.netProfit} helper="After expenses" /></View><SectionTitle title="Money to collect" />{openInvoices.length === 0 ? <EmptyState icon="verified" title="No outstanding invoices" detail="All recorded invoices are fully paid." /> : <View style={styles.stack}>{openInvoices.map((invoice) => { const customer = data.customers.find((entry) => entry.id === invoice.customerId); return <TouchableOpacity key={invoice.id} onPress={() => router.push(`/invoice/${invoice.id}`)} style={[styles.openInvoice, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.openName, { color: colors.foreground }]}>{customer?.name ?? "Customer"}</Text><Text style={[styles.openRef, { color: colors.muted }]}>{invoice.invoiceNumber} · {money(invoiceBalance(invoice))}</Text></View><StatusPill status={invoice.status} /></TouchableOpacity>; })}</View>}<SectionTitle title="Expense record" />{data.expenses.length === 0 ? <EmptyState icon="payments" title="No expenses recorded" detail="Record deliveries, packaging, rent, advertising, or any other business cost." action={<PrimaryButton title="Record expense" icon="add" onPress={() => router.push("/expense/new")} />} /> : <View style={styles.stack}>{data.expenses.slice(0, 5).map((expense) => <View key={expense.id} style={[styles.expense, { backgroundColor: colors.surface, borderColor: colors.border }]}><View><Text style={[styles.expenseName, { color: colors.foreground }]}>{expense.category}</Text><Text style={[styles.openRef, { color: colors.muted }]}>{expense.description || expense.method}</Text></View><Text style={[styles.expenseAmount, { color: colors.error }]}>{money(expense.amount)}</Text></View>)}</View>}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 32 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, stack: { gap: 10 }, openInvoice: { minHeight: 70, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }, openName: { fontSize: 15, fontWeight: "800" }, openRef: { fontSize: 12, marginTop: 4 }, expense: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, expenseName: { fontSize: 14, fontWeight: "800" }, expenseAmount: { fontSize: 15, fontWeight: "800" } });
