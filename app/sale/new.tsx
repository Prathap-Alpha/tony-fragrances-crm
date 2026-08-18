import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { EmptyState, IconAction, PageHeader, PrimaryButton, SectionTitle } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { money, PaymentMethod } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

const paymentMethods: PaymentMethod[] = ["Cash", "Mobile Money", "Bank Transfer", "Card"];

export default function NewSaleScreen() {
  const { customerId: requestedCustomerId } = useLocalSearchParams<{ customerId?: string }>();
  const router = useRouter();
  const colors = useColors();
  const { data, createSale } = useCRM();
  const [customerId, setCustomerId] = useState(requestedCustomerId ?? "");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [createDelivery, setCreateDelivery] = useState(true);
  const [paidNow, setPaidNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentAmount, setPaymentAmount] = useState("");

  const subtotal = useMemo(
    () => data.products.reduce((total, product) => total + (quantities[product.id] ?? 0) * product.sellingPrice, 0),
    [data.products, quantities],
  );
  const total = subtotal + Math.max(0, Number(deliveryFee) || 0);

  const changeQuantity = (id: string, change: number, max: number) => {
    setQuantities((current) => ({ ...current, [id]: Math.min(max, Math.max(0, (current[id] ?? 0) + change)) }));
  };

  const save = () => {
    try {
      const invoice = createSale({
        customerId,
        items: Object.entries(quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([productId, quantity]) => ({ productId, quantity })),
        deliveryFee: Number(deliveryFee) || 0,
        dueDate: new Date().toISOString().slice(0, 10),
        createDelivery,
        payment: paidNow ? { amount: Number(paymentAmount) || total, method: paymentMethod, reference: "" } : undefined,
      });
      router.replace(`/invoice/${invoice.id}`);
    } catch (error) {
      Alert.alert("Sale not saved", error instanceof Error ? error.message : "Please review the sale details.");
    }
  };

  if (data.customers.length === 0 || data.products.length === 0) {
    const missingCustomers = data.customers.length === 0;
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <EmptyState
            icon={missingCustomers ? "people-outline" : "inventory-2"}
            title={missingCustomers ? "Add a customer first" : "Add a perfume first"}
            detail={missingCustomers ? "Sales need a customer so delivery and invoice history are always correct." : "Sales need at least one perfume in stock."}
            action={<PrimaryButton title={missingCustomers ? "Add customer" : "Add perfume"} icon="add" onPress={() => router.replace(missingCustomers ? "/customer/new" : "/inventory")} />}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Sale and invoice" title="New sale" action={<IconAction label="Close" icon="close" onPress={() => router.back()} />} />
        <SectionTitle title="Customer" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerChoices}>
          {data.customers.map((customer) => (
            <TouchableOpacity key={customer.id} onPress={() => setCustomerId(customer.id)} style={[styles.customerChoice, { borderColor: customerId === customer.id ? colors.primary : colors.border, backgroundColor: customerId === customer.id ? `${colors.primary}1E` : colors.surface }]}>
              <Text style={[styles.customerChoiceName, { color: colors.foreground }]}>{customer.name}</Text>
              <Text style={[styles.customerChoiceDetail, { color: colors.muted }]} numberOfLines={1}>{customer.location || customer.phone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionTitle title="Perfumes" />
        {data.products.map((product) => {
          const quantity = quantities[product.id] ?? 0;
          return (
            <View key={product.id} style={[styles.product, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                <Text style={[styles.productPrice, { color: colors.muted }]}>{money(product.sellingPrice)} · {product.quantityOnHand} in stock</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => changeQuantity(product.id, -1, product.quantityOnHand)} style={[styles.stepperButton, { borderColor: colors.border }]}><MaterialIcons name="remove" color={colors.foreground} size={18} /></TouchableOpacity>
                <Text style={[styles.quantity, { color: colors.foreground }]}>{quantity}</Text>
                <TouchableOpacity onPress={() => changeQuantity(product.id, 1, product.quantityOnHand)} style={[styles.stepperButton, { borderColor: colors.border, opacity: quantity >= product.quantityOnHand ? 0.4 : 1 }]}><MaterialIcons name="add" color={colors.foreground} size={18} /></TouchableOpacity>
              </View>
            </View>
          );
        })}

        <SectionTitle title="Delivery and payment" />
        <View style={[styles.options, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowToggle label="Create delivery" detail="Add this order to the delivery queue" enabled={createDelivery} onPress={() => setCreateDelivery(!createDelivery)} />
          <View style={[styles.optionRule, { backgroundColor: colors.border }]} />
          <RowToggle label="Payment received now" detail="Record money received at the point of sale" enabled={paidNow} onPress={() => setPaidNow(!paidNow)} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Delivery fee (BWP)</Text>
          <TextInput value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.muted} style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
        </View>

        {paidNow ? <>
          <SectionTitle title="Payment method" />
          <View style={styles.methodChoices}>{paymentMethods.map((method) => <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.method, { borderColor: paymentMethod === method ? colors.primary : colors.border, backgroundColor: paymentMethod === method ? `${colors.primary}1C` : colors.surface }]}><Text style={[styles.methodText, { color: colors.foreground }]}>{method}</Text></TouchableOpacity>)}</View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Amount paid now (BWP)</Text>
            <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={`Defaults to ${money(total)}`} placeholderTextColor={colors.muted} style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
          </View>
        </> : null}
        <View style={styles.totalCard}><Text style={styles.totalLabel}>INVOICE TOTAL</Text><Text style={[styles.totalValue, { color: colors.primary }]}>{money(total)}</Text><Text style={styles.totalDetail}>{Object.values(quantities).filter((quantity) => quantity > 0).reduce((sum, quantity) => sum + quantity, 0)} item(s) selected</Text></View>
        <PrimaryButton title="Save sale and create invoice" icon="receipt-long" onPress={save} disabled={!customerId || total <= 0} />
      </ScrollView>
    </ScreenContainer>
  );
}

function RowToggle({ label, detail, enabled, onPress }: { label: string; detail: string; enabled: boolean; onPress: () => void }) {
  const colors = useColors();
  return <TouchableOpacity onPress={onPress} style={styles.toggleRow}><View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.toggleDetail, { color: colors.muted }]}>{detail}</Text></View><View style={[styles.toggle, { backgroundColor: enabled ? colors.primary : colors.border }]}><View style={[styles.toggleKnob, { alignSelf: enabled ? "flex-end" : "flex-start" }]} /></View></TouchableOpacity>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 }, empty: { flex: 1, padding: 20, justifyContent: "center" }, customerChoices: { gap: 10 }, customerChoice: { width: 152, padding: 13, borderWidth: 1, borderRadius: 16 }, customerChoiceName: { fontSize: 14, fontWeight: "800" }, customerChoiceDetail: { fontSize: 11, marginTop: 4 }, product: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }, productName: { fontSize: 15, fontWeight: "800" }, productPrice: { fontSize: 12, marginTop: 4 }, stepper: { flexDirection: "row", alignItems: "center", gap: 8 }, stepperButton: { width: 31, height: 31, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" }, quantity: { width: 20, textAlign: "center", fontSize: 15, fontWeight: "800" }, options: { borderWidth: 1, borderRadius: 18, padding: 14 }, toggleRow: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 12 }, toggleLabel: { fontSize: 14, fontWeight: "800" }, toggleDetail: { fontSize: 11, lineHeight: 16, marginTop: 2 }, toggle: { width: 44, height: 26, borderRadius: 13, padding: 3 }, toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }, optionRule: { height: 1, marginVertical: 13 }, field: { marginTop: 15 }, fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 7 }, fieldInput: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 }, methodChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, method: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 }, methodText: { fontSize: 12, fontWeight: "800" }, totalCard: { marginTop: 21, marginBottom: 12, borderRadius: 20, backgroundColor: "#17130F", padding: 18 }, totalLabel: { color: "#E4D7C3", fontSize: 10, letterSpacing: 1, fontWeight: "800" }, totalValue: { marginTop: 5, fontSize: 27, lineHeight: 34, fontWeight: "800" }, totalDetail: { color: "#C8BBAB", fontSize: 12, marginTop: 4 },
});
