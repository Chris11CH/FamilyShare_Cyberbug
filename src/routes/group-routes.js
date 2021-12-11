const express = require('express')
const config = require('config')
const router = new express.Router()
const multer = require('multer')
const objectid = require('objectid')
const fr = require('find-remove')
const { google } = require('googleapis')
const googleEmail = config.get('google.email')
const googleKey = config.get('google.key')
const scopes = 'https://www.googleapis.com/auth/calendar'
const jwt = new google.auth.JWT(
  process.env[googleEmail],
  null,
  process.env[googleKey].replace(/\\n/g, '\n'),
  scopes
)
const path = require('path')
const sharp = require('sharp')
// const nodemailer = require('nodemailer')
// const texts = require('../constants/notification-texts')
// const exportActivity = require('../helper-functions/export-activity-data')
// const groupAgenda = require('../helper-functions/group-agenda')
// const groupContacts = require('../helper-functions/group-contacts')
const nh = require('../helper-functions/notification-helpers')
const ah = require('../helper-functions/activity-helpers')
// const ph = require('../helper-functions/plan-helpers')
const schedule = require('node-schedule')

if (process.env.NODE_APP_INSTANCE === 0) {
  schedule.scheduleJob(process.env.CRONJOB, () => {
    ah.checkCompletedTimeslots()
  })
}

const calendar = google.calendar({
  version: 'v3',
  auth: jwt
})
/*
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SERVER_MAIL,
    pass: process.env.SERVER_MAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
})
*/
const groupStorage = multer.diskStorage({
  destination (req, file, cb) {
    cb(null, path.join(__dirname, '../../images/groups'))
  },
  filename (req, file, cb) {
    const fileName = `${req.params.id}-${Date.now()}.${file.mimetype.slice(
      file.mimetype.indexOf('/') + 1,
      file.mimetype.length
    )}`
    fr(path.join(__dirname, '../../images/groups'), { prefix: req.params.id })
    cb(null, fileName)
  }
})
const groupUpload = multer({
  storage: groupStorage,
  limits: { fieldSize: 52428800 }
})
/*
const announcementStorage = multer.diskStorage({
  destination (req, file, cb) {
    cb(null, path.join(__dirname, '../../images/announcements'))
  },
  filename (req, file, cb) {
    if (req.params.announcement_id === undefined) {
      req.params.announcement_id = objectid()
    }
    cb(
      null,
      `${req.params.announcement_id}-${Date.now()}.${file.mimetype.slice(
        file.mimetype.indexOf('/') + 1,
        file.mimetype.length
      )}`
    )
  }
})
*/
/*
const announcementUpload = multer({
  storage: announcementStorage,
  limits: { fieldSize: 52428800 }
})
*/
const Image = require('../models/image')
// const Reply = require('../models/reply')
const Group_Settings = require('../models/group-settings')
const Member = require('../models/member')
const Group = require('../models/group')
// const Plan = require('../models/plan')
// const Notification = require('../models/notification')
// const Announcement = require('../models/announcement')
const Parent = require('../models/parent')
// const Activity = require('../models/activity')
// const Child = require('../models/child')
// const Profile = require('../models/profile')
const Community = require('../models/community')
// const User = require('../models/user')

// Wrapper DONE
// Endpoint used to search for groups
// Params: searchBy (visibility, ids, all), ids
router.get('/', (req, res, next) => {
  if (!req.user_id) return res.status(401).send('Not authenticated')
  const { query } = req
  if (query.searchBy === undefined) {
    return res.status(400).send('Bad Request')
  }
  switch (query.searchBy) {
    case 'visibility':
      Group_Settings.find({ visible: query.visible })
        .then(visibleGroups => {
          if (visibleGroups.length === 0) {
            return res.status(404).send('No visible groups were found')
          }
          const groupIds = []
          visibleGroups.forEach(group => groupIds.push(group.group_id))
          return Group.find({ group_id: { $in: groupIds } })
            .populate('image')
            .collation({ locale: 'en' })
            .sort({ name: 1 })
            .then(groups => {
              if (groups.length === 0) {
                return res.status(400).send('No groups were found')
              }
              return res.json(groups)
            })
        })
        .catch(next)
      break
    case 'ids':
      const groupIds = req.query.ids
      Group.find({ _id: { $in: groupIds } })
        .populate('image')
        .lean()
        .exec()
        .then(groups => {
          if (groups.length === 0) {
            return res.status(404).send('No groups were found')
          }
          return res.json(groups)
        })
        .catch(next)
      break
    case 'all':
      Group.find({})
        .then(groups => {
          if (groups.length === 0) {
            return res.status(404).send('No groups were found')
          }
          return res.json(groups)
        })
        .catch(next)
      break
    default:
      res.status(400).send('Bad Request')
  }
})

// Wrapper DONE
// Endpoint to create a new group
// Params: invite_ids (array) , description, location, name, visible, owner_id, contact_type (none, email, phone), contact_info
router.post('/', async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  const {
    description,
    location,
    name,
    visible,
    owner_id,
    contact_type,
    contact_info
  } = req.body
  if (
    !(
      description &&
      location &&
      name &&
      contact_type &&
      visible !== undefined &&
      owner_id
    )
  ) {
    return res.sendStatus(400)
  }

  const group_id = objectid()
  const image_id = objectid()
  const settings_id = objectid()
  const newCal = {
    summary: name,
    description,
    location
  }
  const group = {
    group_id,
    name,
    description,
    background: '#00838F',
    location,
    owner_id,
    contact_type,
    settings_id,
    image_id
  }
  if (contact_type !== 'none') {
    group.contact_info = contact_info
  }
  const image = {
    image_id,
    owner_type: 'group',
    owner_id: group_id,
    path: '/images/groups/group_default_photo.png',
    thumbnail_path: '/images/groups/group_default_photo.png'
  }
  const settings = {
    settings_id,
    group_id,
    visible,
    open: true
  }
  const members = [
    {
      group_id,
      user_id: owner_id,
      admin: true,
      group_accepted: true,
      user_accepted: true
    }
  ]
  /*
  invite_ids.forEach(invite_id => {
    members.push({
      group_id,
      user_id: invite_id,
      admin: false,
      group_accepted: true,
      user_accepted: false
    })
  })
  */
  try {
    const response = await calendar.calendars.insert({ resource: newCal })
    group.calendar_id = response.data.id
    await Member.create(members)
    await Group.create(group)
    await Image.create(image)
    await Group_Settings.create(settings)
    res.status(200).send('Group Created')
  } catch (err) {
    next(err)
  }
})

// Wrapper DONE
// Endpoint to get the group info
// Params: id of the group
router.get('/:id', (req, res, next) => {
  const { id } = req.params
  Group.findOne({ group_id: id })
    .populate('image')
    .lean()
    .exec()
    .then(group => {
      if (!group) {
        return res.status(404).send('Group not found')
      }
      res.json(group)
    })
    .catch(next)
})

// Wrapper DONE
// Endpoint to delete a group
// Params: id of the group
router.delete('/:id', async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  const { id } = req.params
  const edittingUser = await Member.findOne({
    group_id: req.params.id,
    user_id: req.user_id,
    group_accepted: true,
    user_accepted: true
  })
  if (!edittingUser) {
    return res.status(401).send('Unauthorized')
  }
  if (!edittingUser.admin) {
    return res.status(401).send('Unauthorized')
  }
  try {
    const group = await Group.findOneAndDelete({ group_id: id })
    await calendar.calendars.delete({ calendarId: group.calendar_id })
    await Member.deleteMany({ group_id: id })
    await Group_Settings.deleteOne({ group_id: id })
    await Image.deleteMany({ owner_type: 'group', owner_id: id })
    res.status(200).send('Group was deleted')
  } catch (error) {
    next(error)
  }
})

// Wrapper DONE
// Endpoint to update a group
// Params: id of the group
// Params body: visible, name, description, location, background, contact_type, contact_info
router.patch('/:id', groupUpload.single('photo'), async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  const { file } = req
  const { id } = req.params
  const { visible, name, description, location, background, contact_type, contact_info } = req.body
  if (
    !(visible !== undefined && name && description && location && background && contact_type)
  ) {
    return res.status(400).send('Bad Request')
  }
  const settingsPatch = { visible }
  const groupPatch = {
    name,
    description,
    background,
    location,
    contact_type
  }
  if (contact_type !== 'none') {
    groupPatch.contact_info = contact_info
  }
  try {
    const edittingUser = await Member.findOne({
      group_id: req.params.id,
      user_id: req.user_id,
      group_accepted: true,
      user_accepted: true
    })
    if (!edittingUser) {
      return res.status(401).send('Unauthorized')
    }
    if (!edittingUser.admin) {
      return res.status(401).send('Unauthorized')
    }
    await nh.editGroupNotification(id, req.user_id, {
      ...groupPatch,
      visible,
      file
    })
    await Group.updateOne({ group_id: id }, groupPatch)
    await Group_Settings.updateOne({ group_id: id }, settingsPatch)
    if (file) {
      const fileName = file.filename.split('.')
      const imagePatch = {
        path: `/images/groups/${file.filename}`,
        thumbnail_path: `/images/groups/${fileName[0]}_t.${fileName[1]}`
      }
      await sharp(path.join(__dirname, `../../images/groups/${file.filename}`))
        .resize({
          height: 200,
          fit: sharp.fit.cover
        })
        .toFile(
          path.join(
            __dirname,
            `../../images/groups/${fileName[0]}_t.${fileName[1]}`
          )
        )
      await Image.updateOne({ owner_type: 'group', owner_id: id }, imagePatch)
    }
    res.status(200).send('Group Updated')
  } catch (err) {
    next(err)
  }
})

// Wrapper DONE, test params
// Endpoint to change the group settings
// Params: id of the group
// Params body: settingsPatch?
router.patch('/:id/settings', async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  const { id } = req.params
  const settingsPatch = req.body
  try {
    const edittingUser = await Member.findOne({
      group_id: req.params.id,
      user_id: req.user_id,
      group_accepted: true,
      user_accepted: true
    })
    if (!edittingUser) {
      return res.status(401).send('Unauthorized')
    }
    if (!edittingUser.admin) {
      return res.status(401).send('Unauthorized')
    }
    await Group_Settings.updateOne({ group_id: id }, settingsPatch)
    res.status(200).send('Settings Updated')
  } catch (error) {
    next(error)
  }
})

// Wrapper DONE
// Endpoint to get the group settings
// Params: id of the group
router.get('/:id/settings', (req, res, next) => {
  const { id } = req.params
  Group_Settings.findOne({ group_id: id })
    .then(settings => {
      if (!settings) {
        return res.status(404).send('Group Settings not found')
      }
      res.json(settings)
    })
    .catch(next)
})

// Wrapper DONE
// Endpoint to get the group members
// Params: id of the group
router.get('/:id/members', (req, res, next) => {
  const { id } = req.params
  Member.find({ group_id: id })
    .then(members => {
      if (members.length === 0) {
        return res.status(404).send('Group has no members')
      }
      res.send(members)
    })
    .catch(next)
})

// ?
router.patch('/:id/members', async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  try {
    const group_id = req.params.id
    const patch = req.body.patch
    const user_id = req.body.id
    const edittingUser = await Member.findOne({
      group_id,
      user_id: req.user_id,
      group_accepted: true,
      user_accepted: true
    })
    if (!edittingUser) {
      return res.status(401).send('Unauthorized')
    }
    if (!edittingUser.admin) {
      return res.status(401).send('Unauthorized')
    }
    if (!(patch.group_accepted !== undefined || patch.admin !== undefined)) {
      return res.status(400).send('Bad Request')
    }
    let community = await Community.findOne({})
    if (!community) {
      community = await Community.create({})
    }
    if (patch.group_accepted !== undefined) {
      patch.admin = community.auto_admin
    }
    await Member.updateOne({ group_id, user_id }, patch)
    let message = ''
    if (patch.group_accepted !== undefined) {
      if (patch.group_accepted) {
        nh.newMemberNotification(group_id, user_id)
        message = 'Request confirmed'
      } else {
        message = 'Request deleted'
      }
    } else if (patch.admin) {
      message = 'Admin added'
    } else {
      message = 'Admin removed'
    }
    res.status(200).send(message)
  } catch (err) { next(err) }
})

// Wrapper DONE
// Endpoint to remove a user from the group
// Params: id of the group, id of the user to kick
router.delete('/:groupId/members/:memberId', async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).send('Not authenticated')
  }
  const group_id = req.params.groupId
  const user_id = req.user_id
  const member_id = req.params.memberId
  const edittingUser = await Member.findOne({
    group_id,
    user_id,
    group_accepted: true,
    user_accepted: true
  })
  if (!edittingUser) {
    return res.status(401).send('Unauthorized')
  }
  if (!edittingUser.admin) {
    return res.status(401).send('Unauthorized')
  }
  try {
    const children = await Parent.find({ parent_id: member_id })
    const usersChildrenIds = children.map(child => child.child_id)
    const group = await Group.findOne({ group_id })
    let events = await ah.fetchAllGroupEvents(group.group_id, group.calendar_id)
    events = events.filter(e => e.extendedProperties.shared.status === 'ongoing')
    const patchedEvents = []
    events.forEach(event => {
      let patched = false
      const parentIds = JSON.parse(event.extendedProperties.shared.parents)
      if (parentIds.includes(member_id)) {
        patched = true
        event.extendedProperties.shared.parents = JSON.stringify(
          parentIds.filter(id => id !== member_id)
        )
      }
      const childrenIds = JSON.parse(event.extendedProperties.shared.children)
      if (childrenIds.filter(c => usersChildrenIds.includes(c)).length) {
        patched = true
        event.extendedProperties.shared.children = JSON.stringify(
          childrenIds.filter(id => usersChildrenIds.indexOf(id) === -1)
        )
      }
      if (patched) patchedEvents.push(event)
    })
    await patchedEvents.reduce(async (previous, event) => {
      await previous
      const timeslotPatch = {
        extendedProperties: {
          shared: {
            parents: event.extendedProperties.shared.parents,
            children: event.extendedProperties.shared.children
          }
        }
      }
      return calendar.events.patch({
        calendarId: group.calendar_id,
        eventId: event.id,
        resource: timeslotPatch
      })
    }, Promise.resolve())

    await Member.deleteOne({ group_id, user_id: member_id })
    await nh.removeMemberNotification(member_id, group_id)
    res.status(200).send('User removed from group')
  } catch (error) {
    next(error)
  }
})

module.exports = router
