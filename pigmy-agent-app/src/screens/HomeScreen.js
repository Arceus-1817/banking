import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Linking, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Built into Expo
import * as Haptics from 'expo-haptics';
import api, { updateBaseURL } from '../../api';
import { saveRouteToLocal, getLocalRoute, getPendingSyncCount, saveOfflineTransaction, getPendingTransactions, markTransactionSynced, getDailyLog } from '../database';
import CollectionModal from '../components/CollectionModal';

export default function HomeScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [visitedMap, setVisitedMap] = useState({});
  const [onlineStatus, setOnlineStatus] = useState(true);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // 1. Load data from the local SQLite database instantly
  const loadLocalData = async () => {
    const name = await AsyncStorage.getItem('userName');
    setAgentName(name || 'Agent');

    const localData = getLocalRoute();
    setCustomers(localData);
    setPendingCount(getPendingSyncCount());

    // Build the visited map from all SQLite pending sync table entries
    const logs = getDailyLog();
    const map = {};
    logs.forEach(log => {
      if (log.status === 'SKIPPED_CLOSED') {
        map[log.customerId] = 'SKIPPED';
      } else {
        map[log.customerId] = 'COLLECTED';
      }
    });
    setVisitedMap(map);
  };

  useEffect(() => {
    loadLocalData();
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

  // 2. The 2-Way Enterprise Sync Engine
  const syncWithCloud = async () => {
    triggerHaptic();
    setLoading(true);

    try {
      // Grab the Agent ID from the phone's memory
      const agentIdString = await AsyncStorage.getItem('userId');
      const agentId = parseInt(agentIdString || '0');

      // --- PHASE 1: PUSH OFFLINE MONEY TO THE CLOUD ---
      const pendingTxns = getPendingTransactions();
      let successCount = 0;

      if (pendingTxns.length > 0) {
        for (const tx of pendingTxns) {
          const isSkip = tx.status.includes('SKIPPED') || tx.status === 'CLOSURE_REQUESTED';
          const endpoint = tx.type === 'EMI' && !isSkip ? '/api/transactions/loan-emi' : '/api/transactions/deposit';
          
          const payload = {
            customerId: parseInt(tx.customerId),
            agentId: agentId, 
            amount: isSkip ? 0 : parseFloat(tx.amount), // Skips are ₹0
            paymentMode: isSkip ? 'NONE' : (tx.paymentMode || 'CASH'),
            transactionCategory: isSkip ? tx.status : tx.type 
          };

          try {
            await api.post(endpoint, payload);
            markTransactionSynced(tx.id);
            successCount++;
          } catch (txError) {
            if (txError.response?.status === 400) {
              console.log("❌ Deleting invalid transaction from phone:", txError.response.data);
              markTransactionSynced(tx.id);
            } else {
              console.log("⚠️ Network/Server error. Keeping in queue.");
              throw txError;
            }
          }
        }
      }
      setPendingCount(getPendingSyncCount());

      // --- PHASE 2: PULL DOWN FRESH ROUTE ---
      const response = await api.get('/api/routes/my-daily-route');
      const routeData = response.data;

      if (!routeData || routeData.length === 0) {
        Alert.alert("Route Empty", "You have no customers assigned today.");
      } else {
        saveRouteToLocal(routeData);
        loadLocalData();
      }

      setOnlineStatus(true);

      if (successCount > 0) {
        Alert.alert("Sync Complete", `Successfully pushed ${successCount} deposits to the cloud and refreshed your route!`);
      }

    } catch (error) {
      setOnlineStatus(false);
      console.log("Sync Process Interrupted", error.message);
      Alert.alert("Sync Failed", "Could not complete cloud sync. Running in offline backup mode.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    triggerHaptic();
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  const handleTransactionConfirm = (customerId, amount, paymentMode, txType, status) => {
    saveOfflineTransaction(customerId, amount, paymentMode, txType, status);
    loadLocalData(); // Reload local SQLite state and visitedMap instantly!

    setModalVisible(false);

    if (status === 'SKIPPED_CLOSED') {
      Alert.alert("Skipped", "Customer marked as skipped/closed.");
    } else {
      Alert.alert("Collected", `₹${amount} recorded offline!`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  // Filter & Search Logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.accountNumber.includes(searchQuery);
    
    const status = visitedMap[c.id];
    if (activeFilter === 'PENDING') return matchesSearch && !status;
    if (activeFilter === 'VISITED') return matchesSearch && status === 'COLLECTED';
    if (activeFilter === 'SKIPPED') return matchesSearch && status === 'SKIPPED';
    
    return matchesSearch;
  });

  // Render each customer in the list
  const renderCustomer = ({ item }) => {
    const status = visitedMap[item.id];
    let badgeColor = '#718096';
    let badgeText = 'PENDING';
    let badgeBg = 'rgba(113, 128, 150, 0.1)';
    let badgeBorder = 'rgba(113, 128, 150, 0.2)';
    
    if (status === 'COLLECTED') {
      badgeColor = '#10b981';
      badgeText = 'COLLECTED';
      badgeBg = 'rgba(16, 185, 129, 0.1)';
      badgeBorder = 'rgba(16, 185, 129, 0.3)';
    } else if (status === 'SKIPPED') {
      badgeColor = '#ef4444';
      badgeText = 'SKIPPED';
      badgeBg = 'rgba(239, 68, 68, 0.1)';
      badgeBorder = 'rgba(239, 68, 68, 0.3)';
    }

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardPressable}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setSelectedCustomer(item);
            setModalVisible(true);
          }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.sequenceBadge}>
              <Text style={styles.sequenceText}>#{item.routeSequence || 0}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.customerName}>{item.name}</Text>
                {item.riskStatus && item.riskStatus !== 'LOW' && (
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: item.riskStatus === 'CRITICAL' ? '#ef4444' : item.riskStatus === 'HIGH' ? '#f97316' : '#eab308'
                  }} />
                )}
                {item.phoneNumber ? (
                  <TouchableOpacity 
                    style={styles.cardPhoneBtn}
                    onPress={() => { triggerHaptic(); Linking.openURL(`tel:${item.phoneNumber}`); }}
                  >
                    <Ionicons name="call" size={12} color="#38bdf8" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity 
                  style={[styles.cardPhoneBtn, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}
                  onPress={() => {
                    triggerHaptic();
                    const lat = item.latitude;
                    const lng = item.longitude;
                    if (lat && lng) {
                      const url = Platform.select({
                        ios: `maps://app?daddr=${lat},${lng}`,
                        android: `google.navigation:q=${lat},${lng}`
                      });
                      Linking.openURL(url);
                    } else if (item.residentialAddress) {
                      const url = Platform.select({
                        ios: `maps://app?daddr=${encodeURIComponent(item.residentialAddress)}`,
                        android: `google.navigation:q=${encodeURIComponent(item.residentialAddress)}`
                      });
                      Linking.openURL(url);
                    } else {
                      Alert.alert("No Location", "No address or coordinates specified for this client.");
                    }
                  }}
                >
                  <Ionicons name="navigate" size={12} color="#D4AF37" />
                </TouchableOpacity>
              </View>
              <Text style={styles.accountNumber}>ACC: {item.accountNumber}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabel}>Current Bal</Text>
              <Text style={styles.balanceValue}>₹{item.currentBalance}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            {item.outstandingLoan > 0 ? (
              <View style={styles.loanInfo}>
                <Text style={styles.loanTotal}>Loan: ₹{item.outstandingLoan}</Text>
                <Text style={styles.loanEmi}>EMI: ₹{item.activeMonthlyEmi}</Text>
              </View>
            ) : <View />}
            
            <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={styles.agentName}>{agentName}</Text>
            <View style={[styles.statusPill, { backgroundColor: onlineStatus ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }]}>
              <View style={[styles.statusDot, { backgroundColor: onlineStatus ? '#10b981' : '#f59e0b' }]} />
              <Text style={[styles.statusPillText, { color: onlineStatus ? '#10b981' : '#f59e0b' }]}>
                {onlineStatus ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.settingsHeaderIcon} onPress={() => { triggerHaptic(); setSettingsVisible(true); }}>
            <Ionicons name="settings-outline" size={24} color="#718096" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff4757" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SYNC DASHBOARD */}
      <View style={styles.syncDashboard}>
        <View>
          <Text style={styles.statLabel}>Pending Syncs</Text>
          <Text style={styles.statValue}>{pendingCount} <Text style={{ fontSize: 12, color: '#718096' }}>txns</Text></Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={syncWithCloud} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A1128" /> : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color="#0A1128" />
              <Text style={styles.syncBtnText}>SYNC ROUTE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#718096" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or account number..."
          placeholderTextColor="#4a5568"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { triggerHaptic(); setSearchQuery(''); }} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={18} color="#718096" />
          </TouchableOpacity>
        )}
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: 'All' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'VISITED', label: 'Collected' },
          { key: 'SKIPPED', label: 'Skipped' }
        ].map(filter => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => {
                triggerHaptic();
                setActiveFilter(filter.key);
              }}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ROUTE LIST */}
      <Text style={styles.sectionTitle}>Today&apos;s Hit List ({filteredCustomers.length})</Text>
      {filteredCustomers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color="#2d3748" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching customers found.' : 'Your route checklist is empty.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomer}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <CollectionModal
        visible={modalVisible}
        customer={selectedCustomer}
        onClose={() => setModalVisible(false)}
        onConfirm={handleTransactionConfirm}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128', paddingTop: 50, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: '#718096' },
  agentName: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0' },
  logoutBtn: { padding: 8, backgroundColor: 'rgba(255,71,87,0.1)', borderRadius: 10 },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },

  syncDashboard: { backgroundColor: '#111C3D', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1F326D', marginBottom: 16 },
  statLabel: { fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  syncBtn: { backgroundColor: '#D4AF37', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, gap: 6 },
  syncBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 12 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111C3D', borderRadius: 10, borderWidth: 1, borderColor: '#1F326D', paddingHorizontal: 12, height: 48, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#e2e8f0', fontSize: 14 },
  clearSearchBtn: { padding: 4 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { flex: 1, backgroundColor: '#111C3D', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1F326D' },
  filterChipActive: { backgroundColor: '#15224F', borderColor: '#D4AF37' },
  filterChipText: { color: '#718096', fontSize: 11, fontWeight: 'bold' },
  filterChipTextActive: { color: '#D4AF37' },

  sectionTitle: { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#718096', textAlign: 'center', marginTop: 12, fontSize: 14 },

  card: { backgroundColor: '#15224F', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1F326D', overflow: 'hidden' },
  cardPressable: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  sequenceBadge: { backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sequenceText: { color: '#D4AF37', fontWeight: 'bold', fontSize: 14 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#e2e8f0' },
  cardPhoneBtn: { backgroundColor: 'rgba(56,189,248,0.1)', padding: 4, borderRadius: 6 },
  accountNumber: { fontSize: 11, color: '#718096', marginTop: 2 },
  balanceLabel: { fontSize: 9, color: '#718096', textTransform: 'uppercase' },
  balanceValue: { fontSize: 13, fontWeight: 'bold', color: '#e2e8f0', marginTop: 1 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1F326D', marginTop: 10, paddingTop: 8 },
  loanInfo: { gap: 2 },
  loanTotal: { fontSize: 11, color: '#D4AF37', fontWeight: 'bold' },
  loanEmi: { fontSize: 10, color: '#a0abc0' },
  statusBadge: { borderWidth: 1, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  settingsHeaderIcon: { padding: 8, backgroundColor: 'rgba(113,128,150,0.1)', borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#1F326D' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0' },
  modalLabel: { color: '#718096', fontSize: 13, marginBottom: 10 },
  modalInput: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 20 },
  modalSaveBtn: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center' },
  modalSaveBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});