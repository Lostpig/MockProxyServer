'use strict'

const chalk = require('chalk')

const getStyle = (...styles) => {
  let style = chalk
  for (let val of styles) {
    style = style[val]
  }
  return style
}

module.exports = {
  exception: (message) => {
    console.log('[MockProxyServer]' + getStyle('bgRed', 'bold')(message))
  },
  error: (message) => {
    console.log('[MockProxyServer]' + getStyle('red')(message))
  },
  warn: (message) => {
    console.log('[MockProxyServer]' + getStyle('yellow')(message))
  },
  success: (message) => {
    console.log('[MockProxyServer]' + getStyle('green')(message))
  },
  custom: (message, ...styles) => {
    console.log('[MockProxyServer]' + getStyle(...styles)(message))
  },
  normal: (message) => {
    console.log('[MockProxyServer]' + message)
  }
}
