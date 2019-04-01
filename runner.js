const navigator = require('./navigator')
const uploader = require('./uploader')

;(async () => {
  try{
    //await navigator()
    await uploader()

  }catch(err){
    console.log(err)
  }
})()