import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getLedgerStats } from '../database';
import { useTranslation } from '../localization';

export default function LedgerScreen() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ cash: 0, upi: 0, skipped: 0, collected: 0, totalAssigned: 0 });
  const [helpVisible, setHelpVisible] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      setStats(getLedgerStats());
    }
  }, [isFocused]);

  const totalCollected = stats.cash + stats.upi;
  const remainingVisits = Math.max(0, stats.totalAssigned - (stats.collected + stats.skipped));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('ledger')}</Text>
        <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={28} color="#D4AF37" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL VALUE COLLECTED</Text>
        <Text style={styles.totalAmount}>₹{totalCollected}</Text>
      </View>

      <Text style={styles.sectionTitle}>Financial Breakdown</Text>
      <View style={styles.breakdownContainer}>
        <View style={styles.statBox}>
          <Ionicons name="cash-outline" size={24} color="#D4AF37" style={{marginBottom: 8}} />
          <Text style={styles.statLabel}>{t('filterCash')} in Pocket</Text>
          <Text style={styles.statValue}>₹{stats.cash}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#111C3D', borderColor: '#1F326D' }]}>
          <Ionicons name="phone-portrait-outline" size={24} color="#38bdf8" style={{marginBottom: 8}}/>
          <Text style={styles.statLabel}>{t('filterUpi')} Auto-Settled</Text>
          <Text style={styles.statValue}>₹{stats.upi}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Route Performance</Text>
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Total Customers Assigned</Text>
          <Text style={styles.analyticsData}>{stats.totalAssigned}</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Successful Collections</Text>
          <Text style={[styles.analyticsData, {color: '#D4AF37'}]}>{stats.collected}</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Customers Skipped/Closed</Text>
          <Text style={[styles.analyticsData, {color: '#ff4757'}]}>{stats.skipped}</Text>
        </View>
        <View style={[styles.analyticsRow, {borderBottomWidth: 0, paddingTop: 12}]}>
          <Text style={styles.analyticsLabel}>Remaining to Visit</Text>
          <Text style={[styles.analyticsData, {color: '#f59e0b', fontSize: 20}]}>{remainingVisits}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="warning-outline" size={24} color="#f59e0b" />
        <Text style={styles.infoText}>
          At the end of your shift, you must hand exactly ₹{stats.cash} to the Branch Manager.
        </Text>
      </View>

      <Modal visible={helpVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agent Help Guide</Text>
              <TouchableOpacity onPress={() => setHelpVisible(false)}>
                <Ionicons name="close" size={28} color="#718096" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{marginTop: 10}}>
              <Text style={styles.helpHeading}>1. Syncing your Route</Text>
              <Text style={styles.helpText}>Always press &quot;SYNC ROUTE&quot; at the start of your day on a strong Wi-Fi connection to download your customer list.</Text>
              
              <Text style={styles.helpHeading}>2. Offline Collections</Text>
              <Text style={styles.helpText}>You do not need internet to collect cash. The app saves transactions offline. Ensure you hit &quot;SYNC&quot; when you get cell service to upload the money.</Text>

              <Text style={styles.helpHeading}>3. Cash vs UPI</Text>
              <Text style={styles.helpText}>Only &quot;Cash&quot; adds to your physical pocket balance. If a customer pays via PhonePe/GPay directly to the company QR code, mark it as UPI.</Text>

              <Text style={styles.helpHeading}>4. Skipping Customers</Text>
              <Text style={styles.helpText}>If a shop is closed, tap the customer and press &quot;Skip&quot;. This informs the Branch Manager without collecting money.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <View style={{height: 100}}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128', paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  helpBtn: { padding: 8, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: 12 },
  totalCard: { backgroundColor: '#D4AF37', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  totalLabel: { color: '#0A1128', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  totalAmount: { color: '#0A1128', fontSize: 48, fontWeight: '900' },
  sectionTitle: { fontSize: 14, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 'bold' },
  breakdownContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#15224F', borderWidth: 1, borderColor: '#D4AF37', borderRadius: 16, padding: 20, alignItems: 'center' },
  statLabel: { color: '#718096', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  statValue: { color: '#e2e8f0', fontSize: 24, fontWeight: 'bold' },
  analyticsCard: { backgroundColor: '#111C3D', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1F326D', marginBottom: 24 },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F326D' },
  analyticsLabel: { color: '#a0aec0', fontSize: 14 },
  analyticsData: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: 40 },
  infoText: { color: '#f59e0b', fontSize: 13, flex: 1, lineHeight: 20, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F326D' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0' },
  helpHeading: { fontSize: 16, fontWeight: 'bold', color: '#D4AF37', marginTop: 16, marginBottom: 8 },
  helpText: { fontSize: 14, color: '#a0aec0', lineHeight: 22 }
});