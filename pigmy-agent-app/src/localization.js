import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const translations = {
  en: {
    route: "Route",
    history: "History",
    leaderboard: "Leaderboard",
    ledger: "Ledger",
    settings: "Settings",
    searchPlaceholder: "Search by Name or Account...",
    online: "ONLINE",
    offline: "OFFLINE",
    filterAll: "All",
    filterPending: "Pending",
    filterCollected: "Collected",
    filterSkipped: "Skipped",
    emiDue: "EMI DUE",
    currentBalance: "Current Balance",
    collectDeposit: "Collect Deposit",
    emiPayment: "EMI Payment",
    skipClosed: "Skip Shop Closed",
    call: "Call",
    navigate: "Navigate",
    initiateCollection: "Initiate Collection",
    paymentMode: "Payment Mode",
    amountLabel: "Collection Amount (INR)",
    authorizeSubmit: "Authorize & Submit",
    cancel: "Cancel",
    transactionHistory: "Transaction History",
    filterCash: "Cash",
    filterUpi: "UPI",
    noTransactions: "No recent transactions found.",
    weeklyLeaderboard: "Weekly Leaderboard",
    topAgent: "Top Field Agent",
    weeklyVolume: "Weekly Volume",
    streakLabel: "Streak",
    rankLabel: "Rank",
    appSecurity: "App Security",
    pinLockLabel: "4-Digit Quick PIN Lock",
    pinLockDesc: "Use a fast PIN code instead of password on startup.",
    deviceIdLabel: "Bound Device ID",
    syncManager: "Sync Manager",
    offlineSimLabel: "Simulate Offline Mode",
    offlineSimDesc: "Force the app to run completely offline for testing.",
    pendingQueueLabel: "Pending Upload Queue",
    pendingQueueDesc: "offline records cached on phone.",
    syncNowBtn: "SYNC NOW",
    apiConfigLabel: "API Server URL",
    configureBtn: "Configure",
    logoutBtn: "END SHIFT (LOGOUT)",
    selectLanguage: "Select Language",
    terminalLocked: "Terminal Locked",
    enterPin: "Enter 4-digit PIN to access PigmyPay",
    incorrectPin: "Incorrect PIN. Try again.",
    weeklyStandings: "Weekly Standing List"
  },
  hi: {
    route: "मार्ग",
    history: "इतिहास",
    leaderboard: "लीडरबोर्ड",
    ledger: "खाता बही",
    settings: "सेटिंग्स",
    searchPlaceholder: "नाम या खाता संख्या से खोजें...",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन",
    filterAll: "सभी",
    filterPending: "लंबित",
    filterCollected: "एकत्रित",
    filterSkipped: "छोड़े गए",
    emiDue: "ईएमआई देय",
    currentBalance: "वर्तमान शेष",
    collectDeposit: "जमा एकत्र करें",
    emiPayment: "ईएमआई भुगतान",
    skipClosed: "दुकान बंद छोड़ें",
    call: "कॉल करें",
    navigate: "मार्गदर्शन",
    initiateCollection: "संग्रह शुरू करें",
    paymentMode: "भुगतान का प्रकार",
    amountLabel: "संग्रह राशि (रुपये)",
    authorizeSubmit: "अधिकृत और सबमिट करें",
    cancel: "रद्द करें",
    transactionHistory: "लेन-देन इतिहास",
    filterCash: "नकद",
    filterUpi: "यूपीआई",
    noTransactions: "कोई हालिया लेन-देन नहीं मिला।",
    weeklyLeaderboard: "साप्ताहिक लीडरबोर्ड",
    topAgent: "शीर्ष एजेंट",
    weeklyVolume: "साप्ताहिक संग्रह",
    streakLabel: "लगातार दिन",
    rankLabel: "रैंक",
    appSecurity: "ऐप सुरक्षा",
    pinLockLabel: "4-अंकीय त्वरित पिन लॉक",
    pinLockDesc: "स्टार्टअप पर पासवर्ड के बजाय त्वरित पिन कोड का उपयोग करें।",
    deviceIdLabel: "बाध्य डिवाइस आईडी",
    syncManager: "सिंक प्रबंधक",
    offlineSimLabel: "ऑफ़लाइन मोड का अनुकरण",
    offlineSimDesc: "परीक्षण के लिए ऐप को पूरी तरह से ऑफ़लाइन चलाने के लिए मजबूर करें।",
    pendingQueueLabel: "लंबित अपलोड कतार",
    pendingQueueDesc: "ऑफ़लाइन रिकॉर्ड फ़ोन पर कैश्ड हैं।",
    syncNowBtn: "अभी सिंक करें",
    apiConfigLabel: "एपीआई सर्वर यूआरएल",
    configureBtn: "कॉन्फ़िगर करें",
    logoutBtn: "शिफ्ट समाप्त करें (लॉगआउट)",
    selectLanguage: "भाषा चुनें",
    terminalLocked: "टर्मिनल लॉक है",
    enterPin: "पिग्मीपे का उपयोग करने के लिए 4-अंकीय पिन दर्ज करें",
    incorrectPin: "गलत पिन। दोबारा प्रयास करें।",
    weeklyStandings: "साप्ताहिक स्थिति सूची"
  },
  mr: {
    route: "मार्ग",
    history: "इतिहास",
    leaderboard: "लीडरबोर्ड",
    ledger: "खाते",
    settings: "सेटिंग्स",
    searchPlaceholder: "नाव किंवा खाते क्रमांकाने शोधा...",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन",
    filterAll: "सर्व",
    filterPending: "प्रलंबित",
    filterCollected: "एकत्रित",
    filterSkipped: "वगळलेले",
    emiDue: "ईएमआय देय",
    currentBalance: "चालू शिल्लक",
    collectDeposit: "ठेव जमा करा",
    emiPayment: "ईएमआय पेमेंट",
    skipClosed: "दुकान बंद वगळा",
    call: "कॉल करा",
    navigate: "मार्गदर्शन",
    initiateCollection: "संकलन सुरू करा",
    paymentMode: "पेमेंट मोड",
    amountLabel: "जमा रक्कम (रुपये)",
    authorizeSubmit: "अधिकृत आणि सबमिट करा",
    cancel: "रद्द करा",
    transactionHistory: "व्यवहार इतिहास",
    filterCash: "रोख",
    filterUpi: "यूपीआई",
    noTransactions: "अलीकडील व्यवहार आढळले नाहीत.",
    weeklyLeaderboard: "साप्ताहिक लीडरबोर्ड",
    topAgent: "उत्कृष्ट एजंट",
    weeklyVolume: "साप्ताहिक संकलन",
    streakLabel: "सलग दिवस",
    rankLabel: "रँक",
    appSecurity: "अ‍ॅप सुरक्षा",
    pinLockLabel: "४-अंकी क्विक पिन लॉक",
    pinLockDesc: "स्टार्टअपवर पासवर्ड ऐवजी द्रुत पिन कोड वापरा.",
    deviceIdLabel: "बाउंड डिव्हाइस आयडी",
    syncManager: "सिंक व्यवस्थापक",
    offlineSimLabel: "ऑफलाइन मोडचे अनुकरण करा",
    offlineSimDesc: "चाचणीसाठी अ‍ॅप पूर्णपणे ऑफलाइन चालवा.",
    pendingQueueLabel: "प्रलंबित अपलोड रांग",
    pendingQueueDesc: "ऑफलाइन व्यवहार फोनवर जतन केले आहेत.",
    syncNowBtn: "आता सिंक करा",
    apiConfigLabel: "एपीआई सर्व्हर यूआरएल",
    configureBtn: "कॉन्फिगर करा",
    logoutBtn: "शिफ्ट संपवा (लॉगआउट)",
    selectLanguage: "भाषा निवडा",
    terminalLocked: "टर्मिनल लॉक आहे",
    enterPin: "पिग्मीपे वापरण्यासाठी ४-अंकी पिन प्रविष्ट करा",
    incorrectPin: "चुकीचा पिन. पुन्हा प्रयत्न करा.",
    weeklyStandings: "साप्ताहिक स्थिती यादी"
  },
  kn: {
    route: "ಮಾರ್ಗ",
    history: "ಇತಿಹಾಸ",
    leaderboard: "ಲೀಡರ್ಬೋರ್ಡ್",
    ledger: "ಖಾತೆ ಪುಸ್ತಕ",
    settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    searchPlaceholder: "ಹೆಸರು ಅಥವಾ ಖಾತೆ ಸಂಖ್ಯೆಯಿಂದ ಹುಡುಕಿ...",
    online: "ಆನ್‌ಲೈನ್",
    offline: "ಆಫ್‌ಲೈನ್",
    filterAll: "ಎಲ್ಲಾ",
    filterPending: "ಬಾಕಿ ಇರುವ",
    filterCollected: "ಸಂಗ್ರಹಿಸಿದ",
    filterSkipped: "ವಜಾಗೊಳಿಸಿದ",
    emiDue: "ಇಎಂಐ ಬಾಕಿ",
    currentBalance: "ಪ್ರಸ್ತುತ ಬ್ಯಾಲೆನ್ಸ್",
    collectDeposit: "ಠೇವಣಿ ಸಂಗ್ರಹಿಸಿ",
    emiPayment: "ಇಎಂಐ ಪಾವತಿ",
    skipClosed: "ಅಂಗಡಿ ಮುಚ್ಚಿರುವುದನ್ನು ಬಿಟ್ಟುಬಿಡಿ",
    call: "ಕರೆ ಮಾಡಿ",
    navigate: "ಮಾರ್ಗದರ್ಶನ",
    initiateCollection: "ಸಂಗ್ರಹಣೆ ಪ್ರಾರಂಭಿಸಿ",
    paymentMode: "ಪಾವತಿ ವಿಧಾನ",
    amountLabel: "ಸಂಗ್ರಹ ಮೊತ್ತ (ರೂಪಾಯಿ)",
    authorizeSubmit: "ಅಧಿಕೃತಗೊಳಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    transactionHistory: "ವಹಿವಾಟು ಇತಿಹಾಸ",
    filterCash: "ನಗದು",
    filterUpi: "ಯುಪಿಐ",
    noTransactions: "ಯಾವುದೇ ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    weeklyLeaderboard: "ವಾರದ ಲೀಡರ್ಬೋರ್ಡ್",
    topAgent: "ಅತ್ಯುತ್ತಮ ಏಜೆಂಟ್",
    weeklyVolume: "ವಾರದ ಒಟ್ಟು ಸಂಗ್ರಹಣೆ",
    streakLabel: "ಸತತ ದಿನಗಳು",
    rankLabel: "ಶ್ರೇಣಿ",
    appSecurity: "ಅಪ್ಲಿಕೇಶನ್ ಭದ್ರತೆ",
    pinLockLabel: "4-ಅಂಕಿಯ ತ್ವರಿತ ಪಿನ್ ಲಾಕ್",
    pinLockDesc: "ಪ್ರಾರಂಭದಲ್ಲಿ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಿಗೆ ತ್ವರಿತ ಪಿನ್ ಕೋಡ್ ಬಳಸಿ.",
    deviceIdLabel: "ಲಿಂಕ್ ಮಾಡಿದ ಸಾಧನ ಐಡಿ",
    syncManager: "ಸಿಂಕ್ ಮ್ಯಾನೇಜರ್",
    offlineSimLabel: "ಆಫ್‌ಲೈನ್ ಮೋಡ್ ಸಿಮ್ಯುಲೇಶನ್",
    offlineSimDesc: "ಪರೀಕ್ಷೆಗಾಗಿ ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಚಲಾಯಿಸಿ.",
    pendingQueueLabel: "ಬಾಕಿ ಇರುವ ಅಪ್‌ಲೋಡ್ ಸರತಿ",
    pendingQueueDesc: "ಆಫ್‌ಲೈನ್ ವಹಿವಾಟುಗಳು ಫೋನ್‌ನಲ್ಲಿ ಸಂಗ್ರಹವಾಗಿವೆ.",
    syncNowBtn: "ಈಗ ಸಿಂಕ್ ಮಾಡಿ",
    apiConfigLabel: "ಎಪಿಐ ಸರ್ವರ್ ಯುಆರ್ಎಲ್",
    configureBtn: "ಕಾನ್ಫಿಗರ್ ಮಾಡಿ",
    logoutBtn: "ಶಿಫ್ಟ್ ಮುಕ್ತಾಯಗೊಳಿಸಿ (ಲಾಗ್‌ಔಟ್)",
    selectLanguage: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
    terminalLocked: "ಟರ್ಮಿನಲ್ ಲಾಕ್ ಆಗಿದೆ",
    enterPin: "ಪಿಗ್ಮಿಪೇ ಪ್ರವೇಶಿಸಲು 4-ಅಂಕಿಯ ಪಿನ್ ನಮೂದಿಸಿ",
    incorrectPin: "ತಪ್ಪಾದ ಪಿನ್. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.",
    weeklyStandings: "ವಾರದ ಶ್ರೇಣಿ ಪಟ್ಟಿ"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user_language');
        if (savedLang && translations[savedLang]) {
          setLocale(savedLang);
        }
      } catch (err) {
        console.log("Failed to load saved language settings", err);
      }
    };
    loadSavedLanguage();
  }, []);

  const changeLanguage = async (lang) => {
    if (translations[lang]) {
      setLocale(lang);
      try {
        await AsyncStorage.setItem('user_language', lang);
      } catch (err) {
        console.log("Failed to save language settings", err);
      }
    }
  };

  const t = (key) => {
    return translations[locale][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
