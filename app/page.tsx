"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

type ViewState = 'home' | 'quiz' | 'map';

// פונקציית עזר לחישוב מרחק בין קואורדינטות (Haversine Formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TiyulifyApp() {
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

  const ui: any = {
    he: { 
      search: "חפש מקום...", results: "תוצאות", surprise: "תפתיע אותי", welcome: "לאן נטייל היום?", 
      start: "בואו נתחיל", back: "חזרה", style: "מה הסגנון שלכם?", nearby: "קרוב אלי",
      locPermission: "אשר מיקום להצעות קרובות", categories: { all: "הכל", water: "מים", nature: "טבע", history: "היסטוריה", sleep: "לינה", food: "אוכל", bike: "אופניים" }
    },
    en: { 
      search: "Search...", results: "Results", surprise: "Surprise Me", welcome: "Where to today?", 
      start: "Let's Go", back: "Back", style: "What's your style?", nearby: "Near Me",
      locPermission: "Allow location for nearby spots", categories: { all: "All", water: "Water", nature: "Nature", history: "History", sleep: "Sleep", food: "Food", bike: "Bike" }
    },
    ar: { 
      search: "بحث...", results: "نتائج", surprise: "فاجئني", welcome: "أين نذهب اليوم؟", 
      start: "لنبدأ", back: "رجوع", style: "ما هو أسلوبك؟", nearby: "قريب مني",
      locPermission: "اسمح بموقعك للحصول على اقتراحات قريبة", categories: { all: "الكل", water: "مياه", nature: "طبيعة", history: "تاريخ", sleep: "مبيت", food: "طعام", bike: "دراجات" }
    },
    ru: { 
      search: "Поиск...", results: "Результаты", surprise: "Удиви меня", welcome: "Куда поедем сегодня?", 
      start: "Поехали", back: "Назад", style: "Какой стиль?", nearby: "Рядом",
      locPermission: "Разрешите доступ ל местоположению", categories: { all: "Все", water: "Вода", nature: "Природа", history: "История", sleep: "Жилье", food: "Еда", bike: "Велосипед" }
    }
  };

  // תמונות ברירת מחדל לפי קטגוריה אם התמונה ב-JSON שבורה
  const categoryPlaceholders: any = {
    water: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
    nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
    history: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
    food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    sleep: "https://images.unsplash.com/photo-1523906834658-6e24ef23a6f8?w=800",
    bike: "https://images.unsplash.com/photo-1444491741275-3747c53c99b4?w=800",
    all: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"
  };

  useEffect(() => {
    setIsClient(true);
    // טעינת מיקום משתמש
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("Location denied")
      );
    }

    import('react-leaflet').then((res) => setLeafletComponents(res));
  }, []);

  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = Object.values(item.name).some(n => String(n).toLowerCase().includes(searchLower));
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesName && matchesCategory;
    });

    // מיון לפי מרחק אם יש מיקום משתמש
    if (userLocation) {
      return [...result].sort((a, b) => {
        const distA = getDistance(userLocation[0], userLocation[1], a.coords[0], a.coords[1]);
        const distB = getDistance(userLocation[0], userLocation[1], b.coords[0], b.coords[1]);
        return distA - distB;
      });
    }
    return result;
  }, [searchQuery, activeCategory, userLocation]);

  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) mapRef.current.flyTo(coords, 14);
  };

  const handleSurprise = () => {
    // "תפתיע אותי" חכם: לוקח את המקומות הכי קרובים אלי מהסינון הנוכחי ובוחר אחד מהם
    const pool = filteredData.length > 0 ? filteredData.slice(0, 5) : data;
    const place = pool[Math.floor(Math.random() * pool.length)];
    setView('map');
    setTimeout(() => handleFlyTo(place.coords as [number, number]), 500);
  };

  if (!isClient || !LeafletComponents) return null;

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* בורר שפה צף - עיצוב משופר */}
      <div className="fixed top-4 left-4 z-[3000] flex gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-white/50">
        {['he', 'ar', 'en', 'ru'].map((l) => (
          <button key={l} onClick={() => setLang(l)} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${lang === l ? 'bg-green-600 text-white shadow-lg scale-110' : 'text-gray-600 hover:bg-gray-100'}`}>
            {l === 'he' ? 'עב' : l === 'ar' ? 'ع' : l.toUpperCase()}
          </button>
        ))}
      </div>

      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative z-10 text-white text-center">
            <div className="bg-white p-4 rounded-full w-24 h-24 mx-auto mb-6 shadow-2xl flex items-center justify-center">
              <span className="text-4xl">🌳</span>
            </div>
            <h1 className="text-7xl font-black mb-4 tracking-tighter drop-shadow-lg">Tiyulify</h1>
            <p className="text-2xl font-light mb-12 opacity-90">{ui[lang].welcome}</p>
            <div className="flex flex-col gap-4 w-64 mx-auto">
              <button onClick={() => setView('quiz')} className="bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold text-xl shadow-xl transition-transform active:scale-95">
                {ui[lang].start}
              </button>
              <button onClick={handleSurprise} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-2 border-white/50 py-4 rounded-2xl font-bold text-xl transition-all">
                🎲 {ui[lang].surprise}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
          <h2 className="text-4xl font-black text-gray-800 mb-10">{ui[lang].style}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button key={id} onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-4 bg-white hover:bg-green-50 rounded-3xl shadow-sm hover:shadow-xl border-2 border-transparent hover:border-green-400 transition-all group">
                <span className="text-5xl group-hover:scale-125 transition-transform">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : '🚲'}
                </span>
                <span className="font-bold text-gray-700">{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setView('home')} className="mt-12 text-gray-400 hover:text-green-600 transition-colors font-bold uppercase tracking-widest">{ui[lang].back}</button>
        </div>
      )}

      {view === 'map' && (
        <div className="flex flex-col h-full">
          {/* Header משופר */}
          <header className="bg-white/80 backdrop-blur-lg border-b p-4 flex flex-col md:flex-row items-center gap-4 z-[2000] shadow-sm">
            <h2 className="text-2xl font-black text-green-700 cursor-pointer" onClick={() => setView('home')}>Tiyulify</h2>
            <div className="flex-1 w-full max-w-md relative">
              <input type="text" placeholder={ui[lang].search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl py-2 px-10 focus:ring-2 focus:ring-green-400 outline-none" />
              <span className="absolute left-3 top-2.5 opacity-30">🔍</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
              {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                <button key={id} onClick={() => setActiveCategory(id)} 
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 flex relative">
            {/* רשימה צדדית למחשב */}
            <aside className="w-96 bg-gray-50 border-r overflow-y-auto hidden lg:block p-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-400 uppercase">{ui[lang].results} ({filteredData.length})</span>
                {userLocation && <span className="text-xs text-green-600 font-bold">📍 {ui[lang].nearby}</span>}
              </div>
              {filteredData.map((item: any) => (
                <div key={item.id} onClick={() => handleFlyTo(item.coords)} 
                  className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-green-300 transition-all group">
                  <div className="relative h-32 w-full mb-3 rounded-xl overflow-hidden">
                    <img 
                      src={item.image} 
                      onError={(e:any) => e.target.src = categoryPlaceholders[item.category] || categoryPlaceholders.all}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm">
                      {item.category}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800">{item.name[lang] || item.name.he}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description[lang] || item.description.he}</p>
                </div>
              ))}
            </aside>

            {/* מפה */}
            <div className="flex-1 relative">
              <MapContainer center={[31.5, 34.9]} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {filteredData.map((item: any) => (
                  <Marker key={item.id} position={item.coords}>
                    <Popup className="custom-popup">
                      <div className="text-right font-sans min-w-[200px]">
                        <img 
                          src={item.image} 
                          onError={(e:any) => e.target.src = categoryPlaceholders[item.category] || categoryPlaceholders.all}
                          className="w-full h-24 object-cover rounded-lg mb-2" 
                        />
                        <h4 className="font-bold text-green-800">{item.name[lang] || item.name.he}</h4>
                        <p className="text-xs text-gray-600 my-1">{item.description[lang] || item.description.he}</p>
                        <div className="flex gap-2 mt-3">
                          <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-500 text-white text-center py-2 rounded-lg text-xs font-bold no-underline">Waze</a>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-xs font-bold no-underline">Google</a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              
              {/* כפתור תפתיע אותי צף מעל המפה */}
              <button onClick={handleSurprise} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-2xl hover:bg-green-700 transition-all flex items-center gap-2">
                <span>🎲</span> {ui[lang].surprise}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}