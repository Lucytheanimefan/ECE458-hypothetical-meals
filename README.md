# ECE458-hypothetical-meals

## Setup
Requirements:
node version >= 7.6
mongodb (locally, or one in the cloud)

### Local setup
1. Download the code
2. Run `npm install` in the root directory.
3. Create a file `env.json` in the root directory. It should look like the following (but with your own relevant values):
```
{
    "development": {
        "MONGO_URI": "mongodb://127.0.0.1:27017/",
        "MONGO_OPTIONS": { "db": { "safe": true } }
    },
    "production": {
        "MONGO_URI": "<PRODUCTION MONGODB URI HERE>",
        "MONGO_OPTIONS": { "db": { "safe": true } }
    },
    "email": "<EMAIL HERE>",
    "password":"<PASSWORD HERE>"
}
```
3. Run `node setup.js` to create your default admin user
4. Run `npm start` to start the app locally

### Deployment
We used heroku to deploy. Heroku comes with a [free mongodb add-on](https://devcenter.heroku.com/articles/mongolab) called mLab that you will need. Additionally, set the environment variables under the Settings tab, where the Config Variables are located. You will need to set the EMAIL and PASSWORD environment variables. The MONGODB_URI should have already been set when you added the mlab add on.  

To actually deploy to heroku, you will need a heroku account and the heroku command line tools. There is already a good [tutorial](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction) on heroku.  
Because heroku also uses git for version control, you can simply push to your heroku remote in order to deploy (ie. `git push heroku master` )
