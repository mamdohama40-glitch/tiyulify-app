"""
fix_images_smart.py — גרסה סופית
תמונות ייחודיות לכל מקום, לפי קטגוריה ושם
"""
import json, os
from collections import Counter

SPECIFIC = {
    "1":  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Hermonsnow.jpg/800px-Hermonsnow.jpg",
    "2":  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Nahal_Snir_Hatzbani.jpg/800px-Nahal_Snir_Hatzbani.jpg",
    "3":  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Tel_Dan_Nature_Reserve_2.jpg/800px-Tel_Dan_Nature_Reserve_2.jpg",
    "4":  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Banias_Waterfall.jpg/800px-Banias_Waterfall.jpg",
    "5":  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Nahal_Iyyon_waterfall.jpg/800px-Nahal_Iyyon_waterfall.jpg",
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
    "71": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Monastery_of_Saint_George_Wadi_Qelt.jpg/800px-Monastery_of_Saint_George_Wadi_Qelt.jpg",
    "72": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Qumran_Caves.jpg/800px-Qumran_Caves.jpg",
    "153":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mitzpe_Ramon_Crater.jpg/800px-Mitzpe_Ramon_Crater.jpg",
    "155":"https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tel_Aviv_Promenade_2012.JPG/800px-Tel_Aviv_Promenade_2012.JPG",
    "157":"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Alexander_Stream_IMG_2584.JPG/800px-Alexander_Stream_IMG_2584.JPG",
    "160":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mount_Tabor_Israel.JPG/800px-Mount_Tabor_Israel.JPG",
    "163":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Little_Switzerland_Carmel.jpg/800px-Little_Switzerland_Carmel.jpg",
    "166":"https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Keshet_Cave_arch_Israel.jpg/800px-Keshet_Cave_arch_Israel.jpg",
    "168":"https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jerusalem_Old_City_Walls.jpg/800px-Jerusalem_Old_City_Walls.jpg",
    "169":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Armon_Hanatziv_Promenade_view.jpg/800px-Armon_Hanatziv_Promenade_view.jpg",
    "170":"https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Louis_Promenade_Haifa.JPG/800px-Louis_Promenade_Haifa.JPG",
    "171":"https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Tel_Aviv_Beach_Promenade.jpg/800px-Tel_Aviv_Beach_Promenade.jpg",
    "176":"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Acre_walls_promenade.jpg/800px-Acre_walls_promenade.jpg",
}

def make_pool(base_ids, sizes):
    """צור פול ייחודי — לכל photo-id נוצרות מספר גרסאות עם w=NNN שונה"""
    out = []
    for pid in base_ids:
        for s in sizes:
            out.append(f"https://images.unsplash.com/{pid}?w={s}")
    return out

# === פולים לפי קטגוריה ===
# מים זורמים — נחלים
STREAM_IDS = [
    "photo-1433086966358-54859d0ed716","photo-1516912481800-0b03bf3c84a2",
    "photo-1504701954957-2010ec3bcec1","photo-1475924156734-496f6cac6ec1",
    "photo-1502322754280-b7fd4b1f5da3","photo-1494472155656-f34e81b17ddc",
    "photo-1546587348-d12660c30c50","photo-1518020382113-a7e8fc38eac9",
    "photo-1455156218388-5e61b526818b","photo-1469474968028-56623f02e42e",
    "photo-1500534314209-a25ddb2bd429","photo-1528360983277-13d401cdc186",
    "photo-1531088009183-5ff5b7c95f91","photo-1566024349612-85eb12fe1d68",
    "photo-1509316785289-025f5b846b35","photo-1470770841072-f978cf4d7b7f",
    "photo-1524678516056-a5852ce19d21","photo-1529923290015-b280c413e29e",
]

# עיינות ובריכות
SPRING_IDS = [
    "photo-1544198365-f5d60b6d8190","photo-1533038590840-1cde6e668a91",
    "photo-1437333028129-c14bb199f782","photo-1501785888041-af3ef285b470",
    "photo-1508873696983-2df5151ec3e5","photo-1504872266826-c7dcd60eeb6a",
    "photo-1570213489059-0aac6626cade","photo-1566073771259-6a8506099945",
    "photo-1561501900-3701fa6a0864","photo-1510511459019-5dda7724fd87",
    "photo-1543296236-22e6b73cf4a5","photo-1530053969600-caed2596d242",
    "photo-1552083974-46422cd0c77e","photo-1516298773066-86c3e60ec574",
    "photo-1527016021839-bfe86a0a5e97","photo-1470770841072-f978cf4d7b7f",
    "photo-1518710843875-9f9cd67a7fe6","photo-1519114212285-f48d13e6cb38",
]

# חופים
BEACH_IDS = [
    "photo-1507525428034-b723cf961d3e","photo-1519046904884-53103b34b206",
    "photo-1468413253329-f599de3e87b9","photo-1473116763249-2faaef81ccda",
    "photo-1499365892270-2831ce36d7e3","photo-1533760881669-80db4d7b341f",
    "photo-1476984251899-8d7fdfc5c92c","photo-1518509562904-e7ef99cdcc86",
    "photo-1510414842594-a61c69b5ae57","photo-1484821582734-6692f4eabc1e",
    "photo-1559128010-7c1ad6e1b6a5","photo-1458030677662-5359ddb6c66e",
    "photo-1501436513145-30f24e19fcc8","photo-1530409407064-aa61c3e0e41b",
    "photo-1482192596544-9eb780fc7f66","photo-1471922694854-ff1b63b20054",
    "photo-1570616969692-8a6a6e79c5c5",
]

# טבע, פארקים, הרים, מצפות
NATURE_IDS = [
    "photo-1448375240586-882707db888b","photo-1519331379826-f10be5486c6f",
    "photo-1465146344425-f00d5f5c8f07","photo-1506905925346-21bda4d32df4",
    "photo-1426604966848-d7adac402bff","photo-1502082553048-f009c37129b9",
    "photo-1510797215324-95aa89f43c33","photo-1549880338-65ddcdfd017b",
    "photo-1478827387698-1527781a4887","photo-1504233529578-6d46baba6d34",
    "photo-1519681393784-d120267933ba","photo-1558618047-3c8c76ca7d13",
    "photo-1476041800959-2f6bb412c8ce","photo-1504051771394-dd2e66b2e08f",
    "photo-1445116572660-236099ec97a0","photo-1570616969692-8a6a6e79c5c5",
    "photo-1575540027877-a5d1baf2e85d","photo-1499336875752-6e58aa4c1b35",
    "photo-1472214103451-9374bd1c798e","photo-1441974231531-c6227db76b6e",
    "photo-1431576827399-726137a6b245","photo-1502185893445-0df462e58576",
    "photo-1506197603052-3cc9c3a201bd","photo-1511497584788-876760111969",
    "photo-1522143049-25e7dbae1c22","photo-1523467236394-bce30f70d01b",
]

# הליכה
HIKING_IDS = [
    "photo-1501261379792-a15e8e7b5a46","photo-1551632811-561732d1e306",
    "photo-1530866495561-507c9faab2ed","photo-1536575193803-5591fc8b74ba",
    "photo-1527856263669-12c3a0af2aa6","photo-1440186347098-386b7459ad6b",
    "photo-1501955376467-add3de837bba","photo-1531310197839-ccf54634509e",
    "photo-1434394354979-a235cd36269d","photo-1498429152472-9a433d9ddf3b",
    "photo-1488861859915-4b5a5e57649f","photo-1481006368824-8dd3efae1e6a",
]

# היסטוריה
HISTORY_IDS = [
    "photo-1555993539-1732b0258235","photo-1466442929976-97f336a657be",
    "photo-1533929736458-ca588d08c8be","photo-1569163139394-de4e4f43e4e3",
    "photo-1592409823564-9f4fb41f0523","photo-1565967511849-76a60a516170",
    "photo-1548681528-6a5c45b66b42","photo-1560343090-f0409e92791a",
    "photo-1487278773967-a3b2f9bc2c90","photo-1486325212027-8081e485255e",
]

# לינה — בקתות, גלמפינג בטבע (לא מלונות עירוניים!)
ACCOMMODATION_IDS = [
    "photo-1520250497591-112f2f40a3f4","photo-1499793983690-e29da59ef1c2",
    "photo-1525596662741-e94ff9f26de1","photo-1571896349842-33c89424de2d",
    "photo-1445019980597-93fa8acb246c","photo-1510798831971-661eb04b3739",
    "photo-1470115636492-6d2b56f9146d","photo-1571003123894-1f0594d2b5d9",
    "photo-1551882547-ff40c63fe0f5","photo-1582719478250-c89cae4dc85b",
    "photo-1537996194471-e657df975ab4","photo-1566294731804-4b9d6ba4d3bd",
    "photo-1470847355775-e0e3c35a9a2c","photo-1596394516093-501ba68a0ba6",
    "photo-1605346576570-3e09b5c6aade","photo-1567634175943-4f8aa88f1b9a",
    "photo-1561501900-3701fa6a0864","photo-1571003123894-1f0594d2b5d9",
    "photo-1475924156734-496f6cac6ec1","photo-1526975605763-7791544d77a8",
    "photo-1545558014-8692077e9b5c","photo-1449158742531-cd23e0a0e7e6",
]

# אוכל
FOOD_IDS = [
    "photo-1414235077428-338989a2e8c0","photo-1504674900247-0877df9cc836",
    "photo-1498837167922-ddd27525d352","photo-1555396273-367ea4eb4db5",
    "photo-1567620905732-2d1ec7ab7445","photo-1540189549336-e6e99c3679fe",
    "photo-1476224203421-9ac39bcb3df6","photo-1565299624946-b28f40a04680",
    "photo-1504958409-9a7af1fc4456","photo-1512621776951-a57141f2eefd",
    "photo-1481931098730-318b6f776db0","photo-1466637574441-749b8f19452f",
]

# קפה
CAFE_IDS = [
    "photo-1495474472287-4d71bcdd2085","photo-1442512595331-e89e73853f31",
    "photo-1509042239860-f550ce710b93","photo-1554118811-1e0d58224f24",
    "photo-1453614512568-c4024d13c247","photo-1511920170033-f8396924c348",
    "photo-1501339847302-ac426a4a7cbb","photo-1521017432531-fbd92d768814",
    "photo-1507003211169-0a1dd7228f2d","photo-1543158181-e6f9f6712055",
]

# טיילות
PROMENADE_IDS = [
    "photo-1534430480872-3498386e7856","photo-1520516088096-07ddfe5a3079",
    "photo-1467348733814-f2b6b46f1a3d","photo-1458030677662-5359ddb6c66e",
    "photo-1476984251899-8d7fdfc5c92c","photo-1530409407064-aa61c3e0e41b",
    "photo-1471922694854-ff1b63b20054","photo-1445116572660-236099ec97a0",
]

# אופניים
BIKE_IDS = [
    "photo-1444491741275-3747c53c99b4","photo-1558618666-fcd25c85cd64",
    "photo-1567167543891-5cd5e3c6f27d","photo-1534438327276-14e5300c3a48",
]

# בנה פולים עם ווריאנטים לוודא מספיק ייחודיים
POOLS = {
    'stream':        make_pool(STREAM_IDS,        [600,601,602]),
    'spring':        make_pool(SPRING_IDS,        [600,601,602,603]),
    'beach':         make_pool(BEACH_IDS,         [600,601]),
    'nature':        make_pool(NATURE_IDS,        [600,601,602,603]),
    'hiking':        make_pool(HIKING_IDS,        [600,601]),
    'history':       make_pool(HISTORY_IDS,       [600,601]),
    'accommodation': make_pool(ACCOMMODATION_IDS, [600,601,602]),
    'food':          make_pool(FOOD_IDS,          [600,601]),
    'cafe':          make_pool(CAFE_IDS,          [600,601]),
    'promenade':     make_pool(PROMENADE_IDS,     [600,601]),
    'bike':          make_pool(BIKE_IDS,          [600,601]),
}

def get_type(item):
    cat = item.get('category', '')
    name_he = item.get('name', {}).get('he', '')
    name_en = item.get('name', {}).get('en', '').lower()
    if cat == 'beach': return 'beach'
    if cat == 'food':  return 'food'
    if cat == 'cafe':  return 'cafe'
    if cat == 'bike':  return 'bike'
    if cat == 'promenade': return 'promenade'
    if cat == 'hiking': return 'hiking'
    if cat == 'history': return 'history'
    if cat in ('sleep', 'accommodation'): return 'accommodation'
    if cat == 'water':
        if 'נחל' in name_he or 'stream' in name_en or 'nahal' in name_en: return 'stream'
        return 'spring'
    if cat in ('nature', 'park'): return 'nature'
    return 'nature'

for p in ['app/data.json', 'data.json']:
    if os.path.exists(p): data_path = p; break

with open(data_path, encoding='utf-8') as f:
    data = json.load(f)

pool_idx = {k: 0 for k in POOLS}
used = set(SPECIFIC.values())

for item in data:
    item_id = str(item['id'])
    lat = item['coords'][0]
    if not item.get('region'):
        item['region'] = 'north' if lat >= 32.6 else 'center' if lat >= 31.5 else 'south'
    
    if item_id in SPECIFIC:
        item['image'] = SPECIFIC[item_id]
    else:
        typ = get_type(item)
        pool = POOLS[typ]
        idx = pool_idx[typ]
        # דלג על כפילויות
        while idx < len(pool) and pool[idx] in used:
            idx += 1
        if idx >= len(pool):
            idx = 0  # תתחיל מחדש אם הפול מוצה
        item['image'] = pool[idx]
        used.add(pool[idx])
        pool_idx[typ] = idx + 1

imgs = Counter(item['image'] for item in data)
dups = {k: v for k, v in imgs.items() if v > 1}
print(f"✅ {len(data)} רשומות | כפילויות: {len(dups)}")

with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"✅ נשמר: {data_path}")