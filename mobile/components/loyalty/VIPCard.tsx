import React from 'react';
import { View, Text, Image } from 'react-native';
import { ShieldCheck, Sparkles, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

interface VIPCardProps {
  user: any;
  points: number;
}

const TIER_CONFIG = {
  GOLD:     { colors: ['#CF9E41', '#F6E3B8', '#9F7425'] as const, label: 'GOLD MEMBER',     textColor: '#5a400f' },
  SILVER:   { colors: ['#8e9eab', '#eef2f3', '#6b7c88'] as const, label: 'SILVER MEMBER',   textColor: '#374151' },
  BRONZE:   { colors: ['#a07050', '#d4a880', '#7a5030'] as const, label: 'BRONZE MEMBER',   textColor: '#4a2c0a' },
  IRON:     { colors: ['#4b4b4b', '#8e8e8e', '#2d2d2d'] as const, label: 'IRON MEMBER',     textColor: '#e5e7eb' },
  PLATINUM: { colors: ['#4b6cb7', '#d4e0ff', '#182848'] as const, label: 'PLATINUM MEMBER', textColor: '#1e3a5f' },
};

export default function VIPCard({ user, points }: VIPCardProps) {
  const { t } = useTranslation();
  if (!user) return null;

  const tier = (user.tier as keyof typeof TIER_CONFIG) || 'BRONZE';
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['BRONZE'];

  return (
    <LinearGradient
      colors={cfg.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[tw`w-full rounded-3xl p-5 justify-between`, { height: 200, shadowColor: '#9F7425', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 }]}
    >
      {/* Top Row */}
      <View style={tw`flex-row justify-between items-start`}>
        <View>
          <Text style={[tw`text-[9px] font-bold tracking-widest`, { color: cfg.textColor }]}>{t('loyalty.cardTitle')}</Text>
          <Text style={[tw`text-base font-black mt-0.5`, { color: cfg.textColor }]}>LotusMiles VIP</Text>
        </View>
        <View style={[tw`flex-row items-center bg-white/25 px-2.5 py-1.5 rounded-full border border-white/30`]}>
          <ShieldCheck color={cfg.textColor} size={14} />
          <Text style={[tw`text-[10px] font-black ml-1`, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Điểm tích lũy */}
      <View>
        <Text style={[tw`text-[8px] font-bold tracking-widest`, { color: cfg.textColor }]}>{t('loyalty.cardPoints')}</Text>
        <View style={tw`flex-row items-baseline mt-0.5`}>
          <Text style={[tw`text-[36px] font-black leading-10`, { color: cfg.textColor }]}>{points.toLocaleString()}</Text>
          <Sparkles color={cfg.textColor} size={20} style={tw`ml-2`} />
        </View>
      </View>

      {/* Bottom: Avatar + Tên */}
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={tw`w-8 h-8 rounded-full border-2 border-white/50 mr-2.5`} />
          ) : (
            <View style={tw`w-8 h-8 rounded-full bg-white/30 mr-2.5 items-center justify-center border border-white/50`}>
              <Text style={[tw`text-xs font-black`, { color: cfg.textColor }]}>{user.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={[tw`text-sm font-black tracking-widest`, { color: cfg.textColor }]}>{user.name?.toUpperCase()}</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Star size={12} color={cfg.textColor} fill={cfg.textColor} />
          <Text style={[tw`text-[10px] font-bold ml-1`, { color: cfg.textColor }]}>
            {t('loyalty.cardTrips').replace('{count}', String(user.totalTrips || 0))}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
