import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, FormInput, IconAction, PageHeader, PrimaryButton, SecondaryButton } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { money, Product } from "@/lib/crm-domain";
import { useCRM } from "@/lib/crm-store";
import { TONY_FACEBOOK_CATALOGUE } from "@/constants/catalogue";

export default function InventoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { data, addProduct, importProducts, adjustProduct, updateProduct, deleteProduct } = useCRM();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const importCatalogue = () => {
    const added = importProducts(TONY_FACEBOOK_CATALOGUE.map((item) => ({ name: item.name, sku: "", costPrice: 0, sellingPrice: item.sellingPrice, quantityOnHand: 0 })));
    Alert.alert(
      added > 0 ? "Fragrances added" : "Already in stock",
      added > 0
        ? `${added} fragrance${added === 1 ? "" : "s"} from Tony's Facebook list added, with selling prices. Set each one's stock quantity with the + button, and its cost price by editing it.`
        : "All of Tony's Facebook fragrances are already in your stock.",
    );
  };

  const save = () => {
    const costPrice = Number(cost);
    const sellingPrice = Number(price);
    const quantityOnHand = Number(quantity);
    if (!name.trim() || !Number.isFinite(sellingPrice) || sellingPrice <= 0) return Alert.alert("Complete product details", "Enter a product name and selling price.");
    if (editingId) {
      updateProduct(editingId, { name: name.trim(), sku: sku.trim(), costPrice: Number.isFinite(costPrice) ? costPrice : 0, sellingPrice, quantityOnHand: Number.isFinite(quantityOnHand) && quantityOnHand >= 0 ? quantityOnHand : 0 });
      setEditingId(null);
    } else {
      if (!Number.isFinite(costPrice) || !Number.isFinite(quantityOnHand) || quantityOnHand < 0) return Alert.alert("Complete product details", "Enter cost price and stock quantity.");
      addProduct({ name: name.trim(), sku: sku.trim(), costPrice, sellingPrice, quantityOnHand });
    }
    setName(""); setSku(""); setCost(""); setPrice(""); setQuantity(""); setAdding(false);
  };

  const startEdit = (product: Product) => {
    setName(product.name);
    setSku(product.sku);
    setCost(String(product.costPrice));
    setPrice(String(product.sellingPrice));
    setQuantity(String(product.quantityOnHand));
    setEditingId(product.id);
    setAdding(true);
  };

  const cancelForm = () => {
    setAdding(false); setEditingId(null);
    setName(""); setSku(""); setCost(""); setPrice(""); setQuantity("");
  };

  const removeProduct = () => {
    if (!editingId) return;
    // Alert.alert buttons don't render on web, so use the browser's own confirm.
    const ok = typeof window !== "undefined" && typeof window.confirm === "function"
      ? window.confirm(`Delete "${name}" from your inventory? This removes it on every device.`)
      : true;
    if (!ok) return;
    deleteProduct(editingId);
    cancelForm();
  };

  if (adding) return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Stock control" title={editingId ? "Edit product" : "Add product"} action={<IconAction label="Close" icon="close" onPress={cancelForm} />} />
        <FormInput label="Product name" value={name} onChangeText={setName} placeholder="e.g. White Oud 50ml" />
        <FormInput label="SKU / code" value={sku} onChangeText={setSku} placeholder="Optional product code" />
        <FormInput label="Cost price (BWP)" value={cost} onChangeText={setCost} placeholder="0.00" keyboardType="decimal-pad" />
        <FormInput label="Selling price (BWP)" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
        <FormInput label="Quantity in stock" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="numeric" />
        <PrimaryButton title={editingId ? "Save changes" : "Save product"} icon="check" onPress={save} />
        {editingId ? (
          <TouchableOpacity onPress={removeProduct} style={[styles.deleteButton, { borderColor: colors.error }]}>
            <MaterialIcons name="delete-outline" color={colors.error} size={20} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete this product</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={data.products}
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<PageHeader eyebrow="Stock control" title="Inventory" action={<IconAction label="Back" icon="arrow-back" onPress={() => router.back()} />} />}
        renderItem={({ item }) => <ProductRow product={item} onDecrease={() => adjustProduct(item.id, -1)} onIncrease={() => adjustProduct(item.id, 1)} onEdit={() => startEdit(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState icon="inventory-2" title="No products saved" detail="Add each product with its cost, selling price, and quantity to keep stock and profit accurate." action={
            <View style={{ width: "100%", gap: 10 }}>
              <PrimaryButton title="Add first product" icon="add" onPress={() => setAdding(true)} />
              <SecondaryButton title="Import Tony's Facebook list (13)" icon="cloud-download" onPress={importCatalogue} />
            </View>
          } />
        }
        ListFooterComponent={data.products.length > 0 ? (
          <View style={[styles.footer, { gap: 10 }]}>
            <PrimaryButton title="Add product" icon="add" onPress={() => setAdding(true)} />
            <SecondaryButton title="Import Tony's Facebook list (13)" icon="cloud-download" onPress={importCatalogue} />
          </View>
        ) : null}
      />
    </ScreenContainer>
  );
}

function ProductRow({ product, onDecrease, onIncrease, onEdit }: { product: Product; onDecrease: () => void; onIncrease: () => void; onEdit: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onEdit} style={[styles.product, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
        <Text style={[styles.productMeta, { color: colors.muted }]}>{product.sku || "No SKU"} · Cost {money(product.costPrice)} · Sell {money(product.sellingPrice)}</Text>
      </View>
      <View style={styles.stock}>
        <TouchableOpacity onPress={onDecrease} style={[styles.stockButton, { borderColor: colors.border }]}>
          <MaterialIcons name="remove" color={colors.foreground} size={18} />
        </TouchableOpacity>
        <Text style={[styles.stockNumber, { color: product.quantityOnHand <= 3 ? colors.error : colors.foreground }]}>{product.quantityOnHand}</Text>
        <TouchableOpacity onPress={onIncrease} style={[styles.stockButton, { borderColor: colors.border }]}>
          <MaterialIcons name="add" color={colors.foreground} size={18} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  separator: { height: 10 },
  footer: { marginTop: 16 },
  product: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  productName: { fontSize: 15, fontWeight: "800" },
  productMeta: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  stock: { alignItems: "center", gap: 4 },
  deleteButton: { marginTop: 12, minHeight: 48, borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  deleteText: { fontSize: 14, fontWeight: "800" },
  stockButton: { height: 28, width: 28, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stockNumber: { fontSize: 14, fontWeight: "800" },
});
