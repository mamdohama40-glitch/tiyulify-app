"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

type ViewState = 'home' | 'quiz' | 'map';
interface GeoResult { display_name: string; lat: string; lon: string; place_id: number; }

function calculateDistance(a: number, b: number, c: number, d: number): string {
  if (!a || !b || !c || !d) return "0.0";
  const R = 6371, dL = (c-a)*Math.PI/180, dLo = (d-b)*Math.PI/180;
  const x = Math.sin(dL/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLo/2)**2;
  return (R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))).toFixed(1);
}

function getYoutubeLink(id: string): string {
  if (!id) return "";
  const o = typeof window!=='undefined' ? `&origin=${window.location.origin}` : "";
  return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1${o}`;
}


// ============================================================
// SmartImage — תמונה חכמה עם fallback אוטומטי
// מנסה: 1) item.image  2) Wikimedia API  3) placeholder צבעוני
// ============================================================
const CATEGORY_COLORS: Record<string, string> = {
  water: '#3b82f6', nature: '#22c55e', history: '#a16207',
  sleep: '#8b5cf6', accommodation: '#8b5cf6', food: '#f97316',
  bike: '#ef4444', hiking: '#84cc16', promenade: '#06b6d4',
  beach: '#0ea5e9', river: '#6366f1', park: '#10b981',
  cafe: '#92400e', default: '#6b7280'
};

const CATEGORY_EMOJI: Record<string, string> = {
  water: '💧', nature: '🌿', history: '🏛️', sleep: '🏕️',
  accommodation: '🛖', food: '🍽️', bike: '🚲', hiking: '🥾',
  promenade: '🚶', beach: '🏖️', river: '🌊', park: '🌳',
  cafe: '☕', default: '📍'
};

function SmartImage({ item, className }: { item: any; className?: string }) {
  const [src, setSrc] = React.useState<string>(item.image || '');
  const [tried, setTried] = React.useState(0); // 0=original, 1=wikimedia, 2=placeholder
  const [wikiSrc, setWikiSrc] = React.useState<string | null>(null);

  // Fetch Wikimedia image when original fails
  React.useEffect(() => {
    if (tried !== 1) return;
    const name = item.name?.he || item.name?.en || '';
    if (!name) { setTried(2); return; }
    const searchTerm = encodeURIComponent(name);
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${searchTerm}`)
      .then(r => r.json())
      .then(d => {
        const imgUrl = d?.thumbnail?.source || d?.originalimage?.source;
        if (imgUrl) { setWikiSrc(imgUrl); setSrc(imgUrl); }
        else { setTried(2); }
      })
      .catch(() => setTried(2));
  }, [tried, item.name]);

  const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.default;
  const emoji = CATEGORY_EMOJI[item.category] || CATEGORY_EMOJI.default;
  const label = item.name?.he || item.name?.en || '';

  if (tried === 2) {
    // Beautiful colored placeholder
    return (
      <div className={className} style={{
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '8px', border: `2px solid ${color}33`
      }}>
        <span style={{ fontSize: '2.5rem' }}>{emoji}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color, textAlign: 'center', padding: '0 8px', opacity: 0.8 }}>{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      className={className}
      alt={label}
      onError={() => {
        if (tried === 0) { setTried(1); setSrc(''); }
        else { setTried(2); }
      }}
      style={{ display: src ? 'block' : 'none' }}
    />
  );
}

export default function TiyulifyApp() {
  const [isClientReady, setIsClientReady] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [activeLang, setActiveLang] = useState('he');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState<[number,number]|null>(null);
  const [searchMarkerName, setSearchMarkerName] = useState('');
  const geoDebounce = useRef<any>(null);
  const [userCoords, setUserCoords] = useState<[number,number]|null>(null);
  const [LeafletMapLib, setLeafletMapLib] = useState<any>(null);
  const [userRedMarker, setUserRedMarker] = useState<any>(null);
  const [searchPinIcon, setSearchPinIcon] = useState<any>(null);
  const mapControl = useRef<any>(null);

  const labels: any = {
    he: {
      search:"חפש כל מקום בישראל...",results:"תוצאות",surprise:"תפתיע אותי",welcome:"לאן נטייל היום?",
      start:"בואו נתחיל",back:"חזרה",style:"מה הסגנון שלכם?",distText:'ק"מ ממך',distLabel:"מרחק:",
      home:"בית",here:"המיקום שלך",share:"שתף ב-WhatsApp",km:'ק"מ',loading:"טוען מפה...",noResults:"לא נמצאו תוצאות",
      regions:{all:"כל הארץ",north:"צפון",center:"מרכז",south:"דרום"},
      categories:{all:"הכל",water:"מים ומעיינות",nature:"פארקים וטבע",history:"היסטוריה",sleep:"לינה",
        food:"אוכל",bike:"אופניים",hiking:"הליכה",promenade:"טיילות",beach:"חופים",river:"נחלים"}
    },
    en: {
      search:"Search any place in Israel...",results:"Results",surprise:"Surprise Me",welcome:"Where to today?",
      start:"Let's Begin",back:"Go Back",style:"What's your style?",distText:"km away",distLabel:"Distance:",
      home:"Home",here:"You are here",share:"Share on WhatsApp",km:"km",loading:"Loading map...",noResults:"No results found",
      regions:{all:"All Israel",north:"North",center:"Center",south:"South"},
      categories:{all:"All",water:"Water & Springs",nature:"Parks & Nature",history:"History",sleep:"Camping",
        food:"Food",bike:"Cycling",hiking:"Hiking",promenade:"Promenades",beach:"Beaches",river:"Rivers"}
    },
    ar: {
      search:"ابحث عن أي مكان في إسرائيل...",results:"نتائج",surprise:"فاجئني",welcome:"أين نذهب اليوم؟",
      start:"لنبدأ",back:"رجوع",style:"ما هو أسلوبك؟",distText:"كم منك",distLabel:"المسافة:",
      home:"الرئيسية",here:"أنت هنا",share:"مشاركة واتساب",km:"كم",loading:"جارٍ التحميل...",noResults:"لا توجد نتائج",
      regions:{all:"كل البلاد",north:"الشمال",center:"الوسط",south:"الجنوب"},
      categories:{all:"الكل",water:"مياه وينابيع",nature:"منتزهات وطبيعة",history:"تاريخ وتراث",sleep:"إقامة وتخييم",
        food:"طعام ومطاعم",bike:"مسارات الدراجات",hiking:"مسارات المشي",promenade:"ممشى سياحي",beach:"شواطئ البحر",river:"أنهار وجداول"}
    },
    ru: {
      search:"Поиск любого места в Израиле...",results:"Результаты",surprise:"Удиви меня",welcome:"Куда поедем?",
      start:"Поехали",back:"Назад",style:"Какой стиль?",distText:"км от вас",distLabel:"Расстояние:",
      home:"Домой",here:"Вы здесь",share:"Поделиться WhatsApp",km:"км",loading:"Загрузка карты...",noResults:"Ничего не найдено",
      regions:{all:"Весь Израиль",north:"Север",center:"Центр",south:"Юг"},
      categories:{all:"Все",water:"Вода и источники",nature:"Парки и природа",history:"История",sleep:"Жилье",
        food:"Еда",bike:"Велосипед",hiking:"Пешие тропы",promenade:"Променады",beach:"Пляжи",river:"Реки"}
    }
  };

  useEffect(() => {
    setIsClientReady(true);
    if (typeof window!=='undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords([p.coords.latitude, p.coords.longitude]),
        () => {}, {enableHighAccuracy:true}
      );
    }
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([res, L]: any) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl:'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl:'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
      setUserRedMarker(new L.Icon({
        iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl:'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]
      }));
      setSearchPinIcon(new L.Icon({
        iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl:'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize:[30,46],iconAnchor:[15,46],popupAnchor:[1,-38],shadowSize:[41,41]
      }));
      setLeafletMapLib(res);
    });
  }, []);

  const handleGeoSearch = useCallback((query: string) => {
    setGeoQuery(query);
    setGeoResults([]);
    if (geoDebounce.current) clearTimeout(geoDebounce.current);
    if (!query || query.length < 2) return;
    geoDebounce.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const lang = activeLang==='he'?'he':activeLang==='ar'?'ar':'en';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=il&limit=6&accept-language=${lang}`;
        const r = await fetch(url);
        setGeoResults(await r.json());
      } catch(e) { console.error(e); }
      finally { setGeoLoading(false); }
    }, 400);
  }, [activeLang]);

  const handleSelectGeoResult = (result: GeoResult) => {
    const coords: [number,number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setSearchMarker(coords);
    setSearchMarkerName(result.display_name.split(',')[0]);
    setGeoQuery(result.display_name.split(',')[0]);
    setGeoResults([]);
    if (mapControl.current) mapControl.current.flyTo(coords, 15, {animate:true, duration:1.5});
  };

  const clearSearch = () => { setGeoQuery(''); setGeoResults([]); setSearchMarker(null); setSearchMarkerName(''); };

  const filteredItems = useMemo(() => {
    let r = data.filter((item: any) => {
      if (!item.name || !item.coords) return false;
      return (categoryFilter==='all' || item.category===categoryFilter) &&
             (regionFilter==='all' || (item.region && item.region===regionFilter));
    });
    if (userCoords) return [...r].sort((a,b) =>
      parseFloat(calculateDistance(userCoords[0],userCoords[1],a.coords[0],a.coords[1])) -
      parseFloat(calculateDistance(userCoords[0],userCoords[1],b.coords[0],b.coords[1]))
    );
    return r;
  }, [categoryFilter, regionFilter, userCoords]);

  const flyToCoords = (t: [number,number]) => { if(mapControl.current) mapControl.current.flyTo(t, 14, {animate:true,duration:2.0}); };

  const handleSurpriseMe = () => {
    const pool = filteredItems.length>0 ? filteredItems.slice(0,10) : data;
    const pick = pool[Math.floor(Math.random()*pool.length)] as any;
    setCategoryFilter('all'); setActiveView('map');
    setTimeout(() => flyToCoords(pick.coords as [number,number]), 800);
  };

  const shareOnWhatsApp = (item: any) => {
    const n = item.name[activeLang]||item.name.he;
    const u = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${n}\n${u}`)}`, '_blank');
  };

  const isRtl = activeLang==='ar'||activeLang==='he';

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={isRtl?'rtl':'ltr'}>

      {activeView==='home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"/>
          <div className="relative z-10 w-full max-w-2xl px-4 animate-fadeIn">
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
              <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                <img src="/Logo- Mamdoh1.gif" alt="Logo" className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover"/>
              </a>
              <h1 className="text-4xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic uppercase">Tiyulify</h1>
            </div>
            <p className="text-lg md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic">{labels[activeLang].welcome}</p>
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button onClick={()=>setActiveView('quiz')} className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95">{labels[activeLang].start}</button>
              <button onClick={handleSurpriseMe} className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all">🎲 {labels[activeLang].surprise}</button>
            </div>
            <div className="mt-16 md:mt-24 flex justify-center gap-3 md:gap-4 flex-wrap">
              {['he','ar','en','ru'].map(l=>(
                <button key={l} onClick={()=>setActiveLang(l)} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${activeLang===l?'bg-green-600 border-green-600 shadow-2xl scale-110 text-white':'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView==='quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{labels[activeLang].style}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {Object.entries(labels[activeLang].categories).filter(([id])=>id!=='all').map(([id,label]:any)=>(
              <button key={id} onClick={()=>{setCategoryFilter(id);setActiveView('map');}}
                className="aspect-square flex flex-col items-center justify-center gap-3 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4">
                <span className="text-4xl md:text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id==='water'?'💦':id==='nature'?'🏞️':id==='history'?'🏰':id==='sleep'?'🏕️':id==='food'?'🍕':id==='bike'?'🚲':id==='hiking'?'🥾':id==='promenade'?'🚶‍♂️':id==='beach'?'🏖️':'🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase tracking-tight">{label}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setActiveView('home')} className="mt-12 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors">{labels[activeLang].back}</button>
        </div>
      )}

      {activeView==='map' && (
        <div className="flex flex-col h-full relative">
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                  <img src="/Logo- Mamdoh1.gif" alt="Logo" className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover"/>
                </a>
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={()=>setActiveView('home')}>Tiyulify</h2>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he','ar','en','ru'].map(l=>(
                  <button key={l} onClick={()=>{setActiveLang(l);clearSearch();}} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeLang===l?'bg-green-600 text-white shadow-md':'text-gray-400 hover:text-gray-600'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 w-full px-2">
              {/* חיפוש גאוקודינג */}
              <div className="flex-1 relative">
                <div className="relative">
                  <input type="text" placeholder={labels[activeLang].search} value={geoQuery}
                    onChange={(e)=>handleGeoSearch(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg"/>
                  <span className={`absolute top-2.5 md:top-4 opacity-40 text-lg md:text-2xl pointer-events-none ${isRtl?'right-4':'left-4'}`}>{geoLoading?'⏳':'🔍'}</span>
                  {geoQuery && (
                    <button onClick={clearSearch} className={`absolute top-2 md:top-3 text-gray-400 hover:text-red-500 text-xl font-black px-2 ${isRtl?'left-2':'right-2'}`}>✕</button>
                  )}
                </div>
                {geoResults.length>0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border-2 border-green-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
                    {geoResults.map((r)=>(
                      <button key={r.place_id} onClick={()=>handleSelectGeoResult(r)}
                        className="w-full text-right px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-0 text-sm font-semibold text-gray-700 flex items-center gap-3 transition-colors">
                        <span className="text-green-500 text-lg shrink-0">📍</span>
                        <span className="truncate text-right flex-1">{r.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {geoQuery.length>=2 && !geoLoading && geoResults.length===0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-100 rounded-2xl shadow-xl z-[9999] p-4 text-center text-gray-400 font-semibold text-sm">{labels[activeLang].noResults}</div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select value={regionFilter} onChange={(e)=>setRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200">
                  {Object.entries(labels[activeLang].regions).map(([id,label]:any)=>(<option key={id} value={id}>{label}</option>))}
                </select>
                {Object.entries(labels[activeLang].categories).map(([id,label]:any)=>(
                  <button key={id} onClick={()=>setCategoryFilter(id)}
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${categoryFilter===id?'bg-green-600 text-white shadow-xl scale-105':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{label}</button>
                ))}
              </div>
            </div>
          </header>

          {(!isClientReady || !LeafletMapLib) ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center"><div className="text-6xl mb-4 animate-spin">🗺️</div><p className="text-gray-500 font-bold text-xl">{labels[activeLang].loading}</p></div>
            </div>
          ) : (()=>{
            const {MapContainer, TileLayer, Marker, Popup} = LeafletMapLib;
            return (
              <div className="flex-1 flex relative overflow-hidden">
                <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
                  <div className="flex justify-between items-center mb-10 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    <span>{labels[activeLang].results} ({filteredItems.length})</span>
                    {userCoords && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
                  </div>
                  <div className="space-y-8">
                    {filteredItems.map((item: any)=>{
                      const d = userCoords ? calculateDistance(userCoords[0],userCoords[1],item.coords[0],item.coords[1]) : null;
                      return (
                        <div key={item.id} onClick={()=>flyToCoords(item.coords)}
                          className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden">
                          <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                            <SmartImage item={item} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>
                          </div>
                          <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">{item.name[activeLang]||item.name.he}</h3>
                          {d && <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5"><span className="text-lg">🚀</span> {d} {labels[activeLang].distText}</p>}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <div className="flex-1 relative">
                  <MapContainer center={[32.0,34.9]} zoom={8} style={{height:'100%',width:'100%'}} ref={mapControl} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"/>
                    {userCoords && userRedMarker && (
                      <Marker position={userCoords} icon={userRedMarker}>
                        <Popup><div className="text-center font-black text-red-600 p-2 text-lg">📍 {labels[activeLang].here}</div></Popup>
                      </Marker>
                    )}
                    {searchMarker && searchPinIcon && (
                      <Marker position={searchMarker} icon={searchPinIcon}>
                        <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                          <div className="text-right font-sans p-1 overflow-hidden">
                            {/* תמונת מפה מ-Mapbox Static API */}
                            <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-gray-100 relative border-2 border-white">
                              <img
                                src={"https://staticmap.openstreetmap.de/staticmap.php?center=" + searchMarker[0] + "," + searchMarker[1] + "&zoom=14&size=600x300&maptype=mapnik"}
                                alt={searchMarkerName}
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  // fallback to OpenStreetMap static tile
                                  e.target.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${searchMarker[0]},${searchMarker[1]}&zoom=14&size=600x300&maptype=mapnik&markers=${searchMarker[0]},${searchMarker[1]},red-pushpin`;
                                  e.target.onerror = (e2: any) => {
                                    e2.target.parentElement.style.background = 'linear-gradient(135deg,#3b82f622,#3b82f644)';
                                    e2.target.style.display='none';
                                  };
                                }}
                              />
                              <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow">
                                🔍 חיפוש
                              </div>
                            </div>
                            <h4 className="font-black text-blue-900 text-2xl m-0 leading-none mb-3 px-1">
                              📍 {searchMarkerName}
                            </h4>
                            {userCoords && (
                              <div className="flex items-center gap-2 mb-4 bg-blue-50 inline-flex px-4 py-1.5 rounded-full border-2 border-blue-100 shadow-sm">
                                <span className="text-xl">🚀</span>
                                <p className="text-[14px] text-blue-700 font-black m-0">
                                  {labels[activeLang].distLabel} {calculateDistance(userCoords[0], userCoords[1], searchMarker[0], searchMarker[1])} {labels[activeLang].km}
                                </p>
                              </div>
                            )}
                            <div className="border-t-2 border-gray-100 mt-2 pt-3 px-1">
                              <p className="text-[14px] text-gray-500 font-semibold leading-relaxed">
                                {activeLang==='he' ? 'מיקום שנמצא בחיפוש. לניווט לחצו על אחד מהכפתורים למטה.' :
                                 activeLang==='ar' ? 'موقع تم العثور عليه بالبحث. اضغط على أحد الأزرار للتنقل.' :
                                 activeLang==='ru' ? 'Место найдено через поиск. Нажмите кнопку для навигации.' :
                                 'Location found via search. Press a button below to navigate.'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-4 pb-2">
                              <a href={`https://www.waze.com/ul?ll=${searchMarker[0]},${searchMarker[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all">WAZE</a>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${searchMarker[0]},${searchMarker[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 hover:bg-gray-200 active:scale-95">GOOGLE</a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {filteredItems.map((item: any)=>{
                      const pd = userCoords ? calculateDistance(userCoords[0],userCoords[1],item.coords[0],item.coords[1]) : null;
                      return (
                        <Marker key={item.id} position={item.coords}>
                          <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                            <div className="text-right font-sans p-1 overflow-hidden">
                              <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                                {(item.video && item.id!=="1") ? (
                                  <iframe key={`v-${item.id}`} width="100%" height="100%" src={getYoutubeLink(item.video)} title="Video" frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
                                ) : (
                                  <SmartImage item={item} className="w-full h-full object-cover"/>
                                )}
                              </div>
                              <h4 className="font-black text-green-900 text-3xl m-0 leading-none mb-3 px-1">{item.name[activeLang]||item.name.he}</h4>
                              {pd && (
                                <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1.5 rounded-full border-2 border-green-100 shadow-sm">
                                  <span className="text-xl">📍</span>
                                  <p className="text-[14px] text-green-700 font-black m-0">{labels[activeLang].distLabel} {pd} {labels[activeLang].km}</p>
                                </div>
                              )}
                              <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                                <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">{item.description[activeLang]||item.description.he}</p>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-6 pb-2">
                                <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all">WAZE</a>
                                <button onClick={()=>shareOnWhatsApp(item)} className="flex-1 bg-green-500 text-white text-center py-4 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95 transition-all">WhatsApp</button>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 hover:bg-gray-200 active:scale-95">GOOGLE</a>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                  <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                    <button onClick={handleSurpriseMe} className="bg-green-600 text-white w-16 h-16 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90">
                      <span className="text-2xl md:text-6xl mb-1">🎲</span>{labels[activeLang].surprise}
                    </button>
                    <button onClick={()=>setActiveView('home')} className="bg-white text-green-600 w-12 h-12 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center text-3xl md:text-5xl border-2 md:border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90">🏠</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <style jsx global>{`
        .leaflet-marker-icon{margin-top:-34px!important;margin-left:-12px!important}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .leaflet-popup-content-wrapper{border-radius:2.5rem!important;overflow:hidden!important;padding:0!important;box-shadow:0 45px 90px -15px rgba(0,0,0,.45)!important}
        .leaflet-popup-content{margin:0!important;padding:16px!important;width:400px!important}
        @media(max-width:768px){.leaflet-popup-content{width:300px!important;padding:12px!important}}
        .leaflet-popup-tip-container{display:none}
        .square-modern-popup-container iframe{pointer-events:auto!important;border-radius:2rem!important}
        @keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        .animate-fadeIn{animation:fadeIn 1s ease-out forwards}
      `}</style>
    </div>
  );
}