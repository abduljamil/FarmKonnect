import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, TextInput, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getListings } from '../../services/listingService';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

const { width } = Dimensions.get('window');

// Category values match the backend Listing.category enum. Labels come from
// translations at render time so the strip switches with language.
const CATEGORY_VALUES = ['', 'crops', 'livestock', 'equipment', 'fertilizers', 'seeds', 'other'];

export default function MarketplaceScreen({ navigation }) {
  const { t } = useTranslation();

  // Resolve a translated label for each category. The `'' = all` slot uses
  // common.all so it stays in sync with the rest of the UI.
  const categoryLabel = (v) => {
    if (v === '') return t('common.all');
    const key = `marketplace.categories.${v}`;
    const translated = t(key);
    return translated === key ? v : translated;
  };
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Whether the category strip is visible. Filter button in the header toggles it.
  const [showCategories, setShowCategories] = useState(true);

  const fetchListings = async (pageNum = 1, shouldAppend = false) => {
    try {
      const params = { page: pageNum, limit: 12 };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const response = await getListings(params);
      if (response.data && response.data.success) {
        const newListings = response.data.data;
        const pagination = response.data.pagination;
        
        if (shouldAppend) {
          setListings(prev => {
            const seen = new Set(prev.map(item => item._id));
            const distinctNew = newListings.filter(item => !seen.has(item._id));
            return [...prev, ...distinctNew];
          });
        } else {
          setListings(newListings);
        }
        
        setHasMore(pagination.page < pagination.pages);
        setPage(pagination.page);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounce = setTimeout(() => {
      fetchListings(1, false);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, minPrice, maxPrice]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(1, false);
  }, [searchQuery, selectedCategory, minPrice, maxPrice]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchListings(page + 1, true);
  };

  const renderListing = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={
            item.images && item.images.length > 0
              ? { uri: item.images[0] }
              : require('../../../assets/icon.png')
          }
          style={styles.image}
        />
        {/* Favorites are a future feature — hidden until the backend
            supports a user.favorites array. Don't ship dead UI. */}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>₨ {item.price} {item.unit ? `/ ${item.unit}` : ''}</Text>
        <View style={styles.locationRow}>
          <MapPin color={COLORS.primary} size={14} />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('marketplace.title')}</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search color={COLORS.textMuted} size={20} />
            <TextInput
              placeholder={t('common.search')}
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, !showCategories && { backgroundColor: '#1a2e1d', borderWidth: 1, borderColor: COLORS.border }]}
            onPress={() => setShowCategories((v) => !v)}
          >
            <Filter color={COLORS.white} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {showCategories && (
        <>
          <View style={styles.categoriesRow}>
            {CATEGORY_VALUES.map((v) => (
              <TouchableOpacity
                key={v || 'all'}
                style={[styles.categoryBtn, selectedCategory === v && styles.categoryActive]}
                onPress={() => setSelectedCategory(v)}
              >
                <Text style={[styles.categoryText, selectedCategory === v && styles.categoryTextActive]}>{categoryLabel(v)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Price range filter — min/max, mirrors the web Marketplace. */}
          <View style={styles.priceFilterRow}>
            <TextInput
              style={styles.priceInput}
              placeholder={t('mobile.marketplace.minPrice')}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={styles.priceDash}>–</Text>
            <TextInput
              style={styles.priceInput}
              placeholder={t('mobile.marketplace.maxPrice')}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
            {(minPrice || maxPrice) ? (
              <TouchableOpacity style={styles.priceClearBtn} onPress={() => { setMinPrice(''); setMaxPrice(''); }}>
                <Text style={styles.priceClearText}>{t('mobile.marketplace.clear')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item, index) => item?._id || `listing-${index}`}
          numColumns={2}
          contentContainerStyle={styles.container}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted }}>{t('marketplace.noListings')}</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 10, zIndex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 12, color: COLORS.white, fontSize: 16 },
  filterBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingTop: 0 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, paddingHorizontal: 20, paddingVertical: 4 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  categoryActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: COLORS.white },
  priceFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  priceInput: { flex: 1, minWidth: 0, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, paddingHorizontal: 12, height: 44, color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  priceDash: { color: COLORS.textMuted, fontSize: 16 },
  priceClearBtn: { paddingHorizontal: 6, paddingVertical: 8 },
  priceClearText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width - 56) / 2, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  imageContainer: { width: '100%', height: 140, position: 'relative' },
  image: { width: '100%', height: '100%' },
  favoriteBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  cardBody: { padding: 12 },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  price: { color: COLORS.primaryLight, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  columnWrapper: { justifyContent: 'space-between' }
});
