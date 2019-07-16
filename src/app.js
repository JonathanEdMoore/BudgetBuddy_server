require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const pg = require('pg')
const usersRouter = require('./users/users-router')
const categoryRouter = require('./category/category-router')
const transactionsRouter = require('./transactions/transactions-router')
const authRouter = require('./auth/auth-router')

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

pg.types.setTypeParser(1700, parseFloat)

app.use(morgan(morganOption))
app.use(cors())
app.use(helmet())

// const jwtAuth = passport.
app.use('/api/users', usersRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/auth', authRouter)

app.get('/', (req, res) => {
  res.send('Hello, world!')
})


app.use(function errorHandler(error, req, res, next) {
  let response
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
})

module.exports = app