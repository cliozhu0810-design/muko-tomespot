/* Shared, conservative presentation translations. Never infer admission or fees. */
(function(root){'use strict';
const languages=['ja','zh-Hans','zh-Hant','en'];
const pick=(lang,ja,cn,tw,en)=>[ja,cn,tw,en][Math.max(0,languages.indexOf(lang))];
const names={};
const prefectures='北海道:Hokkaido 青森県:Aomori 岩手県:Iwate 宮城県:Miyagi 秋田県:Akita 山形県:Yamagata 福島県:Fukushima 茨城県:Ibaraki 栃木県:Tochigi 群馬県:Gunma 埼玉県:Saitama 千葉県:Chiba 東京都:Tokyo 神奈川県:Kanagawa 新潟県:Niigata 富山県:Toyama 石川県:Ishikawa 福井県:Fukui 山梨県:Yamanashi 長野県:Nagano 岐阜県:Gifu 静岡県:Shizuoka 愛知県:Aichi 三重県:Mie 滋賀県:Shiga 京都府:Kyoto 大阪府:Osaka 兵庫県:Hyogo 奈良県:Nara 和歌山県:Wakayama 鳥取県:Tottori 島根県:Shimane 岡山県:Okayama 広島県:Hiroshima 山口県:Yamaguchi 徳島県:Tokushima 香川県:Kagawa 愛媛県:Ehime 高知県:Kochi 福岡県:Fukuoka 佐賀県:Saga 長崎県:Nagasaki 熊本県:Kumamoto 大分県:Oita 宮崎県:Miyazaki 鹿児島県:Kagoshima 沖縄県:Okinawa';
for(const item of prefectures.split(' ')){const [ja,en]=item.split(':');names[ja]=en;}
for(const item of '千代田区:Chiyoda 中央区:Chuo 港区:Minato 新宿区:Shinjuku 文京区:Bunkyo 台東区:Taito 墨田区:Sumida 江東区:Koto 品川区:Shinagawa 目黒区:Meguro 大田区:Ota 世田谷区:Setagaya 渋谷区:Shibuya 中野区:Nakano 杉並区:Suginami 豊島区:Toshima 北区:Kita 荒川区:Arakawa 板橋区:Itabashi 練馬区:Nerima 足立区:Adachi 葛飾区:Katsushika 江戸川区:Edogawa 八王子市:Hachioji 立川市:Tachikawa 武蔵野市:Musashino 三鷹市:Mitaka 青梅市:Ome 府中市:Fuchu 昭島市:Akishima 調布市:Chofu 町田市:Machida 小金井市:Koganei 小平市:Kodaira 日野市:Hino 東村山市:Higashimurayama 国分寺市:Kokubunji 国立市:Kunitachi 福生市:Fussa 狛江市:Komae 東大和市:Higashiyamato 清瀬市:Kiyose 東久留米市:Higashikurume 武蔵村山市:Musashimurayama 多摩市:Tama 稲城市:Inagi 羽村市:Hamura あきる野市:Akiruno 西東京市:Nishitokyo 瑞穂町:Mizuho 奥多摩町:Okutama 川口市:Kawaguchi 所沢市:Tokorozawa 大宮区:Omiya 浦和区:Urawa さいたま市:Saitama 千葉市:Chiba 船橋市:Funabashi 松戸市:Matsudo 横浜市:Yokohama 神奈川区:Kanagawa 西区:Nishi 藤沢市:Fujisawa 相模原市:Sagamihara 緑区:Midori 大阪市:Osaka 京都市:Kyoto 奈良市:Nara 神戸市:Kobe 名古屋市:Nagoya 札幌市:Sapporo 仙台市:Sendai 広島市:Hiroshima 福岡市:Fukuoka 北九州市:Kitakyushu 新潟市:Niigata 熊本市:Kumamoto 那覇市:Naha 川崎市:Kawasaki 越谷市:Koshigaya 久喜市:Kuki 春日部市:Kasukabe 上尾市:Ageo 白岡市:Shiraoka 蓮田市:Hasuda 印西市:Inzai 鎌ケ谷市:Kamagaya 習志野市:Narashino 成田市:Narita 柏市:Kashiwa 木更津市:Kisarazu 野田市:Noda 武蔵境駅:Musashisakai 池袋駅:Ikebukuro 西川口駅:Nishi-Kawaguchi'.split(' ')){const [ja,en]=item.split(':');names[ja]=en+(ja.endsWith('駅')?' Station':ja.endsWith('区')?' Ward':ja.endsWith('市')?' City':' Town');}
const normalizeArea=s=>String(s||'').replaceAll('鎌ヶ谷','鎌ケ谷');
function areaName(raw,lang){const s=normalizeArea(raw);if(lang!=='en')return s;let rest=s,out=[];while(rest){const k=Object.keys(names).sort((a,b)=>b.length-a.length).find(n=>rest.startsWith(n));if(!k)return s;out.push(names[k]);rest=rest.slice(k.length);}return out.join(', ');}
function stationName(s,lang){return lang==='en'&&s.romaji?s.romaji.replace(/(^|[ -])\w/g,c=>c.toUpperCase())+' Station（'+s.name+'駅）':s.name+(lang==='ja'?'駅':'站');}
function numericText(raw,lang){
 const s=String(raw).normalize('NFKC').trim();let m;
 // Only translate complete, explicitly understood patterns, preserving periods and caps.
 if((m=s.match(/^(\d+(?:\.\d+)?)時間$/)))return pick(lang,raw,m[1]+'小时',m[1]+'小時',m[1]+' hours');
 if((m=s.match(/^(\d+)分$/)))return pick(lang,raw,m[1]+'分钟',m[1]+'分鐘',m[1]+' minutes');
 if((m=s.match(/^(\d+)か月$/)))return pick(lang,raw,m[1]+'个月',m[1]+'個月',m[1]+' months');
 if((m=s.match(/^(\d+)時間(?:ごと)?([\d,]+)円[。.]?$/)))return pick(lang,raw,`每${m[1]}小时${m[2]}日元`, `每${m[1]}小時${m[2]}日圓`,`¥${m[2]} per ${m[1]} hours`);
 if((m=s.match(/^最初(?:の)?(\d+)時間(?:は)?無料、以降(\d+)時間ごと(?:に)?([\d,]+)円[。.]?$/)))return pick(lang,raw,`前${m[1]}小时免费，此后每${m[2]}小时${m[3]}日元。`,`前${m[1]}小時免費，之後每${m[2]}小時${m[3]}日圓。`,`First ${m[1]} hours free; ¥${m[3]} per ${m[2]} hours thereafter.`);
 if((m=s.match(/^一時利用[：:]自転車のみ[。 ]*\s*(.+)$/))){const fee=numericText(m[1],lang);if(fee)return pick(lang,raw,'临时停车，仅限自行车。'+fee,'臨時停車，僅限自行車。'+fee,'Short stay, bicycles only. '+fee);}
 if((m=s.match(/^最初(?:の)?(\d+)時間(?:は)?無料[。、]以降(\d+)時間(?:ごと)?(?:に)?([\d,]+)円(?:[（(]税込[）)])?[。.]?$/)))return pick(lang,raw,`前${m[1]}小时免费，此后每${m[2]}小时${m[3]}日元${/税込/.test(s)?'（含税）':''}。`,`前${m[1]}小時免費，之後每${m[2]}小時${m[3]}日圓${/税込/.test(s)?'（含稅）':''}。`,`First ${m[1]} hours free; ¥${m[3]} per ${m[2]} hours thereafter${/税込/.test(s)?' (tax included)':''}.`);
 if((m=s.match(/^(\d+)cc以下$/)))return pick(lang,raw,`${m[1]}cc及以下`,`${m[1]}cc以下（含）`,`${m[1]}cc or less`);
 if((m=s.match(/^(\d+)cc超$/)))return pick(lang,raw,`超过${m[1]}cc`,`超過${m[1]}cc`,`Over ${m[1]}cc`);
 return null;
}
function translate(raw,lang,dictionary){if(lang==='ja')return dictionary?.[raw]?.ja||raw;const value=dictionary?.[raw]?.[lang];return value||numericText(raw,lang);}
root.TomespotVisitorI18n={languages,pick,areaName,normalizeArea,stationName,numericText,translate};
})(globalThis);
