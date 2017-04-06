module.exports = {
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "extends": ["airbnb"],
  "rules": {
    "no-use-before-define": [2, { "functions": false }]
  }
}