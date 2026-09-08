import { chromium } from 'playwright';
const OUT='/tmp/claude-0/-home-user-virtus/f933e69e-581f-51c0-a0cf-25453c987ee2/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE ERROR:', m.text().slice(0,200)); });
p.on('pageerror', e => console.log('PAGE ERROR:', String(e).slice(0,200)));
await p.goto('http://localhost:3271/admin', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Broadcast' }).click();
await p.waitForTimeout(300);
await p.locator('textarea').first().fill('Trial run — do not enter confidential data.');
await p.getByRole('button', { name: 'Hidden' }).click();      // turn it on
await p.getByRole('button', { name: 'Save', exact: true }).click();
await p.waitForTimeout(800);
console.log('after save, banner present:', await p.getByRole('status').count());
await p.screenshot({ path: `${OUT}/b1.png`, clip:{x:0,y:0,width:1280,height:420} });
// what is in the db?
console.log('db row:', JSON.stringify(await p.evaluate(async () => {
  const req = indexedDB.open('virtus');
  const dbh = await new Promise(r => { req.onsuccess = () => r(req.result); });
  const tx = dbh.transaction('settings', 'readonly');
  const g = tx.objectStore('settings').get('settings');
  return await new Promise(r => { g.onsuccess = () => r(g.result ?? null); });
})));
await p.getByRole('button', { name: 'Templates' }).click();
await p.waitForTimeout(300);
console.log('after tab change, banner present:', await p.getByRole('status').count());
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(600);
console.log('after reload, banner present:', await p.getByRole('status').count());
await p.screenshot({ path: `${OUT}/b2.png`, clip:{x:0,y:0,width:1280,height:420} });
await b.close();
