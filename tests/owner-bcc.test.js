/* eslint-env jest */

process.env.TESTING = process.env.TESTING || 'owner-bcc'

const utils = require('../utils')
const dbutils = require('../routes/dbutils')
const mailutils = require('../routes/mailutils')

const owner = { id: 1, email: 'owner@example.org', super: false }
const superowner = { id: 2, email: 'super@example.org', super: true }
const reviewers = [
  { id: 3, email: 'r1@example.org' },
  { id: 4, email: 'r2@example.org' },
  { id: 5, email: 'r3@example.org' }
]

// Two owner roles, with the plain owner in both
const fakepub = {
  id: 9,
  getPubroles: async () => [
    { getUsers: async () => [owner, superowner] },
    { getUsers: async () => [owner] }
  ],
  getSite: async () => ({ name: 'Test', url: 'example.org', publicsettings: '' })
}

const fakepubmail = {
  id: 7,
  name: 'test template',
  subject: 'Subject',
  body: 'Body',
  bccToOwners: true,
  sendToUser: false,
  sendToAuthor: false,
  sendToReviewers: false,
  getPubrole: async () => ({ getUsers: async () => reviewers })
}

describe('OWNER BCC', () => {
  let mails
  beforeEach(() => {
    mails = []
    jest.spyOn(utils, 'asyncMail').mockImplementation((to, subject, body, bcc) => { mails.push({ to, bcc }) })
    jest.spyOn(dbutils, 'addActionLog').mockImplementation(async () => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('copies owners once each, leaving out supers', async () => {
    const owners = await mailutils.ownersToCopy(fakepub)
    expect(owners.map(o => o.email)).toEqual(['owner@example.org'])
  })

  it('sends the owner copy with the first recipient only', async () => {
    await mailutils.sendOneTemplate(0, fakepubmail, false, fakepub, false, { id: 0 }, false, false, false, false)
    expect(mails.map(m => m.to)).toEqual(['r1@example.org', 'r2@example.org', 'r3@example.org'])
    expect(mails.map(m => m.bcc)).toEqual(['owner@example.org', false, false])
  })
})
