import { ElementProxyHandlerBase } from "./element-proxy-handler-base.js"
import { attributeNameFor } from "./util.js"

function isString(value) {
  return value === undefined || typeof value === "string"
}

function serialize(value, defaultValue) {
  return isString(defaultValue) ? value : JSON.stringify(value)
}

function deserialize(string, defaultValue) {
  return isString(defaultValue) ? string : JSON.parse(string)
}

export class DataMediator extends ElementProxyHandlerBase {
  constructor(descriptor, defaults) {
    super(descriptor)
    this.$defaults = defaults
  }

  get(element, dataName) {
    const value = element.getAttribute(attributeNameFor(this.$descriptor, dataName))
    const defaultValue = this.$defaults[dataName]
    return value === null ? defaultValue : deserialize(value, defaultValue)
  }

  set(element, dataName, value) {
    const attributeName = attributeNameFor(this.$descriptor, dataName)

    if (value === undefined) {
      element.removeAttribute(attributeName)
    } else {
      element.setAttribute(attributeName, serialize(value, this.$defaults[dataName]))
    }

    return value
  }
}
