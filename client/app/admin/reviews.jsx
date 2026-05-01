import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useTheme } from '../../context/ThemeContext';

const mockReviews = [
  { id: 'r1', traveler: 'Kasun Perera', driver: 'Nimal Silva', trip: 'Ella', rating: 5, status: 'pending', comment: 'Very helpful driver and smooth route planning.' },
  { id: 'r2', traveler: 'Maya Lee', driver: 'Ayesha Fernando', trip: 'Galle', rating: 4, status: 'approved', comment: 'Clean vehicle and good communication.' },
  { id: 'r3', traveler: 'Ishara D.', driver: 'Sunil Jay', trip: 'Kandy', rating: 2, status: 'hidden', comment: 'Pickup was late and needs admin review.' },
];

export default function AdminReviewsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [filter, setFilter] = useState('all');
  const [reviews, setReviews] = useState(mockReviews);

  const filteredReviews = filter === 'all' ? reviews : reviews.filter((review) => review.status === filter);

  const setReviewStatus = (id, status) => {
    setReviews((current) => current.map((review) => review.id === id ? { ...review, status } : review));
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Reviews</Text>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="star-outline" size={18} color={theme.amber} />
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Review moderation</Text>
          <Text style={styles.noticeText}>This screen is ready for the workflow endpoint `/api/reviews/admin/all`. Current data is local until the review module is added.</Text>
        </View>

        <View style={styles.filterRow}>
          {['all', 'pending', 'approved', 'hidden'].map((item) => (
            <TouchableOpacity key={item} style={filter === item ? styles.filterActive : styles.filter} onPress={() => setFilter(item)}>
              <Text style={filter === item ? styles.filterTextActive : styles.filterText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredReviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <View>
                <Text style={styles.reviewTitle}>{review.trip} trip</Text>
                <Text style={styles.reviewMeta}>{review.traveler} reviewed {review.driver}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color={theme.amber} />
                <Text style={styles.ratingText}>{review.rating}.0</Text>
              </View>
            </View>
            <Text style={styles.comment}>{review.comment}</Text>
            <View style={styles.actionRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{review.status}</Text>
              </View>
              <TouchableOpacity style={styles.approveButton} onPress={() => setReviewStatus(review.id, 'approved')}>
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hideButton} onPress={() => setReviewStatus(review.id, 'hidden')}>
                <Text style={styles.hideText}>Hide</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.amberLight, alignItems: 'center', justifyContent: 'center' },
  notice: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 14, marginBottom: 12 },
  noticeTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  noticeText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filter: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterActive: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  reviewCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  reviewTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  reviewMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.amberLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  comment: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  statusBadge: { marginRight: 'auto', backgroundColor: theme.bgMuted, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  approveButton: { backgroundColor: theme.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  approveText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  hideButton: { borderWidth: 1, borderColor: theme.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  hideText: { color: theme.error, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
});
