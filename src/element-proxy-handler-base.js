export class ElementProxyHandlerBase {
  static proxy(element, descriptor, ...args) {
    return new Proxy(element, new this(descriptor, ...args))
  }

  constructor(descriptor) {
    this.$descriptor = descriptor ?? ""
  }

  has(element, property) { return true }
  ownKeys(element) { return [] }
  deleteProperty(element, property) { return true }
}
