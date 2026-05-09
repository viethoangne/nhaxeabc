import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: {
    vi: {
        translation: {
          home: "Trang chủ",
          schedule: "Lịch trình",
          ticket_lookup: "Tra cứu vé",
          news: "Tin tức",
          purchase_history: "Lịch sử mua vé",
          contact: "Liên hệ",
          about: "Về chúng tôi",
          customer: "Khách hàng",
          login: "Đăng nhập",
          logout: "Đăng xuất",
        },
      },
      en: {
        translation: {
          home: "Home",
          schedule: "Schedule",
          ticket_lookup: "Ticket Lookup",
          news: "News",
          purchase_history: "Purchase History",
          contact: "Contact",
          about: "About Us",
          customer: "Customer",
          login: "Login",
          logout: "Logout",
        },
        
      },
  },
  lng: "vi",
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
  
});


export default i18n;