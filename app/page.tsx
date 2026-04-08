"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

/**
 * ---------------------------------------------------------------------------
 * טיפוסים והגדרות (Types & Constants)
 * ---------------------------------------------------------------------------
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי בין שתי נקודות גאוגרפיות (Haversine Formula)
 * @param lat1 קו רוחב נקודה 1
 * @param lon1 קו אורך נקודה 1
 * @param lat2 קו רוחב נקודה 2
 * @param lon2 קו אורך נקודה 2
 * @returns המרחק בקילומטרים מעוגל לספרה אחת אחרי הנקודה
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // רדיוס כדור הארץ הממוצע בקילומטרים
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance.toFixed(1);
}

/**
 * ---------------------------------------------------------------------------
 * קומפוננטת האפליקציה הראשית - TiyulifyApp
 * ---------------------------------------------------------------------------
 */
export default function TiyulifyApp() {
  // --- משתני State לניהול הממשק ---
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- GPS ומיקום משתמש ---
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [redIcon, setRedIcon] = useState<any>(null);
  
  // --- רכיבי מפה חיצוניים ---
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

  /**
   * אובייקט תרגומים (UI Dictionary)
   * מכיל את כל הטקסטים של הממשק ב-4 שפות עבור 10 קטגוריות
   */
  const ui: any = {
    he: { 
      search: "חפש מקום...",
      results: "תוצאות",
      surprise: "תפתיע אותי",
      welcome: "לאן נטייל היום?",
      start: "בואו נתחיל",
      back: "חזרה",
      style: "מה הסגנון שלכם?",
      nearby: "קמ ממך",
      distLabel: "מרחק מהמיקום שלך:",
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
        nature: "פארקים וטבע", 
        history: "היסטוריה ומורשת", 
        sleep: "לינה וקמפינג", 
        food: "אוכל ומסעדות", 
        bike: "מסלולי אופניים",
        hiking: "מסלולי הליכה",
        promenade: "טיילות",
        beach: "חופי ים",
        river: "נחלים ונהרות"
      }
    },
    en: { 
      search: "Search for a place...",
      results: "Results",
      surprise: "Surprise Me",
      welcome: "Where to today?",
      start: "Let's Start",
      back: "Go Back",
      style: "What's your style?",
      nearby: "km from you",
      distLabel: "Distance from you:",
      home: "Home",
      youAreHere: "You are here",
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
        sleep: "Lodging & Camping", 
        food: "Food & Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      search: "ابحث عن مكان...",
      results: "نتائج",
      surprise: "فاجئني",
      welcome: "أين نذهب اليوم؟",
      start: "لنبدأ",
      back: "رجوع",
      style: "ما هو أسلوبك؟",
      nearby: "كم منك",
      distLabel: "المسافة منك:",
      home: "الرئيسية",
      youAreHere: "أنت هنا",
      regions: {
        all: "كل البلاد",
        north: "الشمال",
        center: "المركز",
        south: "الجنوب"
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
        promenade: "مماشٍ",
        beach: "شواطئ",
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
      style: "Какой у вас стиль?",
      nearby: "км от вас",
      distLabel: "Расстояние до вас:",
      home: "Домой",
      youAreHere: "Вы здесь",
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
   * טעינת רכיבים וזיהוי מיקום ראשוני
   */
  useEffect(() => {
    setIsClient(true);
    
    // הפעלת זיהוי GPS בטעינה
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("GPS Error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת ספריות המפה (Leaflet) בצורה דינמית
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון עבור האייקונים של המרקרים ב-Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // הגדרת אייקון אדום לסימון מיקום המשתמש
      const customRedIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedIcon(customRedIcon);
      setLeafletComponents(res);
    });
  }, []);

  /**
   * לוגיקת סינון ומיון התוצאות (Search, Category, Region, Distance)
   */
  const filteredData = useMemo(() => {
    let result = data.filter((item: any) => {
      const searchLower = searchQuery.toLowerCase();
      // בדיקת חיפוש בשם המקום בכל השפות
      const matchesName = Object.values(item.name).some(val => 
        String(val).toLowerCase().includes(searchLower)
      );
      // בדיקת פילטר קטגוריה
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      // בדיקת פילטר אזור
      const matchesRegion = activeRegion === 'all' || item.region === activeRegion;
      
      return matchesName && matchesCategory && matchesRegion;
    });

    // במידה ויש מיקום משתמש - נמיין מהקרוב לרחוק
    if (userLocation) {
      return [...result].sort((a, b) => {
        const d1 = parseFloat(getDistance(userLocation[0], userLocation[1], a.coords[0], a.coords[1]));
        const d2 = parseFloat(getDistance(userLocation[0], userLocation[1], b.coords[0], b.coords[1]));
        return d1 - d2;
      });
    }
    
    return result;
  }, [searchQuery, activeCategory, activeRegion, userLocation]);

  /**
   * פונקציה להזזת המפה למיקום מסוים (Smooth FlyTo)
   */
  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14, {
        animate: true,
        duration: 1.5
      });
    }
  };

  /**
   * פונקציה להגרלת מקום קרוב (Surprise Me)
   */
  const handleSurprise = () => {
    // נגריל מתוך 10 המקומות הכי קרובים אלייך כרגע
    const pool = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedPlace = pool[randomIndex];
    
    setActiveCategory('all');
    setSearchQuery('');
    setView('map');
    
    // השהייה קלה כדי לתת למפה להיטען ואז מעוף ליעד
    setTimeout(() => {
      handleFlyTo(selectedPlace.coords as [number, number]);
    }, 600);
  };

  /**
   * בדיקה אם הסביבה מוכנה להצגת המפה
   */
  if (!isClient || !LeafletComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------
          מסך הבית (Home Screen)
          ------------------------------------------------------------------- */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          
          <div className="relative z-10">
            {/* לוגו ממותג עם קישור ואנימציית סיבוב */}
            <div className="flex items-center justify-center gap-6 mb-8">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Site Logo" 
                   className="w-24 h-24 rounded-full border-4 border-white shadow-2xl transition-transform duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-8xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-2xl font-light mb-12 opacity-90 drop-shadow-md">
              {ui[lang].welcome}
            </p>
            
            <div className="flex flex-col gap-5 w-72 mx-auto">
              <button 
                onClick={() => setView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              >
                {ui[lang].start}
              </button>
              
              <button 
                onClick={handleSurprise} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 rounded-2xl font-bold text-xl shadow-xl transition-all"
              >
                🎲 {ui[lang].surprise}
              </button>
            </div>
            
            {/* בורר שפות במסך הראשי */}
            <div className="mt-16 flex justify-center gap-3">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setLang(l)} 
                  className={`px-5 py-2 rounded-xl font-bold border transition-all ${lang === l ? 'bg-green-600 border-green-600 shadow-lg scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          מסך השאלון (Quiz Screen - 10 Categories)
          ------------------------------------------------------------------- */}
      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          <h2 className="text-5xl font-black text-gray-800 mb-12 drop-shadow-sm">{ui[lang].style}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 w-full max-w-6xl p-4">
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-4 bg-white hover:bg-green-50 rounded-[2.5rem] shadow-md border-4 border-transparent hover:border-green-400 transition-all group p-6"
              >
                <span className="text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-md leading-tight">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setView('home')} 
            className="mt-14 text-green-700 font-bold underline text-xl hover:text-green-900 transition-colors"
          >
            {ui[lang].back}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------
          מסך המפה הראשי (Map View)
          ------------------------------------------------------------------- */}
      {view === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header של המפה */}
          <header className="bg-white/95 backdrop-blur-md border-b p-4 flex flex-col gap-4 z-[2000] shadow-lg">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-5">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-12 h-12 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-4xl font-black text-green-700 cursor-pointer italic tracking-tight" onClick={() => setView('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה קבוע במסך המפה */}
              <div className="flex gap-1.5 bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setLang(l)} 
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 w-full">
              {/* תיבת חיפוש */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={ui[lang].search} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-12 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-medium" 
                />
                <span className={`absolute top-3.5 opacity-30 text-xl ${lang === 'he' || lang === 'ar' ? 'right-4' : 'left-4'}`}>🔍</span>
              </div>

              {/* פילטרים (אזורים וקטגוריות) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value)}
                  className="bg-blue-50 text-blue-700 font-bold px-5 py-2.5 rounded-2xl text-sm outline-none border-none cursor-pointer shadow-sm hover:bg-blue-100 transition-colors"
                >
                  {Object.entries(ui[lang].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategory(id)} 
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* רשימת תוצאות בצד (Desktop Only) */}
            <aside className="w-96 bg-white border-r overflow-y-auto hidden md:block p-5 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">
                  {ui[lang].results} ({filteredData.length})
                </span>
                {userLocation && (
                  <span className="text-[11px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-black">
                    📍 ממוין לפי קרבה
                  </span>
                )}
              </div>
              
              <div className="space-y-5">
                {filteredData.map((item: any) => {
                  const dist = userLocation ? getDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-[2rem] p-3 shadow-sm hover:shadow-xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-32 w-full mb-3 rounded-[1.5rem] overflow-hidden shadow-inner">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name[lang]} />
                      </div>
                      <h3 className="font-black text-gray-800 text-md px-2 leading-tight">
                        {item.name[lang] || item.name.he}
                      </h3>
                      {dist && (
                        <p className="text-[11px] text-green-600 font-black mt-2 px-2 flex items-center gap-1">
                          <span className="text-sm">🚀</span> {dist} {ui[lang].nearby}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* המפה (Leaflet Container) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={mapRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* סימון המשתמש באדום */}
                {userLocation && redIcon && (
                  <Marker position={userLocation} icon={redIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2">
                        📍 {ui[lang].youAreHere}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל סיכות האתרים */}
                {filteredData.map((item: any) => {
                  const itemDist = userLocation ? getDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={300} className="custom-popup">
                        <div className="text-right font-sans p-2">
                          
                          {/* תצוגת תוכן ויזואלי - יוטיוב או תמונה */}
                          <div className="w-full mb-4 shadow-xl rounded-2xl overflow-hidden bg-black aspect-video relative">
                            {item.video ? (
                              <iframe 
                                key={`vid-${item.id}-${lang}`}
                                width="100%" 
                                height="100%" 
                                src={`https://www.youtube.com/embed/${item.video}?autoplay=0&mute=0&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                title={item.name[lang]}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                              ></iframe>
                            ) : (
                              <img 
                                src={item.image} 
                                alt="Site View" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          
                          {/* כותרת המקום */}
                          <h4 className="font-black text-green-800 text-2xl m-0 leading-none mb-2">
                            {item.name[lang] || item.name.he}
                          </h4>

                          {/* מרחק בתוך הבלון בשפה הנבחרת */}
                          {itemDist && (
                            <div className="flex items-center gap-1.5 mb-3 bg-green-50 inline-flex px-3 py-1 rounded-full border border-green-100 shadow-sm">
                              <span className="text-xs">📍</span>
                              <p className="text-[12px] text-green-700 font-black m-0">
                                {ui[lang].distLabel} {itemDist} {lang === 'he' ? 'ק"מ' : 'km'}
                              </p>
                            </div>
                          )}
                          
                          {/* תיאור האתר */}
                          <p className="text-[13px] text-gray-600 my-3 leading-relaxed font-medium border-t border-gray-100 pt-3">
                            {item.description[lang] || item.description.he}
                          </p>
                          
                          {/* כפתורי פעולה */}
                          <div className="flex gap-3 mt-5">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-3 rounded-2xl text-xs font-black no-underline shadow-lg hover:bg-blue-700 transition-all transform active:scale-95"
                            >
                              WAZE
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-2xl text-xs font-black no-underline border border-gray-200 hover:bg-gray-200 transition-all transform active:scale-95"
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

              {/* כפתורי בקרה צפים (Surprise & Home) */}
              <div className="absolute bottom-8 left-8 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSurprise} 
                  className="bg-green-600 text-white w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90"
                >
                  <span className="text-3xl mb-1">🎲</span>
                  {ui[lang].surprise}
                </button>
                
                <button 
                  onClick={() => setView('home')} 
                  className="bg-white text-green-600 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl border-2 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          Global CSS (Leaflet Fixes & Animations)
          ------------------------------------------------------------------- */}
      <style jsx global>{`
        .leaflet-marker-icon { 
          margin-top: -34px !important; 
          margin-left: -12px !important; 
        }
        .no-scrollbar::-webkit-scrollbar { 
          display: none; 
        }
        .leaflet-popup-content-wrapper { 
          border-radius: 2rem !important; 
          overflow: hidden !important; 
          padding: 0 !important; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 16px !important; 
          width: auto !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}