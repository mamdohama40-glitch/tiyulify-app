const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');
const start = c.indexOf('<Popup minWidth={260} maxWidth={300} className="square-modern-popup-container">');
const end = c.indexOf('</Popup>', start) + '</Popup>'.length;
const newPopup = `<Popup minWidth={260} maxWidth={300} className="square-modern-popup-container">
                          <div className="text-right font-sans p-1 overflow-hidden">
                            <div className="w-full h-28 mb-2 shadow-xl rounded-[1.5rem] overflow-hidden border-2 border-white flex items-center justify-center" style={{background:'linear-gradient(135deg,#3b82f622,#3b82f644)'}}>
                              <span style={{fontSize:'3rem'}}>📍</span>
                            </div>
                            <h4 className="font-bold text-green-900 text-sm m-0 leading-snug mb-1 px-1">{searchMarkerName}</h4>
                            <p className="text-[11px] text-gray-500 px-1 mb-2">{searchMarker ? searchMarker[0].toFixed(4)+', '+searchMarker[1].toFixed(4) : ''}</p>
                            {userCoords && searchMarker && <div className="flex items-center gap-1.5 mb-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm inline-flex"><span className="text-base">📍</span><span className="text-[12px] text-green-700 font-black">{calculateDistance(userCoords[0],userCoords[1],searchMarker[0],searchMarker[1])} {labels[activeLang].km}</span></div>}
                            <div className="flex flex-wrap gap-2 mt-2 pb-1">
                              <a href={\`https://www.waze.com/ul?ll=\${searchMarker[0]},\${searchMarker[1]}&navigate=yes\`} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-3 rounded-2xl text-[11px] font-black no-underline shadow-lg active:scale-95">WAZE</a>
                              <button onClick={()=>window.open(\`https://wa.me/?text=\${encodeURIComponent('Tiyulify: '+searchMarkerName+'\\nhttps://www.google.com/maps/search/?api=1&query='+searchMarker[0]+','+searchMarker[1])}\`,'_blank')} className="flex-1 bg-green-500 text-white text-center py-3 rounded-2xl text-[11px] font-black shadow-lg active:scale-95">WhatsApp</button>
                              <a href={\`https://www.google.com/maps/search/?api=1&query=\${searchMarker[0]},\${searchMarker[1]}\`} target="_blank" className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-2xl text-[11px] font-black no-underline border border-gray-200 hover:bg-gray-200 active:scale-95">GOOGLE</a>
                            </div>
                          </div>
                        </Popup>`;
c = c.substring(0, start) + newPopup + c.substring(end);
fs.writeFileSync('app/page.tsx', c, 'utf8');
console.log('done');
