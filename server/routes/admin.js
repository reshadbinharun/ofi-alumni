var express = require('express');
var passport = require("passport");
var router = express.Router();
var collegeSchema = require('../models/collegeSchema');
var schoolSchema = require('../models/schoolSchema');
var alumniSchema = require('../models/alumniSchema');
var adminSchema = require('../models/adminSchema');
var studentSchema = require('../models/studentSchema');
var requestSchema = require('../models/requestSchema');
var userSchema = require('../models/userSchema');
require('mongoose').Promise = global.Promise

async function isAdmin(id) {
    let admin = await adminSchema.findById(id)
    let alumni = await alumniSchema.findById(id).populate('user')
    return (admin !== null || (alumni && alumni.user.role.includes('ADMIN')))
}

router.get('/one/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        const dbData = await adminSchema.findOne({_id: req.params.id})
        const userRecord = await userSchema.findById(dbData.user)
        res.json({
            result : dbData,
            accessContexts: userRecord.accessContexts || ["INTRASCHOOL"]
        });
    } catch (e) {
        console.log("Error: util#oneAdmin", e);
        res.status(500).send({'error' : e});
    }
});

router.get('/allAlumni/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let alumniData = await alumniSchema.find({}).populate('school')
        let alumni = []
        for (let alumnusModel of alumniData) {
            let alumnus = alumnusModel.toObject()
            let userRecordWithAccessContext = await userSchema.findById(alumnusModel.user, {accessContexts: 1})
            alumnus.accessContexts = userRecordWithAccessContext.accessContexts
            alumni.push(alumnus)
        }
        res.status(200).send({'alumni': alumni})
    } catch (e) {
        console.log('admin/allAlumni error: ' + e);
        res.status(500).send({'admin/allAlumni error' : e})
    }
});

router.get('/allStudents/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let studentsData = await studentSchema.find({}).populate('school')
        let students = []
        for (let studentModel of studentsData) {
            let student = studentModel.toObject()
            let userRecordWithAccessContext = await userSchema.findById(studentModel.user, {accessContexts: 1})
            student.accessContexts = userRecordWithAccessContext.accessContexts
            students.push(student)
        }
        res.status(200).send({'students': students})
    } catch (e) {
        console.log('admin/allStudents error: ' + e);
        res.status(500).send({'admin/allStudents error' : e})
    }
});

router.get('/allColleges/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let dbData = await collegeSchema.find({})
        res.status(200).send({'colleges': dbData})
    } catch (e) {
        console.log('admin/allColleges error: ' + e);
        res.status(500).send({'admin/allColleges error' : e})
    }
});

router.get('/allSchools/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let dbData = await schoolSchema.find({})
        res.status(200).send({'schools': dbData})
    } catch (e) {
        console.log('admin/allSchools error: ' + e);
        res.status(500).send({'admin/allSchools error' : e})
    }
});

router.patch('/toggleApprove/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let profileId = req.body.profileId;
    let type = req.body.type;
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let dbData = []
        if (type === 'ALUMNI') {
            let alumni = await alumniSchema.findById(profileId);
            alumni.approved = !alumni.approved;
            await alumni.save()
            let alumniData = await alumniSchema.find({}).populate('school')
            for (let alumnusModel of alumniData) {
                let alumnus = alumnusModel.toObject()
                let userRecordWithAccessContext = await userSchema.findById(alumnusModel.user, {accessContexts: 1})
                alumnus.accessContexts = userRecordWithAccessContext.accessContexts
                dbData.push(alumnus)
            }
        } else if (type === 'STUDENT') {
            let student = await studentSchema.findById(profileId);
            student.approved = !student.approved;
            await student.save()
            let studentsData = await studentSchema.find({}).populate('school')
            for (let studentModel of studentsData) {
                let student = studentModel.toObject()
                let userRecordWithAccessContext = await userSchema.findById(studentModel.user, {accessContexts: 1})
                student.accessContexts = userRecordWithAccessContext.accessContexts
                dbData.push(student)
            }
        }
        res.status(200).send({profiles: dbData})
        return;
    } catch (e) {
        console.log('admin/toggleApprove error: ' + e)
        res.status(500).send({'toggleApprove error' : e})
    }
});

router.patch('/changeAccess/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let userId = req.body.userId;
    let type = req.body.type;
    let accessContext = req.body.newAccessContext;
    let isGranting = req.body.isGranting;
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        if (!(["GLOBAL", "INTRASCHOOL", "INTERSCHOOL"].includes(accessContext))) {
            res.status(500).json({
                message: 'Invalid access context provided'
            });
            return;
        }
        let user = await userSchema.findById(userId);
        let newAccessContexts = []
        if (isGranting) {
            if (user.accessContexts.includes(accessContext)) {
                res.status(200).json({
                    message: 'User already has request access level'
                });
                return;
            } else {
                user.accessContexts.push(accessContext)
                newAccessContexts = user.accessContexts
            }
        } else {
            if (!user.accessContexts.includes(accessContext)) {
                res.status(200).json({
                    message: 'User does not currently have access level that is being revoked'
                });
                return;
            } else {
                user.accessContexts = user.accessContexts.filter(context => context !== accessContext);
                newAccessContexts = user.accessContexts
            }
        }
        user.save()
        let dbData = []
        if (type === 'ALUMNI') {
            let alumniData = await alumniSchema.find({}).populate('school')
            for (let alumnusModel of alumniData) {
                let alumnus = alumnusModel.toObject()
                alumnus.accessContexts = newAccessContexts
                dbData.push(alumnus)
            }
        } else if (type === 'STUDENT') {
            let studentData = await studentSchema.find({}).populate('school')
            for (let studentModel of studentData) {
                let student = studentModel.toObject()
                student.accessContexts = newAccessContexts
                dbData.push(student)
            }
        }
        res.status(200).send({profiles: dbData});
        return;
    } catch (e) {
        console.log('admin/changeAccess error: ' + e)
        res.status(500).send({'changeAccess error' : e})
    }
});

router.get('/feedback/:adminId/:profileId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId;
    let profileId = req.params.profileId;
    let public = [];
    let private = [];
    let testimonial = [];
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let allFeedback = await requestSchema.find({mentor: profileId}, 'publicFeedback privateFeedback testimonial')
        for (let feedback of allFeedback) {
            feedback = feedback.toObject()
            if (feedback.publicFeedback) {
                public.push(feedback.publicFeedback);
            } 
            if (feedback.privateFeedback) {
                private.push(feedback.privateFeedback);
            }
            if (feedback.testimonial) {
                testimonial.push(feedback.testimonial);
            }
        }
        let profile = await alumniSchema.findById(profileId)
        res.status(200).send(
            {
                public: public,
                private: private,
                testimonial: testimonial,
                profile: profile
            }
        );
    } catch (e) {
        console.log('admin/feedback error: ' + e);
        res.status(500).send({'admin/feedback error' : e})
    }
});

router.patch('/toggleModerator/:adminId', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let studentId = req.body.studentId
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let student = await studentSchema.findById(studentId)
        student.isModerator = !student.isModerator
        await student.save()
        let studentsData = await studentSchema.find({}).populate('school')
        let students = []
        for (let studentModel of studentsData) {
            let student = studentModel.toObject()
            let userRecordWithAccessContext = await userSchema.findById(studentModel.user, {accessContexts: 1})
            student.accessContexts = userRecordWithAccessContext.accessContexts
            students.push(student)
        }
        res.status(200).send({'students': students})
    } catch (e) {
        console.log('admin/toggleModerator error: ' + e);
        res.status(500).send({'admin/toggleModerator error' : e})
    }
});

router.patch('/mergeColleges/:adminid', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let colleges = req.body.items
    let name = req.body.name
    let location = await collegeSchema.findById(colleges[0])
    let country = location.country
    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let newCollege = new collegeSchema({name: name, country: country});
        await newCollege.save();
        let update = {
            college: newCollege._id,
            collegeName: newCollege.name
        }
        for (let college of colleges) {
            let alumni = await alumniSchema.updateMany({college: college}, update)
            await collegeSchema.findByIdAndDelete(college)
        }
        res.status(200).send({'message': 'Successfully merged colleges'})
    } catch (e) {
        console.log('/mergeColleges error:' + e);
        res.status(500).send({'admin/mergeColleges error' : e})
    }
});

router.post('/addSchool/:adminid', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let country = req.body.country
    let name = req.body.name

    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let school = new schoolSchema({
            name: name,
            country: country
        })
        await school.save();
        res.status(200).send({'message': 'Successfully added school'})
    } catch (e) {
        console.log('/addSchool error:' + e);
        res.status(500).send({'error' : 'Add School Error' + e})
    }
});

router.post('/addCollege/:adminid', passport.authenticate('jwt', {session: false}), async (req, res) => {
    let adminId = req.params.adminId
    let country = req.body.country
    let name = req.body.name

    try {
        if (!isAdmin(adminId)) {
            res.status(400).send('Invalid Admin ID');
            return;
        }
        let college = new collegeSchema({
            name: name,
            country: country
        })
        await college.save();
        res.status(200).send({'message': 'Successfully added college'})
    } catch (e) {
        console.log('/addCollege error:' + e);
        res.status(500).send({'error' : 'Add College Error' + e})
    }
});

module.exports = router;