import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ChevronLeft, Bus, Phone, MapPin, Clock, Navigation,
  CheckCircle, AlertCircle, Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path as SvgPath, Circle as SvgCircle, G as SvgG } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { apiClient } from '@/constants/api';
import tw from 'twrnc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Compute a linear progress (0→1) of the trip
function computeTripProgress(departDateStr: string, durationMinutes: number): number {
  if (!departDateStr || !durationMinutes) return 0;
  const now = Date.now();
  const departTime = new Date(departDateStr).getTime();
  const endTime = departTime + durationMinutes * 60 * 1000;
  if (now <= departTime) return 0;
  if (now >= endTime) return 1;
  return (now - departTime) / (endTime - departTime);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'Đã đến nơi';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

const ProgressBus = ({ progress, colors }: { progress: number; colors: any }) => {
  const busAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(busAnim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Bezier curve calculations (21 points)
  const steps = 20;
  const inputRange: number[] = [];
  const outputRangeX: number[] = [];
  const outputRangeY: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    inputRange.push(p);

    let x = 0;
    let y = 0;

    if (p <= 0.5) {
      const t = p * 2;
      const mt = 1 - t;
      x = mt*mt*mt * 40 + 3*mt*mt*t * 90 + 3*mt*t*t * 110 + t*t*t * 160;
      y = mt*mt*mt * 130 + 3*mt*mt*t * 130 + 3*mt*t*t * 50 + t*t*t * 50;
    } else {
      const t = (p - 0.5) * 2;
      const mt = 1 - t;
      x = mt*mt*mt * 160 + 3*mt*mt*t * 210 + 3*mt*t*t * 230 + t*t*t * 280;
      y = mt*mt*mt * 50 + 3*mt*mt*t * 50 + 3*mt*t*t * 130 + t*t*t * 130;
    }

    outputRangeX.push(x - 16); // offset by 16 (half of 32px bus container width)
    outputRangeY.push(y - 16); // offset by 16
  }

  const translateX = busAnim.interpolate({
    inputRange,
    outputRange: outputRangeX,
  });

  const translateY = busAnim.interpolate({
    inputRange,
    outputRange: outputRangeY,
  });

  // Road SVG path representation
  const roadD = "M 40 130 C 90 130, 110 50, 160 50 C 210 50, 230 130, 280 130";

  return (
    <View style={tw`items-center py-6 px-4`}>
      <View style={tw`relative w-[320px] h-[180px]`}>
        <Svg width={320} height={180} viewBox="0 0 320 180">
          {/* Background Winding Road */}
          <SvgPath
            d={roadD}
            fill="none"
            stroke={colors.border}
            strokeWidth={14}
            strokeLinecap="round"
          />
          {/* Inner Asphalt Line */}
          <SvgPath
            d={roadD}
            fill="none"
            stroke={colors.backgroundElement}
            strokeWidth={10}
            strokeLinecap="round"
          />
          {/* Road center dashed line */}
          <SvgPath
            d={roadD}
            fill="none"
            stroke={colors.textSecondary}
            strokeWidth={1}
            strokeDasharray="6,6"
            strokeLinecap="round"
            opacity={0.6}
          />

          {/* Active road progress indicator (approximation) */}
          <SvgPath
            d={roadD}
            fill="none"
            stroke={colors.primary}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.15}
          />

          {/* Station Milestone Pins */}
          {/* Start Point Pin */}
          <SvgG transform="translate(40, 130)">
            <SvgCircle cx="0" cy="0" r="14" fill="#10B981" opacity={0.2} />
            <SvgCircle cx="0" cy="0" r="8" fill="#10B981" stroke="#FFF" strokeWidth={2} />
          </SvgG>

          {/* Rest Stop Milestone at center */}
          <SvgG transform="translate(160, 50)">
            <SvgCircle cx="0" cy="0" r="12" fill="#F59E0B" opacity={0.2} />
            <SvgCircle cx="0" cy="0" r="6" fill="#F59E0B" stroke="#FFF" strokeWidth={1.5} />
          </SvgG>

          {/* Destination Point Pin */}
          <SvgG transform="translate(280, 130)">
            <SvgCircle cx="0" cy="0" r="14" fill="#EF4444" opacity={0.2} />
            <SvgCircle cx="0" cy="0" r="8" fill="#EF4444" stroke="#FFF" strokeWidth={2} />
          </SvgG>
        </Svg>

        {/* Animated Bus Icon Marker overlay */}
        <Animated.View
          style={[
            tw`absolute w-8 h-8 rounded-full items-center justify-center shadow-lg`,
            {
              backgroundColor: colors.primary,
              transform: [{ translateX }, { translateY }],
              shadowColor: colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 5,
              elevation: 4,
            },
          ]}
        >
          <Bus size={15} color="#ffffff" />
        </Animated.View>
      </View>

      {/* Percentage */}
      <View style={tw`items-center mt-3`}>
        <Text style={[tw`text-[28px] font-black`, { color: colors.primary }]}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={[tw`text-[11px] font-bold uppercase tracking-wider`, { color: colors.textSecondary }]}>
          Tiến độ hành trình
        </Text>
      </View>
    </View>
  );
};

export default function TrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useTheme();

  const orderId = params.orderId as string;
  const orderCode = params.orderCode as string;
  const from = params.from as string;
  const to = params.to as string;
  const departDateStr = params.departDate as string;
  const durationMinutes = Number(params.durationMinutes || 240);
  const driverName = params.driverName as string;
  const driverPhone = params.driverPhone as string;
  const busPlate = params.busPlate as string;
  const busType = params.busType as string;
  const pickupPoint = params.pickupPoint as string;
  const dropoffPoint = params.dropoffPoint as string;

  const [progress, setProgress] = useState(() => computeTripProgress(departDateStr, durationMinutes));
  const [now, setNow] = useState(Date.now());

  // Refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      setProgress(computeTripProgress(departDateStr, durationMinutes));
    }, 15000);
    return () => clearInterval(interval);
  }, [departDateStr, durationMinutes]);

  const departTime = departDateStr ? new Date(departDateStr).getTime() : 0;
  const endTime = departTime + durationMinutes * 60 * 1000;
  const etaMs = Math.max(0, endTime - now);
  const arrivalTimeStr = departTime
    ? new Date(endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const arrivalDateStr = departTime
    ? new Date(endTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '---';

  const tripStatus: 'not_started' | 'ongoing' | 'arrived' =
    progress === 0 ? 'not_started' : progress >= 1 ? 'arrived' : 'ongoing';

  const handleCallDriver = () => {
    if (!driverPhone) {
      Alert.alert('Thông báo', 'Không có thông tin số điện thoại tài xế.');
      return;
    }
    Linking.openURL(`tel:${driverPhone}`);
  };

  const statusColor = tripStatus === 'arrived' ? '#10b981' : tripStatus === 'ongoing' ? '#3b82f6' : '#f59e0b';
  const statusLabel = tripStatus === 'arrived' ? 'Đã đến nơi' : tripStatus === 'ongoing' ? 'Đang trên đường' : 'Chưa khởi hành';
  const StatusIcon = tripStatus === 'arrived' ? CheckCircle : tripStatus === 'ongoing' ? Navigation : AlertCircle;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#EF5222']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`px-4 pt-4 pb-6`}
      >
        <View style={tw`flex-row items-center gap-3 mb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[tw`w-10 h-10 rounded-full justify-center items-center`, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
              Theo dõi xe thời gian thực
            </Text>
            <Text style={tw`text-white text-[18px] font-black`}>
              {from} → {to}
            </Text>
          </View>
          {/* Status badge */}
          <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <StatusIcon size={12} color="#ffffff" />
            <Text style={tw`text-[10px] font-black text-white`}>{statusLabel}</Text>
          </View>
        </View>

        {/* Info chips */}
        <View style={tw`flex-row gap-2`}>
          <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
            <Zap size={11} color="rgba(255,255,255,0.85)" />
            <Text style={tw`text-white text-[10px] font-black`}>#{orderCode}</Text>
          </View>
          <View style={[tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full`, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
            <Clock size={11} color="rgba(255,255,255,0.85)" />
            <Text style={tw`text-white text-[10px] font-black`}>
              {durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''}` : `${durationMinutes}m`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress Visualization */}
        <View style={[tw`mx-4 mt-4 rounded-3xl border shadow-sm overflow-hidden`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={tw`flex-row items-center justify-between px-5 pt-4 pb-2`}>
            <Text style={[tw`text-[14px] font-black`, { color: colors.text }]}>Vị trí xe ước tính</Text>
            <View style={[tw`flex-row items-center gap-1.5 px-2 py-1 rounded-lg`, { backgroundColor: `${statusColor}15` }]}>
              <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: statusColor }]} />
              <Text style={[tw`text-[10px] font-black`, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <ProgressBus progress={progress} colors={colors} />

          {/* From / To labels */}
          <View style={tw`flex-row justify-between px-8 pb-4`}>
            <View style={tw`items-start max-w-[40%]`}>
              <Text style={[tw`text-[12px] font-black`, { color: colors.text }]} numberOfLines={1}>{from}</Text>
              {pickupPoint && (
                <Text style={[tw`text-[10px] font-bold mt-0.5`, { color: colors.textSecondary }]} numberOfLines={2}>{pickupPoint}</Text>
              )}
            </View>
            <View style={tw`items-end max-w-[40%]`}>
              <Text style={[tw`text-[12px] font-black text-right`, { color: colors.text }]} numberOfLines={1}>{to}</Text>
              {dropoffPoint && (
                <Text style={[tw`text-[10px] font-bold mt-0.5 text-right`, { color: colors.textSecondary }]} numberOfLines={2}>{dropoffPoint}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ETA Card */}
        <View style={[tw`mx-4 mt-3 rounded-3xl border shadow-sm px-5 py-4`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[tw`text-[11px] font-black uppercase tracking-wider mb-3`, { color: colors.textSecondary }]}>Thời gian dự kiến</Text>
          <View style={tw`flex-row justify-between`}>
            <View>
              <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>ETA còn lại</Text>
              <Text style={[tw`text-[22px] font-black mt-0.5`, { color: statusColor }]}>
                {tripStatus === 'arrived' ? '🎉 Đã đến!' : formatDuration(etaMs)}
              </Text>
            </View>
            <View style={tw`items-end`}>
              <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>Giờ đến dự kiến</Text>
              <Text style={[tw`text-[22px] font-black mt-0.5`, { color: colors.text }]}>{arrivalTimeStr}</Text>
              <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>{arrivalDateStr}</Text>
            </View>
          </View>
        </View>

        {/* Bus & Driver info */}
        <View style={[tw`mx-4 mt-3 rounded-3xl border shadow-sm px-5 py-4 mb-4`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[tw`text-[11px] font-black uppercase tracking-wider mb-3`, { color: colors.textSecondary }]}>Thông tin xe & Tài xế</Text>

          {busPlate ? (
            <View style={tw`flex-row items-center gap-3 mb-3`}>
              <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: colors.primaryLight }]}>
                <Bus size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>Biển số xe</Text>
                <Text style={[tw`text-[15px] font-black`, { color: colors.text }]}>{busPlate}</Text>
              </View>
              {busType && (
                <View style={[tw`ml-auto border px-2.5 py-1 rounded-lg`, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '22' }]}>
                  <Text style={[tw`text-[10px] font-black`, { color: colors.primary }]}>{busType}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={tw`flex-row items-center gap-3 mb-3`}>
              <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: colors.backgroundElement }]}>
                <Bus size={18} color={colors.textSecondary} />
              </View>
              <Text style={[tw`text-[13px] font-bold`, { color: colors.textSecondary }]}>Chưa có thông tin xe</Text>
            </View>
          )}

          {driverName ? (
            <View style={[tw`flex-row items-center justify-between pt-3 border-t`, { borderColor: colors.border }]}>
              <View style={tw`flex-row items-center gap-3`}>
                <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={tw`text-[18px]`}>👤</Text>
                </View>
                <View>
                  <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>Tài xế</Text>
                  <Text style={[tw`text-[14px] font-black`, { color: colors.text }]}>{driverName}</Text>
                </View>
              </View>
              {driverPhone && (
                <TouchableOpacity
                  onPress={handleCallDriver}
                  activeOpacity={0.8}
                  style={tw`flex-row items-center gap-2 bg-emerald-500 px-4 py-2.5 rounded-2xl`}
                >
                  <Phone size={14} color="#ffffff" />
                  <Text style={tw`text-[12px] font-black text-white`}>Gọi ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[tw`flex-row items-center gap-3 pt-3 border-t`, { borderColor: colors.border }]}>
              <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: colors.backgroundElement }]}>
                <Text style={tw`text-[18px]`}>👤</Text>
              </View>
              <Text style={[tw`text-[13px] font-bold`, { color: colors.textSecondary }]}>Chưa phân công tài xế</Text>
            </View>
          )}
        </View>

        {/* Note */}
        <View
          style={[
            tw`mx-4 mb-8 border rounded-2xl px-4 py-3`,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary + '22',
            }
          ]}
        >
          <Text style={[tw`text-[11px] font-bold leading-5`, { color: colors.primary }]}>
            ⚠️ Vị trí xe được ước tính dựa trên thời gian hành trình. Để theo dõi chính xác hơn, vui lòng liên hệ tài xế trực tiếp.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
