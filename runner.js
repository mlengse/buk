const navigator = require('./navigator')
//const uploader = require('./uploader')
const { aql, query } = require('./db')

;(async () => {
  try{
    
    let books = await query(aql`FOR s IN shiramedia RETURN s`)
    //console.log(books)
    await navigator(books)
    //console.log(books)
    //await uploader()

  }catch(err){
    console.log(err)
  }
})()