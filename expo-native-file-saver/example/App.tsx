import { saveFile, openFilePicker, readFile, fileExists, deleteFile } from 'expo-native-file-saver';
import { useState } from 'react';
import {
  Alert, Platform, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

export default function App() {
  const [fileName, setFileName] = useState('my-file.txt');
  const [content, setContent] = useState('Hello from expo-native-file-saver!\nThis file was saved natively.');
  const [lastSavedUri, setLastSavedUri] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  // ---- Save with native GUI dialog (SAF) ----
  const handleSaveWithDialog = async () => {
    try {
      addLog(`Opening save dialog for "${fileName}"...`);
      const result = await saveFile({
        data: content,
        fileName,
        mimeType: 'text/plain',
        showDialog: true,   // ← shows the native "Save to..." picker
        isBase64: false,
      });
      if (result.success) {
        setLastSavedUri(result.uri);
        addLog(`✅ ${result.message}`);
        Alert.alert('Saved!', result.filePath);
      } else {
        addLog(`ℹ️ ${result.message}`); // user cancelled
      }
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    }
  };

  // ---- Save silently to Downloads (no dialog) ----
  const handleSaveSilent = async () => {
    try {
      addLog('Saving silently to Downloads...');
      const result = await saveFile({
        data: content,
        fileName,
        mimeType: 'text/plain',
        showDialog: false,   // ← no dialog, direct save
        location: 'downloads',
        isBase64: false,
      });
      setLastSavedUri(result.filePath);
      addLog(`✅ ${result.message}`);
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    }
  };

  // ---- Save base64 PDF with dialog ----
  const handleSavePdf = async () => {
    // Minimal valid PDF in base64
    const pdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPJ4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxMAolJUVPRgo=';
    try {
      addLog('Opening save dialog for PDF...');
      const result = await saveFile({
        data: pdfBase64,
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        showDialog: true,
        isBase64: true,
      });
      if (result.success) {
        addLog(`✅ PDF saved: ${result.message}`);
      } else {
        addLog(`ℹ️ ${result.message}`);
      }
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    }
  };

  // ---- Open file picker ----
  const handleOpenPicker = async () => {
    try {
      addLog('Opening file picker...');
      const picked = await openFilePicker(['text/plain', 'application/pdf']);
      if (!picked.cancelled) {
        addLog(`📂 Picked: ${picked.fileName} (${picked.mimeType})`);
        if (picked.mimeType === 'text/plain') {
          const text = await readFile(picked.uri, false);
          addLog(`📄 Content: ${text.slice(0, 80)}...`);
        }
      } else {
        addLog('ℹ️ Picker cancelled');
      }
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📁 expo-native-file-saver</Text>
      <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>

      <Text style={styles.label}>File Name</Text>
      <TextInput style={styles.input} value={fileName} onChangeText={setFileName} />

      <Text style={styles.label}>File Content</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={content}
        onChangeText={setContent} multiline />

      {/* Primary — SAF dialog */}
      <TouchableOpacity style={styles.btn} onPress={handleSaveWithDialog}>
        <Text style={styles.btnText}>💾 Save — Show Native Dialog</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Opens the "Save to..." picker just like a real Android app</Text>

      {/* Silent save */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#0891b2' }]} onPress={handleSaveSilent}>
        <Text style={styles.btnText}>⬇️ Save Silently to Downloads</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>No dialog — saves directly in background</Text>

      {/* PDF */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#7c3aed' }]} onPress={handleSavePdf}>
        <Text style={styles.btnText}>📄 Save PDF with Dialog</Text>
      </TouchableOpacity>

      {/* Open picker */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#059669' }]} onPress={handleOpenPicker}>
        <Text style={styles.btnText}>📂 Open File Picker</Text>
      </TouchableOpacity>

      {!!lastSavedUri && (
        <Text style={styles.uriText} numberOfLines={2}>Last saved: {lastSavedUri}</Text>
      )}

      <Text style={styles.logTitle}>Log</Text>
      {log.map((entry, i) => (
        <Text key={i} style={styles.logEntry}>{entry}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8,
    padding: 10, fontSize: 14, backgroundColor: '#fff', color: '#1e293b' },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginLeft: 2 },
  uriText: { fontSize: 11, color: '#64748b', marginTop: 8,
    backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6 },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 20, marginBottom: 4 },
  logEntry: { fontSize: 11, color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 2 },
});
