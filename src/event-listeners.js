import { EventListener } from "./event-listener.js"
import { camelize } from "./util.js"

const EVENT_LISTENERS = Symbol("eventListeners")

export const attribute = "data-actions"
export const selector = `[${attribute}]`

export function create(element) {
  if (!element[EVENT_LISTENERS]) update(element)
}

export function update(element) {
  const config = element.getAttribute(attribute)
  if (config === null) return destroy(element)
  const listeners = (element[EVENT_LISTENERS] ??= Object.create(null))

  clearHandlers(listeners)

  for (const [_, handlerList, eventList] of config.matchAll(/(\S+?)@(\S+)/g)) {
    const handlers = parseHandlers(handlerList)

    for (const event of parseEvents(eventList)) {
      listeners[event] ??= new EventListener(element, event)
      listeners[event].handlers.push(...handlers)
    }
  }

  deleteInactive(listeners)
}

export function destroy(element) {
  const listeners = element[EVENT_LISTENERS]
  if (!listeners) return

  for (const event in listeners) listeners[event].disconnect()
  delete element[EVENT_LISTENERS]
}

function clearHandlers(listeners) {
  for (const event in listeners) {
    listeners[event].handlers.length = 0
  }
}

function deleteInactive(listeners) {
  for (const [event, listener] of Object.entries(listeners)) {
    if (listener.handlers.length === 0) {
      listener.disconnect()
      delete listeners[event]
    }
  }
}

function parseHandlers(csv) {
  return Array.from(
    csv.matchAll(/([^,]+?):([^,]+)/g),
    ([_, controller, method]) => [controller, camelize(method)]
  )
}

function parseEvents(csv) {
  return csv.split(",")
}
