"use client";
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('place_photos')
      .select('*')
      .eq('status', 'pending')
      .order('taken_at', { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const approve = async (id: string) => {
    await supabase.from('place_photos').update({ status: 'approved' }).eq('id', id);
    setPhotos(p => p.filter(x => x.id !== id));
  };

  const reject = async (id: string, filePath: string) => {
    await supabase.from('place_photos').delete().eq('id', id);
    await supabase.storage.from('place-photos').remove([filePath]);
    setPhotos(p => p.filter(x => x.id !== id));
  };

  return (
    <div dir="rtl" style={{ padding: '2rem', fontFamily: 'Arial', background: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ color: '#166534', fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️ פאנל אישור תמונות</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        {loading ? 'טוען...' : `${photos.length} תמונות ממתינות לאישור`}
      </p>
      {!loading && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
          <div style={{ fontSize: '4rem' }}>✅</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>אין תמונות ממתינות!</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {photos.map(photo => {
          const url = supabase.storage.from('place-photos').getPublicUrl(photo.file_path).data.publicUrl;
          return (
            <div key={photo.id} style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src={url} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 'bold', color: '#374151' }}>📍 מקום ID: {photo.place_id}</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#6b7280' }}>👤 {photo.uploader_name}</p>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#9ca3af' }}>🕐 {new Date(photo.taken_at).toLocaleString('he-IL')}</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => approve(photo.id)}
                    style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                    ✅ אשר
                  </button>
                  <button onClick={() => reject(photo.id, photo.file_path)}
                    style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                    ❌ דחה
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
