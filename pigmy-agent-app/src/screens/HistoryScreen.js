import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDailyLog } from '../database';
import api from '../../api'; // Make sure this path is correct for your api.js

export default function HistoryScreen() {
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('LOCAL'); // 'LOCAL' or 'CLOUD'
    const [loading, setLoading] = useState(false);
    const isFocused = useIsFocused();

    // Load Local Offline SQLite data
    const loadLocalData = () => {
        setLogs(getDailyLog());
        setViewMode('LOCAL');
    };

    useEffect(() => {
        if (isFocused) {
            loadLocalData();
        }
    }, [isFocused]);

    // Fetch Official Server Data
    const fetchCloudHistory = async () => {
        setLoading(true);
        setViewMode('CLOUD');
        try {
            const response = await api.get('/api/transactions/my-history');

            // We must normalize the Spring Boot JSON to match our mobile UI card format
            const normalizedCloudData = response.data.map(tx => ({
                id: tx.id.toString(), // Cloud ID
                timestamp: tx.transactionDate, // From Spring Boot
                customerName: tx.customer?.name || 'Unknown',
                accountNumber: tx.customer?.accountNumber || 'N/A',
                paymentMode: tx.paymentMode,
                type: tx.transactionCategory,
                status: 'CLOUD_VERIFIED', // 🚨 Special badge for server data
                amount: tx.amount
            }));

            setLogs(normalizedCloudData);
        } catch {
            Alert.alert("Network Error", "Could not reach the server to fetch history.");
            loadLocalData(); // Fall back to offline mode
        } finally {
            setLoading(false);
        }
    };

    const renderLogItem = ({ item }) => {
        let statusColor = '#f59e0b'; // PENDING
        let iconName = 'cloud-offline-outline';
        let statusText = 'WAITING FOR SYNC';

        if (item.syncStatus === 'SYNCED') {
            statusColor = '#D4AF37';
            iconName = 'checkmark-done-outline';
            statusText = 'SYNCED FROM PHONE';
        } else if (item.status === 'SKIPPED_CLOSED') {
            statusColor = '#ff4757';
            iconName = 'close-circle-outline';
            statusText = 'SKIPPED / CLOSED';
        } else if (item.status === 'CLOUD_VERIFIED') {
            statusColor = '#38bdf8'; // Blue for official server data
            iconName = 'server-outline';
            statusText = 'OFFICIAL RECORD';
        }

        const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.logCard}>
                <View style={styles.timeColumn}>
                    <View style={[styles.iconCircle, { backgroundColor: `${statusColor}1A`, borderColor: `${statusColor}4D` }]}>
                        <Ionicons name={iconName} size={20} color={statusColor} />
                    </View>
                    <Text style={styles.timeText}>{timeString}</Text>
                </View>

                <View style={styles.detailsColumn}>
                    <Text style={styles.customerName}>{item.customerName || `Customer #${item.customerId}`}</Text>
                    <Text style={styles.accountText}>ACC: {item.accountNumber || 'N/A'}</Text>

                    <View style={styles.row}>
                        <View style={[styles.badge, { backgroundColor: `${statusColor}1A` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                        <View style={styles.badgeDark}>
                            <Text style={styles.badgeTextDark}>{item.paymentMode} • {item.type}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.amountColumn}>
                    <Text style={[styles.amountText, item.status === 'SKIPPED_CLOSED' && { color: '#718096', textDecorationLine: 'line-through' }]}>
                        ₹{item.amount}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Transaction History</Text>

            {/* 🚨 THE NEW SOURCE TOGGLE */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'LOCAL' && styles.toggleActive]}
                    onPress={loadLocalData}
                >
                    <Ionicons name="phone-portrait-outline" size={16} color={viewMode === 'LOCAL' ? '#D4AF37' : '#718096'} />
                    <Text style={[styles.toggleText, viewMode === 'LOCAL' && { color: '#D4AF37' }]}>Device Log</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'CLOUD' && styles.toggleActiveCloud]}
                    onPress={fetchCloudHistory}
                >
                    <Ionicons name="cloud-download-outline" size={16} color={viewMode === 'CLOUD' ? '#38bdf8' : '#718096'} />
                    <Text style={[styles.toggleText, viewMode === 'CLOUD' && { color: '#38bdf8' }]}>Cloud Database</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text style={styles.emptyText}>Pulling records from server...</Text>
                </View>
            ) : logs.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#2d3748" />
                    <Text style={styles.emptyText}>No transactions found.</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item, index) => item.id + '-' + index}
                    renderItem={renderLogItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A1128', paddingTop: 60, paddingHorizontal: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 20 },

    // Toggle Styles
    toggleContainer: { flexDirection: 'row', backgroundColor: '#111C3D', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#1F326D' },
    toggleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, gap: 8 },
    toggleActive: { backgroundColor: '#15224F', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
    toggleActiveCloud: { backgroundColor: '#15224F', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' },
    toggleText: { color: '#718096', fontSize: 12, fontWeight: 'bold' },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#718096', marginTop: 12, fontSize: 14 },
    logCard: { flexDirection: 'row', backgroundColor: '#111C3D', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F326D', alignItems: 'center' },
    timeColumn: { alignItems: 'center', width: 60, marginRight: 12 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    timeText: { color: '#718096', fontSize: 10, fontWeight: 'bold' },
    detailsColumn: { flex: 1 },
    customerName: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' },
    accountText: { color: '#4a5568', fontSize: 12, marginTop: 2, marginBottom: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
    badgeDark: { backgroundColor: '#15224F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#1F326D' },
    badgeTextDark: { color: '#a0aec0', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
    amountColumn: { justifyContent: 'center', alignItems: 'flex-end', marginLeft: 10 },
    amountText: { color: '#e2e8f0', fontSize: 18, fontWeight: '900' }
});