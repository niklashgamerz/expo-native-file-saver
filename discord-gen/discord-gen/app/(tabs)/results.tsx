import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountEntry, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function maskToken(token: string): string {
  if (token.length < 20) return token;
  return token.slice(0, 10) + "••••••••••••" + token.slice(-6);
}

function AccountCard({ account }: { account: AccountEntry }) {
  const colors = useColors();
  const [showToken, setShowToken] = useState(false);

  const statusColor =
    account.status === "valid"
      ? "#3ba55d"
      : account.status === "invalid"
      ? "#ed4245"
      : "#faa61a";

  const s = cardStyles(colors);

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.badge, { backgroundColor: statusColor + "22" }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor }]} />
          <Text style={[s.badgeText, { color: statusColor }]}>
            {account.status.toUpperCase()}
          </Text>
        </View>
        <Text style={s.timestamp}>
          {new Date(account.createdAt).toLocaleTimeString()}
        </Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>EMAIL</Text>
        <Text style={s.value} selectable>
          {account.email}
        </Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>PASSWORD</Text>
        <Text style={s.value} selectable>
          {account.password}
        </Text>
      </View>

      <View style={s.field}>
        <View style={s.tokenLabelRow}>
          <Text style={s.label}>TOKEN</Text>
          <Pressable
            onPress={() => setShowToken((v) => !v)}
            hitSlop={8}
          >
            <Feather
              name={showToken ? "eye-off" : "eye"}
              size={13}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
        <Text
          style={[s.value, { fontFamily: "Inter_400Regular", letterSpacing: 0.3 }]}
          selectable
          numberOfLines={showToken ? undefined : 1}
        >
          {showToken ? account.token : maskToken(account.token)}
        </Text>
      </View>
    </View>
  );
}

function cardStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
    },
    timestamp: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    field: { gap: 3 },
    label: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 1,
    },
    value: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    tokenLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
  });
}

export default function ResultsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, clearAccounts } = useApp();

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleExport = useCallback(async () => {
    if (accounts.length === 0) {
      Alert.alert("No accounts", "Generate some accounts first.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const content = accounts
      .map((a) => `${a.email}:${a.password}:${a.token}`)
      .join("\n");

    const fileName = `discord_accounts_${Date.now()}.txt`;

    if (Platform.OS === "web") {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    try {
      const { saveFile } = await import("expo-native-file-saver");
      const result = await saveFile({
        data: content,
        fileName,
        mimeType: "text/plain",
        showDialog: true,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Saved!", `File saved to: ${result.filePath}`);
      } else {
        Alert.alert("Export failed", result.message ?? "Unknown error");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Export failed", `Could not save file: ${message}`);
    }
  }, [accounts]);

  const handleClear = useCallback(() => {
    Alert.alert("Clear all accounts?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearAccounts();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [clearAccounts]);

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Results</Text>
          <Text style={s.headerSub}>
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={s.headerActions}>
          {accounts.length > 0 && (
            <Pressable
              style={({ pressed }) => [s.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleClear}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [s.exportBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleExport}
          >
            <Feather name="download" size={14} color="#fff" />
            <Text style={s.exportBtnText}>Export</Text>
          </Pressable>
        </View>
      </View>

      {accounts.length === 0 ? (
        <View style={s.empty}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No accounts yet</Text>
          <Text style={s.emptySub}>
            Go to Creator tab to generate accounts
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AccountCard account={item} />}
          contentContainerStyle={[
            s.list,
            { paddingBottom: insets.bottom + bottomPad + 90 },
          ]}
          scrollEnabled={!!accounts.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    headerSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      justifyContent: "center",
      alignItems: "center",
    },
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#5865f2",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    exportBtnText: {
      color: "#fff",
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    list: { padding: 16 },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      paddingBottom: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
  });
}
