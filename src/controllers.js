import { connect, disconnect, attributeChangedMethods } from "./controller.js"
import * as AttributeObserver from "./attribute-observer.js"

const CONTROLLERS = Symbol("controllers")

const BASE = Symbol("base")
const BASE_CONTROLLERS = Object.setPrototypeOf({ [BASE]: true }, null)

export const attribute = "data-controllers"
export const selector = `[${attribute}]`

export const registry = Object.create(null)

export function register(descriptor, constructor) {
  if (registry[descriptor]) {
    console.error(`Descriptor "%s" is already registered to %o`, descriptor, registry[descriptor])
  } else {
    registry[descriptor] = constructor
  }
}

export function get(element) {
  return element[CONTROLLERS]
}

export function create(element) {
  if (element[CONTROLLERS]) {
    uproot(element)
  } else {
    update(element)
  }
}

export function update(element) {
  const config = element.getAttribute(attribute)
  if (config === null) return destroy(element)
  const controllers = (element[CONTROLLERS] ??= Object.create(null))
  const descriptors = config.match(/\S+/g)

  AttributeObserver.create(element, descriptors.flatMap(observableAttributes))

  deleteInactive(controllers, descriptors)

  for (const descriptor of descriptors) {
    const constructor = registry[descriptor]
    if (constructor && !Object.hasOwnProperty.call(controllers, descriptor)) {
      controllers[descriptor] = new constructor(element, descriptor)
      connect(controllers[descriptor])
    }
  }
}

export function destroy(element) {
  const controllers = element[CONTROLLERS]
  if (!controllers) return

  AttributeObserver.destroy(element)
  Object.values(controllers).forEach(disconnect)
  delete element[CONTROLLERS]
}


export function uproot(element) {
  if (element[CONTROLLERS]) Object.setPrototypeOf(element[CONTROLLERS], null)
}

export function resolve(element) {
  let ancestor = element.closest(selector)
  const controllers = ancestor?.[CONTROLLERS] ?? BASE_CONTROLLERS

  while (!controllers[BASE]) {
    const descendent = ancestor
    ancestor = ancestor.parentElement.closest(selector)
    Object.setPrototypeOf(descendent[CONTROLLERS], ancestor?.[CONTROLLERS] ?? BASE_CONTROLLERS)
  }

  return controllers
}

function observableAttributes(descriptor) {
  const constructor = registry[descriptor]
  return constructor ? Object.keys(attributeChangedMethods(constructor, descriptor)) : []
}

function deleteInactive(controllers, activeDescriptors) {
  for (const descriptor of Object.keys(controllers)) {
    if (!activeDescriptors.includes(descriptor)) {
      disconnect(controllers[descriptor])
      delete controllers[descriptor]
    }
  }
}
