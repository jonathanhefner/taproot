import * as Controllers from "./controllers.js"
import { ElementProxyHandlerBase } from "./element-proxy-handler-base.js"
import { attributeNameFor } from "./util.js"

export function selectorFor(descriptor, nodeName) {
  return `[${attributeNameFor(descriptor, nodeName)}]:not(` +
    `:scope [${Controllers.attribute}~="${descriptor}"],` +
    `:scope [${Controllers.attribute}~="${descriptor}"] *` +
  `)`
}

export class NodeFinder extends ElementProxyHandlerBase {
  get(element, nodeName) {
    const selector = selectorFor(this.$descriptor, nodeName)
    return element.matches(selector) ? element : element.querySelector(selector)
  }
}
