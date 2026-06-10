import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LedgerScreen from './src/screens/LedgerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import { initDB } from './src/database';
import { LanguageProvider, useTranslation } from './src/localization';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AgentTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0A1128', borderTopColor: '#1F326D', height: 65, paddingBottom: 10 },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#4a5568',
        tabBarIcon: ({ color }) => {
          let iconName;
          if (route.name === 'Route') iconName = 'map';
          else if (route.name === 'History') iconName = 'receipt';
          else if (route.name === 'Leaderboard') iconName = 'trophy';
          else if (route.name === 'Ledger') iconName = 'wallet';
          else if (route.name === 'Settings') iconName = 'settings';

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Route" component={HomeScreen} options={{ tabBarLabel: t('route') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('history') }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarLabel: t('leaderboard') }} />
      <Tab.Screen name="Ledger" component={LedgerScreen} options={{ tabBarLabel: t('ledger') }} />
      <Tab.Screen name="Settings" component={ProfileScreen} options={{ tabBarLabel: t('settings') }} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const [pinLocked, setPinLocked] = useState(false);
  const [savedPin, setSavedPin] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const checkPinLock = async () => {
    try {
      const pin = await AsyncStorage.getItem('appPIN');
      if (pin) {
        setSavedPin(pin);
        setPinLocked(true);
      } else {
        setPinLocked(false);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setCheckingPin(false);
    }
  };

  useEffect(() => {
    initDB();
    checkPinLock();
  }, []);

  const handleKeyPress = (num) => {
    triggerHaptic();
    if (enteredPin.length >= 4) return;
    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === savedPin) {
        // Unlock
        setPinLocked(false);
        setEnteredPin('');
      } else {
        // Wrong PIN
        setPinError(true);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        setTimeout(() => {
          setEnteredPin('');
          setPinError(false);
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic();
    setEnteredPin(enteredPin.slice(0, -1));
  };

  if (checkingPin) {
    return (
      <View style={[styles.lockContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  // RENDER CUSTOM LOCK SCREEN OVERLAY IF PIN ENABLED
  if (pinLocked) {
    return (
      <SafeAreaView style={styles.lockContainer}>
        <View style={styles.lockHeader}>
          <Ionicons name="lock-closed" size={48} color={pinError ? "#ff4757" : "#D4AF37"} style={{ marginBottom: 16 }} />
          <Text style={styles.lockTitle}>{t('terminalLocked')}</Text>
          <Text style={styles.lockSubtitle}>{t('enterPin')}</Text>
        </View>

        {/* PIN Indicators */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  pinError && styles.dotError,
                ]}
              />
            );
          })}
        </View>

        {/* Custom Numpad */}
        <View style={styles.numpad}>
          <View style={styles.row}>
            {['1', '2', '3'].map((n) => (
              <TouchableOpacity key={n} style={styles.key} onPress={() => handleKeyPress(n)}>
                <Text style={styles.keyText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {['4', '5', '6'].map((n) => (
              <TouchableOpacity key={n} style={styles.key} onPress={() => handleKeyPress(n)}>
                <Text style={styles.keyText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {['7', '8', '9'].map((n) => (
              <TouchableOpacity key={n} style={styles.key} onPress={() => handleKeyPress(n)}>
                <Text style={styles.keyText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.key} onPress={checkPinLock}>
              <Ionicons name="refresh-outline" size={24} color="#718096" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleKeyPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleBackspace}>
              <Ionicons name="backspace-outline" size={24} color="#718096" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={AgentTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  lockContainer: { flex: 1, backgroundColor: '#0A1128', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60 },
  lockHeader: { alignItems: 'center', marginTop: 40 },
  lockTitle: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
  lockSubtitle: { fontSize: 13, color: '#718096', marginTop: 8 },
  dotsContainer: { flexDirection: 'row', gap: 20, marginVertical: 30 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#1F326D', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  dotError: { backgroundColor: '#ff4757', borderColor: '#ff4757' },
  numpad: { width: '80%', marginBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  key: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#111C3D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1F326D' },
  keyText: { fontSize: 28, color: '#e2e8f0', fontWeight: '600' },
});