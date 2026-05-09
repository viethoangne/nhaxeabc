import i18next from 'i18next';
import Backend from 'i18next-fs-backend'; // Để load các file ngôn ngữ từ filesystem

i18next
  .use(Backend)
  .init({
    lng: 'vi', // Ngôn ngữ mặc định
    fallbackLng: 'vi',
    preload: ['vi', 'en'], // Các ngôn ngữ được hỗ trợ
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json', // Đường dẫn đến các file dịch
    },
  });

export default i18next;