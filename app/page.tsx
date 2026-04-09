"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE ULTIMATE STABLE, RESPONSIVE & VERBOSE EDITION
 * -------------------------------------------------------------------------------------------------
 * גרסה: 7.0.0 (Maximalist Codebase)
 * שורות קוד: 880+
 * 
 * תכונות מפתח:
 * - זיהוי GPS ומיקום משתמש בזמן אמת.
 * - סיכה אדומה בולטת למיקום המשתמש.
 * - חישוב מרחק אווירי והצגתו בתוך הבלון במפה.
 * - מיון רשימת האתרים מהקרוב ביותר לרחוק ביותר באופן אוטומטי.
 * - 10 קטגוריות מלאות המתורגמות ל-4 שפות (HE, EN, AR, RU).
 * - פילטר אזורים (צפון, מרכז, דרום) משולב.
 * - פופ-אפ מרובע רחב (Square Popup) ברוחב 400 פיקסלים.
 * - נגן YouTube Embed המותאם לתצוגת מפה.
 * - שיתוף ב-WhatsApp של שם המקום ומיקומו.
 * - לוגו אישי מסתובב עם קישור לאתר גיאולוגיה חיצוני.
 * - רספונסיביות מלאה לטלפונים חכמים (Mobile First).
 * =================================================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

// ייבוא CSS של Leaflet
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול של האפליקציה
import data from './data.json';

/**
 * הגדרת טיפוסים עבור ניהול מצבי התצוגה של האפליקציה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי מדויק (Haversine Formula)
 * פונקציה זו מחשבת את המרחק הגיאוגרפי בקילומטרים בין המשתמש ליעד.
 * 
 * @param userLatitude קו רוחב משתמש
 * @param userLongitude קו אורך משתמש
 * @param targetLatitude קו רוחב יעד
 * @param targetLongitude קו אורך יעד
 * @returns המרחק בקילומטרים כמחרוזת מעוגלת לספרה אחת
 */
function getDistanceBetweenPoints(userLatitude: number, userLongitude: number, targetLatitude: number, targetLongitude: number): string {
  if (!userLatitude || !userLongitude || !targetLatitude || !targetLongitude) {
    return "0.0";
  }

  const EarthRadius = 6371; // רדיוס כדור הארץ הממוצע בק"מ
  
  const dLat = (targetLatitude - userLatitude) * Math.PI / 180;
  const dLon = (targetLongitude - userLongitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLatitude * Math.PI / 180) * Math.cos(targetLatitude * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const calculatedDistance = EarthRadius * c;
  
  return calculatedDistance.toFixed(1);
}

/**
 * פונקציה לבניית קישור וידאו תקין עבור YouTube Embed
 * מוודאת שהסרטון ירוץ ללא חסימות דפדפן ועם הגדרות אבטחה נכונות.
 */
function generateYouTubeEmbedUrl(videoId: string): string {
  if (!videoId) return "";
  const baseUrl = "https://www.youtube.com/embed/";
  const params = "?autoplay=0&rel=0&modestbranding=1&enablejsapi=1";
  const origin = typeof window !== 'undefined' ? `&origin=${window.location.origin}` : "";
  return `${baseUrl}${videoId}${params}${origin}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני State - ניהול האפליקציה (בפירוט מלא)
   * -----------------------------------------------------------------------------------------------
   */
  
  // האם האפליקציה נטענה בצד הלקוח (למניעת שגיאות SSR)
  const [isAppMounted, setIsAppMounted] = useState(false);
  
  // המסך הפעיל כרגע (home, quiz, map)
  const [viewState, setViewState] = useState<ViewState>('home');
  
  // שפת הממשק הנוכחית (HE, AR, EN, RU)
  const [currentLang, setCurrentLang] = useState('he');
  
  // קטגוריית הסינון הפעילה
  const [activeCategory, setActiveCategory] = useState('all');
  
  // האזור הגיאוגרפי הפעיל (צפון, מרכז, דרום)
  const [activeRegion, setActiveRegion] = useState('all');
  
  // טקסט לחיפוש חופשי
  const [searchQueryString, setSearchQueryString] = useState('');
  
  // מיקום ה-GPS של המשתמש
  const [userGPSPos, setUserGPSPos] = useState<[number, number] | null>(null);
  
  // ספריות המפה הנטענות דינמית
  const [LeafletMapLib, setLeafletMapLib] = useState<any>(null);
  
  // אייקון אדום מיוחד למיקום המשתמש
  const [redLocationIcon, setRedLocationIcon] = useState<any>(null);
  
  // רפרנס לשליטה במפה (Ref)
  const mapControlRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא (Internationalization Dictionary)
   * כולל פירוט מפורש של 10 קטגוריות עבור כל שפה
   * -----------------------------------------------------------------------------------------------
   */
  const translations: any = {
    he: { 
      searchPlaceholder: "חפש מקום, מסלול או מעיין...",
      resultsCountLabel: "תוצאות שנמצאו",
      surpriseMeBtn: "תפתיע אותי",
      welcomeHeading: "לאן נטייל היום?",
      letsBeginBtn: "בואו נתחיל",
      backButtonLabel: "חזרה לדף הקודם",
      quizMainTitle: "מה הסגנון שלכם עכשיו?",
      nearbyText: "קמ ממך",
      distFromYouLabel: "מרחק מהמיקום שלך:",
      homeTitleText: "דף הבית",
      hereMarkerLabel: "המיקום הנוכחי שלך",
      whatsappShareBtn: "שתף בוואטסאפ",
      kmLabel: 'ק"מ',
      regionNames: { all: "כל הארץ", north: "צפון הארץ", center: "מרכז הארץ", south: "דרום הארץ" },
      categories: { 
        all: "הכל", 
        water: "מים ומעיינות", 
        nature: "פארקים, טבע ותצפיות", 
        history: "אתרי היסטוריה ומורשת", 
        sleep: "לינה, חניוני לילה וצימרים", 
        food: "מסעדות, אוכל ובתי קפה", 
        bike: "מסלולי אופניים",
        hiking: "מסלולי הליכה",
        promenade: "טיילות",
        beach: "חופי ים וחופי שחיה",
        river: "נחלים ונהרות"
      }
    },
    en: { 
      searchPlaceholder: "Search for a place...",
      resultsCountLabel: "Results Found",
      surpriseMeBtn: "Surprise Me",
      welcomeHeading: "Where to today?",
      letsBeginBtn: "Let's Go",
      backButtonLabel: "Go Back",
      quizMainTitle: "What is your style?",
      nearbyText: "km away",
      distFromYouLabel: "Distance:",
      homeTitleText: "Home",
      hereMarkerLabel: "You are here",
      whatsappShareBtn: "Share on WhatsApp",
      kmLabel: "km",
      regionNames: { all: "All Israel", north: "North", center: "Center", south: "South" },
      categories: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks & Nature", 
        history: "History & Heritage", 
        sleep: "Sleep & Camping", 
        food: "Food & Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Sea Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      searchPlaceholder: "ابحث عن مكان...",
      resultsCountLabel: "نتائج البحث",
      surpriseMeBtn: "فاجئني",
      welcomeHeading: "أين نذهب اليوم؟",
      letsBeginBtn: "لنبدأ الرحلة",
      backButtonLabel: "رجوع",
      quizMainTitle: "ما هو أسلובك המفضل؟",
      nearbyText: "كم منك",
      distFromYouLabel: "المסافة:",
      homeTitleText: "الرئيسية",
      hereMarkerLabel: "أنت هنا",
      whatsappShareBtn: "مشاركة عبر الواتساب",
      kmLabel: "كم",
      regionNames: { all: "כל البلاد", north: "منطقة الشمال", center: "منطقة المركز", south: "منطقة الجنوب" },
      categories: { 
        all: "الכל", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ ותראת'", 
        sleep: "מבית ותח'יים", 
        food: "טעאם ומסאעם", 
        bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי",
        promenade: "ממשׁא",
        beach: "שואטئ",
        river: "אנהאר"
      }
    },
    ru: { 
      searchPlaceholder: "Поиск места...",
      resultsCountLabel: "Результаты",
      surpriseMeBtn: "Удиви меня",
      welcomeHeading: "Куда поедем сегодня?",
      letsBeginBtn: "Поехали",
      backButtonLabel: "Назад",
      quizMainTitle: "Какой у вас стиль?",
      nearbyText: "км от вас",
      distFromYouLabel: "Расстояние:",
      homeTitleText: "Домой",
      hereMarkerLabel: "Вы здесь",
      whatsappShareBtn: "Поделиться в WhatsApp",
      kmLabel: "км",
      regionNames: { all: "Весь Израиль", north: "Север", center: "Центр", south: "Юг" },
      categories: { 
        all: "Все", 
        water: "Вода и источники", 
        nature: "Пארקי и природа", 
        history: "История и наследие", 
        sleep: "Жилье и кемпинг", 
        food: "Еда и рестораны", 
        bike: "Веломаршруты",
        hiking: "Пешие тропы",
        promenade: "Променады",
        beach: "Пляжи",
        river: "Реки и ручьи"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * UseEffects - טעינת GPS, רכיבי מפה ומרקרים
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // סימון שהצד לקוח עלה בהצלחה
    setIsAppMounted(true);
    
    // הפעלת זיהוי מיקום GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired successfully");
          setUserGPSPos([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS Access Denied.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת רכיבי המפה באופן דינמי למניעת שגיאות SSR ב-Next.js
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([reactLeafletLib, leafletBase]: any) => {
      // תיקון עבור מרקרים שלא נטענים נכון ב-Webpack
      delete leafletBase.Icon.Default.prototype._getIconUrl;
      leafletBase.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // יצירת אייקון אדום ייחודי למיקום המשתמש
      const redMarkerIcon = new leafletBase.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedLocationIcon(redMarkerIcon);
      setLeafletMapLib(reactLeafletLib);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון (Memoized)
   * מסננת את הנתונים וממיינת אותם לפי מרחק מהמשתמש
   * -----------------------------------------------------------------------------------------------
   */
  const filteredDataItems = useMemo(() => {
    // סינון ראשוני לפי טקסט חיפוש, קטגוריה ואזור גיאוגרפי
    let result = data.filter((item: any) => {
      const searchLowercase = searchQueryString.toLowerCase();
      
      // בדיקה שתמיד יש שם וקואורדינטות (מניעת קריסה)
      if (!item.name || !item.coords) return false;

      // בדיקת התאמה בשם המקום (בכל השפות האפשריות)
      const nameMatchesSearch = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLowercase)
      );
      
      // בדיקת התאמה לקטגוריה
      const categoryMatches = activeCategory === 'all' || item.category === activeCategory;
      
      // בדיקת התאמה לאזור (כולל הגנה על שדה אזור חסר ב-JSON)
      const regionMatches = activeRegion === 'all' || (item.region && item.region === activeRegion);
      
      return nameMatchesSearch && categoryMatches && regionMatches;
    });

    // מיון לפי מרחק מהמשתמש במידה והמיקום זמין
    if (userGPSPos) {
      return [...result].sort((siteA, siteB) => {
        const dA = parseFloat(getDistanceInKm(userGPSPos[0], userGPSPos[1], siteA.coords[0], siteA.coords[1]));
        const dB = parseFloat(getDistanceInKm(userGPSPos[0], userGPSPos[1], siteB.coords[0], siteB.coords[1]));
        return dA - dB;
      });
    }
    
    return result;
  }, [searchQueryString, activeCategory, activeRegion, userGPSPos]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות עזר (Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה לתנועה חלקה במפה ליעד מסוים (FlyTo)
  const flyToSiteCoordinates = (targetCoords: [number, number]) => {
    if (mapControlRef.current) {
      mapControlRef.current.flyTo(targetCoords, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האתרים הכי קרובים
  const handleSmartSurpriseAction = () => {
    const candidateList = filteredDataItems.length > 0 ? filteredDataItems.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * candidateList.length);
    const chosenDestination = candidateList[randomIndex];
    
    // ניקוי פילטרים ומעבר למסך המפה
    setActiveCategory('all');
    setSearchQueryString('');
    setViewState('map');
    
    // מעבר במפה לאחר טעינה קלה של הממשק
    setTimeout(() => {
      flyToSiteCoordinates(chosenDestination.coords as [number, number]);
    }, 800);
  };

  // פונקציית שיתוף בוואטסאפ (WhatsApp Sharing)
  const triggerWhatsAppShare = (item: any) => {
    const placeName = item.name[currentLang] || item.name.he;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
    const shareMessage = encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${placeName}\nמיקום במפות: ${googleMapsUrl}`);
    window.open(`https://wa.me/?text=${shareMessage}`, '_blank');
  };

  // בדיקת טעינה סופית
  if (!isAppMounted || !LeafletMapLib) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapLib;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={currentLang === 'ar' || currentLang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home Screen UI)
          ------------------------------------------------------------------------------------------- */}
      {viewState === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4 animate-fadeIn">
            {/* לוגו ממותג עם אנימציה וקישור חיצוני - תיקון רספונסיביות */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-4xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-xl md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">
              {translations[currentLang].welcomeHeading}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setViewState('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {translations[currentLang].letsBeginBtn}
              </button>
              
              <button 
                onClick={handleSmartSurpriseAction} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all"
              >
                🎲 {translations[currentLang].surpriseMeBtn}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית - כפתורים גדולים ונוחים */}
            <div className="mt-16 md:mt-24 flex justify-center gap-2 md:gap-4 flex-wrap">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setCurrentLang(l)} 
                  className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${currentLang === l ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך השאלון (Quiz View) - 10 קטגוריות מלאות, פריסה מפורשת
          ------------------------------------------------------------------------------------------- */}
      {viewState === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{translations[currentLang].quizMainTitle}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {/* מיפוי מפורש של 10 הקטגוריות - ללא צמצום קוד */}
            {Object.entries(translations[currentLang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategory(id); setViewState('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-3 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3.5rem] shadow-xl border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4"
              >
                <span className="text-4xl md:text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase tracking-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setViewState('home')} 
            className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900"
          >
            {translations[currentLang].backButtonLabel}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View Main)
          ------------------------------------------------------------------------------------------- */}
      {viewState === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה - רספונסיבי ומעוצב עם לוגו ובורר שפה */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                {/* לוגו Header עם סיבוב וקישור */}
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={() => setViewState('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header לשימוש נוח בזמן ניווט */}
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setCurrentLang(l)} 
                    className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${currentLang === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 w-full px-2">
              {/* שורת חיפוש חכמה */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={translations[currentLang].searchPlaceholder} 
                  value={searchQueryString} 
                  onChange={(e) => setSearchQueryString(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-5 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg" 
                />
                <span className={`absolute top-2.5 md:top-5 opacity-30 text-lg md:text-3xl ${currentLang === 'he' || currentLang === 'ar' ? 'right-4 md:right-6' : 'left-4 md:left-6'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים (אזור גיאוגרפי + 10 קטגוריות) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200"
                >
                  {Object.entries(translations[currentLang].regionNames).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(translations[currentLang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategory(id)} 
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar רשימת תוצאות - ממוין לפי קרבה (Desktop Only) */}
            <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-10">
                <span className="text-lg font-black text-gray-400 uppercase tracking-widest">
                  {translations[currentLang].resultsCountLabel} ({filteredDataItems.length})
                </span>
                {userGPSPos && (
                  <span className="text-[14px] bg-green-100 text-green-700 px-5 py-2 rounded-full font-black flex items-center gap-2 shadow-inner">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-8">
                {filteredDataItems.map((item: any) => {
                  const distCalculated = userGPSPos ? getDistanceInKm(userGPSPos[0], userGPSPos[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => flyToSiteCoordinates(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-48 w-full mb-5 rounded-[2.5rem] overflow-hidden shadow-md bg-gray-200">
                        {/* תמונה מיוחדת לחרמון או רגילה לשאר */}
                        <img 
                          src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Place Thumb" 
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-4 leading-tight">
                        {item.name[currentLang] || item.name.he}
                      </h3>
                      {distCalculated && (
                        <p className="text-[14px] text-green-600 font-black mt-4 px-4 flex items-center gap-2">
                          <span className="text-xl">🚀</span> {distCalculated} {translations[currentLang].nearbyText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* קונטיינר המפה (Leaflet Map) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={mapControlRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* הצגת מיקום המשתמש בסיכה אדומה */}
                {userGPSPos && redLocationIcon && (
                  <Marker position={userGPSPos} icon={redLocationIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-3 text-lg">
                        📍 {translations[currentLang].hereMarkerLabel}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל האתרים לסיכות על המפה */}
                {filteredDataItems.map((item: any) => {
                  const itemDistValue = userGPSPos ? getDistanceInKm(userGPSPos[0], userGPSPos[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup">
                        <div className="text-right font-sans p-2 overflow-hidden">
                          
                          {/* הצגת וידאו או תמונה - הגדרת גובה קשיח למניעת אי-הצגה */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[2rem] overflow-hidden bg-black relative border-4 border-white">
                            {/* החרמון מציג רק את תמונת ויקיפדיה, האחרים לפי שדה video */}
                            {(item.video && item.id !== "1") ? (
                              <iframe 
                                key={`v-embed-${item.id}-${currentLang}`}
                                width="100%" 
                                height="100%" 
                                src={generateYouTubeEmbedUrl(item.video)} 
                                title="Video"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                                alt="Place" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          {/* כותרת המקום */}
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">
                            {item.name[currentLang] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך הבלון בשפה הנבחרת */}
                          {itemDistValue && (
                            <div className="flex items-center gap-3 mb-4 bg-green-100 inline-flex px-6 py-2.5 rounded-full border-2 border-green-200 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[16px] text-green-800 font-black m-0">
                                {translations[currentLang].distFromYouLabel} {itemDistValue} {translations[currentLang].kmLabel}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר עם גובה מוגבל וגלילה */}
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[currentLang] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי פעולה רחבים כולל WhatsApp */}
                          <div className="flex flex-wrap gap-3 mt-8 pb-1">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all"
                            >
                              WAZE
                            </a>
                            <button 
                              onClick={() => triggerWhatsAppShare(item)}
                              className="flex-1 bg-green-500 text-white text-center py-4 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95 transition-all"
                            >
                              WhatsApp
                            </button>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 active:scale-95 transition-all"
                            >
                              GOOGLE
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* כפתורי שליטה צפים - מותאמים רספונסיבית */}
              <div className="absolute bottom-8 left-8 z-[2000] flex flex-col gap-5">
                <button 
                  onClick={handleSmartSurpriseAction} 
                  className="bg-green-600 text-white w-20 h-20 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-4xl md:text-6xl mb-1">🎲</span>
                  {translations[currentLang].surpriseMeBtn}
                </button>
                
                <button 
                  onClick={() => setViewState('home')} 
                  className="bg-white text-green-600 w-16 h-16 md:w-24 md:h-24 rounded-full shadow-2xl flex items-center justify-center text-4xl md:text-6xl border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-115 active:scale-90 shadow-gray-400"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי - עיצוב הבלון המרובע ותיקוני מובייל
          ------------------------------------------------------------------------------------------- */}
      <style jsx global>{`
        .leaflet-marker-icon { 
          margin-top: -34px !important; 
          margin-left: -12px !important; 
        }
        .no-scrollbar::-webkit-scrollbar { 
          display: none; 
        }
        .leaflet-popup-content-wrapper { 
          border-radius: 3rem !important; 
          overflow: hidden !important; 
          padding: 0 !important; 
          box-shadow: 0 45px 90px -15px rgba(0, 0, 0, 0.45) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 24px !important; 
          width: 400px !important; /* רוחב מרובע יוקרתי */
        }
        @media (max-width: 768px) {
          .leaflet-popup-content {
            width: 300px !important;
            padding: 15px !important;
          }
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-modern-popup iframe {
          pointer-events: auto !important;
          border-radius: 2rem !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}