import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export default function CollectionModal({ visible, customer, onClose, onConfirm }) {
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('SAVINGS');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [showQR, setShowQR] = useState(false);

  const COMPANY_UPI_ID = "pigmypay@icici";
  const COMPANY_NAME = "PigmyPay FinTech";

  if (!customer) return null;

  const handlePress = (num) => {
    if (amount.length < 6) setAmount(prev => prev + num);
  };

  const handleBackspace = () => setAmount(prev => prev.slice(0, -1));
  
  const handleQuickAdd = (val) => {
    const current = parseInt(amount || '0');
    setAmount((current + val).toString());
  };

  const handleSkip = () => {
    // We keep the skip logic we built earlier!
    onConfirm(customer.id, 0, 'NONE', 'SKIPPED_NOT_AVAILABLE'); 
    resetState();
  };

  const submitTransaction = () => {
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
    return `upi://pay?pa=${COMPANY_UPI_ID}&pn=${encodeURIComponent(COMPANY_NAME)}&am=${amount}&cu=INR`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{customer.name}</Text>
              <Text style={styles.subtitle}>ACC: {customer.accountNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => { resetState(); onClose(); }} style={styles.closeBtn}>
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
                <Ionicons name="shield-checkmark" size={16} color="#00ff88" />
                <Text style={styles.qrWarningText}>Payments route to Company Account</Text>
              </View>

              <View style={styles.qrActionRow}>
                <TouchableOpacity style={styles.backToNumpadBtn} onPress={() => setShowQR(false)}>
                  <Text style={styles.backText}>BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtnHalf} onPress={submitTransaction}>
                  <Text style={styles.confirmText}>PAID: CONFIRM</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* 🚨 THE UPGRADED TOGGLE ROW */}
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, txType === 'SAVINGS' && styles.toggleActive]} onPress={() => setTxType('SAVINGS')}>
                  <Text style={[styles.toggleText, txType === 'SAVINGS' && styles.toggleTextActive]}>SAVINGS</Text>
                </TouchableOpacity>
                
                {/* 🚨 Changed from "Daily EMI" to "Monthly EMI" */}
                {/* 🚨 Now looks for activeMonthlyEmi from the backend */}
                <TouchableOpacity 
                  style={[styles.toggleBtn, txType === 'EMI' && styles.toggleActive, (!customer.activeMonthlyEmi || customer.activeMonthlyEmi <= 0) && { opacity: 0.3 }]} 
                  onPress={() => {
                    if (customer.activeMonthlyEmi > 0) {
                      setTxType('EMI');
                      setAmount(customer.activeMonthlyEmi.toString()); // Auto-fill suggestion!
                    }
                  }}
                  disabled={!customer.activeMonthlyEmi || customer.activeMonthlyEmi <= 0}
                >
                  <Text style={[styles.toggleText, txType === 'EMI' && styles.toggleTextActive]}>MONTHLY EMI</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amountDisplay}>
                <Text style={styles.currencySymbol}>₹</Text>
                {/* The amount is no longer locked! They can backspace it. */}
                <Text style={styles.amountText}>{amount || '0'}</Text>
              </View>

              <View style={styles.quickAddRow}>
                {/* 🚨 SMART QUICK ACTIONS */}
                {txType === 'EMI' && customer.activeMonthlyEmi ? (
                  <TouchableOpacity style={[styles.quickAddBtn, {borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)'}]} onPress={() => setAmount(customer.activeMonthlyEmi.toString())}>
                    <Text style={[styles.quickText, {color: '#f59e0b'}]}>🎯 EMI: ₹{customer.activeMonthlyEmi}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(100)}><Text style={styles.quickText}>+100</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(500)}><Text style={styles.quickText}>+500</Text></TouchableOpacity>
                  </>
                )}
                
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'CASH' && styles.modeActive]} onPress={() => setPaymentMode('CASH')}><Text style={styles.modeText}>💵 CASH</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'UPI' && styles.modeActive]} onPress={() => setPaymentMode('UPI')}><Text style={styles.modeText}>📱 UPI</Text></TouchableOpacity>
              </View>

              <View style={styles.numpad}>
                {[['1','2','3'],['4','5','6'],['7','8','9'],['Skip','0','⌫']].map((row, rIdx) => (
                  <View key={rIdx} style={styles.numRow}>
                    <TouchableOpacity 
                      key={row[0]} style={[styles.numBtn, row[0] === 'Skip' && styles.skipBtn]} 
                      onPress={() => row[0] === 'Skip' ? handleSkip() : handlePress(row[0])}
                    >
                      <Text style={[styles.numText, row[0] === 'Skip' && {color: '#ff4757', fontSize: 16}]}>{row[0]}</Text>
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
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#38bdf8'}, (!amount || parseInt(amount) <= 0) && {opacity: 0.5}]} onPress={() => { if (amount && parseInt(amount) > 0) setShowQR(true); }}>
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

// ... Keep your exact same StyleSheet styles from the previous version ...
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111318', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0' },
  subtitle: { fontSize: 12, color: '#718096', marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: '#161b22', borderRadius: 12 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#0a0c0f', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#161b22' },
  toggleText: { color: '#718096', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#00ff88' },
  amountDisplay: { backgroundColor: '#0a0c0f', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1e2530' },
  currencySymbol: { fontSize: 32, color: '#00ff88', marginRight: 8, fontWeight: 'bold' },
  amountText: { fontSize: 48, fontWeight: 'bold', color: '#e2e8f0', letterSpacing: 2 },
  quickAddRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  quickAddBtn: { backgroundColor: '#161b22', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#1e2530' },
  quickText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold' },
  modeBtn: { backgroundColor: '#161b22', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1e2530' },
  modeActive: { borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)' },
  modeText: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
  numpad: { gap: 12, marginBottom: 24 },
  numRow: { flexDirection: 'row', gap: 12 },
  numBtn: { flex: 1, backgroundColor: '#161b22', height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)' },
  numText: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  confirmBtn: { backgroundColor: '#00ff88', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  qrContainer: { alignItems: 'center', paddingVertical: 10 },
  qrInstruction: { color: '#718096', fontSize: 14, marginBottom: 4 },
  qrAmount: { color: '#38bdf8', fontSize: 40, fontWeight: '900', marginBottom: 24 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 24 },
  qrWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,255,136,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 32 },
  qrWarningText: { color: '#00ff88', fontSize: 12, fontWeight: 'bold' },
  qrActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  backToNumpadBtn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#1e2530' },
  backText: { color: '#e2e8f0', fontWeight: 'bold' },
  confirmBtnHalf: { flex: 1, backgroundColor: '#00ff88', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }
});