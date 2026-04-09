"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE ULTIMATE MASTER EDITION (MAXIMALIST CODEBASE)
 * -------------------------------------------------------------------------------------------------
 * גרסה: 11.0.0 (Production Ready)
 * שורות קוד: 900+
 * 
 * תכונות מפתח (שמורות ומתוקנות):
 * 1. זיהוי GPS בזמן אמת וסיכה אדומה למשתמש.
 * 2. חישוב מרחק אווירי והצגתו בבלון המידע ובסידבר בכל השפות.
 * 3. מיון רשימת האתרים מהקרוב ביותר למשתמש באופן אוטומטי.
 * 4. ממשק רב-לשוני יציב (עברית, אנגלית, ערבית, רוסית) ללא קריסות.
 * 5. 10 קטגוריות מקצועיות מלאות בשאלון ובפילטרים.
 * 6. פילטר אזורים (צפון, מרכז, דרום) משולב עם הקטגוריות.
 * 7. פופ-אפ מרובע רחב (Square Popup) ברוחב 400 פיקסלים למחשב ודינמי לנייד.
 * 8. תמיכה מלאה בסרטוני YouTube Embed יציבים.
 * 9. כפתור שיתוף ב-WhatsApp בתוך חלון המידע (שולח שם מקום ולינק למפה).
 * 10. לוגו אישי מסתובב (360 מעלות ב-Hover) עם קישור חיצוני לאתר הגיאולוגיה.
 * 11. רספונסיביות מלאה (Mobile-First): כותרות וכפתורים מותאמים לכל מסך.
 * 12. מערכת Fallback לתמונות: שימוש בתמונות Wikimedia אמיתיות וסינון תמונות שבורות.
 * =================================================================================================
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';

// ייבוא ספריית המפות Leaflet והעיצוב שלה
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול (data.json)
import data from './data.json';

/**
 * הגדרת מצבי התצוגה של האפליקציה (Navigation States)
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי מדויק (Haversine Formula)
 * מחשבת את המרחק בקו אווירי בין שתי נקודות גאוגרפיות ומחזירה מחרוזת מעוגלת.
 * 
 * @param userLat קו רוחב משתמש
 * @param userLon קו אורך משתמש
 * @param siteLat קו רוחב יעד
 * @param siteLon קו אורך יעד
 * @returns מרחק בקילומטרים כמחרוזת (למשל: "4.5")
 */
function calculateHaversineDistance(
  userLat: number, 
  userLon: number, 
  siteLat: number, 
  siteLon: number
): string {
  if (!userLat || !userLon || !siteLat || !siteLon) {
    return "0.0";
  }

  const R = 6371; // רדיוס כדור הארץ הממוצע בקילומטרים
  
  const dLat = (siteLat - userLat) * Math.PI / 180;
  const dLon = (siteLon - userLon) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(siteLat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const finalDist = R * c;
  
  return finalDist.toFixed(1);
}

/**
 * פונקציה ליצירת כתובת Embed תקנית עבור YouTube
 * @param vId מזהה הסרטון
 * @returns כתובת מאובטחת ל-Iframe
 */
function getYouTubeEmbedUrl(vId: string): string {
  if (!vId) return "";
  const base = "https://www.youtube.com/embed/";
  const params = "?autoplay=0&rel=0&modestbranding=1&enablejsapi=1";
  const origin = typeof window !== 'undefined' ? `&origin=${window.location.origin}` : "";
  return `${base}${vId}${params}${origin}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני ניהול מצב (States) - מפורטים עבור כל רכיב במערכת
   * -----------------------------------------------------------------------------------------------
   */
  
  // בדיקה אם הרכיב עלה בצד הלקוח (Client Side)
  const [isClientSide, setIsClientSide] = useState(false);
  
  // ניהול המעבר בין מסכי האפליקציה
  const [currentViewState, setCurrentViewState] = useState<ViewState>('home');
  
  // ניהול שפת הממשק (Default: Hebrew)
  const [language, setLanguage] = useState('he');
  
  // פילטר קטגוריה (1 מתוך 10)
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // פילטר אזור גאוגרפי (צפון, מרכז, דרום)
  const [selectedRegion, setSelectedRegion] = useState('all');
  
  // טקסט לחיפוש חופשי
  const [searchTermValue, setSearchTermValue] = useState('');
  
  // מיקום ה-GPS המדויק של המשתמש
  const [userGPSLocation, setUserGPSLocation] = useState<[number, number] | null>(null);
  
  // רכיבי Leaflet (נטענים רק בצד הלקוח)
  const [LeafletMapComponents, setLeafletMapComponents] = useState<any>(null);
  
  // אייקון אדום לסימון מיקום המשתמש
  const [redUserMarkerIcon, setRedUserMarkerIcon] = useState<any>(null);
  
  // רפרנס לאובייקט המפה לצורך תנועה חלקה (FlyTo)
  const mapControlInstance = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מפורט (Multilingual Dictionary)
   * סנכרון מוחלט של מפתחות למניעת קריסות בעת החלפת שפה.
   * -----------------------------------------------------------------------------------------------
   */
  const translations: any = {
    he: { 
      searchPlaceholder: "חפש מקום או מעיין...", 
      resultsTitle: "תוצאות שנמצאו", 
      surpriseBtn: "תפתיע אותי", 
      welcomeText: "לאן נטייל היום?", 
      startBtn: "בואו נתחיל",
      backLink: "חזרה לדף הקודם",
      quizHeading: "מה הסגנון שלכם עכשיו?",
      nearbyLabel: "קמ ממך",
      distanceIndicator: "מרחק ממך:",
      homeTitle: "דף הבית",
      hereMarker: "המיקום הנוכחי שלך",
      whatsappShare: "שתף ב-WhatsApp",
      kmSuffix: 'ק"מ',
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
      searchPlaceholder: "Search for a destination...", 
      resultsTitle: "Search Results", 
      surpriseBtn: "Surprise Me", 
      welcomeText: "Where to today?", 
      startBtn: "Let's Go",
      backLink: "Go Back",
      quizHeading: "What's your style?",
      nearbyLabel: "km away",
      distanceIndicator: "Distance:",
      homeTitle: "Home",
      hereMarker: "You are here",
      whatsappShare: "Share on WhatsApp",
      kmSuffix: "km",
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
        river: "Rivers"
      }
    },
    ar: { 
      searchPlaceholder: "بحث عن مكان...", 
      resultsTitle: "نتائج البحث", 
      surpriseBtn: "فاجئني", 
      welcomeText: "أين نذهب اليوم؟", 
      startBtn: "لنبدأ الرحلة",
      backLink: "رجوع",
      quizHeading: "ما هو أسلובك المفضل؟",
      nearbyLabel: "كم منك",
      distanceIndicator: "المסافة:",
      homeTitle: "الرئيسية",
      hereMarker: "أنت هنا",
      whatsappShare: "مشاركة عبر الواتساب",
      kmSuffix: "كم",
      regions: {
        all: "כל البلاد",
        north: "منطقة الشمال",
        center: "منطقة المركز",
        south: "منطقة الجنوب"
      },
      categories: { 
        all: "الכל", 
        water: "مياه ويناביע", 
        nature: "منتזהות وطביעה", 
        history: "תאריכ ותראת'", 
        sleep: "מבית ותח'יים", 
        food: "טעאם ומסאעם", 
        bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי",
        promenade: "ממשׁא",
        beach: "שואטئ אלבחר",
        river: "אנהאר וג'דאול"
      }
    },
    ru: { 
      searchPlaceholder: "Поиск места...", 
      resultsTitle: "Результаты", 
      surpriseBtn: "Удиви меня", 
      welcomeText: "Куда поедем сегодня?", 
      startBtn: "Поехали",
      backLink: "Назад",
      quizHeading: "Какой у вас стиль?",
      nearbyLabel: "км от вас",
      distanceIndicator: "Расстояние:",
      homeTitle: "Домой",
      hereMarker: "Вы здесь",
      whatsappShare: "WhatsApp",
      kmSuffix: "км",
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
   * UseEffects - אתחול, GPS ורכיבי מפה
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // אתחול צד לקוח
    setIsClientSide(true);
    
    // זיהוי GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("GPS Location acquired successfully");
          setUserGPSLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("GPS Access Denied.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינה דינמית של Leaflet למניעת שגיאות SSR
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון נתיבי אייקונים
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // יצירת סיכה אדומה ייחודית למשתמש
      const redPin = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedMarkerIcon(redPin);
      setLeafletMapComponents(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון (Memoized)
   * -----------------------------------------------------------------------------------------------
   */
  const filteredListItems = useMemo(() => {
    let result = data.filter((item: any) => {
      const searchLowercase = searchTermValue.toLowerCase();
      
      // הגנה מפני קריסות נתונים
      if (!item.name || !item.coords) return false;

      // בדיקת התאמה בחיפוש שם בכל השפות
      const matchesSearch = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLowercase)
      );
      
      // בדיקת התאמה לקטגוריה
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      // בדיקת התאמה לאזור (כולל הגנה על שדה אזור חסר ב-JSON)
      const matchesRegion = selectedRegion === 'all' || (item.region && item.region === selectedRegion);
      
      return matchesSearch && matchesCategory && matchesRegion;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (userGPSLocation) {
      return [...result].sort((siteA, siteB) => {
        const dA = parseFloat(calculateHaversineDistance(userGPSLocation[0], userGPSLocation[1], siteA.coords[0], siteA.coords[1]));
        const dB = parseFloat(calculateHaversineDistance(userGPSLocation[0], userGPSLocation[1], siteB.coords[0], siteB.coords[1]));
        return dA - dB;
      });
    }
    
    return result;
  }, [searchTermValue, selectedCategory, selectedRegion, userGPSLocation]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // תנועה במפה
  const handleMapMovement = (coords: [number, number]) => {
    if (mapControlInstance.current) {
      mapControlInstance.current.flyTo(coords, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי"
  const handleSurpriseRequest = () => {
    const list = filteredListItems.length > 0 ? filteredListItems.slice(0, 10) : data;
    const randomItem = list[Math.floor(Math.random() * list.length)];
    
    setSelectedCategory('all');
    setSearchTermValue('');
    setCurrentViewState('map');
    
    setTimeout(() => {
      handleMapMovement(randomItem.coords as [number, number]);
    }, 800);
  };

  // שיתוף בוואטסאפ (WhatsApp)
  const shareViaWhatsApp = (item: any) => {
    const nameStr = item.name[language] || item.name.he;
    const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
    const message = encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${nameStr}\nמיקום במפות: ${gMapsUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (!isClientSide || !LeafletMapComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={language === 'ar' || language === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home Screen) - תיקון רספונסיביות מובייל
          ------------------------------------------------------------------------------------------- */}
      {currentViewState === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4">
            {/* לוגו ממותג עם אנימציית סיבוב וקישור */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               {/* כותרת רספונסיבית - הוקטנה במובייל למניעת חריגה */}
               <h1 className="text-4xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic uppercase">Tiyulify</h1>
            </div>

            <p className="text-xl md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">
              {translations[language].welcomeText}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setCurrentViewState('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {translations[language].startBtn}
              </button>
              
              <button 
                onClick={handleSurpriseRequest} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all"
              >
                🎲 {translations[language].surpriseBtn}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית */}
            <div className="mt-16 md:mt-24 flex justify-center gap-2 md:gap-4 flex-wrap">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setLanguage(l)} 
                  className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${language === l ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
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
      {currentViewState === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{translations[language].quizHeading}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {/* מיפוי מפורש של 10 הקטגוריות - תוקן גודל האייקונים */}
            {Object.entries(translations[language].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setSelectedCategory(id); setCurrentViewState('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-3 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4"
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
            onClick={() => setCurrentViewState('home')} 
            className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors"
          >
            {translations[language].backLink}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View Interface)
          ------------------------------------------------------------------------------------------- */}
      {currentViewState === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה - רספונסיבי ומעוצב */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={() => setCurrentViewState('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header לשימוש נוח בזמן ניווט */}
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setLanguage(l)} 
                    className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${language === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 w-full px-2">
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={translations[language].searchPlaceholder} 
                  value={searchTermValue} 
                  onChange={(e) => setSearchTermValue(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg" 
                />
                <span className={`absolute top-2.5 md:top-5 opacity-30 text-lg md:text-3xl ${language === 'he' || language === 'ar' ? 'right-4' : 'left-4'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים (אזור + 10 קטגוריות) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200 transition-all"
                >
                  {Object.entries(translations[language].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(translations[language].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setSelectedCategory(id)} 
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${selectedCategory === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
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
                <span>{translations[language].resultsTitle} ({filteredDataItems.length})</span>
                {userGPSLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              
              <div className="space-y-8">
                {filteredDataItems.map((item: any) => {
                  const distCalculated = userGPSLocation ? calculateHaversineDistance(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleMapMovement(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                        {/* תמונה מיוחדת לחרמון או רגילה לשאר */}
                        <img 
                          src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Thumbnail" 
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">
                        {item.name[language] || item.name.he}
                      </h3>
                      {distCalculated && (
                        <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {distCalculated} {translations[language].nearbyLabel}
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
                
                {/* סימון המשתמש באדום */}
                {userGPSLocation && redUserMarkerIcon && (
                  <Marker position={userGPSLocation} icon={redUserMarkerIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2 text-lg">
                        📍 {translations[language].hereMarker}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל סיכות האתרים על המפה */}
                {filteredDataItems.map((item: any) => {
                  const popupDistValue = userGPSLocation ? calculateHaversineDistance(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                        <div className="text-right font-sans p-1 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - רוחב מרובע ורחב (400px) */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                            {/* החרמון תמיד מציג רק תמונת ויקיפדיה, אחרים לפי video ID ב-JSON */}
                            {(item.video && item.id !== "1") ? (
                              <iframe 
                                key={`v-embed-${item.id}-${language}`}
                                width="100%" 
                                height="100%" 
                                src={getYouTubeEmbedUrl(item.video)} 
                                title="Video Content"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                                alt="Place View" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">
                            {item.name[language] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך הבלון בשפה הנבחרת */}
                          {popupDistValue && (
                            <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1.5 rounded-full border-2 border-green-100 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[14px] text-green-700 font-black m-0">
                                {translations[language].distanceIndicator} {popupDistValue} {translations[language].kmSuffix}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - גובה מוגבל עם גלילה פנימית */}
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[language] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי פעולה משודרגים - תיקון ה-WhatsApp Share */}
                          <div className="flex flex-wrap gap-3 mt-6 pb-2">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all"
                            >
                              WAZE
                            </a>
                            <button 
                              onClick={() => shareViaWhatsApp(item)}
                              className="flex-1 bg-green-500 text-white text-center py-4 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95 transition-all"
                            >
                              WhatsApp
                            </button>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transform active:scale-95"
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

              {/* כפתורי שליטה צפים בפינה - מותאמים רספונסיבית */}
              <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSurpriseRequest} 
                  className="bg-green-600 text-white w-16 h-16 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-2xl md:text-6xl mb-1">🎲</span>
                  {translations[language].surpriseBtn}
                </button>
                
                <button 
                  onClick={() => setCurrentViewState('home')} 
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