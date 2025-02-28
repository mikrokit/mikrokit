const path = require('path')

module.exports = {
  parserOptions: {
    project: [
      path.resolve(__dirname, 'tsconfig.json'), 
      path.resolve(__dirname, 'tsconfig.test.json')
    ]
  },
}