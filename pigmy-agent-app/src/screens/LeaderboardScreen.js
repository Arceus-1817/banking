import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from '../localization';
import api from '../../api';

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStandings = async () => {
    try {
      setError('');
      const res = await api.get('/api/stats/leaderboard');
      setStandings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("Failed to load weekly leaderboard standings", err);
      setError('Connection failure. Could not download standings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStandings();
  }, []);

  const getRankStyle = (rank) => {
    if (rank === 1) return { borderColor: '#D4AF37', borderLeftWidth: 4 };
    if (rank === 2) return { borderColor: '#A0AEC0', borderLeftWidth: 4 };
    if (rank === 3) return { borderColor: '#CD7F32', borderLeftWidth: 4 };
    return {};
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return '#D4AF37';
    if (rank === 2) return '#A0AEC0';
    if (rank === 3) return '#CD7F32';
    return '#1F326D';
  };

  const renderItem = ({ item }) => {
    const isTop3 = item.rank <= 3;
    return (
      <View style={[styles.itemCard, getRankStyle(item.rank)]}>
        <View style={styles.leftSection}>
          <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(item.rank) }]}>
            <Text style={styles.rankText}>
              {isTop3 ? item.trophy : item.rank}
            </Text>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{item.agentName}</Text>
            <Text style={styles.agentEmail}>{item.agentEmail}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.metricCol}>
            <Text style={styles.volumeText}>₹{parseFloat(item.weeklyVolume || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.countText}>{item.weeklyCount} {t('history')}</Text>
          </View>
          {item.streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {item.streak}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={{ color: '#718096', marginTop: 12 }}>{t('loading') || 'Loading...'}</Text>
      </View>
    );
  }

  // Top Agent Card
  const leader = standings[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('weeklyLeaderboard')}</Text>
      
      {/* Top 1 Highlight Card */}
      {leader && (
        <View style={styles.championCard}>
          <View style={styles.championBadge}>
            <Text style={{ fontSize: 36 }}>🏆</Text>
          </View>
          <Text style={styles.championSubtitle}>{t('topAgent')}</Text>
          <Text style={styles.championName}>{leader.agentName}</Text>
          <View style={styles.championStatsRow}>
            <View style={styles.champStatCol}>
              <Text style={styles.champStatLabel}>{t('weeklyVolume')}</Text>
              <Text style={styles.champStatVal}>₹{parseFloat(leader.weeklyVolume || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.champStatCol}>
              <Text style={styles.champStatLabel}>{t('streakLabel')}</Text>
              <Text style={styles.champStatVal}>🔥 {leader.streak || 0} Days</Text>
            </View>
          </View>
        </View>
      )}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>{t('weeklyStandings')}</Text>
      <FlatList
        data={standings}
        renderItem={renderItem}
        keyExtractor={(item) => item.agentId.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128', paddingTop: 50, paddingHorizontal: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 20 },
  championCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3
  },
  championBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  championSubtitle: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4
  },
  championName: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  championStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.15)',
    paddingTop: 12
  },
  champStatCol: {
    alignItems: 'center'
  },
  champStatLabel: {
    color: '#718096',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  champStatVal: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: 'bold'
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(212,175,55,0.15)'
  },
  sectionHeader: {
    fontSize: 12,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 'bold',
    marginBottom: 12
  },
  listContainer: {
    paddingBottom: 40
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111C3D',
    borderWidth: 1,
    borderColor: '#1F326D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  rankText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 'bold'
  },
  agentInfo: {
    flex: 1
  },
  agentName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600'
  },
  agentEmail: {
    color: '#718096',
    fontSize: 11,
    marginTop: 2
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  metricCol: {
    alignItems: 'flex-end'
  },
  volumeText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700'
  },
  countText: {
    color: '#718096',
    fontSize: 10,
    marginTop: 2
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  streakText: {
    color: '#ff4757',
    fontSize: 10,
    fontWeight: 'bold'
  },
  errorCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 71, 87, 0.05)',
    borderColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20
  },
  errorText: {
    color: '#ff4757',
    fontSize: 13,
    textAlign: 'center'
  }
});
