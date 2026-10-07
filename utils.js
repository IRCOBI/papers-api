const logger = require('./logger')

let transport = false
let fromEmail = false
let adminEmail = false
let sitename = false
// Why mail isn't working, shown to supers and owners as a banner; null when mail is OK
let mailProblem = null

function setMailProblem (problem) {
  if (!mailProblem) logger.log('MAIL PROBLEM', problem)
  mailProblem = { problem, since: new Date().toISOString() }
}

function clearMailProblem () {
  mailProblem = null
}

function getMailProblem () {
  return mailProblem
}

// Report error but don't call next
function exterminate (req, res, err) {
  logger.error4req(req, 'EXTERMINATE', err)
  res.status(200).json({ ret: 1, status: err.message })
  return false
}

// Report error but don't call next
function giveup (req, res, msg) {
  logger.log4req(req, 'GIVEUP', msg)
  res.status(200).json({ ret: 1, status: msg })
  return false
}

// Return OK and don't call next
function returnOK (req, res, msg, field) {
  const rv = { ret: 0 }
  if (typeof field === 'undefined') field = 'status'
  if (field !== 'status') rv.status = 'OK'
  rv[field] = msg
  res.status(200).json(rv)
  return true
}

function setMailTransport (_transport, _fromEmail, _adminEmail, _sitename) {
  transport = _transport
  fromEmail = _fromEmail
  adminEmail = _adminEmail
  sitename = _sitename
  clearMailProblem()
}

function getSiteName () {
  return sitename
}

function asyncMail (toEmail, subject, message, bccEmail) {
  if (!transport || !fromEmail) {
    console.log('NO MAIL TRANSPORT/FROM TO SEND', subject, message)
    if (!mailProblem) setMailProblem('Mail is not set up, so emails are not being sent')
    console.log(transport)
    console.log(fromEmail)
    return
  }
  if (!toEmail) toEmail = adminEmail
  if (typeof (bccEmail) === 'undefined') bccEmail = false

  const params = {
    from: fromEmail,
    to: toEmail,
    subject,
    text: message
  }
  params.replyTo = fromEmail
  if (bccEmail) params.bcc = bccEmail

  transport.sendMail(params, (err, info) => {
    if (process.env.TESTING) console.log('sent mail:', subject, err, info)
    if (err) {
      logger.log('Send mail fail', subject, err)
      setMailProblem('Sending email failed: ' + err.message)
      return
    }
    logger.log('Sent mail OK', subject, info)
    clearMailProblem()
  })
}

const asyncSleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  exterminate,
  giveup,
  returnOK,
  asyncMail,
  asyncSleep,
  setMailTransport,
  setMailProblem,
  getMailProblem,
  getSiteName
}
