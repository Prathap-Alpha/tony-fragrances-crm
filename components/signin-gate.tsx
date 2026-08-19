import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useCRM } from "@/lib/crm-store";

// Shows a passcode screen until the workspace passcode is entered. Once entered
// (or on native, or before cloud sync is configured) it renders the app.
export function SignInGate({ children }: { children: ReactNode }) {
  const { authReady, needsAuth, signedIn } = useCRM();
  const colors = useColors();

  if (!authReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (needsAuth && !signedIn) return <PasscodeScreen />;

  return <>{children}</>;
}

function PasscodeScreen() {
  const { signIn } = useCRM();
  const colors = useColors();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onPress = async () => {
    setBusy(true);
    setError("");
    try {
      await signIn(passcode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>TF</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Tony Fragrances CRM</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Enter your passcode. Type the same passcode on your phone and your
          computer and both show the same customers, sales and money records.
        </Text>

        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          placeholder="Your passcode"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onPress}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        <TouchableOpacity
          onPress={onPress}
          disabled={busy}
          style={[styles.button, { backgroundColor: colors.primary }, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#18130B" />
          ) : (
            <>
              <MaterialIcons name="lock-open" color="#18130B" size={20} />
              <Text style={styles.buttonText}>Open my workspace</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <Text style={[styles.footnote, { color: colors.muted }]}>
          Keep your passcode private — anyone who knows it can see your records.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  inner: { width: "100%", maxWidth: 360, alignItems: "center" },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  logoText: { color: "#18130B", fontWeight: "900", fontSize: 24, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10 },
  input: { alignSelf: "stretch", marginTop: 22, minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  button: { marginTop: 14, minHeight: 52, alignSelf: "stretch", borderRadius: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#18130B", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.6 },
  error: { marginTop: 14, fontSize: 13, textAlign: "center" },
  footnote: { marginTop: 20, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
