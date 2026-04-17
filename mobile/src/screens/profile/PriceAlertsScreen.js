import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, TrendingDown, Save } from 'lucide-react-native';
import { getPriceAlerts, createPriceAlert, deletePriceAlert, getPrices } from '../../services/priceService';

export default function PriceAlertsScreen({ navigation }) {
  const [prices, setPrices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [savingState, setSavingState] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricesRes, alertsRes] = await Promise.all([
          getPrices(),
          getPriceAlerts()
        ]);
        
        let fetchedPrices = [];
        let fetchedAlerts = [];

        if (pricesRes.data?.success) fetchedPrices = pricesRes.data.data;
        if (alertsRes.data?.success) fetchedAlerts = alertsRes.data.data;

        setPrices(fetchedPrices);

        // Map UI state over fetched arrays
        const uiAlerts = fetchedPrices.map(p => {
          const existingAlert = fetchedAlerts.find(a => 
            a.commodity === p.commodity && a.variety === p.variety && a.city === p.city
          );
          return {
            ...p,
            alertId: existingAlert ? existingAlert._id : null,
            enabled: !!existingAlert,
            target: existingAlert ? existingAlert.targetPrice.toString() : ''
          };
        });

        setAlerts(uiAlerts);

      } catch (err) {
        console.error('Failed to load prices/alerts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSwitch = async (index, item) => {
    const isCurrentlyEnabled = item.enabled;
    const newTarget = item.target;

    // Disabling alert
    if (isCurrentlyEnabled) {
      setSavingState(true);
      try {
        if (item.alertId) {
          await deletePriceAlert(item.alertId);
        }
        const newAlerts = [...alerts];
        newAlerts[index] = { ...item, enabled: false, alertId: null };
        setAlerts(newAlerts);
      } catch (err) {
        console.error('Failed to loop and delete', err);
        Alert.alert('Error', 'Failed to disable alert');
      } finally {
        setSavingState(false);
      }
    } 
    // Enabling Alert (requires target)
    else {
      if (!newTarget || isNaN(newTarget)) {
        Alert.alert('Required', 'Please enter a valid target price first.');
        return;
      }
      setSavingState(true);
      try {
        const res = await createPriceAlert({
          commodity: item.commodity,
          variety: item.variety,
          city: item.city,
          targetPrice: Number(newTarget),
          condition: 'below'
        });
        const newAlerts = [...alerts];
        newAlerts[index] = { ...item, enabled: true, alertId: res.data.data._id };
        setAlerts(newAlerts);
      } catch (err) {
        console.error('Failed to create alert', err);
        Alert.alert('Error', 'Failed to save alert');
      } finally {
        setSavingState(false);
      }
    }
  };

  const updateTarget = (index, value) => {
    const newAlerts = [...alerts];
    newAlerts[index].target = value;
    setAlerts(newAlerts);
  };

  const saveEditedAlert = async (index, item) => {
    if (!item.enabled) return;
    if (!item.target || isNaN(item.target)) {
       Alert.alert('Invalid', 'Target must be a number.');
       return;
    }
    setSavingState(true);
    try {
      if (item.alertId) {
        await deletePriceAlert(item.alertId);
      }
      const res = await createPriceAlert({
        commodity: item.commodity,
        variety: item.variety,
        city: item.city,
        targetPrice: Number(item.target),
        condition: 'below'
      });
      const newAlerts = [...alerts];
      newAlerts[index].alertId = res.data.data._id;
      setAlerts(newAlerts);
      Alert.alert('Saved', `${item.commodity} alert updated!`);
    } catch(err) {
      console.error(err);
      Alert.alert('Error', 'Could not update alert.');
    } finally {
      setSavingState(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <Bell color="#fbbf24" size={28} />
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>Stay Market Ready</Text>
              <Text style={styles.bannerDesc}>Get instantly notified when a commodity drops below your target price.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Set Target Prices</Text>
          
          {alerts.map((item, index) => (
            <View key={index} style={[styles.card, item.enabled && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.itemName}>{item.commodity}</Text>
                  <Text style={styles.currentPrice}>Current: ₨ {item.price} / {item.unit}</Text>
                </View>
                <Switch
                  trackColor={{ false: '#374151', true: 'rgba(22, 163, 74, 0.5)' }}
                  thumbColor={item.enabled ? '#16a34a' : '#f4f3f4'}
                  onValueChange={() => toggleSwitch(index, item)}
                  value={item.enabled}
                  disabled={savingState}
                />
              </View>
              
              <View style={styles.targetRow}>
                <TrendingDown color="#16a34a" size={16} />
                <Text style={styles.targetLabel}>Alert me when drops below (₨):</Text>
                <TextInput
                  style={styles.targetInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#6b7280"
                  value={item.target}
                  onChangeText={(val) => updateTarget(index, val)}
                  editable={!savingState}
                />
                
                {item.enabled && (
                  <TouchableOpacity onPress={() => saveEditedAlert(index, item)} disabled={savingState} style={{ marginLeft: 8 }}>
                    <Save color="#16a34a" size={20} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {alerts.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#a3a3a3', marginTop: 20 }}>No commodities available to monitor.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fbbf24', marginBottom: 24 },
  bannerTextCol: { marginLeft: 16, flex: 1 },
  bannerTitle: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bannerDesc: { color: '#f3f4f6', fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: '#a3a3a3', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.4)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  cardActive: { borderColor: '#16a34a', backgroundColor: 'rgba(26, 46, 29, 0.8)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  currentPrice: { color: '#a3a3a3', fontSize: 13 },
  targetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#224026', gap: 8 },
  targetLabel: { color: '#d4d4d4', fontSize: 13, flex: 1 },
  targetInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: '#374151', width: 80, height: 36, color: '#fff', textAlign: 'center', fontSize: 14 }
});
