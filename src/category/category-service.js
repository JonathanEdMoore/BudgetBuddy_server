const CategoryService = {
  getAllCategories(knex){
    return knex
    .select('*')
    .from('category')
  },

  insertCategory(knex, newCategory){
    return knex
    .insert(newCategory)
    .into('category')
    .returning('*')
    .then(rows => {
      return rows[0]
    })
  },

  getById(knex, id){
    return knex
      .from('category')
      .select('*')
      .where('id', id)
      .first()
  },

  deleteCategory(knex, id){
    return knex('category')
    .where({ id })
    .delete()
  }
}

module.exports = CategoryService