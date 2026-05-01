import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/traveler/home' },
  { label: 'Trip', icon: 'map-outline', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart-outline', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person-outline', route: '/traveler/profile' },
];

const methodOptions = [
  { key: 'saved_card', label: 'Saved card', icon: 'card-outline' },
  { key: 'new_card', label: 'New card', icon: 'add-circle-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
];

const emptyCardForm = {
  cardHolderName: '',
  cardNumber: '',
  expiry: '',
  nickname: '',
};

const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const detectBrand = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
};

const parseExpiry = (expiry) => {
  const cleaned = expiry.replace(/\D/g, '');
  if (cleaned.length < 4) return {};
  return {
    expiryMonth: Number(cleaned.slice(0, 2)),
    expiryYear: Number(`20${cleaned.slice(2, 4)}`),
  };
};

export default function TravelerPaymentsScreen() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('checkout');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [cards, setCards] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('saved_card');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardForm, setCardForm] = useState(emptyCardForm);
  const [editingNicknameId, setEditingNicknameId] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');

  const loadPayments = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const [bookingRes, cardRes, paymentRes] = await Promise.all([
        api.get('/bookings/my-bookings'),
        api.get('/cards'),
        api.get('/payments/traveler'),
      ]);

      const bookingData = bookingRes.data.bookings || [];
      const cardData = cardRes.data.cards || [];
      const paymentData = paymentRes.data.payments || [];

      setBookings(bookingData);
      setCards(cardData);
      setPayments(paymentData);

      const payable = bookingData.filter((booking) => ['accepted', 'completed'].includes(booking.status) && booking.paymentStatus !== 'paid');
      setSelectedBookingId((current) => current || payable[0]?._id || '');
      setSelectedCardId((current) => current || cardData.find((card) => card.isDefault)?._id || cardData[0]?._id || '');
      if (!cardData.length) setSelectedMethod('new_card');
    } catch (error) {
      Alert.alert('Could not load payments', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPayments({ showLoader: true });
    }, [loadPayments])
  );

  const payableBookings = useMemo(
    () => bookings.filter((booking) => ['accepted', 'completed'].includes(booking.status) && booking.paymentStatus !== 'paid'),
    [bookings]
  );
  const selectedBooking = payableBookings.find((booking) => booking._id === selectedBookingId) || payableBookings[0];
  const paidTotal = payments.filter((payment) => payment.status === 'paid').reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const renderTab = (tab) => {
    const isActive = tab.label === 'Payments';
    return (
      <TouchableOpacity key={tab.label} style={styles.tabItem} onPress={() => { if (!isActive) router.push(tab.route); }}>
        <Ionicons name={tab.icon} size={23} color={isActive ? '#0C6EFD' : '#94A3B8'} />
        <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
        {isActive && <View style={styles.tabDot} />}
      </TouchableOpacity>
    );
  };

  const buildCardPayload = () => {
    const digits = cardForm.cardNumber.replace(/\D/g, '');
    const expiry = parseExpiry(cardForm.expiry);
    return {
      cardHolderName: cardForm.cardHolderName.trim(),
      last4: digits.slice(-4),
      brand: detectBrand(cardForm.cardNumber),
      expiryMonth: expiry.expiryMonth,
      expiryYear: expiry.expiryYear,
      nickname: cardForm.nickname.trim(),
    };
  };

  const saveCard = async ({ stayOnScreen = true } = {}) => {
    const payload = buildCardPayload();
    if (!payload.cardHolderName || payload.last4.length !== 4 || !payload.expiryMonth || !payload.expiryYear) {
      Alert.alert('Invalid card', 'Enter card holder, card number, and expiry as MM/YY.');
      return null;
    }

    const res = await api.post('/cards', payload);
    setCardForm(emptyCardForm);
    await loadPayments();
    if (stayOnScreen) Alert.alert('Card saved', 'Your card is ready for checkout.');
    return res.data.card;
  };

  const submitPayment = async () => {
    if (!selectedBooking) {
      Alert.alert('No payable booking', 'Accepted vehicle bookings will appear here.');
      return;
    }

    try {
      setSubmitting(true);
      let savedCardId = selectedCardId;

      if (selectedMethod === 'new_card') {
        const newCard = await saveCard({ stayOnScreen: false });
        if (!newCard) return;
        savedCardId = newCard._id;
      }

      await api.post('/payments', {
        bookingId: selectedBooking._id,
        method: selectedMethod === 'new_card' ? 'saved_card' : selectedMethod,
        savedCardId: selectedMethod === 'cash' ? undefined : savedCardId,
      });

      Alert.alert(selectedMethod === 'cash' ? 'Cash payment recorded' : 'Payment complete', selectedMethod === 'cash' ? 'Cash will be collected by your driver.' : 'Your vehicle booking is paid.');
      await loadPayments();
      setActiveSection('history');
    } catch (error) {
      Alert.alert('Payment failed', error.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDefaultCard = async (id) => {
    await api.put(`/cards/${id}/set-default`);
    await loadPayments();
  };

  const deleteCard = (card) => {
    Alert.alert('Remove card', `Remove ${card.brand} ending ${card.last4}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/cards/${card._id}`);
            await loadPayments();
          } catch (error) {
            Alert.alert('Remove failed', error.response?.data?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const updateNickname = async (id) => {
    await api.put(`/cards/${id}/nickname`, { nickname: nicknameDraft });
    setEditingNicknameId('');
    setNicknameDraft('');
    await loadPayments();
  };

  const completeCashPayment = async (payment) => {
    try {
      await api.put(`/payments/${payment._id}/complete`);
      await loadPayments();
    } catch (error) {
      Alert.alert('Could not complete payment', error.response?.data?.message || 'Please try again.');
    }
  };

  const deletePendingPayment = async (payment) => {
    Alert.alert('Delete payment record', 'Delete this pending payment record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/payments/${payment._id}`);
          await loadPayments();
        },
      },
    ]);
  };

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Cards</Text>
        <Text style={styles.statValue}>{cards.length}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Paid</Text>
        <Text style={styles.statValueSmall}>{formatMoney(paidTotal)}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Due</Text>
        <Text style={styles.statValue}>{payableBookings.length}</Text>
      </View>
    </View>
  );

  const renderCardForm = (buttonLabel = 'Save card') => (
    <View style={styles.formCard}>
      <View style={styles.cardPreview}>
        <View>
          <Text style={styles.previewBrand}>{detectBrand(cardForm.cardNumber).toUpperCase()}</Text>
          <Text style={styles.previewNumber}>•••• •••• •••• {cardForm.cardNumber.replace(/\D/g, '').slice(-4) || '0000'}</Text>
        </View>
        <Text style={styles.previewExpiry}>{cardForm.expiry || 'MM/YY'}</Text>
      </View>

      <TextInput style={styles.input} placeholder="Card holder name" value={cardForm.cardHolderName} onChangeText={(value) => setCardForm((current) => ({ ...current, cardHolderName: value }))} />
      <TextInput style={styles.input} placeholder="Card number" value={cardForm.cardNumber} onChangeText={(value) => setCardForm((current) => ({ ...current, cardNumber: value }))} keyboardType="number-pad" maxLength={19} />
      <View style={styles.inputRow}>
        <TextInput style={[styles.input, styles.inputHalf]} placeholder="MM/YY" value={cardForm.expiry} onChangeText={(value) => setCardForm((current) => ({ ...current, expiry: value }))} keyboardType="number-pad" maxLength={5} />
        <TextInput style={[styles.input, styles.inputHalf]} placeholder="Nickname" value={cardForm.nickname} onChangeText={(value) => setCardForm((current) => ({ ...current, nickname: value }))} />
      </View>
      <View style={styles.securityNotice}>
        <Ionicons name="lock-closed-outline" size={14} color="#16A34A" />
        <Text style={styles.securityText}>Only masked card details are sent to the server.</Text>
      </View>
      <TouchableOpacity style={styles.secondaryFullButton} onPress={() => saveCard()}>
        <Text style={styles.secondaryFullButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCheckout = () => (
    <View>
      <Text style={styles.sectionTitle}>Checkout</Text>
      {!payableBookings.length ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={30} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No payments due</Text>
          <Text style={styles.emptyText}>Accepted vehicle bookings will appear here for payment.</Text>
          <TouchableOpacity style={styles.primarySmallButton} onPress={() => router.push('/traveler/bookings')}>
            <Text style={styles.primarySmallButtonText}>Open bookings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingStrip}>
            {payableBookings.map((booking) => {
              const isSelected = selectedBooking?._id === booking._id;
              return (
                <TouchableOpacity key={booking._id} style={[styles.bookingChip, isSelected && styles.bookingChipActive]} onPress={() => setSelectedBookingId(booking._id)}>
                  <Text style={isSelected ? styles.bookingChipTitleActive : styles.bookingChipTitle}>{booking.trip?.destinationArea || 'Trip booking'}</Text>
                  <Text style={isSelected ? styles.bookingChipMetaActive : styles.bookingChipMeta}>{formatMoney(booking.totalAmount)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{selectedBooking?.trip?.destinationArea || 'Vehicle booking'}</Text>
            <Text style={styles.summaryMeta}>{formatDate(selectedBooking?.startDate)} - {formatDate(selectedBooking?.endDate)}</Text>
            <Text style={styles.summaryMeta}>{selectedBooking?.vehicle?.brand} {selectedBooking?.vehicle?.model} - Driver: {selectedBooking?.driver?.name || 'Assigned'}</Text>
            <Text style={styles.summaryAmount}>{formatMoney(selectedBooking?.totalAmount)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.methodRow}>
            {methodOptions.map((method) => {
              const disabled = method.key === 'saved_card' && !cards.length;
              const isActive = selectedMethod === method.key;
              return (
                <TouchableOpacity key={method.key} disabled={disabled} style={[styles.methodButton, isActive && styles.methodButtonActive, disabled && styles.methodButtonDisabled]} onPress={() => setSelectedMethod(method.key)}>
                  <Ionicons name={method.icon} size={18} color={isActive ? '#0C6EFD' : '#64748B'} />
                  <Text style={isActive ? styles.methodTextActive : styles.methodText}>{method.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedMethod === 'saved_card' && (
            <View style={styles.savedCardPicker}>
              {cards.map((card) => (
                <TouchableOpacity key={card._id} style={[styles.savedCardOption, selectedCardId === card._id && styles.savedCardOptionActive]} onPress={() => setSelectedCardId(card._id)}>
                  <Text style={styles.cardBrand}>{card.brand}</Text>
                  <Text style={styles.cardMasked}>•••• {card.last4}</Text>
                  {card.isDefault && <Text style={styles.defaultText}>Default</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedMethod === 'new_card' && renderCardForm('Save card for payment')}

          <TouchableOpacity style={[styles.payButton, submitting && styles.payButtonDisabled]} disabled={submitting} onPress={submitPayment}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payButtonText}>{selectedMethod === 'cash' ? 'Record cash payment' : `Pay ${formatMoney(selectedBooking?.totalAmount)}`}</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderCards = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My cards</Text>
        <TouchableOpacity style={styles.addCardButton} onPress={() => setActiveSection('cards')}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addCardButtonText}>Add card</Text>
        </TouchableOpacity>
      </View>

      {cards.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="card-outline" size={30} color="#0C6EFD" />
          <Text style={styles.emptyTitle}>No saved cards</Text>
          <Text style={styles.emptyText}>Add a card to pay faster next time.</Text>
        </View>
      ) : cards.map((card) => (
        <View key={card._id} style={styles.cardItem}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardBrand}>{card.brand.toUpperCase()}</Text>
              <Text style={styles.cardMasked}>•••• •••• •••• {card.last4}</Text>
              <Text style={styles.cardExpiry}>Expires {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</Text>
            </View>
            {card.isDefault && <Text style={styles.defaultPill}>Default</Text>}
          </View>

          {editingNicknameId === card._id ? (
            <View style={styles.nicknameRow}>
              <TextInput style={[styles.input, styles.nicknameInput]} value={nicknameDraft} onChangeText={setNicknameDraft} placeholder="Nickname" />
              <TouchableOpacity style={styles.iconButton} onPress={() => updateNickname(card._id)}>
                <Ionicons name="checkmark" size={18} color="#0C6EFD" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.nicknameText}>{card.nickname || card.cardHolderName}</Text>
          )}

          <View style={styles.cardActions}>
            {!card.isDefault && (
              <TouchableOpacity style={styles.textAction} onPress={() => setDefaultCard(card._id)}>
                <Text style={styles.textActionBlue}>Set default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.textAction} onPress={() => { setEditingNicknameId(card._id); setNicknameDraft(card.nickname || ''); }}>
              <Text style={styles.textActionMuted}>Nickname</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textAction} onPress={() => deleteCard(card)}>
              <Text style={styles.textActionDanger}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {renderCardForm('Save new card')}
    </View>
  );

  const renderHistory = () => (
    <View>
      <Text style={styles.sectionTitle}>Payment history</Text>
      {payments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={30} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptyText}>Completed checkout records and receipts will appear here.</Text>
        </View>
      ) : payments.map((payment) => (
        <View key={payment._id} style={styles.paymentRow}>
          <View style={styles.paymentIcon}>
            <Ionicons name={payment.method === 'cash' ? 'cash-outline' : 'card-outline'} size={18} color="#0C6EFD" />
          </View>
          <View style={styles.paymentBody}>
            <Text style={styles.paymentTitle}>{payment.trip?.destinationArea || 'Trip payment'}</Text>
            <Text style={styles.paymentMeta}>{payment.receiptNumber} - {formatDate(payment.createdAt)}</Text>
            <Text style={styles.paymentMeta}>{payment.method.replace('_', ' ')} - {payment.status}</Text>
          </View>
          <View style={styles.paymentRight}>
            <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
            {payment.status === 'pending' && payment.method === 'cash' && (
              <TouchableOpacity onPress={() => completeCashPayment(payment)}>
                <Text style={styles.textActionBlue}>Mark paid</Text>
              </TouchableOpacity>
            )}
            {payment.status === 'pending' && (
              <TouchableOpacity onPress={() => deletePendingPayment(payment)}>
                <Text style={styles.textActionDanger}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Wallet</Text>
          <Text style={styles.title}>Payments</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => setActiveSection('cards')}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0C6EFD" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} tintColor="#0C6EFD" />}
        >
          {renderStats()}

          <View style={styles.segmented}>
            {[
              { key: 'checkout', label: 'Checkout' },
              { key: 'cards', label: 'Cards' },
              { key: 'history', label: 'History' },
            ].map((section) => {
              const isActive = activeSection === section.key;
              return (
                <TouchableOpacity key={section.key} style={[styles.segment, isActive && styles.segmentActive]} onPress={() => setActiveSection(section.key)}>
                  <Text style={isActive ? styles.segmentTextActive : styles.segmentText}>{section.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeSection === 'checkout' && renderCheckout()}
          {activeSection === 'cards' && renderCards()}
          {activeSection === 'history' && renderHistory()}
        </ScrollView>
      )}

      <View style={styles.bottomTabBar}>{tabs.map(renderTab)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, color: '#94A3B8', fontFamily: 'Inter' },
  title: { fontSize: 24, fontFamily: 'Inter', fontWeight: '700', color: '#0F172A' },
  headerButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0C6EFD', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 13, fontFamily: 'Inter' },
  scrollContent: { padding: 16, paddingBottom: 96 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  statLabel: { color: '#94A3B8', fontSize: 11, fontFamily: 'Inter', marginBottom: 4 },
  statValue: { color: '#0F172A', fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  statValueSmall: { color: '#0F172A', fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
  segmented: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 18 },
  segment: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#0C6EFD' },
  segmentText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700', marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addCardButton: { height: 34, borderRadius: 8, backgroundColor: '#0C6EFD', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  addCardButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', marginLeft: 4 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 22, marginBottom: 16 },
  emptyTitle: { color: '#0F172A', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginTop: 8 },
  emptyText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', textAlign: 'center', lineHeight: 18, marginTop: 5 },
  primarySmallButton: { backgroundColor: '#0C6EFD', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14 },
  primarySmallButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  bookingStrip: { flexGrow: 0, marginBottom: 12 },
  bookingChip: { minWidth: 170, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginRight: 10 },
  bookingChipActive: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  bookingChipTitle: { color: '#0F172A', fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  bookingChipTitleActive: { color: '#0952C6', fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  bookingChipMeta: { color: '#475569', fontSize: 12, fontFamily: 'monospace', marginTop: 5 },
  bookingChipMetaActive: { color: '#0952C6', fontSize: 12, fontFamily: 'monospace', marginTop: 5 },
  summaryCard: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16 },
  summaryTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  summaryMeta: { color: '#475569', fontSize: 12, fontFamily: 'Inter', marginTop: 4 },
  summaryAmount: { color: '#0C6EFD', fontSize: 20, fontFamily: 'monospace', fontWeight: '700', marginTop: 12 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  methodButton: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  methodButtonActive: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  methodButtonDisabled: { opacity: 0.45 },
  methodText: { color: '#475569', fontSize: 11, fontFamily: 'Inter', fontWeight: '600', marginTop: 5 },
  methodTextActive: { color: '#0952C6', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginTop: 5 },
  savedCardPicker: { gap: 8, marginBottom: 12 },
  savedCardOption: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 12, flexDirection: 'row', alignItems: 'center' },
  savedCardOptionActive: { borderColor: '#0C6EFD', backgroundColor: '#F8FAFC' },
  cardBrand: { color: '#0C6EFD', fontSize: 12, fontFamily: 'Inter', fontWeight: '800', marginRight: 10 },
  cardMasked: { color: '#0F172A', fontSize: 14, fontFamily: 'monospace', fontWeight: '700', flex: 1 },
  defaultText: { color: '#145C32', fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  formCard: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 16 },
  cardPreview: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, minHeight: 96, justifyContent: 'space-between', marginBottom: 12 },
  previewBrand: { color: '#0C6EFD', fontSize: 12, fontFamily: 'Inter', fontWeight: '800' },
  previewNumber: { color: '#0F172A', fontSize: 17, fontFamily: 'monospace', fontWeight: '700', marginTop: 18 },
  previewExpiry: { color: '#475569', fontSize: 12, fontFamily: 'monospace', alignSelf: 'flex-end' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, color: '#0F172A', fontSize: 14, fontFamily: 'Inter', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  securityNotice: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  securityText: { color: '#475569', fontSize: 11, fontFamily: 'Inter', marginLeft: 6, flex: 1 },
  secondaryFullButton: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#0C6EFD', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  secondaryFullButtonText: { color: '#0C6EFD', fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
  payButton: { height: 50, borderRadius: 12, backgroundColor: '#0C6EFD', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter', fontWeight: '700' },
  cardItem: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardExpiry: { color: '#64748B', fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  defaultPill: { overflow: 'hidden', alignSelf: 'flex-start', backgroundColor: '#EDFBF4', color: '#145C32', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  nicknameText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', marginBottom: 12 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nicknameInput: { flex: 1, marginBottom: 10 },
  iconButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  textAction: { marginRight: 16 },
  textActionBlue: { color: '#0C6EFD', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  textActionMuted: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  textActionDanger: { color: '#DC2626', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  paymentRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 10 },
  paymentIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  paymentBody: { flex: 1 },
  paymentTitle: { color: '#0F172A', fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
  paymentMeta: { color: '#64748B', fontSize: 11, fontFamily: 'Inter', marginTop: 3, textTransform: 'capitalize' },
  paymentRight: { alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8 },
  paymentAmount: { color: '#0C6EFD', fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 54 },
  tabText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: '#0C6EFD', fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0C6EFD', position: 'absolute', bottom: -8 },
});
