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
  const [redIcon, setRedIcon] = useState<any>(null);
  const mapRef = useRef<any>(null);

  const ui: any = {
    he: { 
      search: "חפש מקום...", results: "תוצאות", surprise: "תפתיע אותי", welcome: "לאן נטייל היום?", 
      start: "בואו נתחיל", back: "חזרה", style: "מה הסגנון שלכם?", nearby: "קמ ממך",
      home: "בית", youAreHere: "אתם כאן", categories: { all: "הכל", water: "מים", nature: "טבע", history: "היסטוריה", sleep: "לינה", food: "אוכל", bike: "אופניים" }
    },
    en: { 
      search: "Search...", results: "Results", surprise: "Surprise Me", welcome: "Where to today?", 
      start: "Let's Go", back: "Back", style: "What's your style?", nearby: "km away",
      home: "Home", youAreHere: "You are here", categories: { all: "All", water: "Water", nature: "Nature", history: "History", sleep: "Sleep", food: "Food", bike: "Bike" }
    },
    ar: { 
      search: "بحث...", results: "نتائج", surprise: "فاجئني", welcome: "أين نذهب היום؟", 
      start: "لنبدأ", back: "رجوع", style: "ما هو أسلوبك؟", nearby: "كم منك",
      home: "الرئيسية", youAreHere: "أنت هنا", categories: { all: "الكل", water: "مياه", nature: "طبيعة", history: "تاريخ", sleep: "مبيت", food: "طعام", bike: "دراجات" }
    },
    ru: { 
      search: "Поиск...", results: "Результаты", surprise: "Удиви меня", welcome: "Куда поедем сегодня?", 
      start: "Поехали", back: "Назад", style: "Какой стиль?", nearby: "км от вас",
      home: "Домой", youAreHere: "Вы здесь", categories: { all: "Все", water: "Вода", nature: "Природа", history: "История", sleep: "Жилье", food: "Еда", bike: "Велосипед" }
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("GPS Location denied")
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

      const redMarker = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      setRedIcon(redMarker);
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

  const handleSurprise = () => {
    const pool = filteredData.length > 0 ? filteredData.slice(0, 10) : data;
    const place = pool[Math.floor(Math.random() * pool.length)];
    setActiveCategory('all');
    setSearchQuery('');
    setView('map');
    setTimeout(() => handleFlyTo(place.coords as [number, number]), 500);
  };

  if (!isClient || !LeafletComponents) return null;
  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* מסך בית */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative z-10 text-center">
            <h1 className="text-8xl font-black mb-4 tracking-tighter drop-shadow-2xl italic">Tiyulify</h1>
            <p className="text-2xl font-light mb-12 opacity-90">{ui[lang].welcome}</p>
            <div className="flex flex-col gap-4 w-64 mx-auto">
              <button onClick={() => setView('quiz')} className="bg-green-500 hover:bg-green-600 py-4 rounded-2xl font-bold text-2xl shadow-2xl transition-transform active:scale-95">
                {ui[lang].start}
              </button>
              <button onClick={handleSurprise} className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 rounded-2xl font-bold text-xl">
                🎲 {ui[lang].surprise}
              </button>
            </div>
            <div className="mt-12 flex justify-center gap-3">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`px-4 py-2 rounded-lg font-bold border ${lang === l ? 'bg-green-600 border-green-600' : 'bg-white/10 border-white/30'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* שאלון סגנון */}
      {view === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
          <h2 className="text-4xl font-black text-gray-800 mb-10">{ui[lang].style}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {Object.entries(ui[lang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button key={id} onClick={() => { setActiveCategory(id); setView('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-4 bg-white hover:bg-green-50 rounded-3xl shadow-md border-4 border-transparent hover:border-green-400 transition-all group">
                <span className="text-6xl group-hover:scale-125 transition-transform">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : '🚲'}
                </span>
                <span className="font-black text-gray-700 text-lg">{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setView('home')} className="mt-12 text-green-700 font-bold underline">{ui[lang].back}</button>
        </div>
      )}

      {/* מסך מפה ראשי */}
      {view === 'map' && (
        <div className="flex flex-col h-full relative">
          <header className="bg-white/90 backdrop-blur-md border-b p-4 flex flex-col lg:flex-row items-center gap-4 z-[2000] shadow-sm">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <h2 className="text-3xl font-black text-green-700 cursor-pointer" onClick={() => setView('home')}>Tiyulify</h2>
              
              {/* בורר שפה - החזרתי אותו כאן! */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${lang === l ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full max-w-md relative">
              <input type="text" placeholder={ui[lang].search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl py-2 px-10 focus:ring-2 focus:ring-green-400 outline-none text-gray-800" />
              <span className={`absolute top-2.5 opacity-30 ${lang === 'he' || lang === 'ar' ? 'right-3' : 'left-3'}`}>🔍</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 w-full lg:w-auto no-scrollbar">
              {Object.entries(ui[lang].categories).map(([id, label]: any) => (
                <button key={id} onClick={() => setActiveCategory(id)} 
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === id ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            {/* רשימה צדדית */}
            <aside className="w-80 bg-white border-r overflow-y-auto hidden md:block p-4 shadow-inner">
              <div className="flex justify-between items-center mb-4 text-gray-400 font-bold text-xs uppercase">
                <span>{ui[lang].results} ({filteredData.length})</span>
                {userLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              <div className="space-y-4">
                {filteredData.map((item: any) => {
                  const dist = userLocation ? getDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]).toFixed(1) : null;
                  return (
                    <div key={item.id} onClick={() => handleFlyTo(item.coords)} 
                      className="bg-gray-50 rounded-2xl p-2 shadow-sm hover:shadow-md cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group">
                      <img src={item.image} className="w-full h-28 object-cover rounded-xl mb-2" />
                      <h3 className="font-bold text-gray-800 text-sm">{item.name[lang] || item.name.he}</h3>
                      {dist && <p className="text-[10px] text-green-600 font-bold mt-1">🚀 {dist} {ui[lang].nearby}</p>}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* מפה */}
            <div className="flex-1 relative">
              <MapContainer center={[32.0, 34.9]} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {userLocation && redIcon && (
                  <Marker position={userLocation} icon={redIcon}>
                    <Popup><div className="text-center font-bold">{ui[lang].youAreHere}</div></Popup>
                  </Marker>
                )}

                {filteredData.map((item: any) => (
                  <Marker key={item.id} position={item.coords}>
                    <Popup>
                      <div className="text-right font-sans min-w-[220px]">
                        <img src={item.image} className="w-full h-28 object-cover rounded-lg mb-2 shadow-sm" />
                        <h4 className="font-bold text-green-800 text-lg m-0">{item.name[lang] || item.name.he}</h4>
                        
                        {/* תיאור האתר - החזרתי אותו כאן! */}
                        <p className="text-xs text-gray-600 my-2 leading-relaxed">
                          {item.description[lang] || item.description.he}
                        </p>

                        <div className="flex gap-2 mt-4">
                          <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg text-xs font-bold no-underline shadow-md">Waze</a>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-xs font-bold no-underline border border-gray-200">Maps</a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              <button onClick={handleSurprise} className="absolute bottom-24 left-6 z-[2000] bg-green-600 text-white w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center text-xs font-bold border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110">
                <span className="text-2xl mb-0.5">🎲</span> {ui[lang].surprise}
              </button>
              
              <button onClick={() => setView('home')} className="absolute bottom-6 left-6 z-[2000] bg-white text-green-600 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl border-2 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110">
                🏠
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .leaflet-marker-icon { margin-top: -34px !important; margin-left: -12px !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}