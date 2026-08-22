import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { IconAction, PageHeader } from "@/components/crm-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { askAssistant } from "@/lib/ai";

type Turn = { role: "you" | "assistant"; text: string };

const SUGGESTIONS = [
  "Who still owes me money?",
  "What is low in stock?",
  "How were my sales this week?",
  "Which perfume makes the most profit?",
];

export default function AssistantScreen() {
  const router = useRouter();
  const colors = useColors();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setQuestion("");
    setBusy(true);
    setTurns((prev) => [...prev, { role: "you", text: q }]);
    try {
      const answer = await askAssistant(q);
      setTurns((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (error) {
      setTurns((prev) => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Something went wrong — try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <PageHeader eyebrow="Ask about your business" title="Assistant" action={<IconAction label="Back" icon="arrow-back" onPress={() => router.back()} />} />
        </View>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled">
          {turns.length === 0 ? (
            <View style={styles.introBlock}>
              <Text style={[styles.intro, { color: colors.muted }]}>
                Ask anything about your customers, stock, sales or money — the assistant reads your live records and answers in plain language.
              </Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} onPress={() => void ask(s)} style={[styles.suggestion, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <MaterialIcons name="auto-awesome" color={colors.primary} size={16} />
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            turns.map((turn, index) => (
              <View
                key={index}
                style={[
                  styles.bubble,
                  turn.role === "you"
                    ? [styles.bubbleYou, { backgroundColor: colors.primary }]
                    : [styles.bubbleAI, { backgroundColor: colors.surface, borderColor: colors.border }],
                ]}
              >
                <Text style={[styles.bubbleText, { color: turn.role === "you" ? "#17130F" : colors.foreground }]}>{turn.text}</Text>
              </View>
            ))
          )}
          {busy ? (
            <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: "row", gap: 8, alignItems: "center" }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.bubbleText, { color: colors.muted }]}>Checking your records…</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Type your question…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground }]}
            editable={!busy}
            onSubmitEditing={() => void ask(question)}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={() => void ask(question)} disabled={busy || !question.trim()} style={[styles.send, { backgroundColor: colors.primary, opacity: busy || !question.trim() ? 0.4 : 1 }]}>
            <MaterialIcons name="arrow-upward" color="#17130F" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  chat: { padding: 20, paddingTop: 8, gap: 10 },
  introBlock: { gap: 10 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  suggestion: { borderWidth: 1, borderRadius: 15, minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  suggestionText: { fontSize: 14, fontWeight: "700" },
  bubble: { maxWidth: "88%", borderRadius: 17, padding: 13 },
  bubbleYou: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  bubbleAI: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  inputRow: { margin: 14, marginTop: 6, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6, minHeight: 54, gap: 8 },
  input: { flex: 1, fontSize: 14, paddingVertical: 10 },
  send: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
