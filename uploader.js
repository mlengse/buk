require("dotenv").config();
const Nightmare = require("nightmare");
require("nightmare-upload")(Nightmare);
require("nightmare-real-mouse")(Nightmare);
const { query, aql, upsert } = require('./db')

let getUpl = () => Nightmare({
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
      if(!d.uploaded && !['eks', 'paket', 'pre-order'].filter( e => str.toLowerCase().includes(e)).length){
        let a = ''
        for (let p in d) {
          if (!ar.filter(e => p.toLowerCase().includes(e)).length) {
            if(Array.isArray(d[p])){
              for(let line of d[p]) if(!['kode kupon', 'level', 'order manual'].filter(e=>line.toLowerCase().includes(e)).length){
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

        if(a !== ''){
          switch (d.tag.toLowerCase()) {
            case "moral":
            case "petualangan":
            case "misteri":
            case "keluarga":
              d.tag = "novel";
              break;
            case "reliji":
              d.tag = "komik";
              break;
            case "cerita-anak":
            case "ensiklopedi":
              d.tag = "anak-anak";
              break;
            case "dakwah":
            case "tafsir":
            case "cerita":
            case "al-quran":
              d.tag = "agama";
              break;
            default:
              break;
          }


          let ready = {
            paths: d.paths,
            judulUpload: `Buku ${d.judul
              .split("#")
              .join("")
              .split("!")
              .join("")
              .split(":")
              .join("")
              .split("’")
              .join("")
              .split(",")
              .join("")
              .split("'")
              .join("")
              .split("(")
              .join("")
              .split(")")
              .join("")
              .split("`")
              .join("")
              .split("+")
              .join("")}`,
            tag: d.tag,
            hargaUpload:
              Math.ceil(Math.min(...d.harga.filter(e => e)) / 100) *
              100,
            berat: d.berat,
            desc: a.split("\n")
          };

          let upl = getUpl()

          await upl.goto("https://seller.bukalapak.com/product/new");
          let login = await upl.exists('#mulai-jualan-wrapper > div > header > div > div > div.o-layout__item.u-8of12.right-header > a.u-display-inline.u-mrgn-right--2.c-link--primary > button')
          if (login) {
            await upl.click('#mulai-jualan-wrapper > div > header > div > div > div.o-layout__item.u-8of12.right-header > a.u-display-inline.u-mrgn-right--2.c-link--primary > button')
            let user = await upl.exists("#user_session_username");
            while (!user) {
              user = await upl.exists("#user_session_username");
            }
            await upl
              .insert("#user_session_username", 'mlengse')
              .insert('#user_session_password', 'ikruIKRU123')
              .click('#new_user_session > button')
          }

          await upl.wait(3000)

          let upload = await upl.exists('input.u-hidden');
          if (!upload) {
            upload = await upl.exists('input.u-hidden');
          }

          await upl
            .upload("input.u-hidden", ready.paths)
            .wait(3000)
            .click("#qa-inp-product-name > input#qa-inp-product-name")
            .insert("#qa-inp-product-name > input#qa-inp-product-name", ready.judulUpload)
            .click("#qa-inp-product-category")
            .insert("#qa-inp-product-category", ready.tag)

          let cascader = await upl.evaluate(() => {
            let menu = document.querySelectorAll("ul.el-cascader-menu > li");
            let menuA = Array.from(menu)
            if (menuA.length) {
              return true
            }
            return false
          })
          if (!cascader) {
            cascader = await upl.evaluate(() => {
              let menu = document.querySelectorAll("ul.el-cascader-menu > li");
              let menuA = Array.from(menu)
              if (menuA.length) {
                return true
              }
              return false
            })
          }

          await upl
            .realMouseover('ul.el-cascader-menu > li:nth-child(1)')
            .wait(300)
            .realClick('ul.el-cascader-menu > li:nth-child(1)')
            .wait(300)
            .realClick('ul.el-cascader-menu > li:nth-child(1)')

          await upl
            .insert("input#qa-inp-product-price", ready.hargaUpload)
            .insert('input#qa-inp-product-weight', ready.berat)

          let top = 300

          let readi = await upl
            .scrollTo(top, 0)
            .realClick('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap.CodeMirror-empty > div.CodeMirror-scroll > div.CodeMirror-sizer > div > div > div > div.CodeMirror-code > pre')
            .wait(300)
            .exists('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap.CodeMirror-empty > div.CodeMirror-scroll > div.CodeMirror-sizer > div > div > div > div.CodeMirror-cursors[style="visibility: hidden;"]')

          while (!readi) {
            top += 130
            readi = await upl
              .scrollTo(top, 0)
              .realClick('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap.CodeMirror-empty > div.CodeMirror-scroll > div.CodeMirror-sizer > div > div > div > div.CodeMirror-code > pre')
              .wait(300)
              .exists('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap.CodeMirror-empty > div.CodeMirror-scroll > div.CodeMirror-sizer > div > div > div > div.CodeMirror-cursors[style="visibility: hidden;"]')
          }

          for (let desc of ready.desc) {
            await upl
              .insert('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap', desc)
              .type('#qa-inp-product-description > div > div.CodeMirror.cm-s-paper.CodeMirror-wrap', '\u000d')

          }

          await upl.click("#qa-btn-top-sell-add-more");

          await upl.wait(5000).end()

          let { NEW } = await upsert('idbuku', Object.assign({}, d, ready, {
            uploaded: true,
            uploadTime: new Date(),
            _id: undefined,
            _rev: undefined
          }))

          console.log(NEW)

        }

      }
    }
    await upl.end()
  } catch (err) {
    console.log(err);
  }
};
