function makeTransactionsArray(){
  return [
    {
      id: 1,
      date_added: '2019-07-03T19:26:38.918Z',
      title: 'Some food',
      amount: 10.00,
      user_id: 1,
      category: 2
    },
    {
      id: 2,
      date_added: '2019-07-03T19:26:38.918Z',
      title: 'Some gas',
      amount: 45.37,
      user_id: 2,
      category: 1
    } 
  ]
}

function makeMaliciousTransaction(){
  const maliciousTransaction = {
    id: 911,
    date_added: '2019-07-03T19:26:38.918Z',
    title: `Some food <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
    amount: 10.00,
    user_id: 1,
    category: 2
  }

  const expectedTransaction = {
    ...maliciousTransaction,
    title: `Some food <img src="https://url.to.file.which/does-not.exist">`
  }
  return {
    maliciousTransaction,
    expectedTransaction
  }
}

module.exports = {
  makeTransactionsArray,
  makeMaliciousTransaction
}