import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LedgerScreen from './src/screens/LedgerScreen';
import { initDB } from './src/database';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AgentTabs() {
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
          else if (route.name === 'Ledger') iconName = 'wallet';
          else if (route.name === 'History') iconName = 'receipt';

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Route" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Ledger" component={LedgerScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={AgentTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}