/* eslint-env jest */

const testhelper = require('./testhelper')
const maketestsite = require('./maketestsite')
const runscript = require('./runscript')
const utils = require('../utils')

const spyclog = jest.spyOn(console, 'log').mockImplementation(testhelper.accumulog)
const spycerror = jest.spyOn(console, 'error').mockImplementation(testhelper.accumulog)

process.env.RECAPTCHA_BYPASS = 'BypassingRecaptchaTest'

describe('MAIL PROBLEM BANNER', () => {
  it('Owners (not authors) are told when mail is not working', async () => {
    let testSucceeded = false
    try {
      testhelper.initThisTest()

      const app = require('../app')

      const initresult = await app.checkDatabases(maketestsite)
      if (initresult !== 1) throw new Error('initresult:' + initresult)
      const models = app.models

      const config = {}
      let error = await runscript.run(models, 'addpubsimpleflow.json', config)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/addusers.json', config)
      if (error) throw new Error(error)

      utils.setMailProblem('Test mail problem')

      error = await runscript.run(models, 'tests/api-login-owner1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-pubs-mailproblem-owner.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-logout.json', false, app)
      if (error) throw new Error(error)

      error = await runscript.run(models, 'tests/api-login-author1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-pubs-mailproblem-author.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-logout.json', false, app)
      if (error) throw new Error(error)

      // Mail transport set up again clears the problem (mailproblem: null)
      utils.setMailTransport({ sendMail: () => {} }, 'from@example.org', 'admin@example.org', 'TESTS')
      expect(utils.getMailProblem()).toBeNull()
      error = await runscript.run(models, 'tests/api-login-owner1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-pubs-mailok-owner.json', false, app)
      if (error) throw new Error(error)

      testSucceeded = true
    } catch (e) {
      console.error('TEST EXCEPTION', e)
    }
    if (!testSucceeded) {
      spyclog.mockRestore()
      spycerror.mockRestore()
      console.log(testhelper.accumulogged())
    }
    expect(testSucceeded).toBe(true)
  })
})
