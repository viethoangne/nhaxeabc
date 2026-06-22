import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Gift, Star } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

interface RedeemTabProps {
  vouchers: any[];
  points: number;
  onRedeem: (voucher: any) => void;
}

export default function RedeemTab({ vouchers, points, onRedeem }: RedeemTabProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View>
      <View style={tw`mb-4`}>
        <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{t('loyalty.redeemTitle')}</Text>
        <Text style={[tw`text-[11px] mt-1 leading-4`, { color: colors.textSecondary }]}>
          {t('loyalty.redeemDesc')}
        </Text>
      </View>

      {vouchers.length === 0 ? (
        <View style={[tw`items-center justify-center py-10 rounded-2xl border`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Gift size={36} color={colors.textSecondary} />
          <Text style={[tw`text-xs mt-2.5`, { color: colors.textSecondary }]}>{t('loyalty.noRedeemable')}</Text>
        </View>
      ) : (
        vouchers.map((v) => {
          const canRedeem = points >= v.cost;
          return (
            <View 
              key={v.id} 
              style={[
                tw`flex-row border rounded-2xl mb-3.5 overflow-hidden relative`, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: canRedeem ? colors.primary : colors.border,
                  opacity: canRedeem ? 1 : 0.75
                }
              ]}
            >
              {/* Cánh trái của voucher */}
              <View style={[tw`flex-1 p-4 border-r-2`, { borderStyle: 'dashed', borderRightColor: colors.border }]}>
                <Text 
                  style={[
                    tw`self-start px-2 py-1 rounded-md text-[9px] font-bold border`, 
                    { 
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                      color: colors.textSecondary
                    }
                  ]}
                >
                  {v.code}
                </Text>
                <Text style={[tw`text-xs font-bold mt-2.5`, { color: colors.text }]}>{v.title}</Text>
                <Text style={[tw`text-sm font-black mt-0.5`, { color: colors.primary }]}>
                  {v.type === 'percent' 
                    ? t('loyalty.discountPercent').replace('{value}', String(v.value))
                    : t('loyalty.discountAmount').replace('{value}', v.value.toLocaleString())}
                </Text>
                {v.maxAmount && (
                  <Text style={[tw`text-[9px] mt-0.5`, { color: colors.textSecondary }]}>
                    {t('loyalty.maxDiscount').replace('{value}', v.maxAmount.toLocaleString())}
                  </Text>
                )}
              </View>

              {/* Cánh phải của voucher (Điểm đổi) */}
              <View style={[tw`w-[100px] justify-center items-center p-3`, { backgroundColor: colors.background }]}>
                <View style={tw`flex-row items-center mb-2`}>
                  <Text style={[tw`text-lg font-black`, { color: canRedeem ? colors.primary : colors.textSecondary }]}>
                    {v.cost}
                  </Text>
                  <Star size={12} color={canRedeem ? colors.primary : colors.textSecondary} style={tw`ml-0.5`} />
                </View>
                <TouchableOpacity
                  onPress={() => onRedeem(v)}
                  disabled={!canRedeem}
                  style={[
                    tw`w-full py-2 rounded-xl items-center`, 
                    { backgroundColor: canRedeem ? colors.primary : colors.backgroundSelected }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[tw`text-[9px] font-black`, { color: canRedeem ? '#FFFFFF' : colors.textSecondary }]}>
                    {t('loyalty.btnRedeem')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ticket Notches (Gờ xén của vé) */}
              <View style={[
                tw`absolute -left-2 top-1/2 -mt-2 w-4 h-4 rounded-full border`, 
                { backgroundColor: colors.background, borderColor: canRedeem ? colors.primary : colors.border, zIndex: 10 }
              ]} />
              <View style={[
                tw`absolute right-[92px] top-1/2 -mt-2 w-4 h-4 rounded-full border`, 
                { backgroundColor: colors.background, borderColor: canRedeem ? colors.primary : colors.border, zIndex: 10 }
              ]} />
            </View>
          );
        })
      )}
    </View>
  );
}
