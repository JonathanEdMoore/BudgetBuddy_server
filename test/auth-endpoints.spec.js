const knex = require('knex')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const bcrypt = require('bcryptjs')
const { JWT_SECRET } = require('../src/config')
const { makeUsersArray } = require('./users.fixtures')

describe('Auth Endpoints', function(){
  let db

  const { testUsers } = makeUsersArray()
  const testUser = testUsers[0]
  const mappedUsers = testUsers.map(testUser =>({...testUser, user_password: bcrypt.hashSync(testUser.user_password, 1)}) )

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL, 
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db.raw('TRUNCATE users RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE users RESTART IDENTITY CASCADE'))

  describe(`POST /api/auth/login`, () => {
    beforeEach('insert users', () => {
      return db
      .into('users')
      .insert(mappedUsers)
    })

    const requiredFields = ['email', 'user_password']

    requiredFields.forEach(field => {
      const loginAttemptBody = {
        email: testUser.email,
        user_password: testUser.user_password,
      }

      it(`responds with 400 required error when '${field}' is missing`, () => {
        delete loginAttemptBody[field]

        return supertest(app)
        .post('/api/auth/login')
        .send(loginAttemptBody)
        .expect(400, {
          error: `Missing '${field}' in request body`
        })
      })
    })

    it(`responds 400 'invalid email or user_password' when bad email`, () => {
      const userInvalidEmail = { email: 'email-not', user_password: 'exists' }
      return supertest(app)
      .post('/api/auth/login')
      .send(userInvalidEmail)
      .expect(400, { error: `Incorrect email or password` })
    })

    it(`responds 400 'invalid email or user_password' when bad user_password`, () => {
      const userInvalidPass = { email: testUser.email, user_password: 'incorrect'}
      return supertest(app)
      .post('/api/auth/login')
      .send(userInvalidPass)
      .expect(400, { error: `Incorrect email or password` })
    })

    it(`responds 200 and JWT auth token using secret when valid credentials`, () => {
      const userValidCreds = {
        email: testUser.email,
        user_password: testUser.user_password,
      }
      const expectedToken = jwt.sign(
        { user_id: testUser.id },
        JWT_SECRET,
        {
          subject: testUser.email,
          algorithm: 'HS256',
        }
      )
      console.log(expectedToken)
      return supertest(app)
      .post('/api/auth/login')
      .send(userValidCreds)
      .expect(200, {
        authToken: expectedToken,
        user_id: testUser.id
      })
    })
  })
})