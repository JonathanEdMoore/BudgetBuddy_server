# BudgetBuddy Server

## Tech Stack 

  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "date-fns": "^1.30.1",
    "dotenv": "^8.0.0",
    "express": "^4.17.1",
    "helmet": "^3.18.0",
    "jsonwebtoken": "^8.5.1",
    "knex": "^0.19.0",
    "lodash": "^4.17.14",
    "morgan": "^1.9.1",
    "pg": "^7.11.0",
    "xss": "^1.0.6"
  },
  "devDependencies": {
    "chai": "^4.2.0",
    "mocha": "^6.1.4",
    "nodemon": "^1.19.1",
    "postgrator-cli": "^3.1.0",
    "supertest": "^4.0.2"
  }

This app is written using Node.js and Express.

Authentiation and user endpoints relies on jsonwebtoken and bcryptjs--with sanitization being handled by xss. 

The database is written with the assitance of postgresql. 

Testing frameworks used are; mocha, chai, and supertest. 

# Express Boilerplate!

This is a boilerplate project used for starting new projects!

## Set up

Complete the following steps to start a new project (NEW-PROJECT-NAME):

1. Clone this repository to your local machine `git clone BOILERPLATE-URL NEW-PROJECTS-NAME`
2. `cd` into the cloned repository
3. Make a fresh start of the git history for this project with `rm -rf .git && git init`
4. Install the node dependencies `npm install`
5. Move the example Environment file to `.env` that will be ignored by git and read by the express server `mv example.env .env`
6. Edit the contents of the `package.json` to use NEW-PROJECT-NAME instead of `"name": "express-boilerplate",`

## Scripts

Start the application `npm start`

Start nodemon for the application `npm run dev`

Run the tests `npm test`

## Deploying

When your new project is ready for deployment, add a new Heroku application with `heroku create`. This will make a new git remote called "heroku" and you can then `npm run deploy` which will push to this remote's master branch.