import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Sparkles,
  Award,
  Users,
  Compass,
  MapPin,
  ShieldCheck,
  Heart,
  ChevronRight,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import tw from 'twrnc';
import { apiClient } from '@/constants/api';
import BouncyPressable from '@/components/ui/BouncyPressable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// PREMIUM COUNT-UP COUNTER COMPONENT
function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing: easeOutExpo for professional smooth deceleration
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentCount = Math.floor(easedProgress * end);
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <Text style={tw`text-[24px] font-black text-slate-800`}>{count.toLocaleString('vi-VN')}</Text>;
}

// PREMIUM FADE-IN-UP TRANSITION CONTAINER WITH SPRING PHYSICS
const FadeInUp = ({ children, delay = 0, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      damping: 16,
      stiffness: 110,
      mass: 1,
      delay: delay,
      useNativeDriver: true,
    }).start();
  }, [delay]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animatedValue,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface StatsData {
  drivers: number;
  buses: number;
  trips: number;
  customers: number;
}

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<StatsData>({
    drivers: 120,
    buses: 45,
    trips: 1980,
    customers: 5400,
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats from DB just like the web app does
  useEffect(() => {
    apiClient.get('/public/stats')
      .then((res) => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch((err) => console.log('Lỗi tải thống kê thực tế từ DB, dùng mặc định:', err))
      .finally(() => setLoading(false));
  }, []);

  const statsCards = [
    {
      id: 1,
      value: stats.trips,
      label: 'Chuyến Đi An Toàn',
      badgeText: 'Dữ liệu thực từ CSDL',
      badgeColor: 'bg-orange-50 text-orange-600 border-orange-100',
      icon: Compass,
      iconColor: '#EF5222',
      bg: '#FFF7ED',
      isLiveBadge: true,
    },
    {
      id: 2,
      value: stats.buses,
      label: 'Limousine Cao Cấp',
      badgeText: 'Cabin đôi 5 sao',
      badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
      icon: Compass,
      iconColor: '#2563eb',
      bg: '#EFF6FF',
      isLiveBadge: false,
    },
    {
      id: 3,
      value: stats.drivers,
      label: 'Tài Xế Chuyên Nghiệp',
      badgeText: 'Đầy đủ chứng chỉ',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      icon: Users,
      iconColor: '#059669',
      bg: '#ECFDF5',
      isLiveBadge: false,
    },
    {
      id: 4,
      value: stats.customers,
      label: 'Thành Viên Thân Thiết',
      badgeText: 'Tích lũy Loyalty VIP',
      badgeColor: 'bg-purple-50 text-purple-600 border-purple-100',
      icon: Heart,
      iconColor: '#8B5CF6',
      bg: '#F5F3FF',
      isLiveBadge: false,
    },
  ];

  const coreValues = [
    {
      icon: ShieldCheck,
      title: 'An Toàn Tuyệt Đối',
      desc: 'Sinh mệnh của khách hàng là trên hết. Đội ngũ tài xế của chúng tôi được đào tạo bài bản và kiểm soát định kỳ, cam kết tuân thủ nghiêm ngặt mọi quy chuẩn an toàn giao thông.',
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      icon: Award,
      title: 'Chất Lượng Là Danh Dự',
      desc: 'Dịch vụ xe Limousine VIP giường nằm cao cấp, phục vụ chu đáo, nước uống, khăn lạnh và cổng sạc USB đầy đủ. Cam kết xuất bến đúng giờ, đi đúng lộ trình.',
      color: '#EF5222',
      bg: '#FFF7ED',
    },
    {
      icon: Zap,
      title: 'Công Nghệ Dẫn Đầu',
      desc: 'Tiên phong ứng dụng Trợ lý AI đặt vé bằng giọng nói, thanh toán bảo mật đa nền tảng và tích hợp hệ thống Loyalty tích điểm đổi voucher VIP chăm sóc khách hàng tự động.',
      color: '#2563EB',
      bg: '#EFF6FF',
    },
  ];

  const timelineEvents = [
    {
      year: '2020',
      title: 'Khởi Nghiệp Vượt Thách Thức',
      desc: 'Thành lập ABC Bus Lines với chỉ 5 chiếc xe Limousine khoang đôi hạng thương gia đầu tiên phục vụ chặng bay bộ TP. Hồ Chí Minh - Đà Lạt.',
    },
    {
      year: '2022',
      title: 'Mở Rộng Mạng Lưới Phục Vụ',
      desc: 'Nâng quy mô đội xe lên hơn 40 xe, chính thức vận hành các tuyến trọng điểm đi Vũng Tàu, Nha Trang, Phan Thiết, Đà Nẵng và Hà Nội.',
    },
    {
      year: '2024',
      title: 'Chuyển Đổi Số Đột Phá',
      desc: 'ABC Bus Line tích hợp trí tuệ nhân tạo (AI Assistant) hỗ trợ đặt vé rảnh tay bằng giọng nói đầu tiên tại Việt Nam, cải tiến hệ thống thanh toán tự động.',
    },
    {
      year: '2026',
      title: 'Vươn Tầm Quốc Gia',
      desc: 'Đạt mốc hàng triệu lượt hành khách hài lòng, dẫn đầu chất lượng dịch vụ vận tải hành khách VIP cao cấp và chăm sóc khách hàng toàn diện.',
    },
  ];

  return (
    <View style={tw`flex-1 bg-[#F8FAFC]`}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ===== SEAMLESS MODERN HEADER ===== */}
      <LinearGradient
        colors={['#EF5222', '#F97316', '#FDBA74']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          tw`px-4 pb-7 rounded-b-[32px]`,
          {
            paddingTop: insets.top + 16,
            shadowColor: '#EF5222',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 15,
            elevation: 8,
          },
        ]}
      >
        <View style={tw`flex-row items-center gap-3.5`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              tw`w-10 h-10 rounded-2xl justify-center items-center`,
              {
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
              },
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Sparkles size={11} color="#FFE4E6" />
              <Text style={tw`text-white/85 text-[10px] font-black uppercase tracking-widest`}>
                Hành Trình Kiến Tạo Niềm Tin
              </Text>
            </View>
            <Text style={tw`text-white text-[20px] font-black tracking-wide mt-0.5`}>
              VỀ CHÚNG TÔI
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-4 pb-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Mission Banner */}
        <FadeInUp delay={100} duration={600}>
          <View style={tw`overflow-hidden rounded-3xl border border-orange-100 shadow-sm mb-5`}>
            <LinearGradient
              colors={['#EF5222', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`p-5.5 relative`}
            >
              {/* Large absolute Award icon overlay in background */}
              <View style={[tw`absolute right-0 bottom-[-15px] opacity-15`]}>
                <Award size={130} color="#FFFFFF" />
              </View>

              <View style={tw`flex-row items-center gap-2.5 mb-3.5 relative z-10`}>
                <View style={tw`bg-white/20 px-3 py-1 rounded-xl border border-white/20`}>
                  <Text style={tw`text-[9px] font-black text-white uppercase tracking-widest`}>
                    SỨ MỆNH DOANH NGHIỆP
                  </Text>
                </View>
                <Sparkles size={13} color="#FFFFFF" />
              </View>

              <Text style={tw`text-[14.5px] leading-6 font-black text-white mb-4 italic relative z-10`}>
                "Không chỉ là những chuyến xe đưa đón hành khách, chúng tôi kiến tạo những trải nghiệm di chuyển sang trọng, an toàn và ngập tràn niềm vui bằng sức mạnh của công nghệ đột phá."
              </Text>

              <View style={tw`w-12 h-0.5 bg-white/30 rounded-full mb-3.5 relative z-10`} />

              <Text style={tw`text-[11.5px] leading-5 text-white/85 font-extrabold relative z-10`}>
                Được thành lập từ niềm đam mê kết nối vạn dặm hành trình Việt Nam, ABC Bus Lines tự hào là đơn vị vận tải hành khách uy tín hàng đầu, mang lại dịch vụ vượt trội đến từng khách hàng.
              </Text>
            </LinearGradient>
          </View>
        </FadeInUp>

        {/* Real-time Statistics grid */}
        <View style={tw`flex-row flex-wrap justify-between gap-3 mb-6`}>
          {statsCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <FadeInUp key={card.id} delay={150 + idx * 100} duration={500} style={{ width: '48%' }}>
                <View
                  style={tw`bg-white border border-slate-100 rounded-3xl p-4.5 justify-between min-h-[160px] shadow-sm`}
                >
                  <View style={tw`flex-row justify-between items-start`}>
                    <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: card.bg }]}>
                      <Icon size={20} color={card.iconColor} />
                    </View>

                    {card.isLiveBadge && (
                      <View style={tw`flex-row items-center gap-1 bg-emerald-50 px-2 py-0.8 rounded-lg border border-emerald-100`}>
                        <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                        <Text style={tw`text-[8px] font-black text-emerald-600 uppercase tracking-widest`}>Live</Text>
                      </View>
                    )}
                  </View>

                  <View style={tw`mt-4`}>
                    <View style={tw`flex-row items-baseline`}>
                      <AnimatedCounter value={card.value} />
                      <Text style={tw`text-[16px] font-black text-slate-800 ml-0.5`}>+</Text>
                    </View>
                    <Text style={tw`text-[10.5px] font-extrabold text-slate-700 mt-1`}>
                      {card.label}
                    </Text>
                    <View style={tw`mt-2 flex-row`}>
                      <Text style={[tw`text-[8.5px] font-black border px-1.8 py-0.5 rounded-md uppercase tracking-wider`, {
                        backgroundColor: card.badgeColor.split(' ')[0] === 'bg-orange-50' ? '#FFF7ED' :
                                         card.badgeColor.split(' ')[0] === 'bg-blue-50' ? '#EFF6FF' :
                                         card.badgeColor.split(' ')[0] === 'bg-emerald-50' ? '#ECFDF5' : '#F5F3FF',
                        color: card.iconColor,
                        borderColor: 'rgba(0,0,0,0.03)',
                      }]}>
                        {card.badgeText}
                      </Text>
                    </View>
                  </View>
                </View>
              </FadeInUp>
            );
          })}
        </View>

        {/* Core Values Section */}
        <FadeInUp delay={550} duration={600}>
          <Text style={tw`text-[12.5px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3.5`}>
            Giá Trị Cốt Lõi
          </Text>
        </FadeInUp>

        <View style={tw`gap-3 mb-8`}>
          {coreValues.map((val, idx) => {
            const Icon = val.icon;
            return (
              <FadeInUp key={idx} delay={600 + idx * 100} duration={550}>
                <View
                  style={tw`bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex-row items-start gap-4`}
                >
                  <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center mt-0.5`, { backgroundColor: val.bg }]}>
                    <Icon size={22} color={val.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-[14.5px] font-black text-slate-850`}>
                      {val.title}
                    </Text>
                    <Text style={tw`text-[11.5px] leading-5 text-slate-400 font-bold mt-1`}>
                      {val.desc}
                    </Text>
                  </View>
                </View>
              </FadeInUp>
            );
          })}
        </View>

        {/* Timeline Event section */}
        <FadeInUp delay={900} duration={600}>
          <Text style={tw`text-[12.5px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-5`}>
            Chặng Đường Phát Triển
          </Text>
        </FadeInUp>

        <View style={tw`pl-6 border-l border-slate-200/80 gap-6`}>
          {timelineEvents.map((evt, idx) => (
            <FadeInUp key={idx} delay={950 + idx * 100} duration={550}>
              <View style={tw`relative`}>
                {/* Timeline node dot */}
                <View
                  style={[
                    tw`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-white border-4 border-[#EF5222] items-center justify-center shadow-sm`,
                  ]}
                />
                
                <View style={tw`bg-white border border-slate-100 rounded-3xl p-5 shadow-sm`}>
                  <Text style={tw`text-xs font-black text-[#EF5222] tracking-wider`}>
                    Năm {evt.year}
                  </Text>
                  <Text style={tw`text-[14px] font-black text-slate-850 mt-1 mb-2`}>
                    {evt.title}
                  </Text>
                  <Text style={tw`text-[11.5px] leading-5 text-slate-400 font-bold`}>
                    {evt.desc}
                  </Text>
                </View>
              </View>
            </FadeInUp>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
