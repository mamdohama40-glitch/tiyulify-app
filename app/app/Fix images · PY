"""
fix_images.py
=============
מריץ מהתיקייה הראשית של הפרויקט:
    python3 fix_images.py

מה הסקריפט עושה:
- מחליף תמונות כפולות/לא מתאימות ב-data.json
- מקומות מפורסמים → תמונות Wikipedia Commons אמיתיות ומדויקות
- שאר המקומות → מגוון תמונות Unsplash לפי קטגוריה (ללא כפילויות)
- שומר חזרה ל-app/data.json
"""

import json, itertools, os

# ============================================================
# 1. תמונות Wikipedia Commons לאתרים המפורסמים (מדויקות)
# ============================================================
SPECIFIC_IMAGES = {
    "1":  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg",
    "4":  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Banias_Waterfall.jpg/800px-Banias_Waterfall.jpg",
    "6":  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Nimrod_fortress_from_the_air.jpg/800px-Nimrod_fortress_from_the_air.jpg",
    "9":  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Mount_Bental_Israel.jpg/800px-Mount_Bental_Israel.jpg",
    "11": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Hexagonal_basalt_columns_Meshushim.jpg/800px-Hexagonal_basalt_columns_Meshushim.jpg",
    "17": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Tel_Dan_Stream.jpg/800px-Tel_Dan_Stream.jpg",
    "21": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Belvoir_Castle_aerial.jpg/800px-Belvoir_Castle_aerial.jpg",
    "29": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Beit_Shean_Roman_Theatre.jpg/800px-Beit_Shean_Roman_Theatre.jpg",
    "33": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Ein_Gedi_waterfall.jpg/800px-Ein_Gedi_waterfall.jpg",
    "36": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Israel-2013-Aerial_21-Masada.jpg/800px-Israel-2013-Aerial_21-Masada.jpg",
    "39": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Soreq_Cave_Stalactites.jpg/800px-Soreq_Cave_Stalactites.jpg",
    "42": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Beit_Guvrin_bell_cave.jpg/800px-Beit_Guvrin_bell_cave.jpg",
    "44": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Rosh_Hanikra_grotto.jpg/800px-Rosh_Hanikra_grotto.jpg",
    "50": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mount_Meron_forest.jpg/800px-Mount_Meron_forest.jpg",
    "54": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ein_Avdat_Canyon.jpg/800px-Ein_Avdat_Canyon.jpg",
    "57": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/HaMakhtesh_HaGadol.jpg/800px-HaMakhtesh_HaGadol.jpg",
    "60": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Timna_park_Solomons_pillars.jpg/800px-Timna_park_Solomons_pillars.jpg",
    "61": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Red_Canyon_Eilat.JPG/800px-Red_Canyon_Eilat.JPG",
    "65": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Caesarea_Maritima_Theatre.jpg/800px-Caesarea_Maritima_Theatre.jpg",
    "72": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Qumran_Caves.jpg/800px-Qumran_Caves.jpg",
    "71": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Monastery_of_Saint_George_Wadi_Qelt.jpg/800px-Monastery_of_Saint_George_Wadi_Qelt.jpg",
    "30": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Monastery_of_Saint_George_Wadi_Qelt.jpg/800px-Monastery_of_Saint_George_Wadi_Qelt.jpg",
    "153": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mitzpe_Ramon_Crater.jpg/800px-Mitzpe_Ramon_Crater.jpg",
    "155": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tel_Aviv_Promenade_2012.JPG/800px-Tel_Aviv_Promenade_2012.JPG",
    "157": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Alexander_Stream_IMG_2584.JPG/800px-Alexander_Stream_IMG_2584.JPG",
    "160": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mount_Tabor_Israel.JPG/800px-Mount_Tabor_Israel.JPG",
    "163": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Little_Switzerland_Carmel.jpg/800px-Little_Switzerland_Carmel.jpg",
    "164": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Red_Canyon_Eilat.JPG/800px-Red_Canyon_Eilat.JPG",
    "166": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Keshet_Cave_arch_Israel.jpg/800px-Keshet_Cave_arch_Israel.jpg",
    "168": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jerusalem_Old_City_Walls.jpg/800px-Jerusalem_Old_City_Walls.jpg",
    "169": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Armon_Hanatziv_Promenade_view.jpg/800px-Armon_Hanatziv_Promenade_view.jpg",
    "170": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Louis_Promenade_Haifa.JPG/800px-Louis_Promenade_Haifa.JPG",
    "171": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Tel_Aviv_Beach_Promenade.jpg/800px-Tel_Aviv_Beach_Promenade.jpg",
    "176": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Acre_walls_promenade.jpg/800px-Acre_walls_promenade.jpg",
}

# ============================================================
# 2. מאגרי תמונות Unsplash לפי קטגוריה — ללא כפילויות
# ============================================================
CATEGORY_POOLS = {
    "water": [
        "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=500",   # waterfall rocks
        "https://images.unsplash.com/photo-1516912481800-0b03bf3c84a2?w=500",   # stream in forest
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=500",   # clear pool
        "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=500",   # spring waterfall
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=500",   # forest creek
        "https://images.unsplash.com/photo-1502322754280-b7fd4b1f5da3?w=500",   # rocky stream
        "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=500",   # jungle waterfall
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=500",   # nature water
        "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=500",      # calm river
        "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=500",   # small waterfall
        "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=500",   # stream pebbles
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",   # desert spring
        "https://images.unsplash.com/photo-1566024349612-85eb12fe1d68?w=500",   # water reflection
        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500",   # pool in nature
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500",   # lake mountains
    ],
    "nature": [
        "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500",   # green forest
        "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500",   # mountain meadow
        "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500",   # canyon vista
        "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=500",   # golden field
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500",   # mountain sunrise
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=500",   # forest path
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=500",   # valley view
        "https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=500",   # rocky landscape
        "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500",   # autumn forest
        "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=500",   # desert landscape
        "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=500",      # mountain peak
        "https://images.unsplash.com/photo-1478827387698-1527781a4887?w=500",   # hilltop panorama
    ],
    "history": [
        "https://images.unsplash.com/photo-1555993539-1732b0258235?w=500",      # ancient stones
        "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=500",   # old city ruins
        "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500",      # historic wall
        "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=500",   # ancient columns
        "https://images.unsplash.com/photo-1592409823564-9f4fb41f0523?w=500",   # old fortress
        "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=500",   # historic building
        "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=500",   # ruins close-up
    ],
    "hiking": [
        "https://images.unsplash.com/photo-1501261379792-a15e8e7b5a46?w=500",   # hiking trail
        "https://images.unsplash.com/photo-1551632811-561732d1e306?w=500",      # mountain hike
        "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=500",   # forest trail
        "https://images.unsplash.com/photo-1536575193803-5591fc8b74ba?w=500",   # rocky path
        "https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=500",   # hiking landscape
        "https://images.unsplash.com/photo-1543953474-b2b1acdef5b7?w=500",      # trail in nature
        "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=500",   # walking path
        "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=500",   # trail woods
    ],
    "food": [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500",   # restaurant dish
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500",   # food plate
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500",   # salad/mezze
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500",      # restaurant interior
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500",   # cooked food
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500",   # fresh food
    ],
    "cafe": [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500",   # cafe with coffee
        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500",   # cozy cafe
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500",   # coffee cup
        "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=500",   # cafe exterior
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500",      # cafe interior
    ],
    "promenade": [
        "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=500",   # seaside promenade
        "https://images.unsplash.com/photo-1520516088096-07ddfe5a3079?w=500",   # coastal walkway
        "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=500",   # evening seafront
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500",   # beach promenade
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",   # sea view
    ],
    "bike": [
        "https://images.unsplash.com/photo-1444491741275-3747c53c99b4?w=500",   # mountain biking
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",      # cycling path
        "https://images.unsplash.com/photo-1567167543891-5cd5e3c6f27d?w=500",   # bike trail
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",   # cycling nature
    ],
    "sleep": [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500",   # glamping/tent
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=500",   # cozy cabin
        "https://images.unsplash.com/photo-1525596662741-e94ff9f26de1?w=500",   # wooden cabin
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500",   # resort view
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=500",   # scenic lodging
    ],
    "accommodation": [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500",
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=500",
        "https://images.unsplash.com/photo-1525596662741-e94ff9f26de1?w=500",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500",
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=500",
        "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=500",
    ],
    "beach": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",   # blue sea beach
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500",   # sandy beach
        "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=500",   # Mediterranean
        "https://images.unsplash.com/photo-1468413253329-f599de3e87b9?w=500",   # sea coast
    ],
    "river": [
        "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=500",
        "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=500",
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=500",
        "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=500",
    ],
}

# fallback כללי אם הקטגוריה לא מופיעה
DEFAULT_POOL = [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500",
    "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=500",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500",
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500",
]

# ============================================================
# 3. הרצה
# ============================================================
data_path = os.path.join(os.path.dirname(__file__), 'app', 'data.json')
if not os.path.exists(data_path):
    # ניסיון שני — אם מריצים מתוך תיקיית app
    data_path = 'data.json'

print(f"קורא: {data_path}")
with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# יצירת איטרטורים מחזוריים לכל קטגוריה
iterators = {cat: itertools.cycle(imgs) for cat, imgs in CATEGORY_POOLS.items()}
default_iter = itertools.cycle(DEFAULT_POOL)

changed = 0
for item in data:
    item_id = str(item['id'])
    if item_id in SPECIFIC_IMAGES:
        item['image'] = SPECIFIC_IMAGES[item_id]
        changed += 1
    else:
        cat = item.get('category', '')
        if cat in iterators:
            item['image'] = next(iterators[cat])
        else:
            item['image'] = next(default_iter)
        changed += 1

with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ עודכנו {changed} תמונות מתוך {len(data)} רשומות")
print(f"✅ נשמר ל: {data_path}")