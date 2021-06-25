import * as Controllers from "./controllers.js"
import { invoke } from "./controller.js"

const modifierOptions = {
  capture: { capture: true },
  passive: { passive: true },
  notpassive: { passive: false },
  once: { once: true },
  document: { target: document },
  window: { target: window },
}

function stopImmediatePropagation() {
  this.immediatePropagationStopped = true
  return Event.prototype.stopImmediatePropagation.call(this)
}

export class EventListener {
  constructor(element, event) {
    const [type, ...modifiers] = event.split("+")
    const { target, ...options } = Object.assign({}, ...modifiers.map(modifier => modifierOptions[modifier]))
    this.element = element
    this.handlers = []
    this.target = target || element
    this.type = type
    this.target.addEventListener(this.type, this, options)
  }

  disconnect() {
    this.target.removeEventListener(this.type, this)
  }

  handleEvent(event) {
    event.stopImmediatePropagation = stopImmediatePropagation
    const controllers = Controllers.resolve(this.element)

    for (const [controller, method] of this.handlers) {
      if (controllers[controller]) invoke(controllers[controller], method, event)
      if (event.immediatePropagationStopped) break
    }
  }
}
