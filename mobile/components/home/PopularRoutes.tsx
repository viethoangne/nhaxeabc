import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { isAxiosError } from 'axios';
import { apiClient } from '@/constants/api';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/useTranslation';
import BouncyPressable from '../ui/BouncyPressable';
import tw from 'twrnc';

const GROUPED_ROUTE_TEMPLATES = [
  {
    displayName: "TP. Hồ Chí Minh",
    searchKey: "hồ chí minh",
    images: [
      "https://nhaxeabc.vercel.app/brand/2.jpg",
      "https://nhaxeabc.vercel.app/brand/2.1.jpg",
      "https://nhaxeabc.vercel.app/brand/2.2.jpg"
    ],
    routes: [
      { to: "Đà Lạt", distance: "310km", duration: "6h30p" },
      { to: "Hà Nội", distance: "1700km", duration: "30h" },
      { to: "Cần Thơ", distance: "170km", duration: "3h" }
    ]
  },
  {
    displayName: "Đà Lạt",
    searchKey: "đà lạt",
    images: [
      "https://nhaxeabc.vercel.app/brand/dalat.jpg",
      "https://nhaxeabc.vercel.app/brand/dalat1.jpg",
      "https://nhaxeabc.vercel.app/brand/dalat2.jpg"
    ],
    routes: [
      { to: "Nha Trang", distance: "140km", duration: "3h" },
      { to: "Cần Thơ", distance: "470km", duration: "9h" },
      { to: "Hà Nội", distance: "1480km", duration: "26h40p" }
    ]
  },
  {
    displayName: "Đà Nẵng",
    searchKey: "đà nẵng",
    images: [
      "https://nhaxeabc.vercel.app/brand/danang.jpg",
      "https://nhaxeabc.vercel.app/brand/danang1.jpg",
      "https://nhaxeabc.vercel.app/brand/danang2.jpg"
    ],
    routes: [
      { to: "Phan Thiết", distance: "790km", duration: "15h" },
      { to: "Vũng Tàu", distance: "870km", duration: "17h" },
      { to: "Nha Trang", distance: "530km", duration: "10h30p" }
    ]
  }
];

function ImageSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.15,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setIndex((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [images]);

  return (
    <Animated.Image
      source={{ uri: images[index] }}
      style={[tw`h-full w-full absolute inset-0`, { opacity: fadeAnim }]}
      resizeMode="cover"
    />
  );
}

interface PopularRoutesProps {
  onSelectRoute: (from: string, to: string) => void;
}

export default function PopularRoutes({ onSelectRoute }: PopularRoutesProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchRoutesWithRetry = async (maxAttempts = 5) => {
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await apiClient.get('/schedule/routes');
          return response.data;
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            await sleep(500 * Math.pow(2, attempt - 1));
          }
        }
      }

      throw lastError;
    };

    const fetchRoutes = async () => {
      try {
        const apiTrips = await fetchRoutesWithRetry(5);
        const tripsArray = Array.isArray(apiTrips) ? apiTrips : (apiTrips.trips || []);

        const mappedGroups = GROUPED_ROUTE_TEMPLATES.map(group => {
          const mappedRoutes = group.routes.map(r => {
            const match = tripsArray.find((t: any) => 
              t.from.toLowerCase().includes(group.searchKey) && 
              t.to.toLowerCase().includes(r.to.toLowerCase())
            );
            
            const dynamicBookings = match ? (match.bookingsCount || 0) : 0;
            const reviewsCount = match ? (match.reviewsCount || 0) : 0;
            const averageRating = match ? (match.averageRating || 0) : 0;
            const price = match && match.price 
              ? `${match.price.toLocaleString()}đ` 
              : "10.000đ";

            return {
              ...r,
              price,
              bookingsCount: dynamicBookings,
              reviewsCount,
              averageRating,
            };
          });

          return {
            ...group,
            routes: mappedRoutes
          };
        });

        setRoutes(mappedGroups);
      } catch (err) {
        const status = isAxiosError(err) ? err.response?.status : undefined;
        console.warn(`Không tải được tuyến đường phổ biến${status ? ` (HTTP ${status})` : ''}, dùng dữ liệu mặc định.`);
        // Fallback
        setRoutes(GROUPED_ROUTE_TEMPLATES.map(group => ({
          ...group,
          routes: group.routes.map(r => ({
            ...r,
            price: "10.000đ",
            bookingsCount: 0,
            reviewsCount: 0,
            averageRating: 0,
          }))
        })));
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  if (loading) {
    return (
      <View style={tw`mt-7 py-5 items-center justify-center`}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  return (
    <View style={tw`mt-7`}>
      <Text style={[tw`text-[17px] font-black mb-4 px-5 tracking-wide`, { color: colors.text }]}>
        {t('popular.header')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`flex-row gap-4 px-5 pb-3`}
      >
        {routes.map((group, idx) => {
          return (
            <View
              key={idx}
              style={[
                tw`bg-white rounded-3xl overflow-hidden border shadow-sm w-[290px]`,
                { backgroundColor: colors.card, borderColor: colors.border }
              ]}
            >
              {/* Image Header of City Hub with Slideshow */}
              <View style={tw`relative h-[130px] w-full bg-slate-900 overflow-hidden`}>
                <ImageSlideshow images={group.images} />
                {/* Overlay layer */}
                <View style={tw`absolute inset-0 bg-black/30`} />
                
                {/* Small indicator tag */}
                <View style={tw`absolute top-3 left-3 bg-black/50 px-2 py-0.8 rounded-lg`}>
                  <Text style={tw`text-[8.5px] font-black text-white uppercase tracking-wider`}>
                    {t('popular.departFrom')}
                  </Text>
                </View>

                {/* City Name */}
                <Text style={tw`absolute bottom-3.5 left-4 text-white text-[22px] font-black tracking-wide`}>
                  {group.displayName}
                </Text>
              </View>

              {/* Destination Routes List */}
              <View style={tw`p-3.5 gap-2.5`}>
                {group.routes.map((route: any, rIdx: number) => (
                  <BouncyPressable
                    key={rIdx}
                    onPress={() => onSelectRoute(group.displayName, route.to)}
                    style={tw`flex-row items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100/80`}
                  >
                    {/* Left: Destination name & badges */}
                    <View style={tw`flex-1 mr-2`}>
                      <Text style={tw`text-[14px] font-black text-slate-800`}>
                        {route.to}
                      </Text>
                      <View style={tw`flex-row flex-wrap items-center gap-1 mt-1.5`}>
                        {/* Distance pill */}
                        <View style={[tw`flex-row items-center px-2 py-0.5 rounded-full`, { backgroundColor: '#fff4ee', borderWidth: 1, borderColor: '#fcd8c4' }]}>
                          <Text style={[tw`font-black`, { fontSize: 9, color: '#EF5222', letterSpacing: 0.2 }]}>
                            ⚡ {route.distance}
                          </Text>
                        </View>
                        {/* Duration pill */}
                        <View style={[tw`flex-row items-center px-2 py-0.5 rounded-full`, { backgroundColor: '#f0fdfb', borderWidth: 1, borderColor: '#99e6db' }]}>
                          <Text style={[tw`font-black`, { fontSize: 9, color: '#0d9488', letterSpacing: 0.2 }]}>
                            ⏱ {route.duration}
                          </Text>
                        </View>
                        {/* Reviews pill */}
                        <View style={[tw`flex-row items-center px-2 py-0.5 rounded-full`, route.reviewsCount > 0
                          ? { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d' }
                          : { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }
                        ]}>
                          <Text style={[tw`font-black`, { fontSize: 9, color: route.reviewsCount > 0 ? '#92400e' : '#94a3b8', letterSpacing: 0.2 }]}>
                            💬 {t('popular.reviewsCount').replace('{count}', String(route.reviewsCount))}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right: Price & Booking Count */}
                    <View style={tw`items-end`}>
                      <Text style={tw`text-[14px] font-black text-[#EF5222]`}>
                        {route.price}
                      </Text>
                      <Text style={tw`text-[10px] font-bold text-slate-400 mt-0.5`}>
                        {t('popular.bookingsCount').replace('{count}', String(route.bookingsCount))}
                      </Text>
                    </View>
                  </BouncyPressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
