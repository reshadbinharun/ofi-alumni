var express = require('express');
var router = express.Router();
var passport = require("passport");
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var crypto = require('crypto-random-string');
var alumniSchema = require('../models/alumniSchema');
var studentSchema = require('../models/studentSchema');
var schoolSchema = require('../models/schoolSchema');
var adminSchema = require('../models/adminSchema');
var collegeRepSchema = require('../models/collegeRepSchema');
var userSchema = require('../models/userSchema');
var pollOptionSchema = require('../models/polls/pollOptionSchema');
var htmlBuilder = require("./helpers/emailBodyBuilder").buildBody
require('dotenv').config();
var path = require('path');
var sendPasswordChangeEmail = require('./helpers/emailHelpers').sendPasswordChangeEmail
var sendTemporaryPasswordEmail = require('./helpers/emailHelpers').sendTemporaryPasswordEmail

const APP_LINK = process.env.APP || 'http://localhost:3000/'

const HASH_COST = 10;

const JWT_SECRET = process.env.JWT_SECRET || 'secret_sauce';
const JWT_EXPIRATION_MS = process.env.JWT_EXPIRATION_MS || '25000000'; // > 6 hrs;

router.get('/', function(req, res, next) {
  let filepath = path.join(__dirname, '../build', 'index.html')
  res.sendFile(filepath);
});

router.get('/logout', (req, res, next) => {
  try {
    res.clearCookie('jwt');
    res.json({message: "Logout successful."})
  } catch (e) {
    console.log("Error: logout", e);
    res.status(500).json({message: 'Failed to clear cookie.'})
  }
});

// login route
router.post('/login', (req, res, next) => {
  passport.authenticate(
    'local',
    (error, user, info) => {
      if (error) {
        res.status(500).send({ error });
      } else if (!user) {
        res.status(404).send({ error: 'The user was not found on the system!' });
      } else {
        var payload = {
          role: user.role,
          expires: Date.now() + parseInt(JWT_EXPIRATION_MS),
        };
        req.login(payload, {session: false}, async (error) => {
          if (error) {
            return next(error);
          }
          try {
            let userRole = user.role && user.role.map(role => {
              return role.toUpperCase()
            })
            if (!user.emailVerified) {
              res.status(404).send({ error: `Please verify your email! Check your inbox for a verification email. Sometimes this email may end up in your spam/junk/promotions folder.` });
              return;
            }
            let cookie = null
            if (userRole.includes("ALUMNI")) {
              const alumni = await alumniSchema.findOne({user: user._id})
              // TODO: bar login for unapproved when users reach critical mass
              // if (!alumni.approved) {
              //   res.status(404).send({ error: `Your account is currently pending approval.` });
              //   return;
              // }
              payload.id = alumni._id
              cookie = jwt.sign(JSON.stringify(payload), JWT_SECRET);
            } else if (userRole.includes("STUDENT")) {
              const student = await studentSchema.findOne({user: user._id});
              // TODO: bar login for unapproved when users reach critical mass
              // if (!student.approved) {
              //   res.status(404).send({ error: `Your account is currently pending approval.` });
              //   return;
              // }
              payload.id = student._id
              cookie = jwt.sign(JSON.stringify(payload), JWT_SECRET);
              // set jwt-signed cookie on response
              res.cookie('jwt', cookie);
            } else if (userRole.includes("ADMIN")) {
              const admin = await adminSchema.findOne({user: user._id});
              if (!admin.approved) {
                res.status(404).send({ error: `Your account is currently pending approval.` });
                return;
              }
              payload.id = admin._id
              cookie = jwt.sign(JSON.stringify(payload), JWT_SECRET);
            } else if (userRole.includes("COLLEGE_REP")) {
              const collegeRep = await collegeRepSchema.findOne({user: user._id});
              if (!collegeRep.approved) {
                res.status(404).send({ error: `Your account is currently pending approval.` });
                return;
              }
              payload.id = collegeRep._id
              cookie = jwt.sign(JSON.stringify(payload), JWT_SECRET);
            } else {
              res.status(500).send({error: true, message: 'Could not determine role.'});
            }
            res.cookie('jwt', cookie);
            res.status(200).json({message: 'Login successful!'})
          } catch (e) {
            console.log("Error: error fetching user after authentication", e);
            res.status(500).send({ error: e });
          }
        });
      }
    })(req, res)
});

router.get('/verification/:email/:verificationToken', async (req, res, next) => {
  const email = req.params.email
  const verificationToken = req.params.verificationToken
  try{
    var user = await userSchema.findOne({'email': email});
    if (verificationToken === user.verificationToken) {
      user.emailVerified = true;
      await user.save()
      res.status(200).send(htmlBuilder('Welcome aboard!', 'Thank you for verifying your email!', 'Go To App', APP_LINK))
    } else {
      res.status(500).send({message: 'Your token could not be verified!'})
    }
  } catch(e) {
    console.log("Error index.js#verification", e)
    res.status(500).json(e)
  }

});

router.post('/password/change', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
  try {
    const password = req.body.newPassword
    const userId = req.body.userId
    const passwordHash = await bcrypt.hash(password, HASH_COST);
    let user = await userSchema.findById(userId)
    user.passwordHash = passwordHash
    await user.save()
    res.status(200).send({message: 'Successfully changed password!'})
  } catch(e) {
    console.log("Error index.js#password/change", e)
    res.status(500).send({success:false, error: e})
  }
});

router.post('/password/forgot', async (req, res, next) => {
  try {
    let email = req.body.email
    let user = await userSchema.findOne({email: email})
    let passwordChangeToken = crypto({length: 16})
    user.passwordChangeToken = passwordChangeToken;
    await user.save()
    // do not wait on sending email
    sendPasswordChangeEmail(email, passwordChangeToken)
    res.status(200).send({message: 'We have sent you an email with further instructions!'})
  } catch (e) {
    console.log("Error index.js#password/change", e)
    res.status(500).json(e)
  }
});

router.get('/tempPassword/:to/:token', async (req, res, next) => {
  try {
    let email = req.params.to
    let passwordChangeToken = req.params.token
    var user = await userSchema.findOne({'email': email});
    if (!user) {
      res.status(404).send({message: 'Could not find a user with given email!'})
    }
    if (passwordChangeToken === user.passwordChangeToken) {
      let newTempPass = crypto({length: 10})
      let passwordHash = await bcrypt.hash(newTempPass, HASH_COST)
      user.passwordHash = passwordHash
      user.passwordChangeToken = null // reset token to prevent multiple password changes with stale link
      await user.save()
      // do not wait on sending email
      sendTemporaryPasswordEmail(email, newTempPass)
      res.status(200).send(htmlBuilder('Thanks!', 'Thank you for verifying your request for a password change! We will send you an email with a temporary password shortly.', 'Go To App', APP_LINK))
    } else {
      res.status(500).send(htmlBuilder('Whoops!', 'Your password change token could not be verified. Please contact support at onefootincollege@gmail.com', 'Go To App', APP_LINK))
    }
  } catch(e) {
    console.log("Error index.js#tempPassword", e)
    res.status(500).json(e)
  }
});

router.get('/unsubscribe/:to/:token', async (req, res, next) => {
  try {
    let email = req.params.to
    let unsubscribeToken = req.params.token
    var user = await userSchema.findOne({'email': email});
    if (!user) {
      res.status(404).send({message: 'Could not find a user with given email!'})
    }
    if (unsubscribeToken === user.emailSubscriptionToken) {
      user.emailSubscribed = false
      // refresh subscription token
      user.emailSubscriptionToken = crypto({length: 16})
      await user.save()
      res.status(200).send(htmlBuilder('Unsubscribed!', 'You have sucessfully unsubscribed from all daily digests! You will find the option to resubscribe to these weekly digests on your Profile', 'Go To App', APP_LINK))
    } else {
      res.status(500).send(htmlBuilder('Whoops!', 'Something went wrong! Please contact support at onefootincollege@gmail.com', 'Go To App', APP_LINK))
    }
  } catch(e) {
    console.log("Error index.js#unsubscribe", e)
    res.status(500).json(e)
  }
});

router.get('/isLoggedIn', passport.authenticate('jwt', {session: false}), (req, res, next) => {
  res.json({message: "You have a fresh cookie!"});
});

router.get('/polls/:id', 
  passport.authenticate('jwt', {session: false}),
  async (req, res, next) => {
  try {
    let id = req.params.id
    let userRecord = await userSchema.findById(id)
    await userRecord.populate('pollsQueued').execPopulate()
    for (let poll of userRecord.pollsQueued) {
      await poll.populate('options').execPopulate()
    }
    // send most recent 10 polls
    let mostRecentTenPolls = userRecord.pollsQueued.slice(-10)
    res.status(200).json({polls: mostRecentTenPolls})
  } catch (e) {
    console.log("poll fetch error" + e)
    res.status(500).send({message: "polls fetch error" + e})
  }
});

router.patch('/answerPoll/:pollId/:pollOptionId/:userId',
  passport.authenticate('jwt', {session: false}),
  async (req, res, next) => {
    let pollId = req.params.pollId
    let pollOptionId = req.params.pollOptionId
    let userId = req.params.userId
    try {
      let pollOption = await pollOptionSchema.findById(pollOptionId)
      pollOption.responders.push(userId)
      // remove user from poll queue
      await pollOption.save()
      let user = await userSchema.findById(userId)
      if (!(user.pollsQueued.includes(pollId))) {
        res.status(500).json({
          error: 'This poll is not queued for this user'
        })
        return
      }
      user.pollsQueued.splice(user.pollsQueued.indexOf(pollId), 1)
      await user.save()
      res.status(200).json({
        message: 'User\'s poll response was submitted'
      })
    } catch (e) {
      console.log("poll answer error" + e)
      res.status(500).send({message: "polls answer error" + e})
    }
});

router.patch('/acknowledgePoll/:pollId/:userId',
  passport.authenticate('jwt', {session: false}),
  async (req, res, next) => {
    let pollId = req.params.pollId
    let userId = req.params.userId
    try {
      let user = await userSchema.findById(userId)
      if (!(user.pollsQueued.includes(pollId))) {
        res.status(500).json({
          error: 'This poll is not queued for this user'
        })
        return
      }
      user.pollsQueued.splice(user.pollsQueued.indexOf(pollId), 1)
      await user.save()
      res.status(200).json({
        message: 'User\'s poll response was submitted'
      })
    } catch (e) {
      console.log("poll answer error" + e)
      res.status(500).send({message: "polls answer error" + e})
    }
});

router.patch('/changeTimeZone/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
  let id = req.body.id
  let role = req.body.role
  let newTimeZone = req.body.timeZone
  let profile;

  try {
    if (role === "STUDENT") {
      let profile = await studentSchema.findById(id)
      profile.timeZone = newTimeZone
      await profile.save();
    } else {
      let profile = await alumniSchema.findById(id)
      profile.timeZone = newTimeZone
      await profile.save();
    }
    res.status(200).send({userDetails: profile})
  } catch (e) {
    console.log("Change time zone error" + e)
    res.status(500).send({message: "change time zone error" + e})
  }
})

router.get('/totalCounts', async (req, res, next) => {  
  try {
      let studentsCount = await studentSchema.count()
      let alumniCount = await alumniSchema.count()
      let schoolsCount = await schoolSchema.count()
      res.status(200).json({
          studentsCount,
          alumniCount,
          schoolsCount
      })
  } catch (e) {
      console.log("Error: index#totalCount", e);
      res.status(500).send({'error' : e});
  }
})

/**
 * Returns a random assortment of 5 approved alumni from within the OFI network for the landing page
 */
router.get('/sampleSignUps', async (req, res, next) => {  
  try {
      let alumniRecords = await alumniSchema.find({approved: true},'imageURL name collegeName country city')
      let randomIndices = []
      while (randomIndices.length < 5) {
        let newIndex = Math.floor(Math.random() * alumniRecords.length)
        if (randomIndices.indexOf(newIndex) === -1) {
          randomIndices.push(newIndex)
        }
      }
      let alumniRecordsToSend = [
        alumniRecords[randomIndices[0]],
        alumniRecords[randomIndices[1]],
        alumniRecords[randomIndices[2]],
        alumniRecords[randomIndices[3]],
        alumniRecords[randomIndices[4]],
      ]
      res.status(200).json({sampleSignUps: alumniRecordsToSend})
  } catch (e) {
      console.log("Error: index#sampleSignUps", e);
      res.status(500).send({'error' : e});
  }
})

/*
  LinkedIn API
*/

function requestAccessToken(code, state) {
  return request.post('https://www.linkedin.com/oauth/v2/accessToken')
    .send('grant_type=authorization_code')
    .send(`redirect_uri=${process.env.LINKEDIN_REDIRECT_URI}`)
    .send(`client_id=${process.env.LINKEDIN_CLIENT_ID}`)
    .send(`client_secret=${process.env.LINKEDIN_CLIENT_SECRET}`)
    .send(`code=${code}`)
    .send(`state=${state}`)
}

function requestProfile(token) {
  /*
    Other fields available via projection are firstName, lastName, and id
  */
  return request.get('https://api.linkedin.com/v2/me?projection=(profilePicture(displayImage~digitalmediaAsset:playableStreams))')
  .set('Authorization', `Bearer ${token}`)
}

// end-point configured as callback for LinkedIn App
router.get('/linkedin', passport.authenticate('jwt', {session: false}), (req, res, next) => {
  // state is the email address of member
  requestAccessToken(req.query.code, req.query.state)
  .then((response) => {
    requestProfile(response.body.access_token)
    .then(response => {
      // TODO: we can find user record by email provide as query param,
      // and update imageLink for corresponding student/alumnus record
      const displayImageLinkLarge = response.body.profilePicture
        && response.body.profilePicture['displayImage~']
        && response.body.profilePicture['displayImage~'].elements[3].identifiers[0].identifier
      res.status(200).send({message: "Extracted Profile Image!", displayImageLinkLarge: displayImageLinkLarge, email: req.query.state})
    })
  })
  .catch((error) => {
    res.send(`${error}`)
  })
})

/*
  LinkedIn API
*/

module.exports = router;
