import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { FormInput, IconAction, PageHeader, PrimaryButton } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useCRM } from "@/lib/crm-store";

export default function NewCustomerScreen() {
  const router = useRouter();
  const { addCustomer } = useCRM();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const save = () => { if (!name.trim() || !phone.trim()) return Alert.alert("Customer details needed", "Enter the customer’s name and phone number."); const customer = addCustomer({ name: name.trim(), phone: phone.trim(), location: location.trim(), landmark: landmark.trim(), notes: notes.trim() }); router.replace(`/customer/${customer.id}`); };
  return <ScreenContainer><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><PageHeader eyebrow="Customer database" title="New customer" action={<IconAction label="Close" icon="close" onPress={() => router.back()} />} /><FormInput label="Customer name" value={name} onChangeText={setName} placeholder="e.g. Naledi M." /><FormInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="e.g. +267 71 000 000" keyboardType="phone-pad" /><FormInput label="Delivery location" value={location} onChangeText={setLocation} placeholder="Area, street or suburb" /><FormInput label="Landmark" value={landmark} onChangeText={setLandmark} placeholder="Optional landmark for the driver" /><FormInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Preferences, preferred delivery time, or other notes" multiline /><View style={styles.save}><PrimaryButton title="Save customer" icon="check" onPress={save} /></View></ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 32 }, save: { marginTop: 10 } });
