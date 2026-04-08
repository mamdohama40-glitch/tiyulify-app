"use client";

/**
 * ==========================================================================================
 * TIYULIFY - ULTIMATE MAXIMALIST EDITION (780+ LINES)
 * תכונות: GPS, 10 קטגוריות מלאות, YouTube Embed, סיכה אדומה, מרחק בבלון, לוגו מסתובב.
 * גרסה זו נכתבה בפירוט מוחלט (Verbose) כדי להבטיח יציבות ושמירה על כל שורת קוד.
 * ==========================================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול של האתר
import data from './data.json';

/**
 * הגדרת טיפוסים (Types) עבור ניווט ומצבי תצוגה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי (Haversine Formula)
 * מחשבת את המרחק הגיאוגרפי המדויק בקילומטרים בין המשתמש לבין האתר.
 * 
 * @param lat1 - קו רוחב משתמש
 * @param lon1 - קו אורך משתמש
 * @param lat2 - קו רוחב יעד
 * @param lon2 - קו אורך יעד
 * @returns מרחק במחרוזת מעוגלת לספרה אחת (למשל: "12.5")
 */
function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return "0.0";
  }

  const R = 6371; // רדיוס כדור הארץ הממוצע בקילומטרים
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const finalDistance = R * c;
  
  return finalDistance.toFixed(1);
}

export default function TiyulifyApp() {
  // -----------------------------------------------------------------------------------------------
  // משתני State - ניהול מצב האפליקציה בפירוט רב
  // -----------------------------------------------------------------------------------------------
  
  // האם האפליקציה רצה בצד הלקוח (למניעת שגיאות SSR)
  const [isClientSide, setIsClientSide] = useState(false);
  
  // מצב התצוגה הנוכחי (מסך בית, שאלון קטגוריות, או מפה)
  const [currentViewState, setCurrentViewState] = useState<ViewState>('home');
  
  // שפת הממשק הנבחרת (ברירת מחדל: עברית)
  const [appLanguage, setAppLanguage] = useState('he');
  
  // קטגוריית הסינון הפעילה
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  // האזור הגיאוגרפי הנבחר (צפון, מרכז, דרום)
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  
  // טקסט החיפוש החופשי שהמשתמש מזין
  const [globalSearchInput, setGlobalSearchInput] = useState('');
  
  // קואורדינטות המיקום של המשתמש (GPS)
  const [userGPSLocation, setUserGPSLocation] = useState<[number, number] | null>(null);
  
  // רכיבי ספריית Leaflet הנטענים דינמית
  const [LeafletMapComponents, setLeafletMapComponents] = useState<any>(null);
  
  // אייקון אדום מיוחד לסימון המשתמש על המפה
  const [redMarkerIconInstance, setRedMarkerIconInstance] = useState<any>(null);
  
  // רפרנס (Ref) לאובייקט המפה לצורך תנועה חלקה (FlyTo)
  const leafletMapObjectRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא ומפורט (i18n Dictionary)
   * כולל את כל 10 הקטגוריות שביקשת בכל 4 השפות.
   * נכתב בצורה מפורשת (ארוכה) כדי למנוע טעויות תרגום.
   * -----------------------------------------------------------------------------------------------
   */
  const uiTranslations: any = {
    he: { 
      searchPlaceholder: "חפש מקום, מעיין או אתר...",
      resultsHeader: "תוצאות חיפוש",
      surpriseBtn: "תפתיע אותי",
      welcomeMessage: "לאן נטייל היום?",
      startJourneyBtn: "בואו נתחיל",
      goBackBtn: "חזרה לדף הקודם",
      quizMainTitle: "מה הסגנון שלכם עכשיו?",
      nearbyInfoText: "קמ ממך",
      distancePrefix: "מרחק מהמיקום שלך:",
      homeButtonText: "דף הבית",
      userLocationTitle: "המיקום הנוכחי שלך",
      kmString: 'ק"מ',
      regions: {
        all: "כל הארץ",
        north: "צפון הארץ",
        center: "מרכז הארץ",
        south: "דרום הארץ"
      },
      categories: { 
        all: "כל הקטגוריות", 
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
      resultsHeader: "Results",
      surpriseBtn: "Surprise Me",
      welcomeMessage: "Where to today?",
      startJourneyBtn: "Let's Go",
      goBackBtn: "Back",
      quizMainTitle: "What's your style?",
      nearbyInfoText: "km away",
      distancePrefix: "Distance from you:",
      homeButtonText: "Home",
      userLocationTitle: "You are here",
      kmString: "km",
      regions: {
        all: "All Israel",
        north: "North",
        center: "Center",
        south: "South"
      },
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
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      searchPlaceholder: "ابحث عن مكان...",
      resultsHeader: "النتائج",
      surpriseBtn: "فاجئني",
      welcomeMessage: "أين نذهب اليوم؟",
      startJourneyBtn: "لنبدأ",
      goBackBtn: "رجوع",
      quizMainTitle: "ما هو أسلובك المفضل؟",
      nearbyInfoText: "كم منك",
      distancePrefix: "المסافة:",
      homeButtonText: "الرئيسية",
      userLocationTitle: "أنت هنا",
      kmString: "كم",
      regions: {
        all: "כל البلاد",
        north: "الشمال",
        center: "المركز",
        south: "الجنوب"
      },
      categories: { 
        all: "الكل", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ وتراث", 
        sleep: "مبيت ותחיים", 
        food: "طعام ומסאעם", 
        bike: "مسارات دراجات",
        hiking: "مسارات مشي",
        promenade: "مماشٍ سياحية",
        beach: "شواطئ البحر",
        river: "أنهار وجداول"
      }
    },
    ru: { 
      searchPlaceholder: "Поиск места...",
      resultsHeader: "Результаты",
      surpriseBtn: "Удиви меня",
      welcomeMessage: "Куда поедем сегодня?",
      startJourneyBtn: "Поехали",
      goBackBtn: "Назад",
      quizMainTitle: "Какой у вас стиль?",
      nearbyInfoText: "км от вас",
      distancePrefix: "Расстояние:",
      homeButtonText: "Домой",
      userLocationTitle: "Вы здесь",
      kmString: "км",
      regions: {
        all: "Весь Израиль",
        north: "Север",
        center: "Центр",
        south: "Юг"
      },
      categories: { 
        all: "Все", 
        water: "Вода и источники", 
        nature: "Пארки и Природа", 
        history: "История и наследие", 
        sleep: "Жилье и кемпинг", 
        food: "Еда и рестораны", 
        bike: "Веломаршруты",
        hiking: "Пешие тропы",
        promenade: "Променады",
        beach: "Пляжи",
        river: "Реки וручьи"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * UseEffects - אתחול המערכת, GPS ורכיבי מפה
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // סימון שהצד לקוח עלה
    setIsClientSide(true);
    
    // הפעלת זיהוי מיקום GPS מהדפדפן (Browser Geolocation API)
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired successfully");
          setUserGPSLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => {
          console.warn("User blocked GPS access or error occurred:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינה דינמית של Leaflet למניעת שגיאות קומפילציה
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([leafletReact, leafletLib]: any) => {
      // פתרון בעיית האייקונים הידועה ב-Leaflet עם Webpack/Next.js
      delete leafletLib.Icon.Default.prototype._getIconUrl;
      leafletLib.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // יצירת אייקון אדום בולט למיקום המשתמש
      const redMarkerIcon = new leafletLib.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedMarkerIconInstance(redMarkerIcon);
      setLeafletMapComponents(leafletReact);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Memoized Filter)
   * כאן מתבצע ה-Filter וה-Sort לפי מרחק GPS
   * -----------------------------------------------------------------------------------------------
   */
  const processedData = useMemo(() => {
    let result = data.filter((item: any) => {
      const searchLowercase = globalSearchInput.toLowerCase();
      
      // הגנה: בדיקה שהאובייקט תקין
      if (!item.name || !item.coords) return false;

      // בדיקת התאמה בשם המקום (בכל השפות)
      const isSearchMatched = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLowercase)
      );
      
      // בדיקת התאמה לקטגוריה
      const isCategoryMatched = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
      
      // בדיקת התאמה לאזור גיאוגרפי (כולל הגנה על שדה חסר)
      const isRegionMatched = selectedRegionFilter === 'all' || (item.region && item.region === selectedRegionFilter);
      
      return isSearchMatched && isCategoryMatched && isRegionMatched;
    });

    // מיון לפי מרחק מהמשתמש (אם המיקום זמין)
    if (userGPSLocation) {
      return [...result].sort((siteA, siteB) => {
        const distA = parseFloat(calculateDistanceInKm(userGPSLocation[0], userGPSLocation[1], siteA.coords[0], siteA.coords[1]));
        const distB = parseFloat(calculateDistanceInKm(userGPSLocation[0], userGPSLocation[1], siteB.coords[0], siteB.coords[1]));
        return distA - distB;
      });
    }
    
    return result;
  }, [globalSearchInput, selectedCategoryFilter, selectedRegionFilter, userGPSLocation]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Event Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה לתנועה חלקה במפה ליעד מסוים
  const executeFlyTo = (targetCoordinates: [number, number]) => {
    if (leafletMapObjectRef.current) {
      leafletMapObjectRef.current.flyTo(targetCoordinates, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - בחירה אקראית מתוך האתרים הכי קרובים
  const handleSmartSurpriseRequest = () => {
    const candidateList = processedData.length > 0 ? processedData.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * candidateList.length);
    const chosenDestination = candidateList[randomIndex];
    
    // איפוס ממשק ומעבר למפה
    setSelectedCategoryFilter('all');
    setGlobalSearchInput('');
    setCurrentViewState('map');
    
    // מעבר במפה לאחר טעינה
    setTimeout(() => {
      executeFlyTo(chosenDestination.coords as [number, number]);
    }, 700);
  };

  // בדיקת טעינה
  if (!isClientSide || !LeafletMapComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={appLanguage === 'ar' || appLanguage === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          תצוגת מסך הבית - Home Screen UI
          ------------------------------------------------------------------------------------------- */}
      {currentViewState === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          
          <div className="relative z-10 animate-fadeInFast">
            {/* לוגו ממותג עם אנימציה וקישור חיצוני */}
            <div className="flex items-center justify-center gap-8 mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="App Logo" 
                   className="w-32 h-32 rounded-full border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-3xl font-light mb-16 opacity-95 drop-shadow-lg italic">
              {uiTranslations[appLanguage].welcomeMessage}
            </p>
            
            <div className="flex flex-col gap-6 w-80 mx-auto">
              <button 
                onClick={() => setCurrentViewState('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-6 rounded-3xl font-bold text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {uiTranslations[appLanguage].startJourneyBtn}
              </button>
              
              <button 
                onClick={handleSmartSurpriseRequest} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-5 rounded-3xl font-bold text-xl shadow-xl transition-all"
              >
                🎲 {uiTranslations[appLanguage].surpriseBtn}
              </button>
            </div>
            
            {/* בורר שפות במסך הראשי - HE, EN, AR, RU */}
            <div className="mt-24 flex justify-center gap-4">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setAppLanguage(l)} 
                  className={`px-7 py-3 rounded-2xl font-bold border-2 transition-all ${appLanguage === l ? 'bg-green-600 border-green-600 shadow-2xl scale-115 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת מסך השאלון - Quiz / Categories UI
          ------------------------------------------------------------------------------------------- */}
      {currentViewState === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
          <h2 className="text-6xl font-black text-gray-800 mb-16 drop-shadow-sm">{uiTranslations[appLanguage].quizTitle}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full max-w-7xl p-6">
            {/* פריסת 10 הקטגוריות לכפתורים מעוצבים - אייקונים מוקטנים 5xl */}
            {Object.entries(uiTranslations[appLanguage].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setSelectedCategoryFilter(id); setCurrentViewState('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-6 bg-white hover:bg-green-50 rounded-[3.5rem] shadow-xl border-4 border-transparent hover:border-green-400 transition-all group p-10"
              >
                <span className="text-5xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-xl leading-tight uppercase tracking-tight">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setCurrentViewState('home')} 
            className="mt-20 text-green-700 font-bold underline text-2xl hover:text-green-900 transition-colors"
          >
            {uiTranslations[appLanguage].backBtnLabel}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית - Map Main View
          ------------------------------------------------------------------------------------------- */}
      {currentViewState === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header של המפה - כולל חיפוש, לוגו ושפות */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-5 flex flex-col gap-5 z-[2000] shadow-2xl">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Header Logo" 
                     className="w-16 h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-5xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setCurrentViewState('home')}>
                  Tiyulify
                </h2>
              </div>
              
              <div className="flex gap-2 bg-gray-100 p-2.5 rounded-2xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setAppLanguage(l)} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${appLanguage === l ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full px-4">
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={uiTranslations[appLanguage].searchPlaceholder} 
                  value={globalSearchInput} 
                  onChange={(e) => setGlobalSearchInput(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-[2rem] py-5 px-16 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-lg" 
                />
                <span className={`absolute top-5 opacity-40 text-3xl ${appLanguage === 'he' || appLanguage === 'ar' ? 'right-6' : 'left-6'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים (אזור גיאוגרפי וקטגוריות) */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                <select 
                  value={selectedRegionFilter}
                  onChange={(e) => setSelectedRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-8 py-4 rounded-[2rem] text-md outline-none border-none cursor-pointer shadow-lg hover:bg-blue-200"
                >
                  {Object.entries(uiTranslations[appLanguage].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(uiTranslations[appLanguage].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setSelectedCategoryFilter(id)} 
                    className={`px-8 py-4 rounded-[2rem] text-sm font-black whitespace-nowrap transition-all ${selectedCategoryFilter === id ? 'bg-green-600 text-white shadow-2xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar רשימת תוצאות - ממוין לפי קרבה */}
            <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-10">
                <span className="text-lg font-black text-gray-400 uppercase tracking-widest">
                  {uiTranslations[appLanguage].resultsHeader} ({processedData.length})
                </span>
                {userGPSLocation && (
                  <span className="text-[14px] bg-green-100 text-green-700 px-5 py-2 rounded-full font-black flex items-center gap-2 shadow-inner border border-green-200">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-8">
                {processedData.map((item: any) => {
                  const itemDist = userGPSLocation ? calculateDistanceInKm(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => executeFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-48 w-full mb-5 rounded-[2.5rem] overflow-hidden shadow-md bg-gray-200">
                        {/* טיפול בתמונת החרמון המיוחדת או שאר האתרים */}
                        <img 
                          src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt={item.name[appLanguage]} 
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-4 leading-tight">
                        {item.name[appLanguage] || item.name.he}
                      </h3>
                      {itemDist && (
                        <p className="text-[14px] text-green-600 font-black mt-4 px-4 flex items-center gap-2">
                          <span className="text-xl">🚀</span> {itemDist} {uiTranslations[appLanguage].nearbyInfoText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* קונטיינר המפה (Leaflet) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={leafletMapObjectRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {userGPSLocation && redMarkerIconInstance && (
                  <Marker position={userGPSLocation} icon={redMarkerIconInstance}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-3 text-lg">
                        📍 {uiTranslations[appLanguage].hereTitle}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {processedData.map((item: any) => {
                  const popupDist = userGPSLocation ? calculateDistanceInKm(userGPSLocation[0], userGPSLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={380} maxWidth={380} className="square-popup-container">
                        <div className="text-right font-sans p-2 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - תיקון ה-Iframe והפרופורציות (רוחב 380px) */}
                          <div className="w-full mb-5 shadow-2xl rounded-[2rem] overflow-hidden bg-black aspect-video relative border-4 border-white">
                            {/* החרמון יציג רק תמונה, השאר לפי ה-JSON */}
                            {(item.video && item.id !== "1") ? (
                              <iframe 
                                key={`video-${item.id}-${appLanguage}`}
                                width="100%" 
                                height="100%" 
                                src={getYoutubeEmbed(item.video)} 
                                title={item.name[appLanguage]}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                                alt="Destination" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          {/* שם המקום */}
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">
                            {item.name[appLanguage] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך תג מעוצב בבלון */}
                          {popupDist && (
                            <div className="flex items-center gap-3 mb-4 bg-green-100 inline-flex px-6 py-2 rounded-full border-2 border-green-200 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[16px] text-green-800 font-black m-0">
                                {uiTranslations[appLanguage].distText} {popupDist} {uiTranslations[appLanguage].kmString}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - גובה מוגבל עם גלילה למניעת אורך מוגזם */}
                          <div className="max-h-32 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[15px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[appLanguage] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי ניווט רחבים ומעוצבים */}
                          <div className="flex gap-4 mt-8 pb-2">
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
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-5 rounded-[1.5rem] text-sm font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transition-all transform active:scale-95"
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

              {/* כפתורי בקרה צפים בפינה */}
              <div className="absolute bottom-12 left-12 z-[2000] flex flex-col gap-6">
                <button 
                  onClick={handleSmartSurpriseRequest} 
                  className="bg-green-600 text-white w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[12px] font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90 shadow-green-400"
                >
                  <span className="text-5xl mb-1">🎲</span>
                  {uiTranslations[appLanguage].surpriseLabel}
                </button>
                
                <button 
                  onClick={() => setCurrentViewState('home')} 
                  className="bg-white text-green-600 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center text-5xl border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90 shadow-gray-400"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי - עיצוב הבלון המרובע והקטנת האייקונים
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
          box-shadow: 0 45px 90px -15px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 24px !important; 
          width: 380px !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-popup-container iframe {
          pointer-events: auto !important;
          border-radius: 2rem !important;
        }
        @keyframes fadeInFast {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInFast {
          animation: fadeInFast 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}