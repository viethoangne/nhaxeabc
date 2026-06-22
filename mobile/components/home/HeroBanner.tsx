import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { WEB_URL } from '@/constants/api';
import tw from 'twrnc';
import { useTranslation } from '@/hooks/useTranslation';

const BANNERS = [
  { id: 1, src: `${WEB_URL}/brand/banner1.png` },
  { id: 2, src: `${WEB_URL}/brand/banner3.png` },
  { id: 3, src: `${WEB_URL}/brand/banner2.png` },
  { id: 4, src: `${WEB_URL}/brand/banner4.jpg` }, // Ảnh đi biển gia đình
];

export default function HeroBanner() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[tw`relative w-full overflow-hidden rounded-b-[24px] bg-slate-900 shadow-md`, { height: 180 }]}>
      {/* Ảnh banner hiện tại */}
      {BANNERS.map((banner, index) => {
        const isActive = currentIndex === index;
        return (
          <View
            key={banner.id}
            style={[
              StyleSheet.absoluteFillObject,
              { opacity: isActive ? 1 : 0, zIndex: isActive ? 10 : 0 },
            ]}
          >
            <Image
              source={{ uri: banner.src }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
            {/* Lớp phủ mờ nhẹ */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
          </View>
        );
      })}

      {/* Dãy số 01 02 03 04 phát sáng ở góc trên phải */}
      <View style={[tw`absolute top-3 right-3 z-30 flex-row bg-black/40 px-3 py-1 rounded-full border border-white/10`]}>
        {BANNERS.map((_, index) => {
          const isActive = currentIndex === index;
          return (
            <Text
              key={index}
              style={[
                tw`text-xs font-black italic mx-1`,
                isActive ? tw`text-orange-400 font-extrabold` : tw`text-white/40`,
                isActive && { textShadowColor: 'rgba(251, 146, 60, 0.8)', textShadowRadius: 6 },
              ]}
            >
              0{index + 1}
            </Text>
          );
        })}
      </View>

      {/* Châm ngôn thương hiệu */}
      <View style={tw`absolute bottom-4 left-4 z-25`}>
        <Text style={[tw`text-white font-black tracking-widest text-lg`, { textShadowColor: 'black', textShadowRadius: 3 }]}>
          ABC BUS LINES
        </Text>
        <Text style={[tw`text-orange-400 text-[10px] font-black uppercase tracking-wider`, { textShadowColor: 'black', textShadowRadius: 2 }]}>
          {t('heroBanner.tagline')}
        </Text>
      </View>
    </View>
  );
}
