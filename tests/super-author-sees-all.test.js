/* eslint-env jest */

process.env.TESTING = process.env.TESTING || 'super-author-sees-all'

const dbutils = require('../routes/dbutils')

// A super whose only role on a pub is Author must still see everyone's submissions there
function makeReq (isSuper, roles) {
  return {
    dbpub: { id: 12 },
    dbuser: {
      id: 5,
      name: 'someone',
      super: isSuper,
      getPublications: async () => [{ id: 12 }],
      getRoles: async () => roles
    }
  }
}

const authorRole = { id: 1, pubId: 12, name: 'Author', defaultrole: true, isowner: false, canviewall: false }

describe('SUPER WITH AUTHOR ROLE', () => {
  it('a super with only an Author role is not limited to their own submissions', async () => {
    const req = makeReq(true, [authorRole])
    expect(await dbutils.getMyRoles(req)).toBe(true)
    expect(req.isowner).toBe(true)
    expect(req.onlyanauthor).toBe(false)
    expect(req.isauthor).toBe(true)
  })

  it('a non-super with only an Author role still sees just their own', async () => {
    const req = makeReq(false, [authorRole])
    expect(await dbutils.getMyRoles(req)).toBe(true)
    expect(req.isowner).toBe(false)
    expect(req.onlyanauthor).toBe(true)
  })
})
