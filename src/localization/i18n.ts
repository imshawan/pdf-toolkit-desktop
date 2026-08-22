import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translations from "./resources";

const resources = {
  "en": {
    "translation": {
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
        "languageSelect": "Language",
        "behavior": "Behavior",
        "saveLocation": "Save Location Behavior",
        "askEveryTime": "Ask where to save",
        "defaultFolder": "Save to default folder",
        "chooseFolder": "Choose Folder",
        "defaultPageSize": "Default Page Size",
        "autoOpen": "Auto-open after processing"
      },
      "about": {
        "title": "About PDF Tools",
        "version": "Version 1.0.0",
        "desc": "A fast, offline, privacy-first PDF utility suite designed with native macOS aesthetics. Everything runs locally on your machine with zero server uploads.",
        "openSourceLicenses": "Open Source Licenses",
        "thirdPartySoft": "Third-party software components & acknowledgements",
        "githubRepo": "GitHub Repository",
        "authorWebsite": "Author Website",
        "copyright": "Copyright © 2026 Shawan Mandal. All rights reserved."
      },
      "dashboard": {
        "overview": "Overview",
        "subtitle": "Select a tool below to process your PDF files locally.",
        "startProcessing": "Start Processing",
        "coreTools": "Core Tools",
        "conversion": "Conversion"
      },
      "tools": {
        "merge": "Merge PDF",
        "mergeDesc": "Combine multiple PDFs into one document",
        "split": "Split PDF",
        "splitDesc": "Extract pages or split files into multiple documents",
        "rotate": "Rotate PDF",
        "rotateDesc": "Fix page orientations easily with one click",
        "img2pdf": "Images to PDF",
        "img2pdfDesc": "Convert images (JPG, PNG) to PDF format",
        "xls2pdf": "Excel to PDF",
        "xls2pdfDesc": "Convert Excel spreadsheets to PDF documents",
        "rearrange": "Rearrange Pages",
        "rearrangeDesc": "Reorder, delete, or organize pages visually",
        "sign": "Sign PDF",
        "signDesc": "Add your signature to a PDF",
        "watermark": "Watermark",
        "watermarkDesc": "Stamp image or text over PDF",
        "protect": "Protect",
        "protectDesc": "Add a password to protect your PDF",
        "unlock": "Unlock",
        "unlockDesc": "Remove password from a PDF",
        "pdf2img": "PDF to Image",
        "pdf2imgDesc": "Extract PDF pages to images",
        "html2pdf": "HTML to PDF",
        "html2pdfDesc": "Convert Webpages to PDF",
        "saveLocation": "Save Location",
        "generatingPreview": "Generating preview..."
      },
      "common": {
        "addFile": "Add File",
        "clearAll": "Clear All",
        "processDownload": "Process & Download",
        "processing": "Processing...",
        "cancel": "Cancel",
        "delete": "Delete",
        "dragDropFile": "Drag & Drop file here",
        "pageSize": "Page Size",
        "orientation": "Orientation",
        "portrait": "Portrait",
        "landscape": "Landscape",
        "scale": "Scale (%)",
        "margin": "Margin (mm)",
        "clickToUpload": "Click to upload",
        "password": "Password",
        "text": "Text",
        "image": "Image",
        "opacity": "Opacity",
        "apply": "Apply",
        "preview": "Preview"
      }
    }
  },
  "hi": {
    "translation": {
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
        "languageSelect": "भाषा",
        "behavior": "व्यवहार",
        "saveLocation": "सेव लोकेशन व्यवहार",
        "askEveryTime": "हर बार पूछें",
        "defaultFolder": "डिफ़ॉल्ट फ़ोल्डर में सेव करें",
        "chooseFolder": "फ़ोल्डर चुनें",
        "defaultPageSize": "डिफ़ॉल्ट पृष्ठ आकार",
        "autoOpen": "प्रोसेसिंग के बाद स्वतः खोलें"
      },
      "about": {
        "title": "PDF Tools के बारे में",
        "version": "संस्करण 1.0.0",
        "desc": "मूल macOS सौंदर्यशास्त्र के साथ डिज़ाइन किया गया एक तेज़, ऑफ़लाइन, गोपनीयता-प्रथम पीडीएफ उपयोगिता सुइट। सब कुछ आपकी मशीन पर स्थानीय रूप से चलता है और शून्य सर्वर अपलोड होता है।",
        "openSourceLicenses": "ओपन सोर्स लाइसेंस",
        "thirdPartySoft": "तृतीय-पक्ष सॉफ़्टवेयर घटक और पावती",
        "githubRepo": "गिटहब रिपोजिटरी",
        "authorWebsite": "लेखक की वेबसाइट",
        "copyright": "कॉपीराइट © 2026 शावन मंडल। सर्वाधिकार सुरक्षित।"
      },
      "dashboard": {
        "overview": "सिंहावलोकन",
        "subtitle": "अपनी पीडीएफ फ़ाइलों को स्थानीय रूप से प्रोसेस करने के लिए नीचे एक टूल चुनें।",
        "startProcessing": "प्रोसेसिंग शुरू करें",
        "coreTools": "मुख्य टूल्स",
        "conversion": "परिवर्तन"
      },
      "tools": {
        "merge": "पीडीएफ मिलाएं",
        "mergeDesc": "कई पीडीएफ को एक दस्तावेज़ में मिलाएं",
        "split": "पीडीएफ विभाजित करें",
        "splitDesc": "पृष्ठों को निकालें या फ़ाइलों को कई दस्तावेज़ों में विभाजित करें",
        "rotate": "पीडीएफ घुमाएं",
        "rotateDesc": "एक क्लिक के साथ आसानी से पृष्ठ अभिविन्यास ठीक करें",
        "img2pdf": "इमेजेज से पीडीएफ",
        "img2pdfDesc": "चित्रों (JPG, PNG) को पीडीएफ प्रारूप में परिवर्तित करें",
        "xls2pdf": "Excel से पीडीएफ",
        "xls2pdfDesc": "एक्सेल स्प्रेडशीट को पीडीएफ दस्तावेजों में बदलें",
        "rearrange": "पृष्ठ व्यवस्थित करें",
        "rearrangeDesc": "दिखने में पृष्ठों को पुनर्व्यवस्थित, हटाएं, या व्यवस्थित करें",
        "sign": "पीडीएफ पर हस्ताक्षर करें",
        "signDesc": "पीडीएफ में अपने हस्ताक्षर जोड़ें",
        "watermark": "वाटरमार्क",
        "watermarkDesc": "पीडीएफ पर छवि या पाठ की मुहर लगाएं",
        "protect": "सुरक्षित करें",
        "protectDesc": "अपने पीडीएफ को सुरक्षित करने के लिए पासवर्ड जोड़ें",
        "unlock": "अनलॉक करें",
        "unlockDesc": "पीडीएफ से पासवर्ड हटाएं",
        "pdf2img": "पीडीएफ से छवि",
        "pdf2imgDesc": "पीडीएफ पृष्ठों को छवियों में निकालें",
        "html2pdf": "एचटीएमएल से पीडीएफ",
        "html2pdfDesc": "वेबपेज को पीडीएफ में बदलें",
        "saveLocation": "सेव लोकेशन",
        "generatingPreview": "पूर्वावलोकन उत्पन्न हो रहा है..."
      },
      "common": {
        "addFile": "फ़ाइल जोड़ें",
        "clearAll": "सभी साफ़ करें",
        "processDownload": "प्रोसेस करें और डाउनलोड करें",
        "processing": "प्रोसेस हो रहा है...",
        "cancel": "रद्द करें",
        "delete": "हटाएं",
        "dragDropFile": "फ़ाइल को यहाँ खींचें और छोड़ें",
        "pageSize": "पृष्ठ का आकार",
        "orientation": "अभिविन्यास",
        "portrait": "पोर्ट्रेट (खड़ा)",
        "landscape": "लैंडस्केप (पड़ा)",
        "scale": "स्केल (%)",
        "margin": "मार्जिन (मिमी)",
        "clickToUpload": "अपलोड करने के लिए क्लिक करें",
        "password": "पासवर्ड",
        "text": "टेक्स्ट",
        "image": "इमेज",
        "opacity": "अस्पष्टता",
        "apply": "लागू करें",
        "preview": "पूर्वावलोकन"
      }
    }
  },
  "de": translations.de,
  "fr": translations.fr,
  "es": translations.es,
  "zh-CN": translations.zhCN
};

export const languages = [
  {
    code: "en",
    label: "English",
  },
  {
    code: "es",
    label: "Español (Spanish)",
  },
  {
    code: "hi",
    label: "हिंदी (Hindi)",
  },
  {
    code: "zh-CN",
    label: "简体中文 (Simplified Chinese)"
  },
  {
    code: "de",
    label: "Deutsch (German)",
  },
  {
    code: "fr",
    label: "Français (French)"
  }
]

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;
