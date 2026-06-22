import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ticket } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/useTranslation';
import SaaSButton from '../ui/SaaSButton';
import tw from 'twrnc';

interface MyVouchersTabProps {
  myVouchers: any[];
  onNavigateToRedeem: () => void;
}

export default function MyVouchersTab({ myVouchers, onNavigateToRedeem }: MyVouchersTabProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View>
      <View style={tw`mb-4`}>
        <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{t('loyalty.myVouchersTitle')}</Text>
        <Text style={[tw`text-[11px] mt-1 leading-4`, { color: colors.textSecondary }]}>
          {t('loyalty.myVouchersDesc')}
        </Text>
      </View>

      {myVouchers.length === 0 ? (
        <View style={[tw`items-center justify-center py-10 rounded-2xl border`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ticket size={36} color={colors.textSecondary} />
          <Text style={[tw`text-xs mt-2.5 mb-4`, { color: colors.textSecondary }]}>{t('loyalty.noVouchers')}</Text>
          <SaaSButton
            title={t('loyalty.redeemNow')}
            onPress={onNavigateToRedeem}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : (
        myVouchers.map((v, index) => (
          <View 
            key={index} 
            style={[
              tw`flex-row justify-between items-center border rounded-2xl p-4 mb-3`, 
              { 
                backgroundColor: colors.card, 
                borderColor: v.isUsed ? colors.border : '#FDE68A',
                opacity: v.isUsed ? 0.65 : 1 
              }
            ]}
          >
            <View>
              <Text 
                style={[
                  tw`text-sm font-black tracking-wider`, 
                  { 
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    color: v.isUsed ? colors.textSecondary : '#D97706'
                  }
                ]}
              >
                {v.code}
              </Text>
              <Text style={[tw`text-xs font-semibold mt-1`, { color: colors.text }]}>{v.title}</Text>
            </View>
            <View style={[tw`px-2.5 py-1 rounded-lg`, { backgroundColor: v.isUsed ? colors.backgroundElement : '#D1FAE5' }]}>
              <Text style={[tw`text-[9px] font-black`, { color: v.isUsed ? colors.textSecondary : '#10B981' }]}>
                {v.isUsed ? t('loyalty.statusUsed') : t('loyalty.statusAvailable')}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
