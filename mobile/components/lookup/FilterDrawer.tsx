import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import { X, Layers, Clock, Bus, ShieldCheck, XCircle, Ticket, ArrowUpRight, Repeat } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

type StatusType = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type TicketType = 'all' | 'oneway' | 'round';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus: StatusType;
  initialType: TicketType;
  onApply: (status: StatusType, type: TicketType) => void;
}

export default function FilterDrawer({
  isOpen,
  onClose,
  initialStatus,
  initialType,
  onApply,
}: FilterDrawerProps) {
  const { t } = useTranslation();
  const [localStatus, setLocalStatus] = useState<StatusType>(initialStatus);
  const [localType, setLocalType] = useState<TicketType>(initialType);

  useEffect(() => {
    if (isOpen) {
      setLocalStatus(initialStatus);
      setLocalType(initialType);
    }
  }, [isOpen, initialStatus, initialType]);

  const handleApply = () => {
    onApply(localStatus, localType);
    onClose();
  };

  const handleReset = () => {
    setLocalStatus('all');
    setLocalType('all');
  };

  const statusOptions: { value: StatusType; label: string; icon: any; color: string; bgColor: string }[] = [
    { value: 'all', label: t('all'), icon: Layers, color: '#64748b', bgColor: '#f1f5f9' },
    { value: 'upcoming', label: t('historyPage.statusUpcoming'), icon: Clock, color: '#EF5222', bgColor: '#fff7ed' },
    { value: 'ongoing', label: t('historyPage.statusOngoing'), icon: Bus, color: '#3b82f6', bgColor: '#eff6ff' },
    { value: 'completed', label: t('historyPage.statusCompleted'), icon: ShieldCheck, color: '#10b981', bgColor: '#ecfdf5' },
    { value: 'cancelled', label: t('historyPage.statusCancelled'), icon: XCircle, color: '#f43f5e', bgColor: '#fff1f2' },
  ];

  const typeOptions: { value: TicketType; label: string; icon: any }[] = [
    { value: 'all', label: t('all'), icon: Ticket },
    { value: 'oneway', label: t('historyPage.typeOneway'), icon: ArrowUpRight },
    { value: 'round', label: t('historyPage.typeRound'), icon: Repeat },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <TouchableOpacity activeOpacity={1} style={tw`flex-1`} onPress={onClose} />
        
        <View style={[tw`bg-white rounded-t-3xl`, { paddingBottom: Platform.OS === 'ios' ? 40 : 25 }]}>
          {/* Header area with drag handle */}
          <View style={tw`p-5 pb-3 border-b border-slate-100`}>
            <View style={tw`w-12 h-1.5 bg-slate-300 rounded-full self-center mb-4`} />
            
            <View style={tw`flex-row justify-between items-center`}>
              <Text style={tw`text-[18px] font-black text-slate-800`}>{t('filter.title')}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={tw`p-1.5 bg-slate-100 rounded-full`}>
                <X color="#64748b" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={tw`max-h-[85%]`} showsVerticalScrollIndicator={false}>
            <View style={tw`p-5`}>
              
              {/* Trạng thái chuyến */}
              <View style={tw`mb-7`}>
                <Text style={tw`text-[13px] font-black text-slate-400 uppercase tracking-widest mb-3`}>
                  {t('filter.statusSection')}
                </Text>
                <View style={tw`flex-col gap-2.5`}>
                  {statusOptions.map((opt) => {
                    const isSelected = localStatus === opt.value;
                    const Icon = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setLocalStatus(opt.value)}
                        activeOpacity={0.7}
                        style={[
                          tw`flex-row items-center p-3.5 rounded-2xl border`,
                          isSelected 
                            ? { borderColor: '#EF5222', backgroundColor: '#fff7ed' } 
                            : tw`border-slate-200 bg-white`
                        ]}
                      >
                        <View style={[
                          tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                          { backgroundColor: opt.bgColor }
                        ]}>
                          <Icon size={20} color={opt.color} strokeWidth={isSelected ? 2.5 : 2} />
                        </View>
                        <Text style={[
                          tw`flex-1 text-[15px] font-bold`,
                          isSelected ? tw`text-[#EF5222]` : tw`text-slate-600`
                        ]}>
                          {opt.label}
                        </Text>
                        
                        {/* Radio indicator */}
                        <View style={[
                          tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                          isSelected ? { borderColor: '#EF5222' } : tw`border-slate-300`
                        ]}>
                          {isSelected && <View style={[tw`w-2.5 h-2.5 rounded-full`, { backgroundColor: '#EF5222' }]} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Loại vé */}
              <View style={tw`mb-2`}>
                <Text style={tw`text-[13px] font-black text-slate-400 uppercase tracking-widest mb-3`}>
                  {t('filter.typeSection')}
                </Text>
                <View style={tw`flex-row flex-wrap gap-2.5`}>
                  {typeOptions.map((opt) => {
                    const isSelected = localType === opt.value;
                    const Icon = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setLocalType(opt.value)}
                        activeOpacity={0.7}
                        style={[
                          tw`flex-row items-center px-4 py-3 rounded-2xl border`,
                          isSelected 
                            ? { backgroundColor: '#fff7ed', borderColor: '#EF5222' } 
                            : tw`border-slate-200 bg-white`
                        ]}
                      >
                        <Icon 
                          size={16} 
                          color={isSelected ? '#EF5222' : '#64748b'} 
                          style={tw`mr-2`}
                          strokeWidth={isSelected ? 2.5 : 2}
                        />
                        <Text style={[
                          tw`text-[14px] font-bold`,
                          isSelected ? tw`text-[#EF5222]` : tw`text-slate-600`
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw`px-5 pt-4 border-t border-slate-100 flex-row gap-3`}>
            <TouchableOpacity 
              onPress={handleReset} 
              activeOpacity={0.7} 
              style={[tw`h-14 bg-slate-100 rounded-2xl justify-center items-center`, { flex: 1 }]}
            >
              <Text style={tw`text-slate-600 font-black text-[15px]`}>{t('filter.reset')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleApply}
              activeOpacity={0.85}
              style={[tw`h-14 bg-[#EF5222] rounded-2xl justify-center items-center shadow-sm shadow-orange-200`, { flex: 1.5 }]}
            >
              <Text style={tw`text-white font-black text-[15px]`}>{t('filter.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
