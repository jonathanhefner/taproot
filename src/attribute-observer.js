import * as Controllers from "./controllers.js"
import { attributeChanged } from "./controller.js"

const ATTRIBUTE_OBSERVER = Symbol("attributeObserver")

export function create(element, attributeNames) {
  if (attributeNames.length) {
    element[ATTRIBUTE_OBSERVER] ??= new MutationObserver(process)
    element[ATTRIBUTE_OBSERVER].observe(element, { attributeFilter: attributeNames, attributeOldValue: true })
  } else {
    destroy(element)
  }
}

export function destroy(element) {
  element[ATTRIBUTE_OBSERVER]?.disconnect()
  delete element[ATTRIBUTE_OBSERVER]
}

function process(mutationRecords) {
  const changed = {}
  for (const { target, attributeName, oldValue } of mutationRecords) {
    changed[attributeName] ??= oldValue !== target.getAttribute(attributeName)
  }

  let controllers
  for (const attributeName in changed) {
    if (changed[attributeName]) {
      controllers ??= Object.values(Controllers.get(mutationRecords[0].target))
      for (const controller of controllers) {
        attributeChanged(controller, attributeName)
      }
    }
  }
}
