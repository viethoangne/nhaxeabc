import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Sparkles, Trophy, AlertCircle, HelpCircle } from 'lucide-react-native';
import { apiClient } from '@/constants/api';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

interface SpinTabProps {
  points: number;
  onRefreshData: () => void;
  colors: any;
}

export default function SpinTab({ points, onRefreshData, colors }: SpinTabProps) {
  const { t, locale } = useTranslation();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  // Prizes mapping to slices: 8 slices (45 degrees each)
  const prizes = [
    { title: 'Giảm 10%', titleEn: '10% Off', code: 'GIAM10PT', isWin: true },
    { title: 'Chúc may mắn', titleEn: 'Try Again', code: null, isWin: false },
    { title: 'Giảm 30%', titleEn: '30% Off', code: 'GIAM30PT', isWin: true },
    { title: 'Chúc may mắn', titleEn: 'Try Again', code: null, isWin: false },
    { title: 'Giảm 50%', titleEn: '50% Off', code: 'GIAM50PT', isWin: true },
    { title: 'Chúc may mắn', titleEn: 'Try Again', code: null, isWin: false },
    { title: 'Giảm 2K', titleEn: '2,000đ Off', code: 'GIAM2K', isWin: true },
    { title: 'Chúc may mắn', titleEn: 'Try Again', code: null, isWin: false },
  ];

  const getPrizeLabel = (index: number) => {
    return locale === 'vi' ? prizes[index].title : prizes[index].titleEn;
  };

  // SVG parameters for 8 slices wheel (radius 140, center 150, 150)
  const radius = 130;
  const cx = 150;
  const cy = 150;

  const getSlicePath = (index: number) => {
    const angle = 45;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const startRad = (Math.PI * startAngle) / 180;
    const endRad = (Math.PI * endAngle) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const handleSpin = async () => {
    if (spinning || loading) return;
    if (points < 50) {
      Alert.alert(
        locale === 'vi' ? 'Không đủ điểm' : 'Insufficient Points',
        t('spin_not_enough_points')
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await apiClient.post('/loyalty/spin', { userId: 'current' });
      const { status, voucher, newPoints } = res.data;

      // Determine target slice index
      let targetIndex = -1;
      if (status === 'win' && voucher) {
        targetIndex = prizes.findIndex(p => p.code === voucher.code);
      } else {
        // Find a random lose index (1, 3, 5, 7)
        const loseIndices = [1, 3, 5, 7];
        targetIndex = loseIndices[Math.floor(Math.random() * loseIndices.length)];
      }

      if (targetIndex === -1) targetIndex = 1; // Fallback to try again

      // Calculate degrees
      // We want the wheel to spin 5 full rotations (1800 deg) and land on targetIndex
      // The slice is centered at: (targetIndex * 45) + 22.5
      // Clockwise rotation theta lands on index: targetIndex = Math.floor(((360 - (theta % 360)) % 360) / 45)
      // So theta = 360 - (targetIndex * 45 + 22.5)
      const targetSliceCenter = targetIndex * 45 + 22.5;
      const targetDeg = (360 - targetSliceCenter) % 360;
      const totalSpinDeg = 360 * 6 + targetDeg; // 6 spins + angle

      setSpinning(true);
      setLoading(false);

      // Trigger start haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Setup haptic ticks during rotation
      let currentTick = 0;
      const tickInterval = setInterval(() => {
        currentTick++;
        if (currentTick < 25) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          clearInterval(tickInterval);
        }
      }, 150);

      Animated.timing(spinAnim, {
        toValue: totalSpinDeg,
        duration: 4000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start(() => {
        clearInterval(tickInterval);
        setSpinning(false);
        onRefreshData(); // Fetch new points and vouchers list

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        const wonPrize = prizes[targetIndex];
        if (wonPrize.isWin) {
          setResult(t('spin_win').replace('{prize}', getPrizeLabel(targetIndex)));
        } else {
          setResult(t('spin_lose'));
        }
      });
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        locale === 'vi' ? 'Lỗi hệ thống' : 'System Error',
        error.response?.data?.message || error.message || (locale === 'vi' ? 'Không thể thực hiện quay thưởng.' : 'Cannot perform lucky spin.')
      );
    }
  };

  const rotation = spinAnim.interpolate({
    inputRange: [0, 3600],
    outputRange: ['0deg', '3600deg'],
  });

  return (
    <View style={tw`items-center py-4`}>
      {/* Header Info */}
      <View style={tw`items-center mb-6`}>
        <View style={[tw`flex-row items-center gap-1.5 px-3 py-1 rounded-full mb-2`, { backgroundColor: colors.primaryLight }]}>
          <Sparkles size={13} color={colors.primary} />
          <Text style={[tw`text-[11px] font-black uppercase tracking-wider`, { color: colors.primary }]}>
            {t('spin_cost')}
          </Text>
        </View>
        <Text style={[tw`text-lg font-black text-center mb-1`, { color: colors.text }]}>
          {t('spin_title')}
        </Text>
        <Text style={[tw`text-[12px] font-bold text-center`, { color: colors.textSecondary }]}>
          {t('spin_subtitle')}
        </Text>
      </View>

      {/* Wheel Area */}
      <View style={tw`relative w-[310px] h-[310px] justify-center items-center mb-6`}>
        {/* Outer Ring Decoration */}
        <View
          style={[
            tw`absolute w-[304px] h-[304px] rounded-full border-4 justify-center items-center shadow-lg`,
            { borderColor: colors.primary, backgroundColor: colors.card, shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 15 }
          ]}
        />

        {/* Fortune Wheel */}
        <Animated.View
          style={{
            width: 300,
            height: 300,
            transform: [{ rotate: rotation }],
          }}
        >
          <Svg width={300} height={300} viewBox="0 0 300 300">
            <G transform="rotate(-90 150 150)">
              {prizes.map((prize, index) => {
                const isEven = index % 2 === 0;
                const fill = isEven
                  ? colors.primaryLight
                  : colors.backgroundElement;
                const stroke = colors.border;
                const textAngle = index * 45 + 22.5;

                return (
                  <G key={index}>
                    {/* Slice Path */}
                    <Path
                      d={getSlicePath(index)}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1}
                    />
                    {/* Text Label rotated along slice */}
                    <G transform={`rotate(${textAngle} ${cx} ${cy})`}>
                      <SvgText
                        x={cx + 70}
                        y={cy + 4}
                        fill={prize.isWin ? colors.primary : colors.textSecondary}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {getPrizeLabel(index)}
                      </SvgText>
                    </G>
                  </G>
                );
              })}
            </G>
            {/* Center Golden Circle */}
            <Circle cx="150" cy="150" r="30" fill="#F59E0B" stroke="#FFF" strokeWidth={3} />
            <Circle cx="150" cy="150" r="18" fill="#D97706" />
          </Svg>
        </Animated.View>

        {/* Pointer Pointer Triangle at Top */}
        <View style={tw`absolute -top-1 z-10 items-center`}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M12 21 L4 5 L20 5 Z" fill="#EF5222" stroke="#FFF" strokeWidth={2} />
          </Svg>
        </View>
      </View>

      {/* Spin Button */}
      <TouchableOpacity
        onPress={handleSpin}
        disabled={spinning || loading}
        activeOpacity={0.85}
        style={[
          tw`w-64 py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg mb-6`,
          {
            backgroundColor: spinning || loading ? colors.textSecondary : colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Trophy size={16} color="#FFF" />
            <Text style={tw`text-white font-black text-sm uppercase tracking-wider`}>
              {spinning ? t('spin_in_progress') : t('spin_btn')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Result Display Banner */}
      {result && (
        <Animated.View
          style={[
            tw`w-full p-4 rounded-2xl flex-row items-center gap-3 border`,
            {
              backgroundColor: result.includes('🎉') ? '#ecfdf5' : '#f8fafc',
              borderColor: result.includes('🎉') ? '#a7f3d0' : '#e2e8f0',
            },
          ]}
        >
          {result.includes('🎉') ? (
            <Trophy size={20} color="#10b981" />
          ) : (
            <HelpCircle size={20} color="#64748b" />
          )}
          <Text style={[tw`text-[13px] font-black flex-1`, { color: result.includes('🎉') ? '#065f46' : '#334155' }]}>
            {result}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
