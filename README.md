# Taproot

A low-budget [Stimulus](https://stimulus.hotwire.dev/) knock-off,
weighing in at 6 kB minified / 2.5 kB minified + gzipped.

The key differences are:

* The core HTML attributes are `data-controllers` and `data-actions`,
  instead of `data-controller` and `data-action`.  This lets you test
  drive Taproot and Stimulus at the same time, if desired.

* The `data-actions` syntax is:

    ```html
    <div data-actions="kebab-case-controller:kebab-case-method@event [...]" />
    ```

  Modifiers such as `+once` or `+passive` can be appended to the event.
  Likewise, the event target can be changed by appending `+document` or
  `+window` to the event.

* Implicit events are not supported, but commas can be used as shorthand
  to bind multiple actions to the same event:

    ```html
    <div data-actions="selection:all,clipboard:copy@click" />
    ```

  Likewise, commas can be used as shorthand to bind the same action to
  multiple events:

    ```html
    <input type="text" data-actions="autocomplete:suggest@change,keyup" />
    ```

* Namespaced data attributes on the controller element can be accessed
  via a controller's `data` property.  Default values can be specified
  via a static `defaults` property on the controller.  A default value
  that is neither a string nor `undefined` indicates that attribute
  should be deserialized with `JSON.parse` when reading, and serialized
  with `JSON.stringify` when writing.  For example:

    ```javascript
    class BottlesController extends Taproot.Controller {
      static defaults = { count: 99 }

      decrement() {
        this.data.count -= 1
      }
    }
    ```

  If the `data-bottles-count` attribute is not present on the controller
  element, `this.data.count` will return `99`.  Otherwise, it will
  return the value of `data-bottles-count` parsed by `JSON.parse`.

* Controllers provide a `dataFor` method that returns a proxy object
  which is similar to the `data` object for any element.  For example:

    ```javascript
    class BottlesController extends Taproot.Controller {
      static defaults = { count: 99 }

      takeN({ currentTarget }) {
        this.data.count -= this.dataFor(currentTarget, { n: 1 }).n
      }
    }
    ```

  If the `data-bottles-n` attribute is not present on `currentTarget`,
  `this.dataFor(currentTarget, { n: 1 }).n` will return `1`.  Otherwise,
  it will return the value of `data-bottles-n` parsed by `JSON.parse`.
  If the defaults argument is not specified, `dataFor` will use the
  controller's static `defaults`.

* The `nodes` and `nodeSets` controller properties can be used to query
  for nodes that have a particular namespaced attribute.  For example:

    ```javascript
    class BottlesController extends Taproot.Controller {
      static defaults = { count: 99 }

      countChanged({ count }) {
        const { status } = this.nodes
        if (status) status.textContent = `${count} bottles of beer on the wall.`
      }
    }
    ```

    `this.nodes.status` will return the first node in the controller
    element tree that has a `data-bottles-status` attribute.

* A controller's `connect` and `disconnect` methods will be invoked only
  if they reflect the state of the controller element at the time of
  invocation.  For example:

    ```javascript
    class ItemController extends Taproot.Controller {
      connect() { /* ... */ }
      disconnect() { /* ... */ }

      moveToTop() {
        this.element.parentElement.prepend(this.element)
      }

      remove() {
        this.element.remove()
      }
    }
    ```

  `moveToTop` generates two DOM mutation events because `prepend`
  removes the controller element from the DOM before prepending it to
  `parentElement`.  However, at the time both mutation events are
  processed, the controller element is no longer disconnected from the
  DOM, so neither `disconnect` nor `connect` will be invoked.

  On the other hand, `remove` permanently removes the controller element
  from the DOM.  When its corresponding mutation event is processed,
  `disconnect` will be invoked.

* The `Taproot.register` method accepts an object that maps controller
  descriptors to constructors.  It also automatically kebab-cases the
  given descriptors and strips their `-controller` suffix.  Thus, for
  example, the following are all equivalent:

    ```javascript
    import * as Taproot from "@jonathanhefner/taproot"
    import { FooController, BarController } from "./foo-and-bar.js"

    Taproot.register({ foo: FooController, bar: BarController })
    ```

    ```javascript
    import * as Taproot from "@jonathanhefner/taproot"
    import { FooController as foo, BarController as bar } from "./foo-and-bar.js"

    Taproot.register({ foo, bar })
    ```

    ```javascript
    import * as Taproot from "@jonathanhefner/taproot"
    import { FooController, BarController } from "./foo-and-bar.js"

    Taproot.register({ FooController, BarController })
    ```

    ```javascript
    import * as Taproot from "@jonathanhefner/taproot"
    import * as fooAndBar from "./foo-and-bar.js"

    Taproot.register(fooAndBar)
    ```

  `Taproot.register` can also accept a non-anonymous constructor, and
  use its name as the descriptor.  For example:

    ```javascript
    import { register, Controller } from "@jonathanhefner/taproot"

    register(class BottlesController extends Controller {
      /* ... */
    })
    ```

  will register the `bottles` descriptor to `BottlesController`.

* The `Taproot.register` method also acts as a "start" method.  Taproot
  will not start any observers or perform any initialization until after
  `register` is called.  When `register` is called, Taproot schedules a
  (re-)evaluation of all `data-controllers` elements after the current
  JavaScript task.  Therefore, `register` can be called at any time, and
  additional calls within the same JavaScript task do not incur
  additional overhead.
