import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { EmptyState, IconAction, LoadingScreen, PageHeader, PrimaryButton } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Customer } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";

export default function CustomersScreen() {
  const { data, loading } = useCRM();
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const customers = useMemo(() => data.customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.location}`.toLowerCase().includes(query.toLowerCase())), [data.customers, query]);

  if (loading) return <ScreenContainer><LoadingScreen /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={customers}
        keyExtractor={(customer) => customer.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <PageHeader eyebrow="Relationship book" title="Customers" action={<IconAction label="Add customer" icon="person-add" onPress={() => router.push("/customer/new")} />} />
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="search" color={colors.muted} size={20} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search name, phone or location" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} />
          </View>
          <Text style={[styles.count, { color: colors.muted }]}>{data.customers.length} saved customer{data.customers.length === 1 ? "" : "s"}</Text>
        </>}
        renderItem={({ item }) => <CustomerCard customer={item} onPress={() => router.push(`/customer/${item.id}`)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title={query ? "No customer found" : "Your customer list is empty"} detail={query ? "Try another search term." : "Save names, phone numbers, delivery locations, and notes so every order is easy to manage."} action={!query ? <PrimaryButton title="Add first customer" icon="person-add" onPress={() => router.push("/customer/new")} /> : undefined} />}
      />
    </ScreenContainer>
  );
}

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const colors = useColors();
  return <TouchableOpacity onPress={onPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: `${colors.primary}22` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{customer.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.cardText}><Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text><Text style={[styles.customerMeta, { color: colors.muted }]} numberOfLines={1}>{customer.phone} · {customer.location || "Location not saved"}</Text></View><MaterialIcons name="chevron-right" color={colors.muted} size={22} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, fontSize: 15 },
  count: { fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 12 },
  separator: { height: 10 },
  card: { minHeight: 72, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  cardText: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "800" },
  customerMeta: { fontSize: 12, marginTop: 4 },
});
