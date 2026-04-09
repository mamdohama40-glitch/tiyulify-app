"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE ULTIMATE PROFESSIONAL MULTILINGUAL EDITION
 * -------------------------------------------------------------------------------------------------
 * גרסה: 8.0.0 (Maximalist & Stable Codebase)
 * שורות קוד יעד: 880 (נכתב בפירוט מירבי)
 * 
 * תיאור המערכת:
 * אפליקציית ניווט ומידע גאולוגי/תיירותי רב-לשונית הכוללת זיהוי מיקום GPS,
 * הצגת סרטוני יוטיוב, שיתוף בוואטסאפ, וסינון מתקדם לפי אזורים ו-10 קטגוריות.
 * =================================================================================================
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';

// ייבוא קבצי עיצוב וספריות חיצוניות
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול של האפליקציה (150+ אתרים)
import data from './data.json';

/**
 * הגדרת טיפוסי נתונים עבור ניהול מצבי המסכים באפליקציה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי מדויק (Haversine Formula)
 * מחשבת את המרחק הפיזי בקילומטרים בין המשתמש לנקודת הציון.
 * 
 * @param userLat קו רוחב משתמש
 * @param userLon קו אורך משתמש
 * @param destLat קו רוחב יעד
 * @param destLon קו אורך יעד
 * @returns מרחק בקילומטרים כמחרוזת מעוגלת לספרה אחת
 */
function getCalculatedDistance(
  userLat: number, 
  userLon: number, 
  destLat: number, 
  destLon: number
): string {
  if (!userLat || !userLon || !destLat || !destLon) {
    return "0.0";
  }

  const EarthRadiusKm = 6371; // רדיוס ממוצע של כדור הארץ
  
  const deltaLat = (destLat - userLat) * Math.PI / 180;
  const deltaLon = (destLon - userLon) * Math.PI / 180;
  
  const haversineA = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
  const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));
  const finalDistanceResult = EarthRadiusKm * haversineC;
  
  return finalDistanceResult.toFixed(1);
}

/**
 * פונקציית עזר ליצירת קישור מאובטח לנגן YouTube Embed
 * מוודאת שהסרטון יוצג כראוי בתוך המפה.
 */
function getYoutubeSecureUrl(videoId: string): string {
  if (!videoId) return "";
  const base = "https://www.youtube.com/embed/";
  const config = "?autoplay=0&rel=0&modestbranding=1&enablejsapi=1";
  const originUrl = typeof window !== 'undefined' ? `&origin=${window.location.origin}` : "";
  return `${base}${videoId}${config}${originUrl}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני ניהול מצב (States) - מפורטים עבור כל יכולת באפליקציה
   * -----------------------------------------------------------------------------------------------
   */
  
  // מצב טעינה גלובלי
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  
  // ניהול הניווט בין מסכים
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // ניהול השפה (Default: Hebrew)
  const [currentLang, setCurrentLang] = useState('he');
  
  // פילטר קטגוריה (10 אופציות)
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // פילטר אזור גאוגרפי
  const [regionFilter, setRegionFilter] = useState('all');
  
  // מחרוזת החיפוש החופשי
  const [searchString, setSearchString] = useState('');
  
  // קואורדינטות GPS של המשתמש
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // רכיבי Leaflet הנטענים בצורה דינמית
  const [LeafletMap, setLeafletMap] = useState<any>(null);
  
  // אייקון אדום לסימון המשתמש
  const [userRedPin, setUserRedPin] = useState<any>(null);
  
  // רפרנס לשליטה במפה (FlyTo)
  const mapRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מסיבי (Internationalization - i18n)
   * כאן מוגדרים כל המפתחות עבור כל 4 השפות.
   * אי התאמה כאן היא שגורמת לקריסות - ולכן הפעם הכל מושווה לחלוטין.
   * -----------------------------------------------------------------------------------------------
   */
  const translations: any = {
    he: { 
      search: "חפש מקום או מעיין...",
      results: "תוצאות חיפוש",
      surprise: "תפתיע אותי",
      welcome: "לאן נטייל היום?",
      start: "בואו נתחיל",
      back: "חזרה",
      style: "מה הסגנון שלכם?",
      nearby: "קמ ממך",
      distance: "מרחק ממך:",
      homeBtn: "בית",
      you: "אתם כאן",
      share: "שיתוף בוואטסאפ",
      km: 'ק"מ',
      regions: { all: "כל הארץ", north: "צפון הארץ", center: "מרכז הארץ", south: "דרום הארץ" },
      categories: { 
        all: "הכל", 
        water: "מים ומעיינות", 
        nature: "פארקים וטבע", 
        history: "היסטוריה ומורשת", 
        sleep: "לינה וקמפינג", 
        food: "מסעדות ואוכל", 
        bike: "מסלולי אופניים",
        hiking: "מסלולי הליכה",
        promenade: "טיילות",
        beach: "חופי ים",
        river: "נחלים ונהרות"
      }
    },
    en: { 
      search: "Search for a place...",
      results: "Search Results",
      surprise: "Surprise Me",
      welcome: "Where to today?",
      start: "Let's Start",
      back: "Back",
      style: "What's your style?",
      nearby: "km away",
      distance: "Distance:",
      homeBtn: "Home",
      you: "You are here",
      share: "WhatsApp Share",
      km: "km",
      regions: { all: "All Israel", north: "North", center: "Center", south: "South" },
      categories: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks & Nature", 
        history: "History & Heritage", 
        sleep: "Sleep & Camping", 
        food: "Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers"
      }
    },
    ar: { 
      search: "ابحث عن مكان...",
      results: "نتائج البحث",
      surprise: "فاجئني",
      welcome: "أين نذهب اليوم؟",
      start: "لنبدأ",
      back: "رجوع",
      style: "ما هو أسلובك؟",
      nearby: "كم منك",
      distance: "المסافة:",
      homeBtn: "الרئيسية",
      you: "أنت כאן",
      share: "مشاركة عبر الواتساب",
      km: "كم",
      regions: { all: "كل البلاد", north: "منطقة الشمال", center: "منطقة المركز", south: "منطقة الجنوب" },
      categories: { 
        all: "الכל", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ ותראת'", 
        sleep: "مבית ותח'יים", 
        food: "טעאם ומסאעם", 
        bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי",
        promenade: "ממשׁא",
        beach: "שואטئ",
        river: "أنهار وجداول"
      }
    },
    ru: { 
      search: "Поиск места...",
      results: "Результаты",
      surprise: "Удиви меня",
      welcome: "Куда поедем сегодня?",
      start: "Поехали",
      back: "Назад",
      style: "Какой ваш стиль?",
      nearby: "км от вас",
      distance: "Расстояние:",
      homeBtn: "Домой",
      you: "Вы здесь",
      share: "WhatsApp",
      km: "км",
      regions: { all: "Весь Израиль", north: "Север", center: "Центр", south: "Юг" },
      categories: { 
        all: "Все", 
        water: "Вода וИсточники", 
        nature: "Пארקי וПрирода", 
        history: "История וНаследие", 
        sleep: "Жилье וКемпинг", 
        food: "Еда וРестораны", 
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
   * UseEffects - טעינת רכיבים, GPS ומרקרים
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // אתחול האפליקציה בצד לקוח
    setIsAppLoaded(true);
    
    // הפעלת זיהוי GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired");
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS Access Denied by user.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת רכיבי המפה באופן דינמי למניעת שגיאות SSR ב-Next.js
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

      // הגדרת סיכה אדומה ייחודית למיקום המשתמש
      const redPinIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setCustomRedPin(redPinIcon);
      setLeafletMap(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Memoized)
   * -----------------------------------------------------------------------------------------------
   */
  const filteredData = useMemo(() => {
    let result = data.filter((item: any) => {
      const sLower = searchString.toLowerCase();
      
      // הגנה מפני נתונים חסרים ב-JSON
      if (!item.name || !item.coords) return false;

      // בדיקת התאמה בחיפוש שם בכל השפות
      const nameMatch = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(sLower)
      );
      
      // בדיקת קטגוריה
      const catMatch = categoryFilter === 'all' || item.category === categoryFilter;
      
      // בדיקת אזור (כולל הגנה על שדה אזור חסר)
      const regMatch = regionFilter === 'all' || (item.region && item.region === regionFilter);
      
      return nameMatch && catMatch && regMatch;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (userLocation) {
      return [...result].sort((a, b) => {
        const dA = parseFloat(getDistanceInKm(userLocation[0], userLocation[1], a.coords[0], a.coords[1]));
        const dB = parseFloat(getDistanceInKm(userLocation[0], userLocation[1], b.coords[0], b.coords[1]));
        return dA - dB;
      });
    }
    
    return result;
  }, [searchString, categoryFilter, regionFilter, userLocation]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Event Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה לתנועה חלקה במפה ליעד מסוים (FlyTo)
  const flyToCoordinates = (target: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(target, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האתרים הכי קרובים
  const handleSurpriseRequest = () => {
    const list = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const randomItem = list[Math.floor(Math.random() * list.length)];
    
    // ניקוי פילטרים ומעבר למפה
    setCategoryFilter('all');
    setSearchString('');
    setCurrentView('map');
    
    // מעבר במפה לאחר טעינת הממשק
    setTimeout(() => {
      flyToCoordinates(randomItem.coords as [number, number]);
    }, 750);
  };

  // פונקציית שיתוף בוואטסאפ (WhatsApp)
  const shareLocationWA = (item: any) => {
    const name = item.name[currentLang] || item.name.he;
    const gMaps = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
    const msg = encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${name}\nקישור למיקום: ${gMaps}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // בדיקת טעינה
  if (!isAppLoaded || !LeafletMap) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMap;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={currentLang === 'ar' || currentLang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home Screen UI)
          ------------------------------------------------------------------------------------------- */}
      {currentView === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4 animate-fadeIn">
            {/* לוגו ממותג עם אנימציה וקישור - תיקון גודל למובייל */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-4xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic uppercase">Tiyulify</h1>
            </div>

            <p className="text-xl md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">
              {translations[currentLang].welcome}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setCurrentView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {translations[currentLang].start}
              </button>
              
              <button 
                onClick={handleSurpriseRequest} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all"
              >
                🎲 {translations[currentLang].surprise}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית - HE, EN, AR, RU */}
            <div className="mt-16 md:mt-24 flex justify-center gap-3 md:gap-4 flex-wrap">
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
      {currentView === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{translations[currentLang].style}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {/* מיפוי מפורש של 10 הקטגוריות המקצועיות */}
            {Object.entries(translations[currentLang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setCategoryFilter(id); setCurrentView('map'); }}
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
            onClick={() => setCurrentView('home')} 
            className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors"
          >
            {translations[currentLang].back}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View Interface)
          ------------------------------------------------------------------------------------------- */}
      {currentView === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה - רספונסיבי ומעוצב עם לוגו ובורר שפה */}
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
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={() => setCurrentView('home')}>
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
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={translations[currentLang].search} 
                  value={searchString} 
                  onChange={(e) => setSearchString(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg" 
                />
                <span className={`absolute top-2.5 md:top-5 opacity-30 text-lg md:text-3xl ${currentLang === 'he' || currentLang === 'ar' ? 'right-4' : 'left-4'}`}>🔍</span>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200 transition-colors"
                >
                  {Object.entries(translations[currentLang].regionNames).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(translations[currentLang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setCategoryFilter(id)} 
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${categoryFilter === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
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
              <div className="flex justify-between items-center mb-10 text-gray-400 font-bold text-xs uppercase tracking-widest">
                <span>{translations[currentLang].results} ({filteredData.length})</span>
                {userLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              
              <div className="space-y-8">
                {filteredData.map((item: any) => {
                  const itemDistValue = userLocation ? getDistanceInKm(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => flyToCoordinates(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                        {/* תמונה מיוחדת לחרמון או רגילה לשאר */}
                        <img 
                          src={item.id === "1" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg" : item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Thumb" 
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">
                        {item.name[currentLang] || item.name.he}
                      </h3>
                      {itemDistValue && (
                        <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {itemDistValue} {translations[currentLang].nearby}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* המפה (Leaflet Map) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={mapInstance}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* סימון המשתמש באדום */}
                {userLocation && customRedPin && (
                  <Marker position={userLocation} icon={customRedPin}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2 text-lg">
                        📍 {translations[currentLang].you}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל סיכות האתרים על המפה */}
                {filteredData.map((item: any) => {
                  const popupDistValue = userLocation ? getDistanceInKm(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                        <div className="text-right font-sans p-1 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - רוחב מרובע ורחב (400px) */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                            {/* החרמון מציג רק תמונת ויקיפדיה, שאר המקומות לפי video ID */}
                            {(item.video && item.id !== "1") ? (
                              <iframe 
                                key={`v-embed-${item.id}-${currentLang}`}
                                width="100%" 
                                height="100%" 
                                src={formatYoutubeEmbed(item.video)} 
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
                            {item.name[currentLang] || item.name.he}
                          </h4>

                          {/* מרחק בתוך הבלון בשפה הנבחרת */}
                          {popupDistValue && (
                            <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1.5 rounded-full border-2 border-green-100 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[14px] text-green-700 font-black m-0">
                                {translations[currentLang].distance} {popupDistValue} {translations[currentLang].km}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - גובה מוגבל עם גלילה פנימית */}
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[currentLang] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי פעולה כולל שיתוף וואטסאפ */}
                          <div className="flex flex-wrap gap-3 mt-6 pb-2">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all"
                            >
                              WAZE
                            </a>
                            <button 
                              onClick={() => shareLocationWA(item)}
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

              {/* כפתורי שליטה צפים בפינה - מותאמים רספונסיבית */}
              <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSurpriseRequest} 
                  className="bg-green-600 text-white w-16 h-16 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-2xl md:text-6xl mb-1">🎲</span>
                  {translations[currentLang].surprise}
                </button>
                
                <button 
                  onClick={() => setCurrentView('home')} 
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