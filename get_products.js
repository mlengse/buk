module.exports = async (buk, prodLength) => {
  try {
    let products = await buk.evaluate(() => {
      let links = document.querySelectorAll('.caption > h5 > a[href]')
      let products = []
      for (let link of links) {
        products[products.length] = link.getAttribute('href')
      }
      return products
    })

    while (Number(products.length) < prodLength) {
      products = await buk.evaluate(() => {
        let links = document.querySelectorAll('.caption > h5 > a[href]')
        let products = []
        for (let link of links) {
          products[products.length] = link.getAttribute('href')
        }
        return products
      })
    }

    for (let product of products) {
      await buk.goto(product)
      let desc = await buk.exists('#tab-description')
      while (!desc) {
        desc = await buk.exists('#tab-description')
      }

      desc = Object.assign({}, {
        link: product,
        harga: [],
        deskripsi: ''
      }, await buk.evaluate(() => {
        let desc = {
          harga: [],
          deskripsi: ''
        }
        desc.judul = document.querySelector('#content .col-sm-4 h3').textContent.trim()
        let cols = document.querySelectorAll('#content .col-sm-4 .list-unstyled li')

        for (let col of cols) {
          let itemCol = col.textContent
          if (itemCol.includes(':')) {
            let itemArr = itemCol.split(':')
            let prop = itemArr[0];
            if(prop.includes('Produk')){
              prop = prop.split('Produk').join('').trim()
            }
            desc[prop] = itemArr[1].trim()
          }
          if (itemCol.includes('Rp')) {
            let harga = itemCol.split("Rp.")
            for(let har of harga){
              har = har.trim()
              if(har.includes(' ')){
                har = har.split(' ')[0]
              }                
              if (har !== '') {
                desc.harga.push(har.trim())
              }
            }
          }
        }

        let ps = document.querySelectorAll('#tab-description p')
        
        for (let p of ps) {
          desc.deskripsi += p.textContent.trim() + '\n'
        }

        if (['Stock Habis', 'PRE-ORDER'].filter(e => JSON.stringify(desc).includes(e)).length === 0) {
          return desc
        }

        return {}

      }))

      if(desc.harga.length){
        console.log(desc)
      }

    }

  } catch (err) {
    console.log(err)
  }
}