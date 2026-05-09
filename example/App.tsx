import { saveFile, getDirectoryPath, fileExists, deleteFile, StorageLocation } from 'expo-native-file-saver';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

const LOCATIONS: StorageLocation[] = ['downloads', 'documents', 'pictures', 'cache'];

export default function App() {
  const [fileName, setFileName] = useState('my-file.txt');
  const [content, setContent] = useState('Hello from expo-native-file-saver! 🎉\nThis file was saved natively.');
  const [location, setLocation] = useState<StorageLocation>('downloads');
  const [subDir, setSubDir] = useState('');
  const [lastSavedPath, setLastSavedPath] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const handleSaveText = async () => {
    try {
      addLog(`Saving "${fileName}" to ${location}...`);
      const result = await saveFile({
        data: content,
        fileName,
        mimeType: 'text/plain',
        location,
        subDirectory: subDir,
        isBase64: false,
        overwrite: true,
      });
      setLastSavedPath(result.filePath);
      addLog(`✅ ${result.message}`);
      Alert.alert('Saved!', result.filePath);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
      Alert.alert('Error', e.message);
    }
  };

  const handleSaveBase64 = async () => {
    // A tiny valid 1×1 red PNG in base64
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    try {
      addLog('Saving sample PNG image...');
      const result = await saveFile({
        data: pngBase64,
        fileName: 'sample.png',
        mimeType: 'image/png',
        location: 'pictures',
        isBase64: true,
        overwrite: true,
      });
      setLastSavedPath(result.filePath);
      addLog(`✅ ${result.message}`);
      Alert.alert('Image Saved!', result.filePath);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
      Alert.alert('Error', e.message);
    }
  };

  const handleGetDirPath = async () => {
    try {
      const path = await getDirectoryPath({ location, subDirectory: subDir });
      setDirPath(path);
      addLog(`📁 ${location}: ${path}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
  };

  const handleFileExists = async () => {
    if (!lastSavedPath) { addLog('⚠️ Save a file first.'); return; }
    const exists = await fileExists(lastSavedPath);
    addLog(`${exists ? '✅' : '❌'} File ${exists ? 'EXISTS' : 'NOT FOUND'}: ${lastSavedPath}`);
  };

  const handleDelete = async () => {
    if (!lastSavedPath) { addLog('⚠️ Save a file first.'); return; }
    const deleted = await deleteFile(lastSavedPath);
    addLog(`${deleted ? '🗑️ Deleted' : '❌ Could not delete'}: ${lastSavedPath}`);
    if (deleted) setLastSavedPath('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📁 expo-native-file-saver</Text>
      <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>

      <Text style={styles.label}>File Name</Text>
      <TextInput style={styles.input} value={fileName} onChangeText={setFileName} placeholder="my-file.txt" />

      <Text style={styles.label}>File Content</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Sub-directory (optional)</Text>
      <TextInput style={styles.input} value={subDir} onChangeText={setSubDir} placeholder="e.g. MyApp/Reports" />

      <Text style={styles.label}>Storage Location</Text>
      <View style={styles.locationRow}>
        {LOCATIONS.map(loc => (
          <TouchableOpacity
            key={loc}
            style={[styles.locBtn, location === loc && styles.locBtnActive]}
            onPress={() => setLocation(loc)}>
            <Text style={[styles.locBtnText, location === loc && styles.locBtnTextActive]}>
              {loc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSaveText}>
        <Text style={styles.btnText}>💾 Save Text File</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#7c3aed' }]} onPress={handleSaveBase64}>
        <Text style={styles.btnText}>🖼️ Save Sample PNG (base64)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#0891b2' }]} onPress={handleGetDirPath}>
        <Text style={styles.btnText}>📂 Get Directory Path</Text>
      </TouchableOpacity>

      {!!dirPath && <Text style={styles.pathText}>📍 {dirPath}</Text>}

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.halfBtn, { backgroundColor: '#059669' }]} onPress={handleFileExists}>
          <Text style={styles.btnText}>🔍 File Exists?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.halfBtn, { backgroundColor: '#dc2626' }]} onPress={handleDelete}>
          <Text style={styles.btnText}>🗑️ Delete File</Text>
        </TouchableOpacity>
      </View>

      {!!lastSavedPath && (
        <Text style={styles.pathText}>Last saved: {lastSavedPath}</Text>
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
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8,
    padding: 10, fontSize: 14, backgroundColor: '#fff', color: '#1e293b',
  },
  locationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  locBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff',
  },
  locBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  locBtnText: { fontSize: 12, color: '#475569' },
  locBtnTextActive: { color: '#fff', fontWeight: '700' },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  halfBtn: { flex: 1 },
  pathText: {
    fontSize: 11, color: '#64748b', marginTop: 6,
    backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6,
  },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 20, marginBottom: 4 },
  logEntry: { fontSize: 11, color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 2 },
});
