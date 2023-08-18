const { createError } = require('apollo-errors')
const ForbiddenError = createError('ForbiddenError', { message: 'Forbidden' })
console.log('ForbiddenError=', ForbiddenError)
const NoIntrospection = (context) => {
  return {
    Field (node) {
      console.log(node)
      const nodeValue = node.name.value
      console.log('nodeValue=', nodeValue)
      if (nodeValue === '__schema' || nodeValue === '__type') {
        context.reportError(new ForbiddenError())
      }
    }
  }
}

module.exports = { NoIntrospection }
