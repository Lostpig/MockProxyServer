//node http-server boot

'use strict'

const libHttp = require('http'),      //HTTP协议模块
    libUrl  = require('url'),       //URL解析模块
    libPath = require('path'),
    libMinimatch = require('minimatch'),
    loader  = require('./loader'),
    logger = require('./logger')
const opn = require('opn')

const CONST = require('./const')

const defaultConfig = {
    port: 8998,
    remoteHttps: false,
    localFiles: [
        '**/*.js', '**/*.css', '**/*.html'
    ]
}

class MockProxyServer {
    constructor (config) {
        if (!config.remote) {
            throw new Error('must set remote address')
        } 
        if (config.directory) {
            this.root = config.directory
        }
        else {
            this.root = './'
        }

        this.config = Object.assign({}, defaultConfig, config)
        if (typeof this.config.port !== 'number') {
            this.config.port = parseInt(this.config.port, 10)
        }

        this.makeLocalMatch()

        this.server = libHttp.createServer(this.request.bind(this))
        this.server.on('error', (error) => {
            logger.error(error)
        })
        this.server.listen(this.config.port, () => {
            logger.normal('running at http://127.0.0.1:' + this.config.port.toString())
            if (config.openBrowser) {
                opn('http://127.0.0.1:' + this.config.port.toString())
            }
        })
    }
    makeLocalMatch () {
        const list = this.config.localFiles
        this.matchList = list.map(pattern => new libMinimatch.Minimatch(pattern))
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

        promise
        .then((result) => {
            let logFunc = logger.success
            if (result.statusCode >= 300 && result.statusCode < 400) {
                logFunc = logger.warn
            } else if (result.statusCode >= 400) {
                logFunc = logger.error
            }
            logFunc(`<${isLocal ? 'File' : result.statusCode}>:${url.path}`)
            
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
        for (let i = 0; i < this.matchList.length; i++) {
            if (this.matchList[i].match(url.pathname)) {
                return true
            }
        }
        return false
    }
}

module.exports = MockProxyServer
