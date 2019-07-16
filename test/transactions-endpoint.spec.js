const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeUsersArray } = require('./users.fixtures')
const { makeCategoriesArray } = require('./category.fixtures')
const { makeTransactionsArray, makeMaliciousTransaction } = require('./transactions.fixtures')
const { makeAuthHeader } = require('./makeAuthHeader')

describe('Transactions Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())
  before('clean the table', () => db.raw('TRUNCATE users, category, transactions RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE users, category, transactions RESTART IDENTITY CASCADE'))


  describe(`GET /api/transactions/user/:user_id`, () => {
  
    context(`Given no authorization`, () => {
      const testTransactions = makeTransactionsArray()
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()

      beforeEach('insert transactions', () => {
        return db
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
          .then(() => {
            return db
            .into('transactions')
            .insert(testTransactions)
          })
        })
      })

      it(`responds 401 'Missing bearer token' when no bearer token`, () => {
        const userId = 1
        return supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .expect(401, {
          error:'Missing bearer token'
        })
      })

      it(`responds 401 'Unauthorized request' when invalid JWT secret`, () => {
        const validUser = testUsers[0]
        const invalidSecret = 'bad-secret'
        const userId = 1
        return supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .set('Authorization', makeAuthHeader(validUser, invalidSecret))
        .expect(401, {
          error: 'Unauthorized request'
        })
      })

      it(`responds 401 'Unauthorized request' when invalid sub in payload`, () => {
        const invalidUser = { email: 'user-not@email.com', id: 1 }
        const userId = 1
        return supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .set('Authorization', makeAuthHeader(invalidUser))
        .expect(401, {
          error: 'Unauthorized request'
        })
      })
    })

    context(`Given no transactions`, () => {
      const { testUsers } = makeUsersArray()
      beforeEach('insert users', () => {
        return db
        .into('users')
        .insert(testUsers)
      })

      it(`responds with 200 and an empty list`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const userId = 1
        return supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(200, [])
      })
    })

    context(`Given there are transactions in the database`, () => {
      const testTransactions = makeTransactionsArray()
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()

      beforeEach('insert transactions', () => {
        return db
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
          .then(() => {
            return db
            .into('transactions')
            .insert(testTransactions)
          })
        })
      })

      it('responds with 200 and all of the transactions for a user', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const userId = 1
        const filteredTestTransactions = testTransactions.filter(transaction => transaction.user_id === userId)
        return supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(200, filteredTestTransactions)
      })
    })

    context(`Given an XSS attack transaction`, () => {
      const { maliciousTransaction, expectedTransaction } = makeMaliciousTransaction()
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()

      beforeEach('insert malicious transaction', () => {
        return db 
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
          .then(() => {
            return db
            .into('transactions')
            .insert(maliciousTransaction)
          })
        })
      })

      it(`removes XSS attack content`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const userId = 1
        supertest(app)
        .get(`/api/transactions/user/${userId}`)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(200)
        .expect(res => {
          expect(res.body[0].title).to.eql(expectedTransaction.title)
        })
      })
    })
  })



  describe(`GET /api/transactions/:transaction_id`, () => {

    context(`Given no transactions`, () => {
      const { testUsers } = makeUsersArray()
      beforeEach('insert users', () => {
        return db
        .into('users')
        .insert(testUsers)
      })

      it(`responds with 404`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const transactionId = 123456
        return supertest(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(404, {
          error: {
            message: `Transaction doesn't exist`
          }
        })
      })
    })

    context('Given there are transactions in the database', () => {
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()
      const testTransactions = makeTransactionsArray()

      beforeEach('insert transactions', () => {
        return db
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
          .then(() => {
            return db
            .into('transactions')
            .insert(testTransactions)
          })
        })
      })

      it('responds with 200 and the specified transaction', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const transactionId = 2
        const expectedTransaction = testTransactions[transactionId - 1]
        return supertest(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(200, expectedTransaction)
      })
    })

    context(`Given an XSS attack Transaction`, () => {
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()
      const maliciousTransaction = {
        id : 911,
        date_added: '2019-07-03T19:26:38.918Z',
        title: `Some food <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
        amount: 10.00,
        user_id: 1,
        category: 2
      }

      beforeEach('insert malicious transaction', () => {
        return db
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
          .then(() => {
            return db
            .into('transactions')
            .insert(maliciousTransaction)
          })
        })
      })

      it('removes XSS attack content', () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        return supertest(app)
        .get(`/api/transactions/${maliciousTransaction.id}`)
        .set(`Authorization`, makeAuthHeader(validCreds))
        .expect(200)
        .expect(res => {
          expect(res.body.title).to.eql(`Some food <img src="https://url.to.file.which/does-not.exist">`)
          })
        })
      })
    })



    describe(`POST /api/transactions/user/:user_id`, () => {
      const { testUsers } = makeUsersArray()
      const testCategories = makeCategoriesArray()

      beforeEach('insert users and categories', () => {
        return db
        .into('users')
        .insert(testUsers)
        .then(() => {
          return db
          .into('category')
          .insert(testCategories)
        })
      })

      it(`creates a transaction, responding with 201 and the new transaction`, () => {
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const newTransaction = {
          title: 'New Transaction',
          amount: 5.00,
          user_id: 1,
          category: 1
        }
        return supertest(app)
        .post(`/api/transactions/user/${newTransaction.user_id}`)
        .send(newTransaction)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newTransaction.title)
          expect(res.body.amount).to.eql(newTransaction.amount)
          expect(res.body.user_id).to.eql(newTransaction.user_id)
          expect(res.body.category).to.eql(newTransaction.category)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/transactions/${res.body.id}`)
        })
        .then(postRes =>
          supertest(app)
          .get(`/api/transactions/${postRes.body.id}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(postRes.body)
          )
      })

      const requiredFields = ['title', 'amount', 'user_id', 'category']

      requiredFields.forEach(field => {
        const newTransaction = {
          title: 'New transaction',
          amount: 5.00,
          user_id: 1,
          category: 1
        }

        it(`responds with 400 and an error message when the '${field}' is missing`, () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          delete newTransaction[field]
          const userId = 1

          return supertest(app)
          .post(`/api/transactions/user/${userId}`)
          .send(newTransaction)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`
            }
          })
        })
      })
      
      it('removes XSS attack content', () => {
        const { maliciousTransaction, expectedTransaction } = makeMaliciousTransaction()
        const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
        const userId = 1
        return supertest(app)
        .post(`/api/transactions/user/${userId}`)
        .send(maliciousTransaction)
        .set('Authorization', makeAuthHeader(validCreds))
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedTransaction.title)
        })
      })
    })



    describe(`DELETE /api/transactions/:transaction_id`, () => {
      context('Given no transactions', () => {
        const { testUsers } = makeUsersArray()
        beforeEach('insert users', () => {
          return db
          .into('users')
          .insert(testUsers)
        })

        it(`responds with 404`, () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const transactionId = 123456
          return supertest(app)
          .delete(`/api/transactions/${transactionId}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(404, {
            error: {
              message: `Transaction doesn't exist`
            }
          })
        })
      })

      context('Given there are transactions in the database', () => {
        const { testUsers } = makeUsersArray()
        const testCategories = makeCategoriesArray()
        const testTransactions = makeTransactionsArray()

        beforeEach('insert transactions', () => {
          return db
          .into('users')
          .insert(testUsers)
          .then(() => {
            return db
            .into('category')
            .insert(testCategories)
            .then(() => {
              return db
              .into('transactions')
              .insert(testTransactions)
            })
          })
        })

        it('responds with 204 and removes the transaction', () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const idToRemove = 2
          const expectedTransactions = testTransactions.filter(transaction => transaction.id !== idToRemove)
          return supertest(app)
          .delete(`/api/transactions/${idToRemove}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(204)
          .then(res => 
            supertest(app)
            .get(`/api/transactions`)
            .set('Authorization', makeAuthHeader(validCreds))
            .expect(expectedTransactions))
        })
      })
    })



    describe(`PATCH /api/transactions/:transaction_id`, () => {
      context('Given no transactions', () => {
        const { testUsers } = makeUsersArray()
        beforeEach('insert users', () => {
          return db
          .into('users')
          .insert(testUsers)
        })

        it(`responds with 404`, () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const transactionId = 123456
          return supertest(app)
          .patch(`/api/transactions/${transactionId}`)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(404, {
            error: {
              message: `Transaction doesn't exist`
            }
          })
        })
      })

      context('Given there are transactions in the database', () => {
        const { testUsers } = makeUsersArray()
        const testCategories = makeCategoriesArray()
        const testTransactions = makeTransactionsArray()

        beforeEach('insert transactions', () => {
          return db
          .into('users')
          .insert(testUsers)
          .then(() => {
            return db
            .into('category')
            .insert(testCategories)
            .then(() => {
              return db
              .into('transactions')
              .insert(testTransactions)
            })
          })
        })

        it('responds with 204 and updates the transaction', () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const idToUpdate = 2
          const updateTransaction = {
            title: 'New Transaction',
            amount: 5.00,
            user_id: 1,
            category: 1
          }
          const expectedTransaction = {
            ...testTransactions[idToUpdate - 1],
            ...updateTransaction
          }
          return supertest(app)
          .patch(`/api/transactions/${idToUpdate}`)
          .send(updateTransaction)
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(204)
          .then(res => 
            supertest(app)
            .get(`/api/transactions/${idToUpdate}`)
            .set('Authorization', makeAuthHeader(validCreds))
            .expect(expectedTransaction))
        })

        it(`responds with 400 when no required fields supplied`, () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const idToUpdate = 2
          return supertest(app)
          .patch(`/api/transactions/${idToUpdate}`)
          .send({ irrelevantField: 'foo'})
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'amount', 'user_id', 'category'`
            }
          })
        })

        it(`responds with 204 when updating only a subset of fields`, () => {
          const validCreds = { email: testUsers[0].email, user_password: testUsers[0].user_password}
          const idToUpdate = 2
          const updateTransaction = {
            amount: 25.00,
          }
          const expectedTransaction = {
            ...testTransactions[idToUpdate - 1],
            ...updateTransaction
          }

          return supertest(app)
          .patch(`/api/transactions/${idToUpdate}`)
          .send({
            ...updateTransaction,
            fieldToIgnore: 'should not be in the GET response'
          })
          .set('Authorization', makeAuthHeader(validCreds))
          .expect(204)
          .then(res => 
            supertest(app)
            .get(`/api/transactions/${idToUpdate}`)
            .set('Authorization', makeAuthHeader(validCreds))
            .expect(expectedTransaction))
        })
      })
    })
  })
