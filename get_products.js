const Fs = require('fs')
const Path = require('path')
const Axios = require('axios')
const { upsert } = require('./db')
async function downloadImage(url, path) {

  let lanjut

  if(Fs.existsSync(path)){
    if (Fs.statSync(path).size < 1) {
      lanjut = true
    }
  } else {
    lanjut = true
  }

  if(lanjut){
    const writer = Fs.createWriteStream(path);

    const response = await Axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

  }

  return

}


const getProductEval = () => {
  let links = document.querySelectorAll('.caption > h5 > a[href]')
  let products = []
  for (let link of links) {
    products[products.length] = link.getAttribute('href')
  }
  return products
}

const getLinkEval = () => {
  let links = document.querySelectorAll('.caption > h5 > a[href]')
  let products = []
  for (let link of links) {
    products[products.length] = link.getAttribute('href')
  }
  return products
}

const getDescEval = () => {

  const handleText = (desc, pText) => {
    if (pText !== '') {
      if (pText.includes(':')) {
        let eA = pText.split(':')
        let prop = eA[0].trim()
        let val = eA[1].trim()
        if (!['\\', ',', '.', '(', ')'].filter(e => prop.includes(e)).length && prop.split(' ').length <= 2) {
          if (prop.includes('Berat')) {
            if (prop.includes('gram')) {
              desc.berat = [desc.berat, Number(val.split('gram')[0].trim())]
            } else if (prop.includes('Kg')) {
              desc.berat = [desc.berat, Number(val.split('Kg')[0].trim().split('.').join('').split(',').join('.') * 1000)]
            }
          } else if (prop.includes('Harga')) {
            desc.harga.push(Number(val))
          } else {
            desc[prop.toLowerCase()] = val
          }
        } else {
          desc.deskripsi.push(pText)
        }
      } else {
        desc.deskripsi.push(pText)
      }
    }

    return desc
  }

  const getDesc = (desc, el) => {
    let ps = document.querySelectorAll(el)

    for (let p of ps) {
      let pText = p.innerText;

      if (pText.includes('\n')) {
        pText.split('\n').map(e => {
          desc = handleText(desc, e)

        })
      } else {
        desc = handleText(desc, pText)
      }
    }

    return desc

  }

  let desc = {
    harga: [],
    deskripsi: [],
    judul: document.querySelector('#content .col-sm-4 h3').textContent.trim()
  }

  let cols = document.querySelectorAll('#content .col-sm-4 .list-unstyled li')

  for (let col of cols) {
    let itemCol = col.textContent
    if (itemCol.includes(':')) {
      let itemArr = itemCol.split(':')
      let prop = itemArr[0];
      if (prop.includes('Reward')) {
        prop = 'poin'
      }
      if (prop.includes('Produk')) {
        prop = prop.split('Produk').join('').trim()
      }
      let val = itemArr[1].trim();
      if (prop === 'Berat') {
        val = Number(val.split('g')[0].trim())
      }
      desc[prop.toLowerCase()] = val
    }
    if (itemCol.includes('Rp')) {
      let harga = itemCol.split("Rp.")
      for (let har of harga) {
        har = har.trim()
        if (har.includes(' ')) {
          har = har.split(' ')[0]
        }
        if (har !== '') {
          desc.harga.push(Number(har.trim().split('.').join('').split(',').join('.')))
        }
      }
    }
  }

  let panel = document.querySelector('.panel.panel-primary')

  panel.parentNode.removeChild(panel)

  //desc = getDesc(desc, "#tab-description p");
  //desc = getDesc(desc, "#tab-description li");
  //desc = getDesc(desc, "#tab-description div");

  //if(desc === ''){
    desc = getDesc(desc, "#tab-description");
  //}


  if (Array.isArray(desc.harga)) {
    desc.harga = Array.from(new Set(desc.harga))
  }

  let imgs = document.querySelectorAll('.col-sm-8 img')
  let srcs = []
  for(let img of imgs){
    let src = img.getAttribute('src')
    srcs[srcs.length] = src
  }

  desc.img = srcs

  if (['Stock Habis', 'PRE-ORDER', 'eks', 'paket'].filter(e => JSON.stringify(desc).includes(e)).length === 0) {
    return desc
  }

  return {}

}

module.exports = async (buk, prodLength, tag) => {
  try {
    let products = await buk.evaluate(getProductEval)

    while (Number(products.length) < prodLength) {
      products = await buk.evaluate(getLinkEval)
    }

    for (let product of products) {
      await buk.goto(product)
      let desc = await buk.exists('#tab-description')
      while (!desc) {
        desc = await buk.exists('#tab-description')
      }

      let descEval = await buk.evaluate(getDescEval)

      desc = Object.assign({}, {
        link: product,
        harga: [],
        deskripsi: ''
      }, descEval)

      if(desc.harga.length){
        desc.paths = []
        for(let img of desc.img){
          let file = img.split("/");
          let filename = file[file.length - 1];
        
          filename = filename.split('-')
          if(filename[filename.length-1].includes('x')){
            let fn = filename.pop()
            let extArr = fn.split('.')
            let ext = extArr.pop()
            fn = ["500x747", ext].join('.');
            filename.push(fn);
          }
          filename = filename.join('-');
          file.pop()
          file.push(filename)

          img = file.join('/')

          let path = Path.join(__dirname, "pics", filename);
          desc.paths.push(path)
          await downloadImage(img, path)  
        }

        let key = desc.link.split('/')
        desc._key = key[key.length-1].split('/').join('-').trim()
        desc.tag = tag

        let { NEW } = await upsert('idbuku', desc)

        console.log(NEW.deskripsi)
      }

    }

  } catch (err) {
    console.log(err)
  }
}