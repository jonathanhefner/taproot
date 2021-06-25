import { DataMediator } from "./data-mediator.js"
import { NodeFinder } from "./node-finder.js"
import { NodeSetFinder } from "./node-set-finder.js"
import { attributeNameFor } from "./util.js"

export class Controller {
  constructor(element, descriptor) {
    this.element = element
    this.descriptor = descriptor
  }

  static defaults = {}

  get defaults() {
    return this.constructor.defaults
  }

  connect() {}
  disconnect() {}

  dataFor(element, defaults = this.defaults) {
    return DataMediator.proxy(element, this.descriptor, defaults)
  }

  get data() {
    return this.$data ??= this.dataFor(this.element)
  }

  get nodes() {
    return this.$nodes ??= NodeFinder.proxy(this.element, this.descriptor)
  }

  get nodeSets() {
    return this.$nodeSets ??= NodeSetFinder.proxy(this.element, this.descriptor)
  }
}

export function invoke(controller, method, ...args) {
  try {
    return controller[method](...args)
  } catch (error) {
    console.error(error)
  }
}

export function attributeChangedMethods(constructor, descriptor) {
  const memoized = (constructor.$attributeChangedMethods ??= Object.create(null))

  if (!memoized[descriptor]) {
    const methods = memoized[descriptor] = {}
    for (const dataName in constructor.defaults) {
      const method = `${dataName}Changed`
      if (constructor.prototype[method]) methods[attributeNameFor(descriptor, dataName)] = method
    }
  }

  return memoized[descriptor]
}

export function attributeChanged(controller, attributeName) {
  const method = attributeChangedMethods(controller.constructor, controller.descriptor)[attributeName]
  if (method) invoke(controller, method, controller.data)
}

export function connect(controller) {
  for (const attributeName in attributeChangedMethods(controller.constructor, controller.descriptor)) {
    attributeChanged(controller, attributeName)
  }
  invoke(controller, "connect")
}

export function disconnect(controller) {
  invoke(controller, "disconnect")
}
