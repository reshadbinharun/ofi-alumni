var express = require('express');
var passport = require("passport");
var router = express.Router();
var userSchema = require('../models/userSchema');
var alumniSchema = require('../models/alumniSchema');
var adminSchema = require('../models/adminSchema');
const studentSchema = require('../models/studentSchema');
require('mongoose').Promise = global.Promise

async function isAdmin(id) {
    let admin = await adminSchema.findById(id)
    let alumni = await alumniSchema.findById(id).populate('user')
    return (admin !== null || (alumni && alumni.user.role.includes('ADMIN')))
}

router.get('/one/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        const dbData = await adminSchema.findOne({_id: req.params.id})
        res.json({'result' : dbData});
    } catch (e) {
        console.log("Error: util#oneAdmin", e);
        res.status(500).send({'error' : e});
    }
});

router.get('/allAlumni/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            throw new Error('Invalid Admin ID');
        }
        let dbData = await alumniSchema.find({}).populate('school')
        res.status(200).send({'alumni': dbData})
    } catch (e) {
        console.log('admin/allAlumni error: ' + e);
        res.status(500).send({'admin/allAlumni error' : e})
    }
});

router.get('/allStudents/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            throw new Error('Invalid Admin ID');
        }
        let dbData = await studentSchema.find({}).populate('school')
        res.status(200).send({'students': dbData})
    } catch (e) {
        console.log('admin/allStudents error: ' + e);
        res.status(500).send({'admin/allStudents error' : e})
    }
});

module.exports = router;