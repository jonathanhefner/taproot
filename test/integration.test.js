describe("Taproot", () => {

  const checkIs = function(expected, received) {
    return {
      pass: Object.is(expected, received),
      message: () =>
        `Expected: ${this.isNot ? "not " : ""}${this.utils.printExpected(expected)}\n` +
        `Received: ${this.utils.printReceived(received)}`
    }
  }

  expect.extend({
    async toHaveDataAttribute(element, name, expected) {
      const received = await element.evaluate((element, name) => element.getAttribute(`data-integration-test-${name}`), name)
      return checkIs.call(this, expected, received)
    },

    async toHaveInnerText(element, expected) {
      const received = await element.evaluate(element => element.innerText)
      return checkIs.call(this, expected, received)
    }
  })


  const makeControllerWith = async (innerHTML) => {
    const html = `<div data-controllers="integration-test">${innerHTML}</div>`
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), html)
    return await page.$$("body > div:last-child, body > div:last-child *")
  }

  const makeController = async () => (await makeControllerWith(""))[0]


  beforeEach(async () => {
    await page.goto("http://localhost:8080/test/integration.test.html")
  })


  it("connects controller when added", async () => {
    const controllerEl = await makeController()

    await expect(controllerEl).toHaveDataAttribute("connected-count", "1")
  })


  it("disconnects controller when removed", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.remove())

    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
  })

  it("disconnects controller when descriptor removed", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.removeAttribute("data-controllers"))

    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
  })

  it("disconnects controller when descriptor replaced", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.setAttribute("data-controllers", "foo"))

    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
  })


  it("reconnects controller when re-added later", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.remove())
    await controllerEl.evaluate(el => document.body.append(el))

    await expect(controllerEl).toHaveDataAttribute("connected-count", "2")
    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
  })

  it("reconnects controller when descriptor re-added later", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.removeAttribute("data-controllers"))
    await controllerEl.evaluate(el => el.setAttribute("data-controllers", "integration-test"))

    await expect(controllerEl).toHaveDataAttribute("connected-count", "2")
    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
  })


  it("keeps controller connected when re-added immediately", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => {
      el.remove()
      document.body.append(el)
    })

    await expect(controllerEl).toHaveDataAttribute("connected-count", "1")
    await expect(controllerEl).toHaveDataAttribute("disconnected-count", null)
  })

  it("keeps controller connected when descriptor re-added immediately", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => {
      el.removeAttribute("data-controllers")
      el.setAttribute("data-controllers", "integration-test")
    })

    await expect(controllerEl).toHaveDataAttribute("connected-count", "1")
    await expect(controllerEl).toHaveDataAttribute("disconnected-count", null)
  })

  it("keeps controller connected when adding new descriptor", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.setAttribute("data-controllers", "integration-test foo"))

    await expect(controllerEl).toHaveDataAttribute("connected-count", "1")
    await expect(controllerEl).toHaveDataAttribute("disconnected-count", null)
  })


  it("supports registering controllers under different names", async () => {
    await page.evaluate(() => Taproot.register({
      "IntegrationTestAlsoController": IntegrationTestController,
      "integration-test-2": IntegrationTestController,
    }))
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.setAttribute("data-controllers", "integration-test-also integration-test-2"))

    await expect(controllerEl).toHaveDataAttribute("disconnected-count", "1")
    await expect(controllerEl).toHaveDataAttribute("also-connected-count", "1")
    await expect(controllerEl).toHaveDataAttribute("2-connected-count", "1")
  })

  it("connects newly-registered controllers", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => el.setAttribute("data-controllers", "integration-test-also"))

    await expect(controllerEl).toHaveDataAttribute("also-connected-count", null)
    await page.evaluate(() => Taproot.register({ "IntegrationTestAlsoController": IntegrationTestController }))
    await expect(controllerEl).toHaveDataAttribute("also-connected-count", "1")
  })


  it("invokes data-changed method when connecting controller", async () => {
    const [controllerEl, greetableEl] = await makeControllerWith(`
      <p data-integration-test-greetable data-integration-test-greetings-ledger></p>
    `)

    await expect(greetableEl).toHaveInnerText("Hello, World!")
    await expect(greetableEl).toHaveDataAttribute("greetings-count", "1")
  })

  it("invokes data-changed method when data changed", async () => {
    const [controllerEl, greetableEl] = await makeControllerWith(`
      <p data-integration-test-greetable data-integration-test-greetings-ledger></p>
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(greetableEl).toHaveInnerText("hey")
    await expect(greetableEl).toHaveDataAttribute("greetings-count", "2")
  })

  it("invokes data-changed method only once per batch of changes", async () => {
    const [controllerEl, greetingCounter] = await makeControllerWith(`
      <p data-integration-test-greetings-ledger></p>
    `)
    await controllerEl.evaluate(el => {
      el.setAttribute("data-integration-test-greeting", "hey")
      el.setAttribute("data-integration-test-greeting", "hi")
      el.setAttribute("data-integration-test-greeting", "hello")
    })
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(greetingCounter).toHaveDataAttribute("greetings-count", "3")
  })

  it("does not invoke data-changed method when data has not changed", async () => {
    const [controllerEl, greetingCounter] = await makeControllerWith(`
      <p data-integration-test-greetings-ledger></p>
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))
    await controllerEl.evaluate(el => {
      el.setAttribute("data-integration-test-greeting", "hello")
      el.setAttribute("data-integration-test-greeting", "hi")
      el.setAttribute("data-integration-test-greeting", "hey")
    })

    await expect(greetingCounter).toHaveDataAttribute("greetings-count", "2")
  })


  it("can select controller's own element when querying nodes", async () => {
    const controllerEl = await makeController()
    await controllerEl.evaluate(el => {
      el.setAttribute("data-integration-test-greetable", "")
      el.setAttribute("data-integration-test-greetings-ledger", "")
      el.setAttribute("data-integration-test-greeting", "hey")
    })

    await expect(controllerEl).toHaveInnerText("hey")
    await expect(controllerEl).toHaveDataAttribute("greetings-count", "1")
  })

  it("can select nested controller element when querying nodes", async () => {
    await page.evaluate(() => Taproot.register({ "another-one": IntegrationTestController }))
    const [controllerEl, nestedControllerEl] = await makeControllerWith(`
      <div data-controllers="another-one"
        data-integration-test-greetable data-integration-test-greetings-ledger />
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(nestedControllerEl).toHaveInnerText("hey")
    await expect(nestedControllerEl).toHaveDataAttribute("greetings-count", "2")
  })

  it("does not select same-descriptor nested controller element when querying nodes", async () => {
    const [controllerEl, nestedControllerEl] = await makeControllerWith(`
      <div data-controllers="integration-test"
        data-integration-test-greetable data-integration-test-greetings-ledger />
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(nestedControllerEl).toHaveInnerText("Hello, World!")
    await expect(nestedControllerEl).toHaveDataAttribute("greetings-count", "1")
  })

  it("can select within nested controller element when querying nodes", async () => {
    await page.evaluate(() => Taproot.register({ "another-one": IntegrationTestController }))
    const [controllerEl, nestedControllerEl, nestedGreetableEl] = await makeControllerWith(`
      <div data-controllers="another-one">
        <p data-integration-test-greetable data-integration-test-greetings-ledger></p>
      </div>
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(nestedGreetableEl).toHaveInnerText("hey")
    await expect(nestedGreetableEl).toHaveDataAttribute("greetings-count", "2")
  })

  it("does not select within same-descriptor nested controller element when querying nodes", async () => {
    const [controllerEl, nestedControllerEl, nestedGreetableEl] = await makeControllerWith(`
      <div data-controllers="integration-test">
        <p data-integration-test-greetable data-integration-test-greetings-ledger></p>
      </div>
    `)
    await controllerEl.evaluate(el => el.setAttribute("data-integration-test-greeting", "hey"))

    await expect(nestedGreetableEl).toHaveInnerText("Hello, World!")
    await expect(nestedGreetableEl).toHaveDataAttribute("greetings-count", "1")
  })


  it("invokes action on event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click" data-integration-test-greeting="hey" />
    `)
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")
  })

  it("invokes multiple actions on event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click integration-test:upcase-greeting@click"
        data-integration-test-greeting="hey" />
    `)
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")
  })

  it("invokes multiple CSV actions on event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting,integration-test:upcase-greeting@click"
        data-integration-test-greeting="hey" />
    `)
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")
  })

  it("invokes action on multiple CSV events", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@mouseup,keydown integration-test:upcase-greeting@mouseup"
        data-integration-test-greeting="hey" />
    `)

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")

    await buttonEl.press("Space")
    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")
  })


  it("invokes newly-added action on event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-integration-test-greeting="hey" />
    `)
    await buttonEl.evaluate(el => el.setAttribute("data-actions", "integration-test:set-greeting@click"))
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")
  })

  it("does not invoke removed action on event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click" data-integration-test-greeting="hey" />
    `)
    await buttonEl.evaluate(el => el.removeAttribute("data-actions"))
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", null)
  })

  it("does not invoke action on event for removed controller", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click" data-integration-test-greeting="hey" />
    `)
    await controllerEl.evaluate(el => el.remove())
    await buttonEl.evaluate(el => el.click())

    await expect(controllerEl).toHaveDataAttribute("greeting", null)
  })


  it("stops invoking actions when stopImmediatePropagation is called", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click integration-test:stop@click integration-test:upcase-greeting@click"
        data-integration-test-greeting="hey" />
    `)
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")
  })

  it("continues invoking actions when an error is thrown", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:oops@click integration-test:upcase-greeting@click" />
    `)
    await buttonEl.click()

    await expect(controllerEl).toHaveDataAttribute("greeting", "OOPS")
  })


  it("supports event listener modifiers", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@click integration-test:upcase-greeting@click+once"
        data-integration-test-greeting="hey" />
    `)

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")
  })

  it("supports event listener modifiers per CSV event", async () => {
    const [controllerEl, buttonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@mouseup integration-test:upcase-greeting@keydown,mouseup+once"
        data-integration-test-greeting="hey" />
    `)

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")

    await buttonEl.press("Space")
    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")
  })

  it("supports event listener target", async () => {
    const [controllerEl, buttonEl, otherButtonEl] = await makeControllerWith(`
      <button data-actions="integration-test:set-greeting@mouseup integration-test:upcase-greeting@keydown+document"
        data-integration-test-greeting="hey" />
      <button />
    `)

    await buttonEl.click()
    await expect(controllerEl).toHaveDataAttribute("greeting", "hey")

    await otherButtonEl.press("Space")
    await expect(controllerEl).toHaveDataAttribute("greeting", "HEY")
  })

})
