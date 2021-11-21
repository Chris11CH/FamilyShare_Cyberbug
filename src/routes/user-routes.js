const express = require('express')
const config = require('config')
const router = new express.Router()
const objectid = require('objectid')
const multer = require('multer')
const jwt = require('jsonwebtoken')
const fr = require('find-remove')
const nodemailer = require('nodemailer')
const path = require('path')
const nh = require('../helper-functions/notification-helpers')
// const uh = require('../helper-functions/user-helpers')
const hf = require('../helper-functions/forgot-password-email')
// const rl = require('../helper-functions/request-link-email')
// const wt = require('../helper-functions/walthrough-email')
// const texts = require('../constants/notification-texts')
const { google } = require('googleapis')
const googleEmail = config.get('google.email')
const googleKey = config.get('google.key')
const scopes = 'https://www.googleapis.com/auth/calendar'
const googleToken = new google.auth.JWT(process.env[googleEmail], null, process.env[googleKey].replace(/\\n/g, '\n'), scopes)
const calendar = google.calendar({
  version: 'v3',
  auth: googleToken
})

// const { Expo } = require('expo-server-sdk')
// let expo = new Expo()

const sharp = require('sharp')

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

const profileStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../../images/profiles'))
  },
  filename(req, file, cb) {
    fr(path.join(__dirname, '../../images/profiles'), { prefix: req.params.id })
    cb(null, `${req.params.id}-${Date.now()}.${file.mimetype.slice(file.mimetype.indexOf('/') + 1, file.mimetype.length)}`)
  }
})
const profileUpload = multer({ storage: profileStorage, limits: { fieldSize: 52428800 } })
/*
const childProfileStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../../images/profiles'))
  },
  filename(req, file, cb) {
    fr(path.join(__dirname, '../../images/profiles'), { prefix: req.params.childId })
    cb(null, `${req.params.childId}-${Date.now()}.${file.mimetype.slice(file.mimetype.indexOf('/') + 1, file.mimetype.length)}`)
  }
})
*/
// const childProfileUpload = multer({ storage: childProfileStorage, limits: { fieldSize: 52428800 } })

const Profile = require('../models/profile')
const Address = require('../models/address')
const Group = require('../models/group')
const Image = require('../models/image')
const Member = require('../models/member')
const User = require('../models/user')
// const Notification = require('../models/notification')
const Parent = require('../models/parent')
// const Reply = require('../models/reply')
const Child = require('../models/child')
// const Announcement = require('../models/announcement')
// const Framily = require('../models/framily')
const Password_Reset = require('../models/password-reset')
const Device = require('../models/device')
const Rating = require('../models/rating')
const Community = require('../models/community')

router.post('/', async (req, res, next) => {
  const {
    given_name, family_name, number, email, password, visible, language, deviceToken
  } = req.body
  if (!(given_name && family_name && email && password && visible !== undefined && language)) {
    return res.status(400).send('Bad Request')
  }
  try {
    const user = await User.findOne({ email })
    if (user) {
      return res.status(409).send('User already exists')
    }
    const user_id = objectid()
    const address_id = objectid()
    const image_id = objectid()
    const token = jwt.sign({ user_id, email }, process.env.SERVER_SECRET)
    const newUser = {
      user_id,
      provider: 'families_share',
      role: 'parent',
      email,
      token,
      password,
      language,
      last_login: new Date()
    }
    const profile = {
      given_name,
      family_name,
      user_id,
      email,
      phone: number,
      phone_type: 'unspecified',
      visible,
      image_id,
      address_id,
      suspended: false,
      description: ''
    }
    const image = {
      image_id,
      owner_type: 'user',
      owner_id: user_id,
      path: '/images/profiles/user_default_photo.png',
      thumbnail_path: '/images/profiles/user_default_photo.png'
    }
    const address = {
      address_id,
      street: '',
      number: '',
      city: ''
    }
    const rating = {
      user_id,
      rating: 0
    }
    if (deviceToken !== undefined && deviceToken !== null) {
      const device = await Device.findOne({ device_id: deviceToken })
      if (device) {
        device.user_id = user_id
        await device.save()
      } else {
        await Device.create({
          user_id,
          device_id: deviceToken
        })
      }
    }
    await User.create(newUser)
    await Profile.create(profile)
    await Image.create(image)
    await Address.create(address)
    await Rating.create(rating)
    const response = {
      id: user_id,
      email,
      name: `${given_name} ${family_name}`,
      image: '/images/profiles/user_default_photo.png',
      token
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

router.post('/authenticate/email', async (req, res, next) => {
  const {
    email, password, deviceToken, language, origin
  } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).send('Authentication failure')
    }
    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      return res.status(401).send('Authentication failure')
    }
    if (deviceToken !== 'undefined' && deviceToken !== undefined && deviceToken !== null) {
      const device = await Device.findOne({ device_id: deviceToken })
      if (device) {
        device.user_id = user.user_id
        device.save()
      } else {
        await Device.create({
          user_id: user.user_id,
          device_id: deviceToken
        })
      }
    }
    const profile = await Profile.findOne({ user_id: user.user_id })
      .populate('image')
      .lean()
      .exec()
    if (profile.suspended) {
      await Profile.updateOne({ user_id: user.user_id }, { suspended: false })
      const usersChildren = await Parent.find({ parent_id: user.user_id })
      const childIds = usersChildren.map(usersChildren.child_id)
      await Child.updateMany({ child_id: { $in: childIds } }, { suspended: false })
    }
    const token = jwt.sign(
      { user_id: user.user_id, email },
      process.env.SERVER_SECRET
    )
    const response = {
      id: user.user_id,
      email,
      name: `${profile.given_name} ${profile.family_name}`,
      image: profile.image.path,
      token,
      role: user.role
    }
    user.last_login = new Date()
    user.language = language
    user.token = token
    if (origin === 'native') {
      user.version = req.body.version
    } else {
      user.version = 'latest'
    }
    await user.save()
    res.json(response)
  } catch (error) {
    next(error)
  }
})

router.post('/:id/deviceToken', async (req, res, next) => {
  try {
    const { id: user_id } = req.params
    const { deviceToken: device_id } = req.body
    const token = await Device.findOne({ user_id, device_id })
    if (token) {
      return res.status(409).send('Token exists')
    } else if (device_id) {
      await Device.create({ user_id, device_id })
      return res.status(200).send('Token updated successfully')
    } else {
      res.status(400).send('Bad request')
    }
  } catch (error) {
    next(error)
  }
})

router.get('/changepasswordredirect/:token', (req, res) => {
  res.redirect(`families-share://changepsw/${req.params.token}`)
})

router.post('/forgotpassword', async (req, res, next) => {
  const { email, origin } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).send("User doesn't exist")
    }
    const token = await jwt.sign({ user_id: user.user_id, email }, process.env.SERVER_SECRET, { expiresIn: 60 * 60 * 24 })
    const mailOptions = {
      from: process.env.SERVER_MAIL,
      to: email,
      subject: 'Forgot Password',
      html: hf.newForgotPasswordEmail(token, origin)
    }
    const reset = await Password_Reset.findOne({ user_id: user.user_id, email })
    if (reset) {
      reset.token = token
      await reset.save()
    } else {
      await Password_Reset.create({
        user_id: user.user_id,
        email: user.email,
        token
      })
    }
    await transporter.sendMail(mailOptions)
    res.status(200).send('Forgot password email was sent')
  } catch (error) {
    next(error)
  }
})

router.get('/changepassword', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Invalid token') }
  const { user_id } = req
  Password_Reset.findOne({ token: req.headers.authorization }).then(reset => {
    if (!reset) {
      return res.status(404).send('Bad Request')
    }
    return Profile.findOne({ user_id }).populate('image')
      .lean()
      .exec()
      .then(profile => {
        res.json(profile)
      })
  }).catch(next)
})

router.post('/changepassword', async (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Not authorized') }
  try {
    const { user_id, email } = req
    const reset = await Password_Reset.findOneAndDelete({ user_id })
    if (!reset) {
      return res.status(404).send('Reset not found')
    }
    const profile = await Profile.findOne({ user_id }).populate('image').exec()
    if (profile.suspended) {
      await Profile.updateOne({ user_id }, { suspended: false })
      const usersChildren = await Parent.find({ parent_id: user_id })
      const childIds = usersChildren.map(usersChildren.child_id)
      await Child.updateMany({ child_id: { $in: childIds } }, { suspended: false })
    }
    const user = await User.findOne({ user_id })
    const token = await jwt.sign({ user_id, email }, process.env.SERVER_SECRET)
    const response = {
      id: user_id,
      email,
      name: `${profile.given_name} ${profile.family_name}`,
      image: profile.image.path,
      token
    }
    user.last_login = new Date()
    user.password = req.body.password
    await user.save()
    res.json(response)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params
  User.findOne({ user_id: id }).then(user => {
    if (!user) {
      return res.status(404).send("User doesn't exist")
    }
    res.json(user)
  }).catch(next)
})

router.get('/:id/groups', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { user_id } = req
  Member.find({ user_id }).sort({ 'createdAt': -1 }).then(groups => {
    if (groups.length === 0) {
      return res.status(404).send("User hasn't joined any groups")
    }
    res.json(groups)
  }).catch(next)
})

router.post('/:id/groups', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { user_id } = req
  const { group_id } = req.body
  if (!group_id) {
    return res.status(400).send('Bad Request')
  }
  const member = {
    group_id,
    user_id,
    admin: false,
    user_accepted: true,
    group_accepted: false
  }
  Member.create(member).then(() => {
    nh.newRequestNotification(user_id, group_id)
    res.status(200).send('Joined succesfully')
  }).catch(next)
})

router.patch('/:userId/groups/:groupId', async (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  const group_id = req.params.groupId
  const user_id = req.params.userId
  try {
    let community = await Community.findOne({})
    if (!community) {
      community = await Community.create({})
    }
    await Member.updateOne({ user_id, group_id }, { user_accepted: true, admin: community.auto_admin })
    nh.newMemberNotification(group_id, user_id)
    res.status(200).send('User joined')
  } catch (err) {
    next(err)
  }
})

router.delete('/:userId/groups/:groupId', async (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  try {
    const user_id = req.params.userId
    const group_id = req.params.groupId
    const children = await Parent.find({ parent_id: user_id })
    const usersChildrenIds = children.map(child => child.child_id)
    const group = await Group.findOne({ group_id })
    const resp = await calendar.events.list({ calendarId: group.calendar_id })
    const events = resp.data.items.filter(event => event.extendedProperties.shared.status !== 'completed')
    events.forEach((event) => {
      const parentIds = JSON.parse(event.extendedProperties.shared.parents)
      event.extendedProperties.shared.parents = JSON.stringify(parentIds.filter(id => id !== user_id))
      const childrenIds = JSON.parse(event.extendedProperties.shared.children)
      event.extendedProperties.shared.children = JSON.stringify(childrenIds.filter(id => usersChildrenIds.indexOf(id) === -1))
    })
    await Promise.all(events.map((event) => {
      const timeslotPatch = {
        extendedProperties: {
          shared: {
            parents: event.extendedProperties.shared.parents,
            children: event.extendedProperties.shared.children
          }
        }
      }
      calendar.events.patch({ calendarId: group.calendar_id, eventId: event.id, resource: timeslotPatch })
    }))
    await Member.deleteOne({ user_id, group_id })
    res.status(200).send('User left group')
  } catch (error) {
    next(error)
  }
})

router.get('/:id/profile', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  Profile.findOne({ user_id })
    .populate('image')
    .populate('address')
    .lean()
    .exec()
    .then(profile => {
      if (!profile) {
        return res.status(404).send('Profile not found')
      }
      res.json(profile)
    }).catch(next)
})

router.patch('/:id/profile', profileUpload.single('photo'), async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  const { file } = req
  const {
    given_name, family_name, email, phone, phone_type, visible, street, number, city, description, contact_option
  } = req.body
  if (!(given_name || family_name || email || phone || phone_type || visible !== undefined || street || number || city || contact_option)) {
    return res.status(400).send('Bad Request')
  }
  const profilePatch = {
    given_name,
    family_name,
    email,
    phone,
    phone_type,
    description,
    visible,
    contact_option
  }
  const addressPatch = {
    street,
    number,
    city
  }
  try {
    await Address.updateOne({ address_id: req.body.address_id }, addressPatch)
    await Profile.updateOne({ user_id }, profilePatch)
    if (file) {
      const fileName = file.filename.split('.')
      const imagePatch = {
        path: `/images/profiles/${file.filename}`,
        thumbnail_path: `/images/profiles/${fileName[0]}_t.${fileName[1]}`
      }
      await sharp(path.join(__dirname, `../../images/profiles/${file.filename}`))
        .resize({
          height: 200,
          fit: sharp.fit.cover
        })
        .toFile(path.join(__dirname, `../../images/profiles/${fileName[0]}_t.${fileName[1]}`))
      await Image.updateOne({ owner_type: 'user', owner_id: user_id }, imagePatch)
    }
    res.status(200).send('Profile Updated')
  } catch (error) {
    next(error)
  }
})

module.exports = router
