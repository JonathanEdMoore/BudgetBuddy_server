const path = require('path')
const express = require('express')
const xss = require('xss')
const UsersService = require('./users-service')
const { requireAuth } = require('../middleware/jwt_auth')

const usersRouter = express.Router()
const jsonParser = express.json()


const serializeUser = user => ({
  id: user.id,
  first_name: xss(user.first_name),
  last_name: xss(user.last_name),
  email: xss(user.email),
})

usersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    UsersService.getAllUsers(knexInstance)
      .then(users => {
        res.json(users.map(serializeUser))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { first_name, last_name, email, user_password } = req.body
    let newUser = { first_name, last_name, email, user_password }

    for (const [key, value] of Object.entries(newUser))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })

    const passwordError = UsersService.validatePassword(user_password)

    if (passwordError)
      return res.status(400).json({
        error: passwordError
      })

      UsersService.hashPassword(user_password)
      .then(hashedPassword => {
        newUser = {
          first_name,
          last_name,
          email,
          user_password: hashedPassword,
        }
      })
      .then(() => {
        return UsersService.hasUserWithEmail(
          req.app.get('db'),
          email
        )
      })
      .then(hasUserWithEmail => {
        if(hasUserWithEmail){
        return res.status(400).json({
          error: 'An account with this email already exists'
        })
      }
        else {
          UsersService.insertUser(
            req.app.get('db'),
            newUser
          )
            .then(user => {
              
              return res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${user[0].id}`))
                .json(serializeUser(user[0]))
            })
            .catch(next)
        }
      })
  
    
  })

usersRouter
  .route('/:user_id')
  .all(requireAuth)
  .all((req, res, next) => {
    UsersService.getById(
      req.app.get('db'),
      req.params.user_id
    )
      .then(user => {
        if (!user) {
          return res.status(404).json({
            error: { message: `User doesn't exist` }
          })
        }
        res.user = user
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeUser(res.user))
  })
  .delete((req, res, next) => {
    UsersService.deleteUser(
      req.app.get('db'),
      req.params.user_id
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { first_name, last_name, email, user_password } = req.body
    const userToUpdate = { first_name, last_name, email, user_password }

    const numberOfValues = Object.values(userToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res
        .status(400)
        .json({
          error: {
            message: `Request body must contain either 'first_name', 'last_name', 'email', 'user_password'`
          }
        })
    }

    const passwordError = UsersService.validatePassword(user_password)

    if (passwordError)
      return res.status(400).json({
        error: passwordError
      })

    //   UsersService.hashPassword(user_password)
    //   .then(hashedPassword => {
    //     userToUpdate = {
    //       first_name,
    //       last_name,
    //       email,
    //       user_password: hashedPassword,
    //     }
    //   })
    //   .then(() => {
    //     return UsersService.hasUserWithEmail(
    //       req.app.get('db'),
    //       email
    //     )
    //   })
    //   .then(hasUserWithEmail => {
    //     if(hasUserWithEmail){
    //     return res.status(400).json({
    //       error: 'An account with this email already exists'
    //     })
    //   }
    //   else{
    UsersService.updateUser(
      req.app.get('db'),
      req.params.user_id,
      userToUpdate
    )
      .then(numRowsAffected => {
        res
          .status(204)
          .end()
      })
      .catch(next)
  //   }
  // })
})
module.exports = usersRouter