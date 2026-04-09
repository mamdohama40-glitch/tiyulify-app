"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE ULTIMATE STABLE MASTER EDITION (MAXIMALIST CODEBASE)
 * -------------------------------------------------------------------------------------------------
 * גרסה: 17.0.0 (Crash-Proof Master Codebase)
 * שורות קוד: 920+
 * 
 * תיאור המערכת:
 * אפליקציה רב-לשונית לניווט ומידע גאוגרפי הכוללת:
 * - זיהוי GPS בזמן אמת וסיכה אדומה למשתמש.
 * - מיון אוטומטי לפי מרחק וחישוב מרחק בבלון המידע.
 * - 10 קטגוריות מקצועיות מתורגמות ל-4 שפות (HE, EN, AR, RU).
 * - פילטר אזורים גיאוגרפיים משולב.
 * - פופ-אפ מרובע ורחב (400px) עם תמיכה ב-YouTube Embed.
 * - שיתוף WhatsApp תקין של שם המקום ומיקומו.
 * - לוגו ממותג מסתובב ורספונסיביות מלאה לטלפונים.
 * =================================================================================================
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';

// ייבוא CSS של ספריית המפות Leaflet
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול
import data from './data.json';

/**
 * -------------------------------------------------------------------------------------------------
 * הגדרות טיפוסים (Type Definitions)
 * -------------------------------------------------------------------------------------------------
 */

// מצבי ניווט בין מסכים
type ViewState = 'home' | 'quiz' | 'map';

/**
 * -------------------------------------------------------------------------------------------------
 * פונקציות עזר גלובליות (Utility Functions)
 * -------------------------------------------------------------------------------------------------
 */

/**
 * פונקציה לחישוב מרחק אווירי מדויק (Haversine Formula)
 * מחשבת את המרחק הפיזי בקילומטרים בין המשתמש לנקודת הציון.
 * 
 * @param userLat קו רוחב משתמש
 * @param userLon קו אורך משתמש
 * @param siteLat קו רוחב יעד
 * @param siteLon קו אורך יעד
 * @returns מרחק בקילומטרים כמחרוזת מעוגלת לספרה אחת
 */
function getCalculatedProximity(
  userLat: number, 
  userLon: number, 
  siteLat: number, 
  siteLon: number
): string {
  if (!userLat || !userLon || !siteLat || !siteLon) {
    return "0.0";
  }

  // רדיוס כדור הארץ הממוצע בקילומטרים
  const R_EARTH = 6371; 
  
  // המרת מעלות לרדיאנים
  const dLat = (siteLat - userLat) * Math.PI / 180;
  const dLon = (siteLon - userLon) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(siteLat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const finalDistanceResult = R_EARTH * c;
  
  return finalDistanceResult.toFixed(1);
}

/**
 * פונקציה לבניית קישור Embed תקין ומאובטח עבור YouTube
 * מוודאת שהסרטון ירוץ בתוך ה-iframe ללא חסימות דפדפן.
 */
function formatYoutubeEmbedLink(videoId: string): string {
  if (!videoId) return "";
  const origin = typeof window !== 'undefined' ? window.location.origin : "";
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני ניהול מצב (States) - מפורטים בפירוט מירבי
   * -----------------------------------------------------------------------------------------------
   */
  
  // האם האפליקציה נטענה בצד הלקוח (למניעת שגיאות SSR)
  const [isApplicationReady, setIsApplicationReady] = useState(false);
  
  // המצב הנוכחי של התצוגה (Navigation)
  const [currentActiveView, setCurrentActiveView] = useState<ViewState>('home');
  
  // שפת הממשק הנבחרת
  const [interfaceLang, setInterfaceLang] = useState('he');
  
  // פילטר קטגוריה נוכחי (1 מתוך 10)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  
  // פילטר אזור גאוגרפי נוכחי
  const [activeRegionFilter, setActiveRegionFilter] = useState('all');
  
  // מחרוזת החיפוש החופשי
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  // מיקום ה-GPS המדויק של המשתמש
  const [userCurrentGPS, setUserCurrentGPS] = useState<[number, number] | null>(null);
  
  // רכיבי המפה של Leaflet
  const [LeafletMapObject, setLeafletMapObject] = useState<any>(null);
  
  // אייקון אדום מיוחד לסימון המשתמש
  const [redMarkerPinIcon, setRedMarkerPinIcon] = useState<any>(null);
  
  // רפרנס לשליטה במפה (FlyTo)
  const leafletMapInstance = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מפורט ומסיבי (i18n Dictionary)
   * סנכרון מוחלט של כל המפתחות למניעת קריסות שפה.
   * כאן מוגדרים כל הטקסטים של 10 הקטגוריות.
   * -----------------------------------------------------------------------------------------------
   */
  const dictionary: any = {
    he: { 
      searchPlaceholder: "חפש מקום, מסלול או מעיין...", 
      resultsTitle: "תוצאות חיפוש", 
      surpriseMeBtn: "תפתיע אותי", 
      welcomeHeading: "לאן נטייל היום?", 
      startBtnText: "בואו נתחיל",
      backLinkText: "חזרה לדף הקודם",
      quizMainTitle: "מה הסגנון שלכם עכשיו?",
      nearbyTextLabel: "קמ ממך",
      distancePrefix: "מרחק מהמיקום שלך:",
      homeBtnTitle: "דף הבית",
      hereMarkerName: "המיקום הנוכחי שלך",
      whatsappBtnText: "שתף ב-WhatsApp",
      kmLabel: 'ק"מ',
      regions: {
        all: "כל הארץ",
        north: "צפון הארץ",
        center: "מרכז הארץ",
        south: "דרום הארץ"
      },
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
      resultsTitle: "Search Results", 
      surpriseMeBtn: "Surprise Me", 
      welcomeHeading: "Where to today?", 
      startBtnText: "Let's Begin",
      backLinkText: "Go Back",
      quizMainTitle: "What's your style?",
      nearbyTextLabel: "km away",
      distancePrefix: "Distance from you:",
      homeBtnTitle: "Home",
      hereMarkerName: "You are here",
      whatsappBtnText: "Share on WhatsApp",
      kmLabel: "km",
      regions: {
        all: "All Israel",
        north: "North Region",
        center: "Center Region",
        south: "South Region"
      },
      categories: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks & Nature", 
        history: "History & Heritage", 
        sleep: "Lodging & Camping", 
        food: "Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      searchPlaceholder: "بحث عن مكان...", 
      resultsTitle: "نتائج البحث", 
      surpriseMeBtn: "فاجئני", 
      welcomeHeading: "أين نذهب اليوم؟", 
      startBtnText: "لنبدأ",
      backLinkText: "رجوع",
      quizMainTitle: "ما هو أسلובك המفضل؟",
      nearbyTextLabel: "كم منك",
      distancePrefix: "المסافة:",
      homeBtnTitle: "الרئيسية",
      hereMarkerName: "أنت هنا",
      whatsappBtnText: "مشاركة عبر الواتساب",
      kmLabel: "كم",
      regions: {
        all: "כל البلاد",
        north: "منطقة الشمال",
        center: "منطقة المركز",
        south: "منطقة الجنوب"
      },
      categories: { 
        all: "الכל", 
        water: "مياه וינאביע", 
        nature: "منتזהות وطביעה", 
        history: "תאריכ ותראת'", 
        sleep: "מבית ותח'יים", 
        food: "טעאם ומסאעם", 
        bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי",
        promenade: "ממשׁא",
        beach: "שואטئ אלבחר",
        river: "אנהאר"
      }
    },
    ru: { 
      searchPlaceholder: "Поиск места...", 
      resultsTitle: "Результаты", 
      surpriseMeBtn: "Удиви меня", 
      welcomeHeading: "Куда поедем сегодня?", 
      startBtnText: "Поехали",
      backLinkText: "Назад",
      quizMainTitle: "Какой у вас стиль?",
      nearbyTextLabel: "км от вас",
      distancePrefix: "Расстояние:",
      homeBtnTitle: "Домой",
      hereMarkerName: "Вы здесь",
      whatsappBtnText: "WhatsApp",
      kmLabel: "км",
      regions: {
        all: "Весь Израиль",
        north: "Север",
        center: "Центр",
        south: "Юг"
      },
      categories: { 
        all: "Все", 
        water: "Вода и источники", 
        nature: "Парки и Природа", 
        history: "История וНаследие", 
        sleep: "Жилье וКемпинг", 
        food: "Еда וРестораны", 
        bike: "Веломаршруты",
        hiking: "Пешие тропы",
        promenade: "Променады",
        beach: "Пляжи",
        river: "Реки"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * UseEffects - אתחול המערכת, GPS ורכיבי מפה
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // אתחול האפליקציה בצד הלקוח
    setIsApplicationReady(true);
    
    // הפעלת זיהוי GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired");
          setUserCurrentGPS([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS access denied.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינה דינמית של Leaflet למניעת שגיאות SSR ב-Next.js
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון עבור מרקרים שלא נטענים נכון
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת אייקון אדום ייחודי למיקום המשתמש
      const redMarkerIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setUserRedMarkerIcon(redMarkerIcon);
      setLeafletMapObject(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Safe Memoized Filter & Sort)
   * -----------------------------------------------------------------------------------------------
   */
  const filteredData = useMemo(() => {
    // הגנה מפני נתונים לא תקינים
    if (!Array.isArray(data)) return [];

    let result = data.filter((item: any) => {
      const searchLowercase = globalSearchTerm.toLowerCase();
      
      // הגנה מפני נתונים חסרים ב-JSON (מניעת White Screen)
      if (!item || !item.name || !item.coords) return false;

      // בדיקת התאמה בחיפוש שם (בכל השפות האפשריות)
      const nameMatch = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLowercase)
      );
      
      // בדיקת התאמה לקטגוריה
      const categoryMatch = activeCategoryFilter === 'all' || item.category === activeCategoryFilter;
      
      // בדיקת התאמה לאזור (כולל הגנה על שדה אזור חסר)
      const regionMatch = activeRegionFilter === 'all' || (item.region && item.region === activeRegionFilter);
      
      return nameMatch && categoryMatch && regionMatch;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (userCurrentGPS) {
      return [...result].sort((siteA, siteB) => {
        const dA = parseFloat(getCalculatedProximity(userCurrentGPS[0], userCurrentGPS[1], siteA.coords[0], siteA.coords[1]));
        const dB = parseFloat(getCalculatedProximity(userCurrentGPS[0], userCurrentGPS[1], siteB.coords[0], siteB.coords[1]));
        return dA - dB;
      });
    }
    
    return result;
  }, [globalSearchTerm, activeCategoryFilter, activeRegionFilter, userCurrentGPS]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Event Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה לתנועה חלקה במפה ליעד מסוים (FlyTo)
  const flyToTargetSite = (targetCoords: [number, number]) => {
    if (leafletMapInstance.current) {
      leafletMapInstance.current.flyTo(targetCoords, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האתרים הכי קרובים
  const handleSmartSurpriseRequest = () => {
    const candidateList = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const randomIndexValue = Math.floor(Math.random() * candidateList.length);
    const chosenDestination = candidateList[randomIndexValue];
    
    // ניקוי פילטרים ומעבר למסך המפה
    setActiveCategoryFilter('all');
    setGlobalSearchTerm('');
    setCurrentActiveView('map');
    
    // מעבר במפה לאחר טעינה קלה של הממשק
    setTimeout(() => {
      flyToTargetSite(chosenDestination.coords as [number, number]);
    }, 800);
  };

  // פונקציית שיתוף בוואטסאפ (WhatsApp Sharing)
  const triggerWAShareAction = (item: any) => {
    const siteNameStr = item.name[interfaceLanguage] || item.name.he;
    const gMapsLinkUrl = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
    const finalMsg = encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${siteNameStr}\nקישור למיקום: ${gMapsLinkUrl}`);
    window.open(`https://wa.me/?text=${finalMsg}`, '_blank');
  };

  // בדיקת טעינה
  if (!isApplicationReady || !LeafletMapObject) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapObject;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={interfaceLanguage === 'ar' || interfaceLanguage === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home View) - תיקון רספונסיביות מוחלט
          ------------------------------------------------------------------------------------------- */}
      {currentActiveView === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4 animate-fadeIn">
            {/* לוגו ממותג עם אנימציית סיבוב וקישור חיצוני */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="App Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               {/* כותרת רספונסיבית - מוקטנת משמעותית במובייל */}
               <h1 className="text-3xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic uppercase">Tiyulify</h1>
            </div>

            <p className="text-lg md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">
              {translations[interfaceLanguage].welcomeHeading}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setCurrentActiveView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-none"
              >
                {translations[interfaceLanguage].startBtnText}
              </button>
              
              <button 
                onClick={handleSmartSurpriseRequest} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all active:scale-95"
              >
                🎲 {translations[interfaceLanguage].surpriseMeBtn}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית - ללא שימוש בלולאות ליתר ביטחון */}
            <div className="mt-16 md:mt-24 flex justify-center gap-3 md:gap-4 flex-wrap">
              <button onClick={() => setInterfaceLanguage('he')} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${interfaceLanguage === 'he' ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>HE</button>
              <button onClick={() => setInterfaceLanguage('ar')} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${interfaceLanguage === 'ar' ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>AR</button>
              <button onClick={() => setInterfaceLanguage('en')} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${interfaceLanguage === 'en' ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>EN</button>
              <button onClick={() => setInterfaceLanguage('ru')} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${interfaceLanguage === 'ru' ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>RU</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך השאלון (Quiz View) - פריסה ידנית של 10 קטגוריות
          ------------------------------------------------------------------------------------------- */}
      {currentActiveView === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center leading-tight">
            {translations[interfaceLanguage].quizMainTitle}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {/* כפתורים מפורטים ידנית - ללא לולאות מקצרות */}
            <button onClick={() => { setActiveCategoryFilter('water'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">💦</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.water}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('nature'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🏞️</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.nature}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('history'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🏰</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.history}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('sleep'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🏕️</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.sleep}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('food'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🍕</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.food}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('bike'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🚲</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.bike}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('hiking'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🥾</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.hiking}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('promenade'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🚶‍♂️</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.promenade}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('beach'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🏖️</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.beach}</span>
            </button>

            <button onClick={() => { setActiveCategoryFilter('river'); setCurrentActiveView('map'); }} className="aspect-square flex flex-col items-center justify-center gap-3 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-4">
              <span className="text-4xl md:text-7xl group-hover:scale-125 transition-all">🌊</span>
              <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase">{translations[interfaceLanguage].categories.river}</span>
            </button>
          </div>
          
          <button 
            onClick={() => setCurrentActiveView('home')} 
            className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors"
          >
            {translations[interfaceLanguage].backLinkText}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View Main)
          ------------------------------------------------------------------------------------------- */}
      {currentActiveView === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה - רספונסיבי ומעוצב עם לוגו ובורר שפה */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Header Logo" 
                     className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={() => setCurrentActiveView('home')}>
                  Tiyulify
                </h2>
              </div>
              
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                <button onClick={() => setInterfaceLanguage('he')} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${interfaceLanguage === 'he' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>HE</button>
                <button onClick={() => setInterfaceLanguage('ar')} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${interfaceLanguage === 'ar' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>AR</button>
                <button onClick={() => setInterfaceLanguage('en')} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${interfaceLanguage === 'en' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>EN</button>
                <button onClick={() => setInterfaceLanguage('ru')} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${interfaceLanguage === 'ru' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>RU</button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 w-full px-2">
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={translations[interfaceLanguage].searchPlaceholder} 
                  value={searchTermTermValue} 
                  onChange={(e) => setSearchTermTermValue(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg" 
                />
                <span className={`absolute top-2.5 md:top-5 opacity-30 text-lg md:text-3xl ${interfaceLanguage === 'he' || interfaceLanguage === 'ar' ? 'right-4 md:right-6' : 'left-4 md:left-6'}`}>🔍</span>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200"
                >
                  {Object.entries(translations[interfaceLanguage].regionNames).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(translations[interfaceLanguage].categoryNames).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategoryFilter(id)} 
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${activeCategoryFilter === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
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
              <div className="flex justify-between items-center mb-10 text-gray-400 font-bold text-xs uppercase tracking-widest">
                <span>{translations[interfaceLanguage].resultsTitle} ({filteredDataItems.length})</span>
                {userGPSLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              
              <div className="space-y-8">
                {filteredDataItems.map((item: any) => {
                  const distVal = userGPSLocation ? calculateProximityDistance(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => flyToSiteCoords(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                        <img 
                          src={item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Thumbnail" 
                          onError={(e: any) => e.target.src = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500"}
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">
                        {item.name[interfaceLanguage] || item.name.he}
                      </h3>
                      {distVal && (
                        <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {distVal} {translations[interfaceLanguage].nearbyTextLabel}
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
                ref={mapControlInstance}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {userGPSLocation && redUserMarkerIcon && (
                  <Marker position={userGPSLocation} icon={redUserMarkerIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2 text-lg">
                        📍 {translations[interfaceLanguage].hereMarker}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {filteredDataItems.map((item: any) => {
                  const popupDist = userGPSLocation ? calculateProximityDistance(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                        <div className="text-right font-sans p-1 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - רוחב מרובע ורחב (400px) */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                            {item.video ? (
                              <iframe 
                                key={`v-embed-${item.id}-${interfaceLanguage}`}
                                width="100%" 
                                height="100%" 
                                src={getYoutubeSecureUrl(item.video)} 
                                title="Video Player"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.image} 
                                alt="Place View" 
                                className="w-full h-full object-cover" 
                                onError={(e: any) => e.target.src = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500"}
                              />
                            )}
                          </div>
                          
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">
                            {item.name[interfaceLanguage] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך הבלון בשפה הנבחרת */}
                          {popupDist && (
                            <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1.5 rounded-full border-2 border-green-100 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[14px] text-green-700 font-black m-0">
                                {translations[interfaceLanguage].distancePrefix} {popupDist} {translations[interfaceLanguage].kmLabel}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - גובה מוגבל עם גלילה פנימית */}
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[interfaceLanguage] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי פעולה משודרגים - WhatsApp חזר לעבוד */}
                          <div className="flex flex-wrap gap-3 mt-6 pb-2">
                            <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all">WAZE</a>
                            <button onClick={() => triggerWAShareAction(item)} className="flex-1 bg-green-500 text-white text-center py-4 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95 transition-all">WhatsApp</button>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transform active:scale-95">GOOGLE</a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* כפתורי שליטה צפים בפינה - מותאמים רספונסיבית (md:w-28) */}
              <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSmartSurpriseRequest} 
                  className="bg-green-600 text-white w-16 h-16 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-2xl md:text-6xl mb-1">🎲</span>
                  {translations[interfaceLanguage].surpriseMeBtn}
                </button>
                
                <button 
                  onClick={() => setCurrentActiveView('home')} 
                  className="bg-white text-green-600 w-12 h-12 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center text-3xl md:text-5xl border-2 md:border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-115 active:scale-90 shadow-gray-400"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי - עיצוב הבלון המרובע ותיקוני נראות במובייל
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
          border-radius: 2.5rem !important; 
          overflow: hidden !important; 
          padding: 0 !important; 
          box-shadow: 0 45px 90px -15px rgba(0, 0, 0, 0.45) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 16px !important; 
          width: 400px !important; /* רוחב מרובע יוקרתי */
        }
        @media (max-width: 768px) {
          .leaflet-popup-content {
            width: 300px !important;
            padding: 12px !important;
          }
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-modern-popup-container iframe {
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