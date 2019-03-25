require("dotenv").config();
const Nightmare = require("nightmare");
const { query, aql } = require('./db')

const upl = Nightmare({
  show: true,
  webPreferences: {
    partition: "persist: upl"
  }
});

module.exports = async () => {
  try {
    let db = await query(aql`FOR i IN idbuku RETURN i`)
    let ar = ['_key', '_id', '_rev', 'poin', 'link', 'harga', 'berat', 'img', 'judul', 'ketersediaan', 'kode', 'paths', 'tag']
    for(let d of db){
      let str = JSON.stringify(d)
      if(!['eks', 'paket'].filter( e => str.toLowerCase().includes(e)).length){
        let a = ''
        for (let p in d) {
          if (!ar.filter(e => p.toLowerCase().includes(e)).length) {
            if(Array.isArray(d[p])){
              for(let line of d[p]){
                a += `${line}\n`
              }
            } else {
              a += `${p}: ${d[p]}\n`
            }
          }
        }

        if(['howto'].filter(e => d.tag.includes(e)).length){
          d.tag = 'buku lainnya'
        }
        if(d.berat === 0){
          d.berat = d.poin
        }
        console.log(d.paths);
        console.log(`Buku ${d.judul}`)
        console.log(d.tag)
        console.log(Math.min(...d.harga.filter(e => e)))
        console.log(d.berat)
        console.log(a)

      }
    }
    //await upl.goto()
  } catch (err) {
    console.log(err);
  }
};
