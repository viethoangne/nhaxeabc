import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import tw from 'twrnc';
import { apiClient } from '@/constants/api';
import BouncyPressable from '@/components/ui/BouncyPressable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState({
    phone: false,
    email: false,
  });

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Validate Vietnamese Phone number format
  const validatePhone = (phone: string) => {
    const vnf_regex = /^(03|05|07|08|09|01[2|6|8|9])([0-9]{8})$/;
    return vnf_regex.test(phone);
  };

  // Validate email format
  const validateEmail = (email: string) => {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email_regex.test(email);
  };

  const handleTextChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'phone') {
      setErrors((prev) => ({ ...prev, phone: value.length > 0 && !validatePhone(value) }));
    }
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: value.length > 0 && !validateEmail(value) }));
    }
  };

  const handleDialCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  const handleOpenEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}?subject=Liên hệ từ Mobile App ABC`);
  };

  const handleSubmit = async () => {
    setStatusMsg(null);

    // Final checks
    const isPhoneValid = validatePhone(formData.phone);
    const isEmailValid = validateEmail(formData.email);

    if (!isPhoneValid || !isEmailValid || !formData.name.trim() || !formData.message.trim()) {
      setErrors({
        phone: !isPhoneValid,
        email: !isEmailValid,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStatusMsg({ type: 'error', text: 'Vui lòng kiểm tra và điền đầy đủ thông tin hợp lệ!' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/contact', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });

      if (response.status === 200 || response.status === 201) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSubmitted(true);
        setFormData({ name: '', phone: '', email: '', message: '' });
      } else {
        setStatusMsg({ type: 'error', text: 'Máy chủ phản hồi lỗi. Vui lòng thử lại sau!' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Không kết nối được đến máy chủ. Vui lòng kiểm tra mạng!' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-[#F8FAFC]`}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ===== SEAMLESS MODERN HEADER ===== */}
      <LinearGradient
        colors={['#EF5222', '#F97316', '#FDBA74']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          tw`px-4 pb-7 rounded-b-[32px]`,
          {
            paddingTop: insets.top + 16,
            shadowColor: '#EF5222',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 15,
            elevation: 8,
          },
        ]}
      >
        <View style={tw`flex-row items-center gap-3.5`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              tw`w-10 h-10 rounded-2xl justify-center items-center`,
              {
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
              },
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Sparkles size={11} color="#FFE4E6" />
              <Text style={tw`text-white/85 text-[10px] font-black uppercase tracking-widest`}>
                Liên Hệ Ban CSKH ABC
              </Text>
            </View>
            <Text style={tw`text-white text-[20px] font-black tracking-wide mt-0.5`}>
              Kết Nối & Góp Ý
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-4 pb-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* Tagline Card */}
        <View style={tw`bg-orange-50 border border-orange-100 rounded-3xl p-4.5 mb-5 flex-row items-center gap-3.5`}>
          <View style={tw`w-10 h-10 rounded-full bg-orange-100 items-center justify-center`}>
            <Sparkles size={20} color="#EF5222" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[10px] font-black text-[#EF5222] uppercase tracking-wider`}>
              Cam Kết Dịch Vụ
            </Text>
            <Text style={tw`text-[13.5px] font-bold text-slate-700 mt-0.5`}>
              Hành trình vạn dặm - Phục vụ tận tâm
            </Text>
          </View>
        </View>

        {/* Form Gửi Tin nhắn */}
        <View style={tw`flex-row items-center justify-between ml-1 mb-3`}>
          <Text style={tw`text-[12.5px] font-black text-slate-500 uppercase tracking-widest`}>
            Gửi Tin Nhắn Phản Hồi
          </Text>
        </View>

        {/* Form Container */}
        <View style={tw`bg-white border border-slate-200/50 rounded-3xl p-5 shadow-md shadow-slate-100 mb-6`}>
          {statusMsg && (
            <View
              style={[
                tw`mb-4 p-3 rounded-xl flex-row items-center gap-2`,
                statusMsg.type === 'error' ? tw`bg-red-50` : tw`bg-green-50`,
              ]}
            >
              <AlertTriangle size={15} color={statusMsg.type === 'error' ? '#EF4444' : '#10B981'} />
              <Text
                style={[
                  tw`text-xs font-bold flex-1`,
                  statusMsg.type === 'error' ? tw`text-red-650` : tw`text-green-650`,
                ]}
              >
                {statusMsg.text}
              </Text>
            </View>
          )}

          {submitted ? (
            <View style={tw`items-center justify-center py-8 text-center`}>
              <View style={tw`w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4`}>
                <CheckCircle2 size={36} color="#10B981" />
              </View>
              <Text style={tw`text-[18px] font-black text-slate-800`}>Gửi thành công!</Text>
              <Text style={tw`text-xs text-slate-400 font-bold text-center leading-5 mt-2 px-2`}>
                Yêu cầu của bạn đã được lưu vào hệ thống của nhà xe ABC. Chúng tôi sẽ liên hệ lại sớm nhất có thể.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSubmitted(false);
                }}
                style={tw`mt-6 border border-[#EF5222] px-5 py-2.5 rounded-full`}
              >
                <Text style={tw`text-xs font-black text-[#EF5222] uppercase tracking-wider`}>
                  Gửi thêm tin nhắn
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`gap-4.5`}>
              {/* Họ tên */}
              <View style={tw`gap-1.5`}>
                <Text style={tw`text-[10px] font-black text-slate-400 uppercase ml-1`}>
                  Họ tên của bạn
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(val) => handleTextChange('name', val)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  placeholderTextColor="#94a3b8"
                  style={tw`w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-[13.5px] font-bold text-slate-800`}
                />
              </View>

              {/* Số điện thoại */}
              <View style={tw`gap-1.5`}>
                <Text style={tw`text-[10px] font-black text-slate-400 uppercase ml-1`}>
                  Số điện thoại
                </Text>
                <TextInput
                  value={formData.phone}
                  onChangeText={(val) => handleTextChange('phone', val)}
                  placeholder="Ví dụ: 0912345678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  style={[
                    tw`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-[13.5px] font-bold text-slate-800`,
                    errors.phone ? tw`border-red-400 bg-red-50/20` : tw`border-slate-200/60`,
                  ]}
                />
                {errors.phone && (
                  <Text style={tw`text-[9.5px] font-black text-red-500 ml-1`}>
                    Số điện thoại không hợp lệ!
                  </Text>
                )}
              </View>

              {/* Email */}
              <View style={tw`gap-1.5`}>
                <Text style={tw`text-[10px] font-black text-slate-400 uppercase ml-1`}>
                  Địa chỉ Email
                </Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(val) => handleTextChange('email', val)}
                  placeholder="Ví dụ: nguyenVana@gmail.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    tw`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-[13.5px] font-bold text-slate-800`,
                    errors.email ? tw`border-red-400 bg-red-50/20` : tw`border-slate-200/60`,
                  ]}
                />
                {errors.email && (
                  <Text style={tw`text-[9.5px] font-black text-red-500 ml-1`}>
                    Email sai định dạng!
                  </Text>
                )}
              </View>

              {/* Nội dung tin nhắn */}
              <View style={tw`gap-1.5`}>
                <Text style={tw`text-[10px] font-black text-slate-400 uppercase ml-1`}>
                  Nội dung đóng góp, phản hồi
                </Text>
                <TextInput
                  value={formData.message}
                  onChangeText={(val) => handleTextChange('message', val)}
                  placeholder="Nhập nội dung bác cần gửi phản hồi cho ABC..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={tw`w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-[13.5px] font-bold text-slate-800 min-h-[90px]`}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || errors.phone || errors.email}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EF5222', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    tw`rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-md`,
                    (isSubmitting || errors.phone || errors.email) && tw`opacity-50`,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Send size={15} color="#ffffff" strokeWidth={3} />
                      <Text style={tw`text-[13px] font-black text-white uppercase tracking-wider`}>
                        Gửi yêu cầu ngay
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Thông tin Trụ sở, Điện thoại khác */}
        <Text style={tw`text-[12.5px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3`}>
          Thông Tin Liên Hệ Khác
        </Text>

        {/* Card: Trụ sở */}
        <View style={tw`bg-white border border-slate-100 rounded-3xl p-5 mb-3 shadow-sm flex-row items-center gap-4`}>
          <View style={tw`w-11 h-11 rounded-2xl bg-teal-50 items-center justify-center`}>
            <MapPin size={22} color="#0D9488" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[11px] font-black text-slate-400 uppercase tracking-wider`}>
              Trụ sở chính
            </Text>
            <Text style={tw`text-[13.5px] font-extrabold text-slate-800 mt-0.5 leading-5`}>
              123 Đường Nguyễn Huệ, Quận 1, TP. HCM
            </Text>
          </View>
        </View>

        {/* Card: Hotline */}
        <BouncyPressable
          onPress={() => handleDialCall('1900 123 456')}
          style={tw`bg-white border border-slate-100 rounded-3xl p-5 mb-3 shadow-sm flex-row items-center gap-4`}
        >
          <View style={tw`w-11 h-11 rounded-2xl bg-orange-50 items-center justify-center`}>
            <Phone size={22} color="#EF5222" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[11px] font-black text-[#EF5222] uppercase tracking-wider`}>
              Tổng đài 24/7 (Bấm để gọi)
            </Text>
            <Text style={tw`text-[17px] font-black text-slate-800 mt-0.5`}>
              1900 123 456
            </Text>
          </View>
        </BouncyPressable>

        {/* Card: Email */}
        <BouncyPressable
          onPress={() => handleOpenEmail('support@nhaxeabc.vn')}
          style={tw`bg-white border border-slate-100 rounded-3xl p-5 mb-5 shadow-sm flex-row items-center gap-4`}
        >
          <View style={tw`w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center`}>
            <Mail size={22} color="#2563EB" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[11px] font-black text-slate-400 uppercase tracking-wider`}>
              Email phản hồi (Bấm để gửi)
            </Text>
            <Text style={tw`text-[14px] font-extrabold text-slate-800 mt-0.5 underline decoration-slate-300`}>
              support@nhaxeabc.vn
            </Text>
          </View>
        </BouncyPressable>
      </ScrollView>
    </View>
  );
}
