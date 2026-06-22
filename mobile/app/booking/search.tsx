import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SearchCard from '@/components/home/SearchCard';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

export default function SearchScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={['#F97316', '#EF5222', '#C2410C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          tw`px-4 pt-5 pb-5`,
          {
            shadowColor: '#C2410C',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }
        ]}
      >
        <View style={tw`flex-row items-center gap-3.5`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              tw`w-10 h-10 rounded-full justify-center items-center`,
              {
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.3)',
              }
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
              {t('search.searchHeader')}
            </Text>
            <Text style={tw`text-white text-[19px] font-black tracking-wide`}>
              {t('search.searchTitle')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ===== SEARCH FORM ===== */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-8`}
        keyboardShouldPersistTaps="handled"
      >
        <SearchCard />
      </ScrollView>
    </SafeAreaView>
  );
}

