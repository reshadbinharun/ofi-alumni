var express = require('express');
var router = express.Router();
var newsSchema = require('../models/newsSchema');
var moment = require('moment');
const alumniSchema = require('../models/alumniSchema');
const studentSchema = require('../models/studentSchema');
require('mongoose').Promise = global.Promise

router.get('/getNews/:role/:id', async (req, res, next) => {
    let role = req.params.role
    let id = req.params.id
    try {
        let dbData;
        if (role == 'ALUMNI') {
            userInfo = await alumniSchema.findById(id)
            dbData = await newsSchema.find({role: {$ne: 'STUDENT'}, school: userInfo.school})
                .populate('alumni').populate('students')
        } else {
            userInfo = await studentSchema.findById(id)
            dbData = await newsSchema.find({role: {$ne: 'ALUMNI'}, school: userInfo.school, grade: {$in: [null, userInfo.grade]}})
                .populate('alumni').populate('students')
        }
        let objData = dbData.map(item => {
            if (role === 'STUDENT' && item.event === 'Confirmed Meeting') {
                item.depopulate('students') 
            }
            let itemObj = item.toObject()
            itemObj.timeElapsed = moment(item.dateCreated).fromNow()
            return itemObj
        })
        res.json({'news' : objData});
    } catch (e) {
        console.log('getNews error: ' + e)
        res.status(500).send({message: 'getNews error: ' + e})
    }
})

module.exports = router;