import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.HRIS_PLAYWRIGHT_MODULE || 'playwright-core');
const browser=await chromium.launch({executablePath:process.env.HRIS_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 const page=await browser.newPage({deviceScaleFactor:2});
 const dir=path.resolve('docs/system-analysis/diagrams');
 for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.svg'))){
  await page.goto(pathToFileURL(path.join(dir,name)).href);
  const box=await page.locator('svg').boundingBox();
  await page.setViewportSize({width:Math.ceil(box.width+30),height:Math.ceil(box.height+30)});
  await page.locator('svg').screenshot({path:path.join(dir,name.replace('.svg','.png'))});
 }
} finally {await browser.close();}
