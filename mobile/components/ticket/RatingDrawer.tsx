import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Star, Send, CheckCircle } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/constants/api';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RatingDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  order: any;
  userId?: string;
}

export default function RatingDrawer({ visible, onClose, onSubmitted, order, userId }: RatingDrawerProps) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const quickTags = [
    { key: 'seat', label: t('rating.feedbackSeat') },
    { key: 'ontime', label: t('rating.feedbackOntime') },
    { key: 'clean', label: t('rating.feedbackClean') },
    { key: 'driver', label: t('rating.feedbackDriver') },
    { key: 'service', label: t('rating.feedbackService') },
    { key: 'smooth', label: t('rating.feedbackSmooth') },
  ];

  // Star scale animations
  const starAnims = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  useEffect(() => {
    if (visible) {
      setRating(0);
      setSelectedTags([]);
      setComment('');
      setSubmitted(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleStarPress = (star: number) => {
    setRating(star);
    // Bounce animation on star press
    Animated.sequence([
      Animated.spring(starAnims[star - 1], { toValue: 1.4, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.spring(starAnims[star - 1], { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const toggleTag = (key: string) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const getRatingLabel = (r: number) => {
    if (r === 0) return t('rating.starPrompt');
    if (r === 1) return t('rating.star1');
    if (r === 2) return t('rating.star2');
    if (r === 3) return t('rating.star3');
    if (r === 4) return t('rating.star4');
    return t('rating.star5');
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('rating.missingStarTitle'), t('rating.missingStarDesc'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/reviews', {
        orderId: order.id,
        userId: userId || null,
        rating,
        tags: selectedTags,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 1800);
    } catch (error: any) {
      const msg = error?.response?.data?.message || t('rating.errorDefault');
      Alert.alert(t('rating.errorTitle'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          tw`flex-1 justify-end`,
          { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity style={tw`flex-1`} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: SCREEN_HEIGHT * 0.88,
              overflow: 'hidden',
            }}
          >
            {/* Drag Handle */}
            <View style={tw`items-center pt-3 pb-1`}>
              <View style={tw`w-10 h-1 bg-slate-200 rounded-full`} />
            </View>

            {submitted ? (
              // Success state
              <View style={tw`items-center justify-center py-16 px-8`}>
                <CheckCircle size={64} color="#10b981" />
                <Text style={tw`text-[20px] font-black text-slate-900 mt-4 text-center`}>
                  {t('rating.thankYou')}
                </Text>
                <Text style={tw`text-[13px] font-bold text-slate-400 mt-2 text-center leading-5`}>
                  {t('rating.subTitle')}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header */}
                <View style={tw`flex-row justify-between items-start px-5 pt-3 pb-4`}>
                  <View style={tw`flex-1 pr-3`}>
                    <Text style={tw`text-[18px] font-black text-slate-900`}>
                      {t('rating.title')}
                    </Text>
                    <Text style={tw`text-[12px] font-bold text-slate-400 mt-0.5`}>
                      {order.from} → {order.to} · #{order.orderCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={tw`w-9 h-9 rounded-full bg-slate-100 items-center justify-center`}
                  >
                    <X size={18} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Stars */}
                <View style={tw`items-center py-4 bg-orange-50/40 mx-5 rounded-3xl border border-orange-100 mb-5`}>
                  <View style={tw`flex-row gap-2 mb-3`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => handleStarPress(star)} activeOpacity={0.8}>
                        <Animated.View style={{ transform: [{ scale: starAnims[star - 1] }] }}>
                          <Star
                            size={44}
                            color={star <= rating ? '#F59E0B' : '#e2e8f0'}
                            fill={star <= rating ? '#F59E0B' : 'transparent'}
                            strokeWidth={1.5}
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text
                    style={[
                      tw`text-[14px] font-black`,
                      { color: rating > 0 ? (rating >= 4 ? '#10b981' : rating >= 3 ? '#f59e0b' : '#ef4444') : '#94a3b8' },
                    ]}
                  >
                    {getRatingLabel(rating)}
                  </Text>
                </View>

                {/* Quick Tags */}
                <View style={tw`px-5 mb-5`}>
                  <Text style={tw`text-[12px] font-black text-slate-500 uppercase tracking-wider mb-3`}>
                    {t('rating.quickFeedback')}
                  </Text>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {quickTags.map((tag) => {
                      const active = selectedTags.includes(tag.key);
                      return (
                        <TouchableOpacity
                          key={tag.key}
                          onPress={() => toggleTag(tag.key)}
                          activeOpacity={0.8}
                          style={[
                            tw`px-3.5 py-2 rounded-2xl border`,
                            active
                              ? { backgroundColor: '#fff7f5', borderColor: '#EF5222' }
                              : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-[12px] font-bold`,
                              { color: active ? '#EF5222' : '#64748b' },
                            ]}
                          >
                            {tag.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Comment box */}
                <View style={tw`px-5 mb-6`}>
                  <Text style={tw`text-[12px] font-black text-slate-500 uppercase tracking-wider mb-2`}>
                    {t('rating.commentLabel')}
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t('rating.commentPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    style={[
                      tw`bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800`,
                      { textAlignVertical: 'top', minHeight: 90 },
                    ]}
                  />
                </View>

                {/* Submit */}
                <View style={tw`px-5 pb-10`}>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting || rating === 0}
                    activeOpacity={0.85}
                    style={[
                      tw`flex-row items-center justify-center gap-2 py-4 rounded-2xl`,
                      {
                        backgroundColor: rating === 0 ? '#e2e8f0' : '#EF5222',
                        opacity: submitting ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Send size={16} color={rating === 0 ? '#94a3b8' : '#ffffff'} />
                    <Text
                      style={[
                        tw`text-[14px] font-black`,
                        { color: rating === 0 ? '#94a3b8' : '#ffffff' },
                      ]}
                    >
                      {submitting ? t('rating.submitting') : t('rating.submit')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
