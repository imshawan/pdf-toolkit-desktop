import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const resources = {
  en: {
    translation: {
      "app": {
        "title": "PDF Tools",
        "description": "Local Processing PDF Utilities"
      },
      "sidebar": {
        "dashboard": "Dashboard",
        "settings": "Settings",
        "about": "About"
      },
      "settings": {
        "title": "Settings",
        "appearance": "Appearance",
        "theme": "Theme",
        "system": "System",
        "light": "Light",
        "dark": "Dark",
        "language": "Language",
        "languageSelect": "Language"
      },
      "about": {
        "title": "About PDF Tools",
        "version": "Version 1.0.0",
        "desc": "A fast, privacy-first PDF utility app."
      },
      "dashboard": {
        "overview": "Overview",
        "subtitle": "Select a tool below to process your PDF files locally.",
        "startProcessing": "Start Processing"
      },
      "tools": {
        "merge": "Merge PDF",
        "mergeDesc": "Combine multiple PDFs into one document",
        "split": "Split PDF",
        "splitDesc": "Extract pages or split files into multiple documents",
        "rotate": "Rotate PDF",
        "rotateDesc": "Fix page orientations easily with one click",
        "img2pdf": "JPG to PDF",
        "img2pdfDesc": "Convert images (JPG, PNG) to PDF format",
        "xls2pdf": "Excel to PDF",
        "xls2pdfDesc": "Convert Excel spreadsheets to PDF documents",
        "rearrange": "Rearrange Pages",
        "rearrangeDesc": "Reorder, delete, or organize pages visually"
      },
      "common": {
        "addFile": "Add File",
        "clearAll": "Clear All",
        "processDownload": "Process & Download",
        "processing": "Processing...",
        "cancel": "Cancel",
        "delete": "Delete",
        "dragDropFile": "Drag & Drop file here"
      }
    }
  },
  hi: {
    translation: {
      "app": {
        "title": "पीडीएफ टूल्स",
        "description": "स्थानीय पीडीएफ उपयोगिताएँ"
      },
      "sidebar": {
        "dashboard": "डैशबोर्ड",
        "settings": "सेटिंग्स",
        "about": "परिचय"
      },
      "settings": {
        "title": "सेटिंग्स",
        "appearance": "दिखावट",
        "theme": "थीम",
        "system": "सिस्टम",
        "light": "हल्का",
        "dark": "गहरा",
        "language": "भाषा",
        "languageSelect": "भाषा"
      },
      "about": {
        "title": "PDF Tools के बारे में",
        "version": "संस्करण 1.0.0",
        "desc": "एक तेज़, गोपनीयता-प्रथम पीडीएफ उपयोगिता ऐप।"
      },
      "dashboard": {
        "overview": "सिंहावलोकन",
        "subtitle": "अपनी पीडीएफ फ़ाइलों को स्थानीय रूप से प्रोसेस करने के लिए नीचे एक टूल चुनें।",
        "startProcessing": "प्रोसेसिंग शुरू करें"
      },
      "tools": {
        "merge": "पीडीएफ मिलाएं",
        "mergeDesc": "कई पीडीएफ को एक दस्तावेज़ में मिलाएं",
        "split": "पीडीएफ विभाजित करें",
        "splitDesc": "पृष्ठों को निकालें या फ़ाइलों को कई दस्तावेज़ों में विभाजित करें",
        "rotate": "पीडीएफ घुमाएं",
        "rotateDesc": "एक क्लिक के साथ आसानी से पृष्ठ अभिविन्यास ठीक करें",
        "img2pdf": "JPG से पीडीएफ",
        "img2pdfDesc": "चित्रों (JPG, PNG) को पीडीएफ प्रारूप में परिवर्तित करें",
        "xls2pdf": "Excel से पीडीएफ",
        "xls2pdfDesc": "एक्सेल स्प्रेडशीट को पीडीएफ दस्तावेजों में बदलें",
        "rearrange": "पृष्ठ व्यवस्थित करें",
        "rearrangeDesc": "दिखने में पृष्ठों को पुनर्व्यवस्थित, हटाएं, या व्यवस्थित करें"
      },
      "common": {
        "addFile": "फ़ाइल जोड़ें",
        "clearAll": "सभी साफ़ करें",
        "processDownload": "प्रोसेस करें और डाउनलोड करें",
        "processing": "प्रोसेस हो रहा है...",
        "cancel": "रद्द करें",
        "delete": "हटाएं",
        "dragDropFile": "फ़ाइल को यहाँ खींचें और छोड़ें"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
