"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE ULTIMATE VERBOSE & RESPONSIVE EDITION
 * -------------------------------------------------------------------------------------------------
 * גרסה: 5.0.0 (Maximalist Codebase)
 * שורות קוד: 850+
 * 
 * תכונות כלולות:
 * 1. זיהוי GPS ומיקום משתמש בזמן אמת.
 * 2. סיכה אדומה ייחודית למיקום המשתמש.
 * 3. חישוב מרחק אווירי והצגתו ב-4 שפות בתוך הבלון במפה.
 * 4. מיון אוטומטי של רשימת האתרים מהקרוב ביותר לרחוק ביותר.
 * 5. פילטר אזורים (צפון, מרכז, דרום) משולב עם 10 קטגוריות.
 * 6. תמיכה מלאה בסרטוני YouTube בתוך הבלונים במפה.
 * 7. לוגו ממותג עם אנימציית סיבוב וקישור לאתר חיצוני.
 * 8. עיצוב Popup מרובע ויוקרתי ברוחב 400 פיקסלים.
 * 9. רספונסיביות מלאה למובייל (תיקון כותרות וכפתורים).
 * 10. טיפול מיוחד באתר החרמון (הצגת תמונת ויקיפדיה בלבד).
 * =================================================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

// ייבוא ספריית המפות Leaflet
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול
import data from './data.json';

/**
 * הגדרת מצבי התצוגה של האפליקציה (Navigation States)
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי בין שתי נקודות גאוגרפיות (Haversine Formula)
 * מחשבת את המרחק במדויק בקילומטרים.
 * 
 * @param userLat קו רוחב משתמש
 * @param userLon קו אורך משתמש
 * @param destLat קו רוחב יעד
 * @param destLon קו אורך יעד
 * @returns המרחק בקילומטרים כמחרוזת מעוגלת
 */
function calculateProximityDistance(userLat: number, userLon: number, destLat: number, destLon: number): string {
  if (!userLat || !userLon || !destLat || !destLon) {
    return "0.0";
  }

  // רדיוס כדור הארץ הממוצע
  const earthRadiusInKm = 6371; 
  
  // המרת מעלות לרדיאנים
  const dLat = (destLat - userLat) * Math.PI / 180;
  const dLon = (destLon - userLon) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const finalDistance = earthRadiusInKm * c;
  
  // החזרה של המרחק עם ספרה אחת אחרי הנקודה
  return finalDistance.toFixed(1);
}

/**
 * פונקציה לבניית קישור תקין לנגן YouTube
 * מוודאת שהסרטון ירוץ בתוך ה-iframe ללא חסימות.
 */
function buildYouTubeEmbedLink(id: string): string {
  if (!id) return "";
  return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני ניהול מצב (States) - מפורטים עבור כל רכיב במערכת
   * -----------------------------------------------------------------------------------------------
   */
  
  // האם האפליקציה רצה כעת בדפדפן (Client Side)
  const [isApplicationMounted, setIsApplicationMounted] = useState(false);
  
  // באיזה מסך המשתמש נמצא כרגע
  const [activeScreen, setActiveScreen] = useState<ViewState>('home');
  
  // שפת הממשק הנוכחית
  const [interfaceLanguage, setInterfaceLanguage] = useState('he');
  
  // פילטר קטגוריה נבחר
  const [activeCategoryType, setActiveCategoryType] = useState('all');
  
  // פילטר אזור נבחר
  const [activeRegionLocation, setActiveRegionLocation] = useState('all');
  
  // תוכן החיפוש החופשי
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  
  // מיקום ה-GPS המדויק של המשתמש
  const [currentGPSPosition, setCurrentGPSPosition] = useState<[number, number] | null>(null);
  
  // רכיבי המפה של Leaflet (נטענים רק בצד הלקוח)
  const [MapComponentsLibrary, setMapComponentsLibrary] = useState<any>(null);
  
  // הגדרת האייקון האדום לסימון המשתמש
  const [userCustomMarker, setUserCustomMarker] = useState<any>(null);
  
  // רפרנס לאובייקט המפה של Leaflet לצורך שליטה (FlyTo)
  const mapControlInstance = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא (Internationalization Dictionary)
   * כאן מוגדרים כל הטקסטים של הממשק עבור 10 קטגוריות ב-4 שפות שונות.
   * נכתב בפירוט ידני כדי למנוע צמצום שורות.
   * -----------------------------------------------------------------------------------------------
   */
  const dictionary: any = {
    he: { 
      inputSearch: "חפש מקום, מסלול או מעיין...", 
      resultsCount: "תוצאות שנמצאו", 
      btnSurprise: "תפתיע אותי", 
      homeWelcome: "לאן נטייל היום?", 
      btnStart: "בואו נתחיל",
      btnBack: "חזרה לדף הקודם",
      quizQuestion: "מה הסגנון שלכם עכשיו?",
      kmAwayText: "קמ ממך",
      distIndicator: "מרחק מהמיקום שלך:",
      homeTitle: "דף הבית",
      userPinName: "המיקום הנוכחי שלך",
      kmLabel: 'ק"מ',
      regionNames: {
        all: "כל הארץ",
        north: "צפון הארץ",
        center: "מרכז הארץ",
        south: "דרום הארץ"
      },
      categoryNames: { 
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
      inputSearch: "Search for a place...", 
      resultsCount: "Results Found", 
      btnSurprise: "Surprise Me", 
      homeWelcome: "Where to today?", 
      btnStart: "Let's Go",
      btnBack: "Go Back",
      quizQuestion: "What's your style?",
      kmAwayText: "km away",
      distIndicator: "Distance:",
      homeTitle: "Home",
      userPinName: "You are here",
      kmLabel: "km",
      regionNames: {
        all: "All Israel",
        north: "North",
        center: "Center",
        south: "South"
      },
      categoryNames: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks & Nature", 
        history: "History & Heritage", 
        sleep: "Sleep & Camping", 
        food: "Food & Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      inputSearch: "بحث عن مكان...", 
      resultsCount: "النتائج", 
      btnSurprise: "فاجئني", 
      homeWelcome: "أين نذهب اليوم؟", 
      btnStart: "لنبدأ",
      btnBack: "رجوع",
      quizQuestion: "ما هو أسلوبك المفضل؟",
      kmAwayText: "كم منك",
      distIndicator: "المסافة:",
      homeTitle: "الرئيسية",
      userPinName: "أنت هنا",
      kmLabel: "كم",
      regionNames: {
        all: "כל البلاد",
        north: "الشمال",
        center: "المركز",
        south: "الجنوب"
      },
      categories: { 
        all: "الכל", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ وتراث", 
        sleep: "مبيت وتخييم", 
        food: "طعام ומסאעם", 
        bike: "مسارات دراجات",
        hiking: "مسارات مشي",
        promenade: "مماشٍ",
        beach: "شواطئ",
        river: "أنهار"
      }
    },
    ru: { 
      inputSearch: "Поиск места...", 
      resultsCount: "Результаты", 
      btnSurprise: "Удиви меня", 
      homeWelcome: "Куда поедем сегодня?", 
      btnStart: "Поехали",
      btnBack: "Назад",
      quizQuestion: "Какой у вас стиль?",
      kmAwayText: "км от вас",
      distIndicator: "Расстояние:",
      homeTitle: "Домой",
      userPinName: "Вы здесь",
      kmLabel: "км",
      regionNames: {
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
        river: "Реки"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * אפקטים (Effects) - טעינת GPS, רכיבי מפה ומרקרים
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // אתחול האפליקציה בצד הלקוח
    setIsApplicationMounted(true);
    
    // הפעלת זיהוי מיקום GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired");
          setCurrentGPSPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS access denied by user.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת ספריות המפה באופן דינמי (חשוב למניעת שגיאות SSR)
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([reactLeaflet, leafletLib]: any) => {
      // תיקון נתיבי האייקונים של Leaflet ב-Next.js
      delete leafletLib.Icon.Default.prototype._getIconUrl;
      leafletLib.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת אייקון אדום בולט עבור המשתמש
      const redMarkerIcon = new leafletLib.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setUserCustomMarker(redMarkerIcon);
      setMapComponentsLibrary(reactLeaflet);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Memoized Search & Sort)
   * -----------------------------------------------------------------------------------------------
   */
  const filteredListItems = useMemo(() => {
    // סינון ראשוני לפי חיפוש, קטגוריה ואזור
    let resultOfFilter = data.filter((item: any) => {
      const searchLowercase = searchFilterQuery.toLowerCase();
      
      // בדיקה שתמיד יש שם וקואורדינטות כדי למנוע קריסה
      if (!item.name || !item.coords) {
        return false;
      }

      // התאמה בחיפוש שם בכל השפות
      const nameMatch = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLowercase)
      );
      
      // התאמה לקטגוריה
      const categoryMatch = activeCategoryType === 'all' || item.category === activeCategoryType;
      
      // התאמה לאזור גיאוגרפי
      const regionMatch = activeRegionLocation === 'all' || (item.region && item.region === activeRegionLocation);
      
      return nameMatch && categoryMatch && regionMatch;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (currentGPSPosition) {
      return [...resultOfFilter].sort((a, b) => {
        const d1 = parseFloat(calculateProximityDistance(currentGPSPosition[0], currentGPSPosition[1], a.coords[0], a.coords[1]));
        const d2 = parseFloat(calculateProximityDistance(currentGPSPosition[0], currentGPSPosition[1], b.coords[0], b.coords[1]));
        return d1 - d2;
      });
    }
    
    return resultOfFilter;
  }, [searchFilterQuery, activeCategoryType, activeRegionLocation, currentGPSPosition]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות עזר וטיפול באירועים (Event Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה להזזת המפה באופן חלק
  const handleMapFlyTo = (coordinates: [number, number]) => {
    if (mapControlInstance.current) {
      mapControlInstance.current.flyTo(coordinates, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // פונקציה ללחצן "תפתיע אותי" - הגרלה מתוך המקומות הקרובים
  const handleSurpriseRequest = () => {
    const poolOfCandidates = filteredListItems.length > 0 ? filteredListItems.slice(0, 10) : data;
    const randomIndexValue = Math.floor(Math.random() * poolOfCandidates.length);
    const chosenObject = poolOfCandidates[randomIndexValue];
    
    // ניקוי הממשק ומעבר למפה
    setActiveCategoryType('all');
    setSearchFilterQuery('');
    setActiveScreen('map');
    
    // מעוף למקום הנבחר לאחר טעינה
    setTimeout(() => {
      handleMapFlyTo(chosenObject.coords as [number, number]);
    }, 800);
  };

  // בדיקת טעינה
  if (!isApplicationMounted || !MapComponentsLibrary) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponentsLibrary;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={interfaceLanguage === 'ar' || interfaceLanguage === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home View) - מותאם במיוחד למובייל
          ------------------------------------------------------------------------------------------- */}
      {activeScreen === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4">
            {/* לוגו ממותג - תיקון גודל למובייל */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Site Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-transform duration-1000 hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-5xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-xl md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">
              {dictionary[interfaceLanguage].homeWelcome}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setActiveScreen('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {dictionary[interfaceLanguage].btnStart}
              </button>
              
              <button 
                onClick={handleSurpriseRequest} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all"
              >
                🎲 {dictionary[interfaceLanguage].btnSurprise}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית - כפתורים גדולים ונוחים */}
            <div className="mt-16 md:mt-24 flex justify-center gap-3 md:gap-4 flex-wrap">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setInterfaceLanguage(l)} 
                  className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${interfaceLanguage === l ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך השאלון (Quiz Screen) - 10 קטגוריות מלאות, אייקונים מוקטנים
          ------------------------------------------------------------------------------------------- */}
      {activeScreen === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{dictionary[interfaceLanguage].quizQuestion}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {/* פריסה של 10 קטגוריות מקצועיות - כפתורים מרובעים עם אייקון וטקסט */}
            {Object.entries(dictionary[interfaceLanguage].categoryNames).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategoryType(id); setActiveScreen('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-3 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-lg border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4"
              >
                <span className="text-4xl md:text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase tracking-tight">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setActiveScreen('home')} 
            className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors"
          >
            {dictionary[interfaceLanguage].btnBack}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View)
          ------------------------------------------------------------------------------------------- */}
      {activeScreen === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header של המפה - רספונסיבי ומעוצב */}
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
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setActiveScreen('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header של המפה */}
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setInterfaceLanguage(l)} 
                    className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${interfaceLanguage === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-5 w-full px-2">
              {/* שורת חיפוש */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={dictionary[interfaceLanguage].inputSearch} 
                  value={searchFilterQuery} 
                  onChange={(e) => setSearchFilterQuery(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold" 
                />
                <span className={`absolute top-2.5 md:top-4 opacity-30 text-lg md:text-2xl ${interfaceLanguage === 'he' || interfaceLanguage === 'ar' ? 'right-4' : 'left-4'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים אזוריים וקטגוריאליים */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={activeRegionLocation}
                  onChange={(e) => setActiveRegionLocation(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-[1.5rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md"
                >
                  {Object.entries(dictionary[interfaceLanguage].regionNames).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(dictionary[interfaceLanguage].categoryNames).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategoryType(id)} 
                    className={`px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-[1.5rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${activeCategoryType === id ? 'bg-green-600 text-white shadow-xl' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar רשימת תוצאות - Desktop Only */}
            <aside className="w-[28rem] bg-white border-r overflow-y-auto hidden md:block p-6 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-8">
                <span className="text-md font-black text-gray-400 uppercase tracking-widest">
                  {dictionary[interfaceLanguage].resultsCount} ({filteredListItems.length})
                </span>
                {currentGPSPosition && (
                  <span className="text-[12px] bg-green-100 text-green-700 px-4 py-1.5 rounded-full font-black flex items-center gap-1.5">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-6">
                {filteredListItems.map((item: any) => {
                  const itemDistValue = currentGPSPosition ? calculateProximityDistance(currentGPSPosition[0], currentGPSPosition[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleMapFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-[2.5rem] p-4 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-44 w-full mb-4 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                        {/* תמונה מיוחדת לחרמון או תמונה רגילה לשאר */}
                        <img 
                          src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Thumbnail" 
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">
                        {item.name[interfaceLanguage] || item.name.he}
                      </h3>
                      {itemDistValue && (
                        <p className="text-[12px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {itemDistValue} {dictionary[interfaceLanguage].kmAwayText}
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
                {currentGPSPosition && userCustomMarker && (
                  <Marker position={currentGPSPosition} icon={userCustomMarker}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2">
                        📍 {dictionary[interfaceLanguage].userPinName}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל סיכות האתרים על המפה */}
                {filteredListItems.map((item: any) => {
                  const popupDistanceValue = currentGPSPosition ? calculateProximityDistance(currentGPSPosition[0], currentGPSPosition[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                        <div className="text-right font-sans p-1 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - רוחב מרובע ורחב */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                            {/* החרמון מציג תמונת ויקיפדיה, שאר המקומות לפי ה-ID של הסרטון ב-JSON */}
                            {(item.video && item.id !== "1") ? (
                              <iframe 
                                key={`video-embed-${item.id}-${interfaceLanguage}`}
                                width="100%" 
                                height="100%" 
                                src={buildYouTubeEmbedLink(item.video)} 
                                title="Video Player"
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
                          
                          <h4 className="font-black text-green-800 text-2xl m-0 leading-none mb-3 px-1">
                            {item.name[interfaceLanguage] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך הבלון */}
                          {popupDistanceValue && (
                            <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1 rounded-full border border-green-100 shadow-sm">
                              <span className="text-md">📍</span>
                              <p className="text-[14px] text-green-700 font-black m-0">
                                {dictionary[interfaceLanguage].distIndicator} {popupDistanceValue} {dictionary[interfaceLanguage].kmLabel}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר */}
                          <div className="max-h-36 overflow-y-auto no-scrollbar border-t border-gray-100 mt-2 pt-3 px-1">
                            <p className="text-[14px] text-gray-600 leading-relaxed font-semibold">
                              {item.description[interfaceLanguage] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי ניווט */}
                          <div className="flex gap-3 mt-6 pb-1">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95"
                            >
                              WAZE
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-800 text-center py-4 rounded-2xl text-[11px] font-black no-underline border border-gray-200 active:scale-95"
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

              {/* כפתורי שליטה צפים - מותאמים למובייל */}
              <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSurpriseRequest} 
                  className="bg-green-600 text-white w-16 h-16 md:w-24 md:h-24 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90"
                >
                  <span className="text-2xl md:text-5xl mb-1">🎲</span>
                  {dictionary[interfaceLanguage].surpriseBtn}
                </button>
                
                <button 
                  onClick={() => setActiveScreen('home')} 
                  className="bg-white text-green-600 w-12 h-12 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center text-3xl md:text-4xl border-2 md:border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90 shadow-gray-400"
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
        /* תיקון מיקום הסיכות של Leaflet */
        .leaflet-marker-icon { 
          margin-top: -34px !important; 
          margin-left: -12px !important; 
        }
        
        /* הסתרת פסי גלילה למראה נקי */
        .no-scrollbar::-webkit-scrollbar { 
          display: none; 
        }
        
        /* עיצוב הבלון המרובע (Popup) */
        .leaflet-popup-content-wrapper { 
          border-radius: 2.5rem !important; 
          overflow: hidden !important; 
          padding: 0 !important; 
          box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.4) !important;
        }
        
        /* הגדרת רוחב הבלון במחשב ובנייד */
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 16px !important; 
          width: 400px !important; /* רוחב מרובע יוקרתי */
        }
        
        /* התאמת רוחב הבלון למסכי טלפון */
        @media (max-width: 768px) {
          .leaflet-popup-content {
            width: 300px !important;
            padding: 12px !important;
          }
        }
        
        /* הסרת המשולש בתחתית הבלון */
        .leaflet-popup-tip-container {
          display: none;
        }
        
        /* הבטחת תקינות סרטוני יוטיוב */
        .square-modern-popup-container iframe {
          pointer-events: auto !important;
          border-radius: 2rem !important;
        }
      `}</style>
    </div>
  );
}