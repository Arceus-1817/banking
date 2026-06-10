import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import api, { updateBaseURL } from '../../api';
import { getPendingTransactions, markTransactionSynced } from '../database';
import { useTranslation } from '../localization';

export default function ProfileScreen({ navigation }) {
  const { locale, changeLanguage, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  // Security & PIN States
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinCode, setPinCode] = useState('');
  
  // Connection & Offline states
  const [offlineSim, setOfflineSim] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  
  const [pendingTxns, setPendingTxns] = useState([]);
  const isFocused = useIsFocused();

  const loadLocalSettings = async () => {
    // Check PIN status
    const savedPin = await AsyncStorage.getItem('appPIN');
    setPinEnabled(!!savedPin);

    // Check Offline Sim status
    const offlineSimVal = await AsyncStorage.getItem('simulate_offline');
    setOfflineSim(offlineSimVal === 'true');

    // Load device ID
    const dId = await AsyncStorage.getItem('deviceId');
    setDeviceId(dId || 'Unknown');

    // Load active URL
    const activeUrl = await AsyncStorage.getItem('backend_url');
    setTempUrl(activeUrl || 'http://10.74.59.226:8085');

    // Get SQLite pending queue
    const queue = getPendingTransactions();
    setPendingTxns(queue);
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/me');
      setProfile(res.data);
    } catch (err) {
      console.log("Failed to fetch profile details", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadLocalSettings();
      fetchProfile();
    }
  }, [isFocused]);

  const handleTogglePin = async (value) => {
    if (!value) {
      // Disable PIN
      await AsyncStorage.removeItem('appPIN');
      setPinEnabled(false);
      Alert.alert("PIN Disabled", "PIN-based quick unlock has been deactivated.");
    } else {
      // Prompt for PIN setup
      setPinCode('');
      setPinModalVisible(true);
    }
  };

  const handleSavePin = async () => {
    if (pinCode.length !== 4 || isNaN(Number(pinCode))) {
      return Alert.alert("Invalid PIN", "PIN must be exactly 4 numeric digits.");
    }
    await AsyncStorage.setItem('appPIN', pinCode);
    setPinEnabled(true);
    setPinModalVisible(false);
    Alert.alert("PIN Configured", "Your 4-digit security PIN is now active.");
  };

  const handleToggleOfflineSim = async (value) => {
    await AsyncStorage.setItem('simulate_offline', value ? 'true' : 'false');
    setOfflineSim(value);
  };

  const saveUrlSettings = async () => {
    if (!tempUrl) return Alert.alert('Error', 'Please enter a valid connection URL');
    await updateBaseURL(tempUrl);
    setUrlModalVisible(false);
    Alert.alert('URL Updated', `API server URL successfully set to:\n${tempUrl}`);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to end your shift? Offline transactions will remain saved in local cache.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleForceSync = async () => {
    if (offlineSim) {
      return Alert.alert("Sync Blocked", "Please turn off Simulated Offline Mode to upload data.");
    }
    if (pendingTxns.length === 0) {
      return Alert.alert("Synced", "No transactions pending upload.");
    }

    setSyncLoading(true);
    try {
      const agentIdString = await AsyncStorage.getItem('userId');
      const agentId = parseInt(agentIdString || '0');
      let successCount = 0;

      for (const tx of pendingTxns) {
        const isSkip = tx.status.includes('SKIPPED') || tx.status === 'CLOSURE_REQUESTED';
        const endpoint = tx.type === 'EMI' && !isSkip ? '/api/transactions/loan-emi' : '/api/transactions/deposit';
        
        const payload = {
          customerId: parseInt(tx.customerId),
          agentId: agentId,
          amount: isSkip ? 0 : parseFloat(tx.amount),
          paymentMode: isSkip ? 'NONE' : (tx.paymentMode || 'CASH'),
          transactionCategory: isSkip ? tx.status : tx.type
        };

        await api.post(endpoint, payload);
        markTransactionSynced(tx.id);
        successCount++;
      }

      Alert.alert("Sync Successful", `Successfully uploaded ${successCount} offline records to the cloud!`);
      loadLocalSettings();
    } catch (_err) {
      Alert.alert("Upload Failed", "Backend server connection refused. Ensure network connectivity is active.");
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('settings')}</Text>

      {/* 1. AGENT IDENTITY CARD */}
      <View style={styles.sectionCard}>
        <View style={styles.agentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name ? profile.name.split(' ').map(n=>n[0]).join('') : 'AG'}
            </Text>
          </View>
          <View style={{flex: 1, marginLeft: 16}}>
            <Text style={styles.agentName}>{profile?.name}</Text>
            <Text style={styles.agentEmail}>{profile?.email}</Text>
            <Text style={styles.agentBranch}>Branch: <Text style={{color:'#D4AF37'}}>{profile?.branchName || 'HQ'}</Text></Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Employee Phone:</Text>
          <Text style={styles.detailValue}>{profile?.phoneNumber || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Collection Limit:</Text>
          <Text style={styles.detailValue}>₹{profile?.dailyCollectionLimit} / day</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Max Vault Holding:</Text>
          <Text style={styles.detailValue}>₹{profile?.maxCashHoldingLimit}</Text>
        </View>
      </View>

      {/* VERNACULAR LANGUAGE SELECTOR */}
      <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'mr', label: 'मराठी' },
            { code: 'kn', label: 'ಕನ್ನಡ' }
          ].map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langBtn,
                locale === lang.code && styles.langBtnActive
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[
                styles.langBtnText,
                locale === lang.code && styles.langBtnTextActive
              ]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 2. SECURITY SETTINGS */}
      <Text style={styles.sectionTitle}>{t('appSecurity')}</Text>
      <View style={styles.sectionCard}>
        <View style={styles.settingRow}>
          <View style={{flex: 1}}>
            <Text style={styles.settingLabel}>{t('pinLockLabel')}</Text>
            <Text style={styles.settingDesc}>{t('pinLockDesc')}</Text>
          </View>
          <Switch
            value={pinEnabled}
            onValueChange={handleTogglePin}
            trackColor={{ false: '#111C3D', true: '#D4AF37' }}
            thumbColor={pinEnabled ? '#0A1128' : '#718096'}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('deviceIdLabel')}:</Text>
          <Text style={[styles.detailValue, {fontSize:11, fontFamily:'monospace'}]}>
            {deviceId.substring(0, 16)}...
          </Text>
        </View>
      </View>

      {/* 3. OFFLINE SYNC QUEUE */}
      <Text style={styles.sectionTitle}>{t('syncManager')}</Text>
      <View style={styles.sectionCard}>
        <View style={styles.settingRow}>
          <View style={{flex: 1}}>
            <Text style={styles.settingLabel}>{t('offlineSimLabel')}</Text>
            <Text style={styles.settingDesc}>{t('offlineSimDesc')}</Text>
          </View>
          <Switch
            value={offlineSim}
            onValueChange={handleToggleOfflineSim}
            trackColor={{ false: '#111C3D', true: '#D4AF37' }}
            thumbColor={offlineSim ? '#0A1128' : '#718096'}
          />
        </View>

        <View style={styles.separator} />

        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8}}>
          <View>
            <Text style={styles.settingLabel}>{t('pendingQueueLabel')}</Text>
            <Text style={styles.settingDesc}>
              {pendingTxns.length} {t('pendingQueueDesc')}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.syncBtn, {opacity: pendingTxns.length === 0 || syncLoading ? 0.6 : 1}]}
            onPress={handleForceSync}
            disabled={pendingTxns.length === 0 || syncLoading}
          >
            {syncLoading ? (
              <ActivityIndicator size="small" color="#0A1128" />
            ) : (
              <Text style={styles.syncBtnText}>{t('syncNowBtn')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {pendingTxns.length > 0 && (
          <View style={styles.queueContainer}>
            {pendingTxns.map((item, index) => (
              <View key={item.id || index} style={styles.queueItem}>
                <Ionicons 
                  name={item.status === 'SKIPPED_CLOSED' ? 'close-circle' : 'checkmark-circle'} 
                  size={18} 
                  color={item.status === 'SKIPPED_CLOSED' ? '#ff4757' : '#D4AF37'} 
                />
                <Text style={styles.queueText}>
                  {item.status === 'SKIPPED_CLOSED' ? t('filterSkipped') : t('filterCollected')}: Acc {item.customerId} · ₹{item.amount}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 4. NETWORKING & CONNECTION */}
      <Text style={styles.sectionTitle}>{t('apiConfigLabel')}</Text>
      <View style={styles.sectionCard}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View style={{flex:1}}>
            <Text style={styles.settingLabel}>{t('apiConfigLabel')}</Text>
            <Text style={styles.settingDesc}>{tempUrl}</Text>
          </View>
          <TouchableOpacity style={styles.editUrlBtn} onPress={() => setUrlModalVisible(true)}>
            <Text style={styles.editUrlBtnText}>{t('configureBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4757" />
        <Text style={styles.logoutText}>{t('logoutBtn')}</Text>
      </TouchableOpacity>

      {/* PIN SETUP MODAL */}
      <Modal visible={pinModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure Lock PIN</Text>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              Set a secure 4-digit PIN code to lock your PigmyPay terminal. This PIN will be required on app launches for quick access.
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="Enter 4-Digit PIN"
              placeholderTextColor="#4a5568"
              value={pinCode}
              onChangeText={setPinCode}
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSavePin}>
              <Text style={styles.modalSaveBtnText}>ACTIVATE QUICK PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* API URL CONFIGURATION MODAL */}
      <Modal visible={urlModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>API Server Endpoint</Text>
              <TouchableOpacity onPress={() => setUrlModalVisible(false)}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              Configure the connection target hostname for the banking core backend.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://10.74.59.226:8085"
              placeholderTextColor="#4a5568"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={saveUrlSettings}>
              <Text style={styles.modalSaveBtnText}>SAVE API ENDPOINT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{height: 100}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128', paddingTop: 50, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 24 },
  sectionCard: { backgroundColor: '#111C3D', borderHeight: 1, borderColor: '#1F326D', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 24 },
  agentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(212,175,55,0.15)', borderHeight: 1, borderColor: '#D4AF37', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#D4AF37', fontSize: 18, fontWeight: 'bold' },
  agentName: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0' },
  agentEmail: { fontSize: 13, color: '#718096', marginTop: 2 },
  agentBranch: { fontSize: 12, color: '#a0aec0', marginTop: 4, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#1F326D', marginVertical: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  detailLabel: { color: '#718096', fontSize: 13 },
  detailValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  settingDesc: { color: '#718096', fontSize: 12, marginTop: 4, maxWidth: '80%', lineHeight: 16 },
  syncBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  syncBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
  queueContainer: { marginTop: 12, backgroundColor: '#0A1128', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#1F326D' },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  queueText: { color: '#a0aec0', fontSize: 12, fontFamily: 'monospace' },
  editUrlBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(113, 128, 150, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: '#1F326D' },
  editUrlBtnText: { color: '#D4AF37', fontSize: 12, fontWeight: '600' },
  langBtn: { flex: 1, paddingVertical: 10, backgroundColor: 'rgba(113, 128, 150, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: '#1F326D', alignItems: 'center' },
  langBtnActive: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  langBtnText: { color: '#718096', fontSize: 12, fontWeight: 'bold' },
  langBtnTextActive: { color: '#0A1128' },
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)', backgroundColor: 'rgba(255, 71, 87, 0.05)', borderRadius: 12, marginBottom: 40 },
  logoutText: { color: '#ff4757', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#1F326D' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0' },
  modalBodyText: { color: '#a0aec0', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalInput: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 20 },
  modalSaveBtn: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center' },
  modalSaveBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});
