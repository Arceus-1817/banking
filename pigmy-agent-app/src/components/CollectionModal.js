import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../localization';

export default function CollectionModal({ visible, customer, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('SAVINGS');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [showQR, setShowQR] = useState(false);

  const [companyUpiId, setCompanyUpiId] = useState('pigmypay@icici');
  const [companyName, setCompanyName] = useState('PigmyPay FinTech');

  useEffect(() => {
    if (visible) {
      AsyncStorage.multiGet(['tenantUpiId', 'tenantUpiMerchantName']).then(values => {
        const upi = values[0][1];
        const name = values[1][1];
        if (upi) setCompanyUpiId(upi);
        if (name) setCompanyName(name);
      }).catch(err => console.log("Failed to load tenant info from AsyncStorage", err));
    }
  }, [visible]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore if not supported in simulator
    }
  };

  if (!customer) return null;

  const handlePress = (num) => {
    triggerHaptic();
    if (amount.length < 6) setAmount(prev => prev + num);
  };

  const handleBackspace = () => {
    triggerHaptic();
    setAmount(prev => prev.slice(0, -1));
  };
  
  const handleQuickAdd = (val) => {
    triggerHaptic();
    const current = parseInt(amount || '0');
    setAmount((current + val).toString());
  };

  const handleSkip = () => {
    triggerHaptic();
    onConfirm(customer.id, 0, 'NONE', 'SKIPPED_NOT_AVAILABLE', 'SKIPPED_CLOSED'); 
    resetState();
  };

  const submitTransaction = () => {
    triggerHaptic();
    if (!amount || parseInt(amount) <= 0) return;
    onConfirm(customer.id, amount, paymentMode, txType, 'PENDING');
    resetState();
  };

  const resetState = () => {
    setAmount('');
    setShowQR(false);
    setPaymentMode('CASH');
    setTxType('SAVINGS');
  };

  const generateUPIString = () => {
    return `upi://pay?pa=${companyUpiId}&pn=${encodeURIComponent(companyName)}&am=${amount}&cu=INR`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.title}>{customer.name}</Text>
                {customer.riskStatus && customer.riskStatus !== 'LOW' && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: customer.riskStatus === 'CRITICAL' ? '#ef4444' : customer.riskStatus === 'HIGH' ? '#f97316' : '#eab308'
                  }} />
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text style={styles.subtitle}>ACC: {customer.accountNumber}</Text>
                {customer.phoneNumber ? (
                  <TouchableOpacity 
                    style={styles.phoneLink} 
                    onPress={() => { triggerHaptic(); Linking.openURL(`tel:${customer.phoneNumber}`); }}
                  >
                    <Ionicons name="call" size={12} color="#38bdf8" />
                    <Text style={styles.phoneLinkText}>{customer.phoneNumber}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {customer.outstandingLoan > 0 && (
                <Text style={[styles.subtitle, { color: '#D4AF37', marginTop: 6, fontWeight: 'bold' }]}>
                  Outstanding Loan: ₹{customer.outstandingLoan}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { triggerHaptic(); resetState(); onClose(); }} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#718096" />
            </TouchableOpacity>
          </View>

          {showQR ? (
            <View style={styles.qrContainer}>
              <Text style={styles.qrInstruction}>Ask customer to scan to pay exactly</Text>
              <Text style={styles.qrAmount}>₹{amount}</Text>
              
              <View style={styles.qrWrapper}>
                <QRCode value={generateUPIString()} size={200} color="#000" backgroundColor="#fff" />
              </View>
              
              <View style={styles.qrWarning}>
                <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
                <Text style={styles.qrWarningText}>Payments route to Company Account</Text>
              </View>

              <View style={styles.qrActionRow}>
                <TouchableOpacity style={styles.backToNumpadBtn} onPress={() => { triggerHaptic(); setShowQR(false); }}>
                  <Text style={styles.backText}>{t('cancel').toUpperCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtnHalf} onPress={submitTransaction}>
                  <Text style={styles.confirmText}>PAID: CONFIRM</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, txType === 'SAVINGS' && styles.toggleActive]} onPress={() => { triggerHaptic(); setTxType('SAVINGS'); }}>
                  <Text style={[styles.toggleText, txType === 'SAVINGS' && styles.toggleTextActive]}>{t('ledger').toUpperCase()}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.toggleBtn, txType === 'EMI' && styles.toggleActive, (!customer.activeMonthlyEmi || customer.activeMonthlyEmi <= 0) && { opacity: 0.3 }]} 
                  onPress={() => {
                    if (customer.activeMonthlyEmi > 0) {
                      triggerHaptic();
                      setTxType('EMI');
                      setAmount(customer.activeMonthlyEmi.toString());
                    }
                  }}
                  disabled={!customer.activeMonthlyEmi || customer.activeMonthlyEmi <= 0}
                >
                  <Text style={[styles.toggleText, txType === 'EMI' && styles.toggleTextActive]}>{t('emiDue').toUpperCase()}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amountDisplay}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.amountText}>{amount || '0'}</Text>
              </View>

              <View style={styles.quickAddRow}>
                {txType === 'EMI' && customer.activeMonthlyEmi ? (
                  <TouchableOpacity style={[styles.quickAddBtn, {borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)'}]} onPress={() => { triggerHaptic(); setAmount(customer.activeMonthlyEmi.toString()); }}>
                    <Text style={[styles.quickText, {color: '#f59e0b'}]}>🎯 EMI: ₹{customer.activeMonthlyEmi}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(100)}><Text style={styles.quickText}>+100</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(500)}><Text style={styles.quickText}>+500</Text></TouchableOpacity>
                  </>
                )}
                
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'CASH' && styles.modeActive]} onPress={() => { triggerHaptic(); setPaymentMode('CASH'); }}><Text style={styles.modeText}>💵 {t('filterCash')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'UPI' && styles.modeActive]} onPress={() => { triggerHaptic(); setPaymentMode('UPI'); }}><Text style={styles.modeText}>📱 {t('filterUpi')}</Text></TouchableOpacity>
              </View>

              <View style={styles.numpad}>
                {[['1','2','3'],['4','5','6'],['7','8','9'],[t('filterSkipped'),'0','⌫']].map((row, rIdx) => (
                  <View key={rIdx} style={styles.numRow}>
                    <TouchableOpacity 
                      key={row[0]} style={[styles.numBtn, row[0] === t('filterSkipped') && styles.skipBtn]} 
                      onPress={() => row[0] === t('filterSkipped') ? handleSkip() : handlePress(row[0])}
                    >
                      <Text style={[styles.numText, row[0] === t('filterSkipped') && {color: '#ff4757', fontSize: 16}]}>{row[0]}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity key={row[1]} style={styles.numBtn} onPress={() => handlePress(row[1])}>
                      <Text style={styles.numText}>{row[1]}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity key={row[2]} style={styles.numBtn} onPress={() => row[2] === '⌫' ? handleBackspace() : handlePress(row[2])}>
                      <Text style={styles.numText}>{row[2]}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {paymentMode === 'UPI' ? (
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#38bdf8'}, (!amount || parseInt(amount) <= 0) && {opacity: 0.5}]} onPress={() => { if (amount && parseInt(amount) > 0) { triggerHaptic(); setShowQR(true); } }}>
                  <Text style={styles.confirmText}>GENERATE UPI QR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.confirmBtn, (!amount || parseInt(amount) <= 0) && {opacity: 0.5}]} onPress={submitTransaction}>
                  <Text style={styles.confirmText}>CONFIRM CASH DEPOSIT</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0' },
  subtitle: { fontSize: 12, color: '#718096', marginTop: 2 },
  phoneLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' },
  phoneLinkText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  closeBtn: { padding: 8, backgroundColor: '#15224F', borderRadius: 12 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#111C3D', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#15224F' },
  toggleText: { color: '#718096', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#D4AF37' },
  amountDisplay: { backgroundColor: '#111C3D', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1F326D' },
  currencySymbol: { fontSize: 32, color: '#D4AF37', marginRight: 8, fontWeight: 'bold' },
  amountText: { fontSize: 48, fontWeight: 'bold', color: '#e2e8f0', letterSpacing: 2 },
  quickAddRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  quickAddBtn: { backgroundColor: '#15224F', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#1F326D' },
  quickText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold' },
  modeBtn: { backgroundColor: '#15224F', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1F326D' },
  modeActive: { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.1)' },
  modeText: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
  numpad: { gap: 12, marginBottom: 24 },
  numRow: { flexDirection: 'row', gap: 12 },
  numBtn: { flex: 1, backgroundColor: '#15224F', height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)' },
  numText: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  confirmBtn: { backgroundColor: '#D4AF37', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#0A1128', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  qrContainer: { alignItems: 'center', paddingVertical: 10 },
  qrInstruction: { color: '#718096', fontSize: 14, marginBottom: 4 },
  qrAmount: { color: '#38bdf8', fontSize: 40, fontWeight: '900', marginBottom: 24 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 24 },
  qrWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(212,175,55,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 32 },
  qrWarningText: { color: '#D4AF37', fontSize: 12, fontWeight: 'bold' },
  qrActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  backToNumpadBtn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#15224F', borderWidth: 1, borderColor: '#1F326D' },
  backText: { color: '#e2e8f0', fontWeight: 'bold' },
  confirmBtnHalf: { flex: 1, backgroundColor: '#D4AF37', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }
});