'use strict'

const libUrl = require('url')
const fs = require('fs')
const path = require('path')

const mime = require('mime-types')
const request = require('request')

const CONST = require('./const')

const fileLoader = (filePath) => {
  const isExists = fs.existsSync(filePath)
  if (isExists) {
    const contentType = mime.contentType(path.extname(filePath)),
      data = fs.readFileSync(filePath)
    return {
      statusCode: CONST.STATUSCODE.SUCCESS,
      headers: {
        'Server': 'nginx',
        'Content-Type': contentType
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

const isLocalhost = (remoteUrl) => {
  return remoteUrl.hostname === 'localhost' || remoteUrl.hostname === '127.0.0.1' || remoteUrl.hostname === '0.0.0.0'
}
const requestRemote = (req, config) => {
  const remoteUrl = libUrl.parse(req.url)
  if ((config.proxyMode && remoteUrl.host === config.remote) || (!config.proxyMode && isLocalhost(remoteUrl))) {
    remoteUrl.protocol = config.remoteHttps ? 'https:' : 'http:'
    remoteUrl.host = config.remote
  }

  return new Promise((resolve, reject) => {
    let reqbody = new Buffer(0)
    req.on('data', (d) => {
      reqbody = Buffer.concat([reqbody, d])
    })
      .on('end', () => {
        let option = {
          method: req.method,
          url: libUrl.format(remoteUrl),
          headers: req.headers,
          encoding: null,
          followRedirect: false
        }
        if (reqbody.length > 0) {
          option = Object.assign(option, { body: reqbody })
        }

        request(option, (err, res, resbody) => {
          if (err) {
            reject(err)
          }
          else {
            resolve({ response: res, resBody: resbody, reqBody: reqbody })
          }
        })
      })
      .on('error', (e) => {
        reject(e)
      })
  })
}

const loadRemote = (req, config) => {
  const promise = new Promise((resolve, reject) => {
    requestRemote(req, config)
      .then((remoteRes) => {
        resolve({
          statusCode: remoteRes.response.statusCode,
          headers: remoteRes.response.headers,
          content: remoteRes.resBody
        })
      })
      .catch((error) => {
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
