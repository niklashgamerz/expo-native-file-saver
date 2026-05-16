import {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  tap, swipe, scroll,
  tapElement, findElements, typeText,
  waitForElement, dumpScreen,
  getCurrentApp, getScreenSize,
  pressBack, pressHome, pressRecents,
  openNotifications, lockScreen,
  launchApp, getInstalledApps,
  screenshot, onAccessibilityEvent,
} from 'expo-pilot';
import { useEffect, useState } from 'react';
import {
  Alert, Image, Platform, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

export default function App() {
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [queryText, setQueryText] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [screenshot64, setScreenshot64] = useState('');

  const addLog = (msg: string) =>
    setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 29)]);

  useEffect(() => {
    checkService();
    const sub = onAccessibilityEvent(({ type, packageName, text }) => {
      addLog(`EVENT ${type} | ${packageName} | "${text}"`);
    });
    return () => sub.remove();
  }, []);

  const checkService = async () => {
    const enabled = await isAccessibilityServiceEnabled();
    setServiceEnabled(enabled);
    addLog(enabled ? '✅ Service enabled' : '❌ Service disabled');
  };

  const btn = (label: string, fn: () => void, color = '#1f6feb') => (
    <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={fn}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );

  if (!serviceEnabled) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.setupTitle}>🤖 ExpoPilot Setup</Text>
        <Text style={styles.setupDesc}>
          ExpoPilot needs the Accessibility Service enabled to control apps.{'\n\n'}
          Tap below → find "ExpoPilot" in the list → toggle it ON.
        </Text>
        <TouchableOpacity style={styles.setupBtn} onPress={async () => {
          await openAccessibilitySettings();
          setTimeout(checkService, 2000);
        }}>
          <Text style={styles.setupBtnText}>Open Accessibility Settings →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.setupBtn, { backgroundColor: '#21262d', marginTop: 8 }]}
          onPress={checkService}>
          <Text style={styles.setupBtnText}>Check Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🤖 ExpoPilot</Text>
      <Text style={styles.subtitle}>Accessibility automation — Android</Text>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: serviceEnabled ? '#3fb950' : '#f85149' }]} />
        <Text style={styles.statusText}>{serviceEnabled ? 'Service Active' : 'Service Inactive'}</Text>
      </View>

      {/* Gestures */}
      <Text style={styles.section}>Gestures</Text>
      <View style={styles.row}>
        {btn('◀ Back', () => pressBack().then(() => addLog('pressBack')))}
        {btn('⌂ Home', () => pressHome().then(() => addLog('pressHome')))}
        {btn('⧉ Recents', () => pressRecents().then(() => addLog('pressRecents')))}
      </View>
      <View style={styles.row}>
        {btn('🔔 Notifs', () => openNotifications().then(() => addLog('openNotifications')))}
        {btn('🔒 Lock', () => lockScreen().then(() => addLog('lockScreen')), '#6e40c9')}
      </View>
      <View style={styles.row}>
        {btn('↑ Scroll Up', () => scroll({ direction: 'up' }).then(() => addLog('scroll up')))}
        {btn('↓ Scroll Down', () => scroll({ direction: 'down' }).then(() => addLog('scroll down')))}
      </View>

      {/* Element control */}
      <Text style={styles.section}>Element Control</Text>
      <TextInput
        style={styles.input}
        value={queryText}
        onChangeText={setQueryText}
        placeholder="Element text to find (e.g. Search, OK)"
        placeholderTextColor="#444"
      />
      <View style={styles.row}>
        {btn('🔍 Find', async () => {
          try {
            const els = await findElements({ text: queryText });
            addLog(`Found ${els.length} element(s) matching "${queryText}"`);
            if (els.length > 0) addLog(`First: ${JSON.stringify(els[0].bounds)}`);
          } catch (e: any) { addLog(`❌ ${e.message}`); }
        })}
        {btn('👆 Tap Element', async () => {
          try {
            const r = await tapElement({ text: queryText });
            addLog(`Tapped: ${r.element.text} at (${r.element.centerX},${r.element.centerY})`);
          } catch (e: any) { addLog(`❌ ${e.message}`); }
        }, '#238636')}
      </View>

      <TextInput
        style={styles.input}
        value={typeValue}
        onChangeText={setTypeValue}
        placeholder="Text to type into found element"
        placeholderTextColor="#444"
      />
      {btn('⌨️ Type Text into Element', async () => {
        try {
          const r = await typeText({ text: queryText }, { text: typeValue, clearFirst: true });
          addLog(`Typed "${typeValue}" → ${r.success ? 'success' : 'failed'}`);
        } catch (e: any) { addLog(`❌ ${e.message}`); }
      })}

      {/* Screen info */}
      <Text style={styles.section}>Screen Info</Text>
      <View style={styles.row}>
        {btn('📱 Screen Size', async () => {
          const s = await getScreenSize();
          addLog(`Screen: ${s.width}×${s.height} @ ${s.density}x`);
        })}
        {btn('🎯 Current App', async () => {
          const a = await getCurrentApp();
          addLog(`Active: ${a.packageName}`);
        })}
      </View>
      {btn('🌳 Dump Screen Tree', async () => {
        const nodes = await dumpScreen();
        addLog(`Screen has ${nodes.length} accessible nodes`);
        nodes.slice(0, 5).forEach(n =>
          addLog(`  → "${n.text || n.description}" [${n.className?.split('.').pop()}]`)
        );
      })}

      {/* Apps */}
      <Text style={styles.section}>App Control</Text>
      {btn('▶ Launch Chrome', async () => {
        const r = await launchApp('com.android.chrome');
        addLog(r.success ? '✅ Launched Chrome' : '❌ Chrome not found');
      })}
      {btn('▶ Launch Settings', async () => {
        const r = await launchApp('com.android.settings');
        addLog(r.success ? '✅ Launched Settings' : '❌ Failed');
      })}
      {btn('📋 List Installed Apps', async () => {
        const apps = await getInstalledApps();
        addLog(`${apps.length} apps installed`);
        apps.slice(0, 5).forEach(a => addLog(`  • ${a.label} (${a.packageName})`));
      })}

      {/* Screenshot */}
      <Text style={styles.section}>Screenshot (Android 11+)</Text>
      {btn('📸 Take Screenshot', async () => {
        try {
          const s = await screenshot();
          setScreenshot64(s.base64);
          addLog(`Screenshot: ${s.width}×${s.height}`);
        } catch (e: any) { addLog(`❌ ${e.message}`); }
      }, '#6e40c9')}
      {!!screenshot64 && (
        <Image
          source={{ uri: `data:image/png;base64,${screenshot64}` }}
          style={styles.screenshot}
          resizeMode="contain"
        />
      )}

      {/* Log */}
      <Text style={styles.section}>Log</Text>
      <View style={styles.logBox}>
        {log.map((l, i) => (
          <Text key={i} style={styles.logLine}>{l}</Text>
        ))}
        {log.length === 0 && <Text style={styles.logLine}>No events yet...</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#010409' },
  content: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#c9d1d9', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8b949e', marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: '#8b949e', fontSize: 13 },
  section: { fontSize: 13, fontWeight: '700', color: '#8b949e', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: '#30363d', borderRadius: 8,
    padding: 10, color: '#c9d1d9', fontSize: 13,
    backgroundColor: '#161b22', marginBottom: 8,
  },
  screenshot: { width: '100%', height: 200, borderRadius: 8, marginTop: 8, backgroundColor: '#161b22' },
  logBox: { backgroundColor: '#161b22', borderRadius: 8, padding: 12, minHeight: 120 },
  logLine: { color: '#8b949e', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 2 },
  setupContainer: { flex: 1, backgroundColor: '#010409', justifyContent: 'center', alignItems: 'center', padding: 32 },
  setupTitle: { fontSize: 28, fontWeight: '700', color: '#c9d1d9', marginBottom: 16 },
  setupDesc: { fontSize: 15, color: '#8b949e', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  setupBtn: { backgroundColor: '#1f6feb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, width: '100%', alignItems: 'center' },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
