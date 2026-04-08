"use client";

/**
 * =================================================================================================
 * TIYULIFY - ULTIMATE SAFE EDITION (780+ LINES)
 * תכונות: GPS, 10 קטגוריות מקצועיות, פילטר אזורים, תמיכה ביוטיוב, סיכה אדומה, מרחק בבלון.
 * קוד זה כולל הגנות מפני קריסות (Safe Guards) לנתונים חסרים ב-JSON.
 * =================================================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים הגדול של האפליקציה
import data from './data.json';

/**
 * הגדרת טיפוסים עבור ניהול מצבי התצוגה באפליקציה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי (Haversine Formula)
 * מחשבת את המרחק הגיאוגרפי המדויק בקילומטרים בין המשתמש לנקודת הציון.
 * 
 * @param lat1 קו רוחב של המשתמש
 * @param lon1 קו אורך של המשתמש
 * @param lat2 קו רוחב של היעד
 * @param lon2 קו אורך של היעד
 * @returns מחרוזת של המרחק בקילומטרים מעוגל לספרה אחת
 */
function getPreciseDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "0.0";
  
  const R = 6371; // רדיוס כדור הארץ הממוצע בק"מ
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceCalculated = R * c;
  
  return distanceCalculated.toFixed(1);
}

/**
 * פונקציית עזר ליצירת קישור Embed תקין ליוטיוב
 */
function createYouTubeEmbedUrl(videoId: string): string {
  if (!videoId) return "";
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
}

export default function TiyulifyApp() {
  // -----------------------------------------------------------------------------------------------
  // משתני State - ניהול האפליקציה (שפה, ניווט, פילטרים)
  // -----------------------------------------------------------------------------------------------
  
  // בדיקת טעינה בצד הלקוח
  const [isClientSideLoaded, setIsClientSideLoaded] = useState(false);
  
  // שליטה על המסך המוצג (בית, שאלון או מפה)
  const [activeView, setActiveView] = useState<ViewState>('home');
  
  // בחירת שפת הממשק (עברית כברירת מחדל)
  const [selectedLang, setSelectedLang] = useState('he');
  
  // ניהול סינון לפי קטגוריה
  const [currentCategoryFilter, setCurrentCategoryFilter] = useState('all');
  
  // ניהול סינון לפי אזור גיאוגרפי
  const [currentRegionFilter, setCurrentRegionFilter] = useState('all');
  
  // מחרוזת החיפוש החופשי
  const [searchText, setSearchText] = useState('');
  
  // מיקום ה-GPS של המשתמש
  const [userLocationCoords, setUserLocationCoords] = useState<[number, number] | null>(null);
  
  // רכיבי Leaflet (נטענים רק בצד הלקוח)
  const [MapLib, setMapLib] = useState<any>(null);
  
  // אייקון אדום לסימון המשתמש
  const [userPinIcon, setUserPinIcon] = useState<any>(null);
  
  // הפניה לאובייקט המפה המבצעי
  const leafletMapRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * מילון תרגומים מלא (Internationalization Dictionary)
   * פירוט מוחלט של 10 קטגוריות עבור 4 שפות שונות
   * -----------------------------------------------------------------------------------------------
   */
  const translations: any = {
    he: { 
      searchLabel: "חפש מקום...", 
      resultsLabel: "תוצאות חיפוש", 
      surpriseLabel: "תפתיע אותי", 
      welcomeTitle: "לאן נטייל היום?", 
      startBtnLabel: "בואו נתחיל",
      backBtnLabel: "חזרה לדף הקודם",
      quizTitle: "מה הסגנון שלכם עכשיו?",
      nearbySuffix: "קמ ממך",
      distText: "מרחק מהמיקום שלך:",
      homeBtnTitle: "דף הבית",
      hereTitle: "המיקום הנוכחי שלך",
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
      searchLabel: "Search place...", 
      resultsLabel: "Search Results", 
      surpriseLabel: "Surprise Me", 
      welcomeTitle: "Where to today?", 
      startBtnLabel: "Let's Go",
      backBtnLabel: "Go Back",
      quizTitle: "What's your style?",
      nearbySuffix: "km away",
      distText: "Distance:",
      homeBtnTitle: "Home",
      hereTitle: "You are here",
      kmSuffix: "km",
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
        food: "Restaurants & Food", 
        bike: "Bicycle Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      searchLabel: "بحث عن مكان...", 
      resultsLabel: "نتائج البحث", 
      surpriseLabel: "فاجئني", 
      welcomeTitle: "أين نذهب اليوم؟", 
      startBtnLabel: "لنبدأ الرحلة",
      backBtnLabel: "رجوع",
      quizTitle: "ما هو أسلوبك المفضل؟",
      nearbySuffix: "كم منك",
      distText: "المסافة:",
      homeBtnTitle: "الرئيسية",
      hereTitle: "أنت هنا",
      kmSuffix: "كم",
      regions: {
        all: "כל البلاد",
        north: "منطقة الشمال",
        center: "منطقة المركز",
        south: "منطقة الجنوب"
      },
      categories: { 
        all: "الכל", 
        water: "مياه وينابيع", 
        nature: "منتزهات وطبيعة", 
        history: "تاريخ وتراث", 
        sleep: "مبيت وتخييم", 
        food: "طعام ومطاعم", 
        bike: "مسارات دراجات",
        hiking: "مسارات مشي",
        promenade: "مماشٍ سياحية",
        beach: "شواطئ البحر",
        river: "أنهار وجداول"
      }
    },
    ru: { 
      searchLabel: "Поиск...", 
      resultsLabel: "Результаты", 
      surpriseLabel: "Удиви меня", 
      welcomeTitle: "Куда поедем сегодня?", 
      startBtnLabel: "Поехали",
      backBtnLabel: "Назад",
      quizTitle: "Какой стиль?",
      nearbySuffix: "км от вас",
      distText: "Расстояние:",
      homeBtnTitle: "Домой",
      hereTitle: "Вы здесь",
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
        river: "Реки וручьи"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * אפקטים (Effects) - טעינה ו-GPS
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // אתחול צד לקוח
    setIsClientSideLoaded(true);
    
    // הפעלת זיהוי GPS מהדפדפן
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocationCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("Location access denied.", err);
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת ספריות המפה באופן דינמי
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון עבור האייקונים של Leaflet ב-Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת האייקון האדום עבור מיקום המשתמש
      const customRedIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setUserPinIcon(customRedIcon);
      setMapLib(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Memoized)
   * -----------------------------------------------------------------------------------------------
   */
  const listItems = useMemo(() => {
    // סינון בסיסי לפי טקסט, קטגוריה ואזור
    let filtered = data.filter((item: any) => {
      const searchVal = searchText.toLowerCase();
      
      // בדיקה אם השם קיים ותואם לחיפוש
      const nameMatch = item.name ? Object.values(item.name).some(n => 
        String(n).toLowerCase().includes(searchVal)
      ) : false;
      
      // בדיקת פילטר קטגוריה
      const catMatch = currentCategoryFilter === 'all' || item.category === currentCategoryFilter;
      
      // בדיקת פילטר אזור (עם הגנה למקרה שאין אזור מוגדר ב-JSON)
      const regMatch = currentRegionFilter === 'all' || (item.region && item.region === currentRegionFilter);
      
      return nameMatch && catMatch && regMatch;
    });

    // מיון לפי מרחק GPS (אם המיקום זמין)
    if (userLocationCoords) {
      return [...filtered].sort((a, b) => {
        const dA = parseFloat(getPreciseDistance(userLocationCoords[0], userLocationCoords[1], a.coords[0], a.coords[1]));
        const dB = parseFloat(getPreciseDistance(userLocationCoords[0], userLocationCoords[1], b.coords[0], b.coords[1]));
        return dA - dB;
      });
    }
    
    return filtered;
  }, [searchText, currentCategoryFilter, currentRegionFilter, userLocationCoords]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות עזר (Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה להזזת המפה בפורמט חלק
  const moveToLocation = (coords: [number, number]) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(coords, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האפשרויות הקרובות ביותר
  const handleSmartSurprise = () => {
    const candidates = listItems.length > 0 ? listItems.slice(0, 10) : data;
    const randomPick = candidates[Math.floor(Math.random() * candidates.length)];
    
    // ניקוי הממשק והעברה למפה
    setCurrentCategoryFilter('all');
    setSearchText('');
    setActiveView('map');
    
    // מעבר במפה ליעד לאחר טעינה קלה
    setTimeout(() => {
      moveToLocation(randomPick.coords as [number, number]);
    }, 750);
  };

  // בדיקת מוכנות הרכיבים
  if (!isClientSideLoaded || !MapLib) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapLib;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={selectedLang === 'ar' || selectedLang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          תצוגת מסך הבית
          ------------------------------------------------------------------------------------------- */}
      {activeView === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          
          <div className="relative z-10">
            {/* לוגו ממותג עם אנימציה וקישור */}
            <div className="flex items-center justify-center gap-8 mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Logo" 
                   className="w-32 h-32 rounded-full border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-3xl font-light mb-16 opacity-90 drop-shadow-lg">
              {translations[selectedLang].welcomeTitle}
            </p>
            
            <div className="flex flex-col gap-6 w-80 mx-auto">
              <button 
                onClick={() => setActiveView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-6 rounded-3xl font-bold text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {translations[selectedLang].startBtnLabel}
              </button>
              
              <button 
                onClick={handleSmartSurprise} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-5 rounded-3xl font-bold text-xl shadow-xl transition-all"
              >
                🎲 {translations[selectedLang].surpriseLabel}
              </button>
            </div>
            
            <div className="mt-20 flex justify-center gap-4">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setSelectedLang(l)} 
                  className={`px-7 py-3 rounded-2xl font-bold border-2 transition-all ${selectedLang === l ? 'bg-green-600 border-green-600 shadow-2xl scale-115 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת מסך השאלון (10 קטגוריות)
          ------------------------------------------------------------------------------------------- */}
      {activeView === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
          <h2 className="text-6xl font-black text-gray-800 mb-16 drop-shadow-sm">{translations[selectedLang].quizTitle}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full max-w-7xl p-6">
            {Object.entries(translations[selectedLang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setCurrentCategoryFilter(id); setActiveView('map'); }}
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
            onClick={() => setActiveView('home')} 
            className="mt-20 text-green-700 font-bold underline text-2xl hover:text-green-900"
          >
            {translations[selectedLang].backBtnLabel}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית
          ------------------------------------------------------------------------------------------- */}
      {activeView === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-5 flex flex-col gap-5 z-[2000] shadow-2xl">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-16 h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-5xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setActiveView('home')}>
                  Tiyulify
                </h2>
              </div>
              
              <div className="flex gap-2 bg-gray-100 p-2.5 rounded-2xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setSelectedLang(l)} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedLang === l ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
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
                  placeholder={translations[selectedLang].searchLabel} 
                  value={searchText} 
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-[2rem] py-5 px-16 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-lg" 
                />
                <span className={`absolute top-5 opacity-40 text-3xl ${selectedLang === 'he' || selectedLang === 'ar' ? 'right-6' : 'left-6'}`}>🔍</span>
              </div>

              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                <select 
                  value={currentRegionFilter}
                  onChange={(e) => setCurrentRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-8 py-4 rounded-[2rem] text-md outline-none border-none cursor-pointer shadow-lg hover:bg-blue-200 transition-all"
                >
                  {Object.entries(translations[selectedLang].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(translations[selectedLang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setCurrentCategoryFilter(id)} 
                    className={`px-8 py-4 rounded-[2rem] text-sm font-black whitespace-nowrap transition-all ${currentCategoryFilter === id ? 'bg-green-600 text-white shadow-2xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar תוצאות */}
            <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-10">
                <span className="text-lg font-black text-gray-400 uppercase tracking-widest">
                  {translations[selectedLang].resultsLabel} ({listItems.length})
                </span>
                {userLocationCoords && (
                  <span className="text-[14px] bg-green-100 text-green-700 px-5 py-2 rounded-full font-black flex items-center gap-2 shadow-inner border border-green-200">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-8">
                {listItems.map((item: any) => {
                  const distLabelValue = userLocationCoords ? getPreciseDistance(userLocationCoords[0], userLocationCoords[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => moveToLocation(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-48 w-full mb-5 rounded-[2.5rem] overflow-hidden shadow-md">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Place" />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-4 leading-tight">
                        {item.name[selectedLang] || item.name.he}
                      </h3>
                      {distLabelValue && (
                        <p className="text-[14px] text-green-600 font-black mt-4 px-4 flex items-center gap-2">
                          <span className="text-xl">🚀</span> {distLabelValue} {translations[selectedLang].nearbySuffix}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* קונטיינר המפה */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={leafletMapRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {userLocationCoords && userPinIcon && (
                  <Marker position={userLocationCoords} icon={userPinIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-3 text-lg">
                        📍 {translations[selectedLang].hereTitle}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {listItems.map((item: any) => {
                  const distInPopValue = userLocationCoords ? getPreciseDistance(userLocationCoords[0], userLocationCoords[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={400} maxWidth={400} className="square-popup-final">
                        <div className="text-right font-sans p-2">
                          
                          {/* תצוגת תוכן ויזואלי (יוטיוב או תמונה) - רוחב מרובע ורחב */}
                          <div className="w-full mb-5 shadow-2xl rounded-[2rem] overflow-hidden bg-black aspect-video relative border-4 border-white">
                            {item.video ? (
                              <iframe 
                                key={`video-player-${item.id}-${selectedLang}`}
                                width="100%" 
                                height="100%" 
                                src={createYouTubeEmbedUrl(item.video)} 
                                title={item.name[selectedLang]}
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
                          
                          {/* כותרת המקום */}
                          <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">
                            {item.name[selectedLang] || item.name.he}
                          </h4>

                          {/* מרחק בתוך הבלון */}
                          {distInPopValue && (
                            <div className="flex items-center gap-3 mb-4 bg-green-100 inline-flex px-6 py-2 rounded-full border-2 border-green-200 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[16px] text-green-800 font-black m-0">
                                {translations[selectedLang].distText} {distInPopValue} {translations[selectedLang].kmSuffix}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - גובה מוגבל עם גלילה למניעת אורך מוגזם */}
                          <div className="max-h-36 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[selectedLang] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי ניווט */}
                          <div className="flex gap-4 mt-8">
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

              {/* כפתורי בקרה צפים בפינה */}
              <div className="absolute bottom-12 left-12 z-[2000] flex flex-col gap-6">
                <button 
                  onClick={handleSmartSurprise} 
                  className="bg-green-600 text-white w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[12px] font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90 shadow-green-400"
                >
                  <span className="text-5xl mb-1">🎲</span>
                  {translations[selectedLang].surpriseLabel}
                </button>
                
                <button 
                  onClick={() => setActiveView('home')} 
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
          CSS גלובלי - עיצוב הבלון המרובע ותיקוני מפה
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
          box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 24px !important; 
          width: 400px !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-popup-final iframe {
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