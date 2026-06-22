import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Search,
  Calendar,
  Clock,
  User,
  BookOpen,
  Tag,
  Compass,
  Briefcase,
  Newspaper,
  Bell,
  X,
  ArrowRight,
  Sparkles,
  Share2,
  Bookmark,
  Eye,
  SlidersHorizontal,
} from 'lucide-react-native';
import tw from 'twrnc';
import { WEB_URL } from '@/constants/api';
import BouncyPressable from '@/components/ui/BouncyPressable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string[];
  category: 'khuyenmai' | 'thongbao' | 'huongdan' | 'camnang' | 'tuyendung';
  categoryLabel: string;
  date: string;
  author: string;
  readTime: string;
  image: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: "ABC Bus Line công bố Trợ lý AI đặt vé bằng giọng nói thông minh thế hệ mới",
    excerpt: "Nhà xe ABC Bus chính thức tích hợp trí tuệ nhân tạo AI vào hệ thống, cho phép khách hàng đặt vé và chọn ghế bằng khẩu lệnh tiếng Việt cực kỳ nhanh chóng.",
    content: [
      "Công nghệ đặt vé bằng giọng nói thông minh (AI Voice Booking) của ABC Bus Line đánh dấu một bước đột phá lớn trong ngành vận tải hành khách tại Việt Nam. Giờ đây, thay vì phải thao tác nhiều bước trên điện thoại, khách hàng chỉ cần nói tự nhiên yêu cầu của mình.",
      "Trợ lý AI sẽ tự động phân tích điểm đi, điểm đến, ngày khởi hành và gợi ý chuyến xe phù hợp nhất, đồng thời hỗ trợ chọn ghế trống theo mong muốn chỉ trong vòng 5 giây. Hệ thống nhận diện chuẩn xác giọng nói 3 miền Bắc - Trung - Nam.",
      "Đây là nỗ lực không ngừng của ABC Bus Line nhằm mang đến trải nghiệm di chuyển hiện đại, tiện lợi nhất, giúp cả những khách hàng lớn tuổi cũng có thể dễ dàng tiếp cận công nghệ đặt vé trực tuyến."
    ],
    category: 'thongbao',
    categoryLabel: "Thông báo",
    date: "18/05/2026",
    author: "Ban Công Nghệ ABC",
    readTime: "3 phút đọc",
    image: "/brand/AI1.png"
  },
  {
    id: 2,
    title: "Bí quyết du lịch Đà Lạt tự túc bằng xe Limousine giường nằm cao cấp",
    excerpt: "Chia sẻ cẩm nang chi tiết kinh nghiệm đặt xe cabin VIP đi Đà Lạt ngắm hoa dã quỳ, những điểm check-in không thể bỏ lỡ và mẹo đặt vé rẻ.",
    content: [
      "Đà Lạt luôn là điểm đến hấp dẫn du khách vào mọi mùa trong năm. Để hành trình dài hơn 300km từ TP. Hồ Chí Minh trở nên êm ái và thư giãn, xe Limousine giường nằm đôi cao cấp của ABC Bus Line là sự lựa chọn tối ưu.",
      "Xe trang bị giường cabin rộng rãi có chức năng massage, cổng sạc điện thoại, tai nghe riêng biệt và rèm che riêng tư. Bạn hoàn toàn có thể ngủ một giấc thật ngon và thức dậy đón bình minh lạnh giá của Đà Lạt.",
      "Thời điểm đẹp nhất để ngắm Đà Lạt là từ tháng 10 đến tháng 12 với mùa hoa dã quỳ rực rỡ và đồi cỏ hồng thơ mộng. Hãy lên kế hoạch đặt vé trước 1-2 tuần qua website ABC để chọn được những khoang giường tầng dưới có view kính rộng ngắm cảnh đồi thông cực chất."
    ],
    category: 'camnang',
    categoryLabel: "Cẩm nang",
    date: "15/05/2026",
    author: "Nguyễn Hoài Nam (Travel Blogger)",
    readTime: "4 phút đọc",
    image: "/brand/dalat.jpg"
  },
  {
    id: 3,
    title: "Ưu đãi siêu khủng: Giảm ngay 20% cho khách hàng đặt vé khứ hồi dịp hè",
    excerpt: "Nhằm tri ân khách hàng và đồng hành cùng mùa du lịch sôi động, ABC Bus Line tung chương trình ưu đãi lớn dành riêng cho vé khứ hồi trên mọi hành trình.",
    content: [
      "Mùa hè vẫy gọi với những bãi biển cát trắng nắng vàng tại Nha Trang, Phan Thiết, Vũng Tàu hay không khí trong lành tại Đà Lạt. Để tiếp thêm năng lượng cho chuyến đi của bạn, ABC Bus Line hân hạnh mang tới chương trình khuyến mại 'Vui Hè Rực Rỡ - Trọn Vẹn Hành Trình'.",
      "Cụ thể, tất cả các giao dịch mua vé khứ hồi (Outbound & Return) trực tiếp trên hệ thống website hoặc ứng dụng di động ABC Bus Line đều được giảm giá trực tiếp 20% trên tổng giá trị hóa đơn vé về.",
      "Chương trình áp dụng cho thời gian đặt vé và khởi hành từ ngày 01/06/2026 đến hết ngày 31/08/2026. Số lượng vé khuyến mãi có hạn mỗi ngày, hãy đặt ngay để tận hưởng mức giá tốt nhất cùng gia đình!"
    ],
    category: 'khuyenmai',
    categoryLabel: "Khuyến mãi",
    date: "12/05/2026",
    author: "Phòng Truyền Thông ABC",
    readTime: "2 phút đọc",
    image: "/brand/banner1.png"
  },
  {
    id: 4,
    title: "Thông báo lịch chạy tăng cường phục vụ dịp Lễ lớn cam kết không tăng giá vé",
    excerpt: "Để phục vụ nhu cầu di chuyển tăng cao của người dân, ABC Bus Line tăng cường hơn 100 chuyến xe mỗi ngày và cam kết bình ổn giá vé.",
    content: [
      "Nhằm đáp ứng tối đa nhu cầu đi lại, thăm quê và du lịch của hành khách trong dịp Lễ lớn sắp tới, ABC Bus Line đã chủ động lên kế hoạch tăng tần suất phục vụ trên toàn bộ các tuyến đường trọng điểm.",
      "Chúng tôi bổ sung thêm 120 chuyến xe Limousine VIP giường nằm mỗi ngày xuất phát từ các đầu bến Hà Nội, Đà Nẵng và TP. Hồ Chí Minh. Toàn bộ xe tăng cường đều được kiểm tra kỹ thuật nghiêm ngặt và vệ sinh sạch sẽ trước giờ khởi hành.",
      "Đặc biệt, ABC Bus Line long trọng cam kết thực hiện đúng triết lý 'Chất lượng là danh dự' - hoàn toàn bình ổn giá vé, tuyệt đối không phụ thu hay tăng giá vé dưới mọi hình thức, đảm bảo quyền lợi tốt nhất cho người tiêu dùng."
    ],
    category: 'thongbao',
    categoryLabel: "Thông báo",
    date: "08/05/2026",
    author: "Ban Điều Hành Bến Xe ABC",
    readTime: "2 phút đọc",
    image: "/brand/banner2.png"
  },
  {
    id: 5,
    title: "Hướng dẫn tích điểm đổi quà VIP Loyalty dành cho khách hàng thân thiết",
    excerpt: "Khám phá đặc quyền của chương trình Loyalty VIP, cách tích điểm tự động sau mỗi hành trình và hướng dẫn đổi voucher giảm giá cực dễ dàng.",
    content: [
      "Chương trình Khách hàng Thân thiết (Loyalty Program) của ABC Bus Line được thiết kế để mang lại những giá trị cộng thêm thiết thực nhất cho mỗi chuyến đi của hành khách.",
      "Sau khi hoàn thành mỗi hành trình, hệ thống sẽ tự động tích lũy điểm thưởng dựa trên giá trị vé của bạn (Ví dụ: mỗi 10,000đ chi tiêu tương đương với 1 điểm Loyalty). Khi tích lũy đạt các cột mốc quy định, bạn sẽ thăng hạng thành viên: Đồng, Bạc, Vàng và Kim Cương.",
      "Hành khách có thể sử dụng điểm tích lũy này để trực tiếp đổi lấy các voucher giảm giá 50k, 100k hoặc các phần quà lưu niệm cao cấp ngay trong ứng dụng của ABC Bus Line. Hãy đăng nhập tài khoản trước khi đặt vé để không bỏ lỡ điểm thưởng tích lũy nào nhé!"
    ],
    category: 'huongdan',
    categoryLabel: "Hướng dẫn",
    date: "05/05/2026",
    author: "Phòng CSKH ABC",
    readTime: "3 phút đọc",
    image: "/brand/banner3.png"
  },
  {
    id: 6,
    title: "Tuyển dụng Tài xế & Tiếp viên dịch vụ tiêu chuẩn hàng không - Thu nhập hấp dẫn",
    excerpt: "Mở rộng quy mô hoạt động, ABC Bus Line tìm kiếm những cộng sự chuyên nghiệp gia nhập đội ngũ tài xế và tiếp viên cabin VIP.",
    content: [
      "Với mục tiêu nâng tầm dịch vụ vận tải đường bộ đạt tiêu chuẩn hàng không 5 sao, ABC Bus Line đang mở rộng tuyển dụng nhiều vị trí nhân sự chất lượng cao trên phạm vi toàn quốc.",
      "Chúng tôi tìm kiếm các ứng viên cho vị trí Tài xế xe giường nằm (yêu cầu bằng lái hạng E, tối thiểu 3 năm kinh nghiệm chạy xe khách đường dài) và Tiếp viên chăm sóc cabin VIP (yêu cầu ngoại hình ưa nhìn, giao tiếp thân thiện, kỹ năng xử lý tình huống tốt).",
      "Gia nhập ABC Bus Line, bạn sẽ được làm việc trong môi trường chuyên nghiệp, lộ trình thăng tiến rõ ràng, đóng đầy đủ bảo hiểm cùng mức thu nhập vô cùng cạnh tranh trên thị trường (Lương cứng + thưởng năng suất chạy xe vượt trội)."
    ],
    category: 'tuyendung',
    categoryLabel: "Tuyển dụng",
    date: "01/05/2026",
    author: "Phòng Nhân Sự ABC",
    readTime: "3 phút đọc",
    image: "/brand/banner4.jpg"
  }
];

const FadeInView = (props: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 120,
        useNativeDriver: true,
      })
    ]).start();
  }, [props.trigger]);

  return (
    <Animated.View
      style={{
        ...props.style,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {props.children}
    </Animated.View>
  );
};

export default function NewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);

  const getCategoryIcon = (category: string, color: string, size = 13) => {
    switch (category) {
      case 'khuyenmai': return <Tag size={size} color={color} />;
      case 'thongbao': return <Bell size={size} color={color} />;
      case 'huongdan': return <BookOpen size={size} color={color} />;
      case 'camnang': return <Compass size={size} color={color} />;
      case 'tuyendung': return <Briefcase size={size} color={color} />;
      default: return <Newspaper size={size} color={color} />;
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả', icon: (color: string) => getCategoryIcon('all', color) },
    { id: 'khuyenmai', label: 'Khuyến mãi', icon: (color: string) => getCategoryIcon('khuyenmai', color) },
    { id: 'thongbao', label: 'Thông báo', icon: (color: string) => getCategoryIcon('thongbao', color) },
    { id: 'huongdan', label: 'Hướng dẫn', icon: (color: string) => getCategoryIcon('huongdan', color) },
    { id: 'camnang', label: 'Cẩm nang', icon: (color: string) => getCategoryIcon('camnang', color) },
    { id: 'tuyendung', label: 'Tuyển dụng', icon: (color: string) => getCategoryIcon('tuyendung', color) }
  ];

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'khuyenmai':
        return {
          text: 'text-rose-600',
          bg: 'bg-rose-50',
          border: 'border-rose-100',
          gradient: ['#ffe4e6', '#fecdd3'] as const,
          badgeText: 'text-rose-600',
          badgeBg: 'bg-rose-500/12',
          iconColor: '#f43f5e'
        };
      case 'thongbao':
        return {
          text: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-100',
          gradient: ['#ffedd5', '#fed7aa'] as const,
          badgeText: 'text-orange-600',
          badgeBg: 'bg-orange-500/12',
          iconColor: '#f97316'
        };
      case 'huongdan':
        return {
          text: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          gradient: ['#dbeafe', '#bfdbfe'] as const,
          badgeText: 'text-blue-600',
          badgeBg: 'bg-blue-500/12',
          iconColor: '#3b82f6'
        };
      case 'camnang':
        return {
          text: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-100',
          gradient: ['#d1fae5', '#a7f3d0'] as const,
          badgeText: 'text-emerald-600',
          badgeBg: 'bg-emerald-500/12',
          iconColor: '#10b981'
        };
      case 'tuyendung':
        return {
          text: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-100',
          gradient: ['#f3e8ff', '#e9d5ff'] as const,
          badgeText: 'text-purple-600',
          badgeBg: 'bg-purple-500/12',
          iconColor: '#a855f7'
        };
      default:
        return {
          text: 'text-slate-600',
          bg: 'bg-slate-50',
          border: 'border-slate-100',
          gradient: ['#f1f5f9', '#e2e8f0'] as const,
          badgeText: 'text-slate-600',
          badgeBg: 'bg-slate-500/12',
          iconColor: '#64748b'
        };
    }
  };

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return ARTICLES.length;
    return ARTICLES.filter(a => a.category === catId).length;
  };

  const normalizeText = (text: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .trim();
  };

  const filteredArticles = ARTICLES.filter(art => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const normSearch = normalizeText(searchQuery);
    const matchesSearch = 
      normalizeText(art.title).includes(normSearch) || 
      normalizeText(art.excerpt).includes(normSearch);
    return matchesCategory && matchesSearch;
  });

  const handleImageError = (id: number) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <View style={tw`flex-1 bg-[#F8FAFC]`}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ===== PREMIUM HEADER ===== */}
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
          }
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
              }
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Sparkles size={11} color="#FFE4E6" />
              <Text style={tw`text-white/85 text-[10px] font-black uppercase tracking-widest`}>
                Tin Tức & Sự Kiện ABC
              </Text>
            </View>
            <Text style={tw`text-white text-[20px] font-black tracking-wide mt-0.5`}>
              Khám Phá Hành Trình
            </Text>
          </View>
        </View>

        {/* Search Bar & Filter Toggle - Side by side */}
        <View style={tw`flex-row items-center gap-2.5 mt-5`}>
          {/* Search Input Box */}
          <View style={[tw`flex-1 flex-row items-center bg-white px-4 py-3 rounded-2xl shadow-lg shadow-black/8`]}>
            <Search size={16} color="#EF5222" style={tw`mr-2.5`} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm ưu đãi, cẩm nang, thông báo..."
              style={tw`flex-1 text-[13px] font-bold text-slate-800 p-0`}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={tw`p-1 mr-1`}>
                <X size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Toggle Button */}
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsFilterVisible(prev => !prev);
            }}
            activeOpacity={0.8}
            style={[
              tw`w-[42px] h-[42px] rounded-2xl items-center justify-center relative shadow-lg shadow-black/8`,
              isFilterVisible
                ? { backgroundColor: '#EF5222', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }
                : { backgroundColor: '#ffffff' }
            ]}
          >
            <SlidersHorizontal
              size={16}
              color={isFilterVisible ? '#ffffff' : '#EF5222'}
            />
            {/* Active filter notification dot */}
            {activeCategory !== 'all' && (
              <View style={tw`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white`} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ===== VIP MOBILE FILTERS ===== */}
      {isFilterVisible && (
        <View style={tw`pt-4 pb-2`}>
          <View style={tw`flex-row flex-wrap gap-2 px-4`}>
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              const count = getCategoryCount(cat.id);
              
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  activeOpacity={0.85}
                  style={[
                    tw`px-3 py-1.5 rounded-full`,
                    active
                      ? {
                          backgroundColor: '#EF5222',
                          shadowColor: '#EF5222',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.25,
                          shadowRadius: 5,
                          elevation: 3,
                        }
                      : tw`bg-slate-100`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[11px] font-extrabold`,
                      active ? tw`text-white` : tw`text-slate-600`,
                    ]}
                  >
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ===== LIST OF ARTICLES ===== */}
      {filteredArticles.length > 0 ? (
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-16`}>
          <FadeInView trigger={activeCategory + searchQuery}>
            {filteredArticles.map((item) => {
              const styles = getCategoryStyles(item.category);
              const isImageErr = imageErrors[item.id];
              const displayUrl = `${WEB_URL}${item.image}`;

              return (
                <BouncyPressable
                  key={item.id}
                  onPress={() => setSelectedArticle(item)}
                  scaleTo={0.96}
                  style={[
                    tw`bg-white border border-slate-100 rounded-[28px] mb-5 shadow-sm overflow-hidden`,
                    {
                      elevation: 3,
                      shadowColor: '#64748b',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 10,
                    }
                  ]}
                >
                  {/* Article Card Cover Image */}
                  <View style={tw`relative h-48 w-full bg-slate-100`}>
                    {!isImageErr ? (
                      <Image
                        source={{ uri: displayUrl }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      // Fallback Gradient Banner if Image fails to resolve
                      <LinearGradient
                        colors={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={tw`w-full h-full justify-center items-center`}
                      >
                        {categories.find(c => c.id === item.category)?.icon(styles.iconColor)}
                        <Text style={[tw`text-[11px] font-black mt-2`, { color: styles.iconColor }]}>
                          ABC BUS LINES
                        </Text>
                      </LinearGradient>
                    )}

                    {/* Gradient Overlay for Title readability */}
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
                      style={StyleSheet.absoluteFillObject}
                    />

                    {/* Translucent Premium Badge */}
                    <View
                      style={[
                        tw`absolute top-4.5 left-4.5 flex-row items-center gap-1.5 px-3 py-1.5 bg-white/95 rounded-xl border border-white/40 shadow-sm`,
                      ]}
                    >
                      <Sparkles size={11} color="#EF5222" />
                      <Text style={tw`text-[9px] font-black text-slate-800 uppercase tracking-widest`}>
                        {item.categoryLabel}
                      </Text>
                    </View>

                    {/* Read Time Overlay */}
                    <View style={tw`absolute bottom-4 right-4 bg-black/45 px-2.5 py-1 rounded-lg flex-row items-center gap-1`}>
                      <Clock size={9} color="#FFE4E6" />
                      <Text style={tw`text-[9px] font-black text-white`}>
                        {item.readTime}
                      </Text>
                    </View>
                  </View>

                  {/* Body Contents */}
                  <View style={tw`p-5`}>
                    {/* Date and Author Profile row */}
                    <View style={tw`flex-row items-center justify-between mb-3`}>
                      <View style={tw`flex-row items-center gap-1.5`}>
                        <Calendar size={11.5} color="#94a3b8" />
                        <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-wide`}>
                          {item.date}
                        </Text>
                      </View>
                      <View style={tw`flex-row items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md`}>
                        <User size={10} color="#64748b" />
                        <Text style={tw`text-[9.5px] font-black text-slate-500`}>
                          {item.author}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={tw`text-[15px] font-black text-slate-900 leading-snug mb-2`} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {/* Excerpt */}
                    <Text style={tw`text-[12px] text-slate-500 leading-relaxed mb-4`} numberOfLines={2}>
                      {item.excerpt}
                    </Text>

                    {/* Action button */}
                    <View style={tw`pt-3.5 border-t border-slate-100 flex-row items-center justify-between`}>
                      <Text style={tw`text-[10.5px] font-black text-slate-400 uppercase tracking-wider`}>
                        Đọc đầy đủ bài viết
                      </Text>
                      <View style={tw`flex-row items-center gap-1.5 bg-orange-50 px-3.5 py-1.5 rounded-xl`}>
                        <Text style={tw`text-[10px] font-black text-[#EF5222] uppercase tracking-wider`}>
                          Đọc ngay
                        </Text>
                        <ArrowRight size={10} color="#EF5222" strokeWidth={3} />
                      </View>
                    </View>
                  </View>
                </BouncyPressable>
              );
            })}
          </FadeInView>
        </ScrollView>
      ) : (
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <BookOpen size={54} color="#CBD5E1" style={tw`mb-4.5`} />
          <Text style={tw`text-slate-500 font-black text-[14px] text-center`}>
            Không tìm thấy bài viết nào phù hợp
          </Text>
          <Text style={tw`text-[11.5px] text-slate-400 mt-2 text-center leading-5`}>
            Vui lòng thử tìm kiếm bằng từ khóa hoặc chọn danh mục lọc khác.
          </Text>
        </View>
      )}

      {/* ===== IMMERSIVE ARTICLE READER MODAL ===== */}
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedArticle(null)}
      >
        <SafeAreaView style={tw`flex-1 bg-white`}>
          {/* Header Bar */}
          <View style={tw`px-4 py-3.5 border-b border-slate-100 flex-row items-center justify-between bg-white shadow-sm z-30`}>
            <TouchableOpacity
              onPress={() => setSelectedArticle(null)}
              style={tw`w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 justify-center items-center`}
            >
              <ChevronLeft size={20} color="#1E293B" strokeWidth={3} />
            </TouchableOpacity>

            <View style={tw`items-center`}>
              <View style={[tw`px-2.5 py-0.5 rounded-md border mb-0.5`, tw`${getCategoryStyles(selectedArticle?.category || 'all').badgeBg}`]}>
                <Text style={[tw`text-[8.5px] font-black uppercase tracking-wider`, { color: getCategoryStyles(selectedArticle?.category || 'all').iconColor }]}>
                  {selectedArticle?.categoryLabel}
                </Text>
              </View>
              <Text style={tw`text-[9.5px] font-black text-slate-400 uppercase tracking-widest`}>CHI TIẾT BÀI BÁO</Text>
            </View>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 justify-center items-center`}
              >
                <Share2 size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedArticle && (
            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-16`}>
              {/* Cover Image */}
              <View style={tw`relative h-64 w-full bg-slate-100`}>
                {!imageErrors[selectedArticle.id] ? (
                  <Image
                    source={{ uri: `${WEB_URL}${selectedArticle.image}` }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                    onError={() => handleImageError(selectedArticle.id)}
                  />
                ) : (
                  <LinearGradient
                    colors={getCategoryStyles(selectedArticle.category).gradient}
                    style={tw`w-full h-full justify-center items-center`}
                  >
                    {getCategoryIcon(selectedArticle.category, '#ffffff', 32)}
                  </LinearGradient>
                )}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* Overlaid Details */}
                <View style={tw`absolute bottom-5 left-5 right-5`}>
                  <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
                    <Sparkles size={11} color="#EF5222" />
                    <Text style={tw`text-white/90 text-[10px] font-black uppercase tracking-widest`}>
                      {selectedArticle.categoryLabel}
                    </Text>
                  </View>
                  <Text style={tw`text-white text-[19px] font-black leading-snug`}>
                    {selectedArticle.title}
                  </Text>
                </View>
              </View>

              {/* Meta Stats Panel */}
              <View style={tw`mx-4 mt-5 bg-slate-50 border border-slate-100 p-4.5 rounded-[22px] flex-row justify-around`}>
                <View style={tw`items-center`}>
                  <User size={13} color="#EF5222" />
                  <Text style={tw`text-[9px] font-black text-slate-400 uppercase mt-1`}>TÁC GIẢ</Text>
                  <Text style={tw`text-[11px] font-black text-slate-700 mt-0.5`}>{selectedArticle.author}</Text>
                </View>
                <View style={tw`w-[1px] h-9 bg-slate-200`} />
                <View style={tw`items-center`}>
                  <Calendar size={13} color="#EF5222" />
                  <Text style={tw`text-[9px] font-black text-slate-400 uppercase mt-1`}>NGÀY ĐĂNG</Text>
                  <Text style={tw`text-[11px] font-black text-slate-700 mt-0.5`}>{selectedArticle.date}</Text>
                </View>
                <View style={tw`w-[1px] h-9 bg-slate-200`} />
                <View style={tw`items-center`}>
                  <Clock size={13} color="#EF5222" />
                  <Text style={tw`text-[9px] font-black text-slate-400 uppercase mt-1`}>ĐỌC TIN</Text>
                  <Text style={tw`text-[11px] font-black text-slate-700 mt-0.5`}>{selectedArticle.readTime}</Text>
                </View>
              </View>

              {/* Main Content Paragraphs */}
              <View style={tw`p-5 gap-4.5`}>
                {selectedArticle.content.map((para, index) => (
                  <View key={index} style={tw`flex-row gap-3`}>
                    {index === 0 ? (
                      // Drop-cap visual for first paragraph
                      <View style={[tw`w-9 h-9 rounded-xl items-center justify-center bg-orange-100`]}>
                        <Text style={tw`text-[#EF5222] font-black text-[16px]`}>
                          {para.charAt(0)}
                        </Text>
                      </View>
                    ) : (
                      <View style={tw`w-1 h-3 rounded bg-orange-200 mt-2`} />
                    )}
                    <Text style={tw`flex-1 text-[13px] text-slate-750 leading-relaxed font-bold`}>
                      {index === 0 ? para.substring(1) : para}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Branded Footer Badge */}
              <View style={tw`mt-8 pt-6 border-t border-slate-100 items-center px-6`}>
                <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                  <Sparkles size={11} color="#94a3b8" />
                  <Text style={tw`text-[9.5px] font-black text-slate-400 uppercase tracking-widest`}>
                    BẢN QUYỀN THUỘC VỀ ABC BUS LINES
                  </Text>
                </View>
                <Text style={tw`text-[8.5px] font-black text-slate-400 text-center leading-4`}>
                  Hệ thống đặt vé xe khách thông minh hàng đầu Việt Nam
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
