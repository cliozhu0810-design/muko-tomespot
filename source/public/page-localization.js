/* Static directories and detail pages share the map's translation dictionaries. */
(async()=>{
 const select=document.querySelector('#page-language,#about-language');if(!select)return;
 const [ui,data]=await Promise.all(['/locales.json','/data-locales.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error(url);return r.json();})).catch(()=>[]);if(!ui||!data)return;
 const I=TomespotVisitorI18n,dict={...data};
 for(const row of [...Object.values(data),...Object.values(ui)])if(row.ja)dict[row.ja]=row;
 const add=(ja,cn,tw,en)=>dict[ja]={ja,'zh-Hans':cn,'zh-Hant':tw,en};
 add('地域・駅から駐輪場を探す','按地区或车站查找停车场','依地區或車站尋找停車場','Find parking by area or station');
 add('主な都市・地域','主要城市与地区','主要城市與地區','Cities and areas');add('駅周辺','车站周边','車站周邊','Around stations');add('都道府県から探す','按都道府县查找','依都道府縣尋找','Browse by prefecture');
 add('ほかの地域・駅を探す','查找其他地区或车站','尋找其他地區或車站','Browse other areas and stations');add('車種別に地図で探す','按车型查看地图','依車種查看地圖','Find parking on the map by vehicle type');
 add('施設名・住所','设施名称或地址','設施名稱或地址','Facility name or address');add('すべての車種','所有车型','所有車種','All vehicle types');add('受入未確認も表示','显示是否允许停放尚未确认的候选','顯示是否可停放尚待確認的地點','Include unverified candidates');
 add('受入確認済み','已确认允许停放','已確認可停放','Acceptance confirmed');add('受入未確認','是否允许停放尚未确认','是否可停放尚待確認','Acceptance unverified');add('資料確認日：','资料核对日期：','資料確認日期：','Source checked: ');
 add('地図で確認・コメントする','在地图上查看或留言','在地圖上查看或留言','View on map or leave a comment');add('この車種で地図を開く・コメントする','查看此车型地图或留言','查看此車種地圖或留言','Open map for this vehicle or leave a comment');
 add('未確認候補を含みます。各施設の確認日・受入条件は車種別にご確認ください。','包含待确认候选。请按车型查看各停车场的核对日期与停放条件。','包含待確認地點。請依車種查看各停車場的確認日期及停放條件。','Includes unverified candidates. Check the verification date and vehicle requirements for each facility.');
 add('市中心部の参考点から約4km以内の掲載位置を表示しています。','显示距市中心参考点约4公里内的收录地点，并非整个城市。','顯示距市中心參考點約4公里內的收錄地點，並非整座城市。','Shows listed locations within approximately 4 km of a city-centre reference point, not the entire city.');
 add('地域別の駐輪場一覧','按地区查看停车场','依地區查看停車場','Parking directory by area');add('自転車駐輪場','自行车停车场','自行車停車場','Bicycle parking');add('電動キックボードの駐輪場','自有电动滑板车停车场','自有電動滑板車停車場','Privately owned e-scooter parking');add('バイク・原付の駐輪場','轻便摩托车与摩托车停车场','機車停車場（含日本原付車種）','Moped and motorcycle parking');add('原付・バイクの駐輪場','轻便摩托车与摩托车停车场','機車停車場（含日本原付車種）','Moped and motorcycle parking');
 add('境界データ：','行政边界数据：','行政區界資料：','Boundary data: ');add('（国土交通省・国土数値情報を加工） /','（基于日本国土交通省国土数值信息加工）／','（依日本國土交通省國土數值資訊加工）／',' (adapted from Japan MLIT National Land Numerical Information) /');add('駅名・よみ：','车站名称及读音：','車站名稱及讀音：','Station names and readings: ');
 add('（掲載地域向け抽出・駅名統合・別表記・ローマ字追加、2026-10-21） /','（按收录地区筛选、合并站名并添加别名及罗马字，2026-10-21）／','（依收錄地區篩選、整合站名並新增別名及羅馬字，2026-10-21）／',' (filtered to covered areas; station names merged and aliases/romaji added, 2026-10-21) /');
 add('。駅から約1.2km以内の掲載施設を検索します。車種・お気に入り・最近見た施設（20件まで）はこのブラウザーに保存されます。ブラウザーのデータを削除すると消去され、別の端末とは同期されません。','。搜索范围为车站周边约1.2公里。车型、收藏和最近查看的20处设施保存在当前浏览器中，清除浏览器数据后会丢失，不与其他设备同步。','。搜尋範圍為車站周邊約1.2公里。車種、收藏及最近查看的20處設施儲存在目前瀏覽器中，清除瀏覽器資料後會消失，不會與其他裝置同步。','. Searches listed facilities within about 1.2 km of the station. Vehicle choice, favourites and up to 20 recently viewed facilities are saved in this browser. Clearing browser data removes them; they do not sync across devices.');
 add('駐輪場一覧','停车场列表','停車場清單','Parking directory');add('車種別','车型','車種','Vehicle type');add('表示言語 / Language','显示语言','顯示語言','Display language');
 add('東口・西口・北口の施設を車種別に比較できます。LUUPの返却ポートや旧口コミだけでは私有電動キックボードの受入を確認していません。','可按车型比较东口、西口及北口设施。LUUP还车点或旧评论不能单独证明允许停放自有电动滑板车。','可依車種比較東口、西口及北口設施。LUUP還車站或舊留言不能單獨證明可停放自有電動滑板車。','Compare facilities near the east, west and north exits by vehicle type. LUUP return stations or old reviews alone do not establish acceptance of privately owned e-scooters.');
 add('北口・南口・高架下と民営バイク施設を掲載。みずき通りの原付料金は市と運営者で課金周期が異なり、確定していません。','收录北口、南口、高架桥下及民营摩托车停车设施。水木通原付收费的计费周期在市政府和运营方资料中不一致，尚未确定。','收錄北口、南口、高架橋下及民營機車停車設施。水木通原付收費的計費週期在市政府與營運方資料中不一致，尚待確認。','Includes facilities near the north and south exits, under the railway, and private motorcycle facilities. The city and operator give different billing periods for mopeds on Mizuki Street; the applicable period is unconfirmed.');
 add('東口・西口の時間貸し、月極、年度登録を区別しています。旧西川口自転車駐車場は2026年9月30日閉鎖。','区分东口、西口的计时停车、月租和年度登记。原西川口自行车停车场于2026年9月30日关闭。','區分東口、西口的計時停車、月租及年度登記。原西川口自行車停車場於2026年9月30日關閉。','Hourly, monthly and annual-registration parking near the east and west exits are distinguished. The former Nishi-Kawaguchi bicycle parking facility closed on 30 September 2026.');
 add('川口市の閉鎖案内','川口市关闭公告','川口市關閉公告','Kawaguchi City closure notice');add('（資料確認日：2026-10-21）','（资料核对日期：2026-10-21）','（資料確認日期：2026-10-21）',' (source checked: 2026-10-21)');
 const original=new WeakMap(),attributes=new WeakMap();let language='ja';
 const count=n=>I.pick(language,n+'施設',n+'处',n+'處',n+' locations');
 const vehicleNames={'自転車':ui.bicycleLabel,'電動キックボード':ui.scooterLabel,'原付・バイク':ui.motorcycleLabel};
 function translate(raw){const text=raw.trim();if(!text||language==='ja')return raw;let value=I.translate(text,language,dict),m;
 if(value==null&&(m=text.match(/^(.*?)（(\d+)施設）$/)))value=translate(m[1])+' ('+count(m[2])+')';
 if(value==null&&(m=text.match(/^(\d+)施設$/)))value=count(m[1]);
 if(value==null&&(m=text.match(/^資料確認日：(.*)$/)))value=translate('資料確認日：')+(m[1]==='未確認'?ui.modeUnknown[language]:m[1]);
 if(value==null&&(m=text.match(/^掲載(\d+)施設。受入未確認の候補を含みます。現在の空き状況ではありません。$/)))value=I.pick(language,text,`收录${m[1]}处，包含待确认候选；不代表实时空位。`,`收錄${m[1]}處，包含待確認地點；不代表即時空位。`,`${m[1]} listed locations, including unverified candidates. This is not live availability.`);
 if(value==null&&(m=text.match(/^掲載データ(\d+)施設（受入未確認の候補を含む）。地域全体の施設数ではありません。$/)))value=I.pick(language,text,`收录${m[1]}处，包含待确认候选，并非该地区全部停车场。`,`收錄${m[1]}處，包含待確認地點，並非該地區全部停車場。`,`${m[1]} listed locations, including unverified candidates; not a complete count for the area.`);
 if(value==null&&(m=text.match(/^(.*?)中心部周辺$/)))value=I.pick(language,text,m[1]+'中心周边',m[1]+'市中心周邊','Around central '+I.areaName(m[1],language));
 if(value==null&&(m=text.match(/^(.*?)の(自転車|電動キックボード|原付・バイク)?駐輪場(?:・地域案内)?$/))){const name=translate(m[1]),vehicle=m[2]?vehicleNames[m[2]][language]:'';value=I.pick(language,text,name+'的'+vehicle+'停车场',name+'的'+vehicle+'停車場',`${vehicle||'Vehicle'} parking in ${name}`);}
 if(value==null&&Object.hasOwn(vehicleNames,text))value=vehicleNames[text][language];
 if(value==null&&I.areaName(text,language)!==text)value=I.areaName(text,language);
 return value==null?raw:raw.replace(text,value);
 }
 function run(){observer.disconnect();language=select.value;document.documentElement.lang=language;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){const parent=node.parentElement;if(!parent||parent.closest('script,style,.brand-wordmark,.source-original,[data-about],#page-language,#about-language'))continue;let entry=original.get(node);if(!entry||node.nodeValue!==entry.rendered)entry={raw:node.nodeValue};entry.rendered=translate(entry.raw);if(language!=='ja'&&entry.rendered===entry.raw&&/[ぁ-んァ-ヶ\p{Script=Han}]/u.test(entry.raw)&&parent.closest('.fees,.detail-note,.tariff-row,dd,.research-original')&&!parent.closest('a'))entry.rendered=ui.translationPending[language]+' '+ui.sourceOriginal[language]+': '+entry.raw;if(node.nodeValue!==entry.rendered)node.nodeValue=entry.rendered;original.set(node,entry);}
 for(const el of document.querySelectorAll('[aria-label],[placeholder]')){let row=attributes.get(el)||{};for(const key of ['aria-label','placeholder']){if(!el.hasAttribute(key))continue;let entry=row[key];if(!entry||el.getAttribute(key)!==entry.rendered)entry={raw:el.getAttribute(key)};entry.rendered=translate(entry.raw);el.setAttribute(key,entry.rendered);row[key]=entry;}attributes.set(el,row);}
 const title=document.querySelector('h1');if(title)document.title=title.textContent+' | Tomespot';
 for(const a of document.querySelectorAll('a[href]')){const u=new URL(a.getAttribute('href'),location.href);if(u.origin===location.origin&&!/\.(?:json|txt|svg|pdf)$/.test(u.pathname)){u.searchParams.set('lang',language);a.href=u.href;}}
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 const observer=new MutationObserver(run);
 const requested=new URL(location.href).searchParams.get('lang');if(I.languages.includes(requested))select.value=requested;
 select.addEventListener('change',()=>{try{localStorage.setItem('tomespot:language',select.value);}catch{}const u=new URL(location.href);u.searchParams.set('lang',select.value);history.replaceState(null,'',u);run();});run();
})();
