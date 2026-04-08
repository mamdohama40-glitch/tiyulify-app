"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

/**
 * הגדרת מצבי התצוגה של האפליקציה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציית עזר לחישוב מרחק אווירי בין שתי נקודות (Haversine Formula)
 * @param lat1 קווי רוחב נקודה א'
 * @param lon1 קווי אורך נקודה א'
 * @param lat2 קווי רוחב נקודה ב'
 * @param lon2 קווי אורך נקודה ב'
 * @returns מרחק בקילומטרים
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

export default function TiyulifyApp() {
  // משתני מצב (States)
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const [redIcon, setRedIcon] = useState<any>(null);
  const mapRef = useRef<any>(null);

  /**
   * אובייקט תרגומים מלא לכל ממשק המשתמש
   * כולל את 10 הקטגוריות שנתבקשו
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
      distLabel: "מרחק ממך:",
      home: "בית",
      youAreHere: "אתם כאן",
      regions: { all: "כל הארץ", north: "צפון", center: "מרכז", south: "דרום" },
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
      search: "Search...", 
      results: "Results", 
      surprise: "Surprise Me", 
      welcome: "Where to today?", 
      start: "Let's Go", 
      back: "Back", 
      style: "What's your style?", 
      nearby: "km away",
      distLabel: "Distance:",
      home: "Home",
      youAreHere: "You are here",
      regions: { all: "Israel", north: "North", center: "Center", south: "South" },
      categories: { 
        all: "All", 
        water: "Water & Springs", 
        nature: "Parks & Nature", 
        history: "History & Heritage", 
        sleep: "Sleep & Camp", 
        food: "Food & Restaurants", 
        bike: "Bike Trails",
        hiking: "Hiking Trails",
        promenade: "Promenades",
        beach: "Beaches",
        river: "Rivers & Streams"
      }
    },
    ar: { 
      search: "بحث...", 
      results: "نتائج", 
      surprise: "فاجئني", 
      welcome: "أين نذهب היום؟", 
      start: "لنبدأ", 
      back: "رجوع", 
      style: "ما هو أسلوبك؟", 
      nearby: "كم منك",
      distLabel: "المسافة منك:",
      home: "الرئيسية",
      youAreHere: "أنت هنا",
      regions: { all: "כל البلاد", north: "شمال", center: "مركز", south: "جنوب" },
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
      search: "Поиск...", 
      results: "Результаты", 
      surprise: "Удиви меня", 
      welcome: "Куדה поедем сегодня?", 
      start: "Поехали", 
      back: "Назад", 
      style: "Какой стиль?", 
      nearby: "км от вас",
      distLabel: "Расстояние:",
      home: "Домой",
      youAreHere: "Вы здесь",
      regions: { all: "Израиль", north: "Север", center: "Центр", south: "Юг" },
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
        river: "Реки ורוח'י"
      }
    }
  };

  /**
   * טעינת רכיבי המפה וזיהוי מיקום המשתמש
   */
  useEffect(() => {
    setIsClient(true);
    
    // בקשת גישה למיקום GPS מהדפדפן
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error("GPS Location access denied or error:", err);
        }
      );
    }

    // ייבוא דינמי של Leaflet למניעת שגיאות ב-Next.js
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      // תיקון נתיבי אייקונים של ברירת המחדל
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // יצירת אייקון אדום לסימון המשתמש
      const userRedMarker = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      setRedIcon(userRedMarker);
      setLeafletComponents(res);
    });
  }, []);

  /**
   * לוגיקת סינון ומיון הנתונים
   * מסננת לפי שם, קטגוריה ואזור, וממיינת לפי מרחק מהמשתמש
   */
  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      // בדיקה אם השם תואם לחיפוש בכל השפות
      const matchesName = Object.values(item.name).some(n => String(n).toLowerCase().includes(searchLower));
      // בדיקה אם הקטגוריה תואמת
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      // בדיקה אם האזור תואם
      const matchesRegion = activeRegion === 'all' || (item as any).region === activeRegion;
      
      return matchesName && matchesCategory && matchesRegion;
    });

    // מיון התוצאות מהקרוב ביותר למשתמש במידה והמיקום זמין
    if (userLocation) {
      return [...result].sort((a, b) => {
        const distA = getDistance(userLocation[0], userLocation[1], a.coords[0], a.coords[1]);
        const distB = getDistance(userLocation[0], userLocation[1], b.coords[0], b.coords[1]);
        return distA - distB;
      });
    }
    return result;
  }, [searchQuery, activeCategory, activeRegion, userLocation]);

  /**
   * פונקציה להזזת המפה למיקום מסוים
   */
  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14);
    }
  };

  /**
   * לוגיקת "תפתיע אותי" - בחירה אקראית של מקום מהתוצאות הקרובות
   */
  const handleSurprise = () => {
    const pool = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const place = pool[randomIndex];
    
    setActiveCategory('all');
    setSearchQuery('');
    setView('map');
    
    // המתנה קלה למעבר המסך ואז הזזת המפה
    setTimeout(() => {
      handleFlyTo(place.coords as [number, number]);
    }, 500);
  };

  // בדיקה אם הרכיבים נטענו
  if (!isClient || !LeafletComponents) return null;
  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* מסך בית - Home View */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10">
            
            <div className="flex items-center justify-center gap-6 mb-4">
               {/* לוגו עם קישור ואנימציית סיבוב */}
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Logo" 
                   className="w-24 h-24 rounded-full border-4 border-white shadow-2xl transition-transform duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               <h1 className="text-8xl font-black tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            </div>

            <p className="text-2xl font-light mb-12 opacity-90">{ui[lang].welcome}</p>
            
            <div className="flex flex-col gap-4 w-64 mx-auto">
              <button 
                onClick={() => setView('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 rounded-2xl font-bold text-2xl shadow-2xl transition-transform active:scale-95"
              >
                {ui[lang].start}
              </button>
              
              <button 
                onClick={handleSurprise} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 rounded-2xl font-bold text-xl transition-all"
              >
                🎲 {ui[lang].surprise}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית */}
            <div className="mt-12 flex justify-center gap-3">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setLang(l)} 
                  className={`px-4 py-2 rounded-lg font-bold border transition-all ${lang === l ? 'bg-green-600 border-green-600 shadow-lg' : 'bg-white/10 border-white/30 hover:bg-white/20'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* שאלון סגנון - Quiz View עם 10 כרטיסיות */}
      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          <h2 className="text-4xl font-black text-gray-800 mb-10">{ui[lang].style}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 w-full max-w-6xl p-4">
            {/* מיפוי 10 הקטגוריות לכפתורים מעוצבים */}
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-4 bg-white hover:bg-green-50 rounded-3xl shadow-md border-4 border-transparent hover:border-green-400 transition-all group p-4"
              >
                <span className="text-6xl group-hover:scale-125 transition-transform">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-sm leading-tight">{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setView('home')} 
            className="mt-12 text-green-700 font-bold underline text-lg hover:text-green-800"
          >
            {ui[lang].back}
          </button>
        </div>
      )}

      {/* מצב מפה - Map View Main */}
      {view === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header עליון של המפה */}
          <header className="bg-white border-b p-4 flex flex-col gap-4 z-[2000] shadow-md">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Logo" 
                     className="w-10 h-10 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-3xl font-black text-green-700 cursor-pointer" onClick={() => setView('home')}>Tiyulify</h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header של המפה */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setLang(l)} 
                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${lang === l ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 w-full">
              {/* שורת חיפוש */}
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={ui[lang].search} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-10 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm" 
                />
                <span className={`absolute top-2.5 opacity-30 ${lang === 'he' || lang === 'ar' ? 'right-3' : 'left-3'}`}>🔍</span>
              </div>

              {/* בקרת פילטרים משולבת - אזורים וקטגוריות */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {/* בחירת אזור */}
                <select 
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value)}
                  className="bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-xl text-sm outline-none border-none cursor-pointer shadow-sm hover:bg-blue-100 transition-colors"
                >
                  {Object.entries(ui[lang].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {/* לחצני קטגוריות מהירים */}
                {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCategory(id)} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* רשימת תוצאות צדדית (Sidebar) */}
            <aside className="w-80 bg-white border-r overflow-y-auto hidden md:block p-4 shadow-inner">
              <div className="flex justify-between items-center mb-4 text-gray-400 font-bold text-xs uppercase">
                <span>{ui[lang].results} ({filteredData.length})</span>
                {userLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              
              <div className="space-y-4">
                {filteredData.map((item: any) => {
                  const dist = userLocation ? getDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]).toFixed(1) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-2xl p-2 shadow-sm hover:shadow-md cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group"
                    >
                      <img src={item.image} className="w-full h-28 object-cover rounded-xl mb-2" />
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{item.name[lang] || item.name.he}</h3>
                      {dist && (
                        <p className="text-[10px] text-green-600 font-bold mt-1">
                          🚀 {dist} {ui[lang].nearby}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* מכולת המפה (Leaflet Map Container) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={mapRef}
              >
                {/* שכבת האריחים (Tiles) */}
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {/* הצגת מיקום המשתמש בסיכה אדומה */}
                {userLocation && redIcon && (
                  <Marker position={userLocation} icon={redIcon}>
                    <Popup>
                      <div className="text-center font-bold text-red-600">{ui[lang].youAreHere}</div>
                    </Popup>
                  </Marker>
                )}

                {/* מיפוי כל האתרים לסיכות (Markers) */}
                {filteredData.map((item: any) => {
                  // חישוב מרחק עבור הבלון שנפתח
                  const itemDist = userLocation ? getDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]).toFixed(1) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup>
                        <div className="text-right font-sans min-w-[250px]">
                          
                          {/* הצגת וידאו מיוטיוב אם קיים, אחרת הצגת תמונה */}
                          {item.video ? (
                            <div className="relative w-full h-40 mb-3">
                              <iframe 
                                className="w-full h-full rounded-lg shadow-sm" 
                                src={`https://www.youtube.com/embed/${item.video}`} 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                              ></iframe>
                            </div>
                          ) : (
                            <img 
                              src={item.image} 
                              alt="Place" 
                              className="w-full h-32 object-cover rounded-lg mb-2 shadow-sm border border-gray-100" 
                            />
                          )}
                          
                          {/* שם האתר */}
                          <h4 className="font-bold text-green-800 text-lg m-0 leading-tight">
                            {item.name[lang] || item.name.he}
                          </h4>
                          
                          {/* הצגת המרחק בתוך הבלון (Popup) */}
                          {itemDist && (
                            <p className="text-[11px] text-green-600 font-black my-1 bg-green-50 inline-block px-2 py-0.5 rounded border border-green-100">
                              {ui[lang].distLabel} {itemDist} {lang === 'he' ? 'ק"מ' : 'km'}
                            </p>
                          )}
                          
                          {/* תיאור האתר בשפה הנבחרת */}
                          <p className="text-xs text-gray-600 my-2 leading-relaxed border-t border-gray-50 pt-2">
                            {item.description[lang] || item.description.he}
                          </p>
                          
                          {/* כפתורי ניווט */}
                          <div className="flex gap-2 mt-4">
                            <a 
                              href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                              target="_blank" 
                              className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg text-xs font-bold no-underline shadow-md active:bg-blue-700 transition-colors"
                            >
                              Waze
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} 
                              target="_blank" 
                              className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-xs font-bold no-underline border border-gray-200 hover:bg-gray-200 transition-colors"
                            >
                              Maps
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* כפתורי שליטה צפים על המפה */}
              <button 
                onClick={handleSurprise} 
                className="absolute bottom-24 left-6 z-[2000] bg-green-600 text-white w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center text-xs font-bold border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-95 shadow-green-200"
              >
                <span className="text-2xl mb-0.5">🎲</span> {ui[lang].surprise}
              </button>
              
              <button 
                onClick={() => setView('home')} 
                className="absolute bottom-6 left-6 z-[2000] bg-white text-green-600 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl border-2 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90"
              >
                🏠
              </button>
            </div>
          </div>
        </div>
      )}

      {/* עיצוב CSS גלובלי לתיקון אלמנטים של Leaflet */}
      <style jsx global>{`
        .leaflet-marker-icon { margin-top: -34px !important; margin-left: -12px !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .leaflet-popup-content-wrapper { border-radius: 1rem; overflow: hidden; padding: 0; }
        .leaflet-popup-content { margin: 0; padding: 12px; }
      `}</style>
    </div>
  );
}