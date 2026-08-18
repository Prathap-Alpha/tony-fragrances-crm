import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FormInput, IconAction, PageHeader, PrimaryButton, SectionTitle } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PaymentMethod } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

const methods: PaymentMethod[] = ["Cash", "Mobile Money", "Bank Transfer", "Card"];

export default function NewExpenseScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addExpense } = useCRM();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const save = () => {
    const value = Number(amount);
    if (!category.trim() || !Number.isFinite(value) || value <= 0) return Alert.alert("Expense details needed", "Enter an expense category and amount greater than zero.");
    addExpense({ category: category.trim(), amount: value, description: description.trim(), method });
    router.back();
  };
  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}><PageHeader eyebrow="Cashbook" title="Record expense" action={<IconAction label="Close" icon="close" onPress={() => router.back()} />} /><FormInput label="Expense category" value={category} onChangeText={setCategory} placeholder="e.g. Delivery fuel, packaging, rent" /><FormInput label="Amount (BWP)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" /><FormInput label="Description" value={description} onChangeText={setDescription} placeholder="Optional short note" multiline /><SectionTitle title="Payment method" /><View style={styles.methodRow}>{methods.map((entry) => <TouchableOpacity key={entry} onPress={() => setMethod(entry)} style={[styles.method, { borderColor: method === entry ? colors.primary : colors.border, backgroundColor: method === entry ? `${colors.primary}1D` : colors.surface }]}><Text style={[styles.methodText, { color: colors.foreground }]}>{method === entry ? "✓ " : ""}{entry}</Text></TouchableOpacity>)}</View><PrimaryButton title="Save expense" icon="check" onPress={save} /></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 32 }, methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }, method: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10 }, methodText: { fontSize: 12, fontWeight: "800" } });
