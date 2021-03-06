//node http-server boot

'use strict'

const http = require('http')
const libUrl = require('url')
const net = require('net')
const minimatch = require('minimatch')
const loader = require('./loader')
const logger = require('./logger')
const path = require('path')
const opn = require('opn')

const CONST = require('./const')
const ROOTPATH = process.cwd()

const defaultConfig = {
  port: 8998,
  remoteHttps: false,
  localFiles: [
    '**/*.js', '**/*.css', '**/*.html'
  ],
  redirectPath: []
}

class MockProxyServer {
  constructor (config) {
    if (!config.remote) {
      throw new Error('must set remote address')
    }
    if (config.directory) {
      this.root = path.resolve(ROOTPATH, config.directory)
    }
    else {
      this.root = ROOTPATH
    }

    this.config = Object.assign({}, defaultConfig, config)
    if (typeof this.config.port !== 'number') {
      this.config.port = parseInt(this.config.port, 10)
    }

    this.makeLocalMatch()

    this.server = http.createServer(this.request.bind(this))
    this.server.on('error', (error) => {
      logger.error(error)
    })

    if (this.config.proxyMode) {
      this.proxyHttps()
    }

    this.server.listen(this.config.port, () => {
      logger.normal('running at http://127.0.0.1:' + this.config.port.toString())
      if (config.proxyMode) {
        logger.warn('runing on Proxy Mode')
      }
      if (config.openBrowser) {
        opn('http://127.0.0.1:' + this.config.port.toString())
      }
    })
  }
  makeLocalMatch () {
    const list = this.config.localFiles
    this.matchList = list.map(pattern => new minimatch.Minimatch(pattern))
    
    const redirectPath = this.config.redirectPath
    this.redirectPathes = redirectPath.map(item => {
      return {
        matcher: new minimatch.Minimatch(item.path),
        file: item.file
      }
    })
  }
  proxyHttps () {
    this.server.on('connect', (req, client, head) => {
      const remoteUrl = libUrl.parse(`https://${req.url}`)
      let remote = net.connect(remoteUrl.port, remoteUrl.hostname, () => {
        client.write('HTTP/1.1 200 Connection Established\r\nConnection: close\r\n\r\n')
        remote.write(head)
        client.pipe(remote)
        remote.pipe(client)
      })
      client.on('end', () => {
        remote.end()
      })
      remote.on('end', () => {
        client.end()
      })
      client.on('error', (e) => {
        logger.error(e)
        remote.destroy()
      })
      remote.on('error', (e) => {
        logger.error(e)
        client.destroy()
      })
      client.on('timeout', () => {
        client.destroy()
        remote.destroy()
      })
      remote.on('timeout', () => {
        client.destroy()
        remote.destroy()
      })
    })
  }
  request (request, response) {
    const url = libUrl.parse(request.url)
    let promise
    let isLocal = this.isLocalFile(url)

    if (isLocal) {
      promise = loader.local(url, this.root)
    } else {
      promise = loader.remote(request, this.config)
    }

    if (this.config.lag && this.config.lag > 0) {
      const orgPromise = promise
      promise = new Promise((resolve) => {
        setTimeout(() => {
          resolve(orgPromise)
        }, this.config.lag)
      })
    }
    
    promise
      .then((result) => {
        let logFunc = logger.success
        if (result.statusCode >= 300 && result.statusCode < 400) {
          logFunc = logger.warn
        } else if (result.statusCode >= 400) {
          logFunc = logger.error
        }
        logFunc(`<${isLocal ? 'File' : result.statusCode}>:${url.path}`)

        if (this.config.cors) {
          result.headers['Access-Control-Allow-Origin'] = '*'
          result.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range'
        }

        response.writeHead(result.statusCode, result.headers)
        response.end(result.content)
      })
      .catch((error) => {
        logger.error(error)
        response.writeHead(CONST.STATUSCODE.NOTFOUND, 'text/html')
        response.end(error.message)
      })
  }
  isLocalFile (url) {
    let result = false
    for (let i = 0; i < this.matchList.length; i++) {
      if (this.matchList[i].match(url.pathname)) {
        result = true
        break
      }
    }
    if (!result && this.redirectPathes.length > 0) {
      for (let i = 0; i < this.redirectPathes.length; i++) {
        if (this.redirectPathes[i].matcher.match(url.pathname)) {
          url.pathname = this.redirectPathes[i].file
          result = true
          break
        }
      }
    }
    return result
  }
}

module.exports = MockProxyServer
