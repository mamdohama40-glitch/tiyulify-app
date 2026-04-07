"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

type ViewState = 'home' | 'quiz' | 'map';

export default function TiyulifyApp() {
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

  const ui: any = {
    he: { 
      search: "חפש מקום...", 
      results: "תוצאות", 
      surprise: "תפתיע אותי", 
      welcome: "לאן נטייל היום?", 
      start: "בואו נתחיל",
      back: "חזרה לדף הבית",
      style: "מה הסגנון שלכם עכשיו?",
      categories: { all: "הכל", water: "מים", nature: "טבע", history: "היסטוריה", sleep: "לינה", food: "אוכל", bike: "אופניים" }
    },
    en: { 
      search: "Search...", 
      results: "Results", 
      surprise: "Surprise Me", 
      welcome: "Where to today?", 
      start: "Let's Go",
      back: "Back Home",
      style: "What's your style?",
      categories: { all: "All", water: "Water", nature: "Nature", history: "History", sleep: "Sleep", food: "Food", bike: "Bike" }
    },
    ar: { 
      search: "بحث...", 
      results: "نتائج", 
      surprise: "فاجئني", 
      welcome: "أين نذهب اليوم؟", 
      start: "لنبدأ",
      back: "العودة للرئيسية",
      style: "ما هو أسلوبك الآن؟",
      categories: { all: "الكل", water: "مياه", nature: "طبيعة", history: "تاريخ", sleep: "مبيت", food: "طعام", bike: "دراجات" }
    },
    ru: { 
      search: "Поиск...", 
      results: "Результаты", 
      surprise: "Удиви меня", 
      welcome: "Куда поедем сегодня?", 
      start: "Поехали",
      back: "На главную",
      style: "Какой у вас стиль?",
      categories: { all: "Все", water: "Вода", nature: "Природа", history: "История", sleep: "Жилье", food: "Еда", bike: "Велосипед" }
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const searchLower = (searchQuery || "").toLowerCase();
      const matchesName = item.name ? Object.values(item.name).some(nameStr => 
        String(nameStr).toLowerCase().includes(searchLower)
      ) : false;
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesName && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    setIsClient(true);
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

  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14, { duration: 1.5 });
    }
  };

  const handleSurprise = () => {
    const randomIndex = Math.floor(Math.random() * data.length);
    const place = data[randomIndex];
    setActiveCategory('all');
    setSearchQuery('');
    setView('map');
    setTimeout(() => handleFlyTo(place.coords as [number, number]), 500);
  };

  if (!isClient || !LeafletComponents) {
    return <div className="h-screen w-full flex items-center justify-center bg-blue-50 font-bold text-green-700 italic">Tiyulify Loading...</div>;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  const HomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 via-white to-blue-50 text-center">
      <div className="mb-8 animate-bounce">
        <img src="/Logo- Mamdoh1.gif" alt="Logo" className="h-28 w-28 rounded-full shadow-2xl border-4 border-white" />
      </div>
      <h1 className="text-5xl font-black text-green-800 mb-2 tracking-tighter italic">Tiyulify</h1>
      <p className="text-xl text-gray-600 mb-12 font-medium">{ui[lang].welcome}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
        <button onClick={() => setView('quiz')} className="bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 font-bold text-lg flex items-center justify-center gap-3">
          <span>🔍</span> {ui[lang].start}
        </button>
        <button onClick={handleSurprise} className="bg-white hover:bg-gray-50 text-green-700 border-2 border-green-600 p-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 font-bold text-lg flex items-center justify-center gap-3">
          <span>🎲</span> {ui[lang].surprise}
        </button>
      </div>
    </div>
  );

  const QuizScreen = () => {
    const questions = [
      { id: 'water', label: lang === 'he' ? 'בא לי מים' : ui[lang].categories.water, icon: '💦' },
      { id: 'nature', label: lang === 'he' ? 'בא לי טבע' : ui[lang].categories.nature, icon: '🏞️' },
      { id: 'history', label: lang === 'he' ? 'קצת היסטוריה' : ui[lang].categories.history, icon: '🏰' },
      { id: 'sleep', label: lang === 'he' ? 'בא לי לישון' : ui[lang].categories.sleep, icon: '🏕️' },
      { id: 'food', label: lang === 'he' ? 'בא לי לאכול' : ui[lang].categories.food, icon: '🍕' },
      { id: 'bike', label: lang === 'he' ? 'בא לי אופניים' : ui[lang].categories.bike, icon: '🚲' }
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
        <h2 className="text-3xl font-black text-gray-800 mb-8">{ui[lang].style}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          {questions.map(q => (
            <button key={q.id} onClick={() => { setActiveCategory(q.id); setView('map'); }}
              className="flex items-center gap-4 p-5 bg-gray-50 hover:bg-green-50 border-2 border-transparent hover:border-green-400 rounded-2xl transition-all group text-right">
              <span className="text-3xl group-hover:scale-110 transition-transform">{q.icon}</span>
              <span className="font-bold text-gray-700 text-lg">{q.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setView('home')} className="mt-8 text-gray-400 underline font-medium">{ui[lang].back}</button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      <div className="absolute top-4 left-4 z-[2000] flex gap-1 bg-white/90 p-1 rounded-full shadow-lg backdrop-blur-md border border-gray-100">
        {['he', 'ar', 'en', 'ru'].map((l: any) => (
          <button key={l} onClick={() => setLang(l)} 
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${lang === l ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {l === 'he' ? 'עב' : l === 'ar' ? 'ع' : l.toUpperCase()}
          </button>
        ))}
      </div>

      {view === 'home' && <HomeScreen />}
      {view === 'quiz' && <QuizScreen />}
      
      {view === 'map' && (
        <>
          <header className="p-4 border-b bg-white shadow-sm z-[1000]">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
                <img src="/Logo- Mamdoh1.gif" alt="Logo" className="h-10 w-10 rounded-full border border-green-500" />
                <h1 className="text-xl font-black text-green-700 italic tracking-tighter">Tiyulify</h1>
              </div>
              
              <div className="flex-1 w-full max-w-xl relative group">
                <input 
                  type="text" 
                  placeholder={ui[lang].search}
                  value={searchQuery}
                  className={`w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-2.5 outline-none focus:border-green-400 focus:bg-white transition-all text-sm ${lang === 'he' || lang === 'ar' ? 'pr-12 pl-5' : 'pl-12 pr-5'}`}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${lang === 'he' || lang === 'ar' ? 'right-4' : 'left-4'}`}>🔍</div>
              </div>

              <div className="flex gap-1 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                {Object.keys(ui[lang].categories).map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    {ui[lang].categories[cat]}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <aside className="w-80 overflow-y-auto bg-gray-50 border-l p-4 hidden lg:block">
              <h2 className="font-bold text-gray-700 mb-4 px-1">{ui[lang].results} ({filteredData.length})</h2>
              <div className="space-y-4">
                {filteredData.map((item: any) => (
                  <div key={item.id} onClick={() => handleFlyTo(item.coords)} 
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-green-400 transition-all cursor-pointer group text-right">
                    <img src={item.image} alt={item.name.he} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-1">{item.name[lang] || item.name.he}</h3>
                      {item.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                          {item.description[lang] || item.description.he}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-1.5 mt-3">
                        <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="py-2 bg-blue-600 text-white text-center rounded-lg text-[9px] font-black uppercase no-underline">Waze</a>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="py-2 bg-white border border-blue-600 text-blue-600 text-center rounded-lg text-[9px] font-black uppercase no-underline">Google</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="flex-1 z-0 relative">
              <MapContainer center={[31.5, 34.9]} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {filteredData.map((item: any) => (
                  <Marker key={item.id} position={item.coords}>
                    <Popup>
                      <div className="text-right p-1 min-w-[200px] flex flex-col gap-2">
                        <img src={item.image} className="w-full h-32 object-cover rounded-lg shadow-sm" />
                        <h3 className="font-bold text-lg text-green-800 m-0">{item.name[lang] || item.name.he}</h3>
                        {item.description && (
                          <p className="text-xs text-gray-600 m-0">
                            {item.description[lang] || item.description.he}
                          </p>
                        )}
                        <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="bg-blue-600 text-white text-center py-2 rounded-md text-sm font-bold no-underline mt-2">Waze</a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <button onClick={() => setView('home')} className="absolute bottom-6 right-6 z-[1000] bg-white text-green-600 p-4 rounded-full shadow-2xl border-2 border-green-600 hover:bg-green-50 transition-colors">🏠</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}