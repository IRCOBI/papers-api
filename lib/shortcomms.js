// When a publication is duplicated (eg to start next year's conference), the
// Short communication review round gets graded Accept options and a matching
// reviewer email. Sources that already have them are copied unchanged.

const GRADED_ACCEPTS = ['Accept – excellent (3)', 'Accept – good (2)', 'Accept – acceptable (1)']

const OLD_SENTENCE = 'i.e. you can either accept or reject the manuscript.'
const NEW_SENTENCE = 'i.e. you can either accept the manuscript, rating it Excellent (3), Good (2) or Acceptable (1), or reject it.'

function isShortCommsFlow (flowname) {
  return /^short communication/i.test(flowname || '')
}

// Given the source scores (in display order), return the names to create.
// A plain 'Accept' expands into the three graded accepts; everything else is kept.
function upgradeScoreNames (flowname, names) {
  if (!isShortCommsFlow(flowname)) return names
  if (names.some(n => GRADED_ACCEPTS.includes(n))) return names
  const out = []
  for (const name of names) {
    if (name === 'Accept') out.push(...GRADED_ACCEPTS)
    else out.push(name)
  }
  return out
}

function upgradeMailBody (body) {
  if (!body || !/short communication/i.test(body)) return body
  return body.replace(OLD_SENTENCE, NEW_SENTENCE)
}

module.exports = { GRADED_ACCEPTS, OLD_SENTENCE, NEW_SENTENCE, isShortCommsFlow, upgradeScoreNames, upgradeMailBody }
