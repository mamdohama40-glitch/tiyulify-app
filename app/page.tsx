"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

type ViewState = 'home' | 'quiz' | 'map';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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
      home: "בית", categories: { all: "הכל", water: "מים", nature: "טבע", history: "היסטוריה", sleep: "לינה", food: "אוכל", bike: "אופניים" }
    },
    en: { 
      search: "Search...", results: "Results", surprise: "Surprise Me", welcome: "Where to today?", 
      start: "Let's Go", back: "Back", style: "What's your style?", nearby: "Near Me",
      home: "Home", categories: { all: "All", water: "Water", nature: "Nature", history: "History", sleep: "Sleep", food: "Food", bike: "Bike" }
    },
    ar: { 
      search: "بحث...", results: "نتائج", surprise: "فاجئني", welcome: "أين نذهب היום؟", 
      start: "لنبدأ", back: "رجوع", style: "ما هو أسلوبك؟", nearby: "قريب مني",
      home: "الرئيسية", categories: { all: "الكل", water: "مياه", nature: "طبيعة", history: "تاريخ", sleep: "مبيت", food: "طعام", bike: "دراجات" }
    },
    ru: { 
      search: "Поиск...", results: "Результаты", surprise: "Удиви меня", welcome: "Куда поедем сегодня?", 
      start: "Поехали", back: "Назад", style: "Какой стиль?", nearby: "Рядом",
      home: "Домой", categories: { all: "Все", water: "Вода", nature: "Природа", history: "История", sleep: "Жилье", food: "Еда", bike: "Велосипед" }
    }
  };

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("Location denied")
      );
    }

    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([res, L]: any) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
      setLeafletComponents(res);
    });
  }, []);

  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = Object.values(item.name).some(n => String(n).toLowerCase().includes(searchLower));
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesName && matchesCategory;
    });

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

  if (!isClient || !LeafletComponents) return null;

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* מסך בית */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          
          {/* בורר שפות במסך הבית */}
          <div className="absolute top-6 flex gap-2 z-20">
            {['he', 'ar', 'en', 'ru'].map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`w-10 h-10 rounded-full font-bold transition-all border ${lang === l ? 'bg-green-600 text-white border-green-600' : 'bg-white/20 text-white border-white/50'}`}>{l === 'he' ? 'עב' : l === 'ar' ? 'ع' : l.toUpperCase()}</button>
            ))}
          </div>

          <div className="relative z-10 text-white text-center mt-20">
            <h1 className="text-7xl font-black mb-4 tracking-tighter drop-shadow-2xl">Tiyulify</h1>
            <p className="text-2xl font-light mb-12 opacity-90">{ui[lang].welcome}</p>
            <button onClick={() => setView('quiz')} className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95">
              {ui[lang].start}
            </button>
          </div>
        </div>
      )}

      {/* שאלון קטגוריות */}
      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-green-50">
          <h2 className="text-4xl font-black text-gray-800 mb-10">{ui[lang].style}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button key={id} onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-4 bg-white hover:bg-white rounded-3xl shadow-md hover:shadow-xl border-4 border-transparent hover:border-green-400 transition-all group">
                <span className="text-5xl group-hover:scale-110 transition-transform">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : '🚲'}
                </span>
                <span className="font-black text-gray-700 text-lg">{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setView('home')} className="mt-12 text-green-700 font-bold underline text-lg">{ui[lang].back}</button>
        </div>
      )}

      {/* מצב מפה */}
      {view === 'map' && (
        <div className="flex flex-col h-full">
          <header className="bg-white border-b p-3 flex flex-col lg:flex-row items-center gap-4 z-[2000] shadow-md">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <h2 className="text-2xl font-black text-green-700 cursor-pointer" onClick={() => setView('home')}>Tiyulify</h2>
              
              {/* בורר שפה משולב ב-Header */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {['he', 'ar', 'en', 'ru'].map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded text-[10px] font-bold ${lang === l ? 'bg-green-600 text-white' : 'text-gray-400'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full max-w-md relative">
              <input type="text" placeholder={ui[lang].search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-10 focus:border-green-400 outline-none transition-all" />
              <span className={`absolute top-2.5 opacity-30 ${lang === 'he' || lang === 'ar' ? 'right-3' : 'left-3'}`}>🔍</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 w-full lg:w-auto no-scrollbar">
              {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                <button key={id} onClick={() => setActiveCategory(id)} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            {/* רשימה צדדית */}
            <aside className="w-80 bg-gray-50 border-r overflow-y-auto hidden md:block p-4 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase">{ui[lang].results} ({filteredData.length})</p>
              {filteredData.map((item: any) => (
                <div key={item.id} onClick={() => handleFlyTo(item.coords)} 
                  className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group">
                  <img src={item.image} onError={(e:any) => e.target.src = categoryPlaceholders[item.category]} className="w-full h-28 object-cover rounded-xl mb-2" />
                  <h3 className="font-bold text-gray-800 text-sm">{item.name[lang] || item.name.he}</h3>
                </div>
              ))}
            </aside>

            {/* מפה */}
            <div className="flex-1 relative">
              <MapContainer center={[32.0, 34.9]} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {filteredData.map((item: any) => (
                  <Marker key={item.id} position={item.coords}>
                    <Popup>
                      <div className="text-right font-sans min-w-[180px]">
                        <img src={item.image} onError={(e:any) => e.target.src = categoryPlaceholders[item.category]} className="w-full h-24 object-cover rounded-lg mb-2" />
                        <h4 className="font-bold text-green-800 m-0">{item.name[lang] || item.name.he}</h4>
                        <div className="flex gap-2 mt-3">
                          <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-2 rounded-md text-[10px] font-bold no-underline">WAZE</a>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-200 text-gray-700 text-center py-2 rounded-md text-[10px] font-bold no-underline">MAPS</a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* כפתור בית צף */}
              <button onClick={() => setView('home')} className="absolute bottom-6 right-6 z-[2000] bg-white text-green-600 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl border-2 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110">
                🏠
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* תיקון CSS למרקרים של Leaflet */}
      <style jsx global>{`
        .leaflet-marker-icon, .leaflet-marker-shadow {
          margin-top: -34px !important;
          margin-left: -12px !important;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}