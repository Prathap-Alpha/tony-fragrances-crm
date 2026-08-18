import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useCRM } from "@/lib/crm-store";

// Shows a "Sign in with Google" screen until the user is signed in. Once signed
// in (or on native, or before a Google client ID is set) it renders the app.
export function SignInGate({ children }: { children: ReactNode }) {
  const { authReady, needsGoogle, signedIn } = useCRM();
  const colors = useColors();

  if (!authReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (needsGoogle && !signedIn) return <SignInScreen />;

  return <>{children}</>;
}

function SignInScreen() {
  const { signIn } = useCRM();
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onPress = async () => {
    setBusy(true);
    setError("");
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
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
          Sign in with Google. Your customers, sales and money records are saved
          privately in your own Google Drive — only you can see them.
        </Text>

        <TouchableOpacity
          onPress={onPress}
          disabled={busy}
          style={[styles.button, { backgroundColor: colors.primary }, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#18130B" />
          ) : (
            <>
              <MaterialIcons name="login" color="#18130B" size={20} />
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <Text style={[styles.footnote, { color: colors.muted }]}>
          The app only ever touches the one file it creates in your Drive.
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
  button: { marginTop: 26, minHeight: 52, alignSelf: "stretch", borderRadius: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#18130B", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.6 },
  error: { marginTop: 14, fontSize: 13, textAlign: "center" },
  footnote: { marginTop: 20, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
