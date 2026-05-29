import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Built into Expo
import api from '../../api';
import { saveRouteToLocal, getLocalRoute, getPendingSyncCount, clearLocalData, saveOfflineTransaction, getPendingTransactions, markTransactionSynced } from '../database';
import CollectionModal from '../components/CollectionModal'; // 🚨 Add this

export default function HomeScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Load data from the local SQLite database instantly
  const loadLocalData = async () => {
    const name = await AsyncStorage.getItem('userName');
    setAgentName(name || 'Agent');

    const localData = getLocalRoute();
    setCustomers(localData);
    setPendingCount(getPendingSyncCount());
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  // 2. Fetch fresh data from Spring Boot (Requires Internet)
  // 2. The 2-Way Enterprise Sync Engine
  const syncWithCloud = async () => {
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
          // 🚨 Allow Skips to be sent to the server so the Manager can see them!
          const isSkip = tx.status.includes('SKIPPED') || tx.status === 'CLOSURE_REQUESTED';
          
          const endpoint = tx.type === 'EMI' && !isSkip ? '/api/transactions/loan-emi' : '/api/transactions/deposit';
          
          const payload = {
            customerId: parseInt(tx.customerId),
            agentId: agentId, 
            amount: isSkip ? 0 : parseFloat(tx.amount), // Skips are ₹0
            paymentMode: isSkip ? 'NONE' : (tx.paymentMode || 'CASH'),
            // We pass the reason so Spring Boot knows WHY it was ₹0
            transactionCategory: isSkip ? tx.status : tx.type 
          };

          try {
            await api.post(endpoint, payload);
            markTransactionSynced(tx.id);
            successCount++;
          } catch (txError) {
            // 🚨 IMPROVED ERROR HANDLING:
            // If the server says "400 Bad Request" (like No Loan exists), 
            // we should probably remove it from the phone because it will NEVER work.
            if (txError.response?.status === 400) {
              console.log("❌ Deleting invalid transaction from phone:", txError.response.data);
              markTransactionSynced(tx.id);
            } else {
              // If it's a 500 error or Network error, keep it on the phone to try later.
              console.log("⚠️ Network/Server error. Keeping in queue.");
              throw txError;
            }
          }
        }
      }
      // Update the UI counter instantly
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

      // Final Alert to the Agent
      if (successCount > 0) {
        Alert.alert("Sync Complete", `Successfully pushed ${successCount} deposits to the cloud and refreshed your route!`);
      }

    } catch (error) {
      // This will now only trigger if the Wi-Fi drops completely
      console.log("Sync Process Interrupted", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // 🚨 Notice we removed clearLocalData() from here!
    // We only clear the session token now, the data stays safe on the phone.
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  // Render each customer in the list
  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        setSelectedCustomer(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.sequenceBadge}>
          <Text style={styles.sequenceText}>#{item.routeSequence || 0}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.accountNumber}>ACC: {item.accountNumber}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.balanceLabel}>Current Bal</Text>
          <Text style={styles.balanceValue}>₹{item.currentBalance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleTransactionConfirm = (customerId, amount, paymentMode, txType, status) => {
    // 1. Save it to the SQLite Queue
    saveOfflineTransaction(customerId, amount, paymentMode, txType, status);

    // 2. Update UI
    setPendingCount(getPendingSyncCount());
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.agentName}>{agentName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4757" />
        </TouchableOpacity>
      </View>

      {/* SYNC DASHBOARD */}
      <View style={styles.syncDashboard}>
        <View>
          <Text style={styles.statLabel}>Pending Syncs</Text>
          <Text style={styles.statValue}>{pendingCount} <Text style={{ fontSize: 12, color: '#4a5568' }}>transactions</Text></Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={syncWithCloud} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color="#000" />
              <Text style={styles.syncBtnText}>SYNC ROUTE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ROUTE LIST */}
      <Text style={styles.sectionTitle}>Today&apos;s Hit List ({customers.length})</Text>
      {customers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color="#2d3748" />
          <Text style={styles.emptyText}>Tap &apos;SYNC ROUTE&apos; to download your customers for today.</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c0f', paddingTop: 50, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: '#718096' },
  agentName: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  logoutBtn: { padding: 8, backgroundColor: 'rgba(255,71,87,0.1)', borderRadius: 10 },

  syncDashboard: { backgroundColor: '#111318', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1e2530', marginBottom: 24 },
  statLabel: { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#e2e8f0' },
  syncBtn: { backgroundColor: '#00ff88', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, gap: 8 },
  syncBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  sectionTitle: { fontSize: 14, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#718096', textAlign: 'center', marginTop: 12, fontSize: 14 },

  card: { backgroundColor: '#161b22', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e2530' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  sequenceBadge: { backgroundColor: 'rgba(0,255,136,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sequenceText: { color: '#00ff88', fontWeight: 'bold', fontSize: 16 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#e2e8f0' },
  accountNumber: { fontSize: 12, color: '#718096', marginTop: 2 },
  balanceLabel: { fontSize: 10, color: '#718096', textTransform: 'uppercase' },
  balanceValue: { fontSize: 14, fontWeight: 'bold', color: '#e2e8f0', marginTop: 2 }
});