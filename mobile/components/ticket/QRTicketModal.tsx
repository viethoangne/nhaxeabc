import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { X, Download, Share2, QrCode, MapPin, Clock, Bus, User, Phone } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QRTicketModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
}

export default function QRTicketModal({ visible, onClose, order }: QRTicketModalProps) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!order) return null;

  const departDate = order.outboundDepartDateSnapshot || order.date;
  const deptTime = departDate
    ? new Date(departDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const deptDay = departDate
    ? new Date(departDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '---';

  const outboundSeats = (order.seats || [])
    .filter((s: any) => s.tripDirection === 'outbound' || !s.tripDirection)
    .map((s: any) => s.seatNumber)
    .join(', ') || '--';

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('ticket.shareMessage')
          .replace('{code}', order.orderCode)
          .replace('{seats}', outboundSeats) +
          `🚌 ${order.from} → ${order.to}\n` +
          `📅 ${deptDay} - ${deptTime}\n` +
          `👤 ${order.customerName}\n` +
          `📞 ${order.customerPhone}`,
        title: `ABC Bus Ticket #${order.orderCode}`,
      });
    } catch (error) {
      console.error('Lỗi chia sẻ vé:', error);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          tw`flex-1 justify-end`,
          { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity style={tw`flex-1`} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: SCREEN_HEIGHT * 0.92,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={tw`items-center pt-3 pb-1`}>
            <View style={tw`w-10 h-1 bg-slate-200 rounded-full`} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center px-5 py-3 border-b border-slate-100`}>
              <View>
                <Text style={tw`text-[18px] font-black text-slate-900`}>{t('ticket.modalTitle')}</Text>
                <Text style={tw`text-[11px] font-bold text-slate-400 mt-0.5`}>
                  #{order.orderCode}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={tw`w-9 h-9 rounded-full bg-slate-100 items-center justify-center`}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* QR Code area */}
            <View style={tw`items-center px-5 pt-5 pb-4`}>
              {/* Orange gradient circle border around QR */}
              <View
                style={[
                  tw`p-4 rounded-3xl border-2`,
                  {
                    borderColor: '#EF5222',
                    backgroundColor: '#fff7f5',
                    shadowColor: '#EF5222',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.18,
                    shadowRadius: 16,
                    elevation: 6,
                  },
                ]}
              >
                {/* If backend provides a real QR image URL */}
                {order.qrCode && order.qrCode.startsWith('http') ? (
                  <Image
                    source={{ uri: order.qrCode }}
                    style={tw`w-52 h-52`}
                    resizeMode="contain"
                  />
                ) : (
                  // Fallback: stylized QR placeholder with order code
                  <View style={tw`w-52 h-52 items-center justify-center`}>
                    {/* Decorative QR pattern using the lucide icon + text */}
                    <QrCode size={110} color="#EF5222" />
                    <Text style={tw`text-[11px] font-black text-slate-600 mt-3 tracking-widest`}>
                      {order.orderCode}
                    </Text>
                    <Text style={tw`text-[9px] font-bold text-slate-400 mt-1`}>
                      {t('ticket.scanPrompt')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Status badge under QR */}
              {order.bookingStatus === 'CONFIRMED' ? (
                <View style={tw`flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full mt-3`}>
                  <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
                  <Text style={tw`text-[11px] font-black text-emerald-700`}>{t('ticket.statusValid')}</Text>
                </View>
              ) : order.bookingStatus === 'CANCELLED' ? (
                <View style={tw`flex-row items-center gap-1.5 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full mt-3`}>
                  <View style={tw`w-2 h-2 rounded-full bg-red-500`} />
                  <Text style={tw`text-[11px] font-black text-red-700`}>{t('ticket.statusCancelled')}</Text>
                </View>
              ) : (
                <View style={tw`flex-row items-center gap-1.5 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full mt-3`}>
                  <View style={tw`w-2 h-2 rounded-full bg-amber-500`} />
                  <Text style={tw`text-[11px] font-black text-amber-700`}>{t('ticket.statusPending')}</Text>
                </View>
              )}
            </View>

            {/* Ticket divider */}
            <View style={tw`flex-row items-center mx-5 my-1`}>
              <View style={[tw`w-5 h-5 rounded-full`, { backgroundColor: '#f1f5f9', marginLeft: -20 }]} />
              <View style={tw`flex-1 border-t border-dashed border-slate-200 mx-2`} />
              <View style={[tw`w-5 h-5 rounded-full`, { backgroundColor: '#f1f5f9', marginRight: -20 }]} />
            </View>

            {/* Trip Details card */}
            <View style={tw`mx-5 bg-slate-50 border border-slate-200/60 rounded-3xl p-4 mb-4 mt-2`}>
              {/* Route */}
              <View style={tw`flex-row items-center gap-2 mb-3.5`}>
                <Bus size={14} color="#EF5222" />
                <Text style={tw`text-[13px] font-black text-slate-800`}>
                  {order.from}
                </Text>
                <Text style={tw`text-slate-300`}>→</Text>
                <Text style={tw`text-[13px] font-black text-slate-800`}>
                  {order.to}
                </Text>
              </View>

              {/* Date & time */}
              <View style={tw`flex-row items-center gap-2 mb-2.5`}>
                <Clock size={13} color="#64748b" />
                <Text style={tw`text-[12px] font-bold text-slate-600`}>
                  {deptTime} - {deptDay}
                </Text>
              </View>

              {/* Pickup */}
              {order.outboundPickupPointSnapshot && (
                <View style={tw`flex-row items-center gap-2 mb-2.5`}>
                  <MapPin size={13} color="#64748b" />
                  <Text style={tw`text-[12px] font-bold text-slate-600 flex-1`} numberOfLines={2}>
                    {order.outboundPickupPointSnapshot}
                  </Text>
                </View>
              )}

              {/* Seat number */}
              <View style={tw`flex-row justify-between items-center pt-2.5 border-t border-slate-200/60 mt-1`}>
                <Text style={tw`text-[11px] font-bold text-slate-400 uppercase tracking-wider`}>{t('ticket.seats')}</Text>
                <Text style={tw`text-[15px] font-black text-[#EF5222]`}>{outboundSeats}</Text>
              </View>

              {/* Passenger */}
              <View style={tw`flex-row justify-between items-center pt-2.5 border-t border-slate-200/60 mt-2`}>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <User size={12} color="#64748b" />
                  <Text style={tw`text-[12px] font-bold text-slate-600`}>{order.customerName}</Text>
                </View>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <Phone size={12} color="#64748b" />
                  <Text style={tw`text-[12px] font-bold text-slate-500`}>
                    {(order.customerPhone || '').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={tw`flex-row justify-between items-center pt-2.5 border-t border-slate-200/60 mt-2`}>
                <Text style={tw`text-[11px] font-bold text-slate-400 uppercase tracking-wider`}>{t('ticket.total')}</Text>
                <Text style={tw`text-[16px] font-black text-slate-900`}>
                  {Number(order.amount || 0).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={tw`flex-row gap-3 px-5 pb-8`}>
              <TouchableOpacity
                onPress={handleShare}
                style={tw`flex-1 flex-row items-center justify-center gap-2 bg-slate-100 border border-slate-200 py-3.5 rounded-2xl`}
                activeOpacity={0.8}
              >
                <Share2 size={16} color="#475569" />
                <Text style={tw`text-[13px] font-black text-slate-700`}>{t('ticket.share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert(t('ticket.shareAlertTitle'), t('ticket.shareAlertDesc'))}
                style={[
                  tw`flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl`,
                  { backgroundColor: '#EF5222' },
                ]}
                activeOpacity={0.8}
              >
                <Download size={16} color="#ffffff" />
                <Text style={tw`text-[13px] font-black text-white`}>{t('ticket.save')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
