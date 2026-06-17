import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star } from 'lucide-react-native';
import { getUserReviews } from '../../services/reviewService';
import { AuthContext } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';

// Lists reviews this user has received (backend: GET /reviews/my-reviews).
// The reviewService wrapper existed but no screen consumed it.
export default function MyReviewsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Reviews *about* this user, with the reviewer name/avatar populated
        // (getMyReviews returns reviews I wrote, with reviewer = me → "A user").
        const uid = user?._id || user?.id;
        const res = await getUserReviews(uid);
        const list = res.data?.data?.reviews || res.data?.data || [];
        if (!cancelled) setReviews(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const renderItem = ({ item }) => {
    const rating = item.rating || 0;
    const reviewer = item.reviewer?.name || item.buyer?.name || item.seller?.name || 'A user';
    const when = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.reviewer}>{reviewer}</Text>
          <Text style={styles.date}>{when}</Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} color={n <= rating ? COLORS.warning : COLORS.border} fill={n <= rating ? COLORS.warning : 'none'} />
          ))}
        </View>
        {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.loaderWrap}>
          <Text style={styles.empty}>You have no reviews yet.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: COLORS.textMuted, fontSize: 15 },
  list: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: COLORS.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewer: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  date: { color: COLORS.textFaint, fontSize: 12 },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  comment: { color: COLORS.gray300, fontSize: 14, lineHeight: 20 },
});
