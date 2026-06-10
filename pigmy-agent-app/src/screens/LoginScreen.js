import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api, { updateBaseURL } from '../../api';
import { clearLocalData } from '../database';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // OTP Verification States
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneMask, setPhoneMask] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Forgot Password States
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = verify and reset
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotPhoneMask, setForgotPhoneMask] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    // 1. Load backend URL configuration
    AsyncStorage.getItem('backend_url').then(val => {
      setTempUrl(val || 'http://10.74.59.226:8085');
    });

    // 2. Initialize persistent device ID
    const getOrInitDeviceId = async () => {
      let dId = await AsyncStorage.getItem('deviceId');
      if (!dId) {
        dId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('deviceId', dId);
      }
      setDeviceId(dId);
    };
    getOrInitDeviceId();

    // 3. Auto-redirect if already logged in (standard flagship helper)
    AsyncStorage.getItem('userToken').then(token => {
      if (token) {
        navigation.replace('Home');
      }
    });
  }, [navigation]);

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
      const response = await api.post('/api/auth/login', { email, password, deviceId });
      const data = response.data;
      
      if (data.verificationRequired) {
        // Device not bound yet! Prompt for OTP
        setPhoneMask(data.phoneMask || 'your phone');
        setOtpVisible(true);
        setLoading(false);
        return;
      }

      await completeLogin(data);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      Alert.alert('Login Failed', errorMsg);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return Alert.alert('Error', 'Please enter a valid 6-digit code.');
    setOtpLoading(true);
    try {
      const response = await api.post('/api/auth/verify-and-bind', { email, otp: otpCode, deviceId });
      const data = response.data;

      setOtpVisible(false);
      setOtpCode('');
      await completeLogin(data);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      Alert.alert('Verification Failed', errorMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!forgotEmail) return Alert.alert('Error', 'Please enter your registered email.');
    setForgotLoading(true);
    try {
      const response = await api.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotPhoneMask(response.data.phoneMask || 'your registered number');
      setForgotStep(2);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      Alert.alert('Request Failed', errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || resetCode.length !== 6) return Alert.alert('Error', 'Please enter a 6-digit reset code.');
    if (!newPassword || newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters.');
    setForgotLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password', { 
        email: forgotEmail, 
        otp: resetCode, 
        newPassword 
      });
      Alert.alert('Success', response.data.message || 'Password reset successfully.');
      setForgotVisible(false);
      setForgotStep(1);
      setResetCode('');
      setNewPassword('');
      setForgotEmail('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      Alert.alert('Reset Failed', errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const completeLogin = async (data) => {
    const actualToken = data.token || data.jwt || data.accessToken;
    const actualRole = data.role || data.user?.role;
    const actualName = data.name || data.user?.name || 'Agent';
    const actualId = String(data.id || data.user?.id || data.userId || '1');

    if (actualRole !== 'AGENT') {
      return Alert.alert('Access Denied', 'This app is strictly for Field Agents.');
    }

    // 🚨 WIPE PREVIOUS AGENT'S SQLITE IF IDENTITY CHANGED
    const previousAgentId = await AsyncStorage.getItem('userId');
    if (previousAgentId && previousAgentId !== actualId) {
       clearLocalData();
    }

    const tenantUpiId = data.tenantUpiId || 'pigmypay@icici';
    const tenantUpiMerchantName = data.tenantUpiMerchantName || 'PigmyPay FinTech';

    await AsyncStorage.setItem('userToken', actualToken);
    await AsyncStorage.setItem('userName', actualName);
    await AsyncStorage.setItem('userId', actualId);
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('tenantUpiId', tenantUpiId);
    await AsyncStorage.setItem('tenantUpiMerchantName', tenantUpiMerchantName);

    navigation.replace('Home');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableOpacity style={styles.settingsIcon} onPress={() => setSettingsVisible(true)}>
        <Ionicons name="settings-outline" size={24} color="#718096" />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.iconBox}><Text style={styles.iconText}>₿</Text></View>
        <Text style={styles.logo}>Pigmy<Text style={styles.logoAccent}>Pay</Text></Text>
        <Text style={styles.subtitle}>SECURE AGENT TERMINAL</Text>
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

        <TouchableOpacity style={styles.forgotPassBtn} onPress={() => setForgotVisible(true)}>
          <Text style={styles.forgotPassText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.buttonText}>SECURE LOGIN</Text>}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: OTP DEVICE BINDING OVERLAY */}
      <Modal visible={otpVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Device Verification</Text>
              <TouchableOpacity onPress={() => setOtpVisible(false)}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              This device is not verified. A 6-digit authentication code has been sent to your registered number ending in <Text style={{fontWeight:'700', color:'#D4AF37'}}>{phoneMask}</Text>.
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-Digit Code"
              placeholderTextColor="#4a5568"
              value={otpCode}
              onChangeText={setOtpCode}
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleVerifyOtp} disabled={otpLoading}>
              {otpLoading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.modalSaveBtnText}>VERIFY & AUTHORIZE DEVICE</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: FORGOT & RESET PASSWORD FLOW */}
      <Modal visible={forgotVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => { setForgotVisible(false); setForgotStep(1); }}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <ScrollView>
                <Text style={styles.modalBodyText}>
                  Please enter your registered email address below. We will dispatch a secure 6-digit reset code via SMS/WhatsApp.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter registered email"
                  placeholderTextColor="#4a5568"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                />
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleRequestReset} disabled={forgotLoading}>
                  {forgotLoading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.modalSaveBtnText}>REQUEST RESET CODE</Text>}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView>
                <Text style={styles.modalBodyText}>
                  Reset code sent successfully to number ending in <Text style={{fontWeight:'700', color:'#D4AF37'}}>{forgotPhoneMask}</Text>. Enter the code and your new password.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Enter 6-Digit Reset Code"
                  placeholderTextColor="#4a5568"
                  value={resetCode}
                  onChangeText={setResetCode}
                />
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  placeholder="Enter New Password (min 6 chars)"
                  placeholderTextColor="#4a5568"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleResetPassword} disabled={forgotLoading}>
                  {forgotLoading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.modalSaveBtnText}>UPDATE PASSWORD</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: CONNECTION SETTINGS */}
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
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText: { fontSize: 24, color: '#D4AF37', fontWeight: 'bold' },
  logo: { fontSize: 32, fontWeight: '800', color: '#e2e8f0' },
  logoAccent: { color: '#D4AF37' },
  subtitle: { fontSize: 12, color: '#718096', letterSpacing: 2, marginTop: 5, fontWeight: '600' },
  form: { width: '100%' },
  input: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 16 },
  forgotPassBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPassText: { color: '#718096', fontSize: 13, textDecorationLine: 'underline' },
  button: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A1128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#1F326D' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0' },
  modalBodyText: { color: '#a0aec0', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalLabel: { color: '#718096', fontSize: 13, marginBottom: 10 },
  modalInput: { backgroundColor: '#111C3D', borderWidth: 1, borderColor: '#1F326D', color: '#e2e8f0', borderRadius: 10, padding: 16, fontSize: 16, marginBottom: 20 },
  modalSaveBtn: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 10, alignItems: 'center' },
  modalSaveBtnText: { color: '#0A1128', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});