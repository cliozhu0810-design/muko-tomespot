import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSnapshot} from '../scripts/snapshot.mjs';
test('snapshot allowlist discards private fields and retains original dimensions and billing conditions',()=>{
  const q={admissionStatus:'confirmed',facilityMatched:true,classes:[{scope:'125cc以下・全長190cm以下',tariffs:[{mode:'temporary',amountJPY:200,periodStatus:'unverified'}]}],adminKey:'secret-admin-key',privatePhoto:'private-url',tariffs:[{amountJPY:200,periodStatus:'unverified'}]};
  const assets={'parking.json':JSON.stringify({places:[{id:'p',name:'公開施設',address:'東京都',status:'confirmed',comments:[{email:'secret@example.test'}]}]}),'vehicle-data.json':JSON.stringify({profiles:{p:{motorcycle:q,bicycle:q,privateElectricScooter:q}}}),'vehicle-categories.js':`globalThis.TomespotVehicleCategories={profiles:r=>({...r,moped:r.motorcycle})}`,'station-search.js':'globalThis.TomespotStationSearch={stations:[]}'};
  const d=createSnapshot(assets),text=JSON.stringify(d);assert.ok(!text.includes('secret'));assert.ok(!text.includes('private-url'));
  assert.equal(d.places[0].motorcycleRules.classes[0].scope,'125cc以下・全長190cm以下');assert.equal(d.places[0].profiles.bicycle.tariffs[0].periodStatus,'unverified');
});
test('deployable handler has no privileged database credential or administrator binding',()=>{
  const worker=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  for(const forbidden of ['SUPABASE_SERVICE_ROLE','ADMIN_EMAIL','api/comments','api/photos'])assert.ok(!worker.includes(forbidden));
  const config=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));assert.equal(config.observability.enabled,false);assert.equal(config.vars,undefined);
});
