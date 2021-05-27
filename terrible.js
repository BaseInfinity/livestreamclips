const puppeteer = require('puppeteer');
const config = require('./config.json');

var clips = [];

(async () => {
   const accountsCookie = { "name": "auth-token",
      "value": config.twitchAuthToken,
      "domain": ".twitch.tv",
      "path": "/",
      "httpOnly": false,
      "secure": true
   };

   const browser = await puppeteer.launch({ 
      headless: true,
      args: [
         '--no-sandbox',
         '--proxy-server="direct://"',
         '--proxy-bypass-list=*',
         '--start-maximized'
      ],
      defaultViewport: null
   }); 

   const page = await browser.newPage();
   await page.setCookie(accountsCookie);
   await page.goto(`https://dashboard.twitch.tv/u/${config.twitchUser}/content/clips`);

   const clipRowSelector = '[data-a-target="clips-manager-table-row-container"]';
   await page.waitForSelector(clipRowSelector);

   const clipElements = await page.$$(clipRowSelector);

   for (let clipElement of clipElements) {
      await clipElement.click();
      await page.waitForTimeout(400);
      const clipLink = await page.$('[aria-label="Popout"]');
      const clipHref = await page.evaluate(anchor => anchor.getAttribute('href'), clipLink);

      console.log(clipHref);
      await page.click('[aria-label="Close"]');
   }

   await browser.close();
})();
