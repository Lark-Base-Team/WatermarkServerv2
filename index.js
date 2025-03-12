const express = require('express')
const fs = require('fs')
const dayjs = require('dayjs')
const { v4 } = require('uuid')
const path = require('path');
const uuid = v4
const { createCanvas, loadImage, registerFont } = require('canvas')
const { TosClient, TosClientError, TosServerError } = require('@volcengine/tos-sdk')

const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "cn-beijing", // 填写 Bucket 所在地域。以华北2（北京)为例，"Provide your region" 填写为 cn-beijing。
  endpoint: "tos-cn-beijing.volces.com", // 填写域名地址
});
// 存储桶名称
const bucketName = 'faas-field';

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}


registerFont('./font/MiSans.ttf', { family: 'MiSans' })
if (!fs.existsSync('./out')) fs.mkdirSync('./out');
const app = express()
const port = 3000

const dayStr = {
  0: '星期日',
  1: '星期一',
  2: '星期二',
  3: '星期三',
  4: '星期四',
  5: '星期五',
  6: '星期六'
}

function saveBuffer(name, dataBuffer) {
  fs.writeFile('./out/' + name, dataBuffer, function (err) {
    err && console.log(err);
  })
};

async function uploadImage(buffer, fileName) {
  var obj = {
    bucket: bucketName,
    key: "attachment/replit_3e1c110e91bda3e4/" + fileName,
    body: Buffer.from(buffer),
  }
  try {
    // 上传对象
    await client.putObject(obj);
    const url = client.getPreSignedUrl({
      method: 'GET',
      expires: 60 * 6,
      bucket: bucketName,
      key: obj.key,
    });
    return url
  } catch (error) {
    handleError(error);
  }
}

app.get('/addWatermark', async ({ query }, res) => {
  // console.log(query);

  try {
    const { time, text, url, direction, tenantKey, origin_name = 'old_version_shortcut.png', opacity = 16 } = query
    opacity /= 100;
    const dayjsObj = dayjs(new Date(Number(time)))
    const showDate = Boolean(time != '@NULL@')
    const date = dayjsObj.format('YYYY-MM-DD')
    const clock = dayjsObj.format('HH:mm')
    const day = dayStr[dayjsObj.day()]
    const image = await loadImage(url)
    const suffix = (origin_name.endsWith('.jpg') || origin_name.endsWith('.jpeg')) ? '.jpeg' : '.png'
    const width = image.width
    const height = image.height
    const vmin = Math.min(width, height)
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const size0 = vmin * 0.16
    const size1 = vmin * 0.1
    const size2 = vmin * 0.03
    const size3 = vmin * 0.015
    const size4 = vmin * 0.005
    const fileName = `${origin_name}_${tenantKey}_${uuid()}${suffix}`;

    // 通用配置
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    const margin = vmin * 0.015

    // 背景原图
    ctx.drawImage(image, 0, 0, width, height)

    if (direction == 'cover') {
      // 背景覆盖
      const rotate = 30
      const gapX = size2
      const gapY = size1
      const fontSize = size2
      const coverText = text + ' ' + (showDate ? date : '')
      ctx.drawImage(image, 0, 0, width, height)
      ctx.save()
      ctx.rotate(rotate * Math.PI / 180)
      const rotatedWidth = width * Math.cos(rotate * Math.PI / 180) + height * Math.sin(rotate * Math.PI / 180)
      const rotatedHeight = height * Math.cos(rotate * Math.PI / 180) + width * Math.sin(rotate * Math.PI / 180)
      ctx.fillStyle = `rgba(88,88,88,${opacity})`
      ctx.font = size2 + 'px MiSans'
      for (let y = -Math.sin(rotate * Math.PI / 180) * width; y < rotatedHeight; y += gapY + fontSize) {
        for (let x = (y / rotatedHeight) * ctx.measureText(coverText).width; x < rotatedWidth; x += gapX + ctx.measureText(coverText).width) {
          ctx.fillText(coverText, x, y)
        }
      }
      ctx.restore()


    } else if (direction == 'center') {
      // 文字居中
      if (showDate) {
        ctx.fillStyle = '#ffffff'
        ctx.font = size0 + 'px MiSans'
        ctx.fillStyle = 'rgba(12,12,12,0.7)'
        ctx.fillText(clock, (width * 0.5 - ctx.measureText(clock).width / 2) + size4, (height * 0.6 - size0 / 2) + size4)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(clock, width * 0.5 - ctx.measureText(clock).width / 2, height * 0.6 - size0 / 2)
        ctx.font = size0 * 0.3 + 'px MiSans'
        ctx.fillStyle = 'rgba(12,12,12,0.7)'
        ctx.fillText(`${date} ${day} | ${text}`, (width * 0.5 - ctx.measureText(`${date} ${day} | ${text}`).width / 2) + size4 / 2, (height * 0.8 - size1 / 2) + size4 / 3)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`${date} ${day} | ${text}`, width * 0.5 - ctx.measureText(`${date} ${day} | ${text}`).width / 2, height * 0.8 - size1 / 2)
      } else {
        ctx.font = size0 * 0.3 + 'px MiSans'
        ctx.fillStyle = 'rgba(12,12,12,0.7)'
        ctx.fillText(text, (width * 0.5 - ctx.measureText(text).width / 2) + size4 / 2, (height * 0.8 - size1 / 2) + size4 / 3)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(text, width * 0.5 - ctx.measureText(text).width / 2, height * 0.8 - size1 / 2)
      }

    } else {
      // 计算文字width
      ctx.font = size1 + 'px MiSans'
      const clockWidth = ctx.measureText(clock).width
      ctx.font = size2 + 'px MiSans'
      const dateWidth = ctx.measureText(date).width
      const textWidth = ctx.measureText(text).width

      const globalOffsetMap = { leftBottom: { x: { multiple: 0, addition: 0 }, y: { multiple: -1, addition: height } }, leftTop: { x: { multiple: 0, addition: 0 }, y: { multiple: 0, addition: 0 } }, rightBottom: { x: { multiple: -1, addition: width }, y: { multiple: -1, addition: height } }, rightTop: { x: { multiple: -1, addition: width }, y: { multiple: 0, addition: 0 } } }

      if (showDate) {  // 显示日期

        // 半透明文字背景
        ctx.fillStyle = `rgba(0,0,0,${opacity})`
        let bgWidth = Math.max(clockWidth + size3 + size4 + size3 + dateWidth + margin + margin, textWidth + margin + margin)
        let bgHeight = size2 + size1 + margin + margin
        const t = globalOffsetMap[direction]
        const globalOffsetX = t.x.multiple * bgWidth + t.x.addition
        const globalOffsetY = t.y.multiple * bgHeight + t.y.addition
        ctx.fillRect(globalOffsetX, globalOffsetY, bgWidth, bgHeight)
        ctx.fillStyle = '#ffffff'

        // 额外文字
        ctx.font = size2 + 'px MiSans'
        ctx.fillText(text, globalOffsetX + margin, globalOffsetY + bgHeight - size2 - margin, width - margin * 2)

        // 时间
        ctx.font = size1 + 'px MiSans'
        ctx.fillText(clock, globalOffsetX + margin, globalOffsetY + bgHeight - size2 - size3 - size1 - margin - size4)

        // 时间日期分割线
        ctx.fillStyle = '#f1cc48'
        ctx.rect(globalOffsetX + margin + clockWidth + size3, globalOffsetY + bgHeight - size2 - size1 - margin, size4, size1 - size4)
        ctx.fill()
        ctx.fillStyle = '#ffffff'

        // 日期
        ctx.font = size2 + 'px MiSans'
        ctx.fillText(date, globalOffsetX + margin + clockWidth + size3 + size4 + size3, globalOffsetY + bgHeight - size2 - size3 - size1 - margin + size3 + size4)

        // 星期
        ctx.fillText(day, globalOffsetX + margin + clockWidth + size3 + size4 + size3, globalOffsetY + bgHeight - size2 - size3 - margin - size2 - size4 - size4)
      } else { // 不显示日期，纯文本

        // 半透明文字背景
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        let bgWidth = textWidth + margin + margin
        let bgHeight = size2 + margin + margin
        const t = globalOffsetMap[direction]
        const globalOffsetX = t.x.multiple * bgWidth + t.x.addition
        const globalOffsetY = t.y.multiple * bgHeight + t.y.addition
        ctx.fillRect(globalOffsetX, globalOffsetY, bgWidth, bgHeight)
        ctx.fillStyle = '#ffffff'

        // 额外文字
        ctx.font = size2 + 'px MiSans'
        ctx.fillText(text, globalOffsetX + margin, globalOffsetY + bgHeight - size2 - margin, width - margin * 2)
      }
    }

    // 保存并返回文件名
    // saveBuffer(fileName, canvas.toBuffer('image/' + suffix.replace(".", '')))
    let imageURL = await uploadImage(canvas.toBuffer('image/' + suffix.replace(".", '')), fileName)

    res.send({ imageURL, fileName: `${origin_name}_watermark_${suffix}`, 'suc': true, width, height })

  } catch (e) {
    console.log(e);
    res.send({ 'suc': false })
  }
})


// 启动显示端口
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

// 向外暴露out文件夹
// app.use('/out', express.static('./out'));

// 跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
  res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
  next();
});


// function deleteImage24hAgo() {
//   const folderPath = './out';
//   const now = Date.now();
//   const hours24 = 24 * 60 * 60 * 1000;
//   fs.readdir(folderPath, (err, files) => {
//     files.forEach(file => {
//       const filePath = path.join(folderPath, file);
//       fs.stat(filePath, (err, stats) => {
//         if ((now - stats.mtimeMs) > hours24) {
//           fs.unlink(filePath, (err) => {
//             console.log(`文件已删除: ${filePath}`);
//           });
//         }
//       });
//     });
//   });
// }

// setInterval(deleteImage24hAgo, 60 * 60 * 1000)
// deleteImage24hAgo()