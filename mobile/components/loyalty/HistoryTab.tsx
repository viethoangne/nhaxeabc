import React from 'react';
import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

interface HistoryTabProps {
  historyLogs: any[];
}

export default function HistoryTab({ historyLogs }: HistoryTabProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View>
      <View style={tw`mb-4`}>
        <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{t('loyalty.historyTitle')}</Text>
        <Text style={[tw`text-[11px] mt-1 leading-4`, { color: colors.textSecondary }]}>
          {t('loyalty.historyDesc')}
        </Text>
      </View>

      {historyLogs.length === 0 ? (
        <View style={[tw`items-center justify-center py-10 rounded-2xl border`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Clock size={36} color={colors.textSecondary} />
          <Text style={[tw`text-xs mt-2.5`, { color: colors.textSecondary }]}>{t('loyalty.noHistory')}</Text>
        </View>
      ) : (
        <View style={[tw`rounded-2xl border p-4`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {historyLogs.map((log, index) => {
            const isEarn = log.type === 'earn';
            return (
              <View key={index} style={[tw`flex-row pb-3.5 mb-3.5 border-b`, { borderBottomColor: colors.border }, index === historyLogs.length - 1 && tw`pb-0 mb-0 border-b-0`]}>
                <View style={[tw`w-2 h-2 rounded-full mt-1.5 mr-3`, { backgroundColor: isEarn ? colors.success : '#EF4444' }]} />
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row justify-between items-start`}>
                    <Text style={[tw`text-xs font-bold flex-1 mr-2`, { color: colors.text }]}>{log.description}</Text>
                    <Text style={[tw`text-xs font-black`, { color: isEarn ? colors.success : '#EF4444' }]}>
                      {isEarn ? `+${log.amount}` : `-${log.amount}`}
                    </Text>
                  </View>
                  <Text style={[tw`text-[9px] mt-0.5`, { color: colors.textSecondary }]}>{log.date}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
