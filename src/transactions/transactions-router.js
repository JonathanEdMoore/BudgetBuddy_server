const path = require('path')
const express = require('express')
const xss = require('xss')
const TransactionsService = require('./transactions-service')
const { requireAuth } = require('../middleware/jwt_auth')

const transactionsRouter = express.Router()
const jsonParser = express.json()

const serializeTransaction = transaction => ({
  id: transaction.id,
  date_added: transaction.date_added,
  title: xss(transaction.title),
  amount: transaction.amount,
  user_id: transaction.user_id,
  category: transaction.category,

})
transactionsRouter
.route('/')
.all(requireAuth)
.get((req, res, next) => {
  TransactionsService.getAllTransactions(
    req.app.get('db')
  )
  .then(transactions => {
    res.json(transactions.map(serializeTransaction))
  })
  .catch(next)
})

transactionsRouter
.route('/user/:user_id')
.all(requireAuth)
.get((req, res, next) => {
  TransactionsService.getUserTransactions(
    req.app.get('db'),
    req.params.user_id
    //req.user.id
  )
  .then(transactions => {
    res.json(transactions.map(serializeTransaction))
  })
  .catch(next)
})
.post(jsonParser, (req, res, next) => {
  const { date_added, title, amount, user_id, category } = req.body
  const newTransaction = { title, amount, user_id, category }

  for(const [key, value] of Object.entries(newTransaction))
  if(value == null)
  return res.status(400).json({
    error: {
      message: `Missing '${key}' in request body`
    }
  })

  newTransaction.date_added = date_added

  TransactionsService.insertTransaction(
    req.app.get('db'),
    newTransaction
  )
  .then(transaction => {
    return res
    .status(201)
    .location(path.posix.join('/api/transactions', `/${transaction.id}`))
    .json(serializeTransaction(transaction))
  })
  .catch(next)
})

transactionsRouter
.route('/:transaction_id')
.all(requireAuth, (req, res, next) => {
  TransactionsService.getById(
    req.app.get('db'),
    req.params.transaction_id
  )
  .then(transaction => {
    if(!transaction){
      return res.status(404).json({
        error: {
          message: `Transaction doesn't exist`
        }
      })
    }
    res.transaction = transaction
    next()
  })
  .catch(next)
})
.get((req, res, next) => {
  res.json(serializeTransaction(res.transaction))
})
.delete((req, res, next) => {
  TransactionsService.deleteTransaction(
    req.app.get('db'),
    req.params.transaction_id
  )
  .then(numRowsAffected => {
    res.status(204).end()
  })
  .catch(next)
})
.patch(jsonParser, (req, res, next) => {
  const { title, amount, user_id, category } = req.body
  const transactionToUpdate = { title, amount, user_id, category }

  const numberOfValues = Object.values(transactionToUpdate).filter(Boolean).length
  if(numberOfValues === 0){
    return res
    .status(400)
    .json({
      error: {
        message: `Request body must contain either 'title', 'amount', 'user_id', 'category'`
      }
    })
  }

  TransactionsService.updateTransaction(
    req.app.get('db'),
    req.params.transaction_id,
    transactionToUpdate
  )
  .then(numRowsAffected => {
    res
    .status(204)
    .end()
  })
  .catch(next)
})

module.exports = transactionsRouter