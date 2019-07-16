function makeCategoriesArray(){
  return[
    {
      id: 1,
      category: 'Gas'
    },
    {
      id: 2,
      category: 'Dining'
    },
    {
      id: 3,
      category: 'Groceries'
    }
  ]
}

function makeMaliciousCategory(){
  const maliciousCategory = {
    id: 911,
    category: `Groceries <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`
  }

  const expectedCategory = {
    ...maliciousCategory,
    category: `Groceries <img src="https://url.to.file.which/does-not.exist">`
  }
  return {
    maliciousCategory,
    expectedCategory,
}
}

module.exports = { 
  makeCategoriesArray, 
  makeMaliciousCategory }