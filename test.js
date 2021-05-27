const config = require('./config.json');

const https = require('https');
const cron = require('node-cron');
const Reddit = require('reddit');

const { ClientCredentialsAuthProvider } = require('twitch-auth');
const { ApiClient } = require('twitch');

const clientId = config.twitchClientId;
const clientSecret = config.twitchSecret;

const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
const twitchApi = new ApiClient({ authProvider });

const data = JSON.stringify([
   {
      "operationName": "ClipsManagerTable_User",
      "variables": {
         "login": config.twitchUser,
         "limit": 20,
         "criteria": {
            "sort": "CREATED_AT_DESC",
            "period": "ALL_TIME",
            "curatorID": "57754924"
         }
      },
      "extensions": {
         "persistedQuery": {
            "version": 1,
            "sha256Hash": "604a53d7404bda99ce534bff450d46140354d1b4716b8cf81be372689928c1a0"
         }
      }
   }
]);

const options = {
   hostname: 'gql.twitch.tv',
   port: 443,
   path: '/gql',
   method: 'POST',
   headers: {
      'Authorization': `OAuth ${config.twitchAuthToken}`,
      'Client-Id': config.twitchBrowserClientId,
      'Host': 'gql.twitch.tv',
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Accept': 'application/json'
   }
}

cron.schedule('* * * * *', () => {
   const req = https.request(options, res => {
      var json = '';

      res.on('data', function (chunk) {
         json += chunk;
      });

      res.on('end', function () {
         if (res.statusCode === 200) {
            var data = JSON.parse(json);

            handleClips(data[0].data.user.clips.edges);
         } else {
            console.log('Status:', res.statusCode);
         }
      });

      console.log(`statusCode: ${res.statusCode}`)
   })

   req.on('error', error => {
      console.error(error)
   })

   req.write(data)
   req.end()
});

const reddit = new Reddit({
   username: config.redditUsername,
   password: config.redditPassword,
   appId: config.redditAppId,
   appSecret: config.redditSecret,
   userAgent: config.redditUserAgent
});

async function handleClips(clips) {
   let currentTime = new Date().getTime();
   let newClips = clips.filter(clip => 
      clip.node.video && 
      ((currentTime - new Date(clip.node.createdAt).getTime()) <= 60000 * 3)
   );

   for (let clip of newClips) {
      const stream = await twitchApi.helix.streams.getStreamByUserId(clip.node.broadcaster.id);

      if (stream && (stream.title !== clip.node.title)) {
         console.log(clip.node.title);
         console.log("\n");

         try {
            const res = await reddit.post('/api/submit', {
               sr: config.subreddit,
               kind: 'link',
               resubmit: false,
               title: clip.node.title,
               url: clip.node.url
            });
            console.log(res);
         } catch (error) {
            if (error.code !== 'ALREADY_SUB') {
               console.log(error);
            }
         }

      }
      
   }
}
