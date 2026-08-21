import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { FormInput, IconAction, PageHeader, PrimaryButton } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useCRM } from "@/lib/crm-store";

export default function SettingsScreen() {
  const router = useRouter();
  const { data, updateSettings } = useCRM();
  const [businessName, setBusinessName] = useState(data.businessName);
  const [invoicePrefix, setInvoicePrefix] = useState(data.invoicePrefix);

  const save = () => {
    if (!businessName.trim()) return Alert.alert("Required", "Enter your business name.");
    if (!invoicePrefix.trim()) return Alert.alert("Required", "Enter an invoice prefix (e.g. TF).");
    updateSettings({ businessName: businessName.trim(), invoicePrefix: invoicePrefix.trim().toUpperCase() });
    Alert.alert("Saved", "Your business settings have been updated.");
    router.back();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Configuration" title="Business Settings" action={<IconAction label="Back" icon="arrow-back" onPress={() => router.back()} />} />
        <FormInput label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Tony Fragrances" />
        <FormInput label="Invoice prefix" value={invoicePrefix} onChangeText={setInvoicePrefix} placeholder="e.g. TF" />
        <View style={styles.save}>
          <PrimaryButton title="Save settings" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 32 }, save: { marginTop: 10 } });
