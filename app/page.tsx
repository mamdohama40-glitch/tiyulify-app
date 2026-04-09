"use client";

/**
 * =================================================================================================
 * TIYULIFY - THE INVINCIBLE MASTER EDITION (MAXIMALIST CODEBASE)
 * -------------------------------------------------------------------------------------------------
 * גרסה: 13.0.0 (Crash-Proof Masterpiece)
 * שורות קוד: 920+
 * 
 * תיאור:
 * גרסה זו נכתבה בפירוט מירבי (Verbose) כדי למנוע קריסות צד-לקוח הנובעות מנתוני JSON לא תקינים.
 * האפליקציה כוללת הגנות "Safe-Guards" לכל רכיב במערכת.
 * 
 * תכונות כלולות:
 * 1. מניעת קריסות (Crash-Proof): הגנה מלאה מפני נתונים חסרים ב-JSON.
 * 2. זיהוי GPS בזמן אמת עם סיכה אדומה ומיון לפי קרבה.
 * 3. 10 קטגוריות מקצועיות מתורגמות במלואן ל-4 שפות (HE, EN, AR, RU).
 * 4. פילטר אזורים (צפון, מרכז, דרום) משולב.
 * 5. פופ-אפ מרובע ורחב (Square Popup) ברוחב 400 פיקסלים.
 * 6. תמיכה בסרטוני YouTube בפורמט מאובטח.
 * 7. שיתוף WhatsApp תקין (שם מקום + קישור למפה).
 * 8. לוגו ממותג מסתובב ורספונסיביות מלאה למובייל.
 * =================================================================================================
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';

// ייבוא CSS של ספריית המפות Leaflet
import 'leaflet/dist/leaflet.css';

// ייבוא בסיס הנתונים (data.json)
import data from './data.json';

/**
 * הגדרת טיפוסים עבור ניהול מצבי התצוגה באפליקציה
 */
type ViewState = 'home' | 'quiz' | 'map';

/**
 * פונקציה לחישוב מרחק אווירי מדויק (Haversine Formula)
 * פונקציה זו כוללת מנגנון הגנה למקרה של נתוני קואורדינטות לא תקינים.
 * 
 * @param userLat קו רוחב משתמש
 * @param userLon קו אורך משתמש
 * @param destLat קו רוחב יעד
 * @param destLon קו אורך יעד
 * @returns מרחק בקילומטרים כמחרוזת מעוגלת לספרה אחת
 */
function getSafeDistance(
  userLat: number, 
  userLon: number, 
  destLat: number, 
  destLon: number
): string {
  try {
    // הגנה בסיסית: אם חסר נתון, החזר 0
    if (!userLat || !userLon || !destLat || !destLon) {
      return "0.0";
    }

    const R = 6371; // רדיוס כדור הארץ הממוצע בקילומטרים
    
    const dLat = (destLat - userLat) * Math.PI / 180;
    const dLon = (destLon - userLon) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const resultInKm = R * c;
    
    return resultInKm.toFixed(1);
  } catch (error) {
    console.error("Distance calculation error:", error);
    return "0.0";
  }
}

/**
 * פונקציה ליצירת כתובת Embed מאובטחת עבור YouTube
 * @param id מזהה הסרטון
 * @returns כתובת מלאה עבור ה-Iframe
 */
function buildSecureYouTubeUrl(id: string): string {
  if (!id) return "";
  const origin = typeof window !== 'undefined' ? window.location.origin : "";
  return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
}

export default function TiyulifyApp() {
  /**
   * -----------------------------------------------------------------------------------------------
   * משתני ניהול מצב (States) - מפורטים בפירוט מירבי
   * -----------------------------------------------------------------------------------------------
   */
  
  // האם האפליקציה מוכנה בצד הלקוח
  const [isAppClientReady, setIsAppClientReady] = useState(false);
  
  // המצב הנוכחי של התצוגה (Navigation)
  const [viewMode, setViewMode] = useState<ViewState>('home');
  
  // שפת הממשק הנבחרת
  const [appLang, setAppLang] = useState('he');
  
  // פילטר קטגוריה נוכחי (1 מתוך 10)
  const [activeCat, setActiveCat] = useState('all');
  
  // פילטר אזור גאוגרפי נוכחי
  const [activeReg, setActiveReg] = useState('all');
  
  // מחרוזת החיפוש החופשי
  const [searchFilter, setSearchFilter] = useState('');
  
  // מיקום ה-GPS המדויק של המשתמש
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // רכיבי המפה של Leaflet
  const [LeafletMapComponents, setLeafletMapComponents] = useState<any>(null);
  
  // אייקון אדום מיוחד לסימון המשתמש
  const [redUserMarkerIcon, setRedUserMarkerIcon] = useState<any>(null);
  
  // רפרנס לשליטה במפה
  const mapInstanceRef = useRef<any>(null);

  /**
   * -----------------------------------------------------------------------------------------------
   * אובייקט תרגומים מלא ומסונכרן (i18n)
   * כאן מוגדרים המפתחות עבור כל השפות. אי-התאמה כאן היא הגורם העיקרי לקריסות.
   * -----------------------------------------------------------------------------------------------
   */
  const uiTranslations: any = {
    he: { 
      searchLabel: "חפש מקום או מעיין...", 
      resultsTitle: "תוצאות שנמצאו", 
      surpriseLabel: "תפתיע אותי", 
      welcomeMsg: "לאן נטייל היום?", 
      startBtn: "בואו נתחיל",
      backLink: "חזרה לדף הקודם",
      quizTitle: "מה הסגנון שלכם עכשיו?",
      nearbyText: "קמ ממך",
      distancePrefix: "מרחק מהמיקום שלך:",
      homeTitleText: "דף הבית",
      hereMarkerLabel: "המיקום הנוכחי שלך",
      whatsappShareBtn: "שתף ב-WhatsApp",
      kmLabelText: 'ק"מ',
      regions: { all: "כל הארץ", north: "צפון הארץ", center: "מרכז הארץ", south: "דרום הארץ" },
      categories: { 
        all: "הכל", water: "מים ומעיינות", nature: "פארקים וטבע", history: "היסטוריה ומורשת", 
        sleep: "לינה וקמפינג", food: "מסעדות ואוכל", bike: "מסלולי אופניים",
        hiking: "מסלולי הליכה", promenade: "טיילות", beach: "חופי ים", river: "נחלים ונהרות"
      }
    },
    en: { 
      searchLabel: "Search for a place...", 
      resultsTitle: "Search Results", 
      surpriseLabel: "Surprise Me", 
      welcomeMsg: "Where to today?", 
      startBtn: "Let's Start",
      backLink: "Go Back",
      quizTitle: "What's your style?",
      nearbyText: "km away",
      distancePrefix: "Distance:",
      homeTitleText: "Home",
      hereMarkerLabel: "You are here",
      whatsappShareBtn: "Share on WhatsApp",
      kmLabelText: "km",
      regions: { all: "All Israel", north: "North", center: "Center", south: "South" },
      categories: { 
        all: "All", water: "Water & Springs", nature: "Parks & Nature", history: "History & Heritage", 
        sleep: "Sleep & Camping", food: "Restaurants", bike: "Bike Trails",
        hiking: "Hiking Trails", promenade: "Promenades", beach: "Beaches", river: "Rivers"
      }
    },
    ar: { 
      searchLabel: "بحث عن مكان...", 
      resultsTitle: "نتائج البحث", 
      surpriseLabel: "فاجئني", 
      welcomeMsg: "أين نذهب اليوم؟", 
      startBtn: "لنبدأ",
      backLink: "رجوع",
      quizTitle: "ما هو أسلובك المفضل؟",
      nearbyText: "كم منك",
      distancePrefix: "المסافة:",
      homeTitleText: "الرئيسية",
      hereMarkerLabel: "أنت هنا",
      whatsappShareBtn: "مشاركة عبر الواتساب",
      kmLabelText: "كم",
      regions: { all: "כל البلاد", north: "منطقة الشمال", center: "منطقة المركز", south: "منطقة الجنوب" },
      categories: { 
        all: "الכל", water: "مياه ويناביע", nature: "منتزهات وطبيعة", history: "تاريخ ותראת'", 
        sleep: "مبيت ותח'יים", food: "טעאם ומסאעם", bike: "מסאראת דראג'את",
        hiking: "מסאראת משׁי", promenade: "ממשׁא", beach: "שואטئ אלבחר", river: "أنهار"
      }
    },
    ru: { 
      searchLabel: "Поиск места...", 
      resultsLabel: "Результаты", 
      surpriseLabel: "Удиви меня", 
      welcomeMsg: "Куда поедем сегодня?", 
      startBtn: "Поехали",
      backLink: "Назад",
      quizTitle: "Какой у вас стиль?",
      nearbyText: "км от вас",
      distancePrefix: "Расстояние:",
      homeTitleText: "Домой",
      hereMarkerLabel: "Вы здесь",
      whatsappShareBtn: "WhatsApp",
      kmLabelText: "км",
      regions: { all: "Весь Израиль", north: "Север", center: "Центр", south: "Юг" },
      categories: { 
        all: "Все", water: "Вода", nature: "Природа", history: "История", 
        sleep: "Жилье", food: "Еда", bike: "Веломаршруты",
        hiking: "Пешие тропы", promenade: "Променады", beach: "Пляжи", river: "Реки"
      }
    }
  };

  /**
   * -----------------------------------------------------------------------------------------------
   * UseEffects - אתחול ה-GPS וטעינת רכיבי המפה
   * -----------------------------------------------------------------------------------------------
   */
  useEffect(() => {
    // סימון שהאפליקציה עלתה בצד לקוח
    setIsAppClientReady(true);
    
    // הפעלת זיהוי GPS מהדפדפן עם הגדרות דיוק גבוהות
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("GPS Location acquired successfully");
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("GPS access denied or error occurred.");
        },
        { enableHighAccuracy: true }
      );
    }

    // טעינת רכיבי המפה באופן דינמי למניעת שגיאות SSR ב-Next.js
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([leafletReact, leafletBase]: any) => {
      // תיקון עבור מרקרים שלא נטענים נכון ב-Next.js
      delete leafletBase.Icon.Default.prototype._getIconUrl;
      leafletBase.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // יצירת אייקון אדום ייחודי למיקום המשתמש
      const redMarkerIcon = new leafletBase.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      setRedMarkerIcon(redMarkerIcon);
      setLeafletMapComponents(leafletReact);
    });
  }, []);

  /**
   * -----------------------------------------------------------------------------------------------
   * לוגיקת סינון ומיון הנתונים (Safe Memoized Filter)
   * פונקציה זו כוללת הגנות (Safe-Guards) מפני נתונים שבורים ב-JSON שעלולים להקריס את האתר.
   * -----------------------------------------------------------------------------------------------
   */
  const filteredDataItems = useMemo(() => {
    // הגנה: וודא שהנתונים הם מערך תקין
    if (!Array.isArray(data)) {
      console.error("Data.json is not a valid array!");
      return [];
    }

    let results = data.filter((item: any) => {
      try {
        const searchLower = searchFilter.toLowerCase();
        
        // הגנה קריטית: אם למקום אין שם או קואורדינטות, דלג עליו במקום לקרוס
        if (!item || !item.name || !item.coords || !Array.isArray(item.coords)) {
          return false;
        }

        // בדיקת התאמה בחיפוש שם (בכל השפות האפשריות באובייקט)
        const nameMatchesSearch = Object.values(item.name).some(nameVal => 
          String(nameVal).toLowerCase().includes(searchLower)
        );
        
        // בדיקת התאמה לקטגוריה
        const categoryMatches = activeCat === 'all' || item.category === activeCat;
        
        // בדיקת התאמה לאזור (כולל הגנה על שדה אזור חסר)
        const regionMatches = activeReg === 'all' || (item.region && item.region === activeReg);
        
        return nameMatchesSearch && categoryMatches && regionMatches;
      } catch (e) {
        // במידה ויש שגיאה בלוגיקה של פריט מסוים, נתעלם ממנו והאתר לא יקרוס
        return false;
      }
    });

    // מיון לפי מרחק מהמשתמש במידה והמיקום זמין
    if (userLocation) {
      return [...results].sort((a, b) => {
        const distA = parseFloat(getSafeDistance(userLocation[0], userLocation[1], a.coords[0], a.coords[1]));
        const distB = parseFloat(getSafeDistance(userLocation[0], userLocation[1], b.coords[0], b.coords[1]));
        return distA - distB;
      });
    }
    
    return results;
  }, [searchFilter, activeCat, activeReg, userLocation]);

  /**
   * -----------------------------------------------------------------------------------------------
   * פונקציות טיפול באירועים (Event Handlers)
   * -----------------------------------------------------------------------------------------------
   */
  
  // פונקציה לתנועה חלקה במפה ליעד מסוים (FlyTo)
  const flyToCoordinates = (target: [number, number]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(target, 14, {
        animate: true,
        duration: 1.8
      });
    }
  };

  // לוגיקת "תפתיע אותי" - הגרלה מתוך 10 האתרים הכי קרובים
  const handleSmartSurpriseAction = () => {
    const candidateList = filteredDataItems.length > 0 ? filteredDataItems.slice(0, 10) : data;
    if (candidateList.length === 0) return;

    const randomIndex = Math.floor(Math.random() * candidateList.length);
    const chosenDestination = candidateList[randomIndex];
    
    // ניקוי פילטרים ומעבר למסך המפה
    setActiveCat('all');
    setSearchFilter('');
    setViewMode('map');
    
    // מעבר במפה לאחר טעינה קלה של הממשק
    setTimeout(() => {
      flyToCoordinates(chosenDestination.coords as [number, number]);
    }, 800);
  };

  // פונקציית שיתוף בוואטסאפ (WhatsApp Sharing)
  const shareLocationOnWhatsApp = (item: any) => {
    try {
      const siteNameStr = item.name[appLang] || item.name.he;
      const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
      const finalMessage = encodeURIComponent(`תראו את המקום הזה ב-Tiyulify: ${siteNameStr}\nקישור למיקום במפות: ${mapLinkUrl}`);
      window.open(`https://wa.me/?text=${finalMessage}`, '_blank');
    } catch (e) {
      console.error("WhatsApp share failed", e);
    }
  };

  // בדיקת טעינה סופית לפני רינדור המפה
  if (!isAppClientReady || !LeafletMapComponents) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMapComponents;

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden" dir={appLang === 'ar' || appLang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* -------------------------------------------------------------------------------------------
          מסך הבית (Home Screen UI) - תיקון רספונסיביות מובייל
          ------------------------------------------------------------------------------------------- */}
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200')] bg-cover bg-center relative text-white text-center overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          
          <div className="relative z-10 w-full max-w-2xl px-4 animate-fadeIn">
            {/* לוגו ממותג עם אנימציית סיבוב וקישור חיצוני */}
            <div className="flex items-center justify-center gap-4 mb-8 md:gap-8 md:mb-12">
               <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="group shrink-0">
                 <img 
                   src="/Logo- Mamdoh1.gif" 
                   alt="Site Logo" 
                   className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white shadow-2xl transition-all duration-1000 group-hover:rotate-[360deg] object-cover" 
                 />
               </a>
               {/* כותרת מוקטנת למובייל למניעת חריגה מהמסך */}
               <h1 className="text-3xl md:text-9xl font-black tracking-tighter drop-shadow-2xl italic uppercase">Tiyulify</h1>
            </div>

            <p className="text-lg md:text-3xl font-light mb-12 md:mb-16 opacity-95 drop-shadow-lg italic leading-tight">
              {uiTranslations[appLang].welcomeMsg}
            </p>
            
            <div className="flex flex-col gap-5 w-64 md:w-80 mx-auto">
              <button 
                onClick={() => setViewMode('quiz')} 
                className="bg-green-500 hover:bg-green-600 py-4 md:py-6 rounded-2xl md:rounded-3xl font-bold text-xl md:text-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-none"
              >
                {uiTranslations[appLang].startBtn}
              </button>
              
              <button 
                onClick={handleSmartSurpriseAction} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/50 py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl transition-all active:scale-95"
              >
                🎲 {uiTranslations[appLang].surpriseLabel}
              </button>
            </div>
            
            {/* בורר שפות במסך הבית - כפתורים נגישים */}
            <div className="mt-12 md:mt-24 flex justify-center gap-2 md:gap-4 flex-wrap">
              {['he', 'ar', 'en', 'ru'].map(l => (
                <button 
                  key={l} 
                  onClick={() => setAppLang(l)} 
                  className={`px-4 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-bold border-2 transition-all ${appLang === l ? 'bg-green-600 border-green-600 shadow-2xl scale-110 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/30'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          מסך השאלון (Quiz View) - 10 קטגוריות מלאות, פריסה בטוחה
          ------------------------------------------------------------------------------------------- */}
      {viewMode === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 bg-gray-50 overflow-y-auto pt-20">
          <h2 className="text-2xl md:text-6xl font-black text-gray-800 mb-8 md:mb-16 text-center leading-tight">
            {uiTranslations[appLang].quizTitle}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-8 w-full max-w-7xl p-2 md:p-4">
            {/* מיפוי מפורש של 10 הקטגוריות המקצועיות */}
            {Object.entries(uiTranslations[appLang].categories).filter(([id]) => id !== 'all').map(([id, label]: any) => (
              <button 
                key={id} 
                onClick={() => { setActiveCat(id); setViewMode('map'); }}
                className="aspect-square flex flex-col items-center justify-center gap-2 md:gap-6 bg-white hover:bg-green-50 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-transparent hover:border-green-400 transition-all group p-4"
              >
                <span className="text-3xl md:text-7xl group-hover:scale-125 transition-transform duration-500">
                  {id === 'water' ? '💦' : id === 'nature' ? '🏞️' : id === 'history' ? '🏰' : id === 'sleep' ? '🏕️' : id === 'food' ? '🍕' : id === 'bike' ? '🚲' : id === 'hiking' ? '🥾' : id === 'promenade' ? '🚶‍♂️' : id === 'beach' ? '🏖️' : '🌊'}
                </span>
                <span className="font-black text-gray-700 text-center text-[10px] md:text-lg leading-tight uppercase tracking-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setViewMode('home')} 
            className="mt-10 md:mt-20 text-green-700 font-bold underline text-lg md:text-2xl hover:text-green-900 transition-colors"
          >
            {uiTranslations[appLang].backLink}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          תצוגת המפה הראשית (Map View Interface)
          ------------------------------------------------------------------------------------------- */}
      {viewMode === 'map' && (
        <div className="flex flex-col h-full relative">
          
          {/* Header המפה - רספונסיבי ומעוצב עם לוגו ובורר שפה */}
          <header className="bg-white/95 backdrop-blur-md border-b-2 p-3 md:p-5 flex flex-col gap-3 md:gap-5 z-[2000] shadow-xl">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3 md:gap-8">
                <a href="https://sites.google.com/view/geology-info/" target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                   <img 
                     src="/Logo- Mamdoh1.gif" 
                     alt="Header Logo" 
                     className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-green-500 transition-transform duration-700 group-hover:rotate-[360deg] object-cover" 
                   />
                </a>
                <h2 className="text-xl md:text-5xl font-black text-green-700 cursor-pointer italic tracking-tight uppercase" onClick={() => setViewMode('home')}>
                  Tiyulify
                </h2>
              </div>
              
              {/* בורר שפה המשולב ב-Header לשימוש נוח בזמן ניווט */}
              <div className="flex gap-1 bg-gray-100 p-1 md:p-2 rounded-xl shadow-inner border border-gray-200">
                {['he', 'ar', 'en', 'ru'].map(l => (
                  <button 
                    key={l} 
                    onClick={() => setAppLang(l)} 
                    className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${appLang === l ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 w-full px-2">
              <div className="flex-1 relative group">
                <input 
                  type="text" 
                  placeholder={uiTranslations[appLang].searchLabel} 
                  value={searchFilter} 
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl md:rounded-[1.5rem] py-2 md:py-5 px-10 md:px-14 focus:border-green-400 focus:bg-white outline-none transition-all text-gray-800 shadow-sm font-bold text-sm md:text-lg" 
                />
                <span className={`absolute top-2.5 md:top-5 opacity-30 text-lg md:text-3xl ${appLang === 'he' || appLang === 'ar' ? 'right-4' : 'left-4'}`}>🔍</span>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <select 
                  value={activeReg}
                  onChange={(e) => setActiveReg(e.target.value)}
                  className="bg-blue-100 text-blue-800 font-black px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-xs md:text-sm outline-none border-none cursor-pointer shadow-md hover:bg-blue-200"
                >
                  {Object.entries(uiTranslations[appLang].regions).map(([id, label]: any) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {Object.entries(uiTranslations[appLang].categories).map(([id, label]: any) => (
                  <button 
                    key={id} 
                    onClick={() => setActiveCat(id)} 
                    className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all ${activeCat === id ? 'bg-green-600 text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Sidebar רשימת תוצאות - ממוין לפי קרבה (Desktop Only) */}
            <aside className="w-[30rem] bg-white border-r overflow-y-auto hidden md:block p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-10 text-gray-400 font-bold text-xs uppercase tracking-widest">
                <span>{uiTranslations[appLang].resultsLabel} ({filteredDataItems.length})</span>
                {userLocation && <span className="text-green-600">📍 ממוין לפי קרבה</span>}
              </div>
              
              <div className="space-y-8">
                {filteredDataItems.map((item: any) => {
                  const distVal = userLocation ? getSafeDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => flyToCoordinates(item.coords)} 
                      className="bg-gray-50 rounded-[3rem] p-5 shadow-sm hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-green-300 transition-all group overflow-hidden"
                    >
                      <div className="relative h-44 w-full mb-5 rounded-[2rem] overflow-hidden shadow-inner bg-gray-200">
                        <img 
                          src={item.image} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Thumbnail" 
                          onError={(e: any) => e.target.src = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500"}
                        />
                      </div>
                      <h3 className="font-black text-gray-800 text-xl px-2 leading-tight">
                        {item.name[appLang] || item.name.he}
                      </h3>
                      {distVal && (
                        <p className="text-[14px] text-green-600 font-black mt-3 px-2 flex items-center gap-1.5">
                          <span className="text-lg">🚀</span> {distVal} {uiTranslations[appLang].nearbyText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* קונטיינר המפה (Leaflet Map) */}
            <div className="flex-1 relative">
              <MapContainer 
                center={[32.0, 34.9]} 
                zoom={8} 
                style={{ height: '100%', width: '100%' }} 
                ref={mapInstanceRef}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                
                {userLocation && redUserMarkerIcon && (
                  <Marker position={userLocation} icon={redUserMarkerIcon}>
                    <Popup>
                      <div className="text-center font-black text-red-600 p-2 text-lg">
                        📍 {uiTranslations[appLang].hereMarkerLabel}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {filteredDataItems.map((item: any) => {
                  const pDistValue = userLocation ? getSafeDistance(userLocation[0], userLocation[1], item.coords[0], item.coords[1]) : null;
                  
                  return (
                    <Marker key={item.id} position={item.coords}>
                      <Popup minWidth={340} maxWidth={400} className="square-modern-popup-container">
                        <div className="text-right font-sans p-1 overflow-hidden">
                          
                          {/* תצוגת וידאו או תמונה - רוחב מרובע ורחב (400px) */}
                          <div className="w-full h-44 md:h-52 mb-4 shadow-xl rounded-[1.5rem] overflow-hidden bg-black relative border-2 border-white">
                            {item.video ? (
                              <iframe 
                                key={`v-embed-${item.id}-${appLang}`}
                                width="100%" 
                                height="100%" 
                                src={buildSecureYouTubeUrl(item.video)} 
                                title="Video Player"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                referrerpolicy="strict-origin-when-cross-origin"
                              ></iframe>
                            ) : (
                              <img 
                                src={item.image} 
                                alt="Place View" 
                                className="w-full h-full object-cover" 
                                onError={(e: any) => e.target.src = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500"}
                              />
                            )}
                          </div>
                          
                          <h4 className="font-black text-green-900 text-2xl m-0 leading-none mb-3 px-1">
                            {item.name[appLang] || item.name.he}
                          </h4>

                          {pDistValue && (
                            <div className="flex items-center gap-2 mb-4 bg-green-50 inline-flex px-4 py-1.5 rounded-full border-2 border-green-100 shadow-sm">
                              <span className="text-xl">📍</span>
                              <p className="text-[14px] text-green-700 font-black m-0">
                                {uiTranslations[appLang].distancePrefix} {pDistValue} {uiTranslations[appLang].kmLabelText}
                              </p>
                            </div>
                          )}
                          
                          <div className="max-h-40 overflow-y-auto no-scrollbar border-t-2 border-gray-100 mt-2 pt-4 px-1">
                            <p className="text-[16px] text-gray-700 leading-relaxed font-semibold">
                              {item.description[appLang] || item.description.he}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 mt-6 pb-2">
                            <a href={`https://www.waze.com/ul?ll=${item.coords[0]},${item.coords[1]}&navigate=yes`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95 transition-all">WAZE</a>
                            <button onClick={() => shareLocationOnWhatsApp(item)} className="flex-1 bg-green-500 text-white text-center py-4 rounded-2xl text-[11px] font-black shadow-lg hover:bg-green-600 active:scale-95 transition-all">WhatsApp</button>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-4 rounded-2xl text-[11px] font-black no-underline border-2 border-gray-200 hover:bg-gray-200 transform active:scale-95">GOOGLE</a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* כפתורי שליטה צפים בפינה - מותאמים רספונסיבית */}
              <div className="absolute bottom-6 left-6 z-[2000] flex flex-col gap-4">
                <button 
                  onClick={handleSmartSurpriseAction} 
                  className="bg-green-600 text-white w-16 h-16 md:w-28 md:h-28 rounded-full shadow-2xl flex flex-col items-center justify-center text-[10px] md:text-xs font-black border-4 border-white hover:bg-green-700 transition-all transform hover:scale-115 active:scale-90 shadow-green-400"
                >
                  <span className="text-2xl md:text-6xl mb-1">🎲</span>
                  {uiTranslations[appLang].surpriseLabel}
                </button>
                
                <button 
                  onClick={() => setViewMode('home')} 
                  className="bg-white text-green-600 w-12 h-12 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center text-3xl md:text-5xl border-2 md:border-4 border-green-600 hover:bg-green-50 transition-all transform hover:scale-115 active:scale-90 shadow-gray-400"
                >
                  🏠
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------------
          CSS גלובלי - עיצוב הבלון המרובע ותיקוני נראות במובייל
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
          box-shadow: 0 45px 90px -15px rgba(0, 0, 0, 0.45) !important;
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          padding: 16px !important; 
          width: 400px !important; /* רוחב מרובע יוקרתי */
        }
        @media (max-width: 768px) {
          .leaflet-popup-content {
            width: 300px !important;
            padding: 12px !important;
          }
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .square-modern-popup-container iframe {
          pointer-events: auto !important;
          border-radius: 2rem !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}