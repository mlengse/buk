const Fs = require('fs')
const Path = require('path')
const Axios = require('axios')

module.exports = async (url, dir) => {

  let filename = url.split('/').pop()

  let dirname = Path.join('//192.168.1.88', 'share', 'anjang')

  let dirPath = Path.join(dirname, dir)

  let path = Path.join(dirname, dir, filename)

  let lanjut

  if (Fs.existsSync(path)) {
    if (Fs.statSync(path).size < 1) {
      lanjut = true
    }
  } else {
    if (!Fs.existsSync(dirPath)) {
      Fs.mkdirSync(dirPath);
    }
    lanjut = true
  }

  if (lanjut) {
    const writer = Fs.createWriteStream(path);

    const response = await Axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve(path));
      writer.on("error", reject);
    });

  }

  return path

}