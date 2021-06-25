export function camelize(string) {
  return string.replace(/[_-][a-z0-9]/g, substring => substring[1].toUpperCase())
}

export function dasherize(string) {
  return string.replace(/(?!^)[A-Z]/g, "-$&").toLowerCase()
}

const descriptorAttributeNames = Object.create(null)

export function attributeNameFor(descriptor, property) {
  const attributeNames = (descriptorAttributeNames[descriptor] ??= Object.create(null))
  return attributeNames[property] ??= `data-${descriptor}${descriptor ? "-" : ""}${dasherize(property)}`
}

export function visitEach(node, selector, visitor) {
  if (node.matches?.(selector)) visitor(node)
  node.querySelectorAll?.(selector)?.forEach(visitor)
}
