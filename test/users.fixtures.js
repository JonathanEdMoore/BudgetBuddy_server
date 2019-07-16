
function makeUsersArray(){
  const testUsers = [
    {
      id: 1,
      first_name: 'Geoffrey',
      last_name: 'Butler',
      email: 'geoffrey.butler@gmail.com',
      user_password: '01010101010'
    },
    {
      id: 2,
      first_name: 'Will',
      last_name: 'Smith',
      email: 'will.smith@gmail.com',
      user_password: '01010101010'
    },
    {
      id: 3,
      first_name: 'Carlton',
      last_name: 'Banks',
      email: 'carlton.banks@gmail.com',
      user_password: '01010101010'
    }
  ]

  const expectedUsers = [
    
    {
      id: 1,
      first_name: 'Geoffrey',
      last_name: 'Butler',
      email: 'geoffrey.butler@gmail.com',
    },
    {
      id: 2,
      first_name: 'Will',
      last_name: 'Smith',
      email: 'will.smith@gmail.com',
    },
    {
      id: 3,
      first_name: 'Carlton',
      last_name: 'Banks',
      email: 'carlton.banks@gmail.com',
    }
  
  ]
  return{
    testUsers,
    expectedUsers,
  } 
}

function makeMaliciousUser(){
  const maliciousUser = {
    id: 911,
    first_name: `Phillip <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
    last_name: `Banks <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
    email: `phillip.banks@gmail.com <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
    user_password: 'Jm62920!'
  }

  const expectedUser = {
    ...maliciousUser,
    first_name: `Phillip <img src="https://url.to.file.which/does-not.exist">`,
    last_name: `Banks <img src="https://url.to.file.which/does-not.exist">`,
    email: `phillip.banks@gmail.com <img src="https://url.to.file.which/does-not.exist">`
  }
  return{
    maliciousUser,
    expectedUser,
  }
}

module.exports = {
  makeUsersArray,
  makeMaliciousUser
}