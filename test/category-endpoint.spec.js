const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeCategoriesArray, makeMaliciousCategory } = require('./category.fixtures')

describe('Category Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())
  before('clean the table', () => db.raw('TRUNCATE category RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE category RESTART IDENTITY CASCADE'))

  describe(`GET /api/categories`, () => {
    context('Given no categories', () => {
      it('responds with a 200 and an empty list', () => {
        return supertest(app)
        .get('/api/categories')
        .expect(200, [])
      })
    })

    context('Given there are categories in the database', () => {
      const testCategories = makeCategoriesArray()

      beforeEach('insert categories', () => {
        return db
          .into('category')
          .insert(testCategories)
      })

      it('responds with 200 and all of the categories', () => {
        return supertest(app)
        .get('/api/categories')
        .expect(200, testCategories)
      })
    })
    
    context('Given an XSS attack Category', () => {
      const { maliciousCategory, expectedCategory } = makeMaliciousCategory()

      beforeEach('insert malicious category', () => {
        return db
          .into('category')
          .insert(maliciousCategory)
      })

      it('removes XSS attack content', () => {
        return supertest(app)
        .get('/api/categories')
        .expect(200)
        .expect(res => {
          expect(res.body[0].category).to.eql(expectedCategory.category)
        })
      })
    })
  })



  describe(`POST /api/categories`, () => {
    it('creates a category responding with a 201', () => {
      const newCategory = {
        category: 'Entertainment'
      }
      return supertest(app)
      .post('/api/categories')
      .send(newCategory)
      .expect(res => {
        expect(res.body).to.have.property('id')
        expect(res.body.category).to.eql(newCategory.category)
      })
    })

    const requiredFields = ['category']

      requiredFields.forEach(field => {
        const newCategory = {
          category: 'Category'
        }

        it(`responds with 400 and an error message when the '${field}' is missing`, () => {
          delete newCategory[field]

          return supertest(app)
          .post('/api/categories')
          .send(newCategory)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`
            }
          })
        })

        it('removes XSS attack content from response', () => {
          const { maliciousCategory, expectedCategory } = makeMaliciousCategory()
          return supertest(app)
          .post(`/api/categories`)
          .send(maliciousCategory)
          .expect(201)
          .expect(res => {
            expect(res.body.category).to.eql(expectedCategory.category)
          })
        })
      })
  })



  describe(`DELETE /api/categories/:category_id`, () => {
    context('Given there are no categories in the database', () => {
      it(`responds with 404`, () => {
        const categoryId = 123456
        return supertest(app)
        .delete(`/api/categories/${categoryId}`)
        .expect(404, {
          error: {
            message: `Category doesn't exist`
          }
        })
      })
    })

    context('Given there are categories in the database', () => {
      const testCategories = makeCategoriesArray()

      beforeEach('insert categories', () => {
        return db
        .into('category')
        .insert(testCategories)
      })

      it('responds with 204 and removes the category', () => {
        const idToRemove = 2
        const expectedCategories = testCategories.filter(category => category.id !== idToRemove)
        return supertest(app)
        .delete(`/api/categories/${idToRemove}`)
        .expect(204)
        .then(res => 
          supertest(app)
          .get(`/api/categories`)
          .expect(expectedCategories)
          )
      })
    })
  })
})