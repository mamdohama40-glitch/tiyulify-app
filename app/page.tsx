"use client";

import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json'

export default function TiyulifyApp() {
  const [isClient, setIsClient] = useState(false);
  const [lang, setLang] = useState('he');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
  
    // בדיקה אם המונח קיים באחת מהשפות בתוך האובייקט name
    const matchesName = item.name ? Object.values(item.name).some(nameStr => 
      String(nameStr).toLowerCase().includes(searchLower)
    ) : false;

    const matchesCategory = category === 'all' || item.category === category;

    return matchesName && matchesCategory;
  });
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

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

  useEffect(() => {
    let result = data;
    if (activeCategory !== 'all') {
      result = result.filter(item => item.category === activeCategory);
    }
    if (searchQuery) {
      result = result.filter(item => 
        (item.name[lang as keyof typeof item.name] || item.name.he).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredData(result);
  }, [activeCategory, searchQuery, lang]);

  const handleFlyTo = (coords: [number, number]) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14, { duration: 1.5 });
    }
  };

  const shareViaWhatsApp = (item: any) => {
    const name = item.name[lang as keyof typeof item.name] || item.name.he;
    const url = `https://www.google.com/maps?q=${item.coords[0]},${item.coords[1]}`;
    const text = `המלצה לטיול מ-Tiyulify: *${name}*\nלניווט: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isClient || !LeafletComponents) {
    return <div className="h-screen w-full flex items-center justify-center bg-blue-50 font-bold text-green-700 italic">טוען חוויה משודרגת...</div>;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;

  const ui: any = {
    he: { search: "חפש מקום...", results: "תוצאות", share: "שתף", nav: "ניווט" },
    ar: { search: "بحث عن مكان...", results: "نتائج", share: "مشاركة", nav: "ملاحة" },
    en: { search: "Search place...", results: "Results", share: "Share", nav: "Navigate" },
    ru: { search: "Поиск...", results: "Результаты", share: "Поделиться", nav: "Навигация" }
  };

  return (
    <div className="flex flex-col h-screen bg-white" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="absolute top-4 left-4 z-[2000] flex gap-1 bg-white/80 p-1 rounded-full shadow-lg backdrop-blur-md border border-gray-100">
        {['he', 'ar', 'en', 'ru'].map((l: any) => (
          <button key={l} onClick={() => setLang(l)} 
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${lang === l ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {l === 'he' ? 'עב' : l === 'ar' ? 'ع' : l.toUpperCase()}
          </button>
        ))}
      </div>

      <header className="p-4 border-b bg-white shadow-sm z-[1000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/Logo- Mamdoh1.gif" alt="Logo" className="h-10 w-10 rounded-full border border-green-500" />
            <h1 className="text-xl font-black text-green-700 italic tracking-tighter">Tiyulify</h1>
          </div>
          <div className="flex-1 w-full max-w-xl relative">
            <input 
              type="text" 
              placeholder={ui[lang].search}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-2.5 outline-none focus:border-green-400 focus:bg-white transition-all text-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {['all', 'water', 'nature'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCategory === cat ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                {cat === 'all' ? (lang === 'he' ? 'הכל' : 'All') : cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 overflow-y-auto bg-gray-50 border-l p-4 hidden lg:block shadow-inner">
          <h2 className="font-bold text-gray-700 mb-4 px-1">{ui[lang].results} ({filteredData.length})</h2>
          <div className="space-y-4">
            {filteredData.map((item: any) => (
              <div key={item.id} onClick={() => handleFlyTo(item.coords)} 
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-green-400 transition-all cursor-pointer group">
                {item.image ? (
                  <img src={item.image} alt={item.name.he} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-32 bg-green-50 flex items-center justify-center text-green-200 font-bold">Tiyulify</div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{item.name[lang as keyof typeof item.name] || item.name.he}</h3>
                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="py-2 bg-blue-600 text-white text-center rounded-lg text-[9px] font-black uppercase no-underline">Waze</a>
                    <a href={`https://www.google.com/maps?q=${item.coords[0]},${item.coords[1]}`} target="_blank" className="py-2 bg-white border border-blue-600 text-blue-600 text-center rounded-lg text-[9px] font-black uppercase no-underline">Google</a>
                    <button onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(item); }} className="py-2 bg-green-500 text-white text-center rounded-lg text-[9px] font-black uppercase">WA</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 z-0 relative">
          <MapContainer center={[32.5, 34.9]} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            {filteredData.map((item: any) => (
              <Marker key={item.id} position={item.coords}>
                <Popup>
                  <div className="text-right p-1 min-w-[200px] flex flex-col gap-2">
                    {/* הצגת תמונה אמיתית מה-JSON */}
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name[lang as keyof typeof item.name]} 
                        className="w-full h-32 object-cover rounded-lg shadow-sm"
                      />
                    )}
    
                   <div>
                     <h3 className="font-bold text-lg text-green-800">
                       {item.name[lang as keyof typeof item.name] || item.name.he}
                     </h3>
      
                     {/* הצגת התיאור בשפה הנבחרת */}
                     {item.description && (
                       <p className="text-xs text-gray-500 mt-1 line-clamp-2 text-right">
                         {item.description?.[lang as keyof typeof item.description] || item.description?.he || ""}
                       </p>
                     )}
                   </div>

                   <div className="flex flex-col gap-2 mt-1">
                      <a 
                        href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} 
                        target="_blank" 
                        className="bg-blue-600 text-white text-center py-2 rounded-md text-sm font-bold no-underline hover:bg-blue-700 transition-colors"
                        >
                       ניווט ב-Waze
                      </a>
                   </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}