import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';

const destinationSuggestions = ['Ella', 'Kandy', 'Galle', 'Nuwara Eliya', 'Mirissa', 'Anuradhapura'];
const preferenceOptions = ['Beaches', 'Culture', 'Nature', 'Food', 'Adventure', 'Family', 'Budget', 'Photography'];
const paceOptions = ['relaxed', 'balanced', 'packed'];
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value) => {
  const date = toDateOnly(value);
  if (!date) return 'Select date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PlanTripScreen() {
  const router = useRouter();
  const { tripId, destination } = useLocalSearchParams();
  const isEditing = !!tripId;

  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [destinationArea, setDestinationArea] = useState('');
  const [startingPoint, setStartingPoint] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [budget, setBudget] = useState('');
  const [pace, setPace] = useState('balanced');
  const [preferences, setPreferences] = useState(['Nature']);
  const [constraints, setConstraints] = useState('');
  const [calendarTarget, setCalendarTarget] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const todayDate = new Date();
    return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  });

  const today = toDateOnly(new Date());
  const minSelectableDate = calendarTarget === 'end' && startDate ? toDateOnly(startDate) : today;
  const selectedCalendarDate = calendarTarget === 'start' ? startDate : endDate;

  useFocusEffect(
    useCallback(() => {
      if (!tripId) {
        if (destination) setDestinationArea(String(destination));
        return undefined;
      }

      let isActive = true;

      const loadTrip = async () => {
        try {
          setLoadingTrip(true);
          const res = await api.get(`/trips/${tripId}`);
          const trip = res.data.trip;

          if (!isActive || !trip) return;

          setDestinationArea(trip.destinationArea || '');
          setStartingPoint(trip.startingPoint || '');
          setStartDate(trip.startDate ? toDateInputValue(new Date(trip.startDate)) : '');
          setEndDate(trip.endDate ? toDateInputValue(new Date(trip.endDate)) : '');
          setPassengers(Number(trip.passengers || 1));
          setBudget(trip.budget ? String(trip.budget) : '');
          setPace(trip.pace || 'balanced');
          setPreferences(Array.isArray(trip.preferences) && trip.preferences.length ? trip.preferences : ['Nature']);
          setConstraints(trip.constraints || '');
          setStep(1);
        } catch (error) {
          Alert.alert('Trip not found', error.response?.data?.message || 'Could not load this trip.');
          router.back();
        } finally {
          if (isActive) setLoadingTrip(false);
        }
      };

      loadTrip();

      return () => {
        isActive = false;
      };
    }, [destination, router, tripId])
  );

  const togglePreference = (preference) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference]
    );
  };

  const openCalendar = (target) => {
    const currentValue = target === 'start' ? startDate : endDate;
    const currentDate = toDateOnly(currentValue) || toDateOnly(new Date());
    setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    setCalendarTarget(target);
  };

  const closeCalendar = () => setCalendarTarget(null);

  const selectDate = (date) => {
    const value = toDateInputValue(date);

    if (calendarTarget === 'start') {
      setStartDate(value);
      if (endDate && toDateOnly(endDate) < date) {
        setEndDate('');
      }
    } else {
      setEndDate(value);
    }

    closeCalendar();
  };

  const getDateValidationError = () => {
    const parsedStartDate = toDateOnly(startDate);
    const parsedEndDate = toDateOnly(endDate);

    if (!parsedStartDate || !parsedEndDate) return 'Please select both start and end dates.';
    if (parsedStartDate < today) return 'Start date cannot be in the past.';
    if (parsedEndDate < parsedStartDate) return 'End date must be on or after the start date.';
    return '';
  };

  const generateAIPlan = async () => {
    if (!destinationArea.trim() || !startDate || !endDate || !budget) {
      Alert.alert('Missing details', 'Please add destination area, dates, and budget.');
      return;
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    const parsedBudget = Number(budget);
    const dateError = getDateValidationError();

    if (dateError) {
      Alert.alert('Invalid dates', dateError);
      return;
    }

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('Invalid budget', 'Please enter a valid budget amount.');
      return;
    }

    setStep(3);
    setGenerating(true);

    try {
      const payload = {
        destinationArea: destinationArea.trim(),
        startingPoint: startingPoint.trim(),
        startDate: parsedStartDate.toISOString(),
        endDate: parsedEndDate.toISOString(),
        budget: parsedBudget,
        passengers,
        preferences,
        pace,
        constraints: constraints.trim(),
      };

      const res = isEditing
        ? await api.post(`/trips/${tripId}/regenerate-ai-plan`, payload)
        : await api.post('/trips/ai-plan', payload);

      router.replace(`/traveler/itinerary/${res.data.trip._id}`);
    } catch (error) {
      console.error(error);
      Alert.alert(isEditing ? 'Update failed' : 'AI plan failed', error.response?.data?.error || error.response?.data?.message || 'Please try again.');
      setStep(2);
      setGenerating(false);
    }
  };

  const renderCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const isDisabled = minSelectableDate && date < minSelectableDate;
      const isSelected = selectedCalendarDate === toDateInputValue(date);

      cells.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarCell, styles.calendarDay, isSelected && styles.calendarDaySelected, isDisabled && styles.calendarDayDisabled]}
          disabled={isDisabled}
          onPress={() => selectDate(date)}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isDisabled && styles.calendarDayTextDisabled]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const renderCalendarModal = () => (
    <Modal visible={!!calendarTarget} transparent animationType="fade" onRequestClose={closeCalendar}>
      <View style={styles.modalBackdrop}>
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.calendarNavBtn} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity style={styles.calendarNavBtn} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
              <Ionicons name="chevron-forward" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text style={styles.calendarModeText}>{calendarTarget === 'start' ? 'Select start date' : 'Select end date'}</Text>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

          <TouchableOpacity style={styles.cancelButton} onPress={closeCalendar}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepNodesRow}>
        {[1, 2, 3].map((item, index) => (
          <React.Fragment key={item}>
            <View style={[styles.stepNode, step >= item ? styles.stepNodeDone : styles.stepNodeFuture, step === item && styles.stepNodeActive]}>
              <Text style={[styles.stepNodeText, step >= item ? styles.stepNodeTextDone : styles.stepNodeTextFuture]}>{item}</Text>
            </View>
            {index < 2 && <View style={[styles.stepLine, step > item ? styles.stepLineDone : styles.stepLineFuture]} />}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.stepLabelText}>Step {step} of 3</Text>
    </View>
  );

  const renderStep1 = () => (
    <KeyboardAwareScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{isEditing ? 'Edit saved plan' : 'Where should AI plan?'}</Text>

      <Text style={styles.inputLabel}>Destination area</Text>
      <View style={styles.inputBox}>
        <Ionicons name="location-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.input}
          placeholder="Ella, Kandy, South Coast..."
          value={destinationArea}
          onChangeText={setDestinationArea}
        />
        {!!destinationArea && (
          <TouchableOpacity onPress={() => setDestinationArea('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.inputLabel}>Starting point</Text>
      <View style={styles.inputBox}>
        <Ionicons name="navigate-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.input}
          placeholder="Starting from..."
          value={startingPoint}
          onChangeText={setStartingPoint}
        />
      </View>

      <Text style={styles.inputLabel}>Quick suggestions</Text>
      <View style={styles.chipGrid}>
        {destinationSuggestions.map((item) => {
          const isSelected = destinationArea === item;
          return (
            <TouchableOpacity key={item} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => setDestinationArea(item)}>
              <Text style={isSelected ? styles.chipTextSelected : styles.chipText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.aiNote}>
        <Ionicons name="sparkles" size={14} color="#92600A" />
        <Text style={styles.aiNoteText}>Groq will recommend the best places for your destination.</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !destinationArea.trim() && styles.disabledButton]}
        disabled={!destinationArea.trim()}
        onPress={() => setStep(2)}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );

  const renderStep2 = () => (
    <KeyboardAwareScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{isEditing ? 'Update trip details' : 'Trip details'}</Text>

      <View style={styles.dateRow}>
        <View style={[styles.dateCard, { marginRight: 5 }]}>
          <Text style={styles.dateLabel}>Start date</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => openCalendar('start')}>
            <Text style={[styles.dateValue, !startDate && styles.dateValueMuted]}>{formatDisplayDate(startDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color="#0C6EFD" />
          </TouchableOpacity>
        </View>
        <View style={[styles.dateCard, { marginLeft: 5 }]}>
          <Text style={styles.dateLabel}>End date</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => openCalendar('end')}>
            <Text style={[styles.dateValue, !endDate && styles.dateValueMuted]}>{formatDisplayDate(endDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color="#0C6EFD" />
          </TouchableOpacity>
        </View>
      </View>

      {!!getDateValidationError() && (startDate || endDate) && (
        <View style={styles.inlineError}>
          <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
          <Text style={styles.inlineErrorText}>{getDateValidationError()}</Text>
        </View>
      )}

      <View style={styles.passengerRow}>
        <Text style={styles.inputLabel}>People</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => setPassengers(Math.max(1, passengers - 1))}>
            <Ionicons name="remove" size={18} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{passengers}</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => setPassengers(passengers + 1)}>
            <Ionicons name="add" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.inputLabel}>Budget</Text>
      <View style={styles.inputBox}>
        <Text style={styles.budgetPrefix}>LKR</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="50000" value={budget} onChangeText={setBudget} />
      </View>

      <Text style={styles.inputLabel}>Pace</Text>
      <View style={styles.segmented}>
        {paceOptions.map((item) => {
          const isSelected = pace === item;
          return (
            <TouchableOpacity key={item} style={[styles.segment, isSelected && styles.segmentSelected]} onPress={() => setPace(item)}>
              <Text style={isSelected ? styles.segmentTextSelected : styles.segmentText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.inputLabel}>Preferences</Text>
      <View style={styles.chipGrid}>
        {preferenceOptions.map((item) => {
          const isSelected = preferences.includes(item);
          return (
            <TouchableOpacity key={item} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => togglePreference(item)}>
              <Text style={isSelected ? styles.chipTextSelected : styles.chipText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.inputLabel}>Constraints</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Anything to avoid or must include?"
        value={constraints}
        onChangeText={setConstraints}
        multiline
      />

      <TouchableOpacity style={styles.primaryButton} onPress={generateAIPlan}>
        <Text style={styles.primaryButtonText}>{isEditing ? 'Update saved trip plan' : 'Recommend places & build itinerary'}</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.generatingContainer}>
      <View style={styles.pulseCircle}>
        {generating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="compass" size={32} color="#FFFFFF" />}
      </View>
      <Text style={styles.generatingTitle}>{isEditing ? 'Updating your saved plan...' : 'Finding your best places...'}</Text>
      <Text style={styles.generatingSub}>Recommending places, building your route, and calculating budget.</Text>
      <View style={styles.progressBarBg}>
        <View style={styles.progressBarFill} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 && !generating ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {loadingTrip ? (
        <View style={styles.loadingTripBox}>
          <ActivityIndicator color="#0C6EFD" />
          <Text style={styles.loadingTripText}>Loading saved trip...</Text>
        </View>
      ) : (
        <>
          {!generating && renderStepIndicator()}

          <View style={styles.content}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>
        </>
      )}
      {renderCalendarModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 10 },
  loadingTripBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingTripText: { color: '#475569', fontSize: 13, fontFamily: 'Inter', marginTop: 10 },
  stepContainer: { alignItems: 'center', marginBottom: 20 },
  stepNodesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '60%' },
  stepNode: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNodeDone: { backgroundColor: '#0C6EFD' },
  stepNodeFuture: { backgroundColor: '#F1F5F9' },
  stepNodeActive: { borderWidth: 3, borderColor: '#EBF3FF' },
  stepNodeText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  stepNodeTextDone: { color: '#FFFFFF' },
  stepNodeTextFuture: { color: '#94A3B8' },
  stepLine: { flex: 1, height: 2 },
  stepLineDone: { backgroundColor: '#0C6EFD' },
  stepLineFuture: { backgroundColor: '#E2E8F0' },
  stepLabelText: { fontSize: 13, color: '#475569', marginTop: 12, fontFamily: 'Inter', fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 16 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  title: { fontSize: 20, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  inputLabel: { fontSize: 14, fontFamily: 'Inter', fontWeight: '500', color: '#0F172A', marginBottom: 8, marginTop: 10 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, minHeight: 48, paddingHorizontal: 14, marginBottom: 12 },
  input: { flex: 1, marginLeft: 10, fontSize: 14, fontFamily: 'Inter', color: '#0F172A' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, marginBottom: 8, backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  chipText: { color: '#475569', fontFamily: 'Inter', fontSize: 13 },
  chipTextSelected: { color: '#0952C6', fontFamily: 'Inter', fontSize: 13, fontWeight: '500' },
  aiNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 12, padding: 12, marginVertical: 10 },
  aiNoteText: { color: '#92600A', fontFamily: 'Inter', fontSize: 12, marginLeft: 8, flex: 1 },
  primaryButton: { backgroundColor: '#0C6EFD', width: '100%', minHeight: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingHorizontal: 14 },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: 'Inter', textAlign: 'center' },
  dateRow: { flexDirection: 'row', marginBottom: 10 },
  dateCard: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12 },
  dateLabel: { fontSize: 11, color: '#94A3B8', fontFamily: 'Inter' },
  datePickerButton: { minHeight: 34, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue: { fontSize: 13, color: '#0F172A', fontFamily: 'Inter', fontWeight: '600', flex: 1, marginRight: 8 },
  dateValueMuted: { color: '#94A3B8', fontWeight: '500' },
  inlineError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 10, marginBottom: 10 },
  inlineErrorText: { color: '#991B1B', fontSize: 12, fontFamily: 'Inter', marginLeft: 6, flex: 1 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: { width: 36, height: 36, backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stepperValue: { fontSize: 18, fontFamily: 'Inter', fontWeight: '600', marginHorizontal: 16 },
  budgetPrefix: { fontFamily: 'Inter', color: '#94A3B8', fontSize: 13 },
  segmented: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentSelected: { backgroundColor: '#0C6EFD' },
  segmentText: { color: '#475569', fontFamily: 'Inter', fontSize: 12, textTransform: 'capitalize' },
  segmentTextSelected: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, minHeight: 90, padding: 12, textAlignVertical: 'top', fontFamily: 'Inter', fontSize: 14, color: '#0F172A' },
  generatingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0C6EFD', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  generatingTitle: { fontSize: 18, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  generatingSub: { fontSize: 14, fontFamily: 'Inter', color: '#475569', marginBottom: 32, textAlign: 'center', paddingHorizontal: 24 },
  progressBarBg: { width: '80%', height: 4, backgroundColor: '#EBF3FF', borderRadius: 2 },
  progressBarFill: { width: '70%', height: '100%', backgroundColor: '#0C6EFD', borderRadius: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.34)', justifyContent: 'center', padding: 18 },
  calendarPanel: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarNavBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  calendarModeText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', textAlign: 'center', marginBottom: 14 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDayText: { width: `${100 / 7}%`, textAlign: 'center', color: '#94A3B8', fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { borderRadius: 10 },
  calendarDaySelected: { backgroundColor: '#0C6EFD' },
  calendarDayDisabled: { opacity: 0.35 },
  calendarDayText: { color: '#0F172A', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  calendarDayTextSelected: { color: '#FFFFFF' },
  calendarDayTextDisabled: { color: '#94A3B8' },
  cancelButton: { height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelButtonText: { color: '#475569', fontSize: 14, fontFamily: 'Inter', fontWeight: '600' },
});
