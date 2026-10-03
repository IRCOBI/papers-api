/* eslint-env jest */

const testhelper = require('./testhelper')
const maketestsite = require('./maketestsite')
const runscript = require('./runscript')

const spyclog = jest.spyOn(console, 'log').mockImplementation(testhelper.accumulog)
const spycerror = jest.spyOn(console, 'error').mockImplementation(testhelper.accumulog)

process.env.RECAPTCHA_BYPASS = 'BypassingRecaptchaTest'

describe('OWNER DUPLICATE AND DELETE PUB', () => {
  it('Owner can duplicate, owns the copy, deletes an empty pub but not one with submissions', async () => {
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

      // Give pub 1 a submission
      error = await runscript.run(models, 'tests/api-login-author1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-add-proposal-author.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-logout.json', false, app)
      if (error) throw new Error(error)

      error = await runscript.run(models, 'tests/api-login-owner1.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-owner-dup-delete-pub.json', false, app)
      if (error) throw new Error(error)
      expect(await models.pubs.findByPk(2)).toBeNull()
      expect(await models.pubs.findByPk(1)).toBeTruthy()

      // A kept copy is owned by the owner who made it, though users weren't copied
      error = await runscript.run(models, 'tests/api-owner-dup-pub-keep.json', false, app)
      if (error) throw new Error(error)
      const dbcopy = await models.pubs.findOne({ where: { name: 'Owner kept copy' } })
      const dbowner1 = await models.users.findOne({ where: { username: 'owner1' } })
      expect(await dbcopy.hasUser(dbowner1)).toBe(true)
      const ownerroles = (await dbcopy.getPubroles()).filter(r => r.isowner)
      expect(ownerroles.length).toBeGreaterThan(0)
      for (const role of ownerroles) {
        expect(await role.hasUser(dbowner1)).toBe(true)
      }

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
