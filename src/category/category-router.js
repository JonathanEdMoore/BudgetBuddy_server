const path = require('path')
const express = require('express')
const xss = require('xss')
const CategoryService = require('./category-service')
const { requireAuth } = require('../middleware/jwt_auth')

const categoryRouter = express.Router()
const jsonParser = express.json()

const serializeCategory = category => ({
  id: category.id,
  category: xss(category.category)
})

categoryRouter
.route('/')
.get((req, res, next) => {
  const knexInstance = req.app.get('db')
  CategoryService.getAllCategories(knexInstance)
  .then(categories => {
    res.json(categories.map(serializeCategory))
  })
})
.post(jsonParser, (req, res, next) => {
  const { category } = req.body
  const newCategory = { category }

  for(const [key, value] of Object.entries(newCategory))
  if(value == null)
  return res.status(400).json({
    error: {
      message: `Missing '${key}' in request body`
    }
  })

  CategoryService.insertCategory(
    req.app.get('db'),
    newCategory
  )
  .then(category => {
    return res
    .status(201)
    .location(path.posix.join(req.originalUrl, `/${category.id}`))
    .json(serializeCategory(category))
  })
  .catch(next)
})

categoryRouter
.route('/:category_id')
.all((req, res, next) => {
  CategoryService.getById(
    req.app.get('db'),
    req.params.category_id
    )
  .then(category => {
    if(!category){
      return res.status(404).json({
        error: {
          message: `Category doesn't exist`
        }
      })
    }
    res.category = category
    next()
  })
  .catch(next)
})
.delete((req, res, next) => {
  CategoryService.deleteCategory(
    req.app.get('db'),
    req.params.category_id
  )
  .then(numRowsAffected => {
    res.status(204).end()
  })
  .catch(next)
})

module.exports = categoryRouter