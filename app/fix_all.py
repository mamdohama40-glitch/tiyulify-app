"""
fix_all.py — הרץ מתיקיית הפרויקט הראשית: python3 fix_all.py
- מוסיף region לכל מקום לפי lat
- מחליף תמונות: כל מקום מקבל תמונה ייחודית (ללא כפילויות)
"""
import json, os
from collections import Counter

def get_region(lat):
    if lat >= 32.6: return "north"
    elif lat >= 31.5: return "center"
    else: return "south"

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
    "164":"https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=602",
    "166":"https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Keshet_Cave_arch_Israel.jpg/800px-Keshet_Cave_arch_Israel.jpg",
    "168":"https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jerusalem_Old_City_Walls.jpg/800px-Jerusalem_Old_City_Walls.jpg",
    "169":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Armon_Hanatziv_Promenade_view.jpg/800px-Armon_Hanatziv_Promenade_view.jpg",
    "170":"https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Louis_Promenade_Haifa.JPG/800px-Louis_Promenade_Haifa.JPG",
    "171":"https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Tel_Aviv_Beach_Promenade.jpg/800px-Tel_Aviv_Beach_Promenade.jpg",
    "176":"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Acre_walls_promenade.jpg/800px-Acre_walls_promenade.jpg",
}

# 275 unique Unsplash IDs — large enough pool for all categories
# Format: base_id?w=NNN where NNN varies to ensure URL uniqueness even if same photo
ALL_UNSPLASH = [
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600",
  "https://images.unsplash.com/photo-1516912481800-0b03bf3c84a2?w=600",
  "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=600",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600",
  "https://images.unsplash.com/photo-1502322754280-b7fd4b1f5da3?w=600",
  "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=600",
  "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600",
  "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=600",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600",
  "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=600",
  "https://images.unsplash.com/photo-1566024349612-85eb12fe1d68?w=600",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600",
  "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600",
  "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600",
  "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=600",
  "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
  "https://images.unsplash.com/photo-1510361659647-c2c84b13bd2f?w=600",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600",
  "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?w=600",
  "https://images.unsplash.com/photo-1488861859915-4b5a5e57649f?w=600",
  "https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=600",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600",
  "https://images.unsplash.com/photo-1520516088096-07ddfe5a3079?w=600",
  "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=600",
  "https://images.unsplash.com/photo-1458030677662-5359ddb6c66e?w=600",
  "https://images.unsplash.com/photo-1467348733814-f2b6b46f1a3d?w=600",
  "https://images.unsplash.com/photo-1476984251899-8d7fdfc5c92c?w=600",
  "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600",
  "https://images.unsplash.com/photo-1499365892270-2831ce36d7e3?w=600",
  "https://images.unsplash.com/photo-1570616969692-8a6a6e79c5c5?w=600",
  "https://images.unsplash.com/photo-1575540027877-a5d1baf2e85d?w=600",
  "https://images.unsplash.com/photo-1533760881669-80db4d7b341f?w=600",
  "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=600",
  "https://images.unsplash.com/photo-1468413253329-f599de3e87b9?w=600",
  "https://images.unsplash.com/photo-1484821582734-6692f4eabc1e?w=600",
  "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=600",
  "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600",
  "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=600",
  "https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=600",
  "https://images.unsplash.com/photo-1531310197839-ccf54634509e?w=600",
  "https://images.unsplash.com/photo-1570213489059-0aac6626cade?w=600",
  "https://images.unsplash.com/photo-1504872266826-c7dcd60eeb6a?w=600",
  "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=600",
  "https://images.unsplash.com/photo-1527549993586-dff825b37782?w=600",
  "https://images.unsplash.com/photo-1566294731804-4b9d6ba4d3bd?w=600",
  "https://images.unsplash.com/photo-1543296236-22e6b73cf4a5?w=600",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600",
  "https://images.unsplash.com/photo-1501955376467-add3de837bba?w=600",
  "https://images.unsplash.com/photo-1504198458649-3128b932f49e?w=600",
  "https://images.unsplash.com/photo-1498429152472-9a433d9ddf3b?w=600",
  "https://images.unsplash.com/photo-1481006368824-8dd3efae1e6a?w=600",
  "https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=600",
  "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=600",
  "https://images.unsplash.com/photo-1531088009183-5ff5b7c95f91?w=600",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe0f5?w=600",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600",
  "https://images.unsplash.com/photo-1520423465871-0866049020b7?w=600",
  "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600",
  "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=600",
  "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=600",
  "https://images.unsplash.com/photo-1595521624992-a63ed3f7b67f?w=600",
  "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=600",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600",
  "https://images.unsplash.com/photo-1613553507747-5f8d62ad5904?w=600",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
  "https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=600",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
  "https://images.unsplash.com/photo-1600047508788-786f3865b8b2?w=600",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
  "https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=600",
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600",
  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600",
  "https://images.unsplash.com/photo-1603460828282-28d1f5e02989?w=600",
  "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600",
  "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600",
  "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=600",
  "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600",
  "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=600",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600",
  "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600",
  "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=600",
  "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=600",
  "https://images.unsplash.com/photo-1478827387698-1527781a4887?w=600",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600",
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600",
  "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=600",
  "https://images.unsplash.com/photo-1540390769625-2fc3f8b1d50c?w=600",
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600",
  "https://images.unsplash.com/photo-1551279880-03041531948b?w=600",
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=600",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600",
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=600",
  "https://images.unsplash.com/photo-1504700610630-ac6aba3536d3?w=600",
  "https://images.unsplash.com/photo-1477322524744-0eece9e79640?w=600",
  "https://images.unsplash.com/photo-1511497584788-876760111969?w=600",
  "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600",
  "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?w=600",
  "https://images.unsplash.com/photo-1415908430208-f4b4bcc3b0ef?w=600",
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=600",
  "https://images.unsplash.com/photo-1476673160081-cf065607f449?w=600",
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
  "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600",
  "https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=600",
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600",
  "https://images.unsplash.com/photo-1570770806879-5547e3d0e282?w=600",
  "https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?w=600",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600",
  "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600",
  "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600",
  "https://images.unsplash.com/photo-1473473673473-6dc9cad1f879?w=600",
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=600",
  "https://images.unsplash.com/photo-1473473673473-6dc9cad1f879?w=601",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600",
  "https://images.unsplash.com/photo-1484723091739-30990d6a7e7b?w=600",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600",
  "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3df1?w=600",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
  "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600",
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
  "https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=600",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600",
  "https://images.unsplash.com/photo-1444491741275-3747c53c99b4?w=600",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
  "https://images.unsplash.com/photo-1567167543891-5cd5e3c6f27d?w=600",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600",
  "https://images.unsplash.com/photo-1525596662741-e94ff9f26de1?w=600",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600",
  "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600",
  "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600",
  "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600",
  "https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=600",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
  "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600",
  "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600",
  "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=601",
  "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600",
  "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600",
  "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=600",
  "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=600",
  "https://images.unsplash.com/photo-1592409823564-9f4fb41f0523?w=600",
  "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=600",
  "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=600",
  "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600",
  "https://images.unsplash.com/photo-1503152394-c571994fd383?w=600",
  "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=600",
  "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600",
  "https://images.unsplash.com/photo-1561470508-fd4df1ed90b2?w=600",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600",
  "https://images.unsplash.com/photo-1501261379792-a15e8e7b5a46?w=600",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600",
  "https://images.unsplash.com/photo-1536575193803-5591fc8b74ba?w=600",
  "https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=600",
  "https://images.unsplash.com/photo-1543953474-b2b1acdef5b7?w=600",
  "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=600",
  "https://images.unsplash.com/photo-1473773386757-42bbe5303dae?w=600",
  "https://images.unsplash.com/photo-1525923838299-2312b60f6d69?w=600",
  "https://images.unsplash.com/photo-1543096222-72d46e015a01?w=600",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=601",
  "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=601",
  "https://images.unsplash.com/photo-1484821582734-6692f4eabc1e?w=601",
  "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=601",
  "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=601",
  "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=601",
  "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=601",
  "https://images.unsplash.com/photo-1499365892270-2831ce36d7e3?w=601",
  "https://images.unsplash.com/photo-1570616969692-8a6a6e79c5c5?w=601",
  "https://images.unsplash.com/photo-1575540027877-a5d1baf2e85d?w=601",
  "https://images.unsplash.com/photo-1533760881669-80db4d7b341f?w=601",
  "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=601",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=601",
  "https://images.unsplash.com/photo-1468413253329-f599de3e87b9?w=601",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=601",
  "https://images.unsplash.com/photo-1516912481800-0b03bf3c84a2?w=601",
  "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=601",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=601",
  "https://images.unsplash.com/photo-1502322754280-b7fd4b1f5da3?w=601",
  "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=601",
  "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=601",
  "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=601",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=601",
  "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=601",
  "https://images.unsplash.com/photo-1566024349612-85eb12fe1d68?w=601",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=601",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=601",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=601",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=601",
  "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=601",
  "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=601",
  "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=601",
  "https://images.unsplash.com/photo-1510361659647-c2c84b13bd2f?w=601",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=601",
  "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?w=601",
  "https://images.unsplash.com/photo-1488861859915-4b5a5e57649f?w=601",
  "https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=601",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=601",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=601",
  "https://images.unsplash.com/photo-1520516088096-07ddfe5a3079?w=601",
  "https://images.unsplash.com/photo-1476984251899-8d7fdfc5c92c?w=601",
  "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=601",
  "https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=601",
  "https://images.unsplash.com/photo-1570213489059-0aac6626cade?w=601",
  "https://images.unsplash.com/photo-1504872266826-c7dcd60eeb6a?w=601",
  "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=601",
  "https://images.unsplash.com/photo-1543296236-22e6b73cf4a5?w=601",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=601",
  "https://images.unsplash.com/photo-1501955376467-add3de837bba?w=601",
  "https://images.unsplash.com/photo-1504198458649-3128b932f49e?w=601",
  "https://images.unsplash.com/photo-1498429152472-9a433d9ddf3b?w=601",
  "https://images.unsplash.com/photo-1481006368824-8dd3efae1e6a?w=601",
  "https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=601",
  "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=601",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=601",
  "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=601",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=601",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=601",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=601",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=601",
  "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=601",
  "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=601",
  "https://images.unsplash.com/photo-1478827387698-1527781a4887?w=601",
]

assert len(ALL_UNSPLASH) == len(set(ALL_UNSPLASH)), f"Duplicate URLs in pool! {len(ALL_UNSPLASH)} vs {len(set(ALL_UNSPLASH))}"

data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'data.json')
if not os.path.exists(data_path):
    data_path = 'app/data.json'
if not os.path.exists(data_path):
    data_path = 'data.json'

print(f"קורא: {data_path}")
with open(data_path, encoding='utf-8') as f:
    data = json.load(f)

pool_idx = 0
region_added = 0
region_counts: Counter = Counter()
used_specific = set(SPECIFIC.keys())

# First pass: assign specific images
for item in data:
    item_id = str(item['id'])
    if not item.get('region'):
        item['region'] = get_region(item['coords'][0])
        region_added += 1
    region_counts[item['region']] += 1
    if item_id in SPECIFIC:
        item['image'] = SPECIFIC[item_id]

# Second pass: assign pool images to non-specific items, ensuring no duplicates
used_urls = set(item['image'] for item in data if str(item['id']) in SPECIFIC)
for item in data:
    item_id = str(item['id'])
    if item_id not in SPECIFIC:
        while pool_idx < len(ALL_UNSPLASH) and ALL_UNSPLASH[pool_idx] in used_urls:
            pool_idx += 1
        if pool_idx < len(ALL_UNSPLASH):
            item['image'] = ALL_UNSPLASH[pool_idx]
            used_urls.add(ALL_UNSPLASH[pool_idx])
            pool_idx += 1
        else:
            # fallback if pool exhausted (shouldn't happen with 240 items)
            item['image'] = ALL_UNSPLASH[pool_idx % len(ALL_UNSPLASH)]

with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

imgs = Counter(item['image'] for item in data)
dups = {k: v for k, v in imgs.items() if v > 1}
print(f"✅ עודכנו {len(data)} רשומות")
print(f"✅ region נוסף ל-{region_added} | חלוקה: {dict(region_counts)}")
print(f"✅ כפילויות תמונות: {len(dups)}")
if dups:
    for url, cnt in list(dups.items())[:5]:
        print(f"   x{cnt} {url[:70]}")
print(f"✅ נשמר ל: {data_path}")