/* Unverified discovery records expose one external destination, never admission claims. */
(function(root){
 function googleUrl(place){try{const u=new URL(place.googleMapsUrl||'');return u.protocol==='https:'&&['www.google.com','google.com','www.google.co.jp','google.co.jp'].includes(u.hostname)&&u.pathname.startsWith('/maps/')?u.href:null;}catch{return null;}}
 function destination(place){if(place.osmUrl){try{const u=new URL(place.osmUrl);return u.protocol==='https:'&&u.hostname==='www.openstreetmap.org'&&/^\/(node|way|relation)\/\d+$/.test(u.pathname)?u.href:null;}catch{return null;}}return googleUrl(place);}
 function profile(place,vehicle){return {admissionStatus:'unknown',temporaryStatus:'unverified',regularStatus:'unverified',classesRaw:[],tariffs:[],sources:[],discoveryOnly:true,discoveryCategoryRelevant:(place.discoveryVehicleHints||[]).some(h=>h===vehicle||vehicle==='motorcycle'&&h==='moped'),checked:place.discoveredOn||''};}
 function mergePlaces(existing,additional){const ids=new Set(existing.map(p=>p.id));return [...existing,...additional.filter(p=>{if(ids.has(p.id))return false;ids.add(p.id);return true;})];}
 root.TomespotDiscoveryListings={googleUrl,destination,profile,mergePlaces};
})(globalThis);
