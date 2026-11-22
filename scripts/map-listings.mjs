import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Build-time listings execute the map's own merge, profile and eligibility code.
// This keeps unknown candidates, deduplication and future review releases in sync.
export function createMapListings(root) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, 'source/public', file), 'utf8'));
  const values = {parking:read('parking.json'), vehicles:read('vehicle-data.json'), locales:read('locales.json'), dataLocales:read('data-locales.json'), national:read('national-discoveries.json'), osm:read('osm-discoveries.json')};
  const context = vm.createContext({URL, Intl, document:{getElementById:()=>({value:''})}, localStorage:{getItem:()=>null}});
  for(const file of ['visitor-i18n.js','vehicle-categories.js','scooter-screening.js','discovery-listings.js']) vm.runInContext(fs.readFileSync(path.join(root,'source/public',file),'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0], context);
  Object.assign(context,values);
  vm.runInContext('dataset=parking;vehicleData=vehicles;messages=locales;dataMessages=dataLocales;state.places=TomespotDiscoveryListings.mergePlaces(parking.places,[...national.places,...osm.places]);',context);
  return {
    context, ...values,
    places:vm.runInContext('state.places',context),
    listings(vehicle) {context.kind=vehicle; return vm.runInContext('state.vehicle=kind;filtered()',context);},
    profile(place,vehicle) {context.place=place;context.kind=vehicle;return vm.runInContext('state.vehicle=kind;profilePlace(place)',context);},
    detail(place,vehicle) {context.place=place;context.kind=vehicle;return vm.runInContext('state.vehicle=kind;profileDetailHtml(profilePlace(place))',context);}
  };
}
