require('dotenv').config()
const Nightmare = require('nightmare')
const buk = Nightmare({ 
  show: true,
  webPreferences: {
    partition: 'persist: testing'
  }
})

const scrapeProducts = async (buk, prodLength) => {
  try {
    let products = await buk.evaluate(() => {
      let links = document.querySelectorAll('.caption > h5 > a[href]')
      let products = []
      for(let link of links){
        products[products.length] = link.getAttribute('href')
      }
      return products
    })

    while(Number(products.length) < prodLength) {
      products = await buk.evaluate(() => {
        let links = document.querySelectorAll('.caption > h5 > a[href]')
        let products = []
        for(let link of links){
          products[products.length] = link.getAttribute('href')
        }
        return products
      })
    }

    for(let product of products) {
      await buk.goto(product)
      console.log(product)
      let desc = await buk.exists('#tab-description')
      while(!desc){
        desc = await buk.exists('#tab-description')
      }

      desc = await buk.evaluate(() => {
        let desc = ''
        desc += document.querySelector('#content .col-sm-4 h3').textContent.trim() + '\n'
        let cols = document.querySelectorAll('#content .col-sm-4 .list-unstyled li')
        for(let col of cols){
          desc += col.textContent.trim() + '\n'
        }
        let ps = document.querySelectorAll('#tab-description p')
        for(let p of ps){
          desc += p.textContent.trim() + '\n'
        }

        return desc

      })

      if( ['Stock Habis', 'PRE-ORDER'].filter(e => desc.includes(e)).length === 0) {
        console.log(desc)
      }
    }

  } catch (err) {
    console.log(err)
  }
}

;(async () => {
  try{
    await buk
    .goto(process.env.URL)

    let ul = await buk.exists(process.env.NAV)

    while(!ul){
      ul = await buk.exists(process.env.NAV)
    }

    let links = await buk.evaluate(href=>{
      let lists = document.querySelectorAll(href)
      let links = []
      for( let list of lists) {
        let link = list.getAttribute('href')
        if(!link.includes('publishing')) {
          links[links.length] = link
        }
      }
      return links
    }, process.env.HREF)

    for( let link of links){
      await buk
      .goto(link)

      let content = await buk.exists(process.env.HOME)

      while(!content){
        content = await buk.exists(process.env.HOME)
      }

      console.log(link)

      let bukExists = await buk.exists(process.env.TEXT)

      if(bukExists) {
        let num = await buk.evaluate(text=> document.querySelector(text).textContent, process.env.TEXT)
        let numArr = num.split(' ')
        let prodLength = 1 + Number(numArr[3]) - Number(numArr[1])
        let part = numArr[3]
        let nowPart = numArr[3]
        let total = numArr[5]
        let hal = 1

        console.log(`${part} dari ${total} hal ${hal}`)

        await scrapeProducts(buk, prodLength)
  
        while(Number(part) < Number(total)){
          hal++
          await buk.goto(`${link}?page=${hal}`)
          bukExists = await buk.exists(process.env.TEXT)
          while(!bukExists) {
            bukExists = await buk.exists(process.env.TEXT)
          }
          num = await buk.evaluate(text=> document.querySelector(text).textContent, process.env.TEXT)
          numArr = num.split(' ')
          prodLength = 1 + Number(numArr[3]) - Number(numArr[1])
          nowPart = numArr[3]
          total = numArr[5]

          while(part === nowPart) {
            num = await buk.evaluate(text=> document.querySelector(text).textContent, process.env.TEXT)
            numArr = num.split(' ')
            prodLength = 1 + Number(numArr[3]) - Number(numArr[1])
            nowPart = numArr[3]
            total = numArr[5]
          }

          part = nowPart

          console.log(`${part} dari ${total} hal ${hal}`)

          await scrapeProducts(buk, prodLength)
        }
  
      }


    }

    await buk.end()

  }catch(err){
    console.log(err)
  }
})()