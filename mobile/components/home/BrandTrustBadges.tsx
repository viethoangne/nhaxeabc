import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck, Star, Clock, Award, Headphones, Zap } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

export default function BrandTrustBadges() {
  const { t } = useTranslation();

  const badges = [
    {
      icon: <ShieldCheck color="#EF5222" size={24} />,
      bg: '#ffebe5',
      title: t('trust.safeTitle'),
      desc: t('trust.safeDesc'),
    },
    {
      icon: <Star color="#F59E0B" size={24} />,
      bg: '#fef3c7',
      title: t('trust.comfortTitle'),
      desc: t('trust.comfortDesc'),
    },
    {
      icon: <Clock color="#10b981" size={24} />,
      bg: '#d1fae5',
      title: t('trust.ontimeTitle'),
      desc: t('trust.ontimeDesc'),
    },
    {
      icon: <Award color="#8b5cf6" size={24} />,
      bg: '#ede9fe',
      title: t('trust.loyaltyTitle'),
      desc: t('trust.loyaltyDesc'),
    },
    {
      icon: <Headphones color="#3b82f6" size={24} />,
      bg: '#dbeafe',
      title: t('trust.supportTitle'),
      desc: t('trust.supportDesc'),
    },
    {
      icon: <Zap color="#EF5222" size={24} />,
      bg: '#fff7ed',
      title: t('trust.fastTitle'),
      desc: t('trust.fastDesc'),
    },
  ];

  return (
    <View style={tw`mt-7 px-4.5`}>
      <Text style={tw`text-[12.5px] font-black text-[#64748b] uppercase tracking-widest mb-4 px-1`}>
        {t('trust.header')}
      </Text>

      <View style={tw`flex-row flex-wrap gap-3`}>
        {badges.map((badge, i) => (
          <View
            key={i}
            style={[tw`bg-white rounded-2xl p-4.5 border border-[#e2e8f0] items-start`, { width: '47.5%', elevation: 1.5 }]}
          >
            <View style={[tw`w-10 h-10 rounded-full justify-center items-center mb-3`, { backgroundColor: badge.bg }]}>
              {badge.icon}
            </View>
            <Text style={tw`text-[13px] font-black text-[#1e293b] mb-1.5`}>{badge.title}</Text>
            <Text style={tw`text-[11.5px] text-[#64748b] font-bold leading-5`}>{badge.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
