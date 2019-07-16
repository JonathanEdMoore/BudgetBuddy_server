const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const bcrypt = require('bcryptjs')
const { makeUsersArray, makeMaliciousUser } = require('./users.fixtures')
const { makeAuthHeader } = require('./makeAuthHeader')

describe('Users Endpoints', () => {
  let db

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

  describe(`GET /api/users`, () => {

    context(`Given no users`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/users')
          .expect(200, [])
      })
    })

    context('Given there are users in the database', () => {
      const { testUsers, expectedUsers }  = makeUsersArray()

      beforeEach('insert users', () => {
        return db
          .into('users')
          .insert(testUsers)
      })

      it('responds with 200 and all of the users', () => {
        return supertest(app)
          .get('/api/users')
          .expect(200, expectedUsers)
      })
    })

    context(`Given an XSS attack user`, () => {
      const { maliciousUser, expectedUser } = makeMaliciousUser()

      beforeEach('insert malicious user', () => {
        return db
          .into('users')
          .insert(maliciousUser)
      })

      it(`removes XSS attack content`, () => {
        return supertest(app)
          .get(`/api/users`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].first_name).to.eql(expectedUser.first_name)
            expect(res.body[0].last_name).to.eql(expectedUser.last_name)
            expect(res.body[0].email).to.eql(expectedUser.email)
          })
      })
    })
  })



  describe(`GET /api/users/:user_id`, () => {

    context(`Given no users`, () => {
      it(`responds with 404`, () => {
        const userId = 123456
        return supertest(app)
          .get(`/api/users/${userId}`)
          .expect(401, {
            error: `Missing bearer token` 
          })
      })
    })

    context('Given there are users in the database', () => {
      const { testUsers, expectedUsers } = makeUsersArray()

      beforeEach('insert users', () => {
        return db
          .into('users')
          .insert(testUsers)
      })

      it('responds with 200 and the specified user', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const userId = 2
        const expectedUser = expectedUsers[userId - 1]
        return supertest(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(200, expectedUser)
      })
    })

    context(`Given an XSS attack User`, () => {
      const { testUsers } = makeUsersArray()
      const maliciousUser = {
        id: 911,
        first_name: `Phillip <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
        last_name: `Banks <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
        email: `phillip.banks@gmail.com <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
        user_password: '01010101010'
      }

      beforeEach('insert malicious user', () => {
        return db
          .into('users')
          .insert(testUsers)
          .then(()=> {
            return db
            .into('users')
            .insert(maliciousUser)
          })
      })

      it('removes XSS attack content', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        return supertest(app)
          .get(`/api/users/${maliciousUser.id}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(200)
          .expect(res => {
            expect(res.body.first_name).to.eql(`Phillip <img src="https://url.to.file.which/does-not.exist">`)
            expect(res.body.last_name).to.eql(`Banks <img src="https://url.to.file.which/does-not.exist">`)
            expect(res.body.email).to.eql(`phillip.banks@gmail.com <img src="https://url.to.file.which/does-not.exist">`)
          })
      })
    })
  })



  describe(`POST /api/users`, () => {
      it(`creates a user, responding with 201 and the new user, stores bcrypted password`, () => {
        const newUser = {
          first_name: 'Phillip',
          last_name: 'Banks',
          email: 'phillip.banks@gmail.com',
          user_password: 'Jm62920!'
        }
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            console.log(res.body)
            expect(res.body.first_name).to.eql(newUser.first_name)
            expect(res.body.last_name).to.eql(newUser.last_name)
            expect(res.body.email).to.eql(newUser.email)
            expect(res.body).to.not.have.property('user_password')
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`)
          })
          .expect(res =>
            db
            .from('users')
            .select('*')
            .where({ id: res.body.id })
            .first()
            .then(row => {
              expect(row.first_name).to.eql(newUser.first_name)
              expect(row.last_name).to.eql(newUser.last_name)
              expect(row.email).to.eql(newUser.email)
  
              return bcrypt.compare(newUser.user_password, row.user_password)
            })
            .then(compareMatch => {
              console.log(compareMatch)
              expect(compareMatch).to.be.true
            })
            )   
      })
    

    const requiredFields = ['first_name', 'last_name', 'email', 'user_password']

    requiredFields.forEach(field => {
      const newUser = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@email.com',
        user_password: 'password'
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newUser[field]

        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`
            }
          })
      })
    })

    it(`responds 400 when 'Password must be longer than 7 characters' when given an empty passwrod`, () => {
      const userShortPassword = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@gmail.com',
        user_password: 'Jm620!'
      }
      return supertest(app)
      .post('/api/users')
      .send(userShortPassword)
      .expect(400, {
        error: `Password must be longer than 7 characters`
      })
    })

    it(`responds 400 'Password must be less than 72 characters' when given a long password`, () => {
      const usserLongPassword = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@gmail.com',
        user_password: '*'.repeat(73)
      }
      return supertest(app)
      .post('/api/users')
      .send(usserLongPassword)
      .expect(400, {
        error: `Password must be less than 72 characters`
      })
    })

    it(`responds 400 when password starts with spaces`, () => {
      const userPasswordStartsSpaces = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@gmail.com',
        user_password: '  password'
      }
      return supertest(app)
      .post('/api/users')
      .send(userPasswordStartsSpaces)
      .expect(400, {
        error: `Password must not start or end with empty spaces`
      })
    })

    it(`responds 400 when password ends with spaces`, () => {
      const userPasswordEndsSpaces = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@gmail.com',
        user_password: 'password '
      }
      return supertest(app)
      .post('/api/users')
      .send(userPasswordEndsSpaces)
      .expect(400, {
        error: `Password must not start or end with empty spaces`
      })
    })

    it(`responds 400 when password isn't complex enough`, () => {
      const userPasswordNotComplex = {
        first_name: 'First',
        last_name: 'Last',
        email: 'email@gmail.com',
        user_password: 'password'
      }
      return supertest(app)
      .post('/api/users')
      .send(userPasswordNotComplex)
      .expect(400, {
        error: `Password must contain 1 upper case, lower case, number and special character`
      })
    })

    context('Given users already in the database', () => {
      const { testUsers } = makeUsersArray()
      const testUser = testUsers[0]

      beforeEach('insert users', () => {
        return db
          .into('users')
          .insert(testUsers)
      })

      it(`responds 400 'An account with this email already exists' when email isn't unique`, () => {
        const duplicateEmail = {
          first_name: 'First',
          last_name: 'Last',
          email: testUser.email,
          user_password: 'Jm62920!'
        }
        return supertest(app)
        .post('/api/users')
        .send(duplicateEmail)
        .expect(400, {
          error: `An account with this email already exists`
        })
      })
    })
    

    it('removes XSS attack content from response', () => {
      const { maliciousUser, expectedUser } = makeMaliciousUser()
      return supertest(app)
        .post(`/api/users`)
        .send(maliciousUser)
        .expect(201)
        .expect(res => {
          expect(res.body.first_name).to.eql(expectedUser.first_name)
          expect(res.body.last_name).to.eql(expectedUser.last_name)
          expect(res.body.email).to.eql(expectedUser.email)
        })
    })
  })



  describe(`DELETE /api/users/:user_id`, () => {
    context('Given there are users in the database', () => {
      const { testUsers, expectedUsers } = makeUsersArray()

      beforeEach('insert users', () => {
        return db
          .into('users')
          .insert(testUsers)
      })

      it('responds with 204 and removes the user', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const idToRemove = 2
        const expectedUsersArray = expectedUsers.filter(user => user.id !== idToRemove)
        return supertest(app)
          .delete(`/api/users/${idToRemove}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/users`)
              .expect(expectedUsersArray)
          )
      })
    })

    context('Given no users', () => {
      it(`responds with 404`, () => {
        const userId = 123456
        return supertest(app)
          .delete(`/api/users/${userId}`)
          .expect(401, {
            error: `Missing bearer token` 
          })
      })
    })
  })



  describe(`PATCH /api/users/:user_id`, () => {
    context('Given no users', () => {
      it(`responds with 404`, () => {
        const userId = 123456
        return supertest(app)
          .patch(`/api/users/${userId}`)
          .expect(401, {
            error: `Missing bearer token` 
          })
      })
    })

    context('Given there are users in the database', () => {
      const { testUsers, expectedUsers } = makeUsersArray()

      beforeEach('insert users', () => {
        return db
          .into('users')
          .insert(testUsers)
      })

      it('responds with 204 and updates the user', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const idToUpdate = 2
        const updateUser = {
          first_name: 'Phillip',
          last_name: 'Banks',
          email: 'phillip.banks@gmail.com',
          user_password: '01010101010'
        }
        const expectedUser = {
          id: idToUpdate,
          first_name: 'Phillip',
          last_name: 'Banks',
          email: 'phillip.banks@gmail.com',
        }
        return supertest(app)
        .patch(`/api/users/${idToUpdate}`)
        .send(updateUser)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(204)
        .then(res =>
          supertest(app)
          .get(`/api/users/${idToUpdate}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(expectedUser)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const idToUpdate = 2
        return supertest(app)
        .patch(`/api/users/${idToUpdate}`)
        .send({ irrelevantField: 'foo' })
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(400, {
          error: {
            message: `Request body must contain either 'first_name', 'last_name', 'email', 'user_password'`
          }
        })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const idToUpdate = 2
        const updateUser = {
          email: 'update@gmail.com',
        }
        const expectedUser = {
          ...expectedUsers[idToUpdate - 1],
          ...updateUser
        }

        return supertest(app)
        .patch(`/api/users/${idToUpdate}`)
        .send({
          ...updateUser,
          fieldToIgnore: 'should not be in the GET response'
        })
        .set("Authorization", makeAuthHeader(validCreds))
        .expect(204)
        .then(res => 
          supertest(app)
          .get(`/api/users/${idToUpdate}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(expectedUser))
      })
    })
  })
})