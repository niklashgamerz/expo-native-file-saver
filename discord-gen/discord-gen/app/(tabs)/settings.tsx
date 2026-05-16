import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />;
}

function SectionHeader({ title }: { title: string }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: "Inter_600SemiBold",
        color: c.mutedForeground,
        letterSpacing: 1,
        textTransform: "uppercase",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 6,
      }}
    >
      {title}
    </Text>
  );
}

export default function SettingsTab() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();

  const topPad = Platform.OS === "web" ? 67 : 0;

  const decrement = () => {
    if (settings.accountCount <= 1) return;
    Haptics.selectionAsync();
    updateSettings({ accountCount: settings.accountCount - 1 });
  };
  const increment = () => {
    if (settings.accountCount >= 99) return;
    Haptics.selectionAsync();
    updateSettings({ accountCount: settings.accountCount + 1 });
  };

  const s = styles(c);

  return (
    <ScrollView
      style={[s.container, { paddingTop: topPad }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.titleWrap}>
        <Text style={s.title}>Settings</Text>
      </View>

      {/* ── Appearance ── */}
      <SectionHeader title="Appearance" />
      <View style={s.section}>
        <View style={s.row}>
          <View style={s.left}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather
                name={settings.darkMode ? "moon" : "sun"}
                size={16}
                color={settings.darkMode ? "#5865f2" : "#faa61a"}
              />
              <Text style={s.label}>Dark Mode</Text>
            </View>
            <Text style={s.desc}>
              {settings.darkMode ? "Dark theme active" : "Light theme active"}
            </Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(v) => { Haptics.selectionAsync(); updateSettings({ darkMode: v }); }}
            trackColor={{ false: "#faa61a55", true: "#5865f2" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Generation ── */}
      <SectionHeader title="Generation" />
      <View style={s.section}>
        <View style={s.row}>
          <View style={s.left}>
            <Text style={s.label}>Accounts to create</Text>
            <Text style={s.desc}>Per session</Text>
          </View>
          <View style={s.stepper}>
            <Pressable style={s.stepBtn} onPress={decrement}>
              <Feather name="minus" size={16} color={c.foreground} />
            </Pressable>
            <Text style={s.stepVal}>{settings.accountCount}</Text>
            <Pressable style={s.stepBtn} onPress={increment}>
              <Feather name="plus" size={16} color={c.foreground} />
            </Pressable>
          </View>
        </View>

        <Divider />

        <View style={s.row}>
          <View style={s.left}>
            <Text style={s.label}>Custom password</Text>
            <Text style={s.desc}>Use a fixed password instead of random</Text>
          </View>
          <Switch
            value={settings.useCustomPassword}
            onValueChange={(v) => { Haptics.selectionAsync(); updateSettings({ useCustomPassword: v }); }}
            trackColor={{ false: c.border, true: "#5865f2" }}
            thumbColor="#fff"
          />
        </View>

        {settings.useCustomPassword && (
          <>
            <Divider />
            <View style={[s.row, { alignItems: "flex-start", paddingTop: 14 }]}>
              <View style={[s.left, { paddingTop: 4 }]}>
                <Text style={s.label}>Password</Text>
              </View>
              <TextInput
                style={[s.input, { color: c.foreground, borderColor: c.border }]}
                value={settings.customPassword}
                onChangeText={(t) => updateSettings({ customPassword: t })}
                placeholder="Enter password..."
                placeholderTextColor={c.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>
        )}
      </View>

      {/* ── Auto Captcha ── */}
      <SectionHeader title="Auto Captcha" />
      <View style={s.section}>
        <View style={s.row}>
          <View style={s.left}>
            <Text style={s.label}>Auto Captcha Solver</Text>
            <Text style={s.desc}>
              NopeCHA AI identifies correct tiles · expo-pilot physically taps them
            </Text>
          </View>
          <Switch
            value={settings.autoCaptcha}
            onValueChange={(v) => { Haptics.selectionAsync(); updateSettings({ autoCaptcha: v }); }}
            trackColor={{ false: c.border, true: "#5865f2" }}
            thumbColor="#fff"
          />
        </View>

        <Divider />

        {/* NopeCHA key — optional */}
        <View style={[s.row, { alignItems: "flex-start", paddingTop: 14, paddingBottom: 14 }]}>
          <View style={[s.left, { paddingTop: 4 }]}>
            <Text style={s.label}>NopeCHA API Key</Text>
            <Text style={s.desc}>
              Optional. Free tier works without a key (100/day by IP).
              Add a key for higher limits.
            </Text>
            <Pressable
              onPress={() => Linking.openURL("https://nopecha.com")}
              style={{ marginTop: 4 }}
            >
              <Text style={[s.desc, { color: "#5865f2" }]}>Get a free key → nopecha.com</Text>
            </Pressable>
          </View>
          <TextInput
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
            value={settings.nopechaKey}
            onChangeText={(t) => updateSettings({ nopechaKey: t.trim() })}
            placeholder="Paste key (optional)"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
      </View>

      {/* ── How it works ── */}
      <SectionHeader title="How Auto Captcha Works" />
      <View style={s.section}>
        {[
          { icon: "eye",          label: "Detects hCaptcha on the Discord register page" },
          { icon: "camera",       label: "expo-pilot takes a screenshot + reads the accessibility tree to find tile positions and prompt text" },
          { icon: "cpu",          label: "NopeCHA AI receives the cropped tile images and returns which ones are correct (free, 100/day by IP)" },
          { icon: "crosshair",    label: "expo-pilot physically taps each correct tile at its exact screen coordinates" },
          { icon: "check-circle", label: "expo-pilot taps Verify. If tiles aren't found, falls back to NopeCHA token API + JS injection" },
        ].map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Divider />}
            <View style={[s.row, { paddingVertical: 12 }]}>
              <View style={s.iconCircle}>
                <Feather name={item.icon as never} size={13} color="#5865f2" />
              </View>
              <Text style={[s.desc, { flex: 1, fontSize: 13, lineHeight: 18 }]}>
                {item.label}
              </Text>
            </View>
          </React.Fragment>
        ))}

        <Divider />
        <View style={s.noticeRow}>
          <Feather name="info" size={13} color={c.mutedForeground} />
          <Text style={[s.desc, { flex: 1 }]}>
            Free tier: 100 solves/day (tracked by IP). No sign-up or key needed to start.
            For unlimited use, add an API key above.
          </Text>
        </View>
      </View>

      {/* ── About ── */}
      <SectionHeader title="About" />
      <View style={s.section}>
        {[
          ["Version", "1.0.0"],
          ["Email Provider", "CyberTemp API"],
          ["Captcha Engine", "NopeCHA (free)"],
          ["Platform", Platform.OS],
        ].map(([k, v], i) => (
          <React.Fragment key={k}>
            {i > 0 && <Divider />}
            <View style={s.row}>
              <Text style={s.label}>{k}</Text>
              <Text style={[s.desc, { fontSize: 13 }]}>{v}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

function styles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    titleWrap: { paddingHorizontal: 16, paddingTop: 14 },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: c.foreground },
    section: {
      backgroundColor: c.card,
      borderRadius: 12,
      marginHorizontal: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    left: { flex: 1, gap: 3 },
    label: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground },
    desc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.secondary,
      borderRadius: 8,
      padding: 4,
    },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: c.card,
      justifyContent: "center",
      alignItems: "center",
    },
    stepVal: {
      minWidth: 32,
      textAlign: "center",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: c.foreground,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      minWidth: 150,
      maxWidth: 160,
    },
    iconCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "#5865f222",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
      flexShrink: 0,
    },
    noticeRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });
}
