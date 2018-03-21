'use strict'

const libUrl = require('url')
const fs = require('fs')
const path = require('path')

const mime = require('mime-types')
const request = require('request')
const zlib = require('zlib')

const CONST = require('./const')

const isToString = (contentType) => {
  return contentType && (contentType.indexOf('text/html') >= 0 ||
    contentType.indexOf('application/json') >= 0 ||
    contentType.indexOf('application/javascript') >= 0)
}
const resolveBody = (res, body) => {
  const encoding = res.headers['content-encoding']
  delete res.headers['content-encoding']
  return new Promise((resolve, reject) => {
    const unzipCallback = (err, result) => {
      if (err) {
        reject(err)
      } else {
        if (isToString(res.headers['content-type'])) {
          resolve(result.toString())
        } else {
          resolve(result)
        }
      }
    }

    if (encoding === 'gzip') {
      zlib.gunzip(body, unzipCallback)
    } else if (encoding === 'deflate') {
      zlib.inflate(body, unzipCallback)
    } else {
      unzipCallback(null, body)
    }
  })
}

const fileLoader = (filePath) => {
  const isExists = fs.existsSync(filePath)
  if (isExists) {
    const contentType = mime.contentType(path.extname(filePath)),
      data = fs.readFileSync(filePath)
    return {
      statusCode: CONST.STATUSCODE.SUCCESS,
      headers: {
        'Server': 'nginx',
        'Content-Type': contentType,
        'cache-control': 'max-age=3600'
      },
      content: data
    }
  } else {
    throw new Error(`file not found:${filePath}`)
  }
}

const loadLocal = (urlObj, rootPath) => new Promise((resolve, reject) => {
  const filePath = path.join(rootPath, urlObj.pathname)

  try {
    resolve(fileLoader(filePath))
  } catch (error) {
    reject(error)
  }
})

const requestRemote = (req, config) => {
  const remoteUrl = libUrl.parse(req.url)
  if ((config.proxyMode && remoteUrl.host === config.remote) || !config.proxyMode) {
    remoteUrl.protocol = config.remoteHttps ? 'https:' : 'http:'
    remoteUrl.host = config.remote
  }

  return new Promise((resolve, reject) => {
    let reqbody = new Buffer(0)
    req.on('data', (d) => {
      reqbody = Buffer.concat([reqbody, d])
    }).on('end', () => {
      req.headers.host = remoteUrl.host
      if (req.headers.origin) {
        req.headers.origin = remoteUrl.protocol + '//' + remoteUrl.host
      }
      if (req.headers.referer) {
        const refererUrl = libUrl.parse(req.headers.referer)
        refererUrl.protocol = remoteUrl.protocol
        refererUrl.host = remoteUrl.host
        req.headers.referer = libUrl.format(refererUrl)
      }
      
      let option = {
        method: req.method,
        url: libUrl.format(remoteUrl),
        headers: req.headers,
        encoding: null,
        followRedirect: false,
      }
      if (reqbody.length > 0) {
        option = Object.assign(option, { body: reqbody })
      }

      request(option, (err, res, resbody) => {
        if (err) {
          reject(err)
        }
        else {
          resolveBody(res, resbody).then((body) => {
            resolve({ response: res, resBody: body, reqBody: reqbody })
          }).catch(err => {
            reject(err)
          })
        }
      })
    }).on('error', (e) => {
      reject(e)
    })
  })
}

const loadRemote = (req, config) => {
  const promise = new Promise((resolve, reject) => {
    requestRemote(req, config).then((remoteRes) => {
      let result = {
        statusCode: remoteRes.response.statusCode,
        headers: remoteRes.response.headers,
        content: remoteRes.resBody
      }
      if (config.preProcess && typeof config.preProcess === 'function') {
        result = config.preProcess(req.url, result)
      }
      resolve(result)
    }).catch((error) => {
      reject(error)
    })
  })

  return promise
}

const loader = {
  local: loadLocal,
  remote: loadRemote
}

module.exports = loader
