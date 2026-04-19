"use client";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import data from './data.json';

type ViewState = 'home' | 'quiz' | 'map';
interface GeoResult { display_name: string; lat: string; lon: string; place_id: number; }

function openLightbox(url: string, name: string) {
  const existing = document.getElementById('tiyulify-lightbox');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'tiyulify-lightbox';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;';
  el.onclick = () => el.remove();
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:95vw;max-height:85vh;object-fit:contain;border-radius:12px;';
  img.onclick = (e: any) => e.stopPropagation();
  const caption = document.createElement('div');
  caption.textContent = name ? '📸 ' + name : '';
  caption.style.cssText = 'color:white;margin-top:12px;font-size:14px;';
  const btn = document.createElement('button');
  btn.innerHTML = '&times;';
  btn.style.cssText = 'position:absolute;top:16px;right:16px;color:white;font-size:32px;background:rgba(0,0,0,0.5);border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;line-height:1;';
  btn.onclick = (e: any) => { e.stopPropagation(); el.remove(); };
  el.appendChild(img);
  el.appendChild(caption);
  el.appendChild(btn);
  document.body.appendChild(el);
}

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


// === העלאת תמונות משתמשים ===
function PhotoUploader({ item, onPhotoAdded }: { item: any; onPhotoAdded: () => void }) {
  const [uploading, setUploading] = React.useState(false);
  const [name, setName] = React.useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${item.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('place-photos')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;

      await supabase.from('place_photos').insert({
        place_id: item.id,
        file_path: fileName,
        uploader_name: name || 'אורח',
        taken_at: new Date().toISOString(),
        status: 'pending',
      });
      onPhotoAdded();
      alert('✅ התמונה התקבלה ותפורסם בקרוב לאחר אישור!');
    } catch (err) {
      alert('שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <input
        type="text"
        placeholder="השם שלך (אופציונלי)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 text-sm mb-2 text-right"
      />
      <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-black cursor-pointer transition-all ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-green-500 text-white hover:bg-green-600'}`}>
        {uploading ? '⏳ מעלה...' : '📷 הוסף תמונה שלך'}
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}

// === גלריה עם carousel ===
function UserPhotos({ item }: { item: any }) {
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [refresh, setRefresh] = React.useState(0);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    supabase.from('place_photos')
      .select('*')
      .eq('place_id', item.id)
      .eq('status', 'approved')
      .order('taken_at', { ascending: false })
      .then(({ data }) => { setPhotos(data || []); setIdx(0); });
  }, [item.id, refresh]);

  // כל התמונות: תמונת ברירת המחדל + תמונות משתמשים
  const userImgs = photos.map(p => ({
    url: supabase.storage.from('place-photos').getPublicUrl(p.file_path).data.publicUrl,
    name: p.uploader_name,
    date: new Date(p.taken_at).toLocaleDateString('he-IL'),
    isUser: true,
  }));
  const allImgs = userImgs;
  const current = allImgs[idx] || null;
  const total = allImgs.length;

  const catColor: Record<string,string> = {
    water:'#3b82f6',nature:'#22c55e',history:'#a16207',sleep:'#8b5cf6',
    accommodation:'#8b5cf6',food:'#f97316',bike:'#ef4444',hiking:'#84cc16',attractions:'#f59e0b',
    promenade:'#06b6d4',beach:'#0ea5e9',viewpoint:'#6366f1',park:'#10b981',cafe:'#92400e',israel_trail:'👣',default:'#6b7280'
  };
  const catEmoji: Record<string,string> = {
    water:'💧',nature:'🌿',history:'🏛️',sleep:'🏕️',accommodation:'🛖',
    food:'🍽️',bike:'🚲',hiking:'🥾',promenade:'🚶',beach:'🏖️',viewpoint:'🔭',park:'🌳',cafe:'☕',attractions:'🎡',israel_trail:'👣',israel_trail:'👣',israel_trail:'👣',israel_trail:'🚶‍♂️🦯',default:'📍'
  };
  const color = catColor[item.category] || catColor.default;
  const emoji = catEmoji[item.category] || catEmoji.default;

  if (total === 0) return (
    <div className="relative w-full h-28 mb-2 shadow-xl rounded-[1.5rem] overflow-hidden border-2 border-white flex flex-col items-center justify-center gap-2"
      style={{background:`linear-gradient(135deg,${color}22,${color}44)`}}>
      <span style={{fontSize:'3rem'}}>{emoji}</span>
      <label className="bg-green-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full cursor-pointer hover:bg-green-600 shadow">
        📷 הוסף תמונה ראשונה!
        <input type="file" accept="image/*" className="hidden" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          const ext = file.name.split('.').pop();
          const fileName = `${item.id}/${Date.now()}.${ext}`;
          await supabase.storage.from('place-photos').upload(fileName, file, { upsert: true });
          await supabase.from('place_photos').insert({ place_id: item.id, file_path: fileName, uploader_name: (() => {
              let n = localStorage.getItem('tiyulify_name');
              if (!n) { n = prompt('מה שמך? (יישמר לפעמים הבאות)') || 'אורח'; if(n!=='אורח') localStorage.setItem('tiyulify_name', n); }
              return n;
            })(), taken_at: new Date().toISOString(), status: 'pending' });
          setRefresh(r => r+1); alert('✅ התמונה התקבלה ותפורסם בקרוב לאחר אישור!');
        }} />
      </label>
    </div>
  );

  return (
    <div className="relative w-full h-28 mb-2 shadow-xl rounded-[1.5rem] overflow-hidden bg-gray-100 border-2 border-white">
      <img src={current!.url} alt="" className="w-full h-full object-cover"/>
        <button
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); openLightbox(current!.url, current!.isUser ? current!.name : ''); }}
          onTouchStart={e => { e.stopPropagation(); openLightbox(current!.url, current!.isUser ? current!.name : ''); }}
          style={{position:'absolute',top:'8px',left:'8px',background:'rgba(0,0,0,0.6)',color:'white',fontSize:'11px',padding:'3px 8px',borderRadius:'12px',border:'none',cursor:'pointer',zIndex:1000}}
        >🔍 הגדל</button>
      {current!.isUser && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-1 px-2">
          📸 {current!.name} · {current!.date}
        </div>
      )}
      {total > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i-1+total)%total); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-black hover:bg-black/70">‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i+1)%total); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-black hover:bg-black/70">›</button>
          <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">{idx+1}/{total}</div>
        </>
      )}
      <label className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full cursor-pointer hover:bg-green-600 shadow">
        📷+
        <input type="file" accept="image/*" className="hidden" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          const ext = file.name.split('.').pop();
          const fileName = `${item.id}/${Date.now()}.${ext}`;
          await supabase.storage.from('place-photos').upload(fileName, file, { upsert: true });
          await supabase.from('place_photos').insert({ place_id: item.id, file_path: fileName, uploader_name: (() => {
              let n = localStorage.getItem('tiyulify_name');
              if (!n) { n = prompt('מה שמך? (יישמר לפעמים הבאות)') || 'אורח'; if(n!=='אורח') localStorage.setItem('tiyulify_name', n); }
              return n;
            })(), taken_at: new Date().toISOString(), status: 'pending' });
          setRefresh(r => r+1); alert('✅ התמונה התקבלה ותפורסם בקרוב לאחר אישור!');
        }} />
      </label>
    </div>
  );
}

// === SmartImage: תמונה חכמה עם fallback ===
const CAT_COLOR: Record<string,string> = {
  water:'#3b82f6',nature:'#22c55e',history:'#a16207',sleep:'#8b5cf6',
  accommodation:'#8b5cf6',food:'#f97316',bike:'#ef4444',hiking:'#84cc16',attractions:'#f59e0b',
  promenade:'#06b6d4',beach:'#0ea5e9',viewpoint:'#6366f1',park:'#10b981',cafe:'#92400e','לפני 1948':'#ca8a04','אחרי 1948':'#2563eb',default:'#6b7280'
};
const CAT_EMOJI: Record<string,string> = {
  water:'💧',nature:'🌿',history:'🏛️',sleep:'🏕️',accommodation:'🛖',
  food:'🍽️',bike:'🚲',hiking:'🥾',promenade:'🚶',beach:'🏖️',viewpoint:'🔭',park:'🌳',cafe:'☕',attractions:'🎡',israel_trail:'👣',israel_trail:'👣',israel_trail:'👣',israel_trail:'🚶‍♂️🦯',default:'📍'
};

function SidebarImage({ item, className }: { item: any; className?: string }) {
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [idx, setIdx] = React.useState(0);
  const color = CAT_COLOR[item.category] || CAT_COLOR.default;
  const emoji = CAT_EMOJI[item.category] || CAT_EMOJI.default;

  React.useEffect(() => {
    supabase.from('place_photos')
      .select('file_path')
      .eq('place_id', item.id)
      .eq('status', 'approved')
      .order('taken_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const urls = data.map((p:any) => {
            const { data: u } = supabase.storage.from('place-photos').getPublicUrl(p.file_path);
            return u?.publicUrl || '';
          }).filter(Boolean);
          setPhotos(urls);
          setIdx(0);
        }
      });
  }, [item.id]);

  if (photos.length === 0) {
    return (
      <div className={className} style={{
        background: `linear-gradient(135deg,${color}22,${color}44)`,
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        gap:'8px',border:`2px solid ${color}33`,width:'100%',height:'100%',minHeight:'120px'
      }}>
        <span style={{fontSize:'2.5rem'}}>{emoji}</span>
      </div>
    );
  }

  return (
    <div className={className} style={{position:'relative',overflow:'hidden',width:'100%',height:'100%',minHeight:'120px'}}>
      <img src={photos[idx]} alt={item.name?.he||''} style={{objectFit:'cover',width:'100%',height:'100%'}}/>
      {photos.length > 1 && (
        <>
          <button onClick={(e)=>{e.stopPropagation();setIdx((idx-1+photos.length)%photos.length);}}
            style={{position:'absolute',left:4,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <button onClick={(e)=>{e.stopPropagation();setIdx((idx+1)%photos.length);}}
            style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
          <div style={{position:'absolute',bottom:4,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.5)',color:'white',borderRadius:8,padding:'1px 6px',fontSize:11}}>{idx+1}/{photos.length}</div>
        </>
      )}
    </div>
  );
}

function SmartImage({ item, className }: { item: any; className?: string }) {
  const color = CAT_COLOR[item.category] || CAT_COLOR.default;
  const emoji = CAT_EMOJI[item.category] || CAT_EMOJI.default;
  const img = item.image && item.image.trim() !== '' ? item.image.trim() : null;

  if (!img) {
    return (
      <div className={className} style={{
        background: `linear-gradient(135deg,${color}22,${color}44)`,
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',border:`2px solid ${color}33`
      }}>
        <span style={{fontSize:'2.5rem'}}>{emoji}</span>
        <span style={{fontSize:'0.7rem',fontWeight:800,color,textAlign:'center',padding:'0 8px',opacity:0.8}}>{item.name?.he||item.name?.en||''}</span>
      </div>
    );
  }

  return (
    <img src={img} className={className} alt={item.name?.he||item.name?.en||''}
      style={{objectFit:'cover',width:'100%',height:'100%'}}
      onError={(e:any)=>{ e.target.style.display='none'; }}
    />
  );

  if (status === 'icon') return (
    <div className={className} style={{
      background:`linear-gradient(135deg,${color}22,${color}44)`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',border:`2px solid ${color}33`
    }}>
      <span style={{fontSize:'2.5rem'}}>{emoji}</span>
      <span style={{fontSize:'0.7rem',fontWeight:800,color,textAlign:'center',padding:'0 8px',opacity:0.8}}>{item.name?.he||item.name?.en||''}</span>
    </div>
  );
  return (
    <img src={src} className={className} alt={item.name?.he||''} onError={()=>{
      if (status==='img' && !isWiki) setStatus('wiki');
      else setStatus('icon');
    }}/>
  );
}



async function fetchWikiSummary(name: string, lang: string): Promise<string> {
  try {
    const l = lang==='he'?'he':lang==='ar'?'ar':lang==='ru'?'ru':'en';
    const r = await fetch(`https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    if (r.ok) { const d = await r.json(); if (d.extract && d.extract.length > 80) return d.extract; }
    if (l !== 'en') { const r2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`); if (r2.ok) { const d2 = await r2.json(); return d2.extract || ''; } }
    return '';
  } catch { return ''; }
}


function TrailMarker({ category }: { category: string }) {
  if (category === 'israel_trail') {
    return <span style={{display:'inline-flex',verticalAlign:'middle',margin:'0 4px',border:'1px solid #999',borderRadius:'2px',overflow:'hidden',width:'24px',height:'12px'}}>
      <span style={{flex:1,background:'white'}}/>
      <span style={{flex:1,background:'#2563eb'}}/>
      <span style={{flex:1,background:'#f97316'}}/>
    </span>;
  }
  if (category === 'hiking') {
    return <span style={{display:'inline-flex',verticalAlign:'middle',margin:'0 4px',border:'1px solid #999',borderRadius:'2px',overflow:'hidden',width:'24px',height:'12px'}}>
      <span style={{flex:1,background:'white'}}/>
      <span style={{flex:1,background:'#ef4444'}}/>
      <span style={{flex:1,background:'white'}}/>
    </span>;
  }
  return null;
}

// === Compact expandable popup ===
function CompactPopup({ item, pd, activeLang, labels, shareOnWhatsApp }: { item: any; pd: string|null; activeLang: string; labels: any; shareOnWhatsApp: (i:any)=>void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [wiki, setWiki] = React.useState('');
  React.useEffect(() => { fetchWikiSummary(item.name[activeLang]||item.name.he, activeLang).then(setWiki); }, [item.id, activeLang]);
  return (
    <div className="text-right font-sans p-1 overflow-hidden">
      <UserPhotos item={item} />
      <a href={'https://www.google.com/search?q=' + encodeURIComponent(item.name[activeLang]||item.name.he)} target="_blank" className="no-underline">
        <h4 className="font-bold text-green-900 text-sm m-0 leading-snug mb-1 px-1 hover:text-green-600 hover:underline cursor-pointer">
          🔍 {item.name[activeLang]||item.name.he}<TrailMarker category={item.category}/>
        </h4>
      </a>
      <p className="text-[12px] text-gray-600 leading-relaxed px-1 mb-2 ">
        {item.description[activeLang]||item.description.he}
      </p>
      {item.phone && (
        <a href={"tel:" + item.phone} className="flex items-center gap-2 mx-1 mb-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 font-black text-sm no-underline">
          <span>📞</span>
          <span>{item.phone}</span>
        </a>
      )}
      {wiki && <p className="text-[11px] text-gray-500 leading-relaxed px-1 mb-2 ">{wiki}</p>}
      {item.info && (
        <div className="flex flex-wrap gap-1 px-1 mb-2">
          {item.info.hours && item.info.hours !== 'N/A' && (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">🕐 {item.info.hours}</span>
          )}
          {item.info.season && item.info.season !== 'all' && (
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
              {item.info.season==='summer'?(activeLang==='ar'?'☀️ صيف':activeLang==='en'?'☀️ Summer':activeLang==='ru'?'☀️ Лето':'☀️ קיץ'):item.info.season==='winter'?(activeLang==='ar'?'❄️ شتاء':activeLang==='en'?'❄️ Winter':activeLang==='ru'?'❄️ Зима':'❄️ חורף'):item.info.season==='autumn'?(activeLang==='ar'?'🍂 خريف':activeLang==='en'?'🍂 Autumn':activeLang==='ru'?'🍂 Осень':'🍂 סתיו'):item.info.season}
            </span>
          )}
          {item.info.target && item.info.target !== 'all' && (
            <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
              {item.info.target==='family'?(activeLang==='ar'?'👨‍👩‍👧 عائلات':activeLang==='en'?'👨‍👩‍👧 Families':activeLang==='ru'?'👨‍👩‍👧 Семьи':'👨‍👩‍👧 משפחות'):item.info.target==='adults'?(activeLang==='ar'?'👤 بالغون':activeLang==='en'?'👤 Adults':activeLang==='ru'?'👤 Взрослые':'👤 מבוגרים'):item.info.target==='kids'?(activeLang==='ar'?'🧒 أطفال':activeLang==='en'?'🧒 Kids':activeLang==='ru'?'🧒 Дети':'🧒 ילדים'):item.info.target}
            </span>
          )}
        </div>
      )}
      {pd && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 mb-1 bg-green-50 hover:bg-green-100 active:scale-95 transition-all px-3 py-1.5 rounded-full border border-green-200 shadow-sm cursor-pointer"
        >
          <span className="text-base">📍</span>
          <span className="text-[12px] text-green-700 font-black">{pd} {labels[activeLang].km}</span>
          <span className="text-[10px] text-green-500 mr-1">{expanded ? "▲" : "▼"}</span>
        </button>
      )}
      {expanded && (
        <div className="flex flex-wrap gap-2 mt-2 pb-1 animate-fadeIn">
          <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank"
            className="flex-1 bg-blue-600 text-white text-center py-3 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95">
            WAZE
          </a>
          <button onClick={()=>shareOnWhatsApp(item)}
            className="flex-1 bg-green-500 text-white text-center py-3 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95">
            WhatsApp
          </button>
          <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank"
            className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-2xl text-[11px] font-black no-underline border border-gray-200 hover:bg-gray-200 active:scale-95">
            GOOGLE
          </a>
        </div>
      )}
    </div>
  );
}

// === שכבות מפה ===
const MAP_LAYERS = [
  { id:'standard',  label:'🗺️ רגיל',   url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution:'©CARTO' },
  { id:'satellite', label:'🛸 לוויין', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution:'©Esri' },
  { id:'terrain',   label:'⛰️ שטח',   url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution:'©OpenTopoMap' },
  { id:'dark',      label:'🌙 כהה',    url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution:'©CARTO' },
];

export default function TiyulifyApp() {
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    if ("wakeLock" in navigator) {
      try { (navigator as any).wakeLock.request("screen"); } catch (err) {}
    }
  }, []);
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [activeLang, setActiveLang] = useState('he');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeMapLayer, setActiveMapLayer] = useState('standard');
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [hideMarkers, setHideMarkers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMobileHeader, setShowMobileHeader] = useState(false);
  const activeLangRef = React.useRef(activeLang);
  React.useEffect(() => { activeLangRef.current = activeLang; }, [activeLang]);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState<[number,number]|null>(null);
  const [searchMarkerName, setSearchMarkerName] = useState('');
  const [searchMarkerAddr, setSearchMarkerAddr] = useState('');
  const geoDebounce = useRef<any>(null);
  const [userCoords, setUserCoords] = useState<[number,number]|null>(null);
  const [LeafletMapLib, setLeafletMapLib] = useState<any>(null);
  const [userRedMarker, setUserRedMarker] = useState<any>(null);
  const [searchPinIcon, setSearchPinIcon] = useState<any>(null);
  const [after1948Icon, setAfter1948Icon] = useState<any>(null);
  const mapControl = useRef<any>(null);

  const labels: any = {
    he: {
      search:"חפש כל מקום בישראל...",results:"תוצאות",surprise:"הצעה שלי",welcome:"לאן נטייל היום?",
      start:"בואו נתחיל",back:"חזרה",style:"מה הסגנון שלכם?",distText:'ק"מ ממך',distLabel:"מרחק:",
      home:"בית",here:"המיקום שלך",share:"שתף ב-WhatsApp",km:'ק"מ',loading:"טוען מפה...",noResults:"לא נמצאו תוצאות",
      mapLayers:"שכבות מפה",
      undecided:"לא החלטתי",
      regions:{all:"כל הארץ",north:"צפון",center:"מרכז",south:"דרום"},
      categories:{all:"הכל",water:"מעיינות ונחלים",nature:"פארקים וטבע",history:"היסטוריה ודת",sleep:"לינה",
        food:"אוכל",bike:"אופניים",hiking:"הליכה",promenade:"טיילות",beach:"חופים",viewpoint:"תצפיות ונופים",attractions:"אטרקציות",israel_trail:"שביל ישראל",'לפני 1948':"לפני 1948",'אחרי 1948':"אחרי 1948"}
    },
    en: {
      search:"Search any place in Israel...",results:"Results",surprise:"My Pick",welcome:"Where to today?",
      start:"Let's Begin",back:"Go Back",style:"What's your style?",distText:"km away",distLabel:"Distance:",
      home:"Home",here:"You are here",share:"Share on WhatsApp",km:"km",loading:"Loading map...",noResults:"No results found",
      mapLayers:"Map Layers",
      undecided:"Undecided",
      regions:{all:"All Israel",north:"North",center:"Center",south:"South"},
      categories:{all:"All",water:"Springs & Streams",nature:"Parks & Nature",history:"History & Religion",sleep:"Camping",
        food:"Food",bike:"Cycling",hiking:"Hiking",promenade:"Promenades",beach:"Beaches",viewpoint:"Viewpoints",attractions:"Attractions",israel_trail:"Israel Trail",'לפני 1948':"Pre-1948 Villages",'אחרי 1948':"Post-1948 Towns"}
    },
    ar: {
      search:"ابحث عن أي مكان في إسرائيل...",results:"نتائج",surprise:"اقتراحي",welcome:"أين نذهب اليوم؟",
      start:"لنبدأ",back:"رجوع",style:"ما هو أسلوبك؟",distText:"كم منك",distLabel:"المسافة:",
      home:"الرئيسية",here:"أنت هنا",share:"مشاركة واتساب",km:"كم",loading:"جارٍ التحميل...",noResults:"لا توجد نتائج",
      mapLayers:"طبقات الخريطة",
      undecided:"لم أقرر",
      regions:{all:"كل البلاد",north:"الشمال",center:"الوسط",south:"الجنوب"},
      categories:{all:"الكل",water:"ينابيع وأنهار",nature:"منتزهات وطبيعة",history:"تاريخ ودين",sleep:"إقامة وتخييم",
        food:"طعام ومطاعم",bike:"مسارات الدراجات",hiking:"مسارات المشي",promenade:"ممشى سياحي",beach:"شواطئ البحر",viewpoint:"مناظر ومطلات",attractions:"معالم سياحية",israel_trail:"مسار إسرائيل",'לפני 1948':"قرى ما قبل 1948",'אחרי 1948':"بلدات ما بعد 1948"}
    },
    ru: {
      search:"Поиск любого места в Израиле...",results:"Результаты",surprise:"Мой выбор",welcome:"Куда поедем?",
      start:"Поехали",back:"Назад",style:"Какой стиль?",distText:"км от вас",distLabel:"Расстояние:",
      home:"Домой",here:"Вы здесь",share:"Поделиться WhatsApp",km:"км",loading:"Загрузка карты...",noResults:"Ничего не найдено",
      mapLayers:"Слои карты",
      undecided:"Не решил",
      regions:{all:"Весь Израиль",north:"Север",center:"Центр",south:"Юг"},
      categories:{all:"Все",water:"Источники и реки",nature:"Парки и природа",history:"История и религия",sleep:"Жилье",
        food:"Еда",bike:"Велосипед",hiking:"Пешие тропы",promenade:"Променады",beach:"Пляжи",viewpoint:"Смотровые площадки",attractions:"Аттракционы",israel_trail:"Тропа Израиля",'לפני 1948':"Деревни до 1948",'אחרי 1948':"Города после 1948"}
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
      setAfter1948Icon(new L.Icon({
        iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
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
    setGeoQuery(query); setGeoResults([]);
    if (geoDebounce.current) clearTimeout(geoDebounce.current);
    if (!query || query.length < 2) return;
    geoDebounce.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const lang = activeLang==="he"?"he,en":activeLang==="ar"?"ar,en":activeLang==="ru"?"ru,en":"en";
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&accept-language=${lang}&addressdetails=1`);
        setGeoResults(await r.json());
      } catch(e) {} finally { setGeoLoading(false); }
    }, 400);
  }, [activeLang]);

  const handleSelectGeoResult = (result: GeoResult) => {
    const coords: [number,number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setSearchMarker(coords);
    setSearchMarkerName(result.name || result.display_name.split(",")[0]);
    setSearchMarkerAddr(result.display_name.split(',').slice(1,4).join(', '));
    setGeoQuery(result.name || result.display_name.split(",")[0]);
    setGeoResults([]);
    if (mapControl.current) mapControl.current.flyTo(coords, 15, {animate:true, duration:1.5});
  };
  const clearSearch = () => { setGeoQuery(''); setGeoResults([]); setSearchMarker(null); setSearchMarkerName(''); setSearchMarkerAddr(''); };

  // ===== פילטר חכם לפי קטגוריה =====
  const filteredItems = useMemo(() => {
    let r = (data as any[]).filter((item: any) => {
      if (!item.name || !item.coords) return false;
      const cat = item.category || '';
      const nameHe = item.name?.he || '';
      const nameEn = (item.name?.en || '').toLowerCase();
      let matchesCat = false;
      if (categoryFilter === 'all') {
        matchesCat = true;
      } else if (categoryFilter === 'river') {
        // נחלים = water items עם נחל בשם
        matchesCat = cat === 'water';
      } else if (categoryFilter === 'sleep') {
        matchesCat = cat === 'sleep' || cat === 'accommodation';
      } else if (categoryFilter === 'food') {
        matchesCat = cat === 'food' || cat === 'cafe';
      } else if (categoryFilter === 'nature') {
        matchesCat = cat === 'nature' || cat === 'park';
      } else if (categoryFilter === 'לפני 1948') {
        matchesCat = cat === 'לפני 1948';
      } else if (categoryFilter === 'אחרי 1948') {
        matchesCat = cat === 'אחרי 1948';
      } else {
        matchesCat = cat === categoryFilter;
      }
      const matchesReg = regionFilter === 'all' || (item.region && item.region === regionFilter);
      return matchesCat && matchesReg;
    });
    if (userCoords) return [...r].sort((a,b) =>
      parseFloat(calculateDistance(userCoords[0],userCoords[1],a.coords[0],a.coords[1])) -
      parseFloat(calculateDistance(userCoords[0],userCoords[1],b.coords[0],b.coords[1]))
    );
    return r;
  }, [categoryFilter, regionFilter, userCoords]);

  const flyToCoords = (t: [number,number]) => { if(mapControl.current) mapControl.current.flyTo(t, 14, {animate:true,duration:2.0}); };
  const handleSurpriseMe = () => {
    const pool = filteredItems.length>0 ? filteredItems.slice(0,10) : (data as any[]);
    if (pool.length === 0) return;
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
  const currentLayer = MAP_LAYERS.find(l => l.id === activeMapLayer) || MAP_LAYERS[0];

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={isRtl?'rtl':'ltr'}>

      {/* HOME */}
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
              <button onClick={handleSurpriseMe} className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all">💡 {labels[activeLang].surprise}</button>
            </div>
            <div className="mt-16 md:mt-24 flex justify-center gap-3 md:gap-4 flex-wrap">
              {['he','ar','en','ru'].map(l=>(
                <button key={l} onClick={()=>setActiveLang(l)} className={`px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${activeLang===l?'bg-green-600 border-green-600 shadow-2xl scale-110 text-white':'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUIZ */}
      {activeView==='quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-3xl md:text-6xl font-black text-gray-800 mb-10 md:mb-16 text-center">{labels[activeLang].style}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-7xl p-4">
            {Object.entries(labels[activeLang].categories).filter(([id])=>id!=='all').map(([id,label]:any)=>(
              <button key={id} onClick={()=>{setCategoryFilter(id);setActiveView('map');}}
                className="aspect-square flex flex-col items-center justify-center gap-3 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4">
                <span className="text-4xl md:text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id==='water'?'💦':id==='nature'?'🏞️':id==='history'?'🏰':id==='sleep'?'🏕️':id==='food'?'🍕':id==='bike'?'🚲':id==='hiking'?'🥾':id==='promenade'?'🚶‍♂️':id==='beach'?'🏖️':id==='attractions'?'🎡':id==='לפני 1948'?'🕌':id==='israel_trail'?'🚶‍♂️🦯':'🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase tracking-tight">{label}</span>
              </button>
            ))}
          </div>
          <div className="mt-12 md:mt-20 flex flex-col items-center gap-4">
            <button onClick={()=>{setCategoryFilter('none');setActiveView('map');}}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 md:px-16 md:py-5 rounded-2xl font-black text-lg md:text-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95">
              🗺️ {labels[activeLang].undecided}
            </button>
            <button onClick={()=>setActiveView('home')} className="text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors">{labels[activeLang].back}</button>
          </div>
        </div>
      )}

      {/* MAP */}
      {activeView==='map' && (
        <div className="flex flex-col h-full relative">
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                  <img src="/Logo- Mamdoh1.gif" alt="Logo" className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover"/>
                </a>
                <h2 className="text-2xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={()=>setActiveView('home')}>Tiyulify</h2>
                <button onClick={()=>setActiveView('home')} className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white border-2 border-green-500 shadow-sm active:scale-90 transition-all text-xl">🏠</button>

              </div>
              <div className="hidden md:flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he','ar','en','ru'].map(l=>(
                  <button key={l} onClick={()=>{setActiveLang(l);clearSearch();}} className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeLang===l?'bg-green-600 text-white shadow-md':'text-gray-400 hover:text-gray-600'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
              <button className="md:hidden flex items-center justify-center bg-green-600 text-white font-black text-sm w-10 h-10 rounded-xl shadow-md active:scale-90 transition-all border-2 border-green-700"
                onClick={()=>{const langs=['he','ar','en','ru'];setActiveLang(langs[(langs.indexOf(activeLang)+1)%langs.length]);clearSearch();}}>
                {activeLang.toUpperCase()}
              </button>
            </div>

            <div className={`flex-col lg:flex-row gap-3 md:gap-6 w-full px-2 overflow-visible transition-all duration-700 ease-in-out md:flex md:max-h-96 md:opacity-100 ${showMobileHeader ? "flex max-h-96 opacity-100" : "hidden md:flex"}`}>
              {/* חיפוש */}
              <div className="flex-1 relative">
              <div className="relative">
                  <input type="text" placeholder={labels[activeLang].search} value={geoQuery} onChange={(e)=>handleGeoSearch(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-4 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg"/>
                  <span className={`absolute top-2.5 md:top-4 opacity-40 text-lg md:text-2xl pointer-events-none ${isRtl?'right-4':'left-4'}`}>{geoLoading?'⏳':'🔍'}</span>
                  {geoQuery && <button onClick={clearSearch} className={`absolute top-2 md:top-3 text-gray-400 hover:text-red-500 text-xl font-black px-2 ${isRtl?'left-2':'right-2'}`}>✕</button>}
                </div>
                {geoResults.length>0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border-2 border-green-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
                    {geoResults.map(r=>(
                      <button key={r.place_id} onClick={()=>handleSelectGeoResult(r)}
                        className="w-full text-right px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-0 text-sm font-semibold text-gray-700 flex items-center gap-3 transition-colors">
                        <span className="text-green-500 text-lg shrink-0">📍</span>
                        <span className="text-right flex-1 leading-tight" style={{fontSize:'0.82rem'}}>
                        <span className="font-semibold block truncate">{r.display_name.split(',')[0]}</span>
                        <span className="text-gray-500 block truncate text-xs">{r.display_name.split(',').slice(1,3).join(',')}</span>
                      </span>
                      </button>
                    ))}
                  </div>
                )}
                {geoQuery.length>=2 && !geoLoading && geoResults.length===0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-100 rounded-2xl shadow-xl z-[9999] p-4 text-center text-gray-400 font-semibold text-sm">{labels[activeLang].noResults}</div>
                )}
              </div>
              {/* פילטרים */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200">
                  {Object.entries(labels[activeLang].regions).map(([id,label]:any)=>(<option key={id} value={id}>{label}</option>))}
                </select>
                {Object.entries(labels[activeLang].categories).map(([id,label]:any)=>(
                  <button key={id} onClick={()=>{if(id==="all"&&categoryFilter==="all"){setHideMarkers(h=>!h);}else{setHideMarkers(false);setCategoryFilter(id);}}}
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${categoryFilter===id?'bg-green-600 text-white shadow-xl scale-105':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{label}</button>
                ))}
              </div>
            </div>
          {/* כפתור החלקה - תחתית ה-header, מובייל בלבד */}
          <button
            onClick={()=>setShowMobileHeader(s=>!s)}
            className="md:hidden w-full flex flex-col items-center justify-center gap-[4px] py-1.5 bg-white border-b-2 border-gray-100 shadow-sm z-[1999] active:bg-gray-50 transition-all">
            <span className="block w-8 h-0.5 bg-gray-400 rounded-full"/>
            <span className="block w-6 h-0.5 bg-gray-400 rounded-full"/>
            <span className="block w-4 h-0.5 bg-gray-400 rounded-full"/>
          </button>
          </header>

          {(!isClientReady||!LeafletMapLib) ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center"><div className="text-6xl mb-4 animate-spin">🗺️</div><p className="text-gray-500 font-bold text-xl">{labels[activeLang].loading}</p></div>
            </div>
          ) : (()=>{
            const {MapContainer, TileLayer, Marker, Popup} = LeafletMapLib;
            return (
              <div className="flex-1 flex relative overflow-hidden">
                {/* Sidebar */}
                {/* כפתור פתיחת סרגל */}
                <button onClick={()=>setShowSidebar(s=>!s)}
                  className="hidden md:flex absolute top-4 left-4 z-[1500] bg-white border border-gray-200 rounded-xl shadow-lg w-10 h-10 items-center justify-center hover:bg-gray-50 transition-all"
                  title="רשימת מקומות">
                  <span className="text-gray-600 text-lg">{showSidebar ? '✕' : '☰'}</span>
                </button>

                <aside className={`w-[30rem] bg-white border-r overflow-y-auto p-8 shadow-2xl z-10 transition-all duration-300 hidden md:block ${showSidebar ? 'md:block' : 'md:hidden'}`}>
                  <div className="flex justify-between items-center mb-10 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    <span>{labels[activeLang].results} ({filteredItems.length})</span>
                    {userCoords && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
                  </div>
                  <div className="space-y-8">
                    {!hideMarkers && filteredItems.map((item:any)=>{
                      const d = userCoords ? calculateDistance(userCoords[0],userCoords[1],item.coords[0],item.coords[1]) : null;
                      return (
                        <div key={item.id} onClick={()=>flyToCoords(item.coords)}
                          className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden">
                          <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                            <SidebarImage item={item} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>
                          </div>
                          <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">{item.name[activeLang]||item.name.he}</h3>
                          {d && <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5"><span className="text-lg">🚀</span> {d} {labels[activeLang].distText}</p>}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <div className="flex-1 relative" onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  // רק אם הלחיצה היא על הרקע ולא על סיכה/פופאפ
                  const target = e.target as HTMLElement;
                  if (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-popup') || target.closest('.leaflet-control')) return;
                  const map = mapControl.current;
                  if (!map) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const point = map.containerPointToLatLng([x, y]);
                  const lat = point.lat;
                  const lng = point.lng;
                  // delay כדי לא לפעול בזום/גרירה
                  setTimeout(async () => {
                    try {
                      const lang = activeLangRef.current; const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=${lang},en`);
                      const d = await res.json();
                      const name = d?.name || d?.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                      const addr = (d?.display_name||'').split(',').slice(0,4).join(', ');
                      const type = d?.type || d?.category || '';
                      const dist = userCoords ? calculateDistance(userCoords[0], userCoords[1], lat, lng) : null;
                      const L = (await import('leaflet')).default;
                      L.popup()
                        .setLatLng([lat, lng])
                        .setContent(`<div dir="rtl" style="min-width:220px;font-family:Arial;padding:4px">
                          <a href="https://www.google.com/search?q=${encodeURIComponent(name)}" target="_blank" style="font-size:15px;color:#166534;display:block;margin-bottom:4px;font-weight:bold;text-decoration:none">🔍 ${name}</a>
                          ${type ? `<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;display:inline-block;margin-bottom:6px">${type}</span>` : ''}
                          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;line-height:1.4">${addr}</p>
                          ${dist ? `<p style="font-size:12px;color:#374151;margin:0 0 8px">📍 מרחק: <b>${dist} ק"מ</b></p>` : ''}
                          <div style="display:flex;gap:6px;margin-top:8px">
                            <a href="https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes" target="_blank" style="flex:1;background:#2563eb;color:white;text-align:center;padding:7px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:bold">WAZE</a>
                            <a href="https://api.whatsapp.com/send?text=https://maps.google.com/?q=${lat},${lng}" target="_blank" style="flex:1;background:#25d366;color:white;text-align:center;padding:7px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:bold">WhatsApp</a>
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="flex:1;background:#f3f4f6;color:#374151;text-align:center;padding:7px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:bold">Google</a>
                          </div>
                        </div>`)
                        .openOn(map);
                    } catch(err) { console.error(err); }
                  }, 300);
                }}>
                  <MapContainer center={[32.0,34.9]} zoom={8} style={{height:'100%',width:'100%'}} ref={mapControl} zoomControl={false}
                    eventHandlers={{
                      click: async (e: any) => {
                        const {lat, lng} = e.latlng;
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he`);
                        const d = await res.json();
                        const name = d?.name || d?.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        if (mapControl.current) {
                          const L = (await import('leaflet')).default;
                          L.popup()
                            .setLatLng([lat, lng])
                            .setContent(`<div dir="rtl" style="min-width:200px;font-family:Arial">
                              <b style="font-size:14px;color:#166534">${name}</b><br/>
                              <small style="color:#6b7280">${d?.display_name || ''}</small><br/><br/>
                              <a href="https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes" target="_blank" style="background:#2563eb;color:white;padding:5px 10px;border-radius:8px;text-decoration:none;font-size:12px;margin-left:6px">WAZE</a>
                              <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="background:#f3f4f6;color:#374151;padding:5px 10px;border-radius:8px;text-decoration:none;font-size:12px">Google</a>
                            </div>`)
                            .openOn(mapControl.current);
                        }
                      }
                    }}>
                    <TileLayer key={activeMapLayer} url={currentLayer.url} attribution={currentLayer.attribution}/>
                    {userCoords && userRedMarker && (
                      <Marker position={userCoords} icon={userRedMarker}>
                        <Popup><div className="text-center font-black text-red-600 p-2 text-lg">📍 {labels[activeLang].here}</div></Popup>
                      </Marker>
                    )}
                    {searchMarker && searchPinIcon && (
                      <Marker position={searchMarker} icon={searchPinIcon}>
                        <Popup minWidth={260} maxWidth={300} className="square-modern-popup-container">
                          <div className="text-right font-sans p-1 overflow-hidden">
                            <div className="w-full h-28 mb-2 shadow-xl rounded-[1.5rem] overflow-hidden border-2 border-white flex items-center justify-center" style={{background:'linear-gradient(135deg,#3b82f622,#3b82f644)'}}>
                              <span style={{fontSize:'3rem'}}>📍</span>
                            </div>
                            <a href={"https://www.google.com/search?q=" + encodeURIComponent(searchMarkerName)} target="_blank" className="no-underline"><h4 className="font-bold text-green-900 text-sm m-0 leading-snug mb-1 px-1 hover:underline cursor-pointer">🔍 {searchMarkerName}</h4></a>
                            <p className="text-[11px] text-gray-500 px-1 mb-2 ">{searchMarkerAddr || (searchMarker ? searchMarker[0].toFixed(4)+', '+searchMarker[1].toFixed(4) : '')}</p>
                            {userCoords && searchMarker && <div className="flex items-center gap-1.5 mb-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm inline-flex"><span className="text-base">📍</span><span className="text-[12px] text-green-700 font-black">{calculateDistance(userCoords[0],userCoords[1],searchMarker[0],searchMarker[1])} {labels[activeLang].km}</span></div>}
                            <div className="flex flex-wrap gap-2 mt-2 pb-1">
                              <a href={`https://www.waze.com/ul?ll=${searchMarker[0]},${searchMarker[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-3 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95">WAZE</a>
                              <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent('Tiyulify: '+searchMarkerName+'\nhttps://www.google.com/maps/search/?api=1&query='+searchMarker[0]+','+searchMarker[1])}`,'_blank')} className="flex-1 bg-green-500 text-white text-center py-3 rounded-2xl text-[11px] font-black shadow-lg active:scale-95">WhatsApp</button>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${searchMarker[0]},${searchMarker[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-2xl text-[11px] font-black no-underline border border-gray-200 hover:bg-gray-200 active:scale-95">GOOGLE</a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {!hideMarkers && filteredItems.map((item:any)=>{
                      const pd = userCoords ? calculateDistance(userCoords[0],userCoords[1],item.coords[0],item.coords[1]) : null;
                      const catEmoji: Record<string,string> = {
                        water:'💧',nature:'🌿',history:'🏛️',sleep:'🏕️',accommodation:'🛖',
                        food:'🍽️',bike:'🚲',hiking:'🥾',promenade:'🚶',beach:'🏖️',viewpoint:'🔭',park:'🌳',cafe:'☕',attractions:'🎡',israel_trail:'👣',israel_trail:'👣',israel_trail:'👣'
                      };
                      const isAfter1948 = item.category === 'אחרי 1948';
                      const emoji = catEmoji[item.category] || '📍';
                      const bluePin = isAfter1948 ? new (require('leaflet').DivIcon)({
                        html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))">📍</div>',
                        className: '',
                        iconSize: [28, 28],
                        iconAnchor: [14, 28],
                        popupAnchor: [0, -30],
                      }) : null;
                      const emojiIcon = bluePin || LeafletMapLib && new (require('leaflet').DivIcon)({
                        html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))">${emoji}</div>`,
                        className: '',
                        iconSize: [28, 28],
                        iconAnchor: [14, 28],
                        popupAnchor: [0, -30],
                      });
                      return (
                        <Marker key={item.id} position={item.coords} icon={emojiIcon}>
                          <Popup minWidth={240} maxWidth={270} className="square-modern-popup-container">
                            <CompactPopup item={item} pd={pd} activeLang={activeLang} labels={labels} shareOnWhatsApp={shareOnWhatsApp} />
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>

                  {/* ===== כפתורי שליטה ===== */}
                  <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                    <button onClick={handleSurpriseMe} className="hidden md:flex bg-green-600 text-white w-28 h-28 rounded-full shadow-2xl flex-col items-center justify-center text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-110 active:scale-90">
                      <span className="text-6xl mb-1">🎲</span>{labels[activeLang].surprise}
                    </button>
                    <button onClick={()=>setActiveView('home')} className="hidden md:flex bg-white text-green-600 w-20 h-20 rounded-full shadow-2xl items-center justify-center text-5xl border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-110 active:scale-90">🏠</button>
                  </div>

                  {/* ===== בורר שכבות מפה ===== */}
                  <div className="absolute bottom-6 right-6 z-[2000] flex flex-col items-end gap-2">
                    {showLayerPicker && (
                      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-2 flex flex-col gap-1 mb-1">
                        {MAP_LAYERS.map(layer=>(
                          <button key={layer.id} onClick={()=>{setActiveMapLayer(layer.id);setShowLayerPicker(false);}}
                            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${activeMapLayer===layer.id?'bg-green-600 text-white':'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                            {layer.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={()=>setShowLayerPicker(p=>!p)}
                      className="bg-white text-gray-700 w-12 h-12 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center text-xl md:text-3xl border-2 border-gray-200 hover:bg-gray-50 transition-all transform hover:scale-110 active:scale-90 font-black"
                      title={labels[activeLang].mapLayers}>
                      🗂️
                    </button>
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
        .leaflet-popup-content{margin:0!important;padding:10px!important;width:260px!important}
        @media(max-width:768px){.leaflet-popup-content{width:260px!important;padding:10px!important}}
        .{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .leaflet-popup-tip-container{display:none}
        .square-modern-popup-container iframe{pointer-events:auto!important;border-radius:2rem!important}
        @keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        .animate-fadeIn{animation:fadeIn 1s ease-out forwards}
      `}</style>
    </div>
  );
}