import * as Controllers from "./controllers.js"
import * as EventListeners from "./event-listeners.js"
import { dasherize, visitEach } from "./util.js"

let pendingInitialize = false

function enqueueInitialize() {
  if (pendingInitialize) return

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize)
  } else {
    queueMicrotask(initialize)
  }

  pendingInitialize = true
}

let initialized = false

function initialize() {
  const tree = document.documentElement

  if (initialized) {
    visitEach(tree, Controllers.selector, Controllers.update)
  } else {
    observer.observe(tree, {
      childList: true,
      attributeFilter: [Controllers.attribute, EventListeners.attribute],
      subtree: true,
    })
    connect(tree)
  }

  initialized = true
  pendingInitialize = false
}

const observer = new MutationObserver(mutationRecords => {
  for (const { type, target, addedNodes, removedNodes, attributeName } of mutationRecords) {
    if (type === "childList") {
      addedNodes.forEach(connect)
      removedNodes.forEach(disconnect)
    } else if (attributeName === Controllers.attribute) {
      const previousControllers = Controllers.get(target)
      Controllers.update(target)
      if (previousControllers !== Controllers.get(target)) {
        target.querySelectorAll(Controllers.selector).forEach(Controllers.uproot)
      }
    } else if (attributeName === EventListeners.attribute) {
      EventListeners.update(target)
    }
  }
})

function connect(subtree) {
  if (subtree.isConnected) {
    visitEach(subtree, Controllers.selector, Controllers.create)
    visitEach(subtree, EventListeners.selector, EventListeners.create)
  }
}

function disconnect(subtree) {
  if (!subtree.isConnected) {
    visitEach(subtree, Controllers.selector, Controllers.destroy)
    visitEach(subtree, EventListeners.selector, EventListeners.destroy)
  }
}

export function register(...args) {
  for (let arg of args) {
    if (typeof arg === "function") arg = { [arg.name]: arg }

    for (const name in arg) {
      Controllers.register(dasherize(name).replace(/-controller$/, ""), arg[name])
    }
  }

  enqueueInitialize()
}
