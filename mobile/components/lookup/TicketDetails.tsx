import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { AlertCircle, Clock, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import tw from 'twrnc';

interface TicketDetailsProps {
  ticketInfo: any;
  refundPolicy: { canCancel: boolean; refundPercent: number };
  onRequestCancel: () => void;
}

export default function TicketDetails({
  ticketInfo,
  refundPolicy,
  onRequestCancel,
}: TicketDetailsProps) {
  const { t, locale } = useTranslation();
  if (!ticketInfo) return null;

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      // Ignore
    }
    Alert.alert(locale === 'vi' ? 'Đã sao chép' : 'Copied', locale === 'vi' ? `Đã sao chép mã vé #${code}` : `Copied ticket code #${code}`);
  };

  const getStatusBgClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CANCELLED':
        return 'bg-red-50 border border-red-100';
      case 'COMPLETED':
      case 'ARCHIVED':
        return 'bg-slate-50 border border-slate-200/60';
      default:
        return 'bg-emerald-50 border border-emerald-100';
    }
  };

  const getStatusTextClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CANCELLED':
        return 'text-red-500';
      case 'COMPLETED':
      case 'ARCHIVED':
        return 'text-slate-500';
      default:
        return 'text-emerald-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CANCELLED':
        return t('lookupPage.statusCancelled').toUpperCase();
      case 'COMPLETED':
      case 'ARCHIVED':
        return t('lookupPage.statusCompleted').toUpperCase();
      default:
        return t('lookupPage.statusPending').toUpperCase();
    }
  };

  const formatPhone = (phoneStr: string) => {
    if (!phoneStr) return '';
    return phoneStr.replace(/[\s.-]/g, '').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const isRoundTrip = ticketInfo.tripType === 'round';
  const outboundSeats = ticketInfo.seats?.filter((s: any) => s.tripDirection === 'outbound') || [];
  const returnSeats = ticketInfo.seats?.filter((s: any) => s.tripDirection === 'return') || [];

  return (
    <View style={[
      tw`bg-white rounded-3xl border border-slate-100 overflow-hidden mt-4`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
      }
    ]}>
      {/* Top Brand Header */}
      <View style={tw`bg-[#EF5222]/5 px-5 py-3.5 flex-row justify-between items-center border-b border-orange-100`}>
        <View style={tw`flex-1 mr-2`}>
          <View style={tw`flex-row items-center gap-1.5`}>
            <Text style={tw`text-[14px] font-black text-slate-800`}>
              #{ticketInfo.orderCode}
            </Text>
            <TouchableOpacity
              onPress={() => handleCopyCode(ticketInfo.orderCode)}
              activeOpacity={0.65}
              style={tw`p-1 bg-white border border-orange-100 rounded-md shadow-sm`}
            >
              <Copy size={10} color="#EF5222" />
            </TouchableOpacity>
          </View>
          <Text style={tw`text-[10.5px] font-bold text-slate-400 mt-0.5`}>
            {t('lookupPage.ticketTitle')}
          </Text>
        </View>
        <View style={[tw`px-2.5 py-1 rounded-lg shrink-0`, tw`${getStatusBgClass(ticketInfo.bookingStatus)}`]}>
          <Text style={[tw`text-[9.5px] font-black uppercase tracking-wider`, tw`${getStatusTextClass(ticketInfo.bookingStatus)}`]}>
            {getStatusLabel(ticketInfo.bookingStatus)}
          </Text>
        </View>
      </View>

      {/* Main Ticket Area */}
      <View style={tw`p-5`}>
        
        {/* Outbound Route info */}
        <View style={tw`mb-3.5`}>
          <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
            <View style={tw`w-1.5 h-1.5 rounded-full bg-[#EF5222]`} />
            <Text style={tw`text-[9.5px] font-black text-[#EF5222] uppercase tracking-wider`}>
              {isRoundTrip ? t('lookupPage.outboundTitleRound') : t('lookupPage.outboundTitleOneWay')}
            </Text>
          </View>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-[15px] font-black text-slate-800`}>{ticketInfo.outboundFromSnapshot}</Text>
            <Text style={tw`text-[11px] font-black text-[#EF5222] px-2`}>➔</Text>
            <Text style={tw`text-[15px] font-black text-slate-800`}>{ticketInfo.outboundToSnapshot}</Text>
          </View>

          <View style={[tw`flex-row items-center justify-between rounded-xl px-3 py-2 border`, { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }]}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Clock size={12} color="#64748b" />
              <Text style={tw`text-[11px] font-bold text-slate-500`}>
                {new Date(ticketInfo.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(ticketInfo.date).toLocaleDateString('vi-VN')}
              </Text>
            </View>
            <Text style={tw`text-[11px] font-black text-slate-700`}>
              {t('lookupPage.seatsLabel')}: {outboundSeats.map((s: any) => s.seatNumber).join(', ') || '--'}
            </Text>
          </View>
        </View>

        {/* Return Route info (If round trip) */}
        {isRoundTrip && (
          <View style={tw`mb-3.5 border-t border-slate-100 pt-3`}>
            <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-amber-400`} />
              <Text style={tw`text-[9.5px] font-black text-amber-500 uppercase tracking-wider`}>{t('lookupPage.returnTitle')}</Text>
            </View>
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <Text style={tw`text-[15px] font-black text-slate-800`}>{ticketInfo.returnFromSnapshot}</Text>
              <Text style={tw`text-[11px] font-black text-[#EF5222] px-2`}>➔</Text>
              <Text style={tw`text-[15px] font-black text-slate-800`}>{ticketInfo.returnToSnapshot}</Text>
            </View>

            <View style={[tw`flex-row items-center justify-between rounded-xl px-3 py-2 border`, { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }]}>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Clock size={12} color="#64748b" />
                <Text style={tw`text-[11px] font-bold text-slate-500`}>
                  {ticketInfo.returnDepartDateSnapshot
                    ? `${new Date(ticketInfo.returnDepartDateSnapshot).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ticketInfo.returnDepartDateSnapshot).toLocaleDateString('vi-VN')}`
                    : '---'}
                </Text>
              </View>
              <Text style={tw`text-[11px] font-black text-slate-700`}>
                {t('lookupPage.seatsLabel')}: {returnSeats.map((s: any) => s.seatNumber).join(', ') || '--'}
              </Text>
            </View>
          </View>
        )}

        {/* Ticket Divider with Punch Holes */}
        <View style={tw`relative my-2.5 flex-row items-center justify-between`}>
          <View style={[tw`w-3 h-3 rounded-full bg-[#f8fafc] border border-slate-100 absolute z-20`, { left: -27 }]} />
          <View style={tw`flex-1 h-px border-t border-dashed border-slate-200`} />
          <View style={[tw`w-3 h-3 rounded-full bg-[#f8fafc] border border-slate-100 absolute z-20`, { right: -27 }]} />
        </View>

        {/* Passenger Info */}
        <View style={tw`flex-row justify-between mb-3.5`}>
          <View>
            <Text style={tw`text-[9.5px] font-black text-slate-400 uppercase tracking-wider`}>{t('lookupPage.passenger')}</Text>
            <Text style={tw`text-[13px] font-black text-slate-700 mt-0.5`}>{ticketInfo.customerName}</Text>
          </View>
          <View style={tw`items-end`}>
            <Text style={tw`text-[9.5px] font-black text-slate-400 uppercase tracking-wider`}>{t('lookupPage.phoneLabel')}</Text>
            <Text style={tw`text-[12.5px] font-bold text-slate-600 mt-0.5`}>{formatPhone(ticketInfo.customerPhone)}</Text>
          </View>
        </View>

        {/* QR Code Container */}
        <View style={tw`items-center py-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4 relative overflow-hidden`}>
          <View style={tw`absolute top-0 left-0 w-full h-0.5 bg-[#EF5222]`} />
          <Image
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(ticketInfo.orderCode)}` }}
            style={tw`w-28 h-28 bg-white p-1 rounded-xl border border-slate-100`}
            resizeMode="contain"
          />
          <Text style={tw`text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2`}>{locale === 'vi' ? 'Quét mã tại quầy soát vé' : 'Scan code at boarding counter'}</Text>
        </View>

        {/* Payment and price */}
        <View style={tw`bg-slate-900 rounded-2xl p-3 flex-row justify-between items-center`}>
          <View style={tw`ml-1`}>
            <Text style={tw`text-[9px] font-black text-slate-400 uppercase tracking-wider`}>{t('lookupPage.totalAmount')}</Text>
            <Text style={tw`text-[16px] font-black text-[#EF5222] mt-0.5`}>
              {Number(ticketInfo.amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={tw`px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20`}>
            <Text style={tw`text-[9.5px] font-black text-emerald-400 uppercase tracking-wider`}>
              {ticketInfo.paymentStatus === 'PAID' ? t('lookupPage.paidStatus').toUpperCase() : t('lookupPage.unpaidStatus').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Refund Policy / Request Cancel Button */}
        {ticketInfo.bookingStatus !== 'CANCELLED' && ticketInfo.bookingStatus !== 'COMPLETED' && ticketInfo.bookingStatus !== 'ARCHIVED' && (
          <View style={tw`items-center mt-3.5`}>
            {refundPolicy.canCancel ? (
              <TouchableOpacity onPress={onRequestCancel} activeOpacity={0.7} style={tw`py-0.5`}>
                <Text style={tw`text-[12.5px] font-black text-red-500 underline`}>
                  {locale === 'vi' ? `Yêu cầu hủy vé (Hoàn ${refundPolicy.refundPercent}%)` : `Request Cancellation (Refund ${refundPolicy.refundPercent}%)`}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={tw`flex-row items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100`}>
                <AlertCircle size={12} color="#94a3b8" />
                <Text style={tw`text-[10.5px] text-slate-500 font-bold`}>
                  {locale === 'vi' ? 'Không thể tự hủy vé (Bắt đầu trong dưới 12h)' : 'Cannot self-cancel (Starts in under 12h)'}
                </Text>
              </View>
            )}
          </View>
        )}

      </View>
    </View>
  );
}
