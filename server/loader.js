'use strict'

const libUrl = require('url'),
    libFs = require('fs'),
    libPath = require('path')

const libMime = require('mime-types'),
    libRequest = require('request')

const CONST = require('./const')

const fileLoader = (filePath) => {
    const isExists = libFs.existsSync(filePath)
    if (isExists) {
        const contentType = libMime.contentType(libPath.extname(filePath)),
            data = libFs.readFileSync(filePath)
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
    const filePath = libPath.join(rootPath, urlObj.pathname)

    try {
        resolve(fileLoader(filePath))
    } catch (error) {
        reject(error)
    }
})

const requestRemote = (request, config) => {
    const remoteUrl = libUrl.parse(request.url)
    remoteUrl.protocol = config.remoteHttps ? 'https:' : 'http:'
    remoteUrl.host = config.remote

    return new Promise((resolve, reject) => {
        let reqbody = new Buffer(0)
        request.on('data', (d) => {
            reqbody = Buffer.concat([reqbody, d])
        })
        .on('end', () => {
            let option = {
                method: request.method,
                url: libUrl.format(remoteUrl),
                headers: request.headers,
                encoding: null,
                followRedirect: false
            }
            if (reqbody.length > 0) {
                option = Object.assign(option, { body: reqbody })
            }

            libRequest(option, (err, response, resbody) => {
                if (err) {
                    reject(err)
                }
                else {
                    resolve({ response: response, resBody: resbody, reqBody: reqbody })
                }
            })
        })
        .on('error', (e) => {
            reject(e)
        })
    })
}
const loadRemote = (request, config) => {
    const promise = new Promise((resolve, reject) => {
        requestRemote(request, config)
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
