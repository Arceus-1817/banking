import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api, { updateBaseURL } from '../../api';
import { clearLocalData } from '../database';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('backend_url').then(val => {
      setTempUrl(val || 'http://10.74.59.226:8085');
    });
  }, []);

  const saveSettings = async () => {
    if (!tempUrl) return Alert.alert('Error', 'Please enter a valid connection URL');
    await updateBaseURL(tempUrl);
    setSettingsVisible(false);
    Alert.alert('Settings Saved', `API server URL set to:\n${tempUrl}`);
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter both email and password.');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const data = response.data;
      
      const actualToken = data.token || data.jwt || data.accessToken;
      const actualRole = data.role || data.user?.role;
      const actualName = data.name || data.user?.name || 'Agent';
      const actualId = String(data.id || data.user?.id || data.userId || '1');

      if (actualRole !== 'AGENT') {
        return Alert.alert('Access Denied', 'This app is strictly for Field Agents.');
      }

      // 🚨 THE SMART WIPE LOGIC
      const previousAgentId = await AsyncStorage.getItem('userId');
      if (previousAgentId && previousAgentId !== actualId) {
         // A different agent is logging in! Now we wipe the old agent's data.
         clearLocalData();
      }

      const tenantUpiId = data.tenantUpiId || 'pigmypay@icici';
      const tenantUpiMerchantName = data.tenantUpiMerchantName || 'PigmyPay FinTech';

      await AsyncStorage.setItem('userToken', actualToken);
      await AsyncStorage.setItem('userName', actualName);
      await AsyncStorage.setItem('userId', actualId);
      await AsyncStorage.setItem('tenantUpiId', tenantUpiId);
      await AsyncStorage.setItem('tenantUpiMerchantName', tenantUpiMerchantName);

      navigation.replace('Home');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      Alert.alert('Login Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableOpacity style={styles.settingsIcon} onPress={() => setSettingsVisible(true)}>
        <Ionicons name="settings-outline" size={24} color="#718096" />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.iconBox}><Text style={styles.iconText}>₿</Text></View>
        <Text style={styles.logo}>Pigmy<Text style={styles.logoAccent}>Pay</Text></Text>
        <Text style={styles.subtitle}>AGENT TERMINAL</Text>
      </View>

      <View style={styles.form}>
        <TextInput 
          style={styles.input} 
          placeholder="Agent Email" 
          placeholderTextColor="#4a5568"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Secure Password" 
          placeholderTextColor="#4a5568"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.buttonText}>SECURE LOGIN</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={settingsVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connection Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>Backend Server URL:</Text>
            <TextInput
              style={styles.modalInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://10.74.59.226:8085"
              placeholderTextColor="#4a5568"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TouchableOpacity style={styles.modalSaveBtn} onPress={saveSettings}>
              <Text style={styles.modalSaveBtnText}>SAVE SETTINGS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128', justifyContent: 'center', padding: 30 },
  settingsIcon: { position: 'absolute', top: 50, right: 30, padding: 8, zIndex: 10 },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText: { fontSize: 24, color: '#D4AF37', fontWeight: 'bold' },
  logo: { fontSize: 32, fontWeight: '800', color: '#e2e8f0' },
  logoAccent: { color: '#D4AF37' },
  subtitle: { fontSize: 12, color: '#718096', letterSpacing: 2, marginTop: 5, fontWeight: '600' },
  form: { width: '100%' },
  input: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#1F326D' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0' },
  modalLabel: { color: '#718096', fontSize: 13, marginBottom: 10 },
  modalInput: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 20 },
  modalSaveBtn: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center' },
  modalSaveBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});