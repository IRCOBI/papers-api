/* eslint-env jest */

const testhelper = require('./testhelper')
const maketestsite = require('./maketestsite')
const runscript = require('./runscript')

const spyclog = jest.spyOn(console, 'log').mockImplementation(testhelper.accumulog)
const spycerror = jest.spyOn(console, 'error').mockImplementation(testhelper.accumulog)

process.env.RECAPTCHA_BYPASS = 'BypassingRecaptchaTest'

describe('OWNER EDIT PUB', () => {
  it('Owner can change name and description; others cannot', async () => {
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
      await models.pubs.create({ siteId: 1, alias: 'other', name: 'Other pub', title: 'Other pub', description: 'x', email: '' })

      error = await runscript.run(models, 'tests/api-login-author1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-author-edit-pub.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-logout.json', false, app)
      if (error) throw new Error(error)

      error = await runscript.run(models, 'tests/api-login-owner1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-owner-edit-pub.json', false, app)
      if (error) throw new Error(error)

      const dbpub = await models.pubs.findByPk(1)
      expect(dbpub.name).toBe('Conf 2027')
      expect(dbpub.title).toBe('Conf 2027')
      expect(dbpub.description).toBe('Submissions for the 2027 conference.')

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
