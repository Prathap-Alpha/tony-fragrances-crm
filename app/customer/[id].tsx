import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, FormInput, IconAction, PageHeader, PrimaryButton, SecondaryButton, SectionTitle, StatusPill } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { invoiceBalance, money } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { data, updateCustomer } = useCRM();
  const customer = data.customers.find((entry) => entry.id === id);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  if (!customer) return <ScreenContainer><View style={styles.empty}><EmptyState title="Customer not found" detail="This customer record is no longer available." action={<PrimaryButton title="Back to customers" icon="arrow-back" onPress={() => router.replace("/(tabs)/customers")} />} /></View></ScreenContainer>;

  const invoices = data.invoices.filter((invoice) => invoice.customerId === customer.id);
  const outstanding = invoices.reduce((total, invoice) => total + invoiceBalance(invoice), 0);
  const dial = () => Linking.openURL(`tel:${customer.phone.replace(/\s/g, "")}`).catch(() => Alert.alert("Phone unavailable", "This device cannot open the phone dialler."));
  const whatsapp = () => Linking.openURL(`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`).catch(() => Alert.alert("WhatsApp unavailable", "Install WhatsApp or use the saved phone number."));

  const startEdit = () => {
    setName(customer.name);
    setPhone(customer.phone);
    setLocation(customer.location);
    setLandmark(customer.landmark);
    setNotes(customer.notes);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!name.trim() || !phone.trim()) return Alert.alert("Required", "Name and phone number are required.");
    updateCustomer(customer.id, { name: name.trim(), phone: phone.trim(), location: location.trim(), landmark: landmark.trim(), notes: notes.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PageHeader eyebrow="Edit customer" title={customer.name} action={<IconAction label="Cancel" icon="close" onPress={() => setEditing(false)} />} />
          <FormInput label="Customer name" value={name} onChangeText={setName} placeholder="Name" />
          <FormInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="+267 71 000 000" keyboardType="phone-pad" />
          <FormInput label="Delivery location" value={location} onChangeText={setLocation} placeholder="Area, street or suburb" />
          <FormInput label="Landmark" value={landmark} onChangeText={setLandmark} placeholder="Optional landmark" />
          <FormInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Preferences or notes" multiline />
          <View style={styles.editActions}>
            <PrimaryButton title="Save changes" icon="check" onPress={saveEdit} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Customer profile" title={customer.name} action={<IconAction label="Back" icon="arrow-back" onPress={() => router.back()} />} />
        <View style={[styles.profile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{customer.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.phone, { color: colors.foreground }]}>{customer.phone}</Text>
            <Text style={[styles.location, { color: colors.muted }]}>{customer.location || "Delivery location not yet saved"}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={dial} style={[styles.contactButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="call" color={colors.primary} size={20} />
            <Text style={[styles.contactText, { color: colors.foreground }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={whatsapp} style={[styles.contactButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="chat" color={colors.primary} size={20} />
            <Text style={[styles.contactText, { color: colors.foreground }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startEdit} style={[styles.contactButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="edit" color={colors.primary} size={20} />
            <Text style={[styles.contactText, { color: colors.foreground }]}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: "#17130F" }]}>
          <Text style={styles.balanceLabel}>OUTSTANDING BALANCE</Text>
          <Text style={[styles.balanceValue, { color: colors.primary }]}>{money(outstanding)}</Text>
        </View>
        <View style={styles.saleButton}>
          <PrimaryButton title="Create sale for this customer" icon="add-shopping-cart" onPress={() => router.push({ pathname: "/sale/new", params: { customerId: customer.id } })} />
        </View>
        <SectionTitle title="Delivery information" />
        <View style={[styles.details, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Detail icon="location-on" label="Location" value={customer.location || "Not saved"} />
          <Detail icon="place" label="Landmark" value={customer.landmark || "Not saved"} />
          <Detail icon="notes" label="Notes" value={customer.notes || "No notes"} />
        </View>
        <SectionTitle title="Invoice history" />
        {invoices.length === 0 ? (
          <EmptyState icon="receipt-long" title="No purchases yet" detail="The first sale will appear here, together with the payment status." />
        ) : (
          <View style={styles.invoiceList}>
            {invoices.map((invoice) => (
              <TouchableOpacity key={invoice.id} onPress={() => router.push(`/invoice/${invoice.id}`)} style={[styles.invoice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.invoiceNumber, { color: colors.foreground }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[styles.invoiceAmount, { color: colors.muted }]}>{money(invoice.total)} · Balance {money(invoiceBalance(invoice))}</Text>
                </View>
                <StatusPill status={invoice.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Detail({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.detail}>
      <MaterialIcons name={icon} color={colors.primary} size={20} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  empty: { flex: 1, padding: 20, justifyContent: "center" },
  profile: { borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 23, fontWeight: "800" },
  phone: { fontSize: 16, fontWeight: "800" },
  location: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  contactButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  contactText: { fontSize: 14, fontWeight: "800" },
  balanceCard: { borderRadius: 20, padding: 18, marginTop: 16 },
  balanceLabel: { color: "#E4D7C3", fontSize: 10, letterSpacing: 1, fontWeight: "800" },
  balanceValue: { marginTop: 6, fontSize: 26, lineHeight: 33, fontWeight: "800" },
  saleButton: { marginTop: 12 },
  editActions: { marginTop: 10 },
  details: { borderWidth: 1, borderRadius: 20, padding: 4 },
  detail: { minHeight: 69, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  detailLabel: { fontSize: 11, fontWeight: "700" },
  detailValue: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  invoiceList: { gap: 10 },
  invoice: { borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  invoiceNumber: { fontSize: 14, fontWeight: "800" },
  invoiceAmount: { fontSize: 12, marginTop: 4 },
});
