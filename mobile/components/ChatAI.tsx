import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Send, X, Sparkles, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '@/constants/api';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/hooks/useChatStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTranslation } from '@/hooks/useTranslation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAI() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { isOpen, setIsOpen, initialQuery, setInitialQuery } = useChatStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setCancelLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const flatListRef = useRef<FlatList>(null);

  const defaultWelcome = t('chatAI.defaultWelcome');

  const suggestions = [
    { label: t('chatAI.sug1Label'), query: t('chatAI.sug1Query') },
    { label: t('chatAI.sug2Label'), query: t('chatAI.sug2Query') },
    { label: t('chatAI.sug3Label'), query: t('chatAI.sug3Query') },
    { label: t('chatAI.sug4Label'), query: t('chatAI.sug4Query') },
    { label: t('chatAI.sug5Label'), query: t('chatAI.sug5Query') },
    { label: t('chatAI.sug6Label'), query: t('chatAI.sug6Query') },
  ];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: defaultWelcome }]);
    }
  }, []);

  // Khi ngôn ngữ thay đổi, cập nhật lại welcome message đầu tiên
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: t('chatAI.defaultWelcome') }];
      }
      return prev;
    });
  }, [locale]);

  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSend(initialQuery);
      setInitialQuery('');
    }
  }, [isOpen, initialQuery]);

  const handleSend = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    const userMsg: Message = { role: 'user', content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setCancelLoading(true);

    // Tự động cuộn xuống cuối
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await apiClient.post('/chat', {
        message: query,
        history: messages.slice(-10),
        userId: user?.id || null,
        locale: locale, // Truyền ngôn ngữ hiện tại cho AI
      });

      if (response.data?.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: t('chatAI.networkError') }]);
      }
    } catch (error) {
      console.error('Lỗi gửi chat AI:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chatAI.networkError') },
      ]);
    } finally {
      setCancelLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageContent = (content: string) => {
    // Parser cho cả markdown in đậm (**text**) và đường liên kết ([label](url))
    const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    const parts = content.split(regex);
    return (
      <Text style={tw`text-[13px] text-[#334155] leading-4.5 font-medium`}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={i} style={tw`font-extrabold text-[#0f172a]`}>
                {part.slice(2, -2)}
              </Text>
            );
          } else if (part.startsWith('[') && part.endsWith(')')) {
            const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              const label = match[1];
              const url = match[2];
              const handleLinkPress = () => {
                setIsOpen(false);
                let path = url;
                if (path.includes('chart?') || path.includes('chair?') || path.includes('/chart?') || path.includes('/chair?')) {
                  const queryString = path.substring(path.indexOf('?'));
                  path = '/booking/select-seats' + queryString;
                }
                router.push(path as any);
              };
              return (
                <Text
                  key={i}
                  style={tw`font-extrabold text-[#EF5222] underline`}
                  onPress={handleLinkPress}
                >
                  {label}
                </Text>
              );
            }
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <>
      {/* Floating Button FAB */}
      <TouchableOpacity
        style={[tw`absolute right-5 bottom-[96px] w-[58px] h-[58px] rounded-full bg-[#EF5222] justify-center items-center z-50 elevation-8`, { shadowColor: '#EF5222', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <View style={tw`relative w-[26px] h-[26px] justify-center items-center`}>
          <Bot color="#ffffff" size={26} strokeWidth={2} />
          <View style={tw`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10b981] border border-[#EF5222]`} />
        </View>
      </TouchableOpacity>

      {/* Chat Window Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={tw`flex-1`}
          >

            {/* Header */}
            <LinearGradient
              colors={['#EF5222', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`flex-row items-center justify-between px-4.5 py-4 shadow-sm`}
            >
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-10 h-10 rounded-2xl bg-white/20 border border-white/30 justify-center items-center`}>
                  <Bot color="#ffffff" size={22} strokeWidth={2.5} />
                </View>
                <View style={tw`ml-3`}>
                  <Text style={tw`text-[14.5px] font-black text-white uppercase tracking-wider`}>
                    {t('chatAI.assistantTitle')}
                  </Text>
                  <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                    <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400`} />
                    <Text style={tw`text-[10px] text-white/80 font-bold`}>
                      {user ? t('chatAI.statusSynced').replace('🟢 ', '') + `: ${user.name}` : t('chatAI.statusGuest')}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={tw`flex-row items-center gap-2`}>
                <TouchableOpacity
                  onPress={() => setMessages([{ role: 'assistant', content: t('chatAI.defaultWelcome') }])}
                  style={tw`w-9 h-9 rounded-xl bg-white/20 items-center justify-center`}
                  activeOpacity={0.7}
                >
                  <Trash2 color="#ffffff" size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  style={tw`w-9 h-9 rounded-xl bg-white/20 items-center justify-center`}
                  activeOpacity={0.7}
                >
                  <X color="#ffffff" size={18} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Message List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={tw`p-4.5 pb-6`}
              renderItem={({ item }) => (
                <View
                  style={[
                    tw`flex-row mb-3.5 max-w-[80%]`,
                    item.role === 'user' ? tw`self-end justify-end ml-auto` : tw`self-start justify-start mr-auto`,
                  ]}
                >
                  {item.role === 'assistant' && (
                    <View style={tw`w-9 h-9 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center mr-2.5 self-end shadow-sm`}>
                      <Bot color="#EF5222" size={18} strokeWidth={2.5} />
                    </View>
                  )}
                  {item.role === 'user' ? (
                    <LinearGradient
                      colors={['#EF5222', '#F97316']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        tw`px-3.5 py-2.5 rounded-[18px] rounded-br-sm`,
                        {
                          elevation: 2,
                          shadowColor: '#EF5222',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.15,
                          shadowRadius: 5,
                        }
                      ]}
                    >
                      <Text style={tw`text-[13px] text-white font-semibold leading-4.5`}>{item.content}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        tw`px-3.5 py-2.5 rounded-[18px] bg-white border border-[#f1f5f9] rounded-bl-sm`,
                        {
                          elevation: 2,
                          shadowColor: '#64748b',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.04,
                          shadowRadius: 4,
                        }
                      ]}
                    >
                      {renderMessageContent(item.content)}
                    </View>
                  )}
                </View>
              )}
              ListFooterComponent={
                isLoading ? (
                  <View style={tw`flex-row self-start mb-4.5`}>
                    <View style={tw`w-9 h-9 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center mr-2.5 self-end shadow-sm`}>
                      <Bot color="#EF5222" size={18} strokeWidth={2.5} />
                    </View>
                    <View style={[
                      tw`px-4 py-2.5 rounded-[22px] bg-white border border-[#f1f5f9] rounded-bl-sm justify-center`,
                      {
                        height: 42,
                        elevation: 2,
                        shadowColor: '#64748b',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                      }
                    ]}>
                      <ActivityIndicator size="small" color="#EF5222" />
                    </View>
                  </View>
                ) : null
              }
            />

            {/* Quick Suggestions Panel */}
            <View style={tw`bg-white border-t border-[#f1f5f9] py-2`}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4`}
              >
                {suggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSend(s.query)}
                    style={[
                      tw`flex-row items-center bg-white border border-slate-200/80 rounded-2xl px-3 py-1.5 mr-2 shadow-sm`,
                      {
                        elevation: 1,
                        shadowColor: '#64748b',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 2,
                      }
                    ]}
                  >
                    <Sparkles size={11} color="#EF5222" style={tw`mr-1.5`} />
                    <Text style={tw`text-[11px] font-bold text-[#475569]`}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Bar */}
            <View style={tw`flex-row items-center p-2.5 bg-white border-t border-[#f1f5f9]`}>
              <View style={tw`flex-1 flex-row items-center bg-[#f1f5f9] rounded-2xl px-3.5 py-0.5 border border-slate-100`}>
                <TextInput
                  style={tw`flex-1 h-9 text-[13px] text-[#334155] font-semibold p-0`}
                  placeholder={t('chatAI.inputPlaceholder')}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => handleSend(input)}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <TouchableOpacity
                onPress={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                style={[
                  tw`w-11 h-11 rounded-2xl justify-center items-center ml-3 shadow-md`,
                  input.trim() && !isLoading
                    ? [tw`bg-[#EF5222]`, { shadowColor: '#EF5222', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 }]
                    : tw`bg-slate-300`,
                ]}
              >
                <Send color="#ffffff" size={16} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
