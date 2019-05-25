require("dotenv").config();
const Nightmare = require("nightmare");
const downloadImage = require('./download_image')
const buk = Nightmare({
  show: true,
  webPreferences: {
    partition: "persist: shira"
  }
});

const scrapeBook = async buk => {
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
      for (bukLink of bukLinks) {
        await buk.goto(bukLink)
        console.log('link:', bukLink)

        let bukImages = await buk.evaluate(() => {
          let lists = document.querySelectorAll('.book-pages > img');
          let links = [];
          for (let list of lists) {
            let link = list.getAttribute('src');
            links[links.length] = link;
          }
          return links;

        })

        for (bukImage of bukImages) {
          console.log('image link:', bukImage)
          let dirArr = bukLink.split('/')
          let dir = dirArr.pop()
          if(!dir) dir = dirArr.pop()
          let path = await downloadImage(bukImage, `./images/${dir}`)
          if (path) {
            console.log('download path:', path)
          }
        }

        let bukExcerpt = await buk.evaluate(() => document.querySelector('.product__excerpt').textContent.trim())
        console.log('short description:', bukExcerpt)

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

        let bukJudul = await buk.evaluate(() => document.querySelector('h1.product__title').textContent)
        console.log('judul:', bukJudul)

        let bukAuthor = await buk.evaluate(() => document.querySelector('.product__meta > .author') && document.querySelector('.product__meta > .author').textContent.split(' ').map(e => e.trim()).join(' ').trim())
        bukAuthor && console.log('author:', bukAuthor)

        let bukPrice = await buk.evaluate(() => {
          let els = document.querySelectorAll('p.price span.amount')
          let arr = []
          for(el of els){
            arr[arr.length] = el.textContent.split('Rp').join('').split('.').join('')
          }
          return arr
        })

        console.log('price:', bukPrice)

        let bukStock = await buk.evaluate(() => document.querySelector('.stock.in-stock') && document.querySelector('.stock.in-stock').textContent.split('stok tersedia').join('').trim())
        bukStock ? console.log('stock:', bukStock) : console.log('stock:', 0)

        let weight = await buk.evaluate(() => document.querySelector('.product_weight') && document.querySelector('.product_weight').textContent)
        weight && console.log('weight', weight)

        let dimension = await buk.evaluate(() => document.querySelector('.product_dimensions') && document.querySelector('.product_dimensions').textContent)
        dimension && console.log('dimension:', dimension)

      }
    }

  }

}

module.exports = async () => {
  try {
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

      await scrapeBook(buk)

      while(next) {
        page++
        await buk.goto(`${link}page/${page}/`)
        console.log('page:', page)
        next = await buk.exists('li > a.next.page-numbers')
        await scrapeBook(buk)
      }

    }
    await buk.end();
  } catch (err) {
    console.log(err);
  }
}
