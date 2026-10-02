/* eslint-env jest */

const testhelper = require('./testhelper')
const maketestsite = require('./maketestsite')
const runscript = require('./runscript')
const shortcomms = require('../lib/shortcomms')

const spyclog = jest.spyOn(console, 'log').mockImplementation(testhelper.accumulog)
const spycerror = jest.spyOn(console, 'error').mockImplementation(testhelper.accumulog)

process.env.RECAPTCHA_BYPASS = 'BypassingRecaptchaTest'

const OLD_BODY = 'Please review the following short communication.\n\nPlease note that there will not be a second round of reviews for short communications, ' +
  shortcomms.OLD_SENTENCE + '\nThank you'

describe('lib/shortcomms', () => {
  it('expands a plain Accept only for Short communication flows', () => {
    expect(shortcomms.upgradeScoreNames('Short communication', ['Accept', 'Reject']))
      .toEqual([...shortcomms.GRADED_ACCEPTS, 'Reject'])
    expect(shortcomms.upgradeScoreNames('Full paper', ['Accept', 'Reject'])).toEqual(['Accept', 'Reject'])
  })

  it('leaves already-graded options alone', () => {
    const names = [...shortcomms.GRADED_ACCEPTS, 'Reject']
    expect(shortcomms.upgradeScoreNames('Short communication', names)).toEqual(names)
  })

  it('rewords only short communication mail bodies', () => {
    expect(shortcomms.upgradeMailBody(OLD_BODY)).toContain(shortcomms.NEW_SENTENCE)
    expect(shortcomms.upgradeMailBody(OLD_BODY)).not.toContain(shortcomms.OLD_SENTENCE)
    const full = 'Full paper: ' + shortcomms.OLD_SENTENCE
    expect(shortcomms.upgradeMailBody(full)).toBe(full)
  })
})

describe('DUPLICATE PUB SHORT COMMS GRADES', () => {
  it('Duplicating a pub gives its Short communication review graded accepts and new email wording', async () => {
    let testSucceeded = false
    try {
      testhelper.initThisTest()

      const app = require('../app')
      const dbutils = require('../routes/dbutils')

      const initresult = await app.checkDatabases(maketestsite)
      if (initresult !== 1) throw new Error('initresult:' + initresult)
      const models = app.models

      const config = {}
      let error = await runscript.run(models, 'addpubsimpleflow.json', config)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/addusers.json', config)
      if (error) throw new Error(error)

      // Make pub 1 look like IRCOBI: a Short communication flow with Accept/Reject and the old email
      const dbsrcpub = await models.pubs.findByPk(1)
      const [dbsrcflow] = await dbsrcpub.getFlows()
      await dbsrcflow.update({ name: 'Short communication' })
      const dbsrcgrade = await models.flowgrades.findOne({ where: { flowId: dbsrcflow.id, name: 'Review' } })
      const srcscores = await dbsrcgrade.getFlowgradescores({ order: [['id', 'ASC']] })
      await srcscores[0].update({ weight: 10 })
      await srcscores[1].update({ weight: 20 })
      const [dbsrctemplate] = await dbsrcpub.getMailTemplates()
      await dbsrctemplate.update({ body: OLD_BODY })

      error = await runscript.run(models, 'tests/api-login-super.json', false, app)
      if (error) throw new Error(error)
      error = await runscript.run(models, 'tests/api-dup-pub1.json', false, app)
      if (error) throw new Error(error)

      const dbnewpub = await models.pubs.findOne({ where: { name: 'Next year pub' } })
      expect(dbnewpub).toBeTruthy()
      const [dbnewflow] = await dbnewpub.getFlows()
      const flow = await dbutils.getFlowWithFlowgrades(dbnewflow)
      const review = flow.flowgrades.find(g => g.name === 'Review')
      expect(review.scores.map(s => s.name)).toEqual([...shortcomms.GRADED_ACCEPTS, 'Reject'])

      const newtemplates = await dbnewpub.getMailTemplates()
      const newtemplate = newtemplates.find(t => t.name === dbsrctemplate.name)
      expect(newtemplate.body).toContain(shortcomms.NEW_SENTENCE)

      // Source (historical) pub is untouched
      const srcnow = await dbsrcgrade.getFlowgradescores({ order: [['id', 'ASC']] })
      expect(srcnow.map(s => s.name)).toEqual(['Accept', 'Reject'])
      await dbsrctemplate.reload()
      expect(dbsrctemplate.body).toBe(OLD_BODY)

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
