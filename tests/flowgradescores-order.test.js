/* eslint-env jest */

const testhelper = require('./testhelper')
const maketestsite = require('./maketestsite')
const runscript = require('./runscript')

const spyclog = jest.spyOn(console, 'log').mockImplementation(testhelper.accumulog)
const spycerror = jest.spyOn(console, 'error').mockImplementation(testhelper.accumulog)

describe('FLOWGRADESCORES ORDER', () => {
  it('Decision options are returned in weight order, not insertion order', async () => {
    let testSucceeded = false
    try {
      testhelper.initThisTest()

      const app = require('../app')
      const dbutils = require('../routes/dbutils')

      const initresult = await app.checkDatabases(maketestsite)
      if (initresult !== 1) throw new Error('initresult:' + initresult)

      const config = {}
      const error = await runscript.run(app.models, 'addpubsimpleflow.json', config)
      if (error) throw new Error(error)

      // An option added later (higher id) but meant to sit between Accept and Reject
      const dbflowgrade = await app.models.flowgrades.findOne({ where: { name: 'Review' } })
      // Production uses weights 10, 20, ...
      const existing = await dbflowgrade.getFlowgradescores({ order: [['id', 'ASC']] })
      expect(existing.map(s => s.name)).toEqual(['Accept', 'Reject'])
      await existing[0].update({ weight: 10 })
      await existing[1].update({ weight: 20 })
      await app.models.flowgradescores.create({ flowgradeId: dbflowgrade.id, weight: 15, name: 'Accept - good (2)' })

      const dbflow = await dbflowgrade.getFlow()
      const flow = await dbutils.getFlowWithFlowgrades(dbflow)
      const review = flow.flowgrades.find(g => g.name === 'Review')
      expect(review.scores.map(s => s.name)).toEqual(['Accept', 'Accept - good (2)', 'Reject'])

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
