import { ElementProxyHandlerBase } from "./element-proxy-handler-base.js"
import { selectorFor } from "./node-finder.js"

export class NodeSetFinder extends ElementProxyHandlerBase {
  get(element, nodeName) {
    const selector = selectorFor(this.$descriptor, nodeName)
    return [...(element.matches(selector) ? [element] : []), ...element.querySelectorAll(selector)]
  }
}
