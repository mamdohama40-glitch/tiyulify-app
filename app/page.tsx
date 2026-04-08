"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

/**
 * =================================================================================================
 * TIYULIFY - האפליקציה המלאה והמורחבת ביותר
 * גרסה: 3.0.0 (Maximalist Edition)
 * תכונות: GPS, 10 קטגוריות, תמיכה ביוטיוב, סיכה אדומה, מרחק בבלון, פילטר אזורים, לוגו מסתובב.
 * שורות קוד: 700+
 * =================================================================================================
 */

/**
 * הגדרת טיפוסים עבור ניווט ומצבי תצוגה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי (Haversine Formula)
 * פונקציה זו מחשבת את המרחק הגיאוגרפי בין המשתמש לבין האתר הנבחר בקילומטרים.
 * 
 * @param lat1 קו רוחב משתמש
 * @param lon1 קו אורך משתמש
 * @param lat2 קו רוחב יעד
 * @param lon2 קו אורך יעד
 * @returns מרחק במחרוזת מעוגלת לספרה אחת
 */
function calculateProximity(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // רדיוס כדור הארץ הממוצע
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
  // משתני ניהול מצב (States)
  // -----------------------------------------------------------------------------------------------
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // מיקום ו-GPS
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [redIcon, setRedIcon] = useState<any>(null);
  
  // רכיבי מפה
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא (Internationalization - i18n)
   * כולל את כל 10 הקטגוריות שביקש המשתמש בפירוט מלא לכל שפה.
   * -----------------------------------------------------------------------------------------------
   */
  const ui: any = {
    he: { 
      search: "חפש מקום...",
      results: "תוצאות חיפוש",
      surprise: "תפתיע אותי",
      welcome: "לאן נטייל היום?",
      start: "בואו נתחיל",
      back: "חזרה",
      style: "מה הסגנון שלכם?",
      nearby: "קמ ממך",
      distLabel: "מרחק ממך:",
      home: "בית",
      youAreHere: "המיקום הנוכחי שלך",
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
      search: "Search for a place...",
      results: "Search results",
      surprise: "Surprise Me",
      welcome: "Where to today?",
      start: "Let's Go",
      back: "Go Back",
      style: "What's your style?",
      nearby: "km away",
      distLabel: "Distance from you:",
      home: "Home",
      youAreHere: "Your location",
      regions: {
        all: "All Israel",
        north: "North",
        center: "Center",
        south: "South"
      },
      categories: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks, Nature & Views", 
        history: "History & Heritage", 
        sleep: "Night Camps & Lodging", 
        food: "Restaurants & Dining", 
        bike: "Bicycle Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Sea Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      search: "بحث عن مكان...",
      results: "نتائج البحث",
      surprise: "فاجئني",
      welcome: "أين نذهب اليوم؟",
      start: "لنبدأ الرحلة",
      back: "رجوع",
      style: "ما هو أسلوبك المفضل؟",
      nearby: "كم منك",
      distLabel: "المسافة منك:",
      home: "الرئيسية",
      youAreHere: "موقعك الحالي",
      regions: {
        all: "כל البلاد",
        north: "منطقة الشمال",
        center: "منطقة المركز",
        south: "منطقة الجنوب"
      },
      categories: { 
        all: "الكل", 
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
      search: "Поиск места...",
      results: "Результаты",
      surprise: "Удиви меня",
      welcome: "Куда поедем сегодня?",
      start: "Поехали",
      back: "Назад",
      style: "Какой стиль выберете?",
      nearby: "км от вас",
      distLabel: "Расстояние:",
      home: "Домой",
      youAreHere: "Ваше местоположение",
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
   * UseEffects - טעינת רכיבים וזיהוי מיקום
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    setIsClient(true);
    
    // ניסיון קבלת מיקום מהמשתמש בזמן אמת
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Geolocation Error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת ספריות מפה בצורה דינמית (מתקן שגיאות SSR ב-Next.js)
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון נתיבי אייקונים של Leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת סיכה אדומה למיקום המשתמש
      const redMarkerIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedIcon(redMarkerIcon);
      setLeafletComponents(res);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון (Memoized)
   * -----------------------------------------------------------------------------------------------
   */
  const filteredData = useMemo(() => {
    let result = data.filter((item: any) => {
      const searchLower = searchQuery.toLowerCase();
      // בדיקת התאמה בכל השפות בשם המקום
      const matchesName = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLower)
      );
      // בדיקת פילטר קטגוריה ופילטר אזור
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesRegion = activeRegion === 'all' || item.region === activeRegion;
      
      return matchesName && matchesCategory && matchesRegion;
    });

    // מיון לפי מרחק מהמשתמש אם המיקום זמין
    if (userLocation) {
      return [...result].sort((a, b) => {
        const d1 = parseFloat(calculateProximity(userLocation[0], userLocation[1], a.coords[0], a.coords[1]));
        const d2 = parseFloat(calculateProximity(userLocation[0], userLocation[1], b.coords[0], b.coords[1]));
        return d1 - d2;
      });
    }
    
    return result;
  }, [searchQuery, activeCategory, activeRegion, userLocation]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות עזר (Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const handleSurprise = () => {
    // הגרלה מתוך 10 האופציות הכי קרובות למשתמש כרגע
    const pool = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedPlace = pool[randomIndex];
    
    setActiveCategory('all');
    setSearchQuery('');
    setView('map');
    
    // השהייה למעבר מסך ואז תנועה במפה
    setTimeout(() => {
      handleFlyTo(selectedPlace.coords as [number, number]);
    }, 700);
  };

  // בדיקת טעינה
  if (!isClient || !LeafletComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home Screen)
          ------------------------------------------------------------------------------------------- */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          
          <div className="relative z-10">
            {/* לוגו ממותג עם קישור ואנימציית סיבוב */}
            <div className="flex items-center justify-center gap-6 mb-10">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Site Logo" 
                   className="w-28 h-28 rounded-full border-4 border-white shadow-2xl transition-transform duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-9xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-3xl font-light mb-14 opacity-90 drop-shadow-lg">
              {ui[lang].welcome}
            </p>
            
            <div className="flex flex-col gap-6 w-80 mx-auto">
              <button 
                onClick={() => setView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-5 rounded-3xl font-bold text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {ui[lang].start}
              </button>
              
              <button 
                onClick={handleSurprise} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 rounded-3xl font-bold text-xl shadow-xl transition-all"
              >
                🎲 {ui[lang].surprise}
              </button>
            </div>
            
            {/* בורר שפות במסך הראשי */}
            <div className="mt-20 flex justify-center gap-4">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setLang(l)} 
                  className={`px-6 py-2.5 rounded-2xl font-bold border transition-all ${lang === l ? 'bg-green-600 border-green-600 shadow-xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך השאלון (Quiz View - 10 Categories Full View)
          ------------------------------------------------------------------------------------------- */}
      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          <h2 className="text-5xl font-black text-gray-800 mb-14 drop-shadow-sm">{ui[lang].style}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full max-w-7xl p-6">
            {/* הצגת 10 כפתורי קטגוריות מעוצבים */}
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-5 bg-white hover:bg-green-50 rounded-[3rem] shadow-lg border-4 border-transparent hover:border-green-400 transition-all group p-8"
              >
                <span className="text-8xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-lg leading-tight uppercase">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setView('home')} 
            className="mt-16 text-green-700 font-bold underline text-2xl hover:text-green-900 transition-colors"
          >
            {ui[lang].back}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך המפה הראשי (Map View Main Interface)
          ------------------------------------------------------------------------------------------- */}
      {view === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header של המפה - כולל לוגו ובורר שפה */}
          <header className="bg-white/95 backdrop-blur-md border-b p-4 flex flex-col gap-4 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-6">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-14 h-14 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-4xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setView('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header לשינוי מיידי בכל שלב */}
              <div className="flex gap-2 bg-gray-100 p-2 rounded-2xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setLang(l)} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${lang === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 w-full">
              {/* שורת חיפוש מקומות */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={ui[lang].search} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] py-4 px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-semibold" 
                />
                <span className={`absolute top-4.5 opacity-30 text-2xl ${lang === 'he' || lang === 'ar' ? 'right-5' : 'left-5'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים משולבת - בחירת אזור גיאוגרפי וקטגוריות */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value)}
                  className="bg-blue-50 text-blue-700 font-black px-6 py-3 rounded-[1.5rem] text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-100 transition-colors"
                >
                  {Object.entries(ui[lang].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategory(id)} 
                    className={`px-6 py-3 rounded-[1.5rem] text-xs font-black whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/*Sidebar - רשימת תוצאות ממוינת לפי קרבה */}
            <aside className="w-[26rem] bg-white border-r overflow-y-auto hidden md:block p-6 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-8">
                <span className="text-md font-black text-gray-400 uppercase tracking-widest">
                  {ui[lang].results} ({filteredData.length})
                </span>
                {userLocation && (
                  <span className="text-[12px] bg-green-100 text-green-700 px-4 py-1.5 rounded-full font-black flex items-center gap-1.5 shadow-sm">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-6">
                {filteredData.map((item: any) => {
                  const dist = userLocation ? calculateProximity(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-[2.5rem] p-4 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-40 w-full mb-4 rounded-[2rem] overflow-hidden shadow-inner">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name[lang]} />
                      </div>
                      <h3 className="font-black text-gray-800 text-lg px-2 leading-tight">
                        {item.name[lang] || item.name.he}
                      </h3>
                      {dist && (
                        <p className="text-[12px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {dist} {ui[lang].nearby}
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
                ref={mapRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* סימון מיקום המשתמש בסיכה אדומה */}
                {userLocation && redIcon && (
                  <Marker position={userLocation} icon={redIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2">
                        📍 {ui[lang].youAreHere}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* יצירת כל הסמנים של אתרי הטיול */}
                {filteredData.map((item: any) => {
                  const itemDistValue = userLocation ? calculateProximity(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={340} className="square-popup-container">
                        <div className="text-right font-sans p-1">
                          
                          {/* תצוגת תוכן ויזואלי (יוטיוב או תמונה) - פרופורציה מרובעת ורחבה */}
                          <div className="w-full mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black aspect-video relative border-2 border-white">
                            {item.video ? (
                              <iframe 
                                key={`v-frame-${item.id}-${lang}`}
                                width="100%" 
                                height="100%" 
                                src={`https://www.youtube.com/embed/${item.video}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`} 
                                title={item.name[lang]}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.image} 
                                alt="Place Preview" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          {/* כותרת המקום ב-Popup */}
                          <h4 className="font-black text-green-800 text-2xl m-0 leading-none mb-2">
                            {item.name[lang] || item.name.he}
                          </h4>

                          {/* הצגת המרחק בתוך הבלון בשפה הנבחרת */}
                          {itemDistValue && (
                            <div className="flex items-center gap-1.5 mb-3 bg-green-50 inline-flex px-4 py-1.5 rounded-full border border-green-100 shadow-sm">
                              <span className="text-md">📍</span>
                              <p className="text-[13px] text-green-700 font-black m-0">
                                {ui[lang].distLabel} {itemDistValue} {lang === 'he' ? 'ק"מ' : 'km'}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר - עם גובה מקסימלי למניעת אורך מוגזם */}
                          <div className="max-h-36 overflow-y-auto no-scrollbar border-t border-gray-100 mt-2 pt-3">
                            <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                              {item.description[lang] || item.description.he}
                            </p>
                          </div>
                          
                          {/* כפתורי ניווט חיצוניים */}
                          <div className="flex gap-3 mt-6">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-4 rounded-[1.2rem] text-xs font-black no-underline shadow-lg hover:bg-blue-700 transition-all transform active:scale-95"
                            >
                              WAZE
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-[1.2rem] text-xs font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transition-all transform active:scale-95"
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

              {/* כפתורי בקרה צפים בפינת המפה */}
              <div className="absolute bottom-10 left-10 z-[2000] flex flex-col gap-5">
                <button 
                  onClick={handleSurprise} 
                  className="bg-green-600 text-white w-24 h-24 rounded-full shadow-2xl flex flex-col items-center justify-center text-[11px] font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90 shadow-green-300"
                >
                  <span className="text-4xl mb-1">🎲</span>
                  {ui[lang].surprise}
                </button>
                
                <button 
                  onClick={() => setView('home')} 
                  className="bg-white text-green-600 w-20 h-20 rounded-full shadow-2xl flex items-center justify-center text-4xl border-2 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90 shadow-gray-300"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי (Leaflet Customizations & Proportions)
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
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 20px !important; 
          width: 340px !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-popup-container iframe {
          pointer-events: auto !important;
          border-radius: 1.5rem !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}