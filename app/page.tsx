"use client";

/**
 * =================================================================================================
 * TIYULIFY - ה-CODEBASE המלא, המפורט והמורחב ביותר
 * גרסה: 4.0.0 (Ultimate Verbose Edition)
 * מטרת הקוד: ניהול אפליקציית טיולים רב-לשונית עם GPS, וידאו ותצוגה מתקדמת.
 * שורות קוד יעד: 750+
 * =================================================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// ייבוא הנתונים מקובץ ה-JSON
import data from './data.json';

/**
 * הגדרת טיפוסים (Types) עבור מצבי האפליקציה השונים
 * משמש לניהול המעברים בין מסך הבית, השאלון והמפה.
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה מקצועית לחישוב מרחק אווירי (Haversine Formula)
 * מחשבת את המרחק הגיאוגרפי המדויק בקילומטרים בין המשתמש לנקודת הציון.
 * 
 * @param lat1 קו רוחב של המשתמש (Latitude)
 * @param lon1 קו אורך של המשתמש (Longitude)
 * @param lat2 קו רוחב של היעד (Destination Latitude)
 * @param lon2 קו אורך של היעד (Destination Longitude)
 * @returns מחרוזת המייצגת את המרחק בקילומטרים מעוגל לספרה אחת אחרי הנקודה
 */
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // רדיוס ממוצע של כדור הארץ בקילומטרים
  
  // המרת מעלות לרדיאנים
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  // חישוב מתמטי לפי נוסחת האברסין
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const finalDistanceResult = R * c;
  
  // החזרת המרחק בפורמט נוח לקריאה
  return finalDistanceResult.toFixed(1);
}

/**
 * פונקציה לתיקון פורמט ה-URL של יוטיוב
 * מוודאת שהסרטון יוצג כראוי בתוך iframe ללא חסימות דפדפן
 */
function formatYoutubeUrl(videoId: string) {
  if (!videoId) return null;
  // אם מדובר רק ב-ID, נבנה את הלינק המלא
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`;
}

export default function TiyulifyApp() {
  // -----------------------------------------------------------------------------------------------
  // משתני ניהול מצב (States) - מפורטים בפירוט רב
  // -----------------------------------------------------------------------------------------------
  
  // מצב טעינת צד לקוח
  const [isClientReady, setIsClientReady] = useState(false);
  
  // מצב התצוגה הנוכחי (בית/שאלון/מפה)
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // בחירת שפת הממשק (Default: עברית)
  const [currentLanguage, setCurrentLanguage] = useState('he');
  
  // קטגוריה פעילה לסינון
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  
  // אזור גיאוגרפי פעיל לסינון
  const [activeRegionFilter, setActiveRegionFilter] = useState('all');
  
  // מחרוזת החיפוש החופשי
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  // מיקום המשתמש (קואורדינטות GPS)
  const [userGPSCoords, setUserGPSCoords] = useState<[number, number] | null>(null);
  
  // רכיבי Leaflet הנטענים דינמית
  const [LeafletMapComponents, setLeafletMapComponents] = useState<any>(null);
  
  // אייקון אדום מיוחד לסימון המשתמש
  const [userLocationIcon, setUserLocationIcon] = useState<any>(null);
  
  // רפרנס למפה לצורך ביצוע FlyTo
  const mapInstanceRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא (i18n Dictionary)
   * כולל פירוט מלא של 10 קטגוריות עבור כל שפה בנפרד (HE, EN, AR, RU)
   * -----------------------------------------------------------------------------------------------
   */
  const uiTranslation: any = {
    he: { 
      searchPlaceholder: "חפש מקום, מעיין או מסלול...",
      resultsTitle: "תוצאות חיפוש",
      surpriseBtn: "תפתיע אותי",
      welcomeMsg: "לאן נטייל היום?",
      startBtn: "בואו נתחיל",
      backLink: "חזרה לדף הקודם",
      styleQuestion: "מה הסגנון שלכם עכשיו?",
      nearbyText: "קמ ממך",
      distancePrefix: "מרחק מהמיקום שלך:",
      homeBtn: "דף הבית",
      userMarkerTitle: "המיקום הנוכחי שלך",
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
      searchPlaceholder: "Search for a place...",
      resultsTitle: "Results Found",
      surpriseBtn: "Surprise Me",
      welcomeMsg: "Where shall we go today?",
      startBtn: "Let's Begin",
      backLink: "Go Back",
      styleQuestion: "What is your style today?",
      nearbyText: "km from you",
      distancePrefix: "Distance from you:",
      homeBtn: "Home",
      userMarkerTitle: "You are here",
      kmSuffix: "km",
      regions: {
        all: "All Israel",
        north: "North Region",
        center: "Center Region",
        south: "South Region"
      },
      categories: { 
        all: "All Categories", 
        water: "Water & Springs", 
        nature: "Parks, Nature & Views", 
        history: "Historical Sites", 
        sleep: "Camping & Lodging", 
        food: "Food & Restaurants", 
        bike: "Bicycle Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Sea & Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      searchPlaceholder: "ابحث عن مكان...",
      resultsTitle: "نتائج البحث",
      surpriseBtn: "فاجئني",
      welcomeMsg: "أين نذهب اليوم؟",
      startBtn: "لنبدأ الرحلة",
      backLink: "رجوع",
      styleQuestion: "ما هو أسلوبك المفضل؟",
      nearbyText: "كم منك",
      distancePrefix: "المسافة من موقعك:",
      homeBtn: "الرئيسية",
      userMarkerTitle: "موقعك الحالي",
      kmSuffix: "كم",
      regions: {
        all: "كل البلاد",
        north: "منطقة الشمال",
        center: "منطقة المركز",
        south: "منطقة الجنوب"
      },
      categories: { 
        all: "الكل", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ وتراث", 
        sleep: "مبيت ותחיים", 
        food: "طعام ومطاعم", 
        bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי",
        promenade: "ממשׁא סייאחי",
        beach: "שואטئ אלבחר",
        river: "אנהאר וג'דאול"
      }
    },
    ru: { 
      searchPlaceholder: "Поиск места...",
      resultsTitle: "Результаты",
      surpriseBtn: "Удиви меня",
      welcomeMsg: "Куда поедем сегодня?",
      startBtn: "Поехали",
      backLink: "Назад",
      styleQuestion: "Какой у вас стиль?",
      nearbyText: "км от вас",
      distancePrefix: "Расстояние до вас:",
      homeBtn: "Домой",
      userMarkerTitle: "Вы здесь",
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
        nature: "Парки и природа", 
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
   * אפקטים (Effects) - אתחול המערכת
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // סימון שהצד לקוח מוכן
    setIsClientReady(true);
    
    // ניסיון קבלת מיקום המשתמש בזמן אמת מהדפדפן
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGPSCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS Access Denied. Proximity features will be limited.", err);
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת רכיבי Leaflet בצורה דינמית (מתקן בעיות Next.js)
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון עבור מרקרים של Leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת אייקון אדום בולט עבור מיקום המשתמש
      const redMarkerIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setUserLocationIcon(redMarkerIcon);
      setLeafletMapComponents(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון (Memoized Data)
   * מסננת את הנתונים לפי כל הפילטרים וממיינת לפי מרחק GPS
   * -----------------------------------------------------------------------------------------------
   */
  const processedFilteredData = useMemo(() => {
    let resultOfFilter = data.filter((place: any) => {
      const searchLowercase = globalSearchTerm.toLowerCase();
      
      // בדיקת התאמה בשם המקום בכל השפות האפשריות
      const matchesSearchName = Object.values(place.name).some(nameStr => 
        String(nameStr).toLowerCase().includes(searchLowercase)
      );
      
      // בדיקת קטגוריה
      const matchesCategory = activeCategoryFilter === 'all' || place.category === activeCategoryFilter;
      
      // בדיקת אזור גאוגרפי
      const matchesRegion = activeRegionFilter === 'all' || place.region === activeRegionFilter;
      
      return matchesSearchName && matchesCategory && matchesRegion;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (userGPSCoords) {
      return [...resultOfFilter].sort((a, b) => {
        const distA = parseFloat(getDistanceInKm(userGPSCoords[0], userGPSCoords[1], a.coords[0], a.coords[1]));
        const distB = parseFloat(getDistanceInKm(userGPSCoords[0], userGPSCoords[1], b.coords[0], b.coords[1]));
        return distA - distB;
      });
    }
    
    return resultOfFilter;
  }, [globalSearchTerm, activeCategoryFilter, activeRegionFilter, userGPSCoords]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה להזזת המפה בפורמט אנימציה חלק (Smooth FlyTo)
  const flyToLocation = (targetCoords: [number, number]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(targetCoords, 14, {
        animate: true,
        duration: 2.0
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האופציות הקרובות ביותר
  const triggerSurpriseAction = () => {
    const candidatePool = processedFilteredData.length > 0 ? processedFilteredData.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    const chosenPlace = candidatePool[randomIndex];
    
    // ניקוי פילטרים ומעבר למפה
    setActiveCategoryFilter('all');
    setGlobalSearchTerm('');
    setCurrentView('map');
    
    // מעבר חלק במפה
    setTimeout(() => {
      flyToLocation(chosenPlace.coords as [number, number]);
    }, 800);
  };

  // בדיקת מוכנות הרכיבים
  if (!isClientReady || !LeafletMapComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={currentLanguage === 'ar' || currentLanguage === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          תצוגת מסך הבית (Home View)
          ------------------------------------------------------------------------------------------- */}
      {currentView === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
          
          <div className="relative z-10 animate-fadeIn">
            {/* לוגו מרכזי עם קישור ואנימציית סיבוב Hover */}
            <div className="flex items-center justify-center gap-8 mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Main Logo" 
                   className="w-32 h-32 rounded-full border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-3xl font-light mb-16 opacity-90 drop-shadow-lg italic">
              {uiTranslation[currentLanguage].welcomeMsg}
            </p>
            
            <div className="flex flex-col gap-6 w-80 mx-auto">
              <button 
                onClick={() => setCurrentView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-6 rounded-3xl font-bold text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {uiTranslation[currentLanguage].startBtn}
              </button>
              
              <button 
                onClick={triggerSurpriseAction} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-5 rounded-3xl font-bold text-xl shadow-xl transition-all hover:scale-105"
              >
                🎲 {uiTranslation[currentLanguage].surpriseBtn}
              </button>
            </div>
            
            {/* בורר שפות במסך הכניסה */}
            <div className="mt-24 flex justify-center gap-4">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setCurrentLanguage(l)} 
                  className={`px-7 py-3 rounded-2xl font-bold border-2 transition-all ${currentLanguage === l ? 'bg-green-600 border-green-600 shadow-2xl scale-115 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת השאלון (Quiz View - 10 Categories)
          ------------------------------------------------------------------------------------------- */}
      {currentView === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
          <h2 className="text-6xl font-black text-gray-800 mb-16 drop-shadow-sm">{uiTranslation[currentLanguage].styleQuestion}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full max-w-7xl p-6">
            {/* מיפוי 10 הקטגוריות המקצועיות */}
            {Object.entries(uiTranslation[currentLanguage].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategoryFilter(id); setCurrentView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-6 bg-white hover:bg-green-50 rounded-[3.5rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-10"
              >
                <span className="text-8xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-xl leading-tight uppercase tracking-tight">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setCurrentView('home')} 
            className="mt-20 text-green-700 font-bold underline text-2xl hover:text-green-900 transition-colors"
          >
            {uiTranslation[currentLanguage].backLink}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View)
          ------------------------------------------------------------------------------------------- */}
      {currentView === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header עליון של המפה */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-5 flex flex-col gap-5 z-[2000] shadow-2xl">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-8">
                {/* לוגו ב-Header עם אנימציית סיבוב וקישור */}
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Header Logo" 
                     className="w-16 h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-5xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setCurrentView('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה קבוע לשליטה מלאה בכל שלב */}
              <div className="flex gap-2 bg-gray-100 p-2.5 rounded-2xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setCurrentLanguage(l)} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${currentLanguage === l ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full px-4">
              {/* תיבת חיפוש מקומות חכמה */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={uiTranslation[currentLanguage].searchPlaceholder} 
                  value={globalSearchTerm} 
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-[2rem] py-5 px-16 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-lg" 
                />
                <span className={`absolute top-5 opacity-40 text-3xl ${currentLanguage === 'he' || currentLanguage === 'ar' ? 'right-6' : 'left-6'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים אזוריים וקטגוריאליים */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                {/* בחירת אזור דרופ-דאון */}
                <select 
                  value={activeRegionFilter}
                  onChange={(e) => setActiveRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-8 py-4 rounded-[2rem] text-md outline-none border-none cursor-pointer shadow-lg hover:bg-blue-200 transition-all"
                >
                  {Object.entries(uiTranslation[currentLanguage].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {/* רשימת כפתורי קטגוריות לסינון מהיר */}
                {Object.entries(uiTranslation[currentLanguage].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategoryFilter(id)} 
                    className={`px-8 py-4 rounded-[2rem] text-sm font-black whitespace-nowrap transition-all ${activeCategoryFilter === id ? 'bg-green-600 text-white shadow-2xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar רשימת תוצאות - Desktop Only */}
            <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-10">
                <span className="text-lg font-black text-gray-400 uppercase tracking-widest">
                  {uiTranslation[currentLanguage].resultsTitle} ({processedFilteredData.length})
                </span>
                {userGPSCoords && (
                  <span className="text-[14px] bg-green-100 text-green-700 px-5 py-2 rounded-full font-black flex items-center gap-2 shadow-inner border border-green-200">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-8">
                {processedFilteredData.map((item: any) => {
                  const distCalculated = userGPSCoords ? getDistanceInKm(userGPSCoords[0], userGPSCoords[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => flyToLocation(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-48 w-full mb-5 rounded-[2.5rem] overflow-hidden shadow-md">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.name[currentLanguage]} />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-4 leading-tight">
                        {item.name[currentLanguage] || item.name.he}
                      </h3>
                      {distCalculated && (
                        <p className="text-[14px] text-green-600 font-black mt-4 px-4 flex items-center gap-2">
                          <span className="text-xl">🚀</span> {distCalculated} {uiTranslation[currentLanguage].nearbyText}
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
                ref={mapRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* הצגת מיקום המשתמש עם סיכה אדומה */}
                {userGPSCoords && userLocationIcon && (
                  <Marker position={userGPSCoords} icon={userLocationIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-3 text-lg">
                        📍 {uiTranslation[currentLanguage].userMarkerTitle}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל סיכות האתרים על המפה */}
                {processedFilteredData.map((item: any) => {
                  const itemDistanceVal = userGPSCoords ? getDistanceInKm(userGPSCoords[0], userGPSCoords[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={400} maxWidth={400} className="square-modern-popup">
                        <div className="text-right font-sans p-2">
                          
                          {/* תצוגת וידאו או תמונה - תיקון ה-Iframe והרוחב המרובע */}
                          <div className="w-full mb-5 shadow-2xl rounded-[2rem] overflow-hidden bg-black aspect-video relative border-4 border-white">
                            {item.video ? (
                              <iframe 
                                key={`vid-player-${item.id}-${currentLanguage}`}
                                width="100%" 
                                height="100%" 
                                src={formatYoutubeUrl(item.video) || ""} 
                                title={item.name[currentLanguage]}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.image} 
                                alt="Place" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          {/* שם המקום בכותרת בולטת */}
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-tight mb-4 px-1">
                            {item.name[currentLanguage] || item.name.he}
                          </h4>

                          {/* מרחק בתוך הבלון (Popup) בשפה הנבחרת */}
                          {itemDistanceVal && (
                            <div className="flex items-center gap-3 mb-5 bg-green-100 inline-flex px-6 py-2.5 rounded-full border-2 border-green-200 shadow-md">
                              <span className="text-xl">📍</span>
                              <p className="text-[16px] text-green-800 font-black m-0">
                                {uiTranslation[currentLanguage].distancePrefix} {itemDistanceVal} {uiTranslation[currentLanguage].kmSuffix}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - מוגבל בגובה למראה מרובע ומסודר */}
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-3 pt-5 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[currentLanguage] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי ניווט רחבים ומעוצבים */}
                          <div className="flex gap-4 mt-10">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-5 rounded-[1.5rem] text-sm font-black no-underline shadow-xl hover:bg-blue-700 transition-all transform active:scale-95"
                            >
                              WAZE
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-800 text-center py-5 rounded-[1.5rem] text-sm font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transition-all transform active:scale-95"
                            >
                              GOOGLE MAPS
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* כפתורי בקרה צפים על המפה בפינה */}
              <div className="absolute bottom-12 left-12 z-[2000] flex flex-col gap-6">
                <button 
                  onClick={triggerSurpriseAction} 
                  className="bg-green-600 text-white w-32 h-32 rounded-full shadow-2xl flex flex-col items-center justify-center text-[13px] font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-6xl mb-1">🎲</span>
                  {uiTranslation[currentLanguage].surpriseBtn}
                </button>
                
                <button 
                  onClick={() => setCurrentView('home')} 
                  className="bg-white text-green-600 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center text-6xl border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-115 active:scale-90 shadow-gray-400"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי (תיקוני מפה, אנימציות ופרופורציות)
          ------------------------------------------------------------------------------------------- */}
      <style jsx global>{`
        /* תיקון מיקום המרקרים של Leaflet */
        .leaflet-marker-icon { 
          margin-top: -34px !important; 
          margin-left: -12px !important; 
        }
        
        /* הסתרת סקולבאר למראה נקי */
        .no-scrollbar::-webkit-scrollbar { 
          display: none; 
        }
        
        /* עיצוב רחב ומרובע לבלוני המידע (Popup) */
        .leaflet-popup-content-wrapper { 
          border-radius: 3.5rem !important; 
          overflow: hidden !important; 
          padding: 0 !important; 
          box-shadow: 0 45px 90px -15px rgba(0, 0, 0, 0.45) !important;
        }
        
        /* הגדרת רוחב מרובע לבלון */
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 30px !important; 
          width: 400px !important;
        }
        
        /* הסרת המשולש בתחתית הבלון למראה מודרני צף */
        .leaflet-popup-tip-container {
          display: none;
        }
        
        /* הבטחת אינטראקטיביות של סרטונים */
        .square-modern-popup iframe {
          pointer-events: auto !important;
          border-radius: 2.5rem !important;
        }
        
        /* אנימציות מעבר */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}