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
    console.log('[moproxy]' + getStyle('bgRed', 'bold')(message))
  },
  error: (message) => {
    console.log('[moproxy]' + getStyle('red')(message))
  },
  warn: (message) => {
    console.log('[moproxy]' + getStyle('yellow')(message))
  },
  success: (message) => {
    console.log('[moproxy]' + getStyle('green')(message))
  },
  custom: (message, ...styles) => {
    console.log('[moproxy]' + getStyle(...styles)(message))
  },
  normal: (message) => {
    console.log('[moproxy]' + message)
  }
}
