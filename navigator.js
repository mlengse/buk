require("dotenv").config();
const Nightmare = require("nightmare");
const downloadImage = require('./download_image')
const { upsert} = require('./db')

const buk = Nightmare({
  show: true,
  webPreferences: {
    partition: "persist: shira"
  }
});

const checkStock = async (buk, existsLink) => {
  try {
    await buk.goto(existsLink)

    let stock = await buk.evaluate(() => document.querySelector('.stock.in-stock') && document.querySelector('.stock.in-stock').textContent.split('stok tersedia').join('').trim())

    if(stock){
      return Number(stock)
    }
    return 0

  } catch (err) {
    console.log(err)
  }
}

const scrapeBook = async (buk, existsLinks) => {
  try {
    let books = []
    let bukExists = await buk.exists('main .product__inner');
  
    if (bukExists) {
      let bukLinks = await buk.evaluate(() => {
        let lists = document.querySelectorAll('main .product__inner h3.product__title > a');
        let links = [];
        for (let list of lists) {
          let link = list.getAttribute('href');
          links[links.length] = link;
        }
        return links;
      })
  
      if (bukLinks.length) {
        for (link of bukLinks) if(existsLinks.indexOf(link) == -1){
          await buk.goto(link)
          console.log('link:', link)
          let dirArr = link.split('/')
          let dir = dirArr.pop()
          if(!dir) dir = dirArr.pop()
  
          let images = await buk.evaluate(() => {
            let lists = document.querySelectorAll('.book-pages > img');
            let links = [];
            for (let list of lists) {
              let link = list.getAttribute('src');
              links[links.length] = link;
            }
            return links;
  
          })
  
          let imgs = []
  
          for (image of images) {
            console.log('image link:', image)
            let path = await downloadImage(image, `./images/${dir}`)
            if (path) {
              console.log('download path:', path)
            }
            imgs[imgs.length] = {
              image,
              path
            }
          }
  
          let excerpt = await buk.evaluate(() => document.querySelector('.product__excerpt').textContent.trim())
          console.log('short description:', excerpt)
  
          let description = await buk.evaluate(() => document.getElementById('tab-description').textContent.trim())
          console.log('long description:', description)
  
          let cats = await buk.evaluate(() => {
            let els = document.querySelectorAll('span.posted_in > a')
            let arr = []
            for (el of els) {
              arr[arr.length] = el.textContent
            }
            return arr
          })
  
          console.log('kategori:', cats)
  
          let judul = await buk.evaluate(() => document.querySelector('h1.product__title').textContent)
          console.log('judul:', judul)
  
          let author = await buk.evaluate(() => document.querySelector('.product__meta > .author') && document.querySelector('.product__meta > .author').textContent.split(' ').map(e => e.trim()).join(' ').trim())
          author && console.log('author:', author)
  
          let price = await buk.evaluate(() => {
            let els = document.querySelectorAll('p.price span.amount')
            let arr = []
            for(el of els){
              arr[arr.length] = el.textContent.split('Rp').join('').split('.').join('')
            }
            return arr
          })
  
          console.log('price:', price)
  
          let stock = await buk.evaluate(() => document.querySelector('.stock.in-stock') && document.querySelector('.stock.in-stock').textContent.split('stok tersedia').join('').trim())
          stock ? console.log('stock:', stock) : console.log('stock:', 0)
  
          let weight = await buk.evaluate(() => document.querySelector('.product_weight') && document.querySelector('.product_weight').textContent)
          weight && console.log('weight', weight)
  
          let dimension = await buk.evaluate(() => document.querySelector('.product_dimensions') && document.querySelector('.product_dimensions').textContent)
          dimension && console.log('dimension:', dimension)
  
          let book = {
            _key: dir,
            link,
            imgs,
            excerpt,
            description,
            cats,
            judul,
            author,
            price,
            stock: stock || 0,
            weight,
            dimension
          }
  
          await upsert('shiramedia', book)
  
          books[books.length] = book
  
        }
      }
  
    }
  
    return books
  
  } catch (err) {
    console.log(err)
  }
}

module.exports = async books => {
  try {
    //let books = []
    let existsLinks = []
    if(books.length) {
      existsLinks = books.map( e => e.link)
      for(existsLink of existsLinks){
        console.log('exist link:', existsLink)
        let lama = Number(books[existsLinks.indexOf(existsLink)].stock)
        console.log('stock lama:', lama)
        let baru = await checkStock(buk, existsLink)
            
        if(lama !== baru) {
          let dirArr = existsLink.split('/')
          let dir = dirArr.pop()
          if(!dir) dir = dirArr.pop()

          console.log('stock baru:', baru)
          let {NEW} = await upsert('shiramedia', {
            _key: dir,
            stock: baru
          })
      
          books[existsLinks.indexOf(existsLink)] = NEW
  
        }
      }
    }

    await buk.goto('https://shiramedia.com/');
    let ul = await buk.exists('#product_cat');

    while (!ul) {
      ul = await buk.exists('#product_cat');
    }

    let links = await buk.evaluate(() => {
      let lists = document.querySelectorAll('#product_cat > .level-0');
      let links = [];
      for (let list of lists) {
        let link = list.value;
        links[links.length] = `https://shiramedia.com/product-category/${link}/`;
      }
      return links;
    });

    for (let link of links) {
      
      await buk.goto(link);
      console.log('category link:', link);
      let page = 1
      let next = await buk.exists('li > a.next.page-numbers')

      books = [...books, ...(await scrapeBook(buk, existsLinks))]

      while(next) {
        page++
        await buk.goto(`${link}page/${page}/`)
        console.log('page:', page)
        next = await buk.exists('li > a.next.page-numbers')
        books = [...books, ...(await scrapeBook(buk, existsLinks))]
      }

    }
    await buk.end();
    //return books
  } catch (err) {
    console.log(err);
  }
}
